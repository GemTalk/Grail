! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComprehensionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ComprehensionTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ComprehensionTestCase category: 'SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ComprehensionTestCase removeAllMethods.
ComprehensionTestCase class removeAllMethods.
%

! ===============================================================================
! Setup
! ===============================================================================

category: 'Setup'
method: ComprehensionTestCase
setUp
	"Load tests/python/comprehensions.py fresh each test so accumulated
	module state from a prior run doesn't mask a regression."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'comprehensions' ifAbsent: [].
	UserGlobals removeKey: #'py_comprehensions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehensions.py')
		name: 'comprehensions'.
%

! ===============================================================================
! Tests - List comprehensions
! ===============================================================================

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListBasic
	self assert: (testModule @env1:list_basic) asArray equals: #(1 2 3 4).
%

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListExpr
	self assert: (testModule @env1:list_expr) asArray equals: #(1 4 9 16).
%

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListFilter
	self assert: (testModule @env1:list_filter) asArray equals: #(2 4).
%

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListNested
	"Cartesian product of xs=[1..4] and ys=[10,20] → 8 pairs."
	self assert: (testModule @env1:list_nested) size equals: 8.
%

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListFilterNested
	"x + y for x in [1..4], y in [10,20] if x < y — all 8 satisfy x < y."
	self assert: (testModule @env1:list_filter_n) size equals: 8.
%

category: 'Tests - List Comp'
method: ComprehensionTestCase
testListTupleUnpack
	self assert: (testModule @env1:list_unpack) asArray equals: #(3 7).
%

! ===============================================================================
! Tests - Dict comprehensions
! ===============================================================================

category: 'Tests - Dict Comp'
method: ComprehensionTestCase
testDictBasic
	| d |
	d := testModule @env1:dict_basic.
	self assert: (d @env0:at: 3) equals: 9.
	self assert: (d @env0:at: 4) equals: 16.
%

category: 'Tests - Dict Comp'
method: ComprehensionTestCase
testDictFilter
	| d |
	d := testModule @env1:dict_filter.
	self assert: d @env0:size equals: 2.
	self assert: (d @env0:at: 2) equals: 4.
%

category: 'Tests - Dict Comp'
method: ComprehensionTestCase
testDictUnpack
	| d |
	d := testModule @env1:dict_unpack.
	self assert: (d @env0:at: 2) equals: 'b'.
%

! ===============================================================================
! Tests - Set comprehensions
! ===============================================================================

category: 'Tests - Set Comp'
method: ComprehensionTestCase
testSetBasic
	"{x % 3 for x in [1,2,3,4]} → {1, 2, 0}"
	self assert: (testModule @env1:set_basic) @env0:size equals: 3.
%

category: 'Tests - Set Comp'
method: ComprehensionTestCase
testSetFilter
	self assert: (testModule @env1:set_filter) @env0:size equals: 3.
%

! ===============================================================================
! Tests - Generator expressions (materialized eagerly in Grail)
! ===============================================================================

category: 'Tests - Generator Exp'
method: ComprehensionTestCase
testGenSum
	"sum(x*x for x in [1,2,3,4]) = 1 + 4 + 9 + 16 = 30"
	self assert: (testModule @env1:gen_total) equals: 30.
%

category: 'Tests - Generator Exp'
method: ComprehensionTestCase
testGenFiltered
	"sum(x for x in [1,2,3,4] if x > 2) = 3 + 4 = 7"
	self assert: (testModule @env1:gen_filtered) equals: 7.
%

! ===============================================================================
! Tests - *args / **kwargs parameter binding
! ===============================================================================

category: 'Tests - Varargs'
method: ComprehensionTestCase
testStarArgsCollect
	self assert: (testModule @env1:collect_result) asArray equals: #('a' 'b' 'c').
%
