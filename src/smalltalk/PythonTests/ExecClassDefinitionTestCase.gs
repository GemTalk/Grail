! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecClassDefinitionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecClassDefinitionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExecClassDefinitionTestCase comment:
'``exec("class C: ...")'' produces a REAL class, not a second class model.

ClassDefAst>>printSmalltalkOn: gated the real class emission on
``CallAst moduleClassBeingCompiled notNil'' and, in an eval/exec context, fell
back to a "legacy dict-based representation" building a PythonClass (a
SymbolDictionary of class attributes).  That fallback could never run:
src/smalltalk/Python/PythonClass.gs is not in install.gs''s input list, so the
class is never created -- the name is pre-declared as nil in the Python
dictionary and stays nil.  The emitted ``PythonClass perform: #new env: 0''
raised ``a UndefinedObject does not understand #new'', a SMALLTALK error, so
every exec of a class statement aborted uncatchably.  That was 30 of
test_listcomps'' 52 errors.

Removing the gate routes exec/eval through the same runtime emission a module
uses, so an exec''d class is now the same kind of object as a normally-defined
one.  These tests pin that EQUIVALENCE -- instantiation, methods, isinstance,
type, subclassing, MRO inheritance -- not merely the absence of the crash.

See tests/python/exec_class_definition.py for the fixture behind each test.'
%

expectvalue /Class
doit
ExecClassDefinitionTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ExecClassDefinitionTestCase removeAllMethods: 0.
ExecClassDefinitionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecClassDefinitionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_class_definition' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_class_definition.py')
		name: 'exec_class_definition'.
%

category: 'Grail-Helpers'
method: ExecClassDefinitionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - Crash'
method: ExecClassDefinitionTestCase
testExecOfAClassBodyWorks
	"The minimal shape that raised an uncatchable
	``a UndefinedObject does not understand #new''."

	self assert: (self resultAt: 'class_body_works') equals: true
%

category: 'Grail-Tests - Crash'
method: ExecClassDefinitionTestCase
testExecClassLandsInTheSuppliedGlobals
	"builtins>>_exec: reflects the doit's scope back into the caller's dict,
	so the class must arrive under its own name."

	self assert: (self resultAt: 'lands_in_globals') equals: true
%

category: 'Grail-Tests - Crash'
method: ExecClassDefinitionTestCase
testExecClassBodyMayHoldAComprehension
	"A comprehension in the class body -- the combination test_listcomps
	exercises for all 60 of its tests."

	self assert: (self resultAt: 'body_comprehension') equals: true
%

category: 'Grail-Tests - Real class equivalence'
method: ExecClassDefinitionTestCase
testExecClassIsInstantiableWithMethods
	"``__init__''/``__repr__'' on an exec'd class was the separately noted
	``user classes can't be instantiated in eval: scope (#new DNU)'' gotcha --
	the same root, so the same change fixes it."

	self assert: (self resultAt: 'instantiable') equals: true
%

category: 'Grail-Tests - Real class equivalence'
method: ExecClassDefinitionTestCase
testExecClassSupportsIsinstanceAndType
	"isinstance(obj, cls), type(obj) is cls, isinstance(cls, type) -- none of
	which the dict-based model could have answered correctly."

	self assert: (self resultAt: 'isinstance_and_type') equals: true
%

category: 'Grail-Tests - Real class equivalence'
method: ExecClassDefinitionTestCase
testExecClassCanSubclassAndBeSubclassed
	"An exec'd class may inherit from a real class passed in through globals,
	and be subclassed by another exec'd class, with issubclass and __mro__
	ordering both correct."

	self assert: (self resultAt: 'subclassing') equals: true
%

category: 'Grail-Tests - Real class equivalence'
method: ExecClassDefinitionTestCase
testExecClassInheritsThroughTheMro
	"Attributes and methods resolve through the real MRO rather than being
	copied into a per-class dictionary."

	self assert: (self resultAt: 'mro_inheritance') equals: true
%

category: 'Grail-Tests - Real class equivalence'
method: ExecClassDefinitionTestCase
testRuntimeErrorsInAClassBodyAreCatchable
	"A runtime error in an exec'd class body is a catchable Python exception.
	Only the runtime case: a FREE NAME in that body still raises a Smalltalk
	CompileError (``undefined symbol'') instead of NameError -- a separate
	pre-existing root, and the top remaining cause in test_listcomps.  The
	fixture documents why that half is not asserted."

	self assert: (self resultAt: 'python_errors') equals: true
%

category: 'Grail-Tests - Scopes'
method: ExecClassDefinitionTestCase
testExecClassInEachOfTheThreeScopes
	"test_listcomps' _check_in_scopes shape: the same snippet exec'd at module
	scope, in a class body, and in a function body.  The class arm is the one
	that used to abort."

	self assert: (self resultAt: 'three_scopes') equals: true
%
