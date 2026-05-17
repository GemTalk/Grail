! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassScopeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassScopeTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ClassScopeTestCase removeAllMethods.
ClassScopeTestCase class removeAllMethods.
%

category: 'Setup'
method: ClassScopeTestCase
setUp
	"Load tests/python/class_scope.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_scope' ifAbsent: [].
	UserGlobals removeKey: #'py_class_scope' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Foo' ifAbsent: [].
	UserGlobals removeKey: #'pyc_CsToken' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Box' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_scope.py')
		name: 'class_scope'.
%

! ===============================================================================
! Tests - LEGB free-variable resolution from class methods
! ===============================================================================

category: 'Tests - LEGB'
method: ClassScopeTestCase
testClassMethodReadsModuleConstant
	"Foo.amplify reads MULTIPLIER (module-level int)."

	self assert: (testModule @env1:foo_amplify_result) equals: 50.
%

category: 'Tests - LEGB'
method: ClassScopeTestCase
testClassMethodCallsModuleFunction
	"Foo.helped calls shared_helper (module-level def)."

	self assert: (testModule @env1:foo_helped_result) equals: 14.
%

category: 'Tests - LEGB'
method: ClassScopeTestCase
testClassMethodComparesToModuleConstant
	"Foo.gated reads THRESHOLD (module-level) inside an if."

	self assert: (testModule @env1:foo_gated_big) equals: 'big'.
	self assert: (testModule @env1:foo_gated_small) equals: 'small'.
%

! ===============================================================================
! Tests - Shadowing: bare name vs class method with same name
! ===============================================================================

category: 'Tests - LEGB'
method: ClassScopeTestCase
testBareNameSkipsClassScope
	"Tokenizer.error references bare `error`, which Python's LEGB
	resolves to the MODULE-LEVEL `error` function, not to the
	method itself.  Wrapping confirms the module-level was reached."

	self assert: (testModule @env1:cstok_error_result)
		equals: 'tokenizer wrapping: module error: oops'.
%

! ===============================================================================
! Tests - @property dispatch
! ===============================================================================

category: 'Tests - Property'
method: ClassScopeTestCase
testPropertyAccessFromOutside
	"Box(...).size invokes the @property method."

	self assert: (testModule @env1:box_size_full) equals: 3.
%

category: 'Tests - Property'
method: ClassScopeTestCase
testPropertyAccessFromInsideMethod
	"Box.describe uses self.size — `self.X` where X is a class method
	(not an inst var) dispatches to the method."

	self assert: (testModule @env1:box_describe_full) equals: 'has 3'.
	self assert: (testModule @env1:box_describe_empty) equals: 'empty'.
%
