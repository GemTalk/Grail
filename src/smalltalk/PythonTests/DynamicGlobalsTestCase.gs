! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DynamicGlobalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DynamicGlobalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DynamicGlobalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DynamicGlobalsTestCase
!
! Module-level names added at module-init time (e.g. via
! globals().update(...)) should be readable from the rest of the
! module body.  CPython resolves bare reads through __globals__ at
! runtime; Grail needs the same effect via a runtime self-at-lookup
! fallback in NameAst codegen when in module-body/method context.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DynamicGlobalsTestCase removeAllMethods.
DynamicGlobalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DynamicGlobalsTestCase
setUp
	"Load tests/python/dynamic_globals.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'dynamic_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dynamic_globals.py')
		name: 'dynamic_globals'.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testDynamicGlobalReadDirect
	"After globals().update({'DYN_X': 11, 'DYN_Y': 22}), reading DYN_X
	from module top level should return 11."

	self assert: (testModule @env1:result_x) equals: 11.
	self assert: (testModule @env1:result_y) equals: 22.
%

category: 'Grail-Tests - Dynamic Globals'
method: DynamicGlobalsTestCase
testDynamicGlobalReadInExpression
	"Reading dynamic globals inside an expression also works."

	self assert: (testModule @env1:result_sum) equals: 33.
%
