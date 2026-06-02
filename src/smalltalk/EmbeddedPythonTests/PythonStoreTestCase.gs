fileformat utf8
set compile_env: 0
! ------------------- Class definition for PythonStoreTestCase
expectvalue /Class
doit
CPythonTestCase subclass: 'PythonStoreTestCase'
  instVarNames: #( pythonStore)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPythonTests
  options: #()

%
expectvalue /Class
doit
PythonStoreTestCase category: 'SUnit'
%
! ------------------- Remove existing behavior from PythonStoreTestCase
removeallmethods PythonStoreTestCase
removeallclassmethods PythonStoreTestCase
! ------------------- Class methods for PythonStoreTestCase
! ------------------- Instance methods for PythonStoreTestCase
category: 'Setup'
method: PythonStoreTestCase
setUp

	super setUp.
	pythonStore := PythonStore new.
%
category: 'Teardown'
method: PythonStoreTestCase
tearDown

	pythonStore reset.
	super tearDown.
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testBooleanFalseRoundTrip

	| obj result |
	obj := self pyBoolean: false.
	pythonStore at: 'x' put: obj.

	result := self track: (pythonStore at: 'x').
	self deny: result asBool.
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testBooleanTrueRoundTrip

	| obj result |
	obj := self pyBoolean: true.
	pythonStore at: 'x' put: obj.

	result := self track: (pythonStore at: 'x').
	self assert: result asBool.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testCircularDict

	| dict selfKey result selfRef |
	dict := self pyDict.
	dict dictAt: 'x' put: (self pyInteger: 1).
	selfKey := self pyString: 'self'.
	dict dictAtObject: selfKey put: dict.
	pythonStore at: 'circ' put: dict.

	result := self track: (pythonStore at: 'circ').
	self assert: result typeName equals: 'dict'.
	self assert: result dictSize equals: 2.
	selfRef := self track: (result dictAt: 'self').
	self assert: selfRef pointer memoryAddress equals: result pointer memoryAddress.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testCircularList

	| list result selfRef |
	list := self pyList: 0.
	list listAppend: (self pyInteger: 42).
	list listAppend: list.
	pythonStore at: 'circ' put: list.

	result := self track: (pythonStore at: 'circ').
	self assert: result typeName equals: 'list'.
	self assert: result listSize equals: 2.
	selfRef := self track: (result listAt: 1).
	self assert: selfRef pointer memoryAddress equals: result pointer memoryAddress.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testCrossKeySharing

	| shared dict1 dict2 result1 result2 value1 value2 |
	shared := self pyList: 0.
	shared listAppend: (self pyInteger: 99).
	dict1 := self pyDict.
	dict1 dictAt: 'data' put: shared.
	dict2 := self pyDict.
	dict2 dictAt: 'data' put: shared.
	pythonStore at: 'first' put: dict1.
	pythonStore at: 'second' put: dict2.

	result1 := self track: (pythonStore at: 'first').
	value1 := self track: (result1 dictAt: 'data').
	self assert: value1 listSize equals: 1.
	result2 := self track: (pythonStore at: 'second').
	value2 := self track: (result2 dictAt: 'data').
	self assert: value2 listSize equals: 1.

	self deny: (pythonStore store at: 'first') == (pythonStore store at: 'second').
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testDiamondInDict

	| shared dict result value1 value2 |
	shared := self pyList: 0.
	shared listAppend: (self pyInteger: 1).
	shared listAppend: (self pyInteger: 2).
	dict := self pyDict.
	dict dictAt: 'a' put: shared.
	dict dictAt: 'b' put: shared.
	pythonStore at: 'diamond' put: dict.

	result := self track: (pythonStore at: 'diamond').
	value1 := self track: (result dictAt: 'a').
	value2 := self track: (result dictAt: 'b').
	self assert: value1 listSize equals: 2.
	self assert: value1 pointer memoryAddress equals: value2 pointer memoryAddress.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testDiamondInList

	| shared list result result0 result1 |
	shared := self pyString: 'same'.
	list := self pyList: 0.
	list listAppend: shared.
	list listAppend: shared.
	pythonStore at: 'diamond' put: list.

	result := self track: (pythonStore at: 'diamond').
	self assert: result listSize equals: 2.
	result0 := self track: (result listAt: 0).
	result1 := self track: (result listAt: 1).
	self assert: result0 asString equals: 'same'.
	self assert: result1 asString equals: 'same'.
	self assert: result0 pointer memoryAddress equals: result1 pointer memoryAddress.
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testDictRoundTrip

	| dict value result readBack |
	dict := self pyDict.
	value := self pyInteger: 42.
	dict dictAt: 'answer' put: value.
	pythonStore at: 'data' put: dict.

	result := self track: (pythonStore at: 'data').
	self assert: result typeName equals: 'dict'.
	self assert: result dictSize equals: 1.
	readBack := self track: (result dictAt: 'answer').
	self assert: readBack asInteger equals: 42.
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testEmptyDictRoundTrip

	| dict result |
	dict := self pyDict.
	pythonStore at: 'data' put: dict.

	result := self track: (pythonStore at: 'data').
	self assert: result typeName equals: 'dict'.
	self assert: result dictSize equals: 0.
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testEmptyListRoundTrip

	| list result |
	list := self pyList: 0.
	pythonStore at: 'data' put: list.

	result := self track: (pythonStore at: 'data').
	self assert: result typeName equals: 'list'.
	self assert: result listSize equals: 0.
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testFloatRoundTrip

	| obj result |
	obj := self pyFloat: 3.14.
	pythonStore at: 'x' put: obj.

	result := self track: (pythonStore at: 'x').
	self assert: result asFloat equals: 3.14.
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testIntegerRoundTrip

	| obj result |
	obj := self pyInteger: 42.
	pythonStore at: 'x' put: obj.

	result := self track: (pythonStore at: 'x').
	self assert: result asInteger equals: 42.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testKeys

	| obj1 obj2 keys |
	obj1 := self pyInteger: 1.
	obj2 := self pyInteger: 2.
	pythonStore at: 'a' put: obj1.
	pythonStore at: 'b' put: obj2.

	keys := pythonStore keys asSortedCollection asArray.
	self assert: keys equals: #('a' 'b').
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testListRoundTrip

	| list result result0 result1 |
	list := self pyList: 0.
	list listAppend: (self pyInteger: 10).
	list listAppend: (self pyInteger: 20).
	pythonStore at: 'data' put: list.

	result := self track: (pythonStore at: 'data').
	self assert: result typeName equals: 'list'.
	self assert: result listSize equals: 2.
	result0 := self track: (result listAt: 0).
	self assert: result0 asInteger equals: 10.
	result1 := self track: (result listAt: 1).
	self assert: result1 asInteger equals: 20.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testLoadAllEmpty

	| results |
	results := pythonStore loadAll.
	self assert: results isEmpty.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testLoadAllPreservesIdentity

	| shared dict1 dict2 results value1 value2 |
	shared := self pyList: 0.
	shared listAppend: (self pyInteger: 99).
	dict1 := self pyDict.
	dict1 dictAt: 'data' put: shared.
	dict2 := self pyDict.
	dict2 dictAt: 'data' put: shared.

	pythonStore storeAll: {
		'first' -> dict1.
		'second' -> dict2
	}.

	results := pythonStore loadAll.
	value1 := self track: (results at: 'first').
	value2 := self track: (results at: 'second').
	self assert: (self track: (value1 dictAt: 'data')) pointer memoryAddress
		equals: (self track: (value2 dictAt: 'data')) pointer memoryAddress.
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testNestedDictRoundTrip

	| dict scores meta result readBack resultScores resultMeta |
	dict := self pyDict.
	dict dictAt: 'project' put: (self pyString: 'Grail').
	scores := self pyList: 0.
	scores listAppend: (self pyInteger: 95).
	scores listAppend: (self pyInteger: 87).
	scores listAppend: (self pyInteger: 92).
	dict dictAt: 'scores' put: scores.
	meta := self pyDict.
	meta dictAt: 'version' put: (self pyInteger: 1).
	dict dictAt: 'meta' put: meta.
	pythonStore at: 'nested' put: dict.

	result := self track: (pythonStore at: 'nested').
	self assert: result typeName equals: 'dict'.
	readBack := self track: (result dictAt: 'project').
	self assert: readBack asString equals: 'Grail'.

	resultScores := self track: (result dictAt: 'scores').
	self assert: resultScores typeName equals: 'list'.
	self assert: resultScores listSize equals: 3.

	resultMeta := self track: (result dictAt: 'meta').
	self assert: resultMeta typeName equals: 'dict'.
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testNoneRoundTrip

	| obj result |
	obj := self pyNone.
	pythonStore at: 'x' put: obj.

	self assert: (pythonStore rawAt: 'x') == None.
	result := self track: (pythonStore at: 'x').
	self assert: result typeName equals: 'NoneType'.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testRawAt

	| obj raw |
	obj := self pyInteger: 42.
	pythonStore at: 'x' put: obj.

	raw := pythonStore rawAt: 'x'.
	self assert: raw equals: 42.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testRemoveKey

	| obj |
	obj := self pyInteger: 1.
	pythonStore at: 'x' put: obj.
	pythonStore removeKey: 'x'.

	self assert: (pythonStore at: 'x' ifAbsent: [ nil ]) isNil.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testRemoveKeyCompactsObjects

	| obj |
	obj := self pyInteger: 42.
	pythonStore at: 'x' put: obj.
	self assert: pythonStore notEmpty.

	pythonStore removeKey: 'x'.

	self assert: pythonStore isEmpty.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testRemoveKeyPreservesSharedObjects

	| shared dict1 dict2 result readBack |
	shared := self pyList: 0.
	shared listAppend: (self pyInteger: 99).
	dict1 := self pyDict.
	dict1 dictAt: 'data' put: shared.
	dict2 := self pyDict.
	dict2 dictAt: 'data' put: shared.
	pythonStore at: 'first' put: dict1.
	pythonStore at: 'second' put: dict2.

	pythonStore removeKey: 'first'.

	self assert: (pythonStore at: 'first' ifAbsent: [ nil ]) isNil.
	result := self track: (pythonStore at: 'second').
	self assert: result typeName equals: 'dict'.
	readBack := self track: (result dictAt: 'data').
	self assert: readBack listSize equals: 1.
