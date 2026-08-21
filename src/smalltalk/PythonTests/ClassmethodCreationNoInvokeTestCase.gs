! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassmethodCreationNoInvokeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ClassmethodCreationNoInvokeTestCase comment:
'Defining a class runs its BODY -- not its methods.

While a class is being created the runtime walks the names bound in its body
-- the __set_name__ protocol needs each name''s VALUE -- and asking for a
value must not mean CALLING anything.  A zero-argument @classmethod is where
the difference showed: it compiles to a unary selector on the metaclass,
exactly the shape of a synthesized DATA accessor, and the walk performed
whichever it found.  So every zero-arg classmethod in a class body RAN once
at class-creation time, silently -- and an explicit ``@classmethod def
__init_subclass__(cls)'' fired with cls = the class being DEFINED, which
PEP 487 promises never happens.

The two kinds are told apart by METHOD CATEGORY, which ClassDefAst already
assigns: data accessors are ''Grail-Class Attrs'', defs are ''Grail-Class
Methods''.  A def is not a class-body value, and nothing a def compiles to
implements __set_name__, so nil is the faithful answer for one.

Fixing the walk exposed a second gap the auto-invoke had been masking: a
zero-arg explicit classmethod hook has no :kw: variant -- only the unary
selector, class-side -- and the class-creation dispatch searched only the
:kw: family, so the undecorated hook never ran for subclasses at all.  The
unary spelling is now dispatched by a VIRTUAL send, correct precisely
because the method is class-side: the new class IS an instance of that
metaclass chain.

See tests/python/classmethod_creation_no_invoke.py.'
%

expectvalue /Class
doit
ClassmethodCreationNoInvokeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ClassmethodCreationNoInvokeTestCase removeAllMethods: 0.
ClassmethodCreationNoInvokeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassmethodCreationNoInvokeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'classmethod_creation_no_invoke' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_creation_no_invoke.py')
		name: 'classmethod_creation_no_invoke'.
%

category: 'Grail-Helpers'
method: ClassmethodCreationNoInvokeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ClassmethodCreationNoInvokeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - creation is not invocation'
method: ClassmethodCreationNoInvokeTestCase
testCreatingAClassCallsNoMethod
	"The side-effect list is empty after the class exists, empty after a
	read, and the method still answers when actually CALLED."

	self assertAll: #('creating_the_class_calls_nothing'
		'reading_a_classmethod_calls_nothing' 'calling_it_still_works')
%

category: 'Grail-Tests - creation is not invocation'
method: ClassmethodCreationNoInvokeTestCase
testTheOwnHookRunsOnlyForSubclasses
	"PEP 487, both halves: never for the class defining it, and -- the gap
	the auto-invoke was masking -- the zero-arg explicit-classmethod
	spelling DOES run for subclasses."

	self assertAll: #('the_own_hook_runs_only_for_subclasses')
%

category: 'Grail-Tests - the walk still works'
method: ClassmethodCreationNoInvokeTestCase
testSetNameIsStillDelivered
	"The walk that caused the auto-invoke exists for a reason: a descriptor
	in a class body is told its owner and name."

	self assertAll: #('set_name_is_still_delivered')
%

category: 'Grail-Tests - what it was for'
method: ClassmethodCreationNoInvokeTestCase
testDeprecatedWithAnExplicitClassmethodHook
	"The suite case end to end: nothing recorded at decoration, the hook sees
	the NEW class, and the warning is emitted."

	self assertAll: #('deprecated_with_an_explicit_classmethod_hook')
%
