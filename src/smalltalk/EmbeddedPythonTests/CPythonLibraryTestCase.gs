fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonLibraryTestCase
expectvalue /Class
doit
CPythonTestCase subclass: 'CPythonLibraryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPythonTests
  options: #()

%
expectvalue /Class
doit
CPythonLibraryTestCase comment: 
'All tests run with a resource pool managed by setUp/tearDown (inherited from
CPythonTestCase). Use the factory methods (pyInteger:, pyFloat:, etc.) to
create CPythonObjects; they are automatically tracked and released in tearDown.
For objects returned by CPythonObject methods (getAttribute:, callWith:, etc.),
wrap the send in track: to register them with the pool.

	result := self track: (module getAttribute: ''pi'').

Stolen references (tupleAt:put:, listAt:put:) are safe: markStolen sets
isOwned to false, so release is a no-op when tearDown drains the pool.'
%
expectvalue /Class
doit
CPythonLibraryTestCase category: 'SUnit'
%
! ------------------- Remove existing behavior from CPythonLibraryTestCase
removeallmethods CPythonLibraryTestCase
removeallclassmethods CPythonLibraryTestCase
! ------------------- Class methods for CPythonLibraryTestCase
! ------------------- Instance methods for CPythonLibraryTestCase
category: 'Tests - Boolean Conversion'
method: CPythonLibraryTestCase
testBooleanFalse

	| obj |
	obj := self pyBoolean: false.

	self deny: obj asBool.
%
category: 'Tests - Boolean Conversion'
method: CPythonLibraryTestCase
testBooleanTrue

	| obj |
	obj := self pyBoolean: true.

	self assert: obj asBool.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testCallNonCallableRaisesError

	| obj |
	obj := self pyInteger: 42.

	self should: [ obj call ] raise: CPythonException.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testCallWithArguments

	| module sqrt arg result |
	module := self importModule: 'math'.
	sqrt := self track: (module getAttribute: 'sqrt').
	arg := self pyFloat: 25.0.

	result := self track: (sqrt callWithArguments: { arg }).

	self assert: result asFloat equals: 5.0.
	self assert: arg pointer notNil description: 'Caller''s object should not be affected'.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testCallWithArgumentsEmpty

	| module function result |
	module := self importModule: 'sys'.
	function := self track: (module getAttribute: 'getrecursionlimit').

	result := self track: (function callWithArguments: {}).

	self assert: result asInteger > 0.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testCallWithNoArgs

	| module function result |
	module := self importModule: 'sys'.
	function := self track: (module getAttribute: 'getrecursionlimit').

	result := self track: function call.

	self assert: result asInteger > 0.
%
category: 'Tests - Dict'
method: CPythonLibraryTestCase
testDictGetItem

	| dict value readBack |
	dict := self pyDict.
	value := self pyString: 'world'.
	dict dictAt: 'hello' put: value.

	readBack := self track: (dict dictAt: 'hello').

	self assert: readBack asString equals: 'world'.
%
category: 'Tests - Dict'
method: CPythonLibraryTestCase
testDictGetItemMissingReturnsNil

	| dict result |
	dict := self pyDict.

	result := dict dictAt: 'no_such_key'.

	self assert: result isNil.
%
category: 'Tests - Integration'
method: CPythonLibraryTestCase
testDictRoundTrip

	| dict value1 value2 result1 result2 |
	dict := self pyDict.
	value1 := self pyString: 'alpha'.
	value2 := self pyInteger: 99.

	dict dictAt: 'name' put: value1.
	dict dictAt: 'count' put: value2.

	self assert: dict dictSize equals: 2.
	result1 := self track: (dict dictAt: 'name').
	self assert: result1 asString equals: 'alpha'.
	result2 := self track: (dict dictAt: 'count').
	self assert: result2 asInteger equals: 99.
%
category: 'Tests - Dict'
method: CPythonLibraryTestCase
testDictSetItemUpdatesSize

	| dict value |
	dict := self pyDict.
	value := self pyInteger: 42.

	dict dictAt: 'answer' put: value.

	self assert: dict dictSize equals: 1.
%
category: 'Tests - Reference Counting'
method: CPythonLibraryTestCase
testDoubleReleaseSafe

	| obj |
	obj := CPythonObject fromInteger: 42.

	obj release.
	obj release.

	self assert: obj pointer equals: nil.
%
category: 'Tests - Integration'
method: CPythonLibraryTestCase
testEvalAndExtractResult

	| result |
	result := self track: (pythonLibrary evalExpression: '2 ** 10').

	self assert: result asInteger equals: 1024.
