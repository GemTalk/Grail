Class {
	#name : 'ComprehensionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'SUnit'
}

{ #category : 'Setup' }
ComprehensionTestCase >> setUp [
	"Load tests/python/comprehensions.py fresh each test so accumulated
	module state from a prior run doesn't mask a regression."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'comprehensions' ifAbsent: [].
	UserGlobals removeKey: #'py_comprehensions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehensions.py')
		name: 'comprehensions'.

]

{ #category : 'Tests - Dict Comp' }
ComprehensionTestCase >> testDictBasic [
	| d |
	d := testModule @env1:dict_basic.
	self assert: (d at: 3) equals: 9.
	self assert: (d at: 4) equals: 16.

]

{ #category : 'Tests - Dict Comp' }
ComprehensionTestCase >> testDictFilter [
	| d |
	d := testModule @env1:dict_filter.
	self assert: d size equals: 2.
	self assert: (d at: 2) equals: 4.

]

{ #category : 'Tests - Dict Comp' }
ComprehensionTestCase >> testDictUnpack [
	| d |
	d := testModule @env1:dict_unpack.
	self assert: (d at: 2) equals: 'b'.

]

{ #category : 'Tests - Generator Exp' }
ComprehensionTestCase >> testGenFiltered [
	"sum(x for x in [1,2,3,4] if x > 2) = 3 + 4 = 7"
	self assert: (testModule @env1:gen_filtered) equals: 7.

]

{ #category : 'Tests - Generator Exp' }
ComprehensionTestCase >> testGenSum [
	"sum(x*x for x in [1,2,3,4]) = 1 + 4 + 9 + 16 = 30"
	self assert: (testModule @env1:gen_total) equals: 30.

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListBasic [
	self assert: (testModule @env1:list_basic) asArray equals: #(1 2 3 4).

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListExpr [
	self assert: (testModule @env1:list_expr) asArray equals: #(1 4 9 16).

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListFilter [
	self assert: (testModule @env1:list_filter) asArray equals: #(2 4).

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListFilterNested [
	"x + y for x in [1..4], y in [10,20] if x < y — all 8 satisfy x < y."
	self assert: (testModule @env1:list_filter_n) size equals: 8.

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListNested [
	"Cartesian product of xs=[1..4] and ys=[10,20] → 8 pairs."
	self assert: (testModule @env1:list_nested) size equals: 8.

]

{ #category : 'Tests - List Comp' }
ComprehensionTestCase >> testListTupleUnpack [
	self assert: (testModule @env1:list_unpack) asArray equals: #(3 7).

]

{ #category : 'Tests - Set Comp' }
ComprehensionTestCase >> testSetBasic [
	"{x % 3 for x in [1,2,3,4]} → {1, 2, 0}"
	self assert: (testModule @env1:set_basic) size equals: 3.

]

{ #category : 'Tests - Set Comp' }
ComprehensionTestCase >> testSetFilter [
	self assert: (testModule @env1:set_filter) size equals: 3.

]

{ #category : 'Tests - Varargs' }
ComprehensionTestCase >> testStarArgsCollect [
	self assert: (testModule @env1:collect_result) asArray equals: #('a' 'b' 'c').

]
