! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DictReversedPositionsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DictReversedPositionsTestCase comment:
'reversed() over a dict and its views with the dict changed underneath:
CPython''s outcome, from a port of dictreviter_iternext over PyDict''s entry
positions (a deleted key leaves a nil in ``order'').  Also popitem() and copy()
on that entry list.

Every expectation in tests/python/dict_reversed_positions.py was produced by
CPython 3.14.8; the fixture gate re-checks it there.'
%

doit
DictReversedPositionsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DictReversedPositionsTestCase removeAllMethods: 0.
DictReversedPositionsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: DictReversedPositionsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dict_reversed_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_reversed_positions.py')
		name: 'dict_reversed_positions'.
%

category: 'Grail-Helpers'
method: DictReversedPositionsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: DictReversedPositionsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: DictReversedPositionsTestCase
testReverseIterators
	self assertAll: #('types' 'plain' 'length_hint' 'pickled')
%

category: 'Grail-Tests'
method: DictReversedPositionsTestCase
testMutationUnderAReverseIterator
	self assertAll: #('keys_changed' 'clear_and_restore' 'size_changed')
%

category: 'Grail-Tests'
method: DictReversedPositionsTestCase
testEntryListMaintenance
	self assertAll: #('churn' 'popitem_and_copy')
%