%
category: 'Tests - Float Conversion'
method: CPythonLibraryTestCase
testFloatFromDouble

	| obj |
	obj := self pyFloat: 3.14.

	self assert: obj asFloat equals: 3.14.
%
category: 'Tests - Float Conversion'
method: CPythonLibraryTestCase
testFloatFromNegative

	| obj |
	obj := self pyFloat: -2.5.

	self assert: obj asFloat equals: -2.5.
%
category: 'Tests - Float Conversion'
method: CPythonLibraryTestCase
testFloatFromZero

	| obj |
	obj := self pyFloat: 0.0.

	self assert: obj asFloat equals: 0.0.
%
category: 'Tests - Type Inspection'
method: CPythonLibraryTestCase
testFunctionIsCallable

	| module sqrt |
	module := self importModule: 'math'.
	sqrt := self track: (module getAttribute: 'sqrt').

	self assert: sqrt isCallable.
%
category: 'Tests - Attribute Access'
method: CPythonLibraryTestCase
testGetAttribute

	| module pi |
	module := self importModule: 'math'.

	pi := self track: (module getAttribute: 'pi').

	self assert: (pi asFloat - 3.14159265) abs < 0.0001.
%
category: 'Tests - Attribute Access'
method: CPythonLibraryTestCase
testGetAttributeNonexistentRaisesError

	| module |
	module := self importModule: 'sys'.

	self should: [ module getAttribute: 'nonexistent_attr_xyz' ] raise: CPythonException.
%
category: 'Tests - C Extension'
method: CPythonLibraryTestCase
testHashlibSha256

	| result |

	self importModule: 'hashlib'.
	result := self track: (pythonLibrary evalExpression: 'hashlib.sha256(b"hello").hexdigest()').

	self assert: result asString equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
%
category: 'Tests - Module Import'
method: CPythonLibraryTestCase
testImportModule

	| module |
	module := self importModule: 'math'.

	self assert: module notNil.
	self deny: module isCallable.
%
category: 'Tests - Module Import'
method: CPythonLibraryTestCase
testImportNonexistentModuleRaisesError

	self should: [
		pythonLibrary importModule: 'nonexistent_module_xyz'
	] raise: CPythonException.
%
category: 'Tests - Integer Conversion'
method: CPythonLibraryTestCase
testIntegerFromNegative

	| obj |
	obj := self pyInteger: -7.

	self assert: obj asInteger equals: -7.
%
category: 'Tests - Integer Conversion'
method: CPythonLibraryTestCase
testIntegerFromSmallInt

	| obj |
	obj := self pyInteger: 42.

	self assert: obj asInteger equals: 42.
%
category: 'Tests - Integer Conversion'
method: CPythonLibraryTestCase
testIntegerFromZero

	| obj |
	obj := self pyInteger: 0.

	self assert: obj asInteger equals: 0.
%
category: 'Tests - Integer Conversion'
method: CPythonLibraryTestCase
testIntegerToStringConversion

	| obj stringObject |
	obj := self pyInteger: 123.

	stringObject := self track: obj str.

	self assert: stringObject asString equals: '123'.
%
category: 'Tests - Lifecycle'
method: CPythonLibraryTestCase
testIsInitialized

	self assert: pythonLibrary isInitialized.
%
category: 'Tests - C Extension'
method: CPythonLibraryTestCase
testJsonRoundTrip

	| result |

	self importModule: 'json'.
	result := self track: (pythonLibrary evalExpression: 'json.dumps({"a": 1, "b": [2, 3]}, sort_keys=True)').

	self assert: result asString equals: '{"a": 1, "b": [2, 3]}'.
%
category: 'Tests - List'
method: CPythonLibraryTestCase
testListAppend

	| list item |
	list := self pyList: 0.
	item := self pyInteger: 42.

	list listAppend: item.

	self assert: list listSize equals: 1.
%
category: 'Tests - Integration'
method: CPythonLibraryTestCase
testListRoundTrip

	| list item0 item1 result0 result1 |
	list := self pyList: 0.
	item0 := self pyString: 'first'.
	item1 := self pyString: 'second'.

	list listAppend: item0.
	list listAppend: item1.

	self assert: list listSize equals: 2.
	result0 := self track: (list listAt: 0).
	self assert: result0 asString equals: 'first'.
	result1 := self track: (list listAt: 1).
	self assert: result1 asString equals: 'second'.
