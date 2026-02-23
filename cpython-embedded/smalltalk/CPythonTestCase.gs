! ------------------- Superclass check
run
CPythonLibrary ifNil: [self error: 'CPythonLibrary is not defined. Check file ordering.'].
CPythonObject ifNil: [self error: 'CPythonObject is not defined. Check file ordering.'].
%

! ------------------- Class definition for CPythonTestCase
expectvalue /Class
doit
TestCase subclass: 'CPythonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: UserGlobals
  options: #()

%

expectvalue /Class
doit
CPythonTestCase category: 'SUnit'
%

! ===============================================================================
! CPythonTestCase - Tests for CPython FFI integration
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CPythonTestCase removeAllMethods.
CPythonTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Setup
! ===============================================================================

category: 'Setup'
method: CPythonTestCase
setUp
	"Ensure the Python interpreter is initialized."

	CPythonLibrary current.
%

! ===============================================================================
! Tests - Lifecycle
! ===============================================================================

category: 'Tests - Lifecycle'
method: CPythonTestCase
testInitialize
	"The interpreter should be initialized after accessing CPythonLibrary current."

	| lib |
	lib := CPythonLibrary current.
	self assert: lib notNil.
%

category: 'Tests - Lifecycle'
method: CPythonTestCase
testIsInitialized
	"isInitialized should return true."

	self assert: CPythonLibrary current isInitialized.
%

! ===============================================================================
! Tests - Simple Execution
! ===============================================================================

category: 'Tests - Simple Execution'
method: CPythonTestCase
testRunSimpleString
	"Running valid Python code should return 0 (success)."

	| result |
	result := CPythonLibrary current runSimpleString: 'x = 1 + 1'.
	self assert: result equals: 0.
%

category: 'Tests - Simple Execution'
method: CPythonTestCase
testRunSimpleStringError
	"Running code that raises should signal CPythonError.
	Redirect stderr to suppress PyRun_SimpleString's traceback output."

	| lib |
	lib := CPythonLibrary current.
	lib runString: 'import sys, io; sys.stderr = io.StringIO()'.
	[
		self should: [
			lib runSimpleString: 'raise ValueError("boom")'
		] raise: Error.
	] ensure: [
		lib runString: 'sys.stderr = sys.__stderr__'
	].
%

category: 'Tests - Simple Execution'
method: CPythonTestCase
testRunSimpleStringSyntaxError
	"Running invalid syntax should signal CPythonError.
	Redirect stderr to suppress PyRun_SimpleString's traceback output."

	| lib |
	lib := CPythonLibrary current.
	lib runString: 'import sys, io; sys.stderr = io.StringIO()'.
	[
		self should: [
			lib runSimpleString: 'def'
		] raise: Error.
	] ensure: [
		lib runString: 'sys.stderr = sys.__stderr__'
	].
%

category: 'Tests - Simple Execution'
method: CPythonTestCase
testRunStringError
	"runString: should signal CPythonError with error details preserved."

	self should: [
		CPythonLibrary current runString: 'raise ValueError("boom")'
	] raise: Error.
%

category: 'Tests - Simple Execution'
method: CPythonTestCase
testRunStringSyntaxError
	"runString: with invalid syntax should signal CPythonError."

	self should: [
		CPythonLibrary current runString: 'def'
	] raise: Error.
%

! ===============================================================================
! Tests - Integer Conversion
! ===============================================================================

category: 'Tests - Integer Conversion'
method: CPythonTestCase
testIntegerFromSmallInt
	"Create a Python int from 42, read it back."

	| obj |
	obj := CPythonObject fromInteger: 42.
	[ self assert: obj asInteger equals: 42 ]
		ensure: [ obj release ].
%

category: 'Tests - Integer Conversion'
method: CPythonTestCase
testIntegerFromNegative
	"Negative integers should round-trip."

	| obj |
	obj := CPythonObject fromInteger: -7.
	[ self assert: obj asInteger equals: -7 ]
		ensure: [ obj release ].
%

