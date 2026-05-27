! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LambdaStarargsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LambdaStarargsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LambdaStarargsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LambdaStarargsTestCase
!
! Regression for LambdaAst codegen of ``*args'' / ``**kwargs''.
!
! Pre-fix, ``lambda self, *args, **kwargs: self(*args, **kwargs)''
! compiled without declaring ``args'' / ``kwargs'' as temps,
! producing ``undefined symbol args; undefined symbol kwargs''
! at module compile time.  Originally surfaced inside
! werkzeug.local at:
!   ``__call__ = _ProxyLookup(
!       lambda self, *args, **kwargs: self(*args, **kwargs))''
!
! These tests assert the lambda compiles AND the *args / **kwargs
! locals propagate to the body.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LambdaStarargsTestCase removeAllMethods.
LambdaStarargsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: LambdaStarargsTestCase
setUp
	"Load tests/python/lambda_starargs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'lambda_starargs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/lambda_starargs.py')
		name: 'lambda_starargs'.
%

category: 'Grail-Tests'
method: LambdaStarargsTestCase
testForwarderLambda
	"``lambda self, *args, **kwargs: self(*args, **kwargs)'' forwards
	all positional + kwarg args to the called sink."

	self assert: testModule @env1:call_forwarder equals: true
%

category: 'Grail-Tests'
method: LambdaStarargsTestCase
testVarargOnlyLambda
	"``lambda *args: len(args)'' — bare *args, no named params."

	self assert: testModule @env1:call_vararg_only equals: true
%

category: 'Grail-Tests'
method: LambdaStarargsTestCase
testKwargOnlyLambda
	"``lambda **kw: list(kw.keys())'' — bare **kwargs, no named params."

	self assert: testModule @env1:call_kwarg_only equals: true
%
