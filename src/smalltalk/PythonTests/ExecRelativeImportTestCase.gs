! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecRelativeImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecRelativeImportTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecRelativeImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecRelativeImportTestCase - a relative import in exec'd source
! ===============================================================================
! ``from .. import util'' in exec'd source resolves at run time against the
! exec's globals (__package__, __spec__.parent, __name__), as CPython's
! IMPORT_NAME does.  Grail resolved it at compile time against a module the
! exec does not have: ``ValueError: Empty module name'' for every test module
! pytest rewrote in a test package (soupsieve, python-multipart).  Also
! __import__ with a level and import_module with a relative name, whose
! resolver answered the importlib instance.
! tests/python/exec_relative_import.py holds the 9 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecRelativeImportTestCase removeAllMethods.
ExecRelativeImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecRelativeImportTestCase
setUp

	importlib @env1:modules removeKey: #'exec_relative_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_relative_import.py')
		name: 'exec_relative_import'
%

category: 'Grail-Helpers'
method: ExecRelativeImportTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ExecRelativeImportTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - exec'
method: ExecRelativeImportTestCase
testRelativeImportInExecResolvesAgainstItsGlobals

	self assertAll: #('parent_package_and_a_module_in_it' 'own_package_and_a_module_in_it'
		'inside_a_function_and_a_class_body' 'package_from_spec_parent'
		'a_meta_path_loader_execing_a_package_module')
%

category: 'Grail-Tests - exec'
method: ExecRelativeImportTestCase
testRelativeImportRefusals

	self assertAll: #('no_parent_package' 'beyond_the_top_level_package')
%

category: 'Grail-Tests - runtime'
method: ExecRelativeImportTestCase
testDunderImportAndImportModuleResolveALevel

	self assertAll: #('dunder_import_with_a_level' 'import_module_relative')
%

category: 'Grail-Tests - exec'
method: ExecRelativeImportTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 9
%