category: 'Tests - Integer Conversion'
method: CPythonTestCase
testIntegerFromZero
	"Zero should round-trip."

	| obj |
	obj := CPythonObject fromInteger: 0.
	[ self assert: obj asInteger equals: 0 ]
		ensure: [ obj release ].
%

category: 'Tests - Integer Conversion'
method: CPythonTestCase
testIntegerRoundTrip
	"Create a Python int, convert to str, read back as Smalltalk String."

	| obj strObj |
	obj := CPythonObject fromInteger: 123.
	[
		strObj := obj str.
		[ self assert: strObj asString equals: '123' ]
			ensure: [ strObj release ].
	] ensure: [ obj release ].
%

! ===============================================================================
! Tests - Float Conversion
! ===============================================================================

category: 'Tests - Float Conversion'
method: CPythonTestCase
testFloatFromDouble
	"Create a Python float from 3.14, read it back."

	| obj |
	obj := CPythonObject fromFloat: 3.14.
	[ self assert: obj asFloat equals: 3.14 ]
		ensure: [ obj release ].
%

category: 'Tests - Float Conversion'
method: CPythonTestCase
testFloatFromNegative
	"Negative floats should round-trip."

	| obj |
	obj := CPythonObject fromFloat: -2.5.
	[ self assert: obj asFloat equals: -2.5 ]
		ensure: [ obj release ].
%

category: 'Tests - Float Conversion'
method: CPythonTestCase
testFloatFromZero
	"Float zero should round-trip."

	| obj |
	obj := CPythonObject fromFloat: 0.0.
	[ self assert: obj asFloat equals: 0.0 ]
		ensure: [ obj release ].
%

! ===============================================================================
! Tests - String Conversion
! ===============================================================================

category: 'Tests - String Conversion'
method: CPythonTestCase
testStringFromString
	"Create a Python str from 'hello', read it back."

	| obj |
	obj := CPythonObject fromString: 'hello'.
	[ self assert: obj asString equals: 'hello' ]
		ensure: [ obj release ].
%

category: 'Tests - String Conversion'
method: CPythonTestCase
testStringEmpty
	"Empty string should round-trip."

	| obj |
	obj := CPythonObject fromString: ''.
	[ self assert: obj asString equals: '' ]
		ensure: [ obj release ].
%

! ===============================================================================
! Tests - Boolean Conversion
! ===============================================================================

category: 'Tests - Boolean Conversion'
method: CPythonTestCase
testBooleanTrue
	"Python True should convert to Smalltalk true."

	| obj |
	obj := CPythonObject fromBoolean: true.
	[ self assert: obj asBool ]
		ensure: [ obj release ].
%

category: 'Tests - Boolean Conversion'
method: CPythonTestCase
testBooleanFalse
	"Python False should convert to Smalltalk false."

	| obj |
	obj := CPythonObject fromBoolean: false.
	[ self deny: obj asBool ]
		ensure: [ obj release ].
%

! ===============================================================================
! Tests - None
! ===============================================================================

category: 'Tests - None'
method: CPythonTestCase
testNone
	"Py_None should be non-nil and falsy."

	| obj |
	obj := CPythonObject none.
	[
		self assert: obj notNil.
		self deny: obj asBool.
	] ensure: [ obj release ].
%

category: 'Tests - None'
method: CPythonTestCase
testNoneStr
	"str(None) should return 'None'."

	| obj strObj |
	obj := CPythonObject none.
	[
		strObj := obj str.
		[ self assert: strObj asString equals: 'None' ]
			ensure: [ strObj release ].
	] ensure: [ obj release ].
%

! ===============================================================================
! Tests - Module Import
! ===============================================================================

category: 'Tests - Module Import'
method: CPythonTestCase
testImportMath
	"Should import the math module."

	| mod |
	mod := CPythonLibrary current importModule: 'math'.
	[
		self assert: mod notNil.
		self deny: mod isCallable.
	] ensure: [ mod release ].
%

category: 'Tests - Module Import'
method: CPythonTestCase
testImportSys
	"Should import the sys module."

	| mod |
	mod := CPythonLibrary current importModule: 'sys'.
	[ self assert: mod notNil ]
		ensure: [ mod release ].
