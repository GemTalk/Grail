! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleFromSpecTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFromSpecTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFromSpecTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFromSpecTestCase - importlib.util.module_from_spec and exec_module
! ===============================================================================
! ``spec_from_file_location'' / ``module_from_spec'' / ``spec.loader.
! exec_module(mod)'' is the PEP 451 way to load a file as a module by hand.
! Grail had no module_from_spec and no exec_module on the loader a file spec
! carries, so sqlalchemy's conftest -- which loads its pytest plugin that way --
! failed to import and none of its tests were collected.
! tests/python/module_from_spec.py holds the 5 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFromSpecTestCase removeAllMethods.
ModuleFromSpecTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleFromSpecTestCase
setUp

	importlib @env1:modules removeKey: #'module_from_spec' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_from_spec.py')
		name: 'module_from_spec'
%

category: 'Grail-Helpers'
method: ModuleFromSpecTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ModuleFromSpecTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - module_from_spec'
method: ModuleFromSpecTestCase
testAFileLoadsByHand

	self assertAll: #('the_module_carries_the_spec' 'it_is_not_executed_or_registered'
		'exec_module_runs_the_file_in_it')
%

category: 'Grail-Tests - module_from_spec'
method: ModuleFromSpecTestCase
testTheLoadersCreateModuleIsAsked

	self assertAll: #('a_loaders_create_module_makes_the_module'
		'exec_module_without_create_module_is_refused')
%

category: 'Grail-Tests - module_from_spec'
method: ModuleFromSpecTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 5
%