%
category: 'Tests - List'
method: CPythonLibraryTestCase
testListSetItemStoresValue

	| list result0 result1 |
	list := self pyList: 2.

	list listAt: 0 put: (self pyInteger: 10).
	list listAt: 1 put: (self pyInteger: 20).

	result0 := self track: (list listAt: 0).
	result1 := self track: (list listAt: 1).
	self assert: result0 asInteger equals: 10.
	self assert: result1 asInteger equals: 20.
%
category: 'Tests - None'
method: CPythonLibraryTestCase
testNoneBehavior

	| obj |
	obj := self pyNone.

	self assert: obj notNil.
	self deny: obj asBool.
	self assert: (self track: obj str) asString equals: 'None'.
%
category: 'Tests - Type Inspection'
method: CPythonLibraryTestCase
testNonFunctionIsNotCallable

	| obj |
	obj := self pyInteger: 42.

	self deny: obj isCallable.
%
category: 'Tests - Error Handling'
method: CPythonLibraryTestCase
testPythonExceptionIncludesTypeAndMessage

	[
		pythonLibrary runStatements: 'raise ValueError("test message")'
	] on: CPythonException do: [ :ex |
		self assert: ex pythonTypeName equals: 'ValueError'.
		self assert: (ex pythonMessage includesString: 'test message').
		^ self.
	].
	self assert: false description: 'Expected CPythonException was not signaled'.
%
category: 'Tests - Error Handling'
method: CPythonLibraryTestCase
testPythonRuntimeErrorIsPropagated

	[
		pythonLibrary runStatements: '1/0'
	] on: CPythonException do: [ :ex |
		self assert: ex pythonTypeName equals: 'ZeroDivisionError'.
		self assert: (ex messageText includesString: 'division by zero').
		^ self.
	].
	self assert: false description: 'Expected CPythonException was not signaled'.
%
category: 'Tests - Reference Counting'
method: CPythonLibraryTestCase
testReleaseNilsPointer

	| obj |
	obj := CPythonObject fromInteger: 42.

	obj release.

	self assert: obj pointer equals: nil.
%
category: 'Tests - Type Inspection'
method: CPythonLibraryTestCase
testReprOfStringReturnsQuotedForm

	| obj reprObject |
	obj := self pyString: 'hello'.

	reprObject := self track: obj repr.

	self assert: reprObject asString equals: '''hello'''.
%
category: 'Tests - Simple Execution'
method: CPythonLibraryTestCase
testRunStringError

	self should: [
		pythonLibrary runStatements: 'raise ValueError("boom")'
	] raise: CPythonException.
%
category: 'Tests - Simple Execution'
method: CPythonLibraryTestCase
testRunStringSyntaxError

	self should: [
		pythonLibrary runStatements: 'def'
	] raise: CPythonException.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testSendNoArgs

	| string result |
	string := self pyString: 'hello'.

	result := self track: (string send: 'upper').

	self assert: result asString equals: 'HELLO'.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testSendNonexistentMethodRaisesError

	| string |
	string := self pyString: 'hello'.

	self should: [ string send: 'nonexistent_method_xyz' ] raise: CPythonException.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testSendOnList

	| list result |
	list := self pyList: 0.
	list listAppend: (self pyInteger: 3).
	list listAppend: (self pyInteger: 1).
	list listAppend: (self pyInteger: 2).

	list send: 'sort'.

	result := self track: (list listAt: 0).
	self assert: result asInteger equals: 1.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testSendWithArguments

	| string old new result |
	string := self pyString: 'hello world'.
	old := self pyString: 'world'.
	new := self pyString: 'GemStone'.

	result := self track: (string send: 'replace' withArguments: { old . new }).

	self assert: result asString equals: 'hello GemStone'.
%
category: 'Tests - Calling'
method: CPythonLibraryTestCase
testSendWithArgumentsDoesNotAffectSenderObjects

	| string old new |
	string := self pyString: 'hello world'.
	old := self pyString: 'world'.
	new := self pyString: 'GemStone'.

	self track: (string send: 'replace' withArguments: { old . new }).

	self assert: old pointer notNil description: 'Sender''s object should not be affected'.
	self assert: new pointer notNil description: 'Sender''s object should not be affected'.
%
category: 'Tests - Attribute Access'
method: CPythonLibraryTestCase
testSetAttribute

	| module value readBack |
	module := self importModule: 'sys'.
	value := self pyInteger: 42.

	module setAttribute: '_grail_test' to: value.

	readBack := self track: (module getAttribute: '_grail_test').
	self assert: readBack asInteger equals: 42.