%

category: 'Tests - Module Import'
method: CPythonTestCase
testImportNonexistent
	"Importing a nonexistent module should signal CPythonError."

	self should: [
		CPythonLibrary current importModule: 'nonexistent_module_xyz'
	] raise: Error.
%

! ===============================================================================
! Tests - Attribute Access
! ===============================================================================

category: 'Tests - Attribute Access'
method: CPythonTestCase
testGetAttribute
	"Get math.pi and verify it is approximately 3.14159."

	| mod pi |
	mod := CPythonLibrary current importModule: 'math'.
	[
		pi := mod getAttribute: 'pi'.
		[ self assert: (pi asFloat - 3.14159265 ) abs < 0.0001 ]
			ensure: [ pi release ].
	] ensure: [ mod release ].
%

category: 'Tests - Attribute Access'
method: CPythonTestCase
testSetAttribute
	"Set and read back a custom attribute on a module."

	| mod val readBack |
	mod := CPythonLibrary current importModule: 'sys'.
	val := CPythonObject fromInteger: 42.
	[
		mod setAttribute: '_grail_test' to: val.
		readBack := mod getAttribute: '_grail_test'.
		[ self assert: readBack asInteger equals: 42 ]
			ensure: [ readBack release ].
	] ensure: [
		val release.
		mod release.
	].
%

category: 'Tests - Attribute Access'
method: CPythonTestCase
testGetAttributeNonexistent
	"Getting a nonexistent attribute should signal CPythonError."

	| mod |
	mod := CPythonLibrary current importModule: 'sys'.
	[
		self should: [
			mod getAttribute: 'nonexistent_attr_xyz'
		] raise: Error.
	] ensure: [ mod release ].
%

! ===============================================================================
! Tests - Calling
! ===============================================================================

category: 'Tests - Calling'
method: CPythonTestCase
testCallFunction
	"Call math.sqrt(25.0) and verify the result is 5.0."

	| mod sqrt args result |
	mod := CPythonLibrary current importModule: 'math'.
	[
		sqrt := mod getAttribute: 'sqrt'.
		[
			self assert: sqrt isCallable.
			args := CPythonObject newTuple: 1.
			[
				args tupleAt: 0 put: (CPythonObject fromFloat: 25.0).
				result := sqrt callWith: args.
				[ self assert: result asFloat equals: 5.0 ]
					ensure: [ result release ].
			] ensure: [ args release ].
		] ensure: [ sqrt release ].
	] ensure: [ mod release ].
%

category: 'Tests - Calling'
method: CPythonTestCase
testCallWithNoArgs
	"Call sys.getrecursionlimit() and verify it returns a positive integer."

	| mod func result |
	mod := CPythonLibrary current importModule: 'sys'.
	[
		func := mod getAttribute: 'getrecursionlimit'.
		[
			result := func call.
			[ self assert: result asInteger > 0 ]
				ensure: [ result release ].
		] ensure: [ func release ].
	] ensure: [ mod release ].
%

category: 'Tests - Calling'
method: CPythonTestCase
testCallNonCallable
	"Calling a non-callable should signal CPythonError."

	| obj |
	obj := CPythonObject fromInteger: 42.
	[
		self should: [ obj call ] raise: Error.
	] ensure: [ obj release ].
%

! ===============================================================================
! Tests - Tuple
! ===============================================================================

category: 'Tests - Tuple'
method: CPythonTestCase
testTupleCreate
	"Create a tuple of size 2, set items, verify size."

	| tuple |
	tuple := CPythonObject newTuple: 2.
	[
		tuple tupleAt: 0 put: (CPythonObject fromInteger: 10).
		tuple tupleAt: 1 put: (CPythonObject fromInteger: 20).
		self assert: tuple tupleSize equals: 2.
	] ensure: [ tuple release ].
%