%
category: 'Tests - Store Operations'
method: PythonStoreTestCase
testStoreAllEmpty

	pythonStore storeAll: #().
	self assert: pythonStore isEmpty.
%
category: 'Tests - Identity'
method: PythonStoreTestCase
testStoreAllPreservesIdentity

	| shared dict1 dict2 |
	shared := self pyList: 0.
	shared listAppend: (self pyInteger: 99).
	dict1 := self pyDict.
	dict1 dictAt: 'data' put: shared.
	dict2 := self pyDict.
	dict2 dictAt: 'data' put: shared.

	pythonStore storeAll: {
		'first' -> dict1.
		'second' -> dict2
	}.

	self assert: ((pythonStore rawAt: 'first') at: 'data')
		== ((pythonStore rawAt: 'second') at: 'data').
%
category: 'Tests - Scalar Round-Trip'
method: PythonStoreTestCase
testStringRoundTrip

	| obj result |
	obj := self pyString: 'hello'.
	pythonStore at: 'x' put: obj.

	result := self track: (pythonStore at: 'x').
	self assert: result asString equals: 'hello'.
%
category: 'Tests - Container Round-Trip'
method: PythonStoreTestCase
testTupleRoundTrip

	| tuple result result0 result1 |
	tuple := self pyTuple: 2.
	tuple tupleAt: 0 put: (self pyString: 'a').
	tuple tupleAt: 1 put: (self pyString: 'b').
	pythonStore at: 'data' put: tuple.

	result := self track: (pythonStore at: 'data').
	self assert: result typeName equals: 'tuple'.
	self assert: result tupleSize equals: 2.
	result0 := self track: (result tupleAt: 0).
	self assert: result0 asString equals: 'a'.
	result1 := self track: (result tupleAt: 1).
	self assert: result1 asString equals: 'b'.
%
