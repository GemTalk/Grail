! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctoolsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctoolsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctoolsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctoolsTestCase - Tests for Python functools module
! ===============================================================================
!
! Phase 4d: these tests were added as part of the functools conversion.
! Before Phase 4d the functools module had ZERO test coverage.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctoolsTestCase removeAllMethods.
FunctoolsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Module'
method: FunctoolsTestCase
testFunctoolsModuleExists
	"Test that functools module is registered."

	| modules |
	modules := importlib @env1:modules.
	self assert: (modules includesKey: #functools)
%

category: 'Grail-Tests - reduce'
method: FunctoolsTestCase
testReduceSum
	"Test functools.reduce() to sum a list."

	| f result |
	f := functools @env1:instance.
	result := f @env1:reduce: [:pos :kw | (pos at: 1) + (pos at: 2)] _: (list withAll: #(1 2 3 4 5)).
	self assert: result equals: 15
%

category: 'Grail-Tests - reduce'
method: FunctoolsTestCase
testReduceWithInitial
	"Test functools.reduce() with initial value."

	| f result |
	f := functools @env1:instance.
	result := f @env1:reduce: [:pos :kw | (pos at: 1) + (pos at: 2)] _: (list withAll: #(1 2 3)) _: 10.
	self assert: result equals: 16
%

category: 'Grail-Tests - reduce'
method: FunctoolsTestCase
testReduceSingleElement
	"Test functools.reduce() with single-element iterable returns that element."

	| f result |
	f := functools @env1:instance.
	result := f @env1:reduce: [:pos :kw | (pos at: 1) + (pos at: 2)] _: (list withAll: #(42)).
	self assert: result equals: 42
%

category: 'Grail-Tests - lru_cache'
method: FunctoolsTestCase
testLruCacheReturnsDecorator
	"Test functools.lru_cache(maxsize) returns a decorator (callable)."

	| f decorator |
	f := functools @env1:instance.
	decorator := f @env1:lru_cache: 128.
	self assert: decorator notNil.
	"The decorator should be callable (responds to value:value:)"
	self assert: (decorator isKindOf: ExecBlock)
%

category: 'Grail-Tests - lru_cache'
method: FunctoolsTestCase
testLruCacheDecoratorPassesThrough
	"Test that the lru_cache decorator returns the function unchanged (stub)."

	| f decorator fn result |
	f := functools @env1:instance.
	decorator := f @env1:lru_cache: 128.
	fn := [:pos :kw | 42].
	result := decorator value: {fn} value: nil.
	self assert: result == fn
%

category: 'Grail-Tests - Phase 4d Attribute Calls'
method: FunctoolsTestCase
testEvalReduceSum
	"Phase 4d: functools.reduce(fn, iterable) from Python source.
	Uses the new lambda codegen (LambdaAst printSmalltalkOn:)."

	self assert: (self eval: '
import functools
functools.reduce(lambda x, y: x + y, [1, 2, 3, 4, 5])
') equals: 15
%