category: 'Tests - Tuple'
method: CPythonTestCase
testTupleGetItem
	"Create a tuple, set items, get them back."

	| tuple item |
	tuple := CPythonObject newTuple: 2.
	[
		tuple tupleAt: 0 put: (CPythonObject fromInteger: 10).
		tuple tupleAt: 1 put: (CPythonObject fromInteger: 20).
		item := tuple tupleAt: 0.
		[ self assert: item asInteger equals: 10 ]
			ensure: [ item release ].
		item := tuple tupleAt: 1.
		[ self assert: item asInteger equals: 20 ]
			ensure: [ item release ].
	] ensure: [ tuple release ].
%

category: 'Tests - Tuple'
method: CPythonTestCase
testTupleAsArg
	"Use a tuple as argument to math.sqrt."

	| mod sqrt args result |
	mod := CPythonLibrary current importModule: 'math'.
	[
		sqrt := mod getAttribute: 'sqrt'.
		[
			args := CPythonObject newTuple: 1.
			[
				args tupleAt: 0 put: (CPythonObject fromFloat: 144.0).
				result := sqrt callWith: args.
				[ self assert: result asFloat equals: 12.0 ]
					ensure: [ result release ].
			] ensure: [ args release ].
		] ensure: [ sqrt release ].
	] ensure: [ mod release ].
%

! ===============================================================================
! Tests - List
! ===============================================================================

category: 'Tests - List'
method: CPythonTestCase
testListCreate
	"Create a list, set items, verify size."

	| list |
	list := CPythonObject newList: 2.
	[
		list listAt: 0 put: (CPythonObject fromInteger: 10).
		list listAt: 1 put: (CPythonObject fromInteger: 20).
		self assert: list listSize equals: 2.
	] ensure: [ list release ].
%

category: 'Tests - List'
method: CPythonTestCase
testListAppend
	"Create an empty list, append items, verify size."

	| list item |
	list := CPythonObject newList: 0.
	item := CPythonObject fromInteger: 42.
	[
		list listAppend: item.
		self assert: list listSize equals: 1.
	] ensure: [
		item release.
		list release.
	].
%

! ===============================================================================
! Tests - Dict
! ===============================================================================

category: 'Tests - Dict'
method: CPythonTestCase
testDictCreate
	"Create a dict, add entries, verify size."

	| dict val |
	dict := CPythonObject newDict.
	val := CPythonObject fromInteger: 42.
	[
		dict dictAt: 'answer' put: val.
		self assert: dict dictSize equals: 1.
	] ensure: [
		val release.
		dict release.
	].
%

category: 'Tests - Dict'
method: CPythonTestCase
testDictGetItem
	"Set a dict item and get it back."

	| dict val readBack |
	dict := CPythonObject newDict.
	val := CPythonObject fromString: 'world'.
	[
		dict dictAt: 'hello' put: val.
		readBack := dict dictAt: 'hello'.
		[ self assert: readBack asString equals: 'world' ]
			ensure: [ readBack release ].
	] ensure: [
		val release.
		dict release.
	].
%

category: 'Tests - Dict'
method: CPythonTestCase
testDictGetItemMissing
	"Getting a missing key should return nil (not signal an error)."

	| dict result |
	dict := CPythonObject newDict.
	[
		result := dict dictAt: 'no_such_key'.
		self assert: result equals: nil.
	] ensure: [ dict release ].
%

! ===============================================================================
! Tests - Type Inspection
! ===============================================================================

category: 'Tests - Type Inspection'
method: CPythonTestCase
testType
	"Get the type of an integer object."

	| obj typeObj nameObj |
	obj := CPythonObject fromInteger: 42.
	[
		typeObj := obj type.
		[
			nameObj := typeObj getAttribute: '__name__'.
			[ self assert: nameObj asString equals: 'int' ]
				ensure: [ nameObj release ].
		] ensure: [ typeObj release ].
	] ensure: [ obj release ].
%

category: 'Tests - Type Inspection'
method: CPythonTestCase
testIsCallable
	"An integer is not callable; math.sqrt is."

	| obj mod sqrt |
	obj := CPythonObject fromInteger: 42.
	[ self deny: obj isCallable ]
		ensure: [ obj release ].

	mod := CPythonLibrary current importModule: 'math'.
	[
		sqrt := mod getAttribute: 'sqrt'.
		[ self assert: sqrt isCallable ]
			ensure: [ sqrt release ].
	] ensure: [ mod release ].
