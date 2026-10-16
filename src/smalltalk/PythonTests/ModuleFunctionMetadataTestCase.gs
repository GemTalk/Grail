! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleFunctionMetadataTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFunctionMetadataTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFunctionMetadataTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFunctionMetadataTestCase - module-level defs and lambdas carry CPython's
! function metadata (#1228)
! ===============================================================================
! #1228 listed fourteen gaps; most were closed by other changes and are pinned
! here.  This change closes three:
!   * an assigned __defaults__ / __kwdefaults__ on a MODULE-LEVEL def or a
!     METHOD now writes through to the default store a call binds from, as a
!     nested def's already did (module >> ___writeFunctionDefaults___:value:kw:,
!     UnboundMethod >> ___writeDefaultsThrough___:value:);
!   * a nested def refuses a non-tuple __defaults__ before writing it through;
!   * a lambda's code object has co_varnames, co_flags and its qualname.
! An assignment that changes the SHAPE of the defaults still reads back without
! binding; FunctionDefaultsTestCase documents that limit.
! tests/python/module_function_metadata.py holds the 11 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFunctionMetadataTestCase removeAllMethods.
ModuleFunctionMetadataTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleFunctionMetadataTestCase
setUp

	importlib @env1:modules removeKey: #'module_function_metadata' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_function_metadata.py')
		name: 'module_function_metadata'
%

category: 'Grail-Helpers'
method: ModuleFunctionMetadataTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ModuleFunctionMetadataTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - assigned defaults'
method: ModuleFunctionMetadataTestCase
testAssignedDefaultsChangeWhatTheCallBinds

	self assertAll: #('a_module_defs_assigned_defaults_bind'
		'a_methods_assigned_defaults_bind' 'a_later_write_replaces_an_uncarried_one')
%

category: 'Grail-Tests - assigned defaults'
method: ModuleFunctionMetadataTestCase
testANonTupleOrNonDictIsRefused

	self assertAll: #('a_non_tuple_or_non_dict_is_refused')
%

category: 'Grail-Tests - lambdas'
method: ModuleFunctionMetadataTestCase
testALambdasCodeObject

	self assertAll: #('a_lambdas_code_object' 'a_lambda_has_its_signature')
%

category: 'Grail-Tests - what #1228 reported'
method: ModuleFunctionMetadataTestCase
testTheReportedGapsStayClosed

	self assertAll: #('a_module_def_has_its_metadata'
		'inspect_classes_a_module_def_as_a_function' 'getfullargspec_of_a_module_def'
		'update_wrapper_and_wraps_on_module_defs' 'doctest_finds_a_module_defs_docstring')
%

category: 'Grail-Tests - what #1228 reported'
method: ModuleFunctionMetadataTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 11
%
