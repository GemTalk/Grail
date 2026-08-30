! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleTypeConstructionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleTypeConstructionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ModuleTypeConstructionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleTypeConstructionTestCase — ``types.ModuleType(name)''.  Grail's module
! is a SymbolDictionary subclass, so it used to inherit dict-style construction
! and read the NAME as a sequence of key/value pairs.  Checks live in
! tests/python/module_type_construction.py, which self-verifies under CPython
! through scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleTypeConstructionTestCase removeAllMethods.
ModuleTypeConstructionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ModuleType'
method: ModuleTypeConstructionTestCase
loadFixture
	"Load tests/python/module_type_construction.py fresh."

	importlib @env1:modules removeKey: #'module_type_construction' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_type_construction.py')
		name: 'module_type_construction'
%

category: 'Grail-Tests-ModuleType'
method: ModuleTypeConstructionTestCase
testEveryFixtureCheckPasses
	"Drive every check and NAME the failures rather than asserting a count
	alone -- ``expected 10 got 9'' leaves the reader to hunt for which.
	The count is asserted too, so a fixture that quietly stops contributing
	checks cannot pass by shrinking."

	| results failed |
	results := self loadFixture @env1:all_checks.
	failed := (results select: [:pair | (pair at: 2) ~~ true])
		collect: [:pair | pair at: 1].
	self assert: failed asArray equals: #().
	self assert: results size equals: 15
%

category: 'Grail-Tests-ModuleType'
method: ModuleTypeConstructionTestCase
testTheSingletonRegistryIsUntouched
	"``module class >> instance'' keeps a per-CLASS singleton registry, and
	the construction path deliberately uses ``new'' instead.  Routing it
	through ``instance'' would make every types.ModuleType(...) on the same
	class hand back one shared object -- and overwrite whatever the previous
	caller put in it.  Asserted here in Smalltalk because the registry is
	not reachable from Python."

	| mod before after |
	mod := Python at: #'module'.
	before := (mod ___sessionInstances___) size.
	(mod @env1:__new__: 'grail_probe_not_a_singleton') @env1:__name__.
	after := (mod ___sessionInstances___) size.
	self assert: after equals: before
%