%

category: 'Tests - Type Inspection'
method: CPythonTestCase
testStr
	"str(42) should return '42'."

	| obj strObj |
	obj := CPythonObject fromInteger: 42.
	[
		strObj := obj str.
		[ self assert: strObj asString equals: '42' ]
			ensure: [ strObj release ].
	] ensure: [ obj release ].
%

category: 'Tests - Type Inspection'
method: CPythonTestCase
testRepr
	"repr('hello') should return the quoted form."

	| obj reprObj |
	obj := CPythonObject fromString: 'hello'.
	[
		reprObj := obj repr.
		[ self assert: reprObj asString equals: '''hello''' ]
			ensure: [ reprObj release ].
	] ensure: [ obj release ].
%

! ===============================================================================
! Tests - Error Handling
! ===============================================================================

category: 'Tests - Error Handling'
method: CPythonTestCase
testErrorTypeName
	"A ValueError should produce an Error whose message includes 'ValueError'."

	[
		CPythonLibrary current runString: 'raise ValueError("test message")'
	] on: Error do: [ :ex |
		self assert: (ex messageText includesString: 'ValueError').
		^ self.
	].
	self assert: false description: 'Expected Error was not signaled'.
%

category: 'Tests - Error Handling'
method: CPythonTestCase
testErrorMessage
	"The error message should be propagated."

	[
		CPythonLibrary current runString: 'raise ValueError("test message")'
	] on: Error do: [ :ex |
		self assert: (ex messageText includesString: 'test message').
		^ self.
	].
	self assert: false description: 'Expected Error was not signaled'.
%

category: 'Tests - Error Handling'
method: CPythonTestCase
testDivisionByZero
	"1/0 should raise ZeroDivisionError."

	[
		CPythonLibrary current runString: '1/0'
	] on: Error do: [ :ex |
		self assert: (ex messageText includesString: 'ZeroDivisionError').
		^ self.
	].
	self assert: false description: 'Expected Error was not signaled'.
%

! ===============================================================================
! Tests - Reference Counting
! ===============================================================================

category: 'Tests - Reference Counting'
method: CPythonTestCase
testRelease
	"After release, pointer should be nil."

	| obj |
	obj := CPythonObject fromInteger: 42.
	obj release.
	self assert: obj pointer equals: nil.
%

category: 'Tests - Reference Counting'
method: CPythonTestCase
testDoubleReleaseSafe
	"Releasing twice should not crash."

	| obj |
	obj := CPythonObject fromInteger: 42.
	obj release.
	obj release.
	self assert: obj pointer equals: nil.
%

category: 'Tests - Reference Counting'
method: CPythonTestCase
testTupleSetItemStealsReference
	"After tupleAt:put:, the inserted object should no longer be owned."

	| tuple item |
	tuple := CPythonObject newTuple: 1.
	item := CPythonObject fromInteger: 99.
	[
		self assert: item isOwned.
		tuple tupleAt: 0 put: item.
		self deny: item isOwned.
	] ensure: [ tuple release ].
%

! ===============================================================================
! Tests - Integration
! ===============================================================================

category: 'Tests - Integration'
method: CPythonTestCase
testCallMathSqrt
	"Full round-trip: import math, get sqrt, build args, call, extract result."

	| lib mod sqrt args result |
	lib := CPythonLibrary current.
	mod := lib importModule: 'math'.
	[
		sqrt := mod getAttribute: 'sqrt'.
		[
			args := CPythonObject newTuple: 1.
			[
				args tupleAt: 0 put: (CPythonObject fromFloat: 49.0).
				result := sqrt callWith: args.
				[ self assert: result asFloat equals: 7.0 ]
					ensure: [ result release ].
			] ensure: [ args release ].
		] ensure: [ sqrt release ].
	] ensure: [ mod release ].
%

