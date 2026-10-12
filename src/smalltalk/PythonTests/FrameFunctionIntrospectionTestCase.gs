! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FrameFunctionIntrospectionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FrameFunctionIntrospectionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameFunctionIntrospectionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameFunctionIntrospectionTestCase - #1460
! ===============================================================================
!   What pytest reads off functions and frames: a module-level function's
!   live __dict__ (BoundMethod >> __dict__), code.co_varnames for a def's
!   parameters (FunctionDefAst >> ___coVarnames___, both emitters, PyCode >>
!   co_varnames) and inspect.getargs.  Live-frame f_locals and co_firstlineno
!   already worked; they are kept here so they stay so.
!
! tests/python/frame_function_introspection.py holds the 17 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh, plus one GRAIL_ONLY
! value: co_varnames lists the parameters but not the body's locals.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FrameFunctionIntrospectionTestCase removeAllMethods.
FrameFunctionIntrospectionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FrameFunctionIntrospectionTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/frame_function_introspection.py'
		name: 'frame_function_introspection'
%

category: 'Grail-Helpers'
method: FrameFunctionIntrospectionTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: FrameFunctionIntrospectionTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: FrameFunctionIntrospectionTestCase
testModuleFunctionDict

	self assertAll: #('function_dict_empty' 'function_dict' 'function_dict_is_live'
		'functools_wraps_copies_it' 'pytest_keywords_update')
%

category: 'Grail-Tests'
method: FrameFunctionIntrospectionTestCase
testCoVarnamesAndGetargs

	self assertAll: #('co_varnames_parameters' 'co_varnames_method' 'getargs'
		'getargs_method' 'getargs_static' 'getargs_refuses_non_code'
		'compiled_module_code_varnames' 'module_frame_varnames_and_getargs'
		'replace_keeps_varnames')
%

category: 'Grail-Tests'
method: FrameFunctionIntrospectionTestCase
testFramesAndLineNumbers

	self assertAll: #('live_frame_f_locals' 'caller_frame_f_locals'
		'co_firstlineno_is_the_def_line')
%

category: 'Grail-Tests'
method: FrameFunctionIntrospectionTestCase
testCoVarnamesOmitsBodyLocals
	"The pinned difference: CPython continues co_varnames with the body's
	locals; Grail records the parameters only."

	| expected actual |
	expected := (testModule @env1:___pyAttrLoad___: #GRAIL_ONLY)
		@env1:__getitem__: 'co_varnames_with_locals'.
	actual := (testModule @env1:___pyAttrLoad___: #r_grail_only)
		@env1:__getitem__: 'co_varnames_with_locals'.
	self assert: actual asString equals: expected asString
%

category: 'Grail-Tests - coverage'
method: FrameFunctionIntrospectionTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17
%