%
category: 'Tests - String Conversion'
method: CPythonLibraryTestCase
testStringEmpty

	| obj |
	obj := self pyString: ''.

	self assert: obj asString equals: ''.
%
category: 'Tests - String Conversion'
method: CPythonLibraryTestCase
testStringFromString

	| obj |
	obj := self pyString: 'hello'.

	self assert: obj asString equals: 'hello'.
%
category: 'Tests - Type Inspection'
method: CPythonLibraryTestCase
testStrReturnsStringRepresentation

	| obj stringObject |
	obj := self pyInteger: 42.

	stringObject := self track: obj str.

	self assert: stringObject asString equals: '42'.
%
category: 'Tests - Reference Counting'
method: CPythonLibraryTestCase
testTracemallocNoLeaks
	"Verify that creating and releasing CPythonObjects does not leak memory.
	The first loop warms up Python's internal caches (free lists, code objects,
	frame allocators, interned strings). A before/after snapshot in a single
	tracemalloc session measures the second loop; measurement overhead from
	the runStatements: sends cancel out in the subtraction."

	| doLoop net |
	self importModule: 'tracemalloc'.

	doLoop := [
		1 to: 100 do: [ :i |
			(CPythonObject fromString: 'grail_tm_test_', i printString) release.
			(CPythonObject fromFloat: i * 1.1) release.
			(CPythonObject fromInteger: i + 1000000) release.
		].
	].

	pythonLibrary runStatements: 'import tracemalloc as _tm, gc as _gc; _tm.start()'.
	[
		doLoop value.
		pythonLibrary runStatements: '_gc.collect(); _gc.collect(); _before = _tm.get_traced_memory()[0]'.
		doLoop value.
		pythonLibrary runStatements: '_gc.collect(); _gc.collect(); _after = _tm.get_traced_memory()[0]'.
	] ensure: [
		pythonLibrary runStatements: '_tm.stop()'.
	].

	net := (self track: (pythonLibrary evalExpression: '_after - _before')) asInteger.
	pythonLibrary runStatements: 'del _tm, _gc, _before, _after'.

	"A real leak from 300 object create/release cycles would be tens of KB;
	the 2 KB threshold absorbs rare tracemalloc bookkeeping spikes observed
	when the convergence runner repeatedly starts/stops tracemalloc."
	self assert: net < 2048 description: 'Possible leak: ' , net printString , ' bytes'.
%
category: 'Tests - Tuple'
method: CPythonLibraryTestCase
testTupleAsArg

	| module sqrt args result |
	module := self importModule: 'math'.
	sqrt := self track: (module getAttribute: 'sqrt').
	args := self pyTuple: 1.
	args tupleAt: 0 put: (self pyFloat: 144.0).

	result := self track: (sqrt callWith: args).

	self assert: result asFloat equals: 12.0.
%
category: 'Tests - Reference Counting'
method: CPythonLibraryTestCase
testTupleSetItemStealsReference

	| tuple item |
	tuple := self pyTuple: 1.
	item := self pyInteger: 99.
	self assert: item isOwned.

	tuple tupleAt: 0 put: item.

	self deny: item isOwned.
%
category: 'Tests - Tuple'
method: CPythonLibraryTestCase
testTupleSetItemStoresValue

	| tuple result0 result1 |
	tuple := self pyTuple: 2.

	tuple tupleAt: 0 put: (self pyInteger: 10).
	tuple tupleAt: 1 put: (self pyInteger: 20).

	result0 := self track: (tuple tupleAt: 0).
	result1 := self track: (tuple tupleAt: 1).
	self assert: result0 asInteger equals: 10.
	self assert: result1 asInteger equals: 20.
%
category: 'Tests - Type Inspection'
method: CPythonLibraryTestCase
testTypeName

	| obj |
	obj := self pyInteger: 1.
	self assert: obj typeName equals: 'int'.

	obj := self pyString: 'hi'.
	self assert: obj typeName equals: 'str'.

	obj := self pyDict.
	self assert: obj typeName equals: 'dict'.
%
category: 'Tests - C Extension'
method: CPythonLibraryTestCase
testZlibCrc32

	| result |

	self importModule: 'zlib'.
	result := self track: (pythonLibrary evalExpression: 'zlib.crc32(b"hello")').

	self assert: result asInteger equals: 907060870.
%