category: 'Tests - Integration'
method: CPythonTestCase
testEvalAndExtractResult
	"Execute Python code, then extract a variable from __main__."

	| lib mainModule result |
	lib := CPythonLibrary current.
	lib runSimpleString: '_grail_test_val = 2 ** 10'.
	mainModule := lib importModule: '__main__'.
	[
		result := mainModule getAttribute: '_grail_test_val'.
		[ self assert: result asInteger equals: 1024 ]
			ensure: [ result release ].
	] ensure: [ mainModule release ].
%

category: 'Tests - Integration'
method: CPythonTestCase
testDictRoundTrip
	"Build a Python dict in Smalltalk, set multiple entries, read them back."

	| dict v1 v2 r1 r2 |
	dict := CPythonObject newDict.
	v1 := CPythonObject fromString: 'alpha'.
	v2 := CPythonObject fromInteger: 99.
	[
		dict dictAt: 'name' put: v1.
		dict dictAt: 'count' put: v2.
		self assert: dict dictSize equals: 2.
		r1 := dict dictAt: 'name'.
		[ self assert: r1 asString equals: 'alpha' ]
			ensure: [ r1 release ].
		r2 := dict dictAt: 'count'.
		[ self assert: r2 asInteger equals: 99 ]
			ensure: [ r2 release ].
	] ensure: [
		v1 release.
		v2 release.
		dict release.
	].
%

category: 'Tests - Integration'
method: CPythonTestCase
testListRoundTrip
	"Build a Python list, append items, read them back."

	| list item0 item1 r0 r1 |
	list := CPythonObject newList: 0.
	item0 := CPythonObject fromString: 'first'.
	item1 := CPythonObject fromString: 'second'.
	[
		list listAppend: item0.
		list listAppend: item1.
		self assert: list listSize equals: 2.
		r0 := list listAt: 0.
		[ self assert: r0 asString equals: 'first' ]
			ensure: [ r0 release ].
		r1 := list listAt: 1.
		[ self assert: r1 asString equals: 'second' ]
			ensure: [ r1 release ].
	] ensure: [
		item0 release.
		item1 release.
		list release.
	].
%

category: 'Tests - C Extension'
method: CPythonTestCase
testHashlibSha256
	"Use the hashlib C extension (wraps OpenSSL) to compute a SHA-256 hash.
	Demonstrates calling a third-party C library through Python's extension mechanism."

	| lib mainModule result |
	lib := CPythonLibrary current.
	lib runString: 'import hashlib; _grail_hash = hashlib.sha256(b"hello").hexdigest()'.
	mainModule := lib importModule: '__main__'.
	[
		result := mainModule getAttribute: '_grail_hash'.
		[ self assert: result asString equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' ]
			ensure: [ result release ].
	] ensure: [ mainModule release ].
%

category: 'Tests - C Extension'
method: CPythonTestCase
testZlibCrc32
	"Use the zlib C extension to compute a CRC-32 checksum.
	Demonstrates a C extension returning an integer result."

	| lib mainModule result |
	lib := CPythonLibrary current.
	lib runString: 'import zlib; _grail_crc = zlib.crc32(b"hello")'.
	mainModule := lib importModule: '__main__'.
	[
		result := mainModule getAttribute: '_grail_crc'.
		[ self assert: result asInteger equals: 907060870 ]
			ensure: [ result release ].
	] ensure: [ mainModule release ].
%

category: 'Tests - C Extension'
method: CPythonTestCase
testJsonRoundTrip
	"Use the json module (backed by the _json C accelerator) for serialization.
	Demonstrates a C extension doing string-to-string transformation."

	| lib mainModule result |
	lib := CPythonLibrary current.
	lib runString: 'import json; _grail_json = json.dumps({"a": 1, "b": [2, 3]}, sort_keys=True)'.
	mainModule := lib importModule: '__main__'.
	[
		result := mainModule getAttribute: '_grail_json'.
		[ self assert: result asString equals: '{"a": 1, "b": [2, 3]}' ]
			ensure: [ result release ].
	] ensure: [ mainModule release ].
%
