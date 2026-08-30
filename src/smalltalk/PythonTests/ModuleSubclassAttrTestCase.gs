! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleSubclassAttrTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleSubclassAttrTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ModuleSubclassAttrTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleSubclassAttrTestCase — attribute lookup on a subclass of
! types.ModuleType.  The module branch of Object >> ___pyAttrLoad___: used to
! read the instance's SymbolDictionary and then raise, never consulting the
! class, so class attributes and descriptors were invisible.  Checks live in
! tests/python/module_subclass_attrs.py, which self-verifies under CPython
! through scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleSubclassAttrTestCase removeAllMethods.
ModuleSubclassAttrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ModuleSubclassAttrs'
method: ModuleSubclassAttrTestCase
loadFixture
	"Load tests/python/module_subclass_attrs.py fresh."

	importlib @env1:modules removeKey: #'module_subclass_attrs' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_subclass_attrs.py')
		name: 'module_subclass_attrs'
%

category: 'Grail-Tests-ModuleSubclassAttrs'
method: ModuleSubclassAttrTestCase
testEveryFixtureCheckPasses
	"Drive every check and NAME the failures -- a bare count leaves the
	reader to hunt for which one.  The count is asserted too, so a fixture
	that quietly stops contributing checks cannot pass by shrinking."

	| results failed |
	results := self loadFixture @env1:all_checks.
	failed := (results select: [:pair | (pair at: 2) ~~ true])
		collect: [:pair | pair at: 1].
	self assert: failed asArray equals: #().
	self assert: results size equals: 9
%

