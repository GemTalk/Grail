! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'InitSubclassAssignedTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
InitSubclassAssignedTestCase comment:
'``__init_subclass__'' installed by ASSIGNMENT, not by definition.

PEP 487''s hook is usually written in a class body, and that is the case Grail
noticed: class creation searched the superclass chain for a compiled
``___init_subclass__:kw:'' and stopped there.  But the hook is an ordinary
class attribute, and assigning one after the class exists is just as valid --
it is how a decorator wraps whatever the class already had and puts the
wrapper back.

PEP 702''s @deprecated is exactly that, and it is why this matters: it reads
cls.__init_subclass__, wraps it in a function that warns, and assigns the
wrapper.  Looking only for a DEFINED hook ran none of it, so the decorator
applied cleanly and then did nothing -- no error, no warning, just silence.

The calling convention is fussy and both halves are load-bearing: a hook
assigned as a CLASSMETHOD receives the new class as its only positional
argument, and one assigned as a PLAIN function receives NO positional
arguments.  @deprecated depends on the difference -- it installs a classmethod
when wrapping a Python-level hook it must forward the class to, and a plain
function when wrapping object''s, which takes none.

Three env traps were in the way of reading the store at all, and each answered
``no attribute'' rather than failing:

  * ___classAttrOverlayLookup___ / ___classChainAttrLookup___ are INSTANCE
    methods on object, so sending them to a CLASS goes to the metaclass chain
    and is not understood.  The two stores are read directly here instead,
    which also gives what those cannot -- an OWN-class answer, needed to rank
    an assignment against a definition.
  * ``respondsTo:'' is env-0 and cannot see ___dynInstVars___, which is env-1.
  * ``___respondsTo___:'' RAISES when the receiver is a class.

So the committed store is probed by attempting it, not by asking first.

See tests/python/init_subclass_assigned.py.'
%

expectvalue /Class
doit
InitSubclassAssignedTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
InitSubclassAssignedTestCase removeAllMethods: 0.
InitSubclassAssignedTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: InitSubclassAssignedTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass_assigned' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass_assigned.py')
		name: 'init_subclass_assigned'.
%

category: 'Grail-Helpers'
method: InitSubclassAssignedTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: InitSubclassAssignedTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the hook runs'
method: InitSubclassAssignedTestCase
testAnAssignedHookRuns
	"The case class creation did not look for at all."

	self assertAll: #('an_assigned_classmethod_runs')
%

category: 'Grail-Tests - the calling convention'
method: InitSubclassAssignedTestCase
testAClassmethodReceivesTheNewClass
	self assertAll: #('a_classmethod_receives_the_new_class')
%

category: 'Grail-Tests - the calling convention'
method: InitSubclassAssignedTestCase
testAPlainFunctionReceivesNothing
	"Not the class -- nothing.  @deprecated installs a plain function
	precisely when it is wrapping object''s hook, which takes no arguments."

	self assertAll: #('a_plain_function_receives_nothing')
%

category: 'Grail-Tests - the calling convention'
method: InitSubclassAssignedTestCase
testClassKeywordsReachAnAssignedHook
	"``class Sub(Base, flavour=...)'' forwards the same way it does to a
	defined hook."

	self assertAll: #('class_keywords_reach_an_assigned_hook')
%

category: 'Grail-Tests - precedence'
method: InitSubclassAssignedTestCase
testANearerDefinitionShadowsAnAssignment
	"One dict per class in CPython, so NEARNESS decides -- not which of the
	two stores supplied the name.  Grail splits them, so the ranking has to
	be done explicitly."

	self assertAll: #('a_nearer_definition_shadows_an_assignment')
%

category: 'Grail-Tests - what it is for'
method: InitSubclassAssignedTestCase
testDeprecatedOnAClassNowWarns
	"PEP 702, end to end: subclassing and instantiation both warn, and the
	message is recorded on the class.  All three were silent."

	self assertAll: #('a_deprecated_class_warns_on_subclassing'
		'a_deprecated_class_warns_on_instantiation'
		'deprecated_records_the_message')
%
