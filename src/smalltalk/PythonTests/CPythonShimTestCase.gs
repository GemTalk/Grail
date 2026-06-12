! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------------------- Class definition for CPythonShimTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CPythonShimTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CPythonShimTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CPythonShimTestCase - Tests for C extension modules via cpython User Action
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CPythonShimTestCase removeAllMethods.
CPythonShimTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! Setup
! ===============================================================================

category: 'Grail-Setup'
method: CPythonShimTestCase
setUp
	"Ensure the shim library is loaded."

	CPythonShim current.
%

! ===============================================================================
! Tests - Module Loading
! ===============================================================================

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadStatistics
	"The _statistics module should load successfully."

	self assert: (CPythonShim current loadModule: '_statistics') equals: true.
%

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadBisect
	"The _bisect module should load successfully."

	self assert: (CPythonShim current loadModule: '_bisect') equals: true.
%

! ===============================================================================
! Tests - _normal_dist_inv_cdf
! ===============================================================================

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfMedian
	"inv_cdf(0.5, 0, 1) = 0.0 — the median of the standard normal distribution."

	| result |
	result := CPythonShim current
		callModule: '_statistics'
		method: '_normal_dist_inv_cdf'
		doubles: { 0.5 . 0.0 . 1.0 }.
	self assert: result equals: 0.0.
%

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfMedianWithMu
	"inv_cdf(0.5, mu, sigma) = mu — the median always equals mu."

	| result |
	result := CPythonShim current
		callModule: '_statistics'
		method: '_normal_dist_inv_cdf'
		doubles: { 0.5 . 10.0 . 5.0 }.
	self assert: result equals: 10.0.
%

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfSymmetry
	"inv_cdf(p) and inv_cdf(1-p) should be symmetric around the mean."

	| shim low high |
	shim := CPythonShim current.
	low := shim callModule: '_statistics' method: '_normal_dist_inv_cdf'
		doubles: { 0.1 . 0.0 . 1.0 }.
	high := shim callModule: '_statistics' method: '_normal_dist_inv_cdf'
		doubles: { 0.9 . 0.0 . 1.0 }.
	self assert: (low + high) abs < 1e-10.
%

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfErrorAtZero
	"inv_cdf(0.0, 0, 1) should raise a ValueError."

	self should: [
		CPythonShim current
			callModule: '_statistics'
			method: '_normal_dist_inv_cdf'
			doubles: { 0.0 . 0.0 . 1.0 }.
	] raise: Error.
%

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfErrorAtOne
	"inv_cdf(1.0, 0, 1) should raise a ValueError."

	self should: [
		CPythonShim current
			callModule: '_statistics'
			method: '_normal_dist_inv_cdf'
			doubles: { 1.0 . 0.0 . 1.0 }.
	] raise: Error.
%

category: 'Grail-Tests - Statistics'
method: CPythonShimTestCase
testInvCdfKnownValue
	"inv_cdf(0.975, 0, 1) ≈ 1.96 — the 97.5th percentile of standard normal."

	| result |
	result := CPythonShim current
		callModule: '_statistics'
		method: '_normal_dist_inv_cdf'
		doubles: { 0.975 . 0.0 . 1.0 }.
	self assert: (result - 1.959963984540054) abs < 1e-10.
%

! ===============================================================================
! Tests - _bisect
! ===============================================================================

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectRightPresent
	"bisect_right finds the insertion point after an existing element."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_right'
		withList: #(1.0 2.0 3.0 4.0 5.0) andDouble: 3.0.
	self assert: result equals: 3.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectRightBetween
	"bisect_right finds the insertion point for a value between elements."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_right'
		withList: #(1.0 2.0 3.0 4.0 5.0) andDouble: 2.5.
	self assert: result equals: 2.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectLeftPresent
	"bisect_left finds the insertion point before an existing element."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_left'
		withList: #(1.0 2.0 3.0 4.0 5.0) andDouble: 3.0.
	self assert: result equals: 2.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectLeftBetween
	"bisect_left for a non-present value is the same as bisect_right."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_left'
		withList: #(1.0 2.0 3.0 4.0 5.0) andDouble: 2.5.
	self assert: result equals: 2.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectWithDuplicates
	"bisect_left and bisect_right differ for duplicate elements."

	| shim left right |
	shim := CPythonShim current.
	left := shim callModule: '_bisect' method: 'bisect_left'
		withList: #(1.0 2.0 2.0 2.0 3.0) andDouble: 2.0.
	right := shim callModule: '_bisect' method: 'bisect_right'
		withList: #(1.0 2.0 2.0 2.0 3.0) andDouble: 2.0.
	self assert: left equals: 1.
	self assert: right equals: 4.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectRightEmptyList
	"bisect_right on an empty list returns 0."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_right'
		withList: #() andDouble: 42.0.
	self assert: result equals: 0.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testInsortRight
	"insort_right inserts a value into the correct position."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'insort_right'
		insortList: #(1.0 3.0 5.0) value: 4.0.
	self assert: result equals: #(1.0 3.0 4.0 5.0).
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testInsortLeft
	"insort_left inserts before an existing duplicate."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'insort_left'
		insortList: #(1.0 2.0 3.0) value: 2.0.
	self assert: result equals: #(1.0 2.0 2.0 3.0).
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectRightBeforeAll
	"bisect_right returns 0 when value is smaller than all elements."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_right'
		withList: #(10.0 20.0 30.0) andDouble: 5.0.
	self assert: result equals: 0.
%

category: 'Grail-Tests - Bisect'
method: CPythonShimTestCase
testBisectRightAfterAll
	"bisect_right returns list size when value is larger than all elements."

	| result |
	result := CPythonShim current
		callModule: '_bisect' method: 'bisect_right'
		withList: #(10.0 20.0 30.0) andDouble: 99.0.
	self assert: result equals: 3.
%

! ===============================================================================
! Tests - _crc32c (Module Loading)
! ===============================================================================

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadCrc32c
	"The _crc32c module should load successfully."

	self assert: (CPythonShim current loadModule: '_crc32c') equals: true.
%

! ===============================================================================
! Tests - _crc32c (Direct CCallout)
! ===============================================================================

category: 'Grail-Tests - CRC32C'
method: CPythonShimTestCase
testCrc32cEmptyBytes
	"crc32c of empty bytes should be 0."

	| result |
	result := CPythonShim current
		callModule: '_crc32c' method: 'crc32c'
		withBytes: #[].
	self assert: result equals: 0.
%

category: 'Grail-Tests - CRC32C'
method: CPythonShimTestCase
testCrc32cKnownValue
	"crc32c of '123456789' should be 0xE3069283 (standard check value)."

	| result |
	result := CPythonShim current
		callModule: '_crc32c' method: 'crc32c'
		withBytes: '123456789' asByteArray.
	self assert: result equals: 16rE3069283.
%

category: 'Grail-Tests - CRC32C'
method: CPythonShimTestCase
testCrc32cExtendChaining
	"Chaining extend should produce the same result as a single crc32c call."

	| shim crc1 crc2 |
	shim := CPythonShim current.
	crc1 := shim callModule: '_crc32c' method: 'extend'
		extendCrc: 0 withBytes: '1234' asByteArray.
	crc2 := shim callModule: '_crc32c' method: 'extend'
		extendCrc: crc1 withBytes: '56789' asByteArray.
	self assert: crc2 equals: 16rE3069283.
%

category: 'Grail-Tests - CRC32C'
method: CPythonShimTestCase
testCrc32cSingleByte
	"crc32c of a single byte should return a valid checksum."

	| result |
	result := CPythonShim current
		callModule: '_crc32c' method: 'crc32c'
		withBytes: #[0].
	self assert: (result isKindOf: Integer).
	self assert: (result >= 0).
%

! ===============================================================================
! Tests - Python eval (same source code that runs in CPython)
! ===============================================================================

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalStatisticsFromImport
	"Evaluate the same Python source that CPython uses for _statistics.

	>>> from _statistics import _normal_dist_inv_cdf
	>>> _normal_dist_inv_cdf(0.5, 0.0, 1.0)
	0.0"

	| result |
	result := self eval:
'from _statistics import _normal_dist_inv_cdf
result = _normal_dist_inv_cdf(0.5, 0.0, 1.0)
result
'.
	self assert: result equals: 0.0.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalStatisticsKnownValue
	"Evaluate _statistics with a known result through Python source.

	>>> from _statistics import _normal_dist_inv_cdf
	>>> _normal_dist_inv_cdf(0.975, 0.0, 1.0)
	1.959963984540054"

	| result |
	result := self eval:
'from _statistics import _normal_dist_inv_cdf
result = _normal_dist_inv_cdf(0.975, 0.0, 1.0)
result
'.
	self assert: (result - 1.959963984540054) abs < 1e-10.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalBisectRight
	"Evaluate the same Python source that CPython uses for _bisect.

	>>> import _bisect
	>>> _bisect.bisect_right([1.0, 2.0, 3.0, 4.0, 5.0], 3.0)
	3"

	| result |
	result := self eval:
'import _bisect
result = _bisect.bisect_right([1.0, 2.0, 3.0, 4.0, 5.0], 3.0)
result
'.
	self assert: result equals: 3.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalBisectLeft
	"Evaluate bisect_left through Python source.

	>>> import _bisect
	>>> _bisect.bisect_left([1.0, 2.0, 3.0, 4.0, 5.0], 3.0)
	2"

	| result |
	result := self eval:
'import _bisect
result = _bisect.bisect_left([1.0, 2.0, 3.0, 4.0, 5.0], 3.0)
result
'.
	self assert: result equals: 2.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalInsortRight
	"Evaluate insort_right through Python source — modifies list in place.

	>>> import _bisect
	>>> a = [1.0, 3.0, 5.0]
	>>> _bisect.insort_right(a, 4.0)
	>>> a
	[1.0, 3.0, 4.0, 5.0]"

	| result |
	result := self eval:
'import _bisect
a = [1.0, 3.0, 5.0]
_bisect.insort_right(a, 4.0)
a
'.
	self assert: result asArray equals: #(1.0 3.0 4.0 5.0).
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalCrc32cBasic
	"Evaluate crc32c through Python source with the standard check value.

	>>> import _crc32c
	>>> _crc32c.crc32c(b'123456789')
	3808858755"

	| result |
	result := self eval:
'import _crc32c
result = _crc32c.crc32c(b''123456789'')
result
'.
	self assert: result equals: 16rE3069283.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalCrc32cEmpty
	"Evaluate crc32c of empty bytes through Python source.

	>>> import _crc32c
	>>> _crc32c.crc32c(b'')
	0"

	| result |
	result := self eval:
'import _crc32c
result = _crc32c.crc32c(b'''')
result
'.
	self assert: result equals: 0.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalCrc32cExtend
	"Evaluate crc32c extend chaining through Python source.

	>>> import _crc32c
	>>> crc = _crc32c.extend(0, b'1234')
	>>> _crc32c.extend(crc, b'56789')
	3808858755"

	| result |
	result := self eval:
'import _crc32c
crc = _crc32c.extend(0, b''1234'')
result = _crc32c.extend(crc, b''56789'')
result
'.
	self assert: result equals: 16rE3069283.
%

! ===============================================================================
! Tests - _shimtest (API test module)
! ===============================================================================

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadShimtest
	"The _shimtest module should load successfully."

	self assert: (CPythonShim current loadModule: '_shimtest') equals: true.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestFloat
	"test_float(x) -> x * 2.0"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_float'
		with: 3.14.
	self assert: result equals: 6.28.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestFloatNegative
	"test_float works with negative values."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_float'
		with: -5.0.
	self assert: result equals: -10.0.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestInt
	"test_int(n) -> n + 1"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_int'
		with: 41.
	self assert: result equals: 42.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestStringLen
	"test_string_len(s) -> len(s)"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_string_len'
		with: 'hello'.
	self assert: result equals: 5.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestListSum
	"test_list_sum(n) -> sum of [1..n] = n*(n+1)/2"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_list_sum'
		with: 5.
	self assert: result equals: 15.0.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestListModify
	"test_list_modify appends to an existing list."

	| oc result |
	oc := OrderedCollection withAll: { 1.0 . 2.0 . 3.0 }.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_list_modify'
		with: oc with: 4.0.
	self assert: result equals: 4.
	self assert: oc size equals: 4.
	self assert: (oc at: 4) equals: 4.0.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestBoolNotTrue
	"test_bool_not(true) -> false"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_bool_not'
		with: true.
	self assert: result equals: false.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestBoolNotFalse
	"test_bool_not(false) -> true"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_bool_not'
		with: false.
	self assert: result equals: true.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestNone
	"test_none() -> Python ``None`` (Py_None round-trips to the singleton)"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_none'.
	self assert: result equals: None.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestError
	"test_error() raises a ValueError."

	self should: [
		CPythonShim current
			callModule: '_shimtest' method: 'test_error'.
	] raise: Error.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestBytesLen
	"test_bytes_len(b) -> len(b)"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_bytes_len'
		with: 'hello' asByteArray.
	self assert: result equals: 5.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestListInsert
	"test_list_insert inserts a value at a given index."

	| oc |
	oc := OrderedCollection withAll: { 1.0 . 3.0 . 5.0 }.
	CPythonShim current
		callModule: '_shimtest' method: 'test_list_insert'
		with: oc with: 1 with: 2.0.
	self assert: oc asArray equals: #(1.0 2.0 3.0 5.0).
%

! ===============================================================================
! Tests - Dict API
! ===============================================================================

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictRoundtrip
	"test_dict_roundtrip sets a key-value pair and retrieves it."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_roundtrip'
		with: 'hello' with: 42.
	self assert: result equals: 42.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictRoundtripFloat
	"test_dict_roundtrip with float values."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_roundtrip'
		with: 'pi' with: 3.14.
	self assert: result equals: 3.14.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictStringKey
	"test_dict_string_key sets via C string key and retrieves."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_string_key'
		with: 99.
	self assert: result equals: 99.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictContains
	"test_dict_contains returns true after adding a key."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_contains'
		with: 'key1'.
	self assert: result equals: true.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictDel
	"test_dict_del removes a key, size becomes 0."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_del'
		with: 'removeMe' with: 42.
	self assert: result equals: 0.
%

! ===============================================================================
! Tests - Tuple API
! ===============================================================================

category: 'Grail-Tests - Tuple API'
method: CPythonShimTestCase
testTupleRoundtrip
	"test_tuple_roundtrip(a,b,c) -> b"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tuple_roundtrip'
		with: 10 with: 20 with: 30.
	self assert: result equals: 20.
%

category: 'Grail-Tests - Tuple API'
method: CPythonShimTestCase
testTupleRoundtripStrings
	"test_tuple_roundtrip works with strings."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tuple_roundtrip'
		with: 'a' with: 'b' with: 'c'.
	self assert: result equals: 'b'.
%

category: 'Grail-Tests - Tuple API'
method: CPythonShimTestCase
testTupleSize
	"test_tuple_size(n) -> n"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tuple_size'
		with: 5.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Tuple API'
method: CPythonShimTestCase
testTupleSizeZero
	"test_tuple_size(0) -> 0"

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tuple_size'
		with: 0.
	self assert: result equals: 0.
%

! ===============================================================================
! Tests - Object Protocol
! ===============================================================================

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testReprInteger
	"test_repr on an integer returns its __repr__."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_repr'
		with: 42.
	self assert: result equals: '42'.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testReprString
	"test_repr on a string returns a quoted representation."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_repr'
		with: 'hello'.
	self assert: result equals: '''hello'''.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testStrInteger
	"test_str on an integer returns its string form."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_str'
		with: 42.
	self assert: result equals: '42'.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testStrString
	"test_str on a string returns the string itself."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_str'
		with: 'hello'.
	self assert: result equals: 'hello'.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testLengthList
	"test_length on a list returns its size."

	| oc result |
	oc := OrderedCollection withAll: { 1 . 2 . 3 . 4 . 5 }.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_length'
		with: oc.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testLengthString
	"test_length on a string returns its size."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_length'
		with: 'hello'.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testHasattrTrue
	"test_hasattr returns true for an existing attribute."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_hasattr'
		with: 'hello' with: '__len__'.
	self assert: result equals: true.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testHasattrFalse
	"test_hasattr returns false for a non-existing attribute."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_hasattr'
		with: 42 with: 'nonexistent_attribute_xyz'.
	self assert: result equals: false.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testGetattr
	"test_getattr on an integer returns __class__."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_getattr'
		with: 42 with: '__class__'.
	self assert: (result isKindOf: Behavior).
%

! ===============================================================================
! Tests - Type Checks
! ===============================================================================

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksFloat
	"test_type_checks on a float returns bit0 (1)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: 3.14.
	self assert: (result bitAnd: 1) equals: 1.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksInt
	"test_type_checks on an integer returns bit1 (2)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: 42.
	self assert: (result bitAnd: 2) equals: 2.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksString
	"test_type_checks on a string returns bit2 (4)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: 'hello'.
	self assert: (result bitAnd: 4) equals: 4.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksBytes
	"test_type_checks on a ByteArray returns bit3 (8)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: #[1 2 3].
	self assert: (result bitAnd: 8) equals: 8.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksList
	"test_type_checks on an OrderedCollection returns bit4 (16)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: (OrderedCollection withAll: { 1 . 2 . 3 }).
	self assert: (result bitAnd: 16) equals: 16.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksDict
	"test_type_checks on a KeyValueDictionary returns bit5 (32)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: KeyValueDictionary new.
	self assert: (result bitAnd: 32) equals: 32.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testTypeChecksTuple
	"test_type_checks on an Array returns bit6 (64)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_checks'
		with: #(1 2 3).
	self assert: (result bitAnd: 64) equals: 64.
%

! ===============================================================================
! Tests - Additional API Coverage
! ===============================================================================

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestListSetItem
	"test_list_setitem sets an element and returns it."

	| oc result |
	oc := OrderedCollection withAll: { 10.0 . 20.0 . 30.0 }.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_list_setitem'
		with: oc with: 1 with: 99.0.
	self assert: result equals: 99.0.
	self assert: (oc at: 2) equals: 99.0.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestStringRoundtrip
	"test_string_roundtrip creates a new string from C and returns it."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_string_roundtrip'
		with: 'hello world'.
	self assert: result equals: 'hello world'.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestBytesRoundtrip
	"test_bytes_roundtrip creates bytes from C and returns the size."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_bytes_roundtrip'
		with: #[10 20 30 40 50].
	self assert: result equals: 5.
%

category: 'Grail-Tests - ShimTest API'
method: CPythonShimTestCase
testShimtestErrorFormat
	"test_error_format raises a formatted TypeError."

	self should: [
		CPythonShim current
			callModule: '_shimtest' method: 'test_error_format'
			with: 42.
	] raise: Error.
%

! ===============================================================================
! Tests - Rich Comparison
! ===============================================================================

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntLt
	"1 < 2 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 1 with: 2 with: 0.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntLtFalse
	"2 < 1 is false."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 2 with: 1 with: 0.
	self assert: result equals: false.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntLe
	"3 <= 3 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 3 with: 3 with: 1.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntEq
	"7 == 7 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 7 with: 7 with: 2.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntNe
	"3 != 5 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 3 with: 5 with: 3.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntGt
	"5 > 3 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 5 with: 3 with: 4.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareIntGe
	"5 >= 3 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 5 with: 3 with: 5.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareFloatLt
	"1.5 < 2.5 is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 1.5 with: 2.5 with: 0.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareStringEq
	"'abc' == 'abc' is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 'abc' with: 'abc' with: 2.
	self assert: result equals: true.
%

category: 'Grail-Tests - Rich Comparison'
method: CPythonShimTestCase
testRichCompareStringLt
	"'abc' < 'def' is true."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_richcompare'
		with: 'abc' with: 'def' with: 0.
	self assert: result equals: true.
%

! ===============================================================================
! Tests - _heapq (Heap Queue)
! ===============================================================================

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadHeapq
	"The _heapq module should load successfully."

	self assert: (CPythonShim current loadModule: '_heapq') equals: true.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqPushPop
	"heappush + heappop maintains sorted order."

	| shim heap result |
	shim := CPythonShim current.
	heap := OrderedCollection new.
	shim callModule: '_heapq' method: 'heappush' with: heap with: 3.0.
	shim callModule: '_heapq' method: 'heappush' with: heap with: 1.0.
	shim callModule: '_heapq' method: 'heappush' with: heap with: 2.0.
	result := shim callModule: '_heapq' method: 'heappop' with: heap.
	self assert: result equals: 1.0.
	result := shim callModule: '_heapq' method: 'heappop' with: heap.
	self assert: result equals: 2.0.
	result := shim callModule: '_heapq' method: 'heappop' with: heap.
	self assert: result equals: 3.0.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqHeapify
	"heapify transforms a list into a heap in-place."

	| shim heap result |
	shim := CPythonShim current.
	heap := OrderedCollection withAll: { 5.0 . 3.0 . 1.0 . 4.0 . 2.0 }.
	shim callModule: '_heapq' method: 'heapify' with: heap.
	"After heapify, the smallest element should be at position 0."
	result := shim callModule: '_heapq' method: 'heappop' with: heap.
	self assert: result equals: 1.0.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqHeapreplace
	"heapreplace pops the smallest and pushes a new item."

	| shim heap result |
	shim := CPythonShim current.
	heap := OrderedCollection withAll: { 1.0 . 3.0 . 5.0 }.
	shim callModule: '_heapq' method: 'heapify' with: heap.
	result := shim callModule: '_heapq' method: 'heapreplace' with: heap with: 2.0.
	self assert: result equals: 1.0.
	"The new smallest should be 2.0."
	result := shim callModule: '_heapq' method: 'heappop' with: heap.
	self assert: result equals: 2.0.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqHeappushpop
	"heappushpop pushes an item and then pops the smallest."

	| shim heap result |
	shim := CPythonShim current.
	heap := OrderedCollection withAll: { 2.0 . 4.0 . 6.0 }.
	shim callModule: '_heapq' method: 'heapify' with: heap.
	"Push 1.0 which is smaller than current min (2.0), so it comes right back."
	result := shim callModule: '_heapq' method: 'heappushpop' with: heap with: 1.0.
	self assert: result equals: 1.0.
	"Push 3.0 which is bigger than current min (2.0), so 2.0 pops."
	result := shim callModule: '_heapq' method: 'heappushpop' with: heap with: 3.0.
	self assert: result equals: 2.0.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqSortIntegers
	"Use heapq to sort a list of integers."

	| shim heap sorted |
	shim := CPythonShim current.
	heap := OrderedCollection new.
	#(5 1 4 2 3) do: [:each |
		shim callModule: '_heapq' method: 'heappush' with: heap with: each.
	].
	sorted := OrderedCollection new.
	5 timesRepeat: [
		sorted addLast: (shim callModule: '_heapq' method: 'heappop' with: heap).
	].
	self assert: sorted asArray equals: #(1 2 3 4 5).
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqSortStrings
	"Use heapq to sort strings."

	| shim heap sorted |
	shim := CPythonShim current.
	heap := OrderedCollection new.
	#('banana' 'apple' 'cherry' 'date') do: [:each |
		shim callModule: '_heapq' method: 'heappush' with: heap with: each.
	].
	sorted := OrderedCollection new.
	4 timesRepeat: [
		sorted addLast: (shim callModule: '_heapq' method: 'heappop' with: heap).
	].
	self assert: sorted asArray equals: #('apple' 'banana' 'cherry' 'date').
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqPopEmpty
	"heappop on an empty heap raises IndexError."

	self should: [
		CPythonShim current
			callModule: '_heapq' method: 'heappop'
			with: OrderedCollection new.
	] raise: Error.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqMaxHeap
	"_heapify_max + _heappop_max gives elements in descending order."

	| shim heap result |
	shim := CPythonShim current.
	heap := OrderedCollection withAll: { 1.0 . 5.0 . 3.0 . 2.0 . 4.0 }.
	shim callModule: '_heapq' method: '_heapify_max' with: heap.
	result := shim callModule: '_heapq' method: '_heappop_max' with: heap.
	self assert: result equals: 5.0.
	result := shim callModule: '_heapq' method: '_heappop_max' with: heap.
	self assert: result equals: 4.0.
%

category: 'Grail-Tests - Heapq'
method: CPythonShimTestCase
testHeapqHeapifyPreservesAll
	"heapify + repeated heappop returns all original elements sorted."

	| shim heap sorted |
	shim := CPythonShim current.
	heap := OrderedCollection withAll: { 9.0 . 7.0 . 5.0 . 3.0 . 1.0 . 8.0 . 6.0 . 4.0 . 2.0 }.
	shim callModule: '_heapq' method: 'heapify' with: heap.
	sorted := OrderedCollection new.
	9 timesRepeat: [
		sorted addLast: (shim callModule: '_heapq' method: 'heappop' with: heap).
	].
	self assert: sorted asArray equals: #(1.0 2.0 3.0 4.0 5.0 6.0 7.0 8.0 9.0).
%

! ===============================================================================
! Tests - PyTypeObject (ob_type and type identity)
! ===============================================================================

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeFloat
	"test_ob_type on a float returns 'float'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: 3.14.
	self assert: result equals: 'float'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeInt
	"test_ob_type on an integer returns 'int'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: 42.
	self assert: result equals: 'int'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeString
	"test_ob_type on a string returns 'str'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: 'hello'.
	self assert: result equals: 'str'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeBytes
	"test_ob_type on a ByteArray returns 'bytes'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: #[1 2 3].
	self assert: result equals: 'bytes'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeList
	"test_ob_type on an OrderedCollection returns 'list'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: (OrderedCollection withAll: { 1 . 2 . 3 }).
	self assert: result equals: 'list'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeDict
	"test_ob_type on a KeyValueDictionary returns 'dict'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: KeyValueDictionary new.
	self assert: result equals: 'dict'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeTuple
	"test_ob_type on an Array returns 'tuple'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: #(1 2 3).
	self assert: result equals: 'tuple'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testObTypeBool
	"test_ob_type on true returns 'bool'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: true.
	self assert: result equals: 'bool'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityFloat
	"test_type_identity on a float returns 1 (PyFloat_Type)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_identity'
		with: 3.14.
	self assert: result equals: 1.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityInt
	"test_type_identity on an integer returns 2 (PyLong_Type)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_identity'
		with: 42.
	self assert: result equals: 2.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityBool
	"test_type_identity on true returns 3 (PyBool_Type)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_identity'
		with: true.
	self assert: result equals: 3.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityString
	"test_type_identity on a string returns 4 (PyUnicode_Type)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_identity'
		with: 'hello'.
	self assert: result equals: 4.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityList
	"test_type_identity on an OrderedCollection returns 6 (PyList_Type)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_identity'
		with: (OrderedCollection withAll: { 1 . 2 }).
	self assert: result equals: 6.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeIdentityNone
	"test_ob_type on nil (Py_None) returns 'NoneType'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_ob_type'
		with: nil.
	self assert: result equals: 'NoneType'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpFlagsFloat
	"Float type has BASETYPE and READY flags set."

	| flags |
	flags := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_flags'
		with: 3.14.
	"Py_TPFLAGS_BASETYPE = 1<<10 = 1024, Py_TPFLAGS_READY = 1<<12 = 4096"
	self assert: (flags bitAnd: 1024) equals: 1024.
	self assert: (flags bitAnd: 4096) equals: 4096.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpFlagsInt
	"Int type has LONG_SUBCLASS, BASETYPE, and READY flags."

	| flags |
	flags := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_flags'
		with: 42.
	"Py_TPFLAGS_LONG_SUBCLASS = 1<<24 = 16777216"
	self assert: (flags bitAnd: 16777216) equals: 16777216.
	self assert: (flags bitAnd: 1024) equals: 1024.
	self assert: (flags bitAnd: 4096) equals: 4096.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpFlagsList
	"List type has LIST_SUBCLASS, SEQUENCE, BASETYPE, and READY flags."

	| flags |
	flags := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_flags'
		with: (OrderedCollection withAll: { 1 . 2 }).
	"Py_TPFLAGS_LIST_SUBCLASS = 1<<25 = 33554432, SEQUENCE = 1<<5 = 32"
	self assert: (flags bitAnd: 33554432) equals: 33554432.
	self assert: (flags bitAnd: 32) equals: 32.
	self assert: (flags bitAnd: 4096) equals: 4096.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpFlagsDict
	"Dict type has DICT_SUBCLASS and MAPPING flags."

	| flags |
	flags := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_flags'
		with: (KeyValueDictionary new).
	"Py_TPFLAGS_DICT_SUBCLASS = 1<<29 = 536870912, MAPPING = 1<<6 = 64"
	self assert: (flags bitAnd: 536870912) equals: 536870912.
	self assert: (flags bitAnd: 64) equals: 64.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpBaseNameFloat
	"Float's base type is 'object'."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_base_name'
		with: 3.14.
	self assert: result equals: 'object'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTpBaseNameBool
	"Bool's base type is 'int' (bool subclasses int in Python)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tp_base_name'
		with: true.
	self assert: result equals: 'int'.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testTypeReady
	"PyType_Ready sets READY flag and assigns base type."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_type_ready'.
	self assert: result equals: 2.
%

category: 'Grail-Tests - PyTypeObject'
method: CPythonShimTestCase
testSizeofType
	"sizeof(PyTypeObject) should be > 200 bytes (full CPython 3.14 layout)."

	| size |
	size := CPythonShim current
		callModule: '_shimtest' method: 'test_sizeof_type'.
	self assert: size > 200.
%

! ===============================================================================
! Tests - Dynamic Module Loading (shimDynLoad)
! ===============================================================================

category: 'Grail-Tests - Dynamic Loading'
method: CPythonShimTestCase
testDynLoadGrailDemo
	"shimDynLoad should load _grail_demo.so and return method names."

	| soPath methodNames |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	methodNames := System userAction: #shimDynLoad withArgs: { soPath . '_grail_demo' }.
	self assert: (methodNames isKindOf: Array).
	self assert: methodNames size equals: 3.
	self assert: (methodNames includes: 'add').
	self assert: (methodNames includes: 'dot_product').
	self assert: (methodNames includes: 'scale').
%

category: 'Grail-Tests - Dynamic Loading'
method: CPythonShimTestCase
testDynLoadCallAdd
	"Call _grail_demo.add(3, 4) via shimCall after dynamic loading."

	| soPath result |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	System userAction: #shimDynLoad withArgs: { soPath . '_grail_demo' }.
	result := CPythonShim current
		callModule: '_grail_demo' method: 'add' with: 3 with: 4.
	self assert: result equals: 7.
%

category: 'Grail-Tests - Dynamic Loading'
method: CPythonShimTestCase
testDynLoadModule
	"loadDynamicModule:fromPath: should create a module subclass with compiled
	methods. The generated methods use the `_name:kw:` varargs shape; calling
	through the varargs entry point exercises the same path Phase 4d codegen
	dispatches to for `module.method(args)` call sites."

	| soPath mod result |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	mod := CPythonShim loadDynamicModule: '_grail_demo' fromPath: soPath.
	self assert: mod class name equals: #'_grail_demo'.
	self assert: (mod class superclass == module).
	result := mod @env1:_add: { 10 . 20 } kw: nil.
	self assert: result equals: 30.
%

category: 'Grail-Tests - Dynamic Loading'
method: CPythonShimTestCase
testEvalImportGrailDemo
	"End-to-end: Python source 'import _grail_demo; _grail_demo.add(3, 4)' returns 7."

	| soPath result |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	result := self eval:
'import _grail_demo
result = _grail_demo.add(3, 4)
result
'.
	self assert: result equals: 7.
%

category: 'Grail-Tests - Dynamic Loading'
method: CPythonShimTestCase
testEvalImportGrailDemoDotProduct
	"End-to-end: dot_product via Python import."

	| soPath result |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	result := self eval:
'import _grail_demo
result = _grail_demo.dot_product([1.0, 2.0, 3.0], [4.0, 5.0, 6.0])
result
'.
	self assert: result equals: 32.0.
%

! ===============================================================================
! Tests - _sre (Regular Expression Engine)
! ===============================================================================

category: 'Grail-Tests - Module Loading'
method: CPythonShimTestCase
testLoadSre
	"The _sre module should load successfully."

	self assert: (CPythonShim current loadModule: '_sre') equals: true.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreGetcodesize
	"getcodesize() returns sizeof(SRE_CODE), which is 4."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'getcodesize'.
	self assert: result equals: 4.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreAsciiIscasedUpperA
	"ascii_iscased('A') => 1 (uppercase letter is cased)."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'ascii_iscased'
		with: 65.
	self assert: result equals: 1.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreAsciiIscasedLowerA
	"ascii_iscased('a') => 1 (lowercase letter is cased)."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'ascii_iscased'
		with: 97.
	self assert: result equals: 1.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreAsciiIscasedDigit
	"ascii_iscased('0') => 0 (digit is not cased)."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'ascii_iscased'
		with: 48.
	self assert: result equals: 0.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreUnicodeIscasedUpperA
	"unicode_iscased('A') => 1."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'unicode_iscased'
		with: 65.
	self assert: result equals: 1.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreUnicodeIscasedDigit
	"unicode_iscased('0') => 0."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'unicode_iscased'
		with: 48.
	self assert: result equals: 0.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreAsciiTolowerUpperA
	"ascii_tolower('A'=65) => 'a'=97."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'ascii_tolower'
		with: 65.
	self assert: result equals: 97.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreAsciiTolowerAlreadyLower
	"ascii_tolower('a'=97) => 97 (already lowercase)."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'ascii_tolower'
		with: 97.
	self assert: result equals: 97.
%

category: 'Grail-Tests - SRE'
method: CPythonShimTestCase
testSreUnicodeTolowerUpperA
	"unicode_tolower('A'=65) => 'a'=97."

	| result |
	result := CPythonShim current
		callModule: '_sre' method: 'unicode_tolower'
		with: 65.
	self assert: result equals: 97.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalSreImport
	"import _sre should succeed and module should be accessible."

	| result |
	result := self eval:
'import _sre
result = _sre.getcodesize()
result
'.
	self assert: result equals: 4.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalSreAsciiIscased
	"Evaluate _sre.ascii_iscased via Python source."

	| result |
	result := self eval:
'import _sre
result = _sre.ascii_iscased(65)
result
'.
	self assert: result equals: 1.
%

category: 'Grail-Tests - Python Eval'
method: CPythonShimTestCase
testEvalSreAsciiTolower
	"Evaluate _sre.ascii_tolower via Python source."

	| result |
	result := self eval:
'import _sre
result = _sre.ascii_tolower(90)
result
'.
	self assert: result equals: 122.
%

! ===============================================================================
! Tests - Py_None wrapping
! ===============================================================================
! Verify the bridge maps both Smalltalk nil and the Python None singleton to
! the same Py_None wrapper, and that the embedded OOP is the singleton (so
! C-side Py_None round-trips back to None, not nil).

category: 'Grail-Tests - Py_None Wrapping'
method: CPythonShimTestCase
testWrapNoneReturnsNoneWrapper
	"wrap: None returns the cached Py_None CByteArray."

	| shim w1 w2 |
	shim := CPythonShim current.
	w1 := shim wrap: None.
	w2 := shim wrap: None.
	self assert: w1 == w2.
	self assert: w1 class == CByteArray.
%

category: 'Grail-Tests - Py_None Wrapping'
method: CPythonShimTestCase
testWrapNilAliasesNone
	"wrap: nil returns the same wrapper as wrap: None — both map to Py_None
	at the bridge layer."

	| shim |
	shim := CPythonShim current.
	self assert: (shim wrap: nil) == (shim wrap: None).
%

category: 'Grail-Tests - Py_None Wrapping'
method: CPythonShimTestCase
testNoneWrapperEmbedsSingletonOop
	"The OOP stored at offset 16 of Py_None is the NoneType singleton's OOP,
	so a C round-trip (e.g. test_none) yields None, not nil."

	| wrapper signedOop oop |
	wrapper := CPythonShim current wrap: None.
	signedOop := wrapper int64At: 16.
	oop := signedOop < 0
		ifTrue: [signedOop + 16r10000000000000000]
		ifFalse: [signedOop].
	self assert: oop equals: None asOop.
%

category: 'Grail-Tests - Session-Local State'
method: CPythonShimTestCase
testShimSingletonLivesInSessionTempsNotCommitted
	"Regression: CPythonShim current must live in SessionTemps, not a classInstVar.
	A committed singleton holds stale C-backed CByteArray wrappers after a session
	restart, and two concurrent sessions writing the same slot cause a conflict.
	After CPythonShim current, the instance must be in SessionTemps."

	| shim |
	shim := CPythonShim current.
	self assert: (SessionTemps current at: #CPythonShim ifAbsent: [nil]) == shim.
	"reset clears the SessionTemps entry."
	CPythonShim reset.
	self assert: (SessionTemps current at: #CPythonShim ifAbsent: [nil]) isNil.
	"setUp will reinitialize via the next test's setUp call; restore now."
	CPythonShim current.
%


! ===============================================================================
! Tests - Server selectors that were missing (P1 in docs/Shim_API_Gaps.md)
! ===============================================================================

category: 'Grail-Tests - Generic Calling'
method: CPythonShimTestCase
testObjectCallOneArg
	"PyObject_CallOneArg routes through the server's PyObject_Call:args:."

	| callable result |
	callable := BoundMethod @env1:receiver: 10 selector: #'__add__'.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_call_one'
		with: callable with: 5.
	self assert: result equals: 15.
%

category: 'Grail-Tests - Generic Calling'
method: CPythonShimTestCase
testObjectCallNoArgs
	"PyObject_CallNoArgs calls a zero-arg callable."

	| callable result |
	callable := BoundMethod @env1:receiver: 'hello' selector: #'__len__'.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_call_noargs'
		with: callable.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testObjectGetItem
	"PyObject_GetItem reads dict[key] via __getitem__."

	| dict result |
	dict := KeyValueDictionary new.
	dict at: 'a' put: 41.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_obj_getitem'
		with: dict with: 'a'.
	self assert: result equals: 41.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testObjectSetItem
	"PyObject_SetItem stores dict[key] = value via __setitem__."

	| dict |
	dict := KeyValueDictionary new.
	CPythonShim current
		callModule: '_shimtest' method: 'test_obj_setitem'
		with: dict with: 'k' with: 99.
	self assert: (dict at: 'k') equals: 99.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testRichCompareObject
	"PyObject_RichCompare returns the comparison result as an object."

	| shim |
	shim := CPythonShim current.
	self assert: (shim callModule: '_shimtest' method: 'test_richcompare_obj'
		with: 1 with: 2 with: 0) equals: true.   "1 < 2"
	self assert: (shim callModule: '_shimtest' method: 'test_richcompare_obj'
		with: 1 with: 2 with: 4) equals: false.  "1 > 2"
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testSequenceGetItemString
	"PySequence_GetItem on a str exercises the server fallback path
	(strings are neither PyList nor PyTuple on the C side)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_seq_getitem'
		with: 'hello' with: 1.
	self assert: result equals: 'e'.
%

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testImportGetAttr
	"_PyImport_GetModuleAttrString imports a module and reads an attribute."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_import_attr'
		with: 'math' with: 'pi'.
	self assert: (result - Float pi) abs < 1e-12.
%

category: 'Grail-Tests - Iteration'
method: CPythonShimTestCase
testIterSum
	"PyObject_GetIter + PyIter_Next traverse a Python list."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_iter_sum'
		with: (OrderedCollection withAll: { 1 . 2 . 3 }).
	self assert: result equals: 6.
%

! ===============================================================================
! Tests - C-side correctness fixes (P2 in docs/Shim_API_Gaps.md)
! ===============================================================================

category: 'Grail-Tests - Truthiness'
method: CPythonShimTestCase
testIsTrueEmptyContainersAreFalsy
	"PyObject_IsTrue: empty str/list/dict and 0.0 are falsy; non-empty truthy."

	| shim |
	shim := CPythonShim current.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: '') equals: 0.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: 'x') equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: OrderedCollection new) equals: 0.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: (OrderedCollection withAll: { 1 })) equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: KeyValueDictionary new) equals: 0.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: 0.0) equals: 0.
	self assert: (shim callModule: '_shimtest' method: 'test_is_true' with: 0.5) equals: 1.
%

category: 'Grail-Tests - Type Checks'
method: CPythonShimTestCase
testLongCheckAcceptsBool
	"bool is an int subclass in CPython: PyLong_Check(True) is 1."

	| shim |
	shim := CPythonShim current.
	self assert: (shim callModule: '_shimtest' method: 'test_long_check' with: true) equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_long_check' with: 3) equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_long_check' with: 'x') equals: 0.
%

category: 'Grail-Tests - Slices'
method: CPythonShimTestCase
testSliceAdjustIndices
	"PySlice_AdjustIndices clamps like CPython: len 5, [-3:10:1] -> 3 items from 2 to 5."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_slice_adjust'
		with: 5 with: -3 with: 10 with: 1.
	self assert: result asArray equals: #(3 2 5).
%

category: 'Grail-Tests - Type Creation'
method: CPythonShimTestCase
testTypeGenericNew
	"PyType_GenericNew allocates a zeroed instance with refcnt 1 and the type set."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_generic_new'.
	self assert: result equals: 1.
%

! ===============================================================================
! Tests - Format strings (P3 in docs/Shim_API_Gaps.md)
! ===============================================================================

category: 'Grail-Tests - Argument Parsing'
method: CPythonShimTestCase
testParseTupleFormats
	"PyArg_ParseTuple 'snd' parses str, ssize_t, double."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_parse_tuple'
		with: 'abc' with: 4 with: 0.5.
	self assert: result equals: 7.5.
%

category: 'Grail-Tests - Argument Parsing'
method: CPythonShimTestCase
testBuildValueNested
	"Py_BuildValue '(ns[nn])' builds a tuple of int, str, and nested list."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_build_value'
		with: 2 with: 'hi'.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 'hi'.
	self assert: (result at: 3) asArray equals: #(2 2).
%

! ===============================================================================
! Tests - Additional APIs (P4 in docs/Shim_API_Gaps.md)
! ===============================================================================

category: 'Grail-Tests - Object Protocol'
method: CPythonShimTestCase
testGetAttrObjectName
	"PyObject_GetAttr (PyObject* name variant)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_getattr_obj'
		with: 42 with: '__class__'.
	self assert: (result isKindOf: Behavior).
%

category: 'Grail-Tests - Integer API'
method: CPythonShimTestCase
testLongLongRoundtrip
	"PyLong_AsLongLong / PyLong_FromLongLong handle values beyond 32 bits."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_long64'
		with: 10000000000.
	self assert: result equals: 20000000000.
%

category: 'Grail-Tests - String API'
method: CPythonShimTestCase
testUtf8AndSize
	"PyUnicode_AsUTF8AndSize reports the BYTE length (é is 2 bytes)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_utf8_size'
		with: 'hello'.
	self assert: result equals: 5.
%

category: 'Grail-Tests - String API'
method: CPythonShimTestCase
testUnicodeConcat
	"PyUnicode_Concat joins two strings via the server."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_unicode_concat'
		with: 'foo' with: 'bar'.
	self assert: result equals: 'foobar'.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictKeys
	"PyDict_Keys returns a list of the keys."

	| dict result |
	dict := KeyValueDictionary new.
	dict at: 'a' put: 1; at: 'b' put: 2.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_keys'
		with: dict.
	self assert: result size equals: 2.
	self assert: (result includes: 'a').
	self assert: (result includes: 'b').
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictItemsCount
	"PyDict_Items returns a list of (key, value) tuples."

	| dict result |
	dict := KeyValueDictionary new.
	dict at: 'a' put: 1; at: 'b' put: 2; at: 'c' put: 3.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_items_count'
		with: dict.
	self assert: result equals: 3.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictSetDefault
	"PyDict_SetDefault returns existing values and stores defaults."

	| dict shim |
	shim := CPythonShim current.
	dict := KeyValueDictionary new.
	dict at: 'a' put: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_dict_setdefault'
		with: dict with: 'a' with: 99) equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_dict_setdefault'
		with: dict with: 'b' with: 99) equals: 99.
	self assert: (dict at: 'b') equals: 99.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictMerge
	"PyDict_Merge with override=false keeps existing entries."

	| a b |
	a := KeyValueDictionary new. a at: 'k' put: 1.
	b := KeyValueDictionary new. b at: 'k' put: 2. b at: 'n' put: 3.
	CPythonShim current
		callModule: '_shimtest' method: 'test_dict_merge'
		with: a with: b with: false.
	self assert: (a at: 'k') equals: 1.
	self assert: (a at: 'n') equals: 3.
%

category: 'Grail-Tests - Dict API'
method: CPythonShimTestCase
testDictClear
	"PyDict_Clear empties the dictionary."

	| dict result |
	dict := KeyValueDictionary new.
	dict at: 'a' put: 1; at: 'b' put: 2.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_dict_clear'
		with: dict.
	self assert: result equals: 0.
	self assert: dict size equals: 0.
%

category: 'Grail-Tests - List API'
method: CPythonShimTestCase
testListGetSlice
	"PyList_GetSlice returns a clamped sub-list."

	| oc result |
	oc := OrderedCollection withAll: { 10 . 20 . 30 . 40 }.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_list_slice'
		with: oc with: 1 with: 3.
	self assert: result asArray equals: #(20 30).
%

category: 'Grail-Tests - List API'
method: CPythonShimTestCase
testListSortInPlace
	"PyList_Sort sorts in place via Python __lt__."

	| oc |
	oc := OrderedCollection withAll: { 3 . 1 . 2 }.
	CPythonShim current
		callModule: '_shimtest' method: 'test_list_sort'
		with: oc.
	self assert: oc asArray equals: #(1 2 3).
%

category: 'Grail-Tests - List API'
method: CPythonShimTestCase
testListReverseInPlace
	"PyList_Reverse reverses in place."

	| oc |
	oc := OrderedCollection withAll: { 1 . 2 . 3 }.
	CPythonShim current
		callModule: '_shimtest' method: 'test_list_reverse'
		with: oc.
	self assert: oc asArray equals: #(3 2 1).
%

category: 'Grail-Tests - List API'
method: CPythonShimTestCase
testListAsTuple
	"PyList_AsTuple converts list to tuple (Array)."

	| oc result |
	oc := OrderedCollection withAll: { 1 . 2 }.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_list_astuple'
		with: oc.
	self assert: (result isKindOf: Array).
	self assert: result asArray equals: #(1 2).
%

category: 'Grail-Tests - Tuple API'
method: CPythonShimTestCase
testTupleGetSlice
	"PyTuple_GetSlice returns a clamped sub-tuple."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_tuple_slice'
		with: { 10 . 20 . 30 } with: 0 with: 2.
	self assert: result asArray equals: #(10 20).
%

category: 'Grail-Tests - Sequence API'
method: CPythonShimTestCase
testSequenceContains
	"PySequence_Contains uses __contains__."

	| shim oc |
	shim := CPythonShim current.
	oc := OrderedCollection withAll: { 1 . 2 . 3 }.
	self assert: (shim callModule: '_shimtest' method: 'test_seq_contains'
		with: oc with: 2) equals: 1.
	self assert: (shim callModule: '_shimtest' method: 'test_seq_contains'
		with: oc with: 9) equals: 0.
%

category: 'Grail-Tests - Capsules'
method: CPythonShimTestCase
testCapsuleRoundtrip
	"PyCapsule_New / GetPointer / GetName / IsValid round-trip in C."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_capsule_roundtrip'.
	self assert: result equals: 1.
%

category: 'Grail-Tests - Error Handling'
method: CPythonShimTestCase
testNewExceptionRaisesByName
	"PyErr_NewException creates a type whose raises carry its short name."

	| raised |
	raised := false.
	[ CPythonShim current callModule: '_shimtest' method: 'test_new_exception' ]
		on: Error
		do: [:e |
			raised := true.
			self assert: (e messageText includesString: 'CustomError').
			self assert: (e messageText includesString: 'custom failure') ].
	self assert: raised.
%

category: 'Grail-Tests - Error Handling'
method: CPythonShimTestCase
testExceptionMatchesHierarchy
	"PyErr_ExceptionMatches: KeyError matches LookupError and Exception."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_exc_matches'.
	self assert: result equals: 1.
%

! ===============================================================================
! Tests - P5: module attribute export (docs/Shim_API_Gaps.md)
! ===============================================================================

category: 'Grail-Tests - Module Attrs'
method: CPythonShimTestCase
testModuleAttrsExport
	"shimModuleAttrs exports PyModule_AddIntConstant / AddStringConstant /
	AddObjectRef values; C-only objects (capsules) are skipped."

	| attrs |
	attrs := CPythonShim current moduleAttrs: '_shimtest'.
	self assert: (attrs at: #MAGIC_INT) equals: 42.
	self assert: (attrs at: #MAGIC_STR) equals: 'grail'.
	self assert: (attrs at: #MAGIC_FLOAT) equals: 2.5.
	self deny: (attrs includesKey: #SKIPPED_CAPSULE).
%

category: 'Grail-Tests - Module Attrs'
method: CPythonShimTestCase
testDynLoadModuleConstants
	"Dynamically loaded modules run Py_mod_exec (previously skipped) and
	expose their PyModule_Add*Constant values as Python attributes."

	| soPath mod |
	soPath := importlib grailDir , '/lib/_grail_demo.so'.
	(GsFile existsOnServer: soPath) ifFalse: [^ self skip: 'lib/_grail_demo.so not built'].
	mod := CPythonShim loadDynamicModule: '_grail_demo' fromPath: soPath.
	self assert: (mod @env1:DEMO_VERSION) equals: 7.
	self assert: (mod @env1:DEMO_NAME) equals: 'grail-demo'.
%

! ===============================================================================
! Tests - P5: keyword arguments across the C boundary
! ===============================================================================

category: 'Grail-Tests - Kwargs'
method: CPythonShimTestCase
testKwargsFastcall
	"METH_FASTCALL|METH_KEYWORDS receives kwnames + trailing values."

	| shim kw result |
	shim := CPythonShim current.
	kw := KeyValueDictionary new.
	kw at: 'x' put: 3.
	result := shim callModule: '_shimtest' method: 'test_kwargs'
		args: { 1 . 2 } kwargs: kw.
	self assert: result equals: 303.  "1 + 2 + 100*3"
	kw at: 'y' put: 1.
	result := shim callModule: '_shimtest' method: 'test_kwargs'
		args: { } kwargs: kw.
	self assert: result equals: 10300.  "100*3 + 10000*1"
	result := shim callModule: '_shimtest' method: 'test_kwargs'
		args: { 5 } kwargs: nil.
	self assert: result equals: 5.
%

category: 'Grail-Tests - Kwargs'
method: CPythonShimTestCase
testKwargsVarargsDict
	"METH_VARARGS|METH_KEYWORDS receives a kwargs dict."

	| kw result |
	kw := KeyValueDictionary new.
	kw at: 'key' put: 'val'.
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_kwargs_dict'
		args: { } kwargs: kw.
	self assert: result equals: 'val'.
%

category: 'Grail-Tests - Kwargs'
method: CPythonShimTestCase
testKwargsRejectedByPositionalOnly
	"A method without METH_KEYWORDS raises TypeError when kwargs given."

	| kw |
	kw := KeyValueDictionary new.
	kw at: 'x' put: 1.
	self should: [
		CPythonShim current
			callModule: '_shimtest' method: 'test_int'
			args: { 1 } kwargs: kw.
	] raise: Error.
%

! ===============================================================================
! Tests - P5: heap types (bases, getset setters, buffer protocol)
! ===============================================================================

category: 'Grail-Tests - Heap Types'
method: CPythonShimTestCase
testHeapTypeBase
	"PyType_FromSpecWithBases with a single type base sets tp_base and
	inherits the subclass-identity flag (PyLong_Check passes)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_heap_type_base'.
	self assert: result equals: 1.
%

category: 'Grail-Tests - Heap Types'
method: CPythonShimTestCase
testCounterMethodsAndGetSet
	"shimCallTyped on a heap type: METH_NOARGS method, tp_getset getter,
	and (new) tp_getset SETTER via the flags bit-4 path."

	| shim ptr |
	shim := CPythonShim current.
	ptr := shim callModuleReturnCPtr: '_shimtest' method: 'test_make_counter'.
	self assert: (shim callTyped: '_shimtest' type: 'Counter' method: 'incr' selfPtr: ptr) equals: 1.
	self assert: (shim callTyped: '_shimtest' type: 'Counter' method: 'incr' selfPtr: ptr) equals: 2.
	self assert: (shim callTyped: '_shimtest' type: 'Counter' method: 'value' selfPtr: ptr) equals: 2.
	shim callTyped: '_shimtest' type: 'Counter' setattr: 'value' selfPtr: ptr value: 41.
	self assert: (shim callTyped: '_shimtest' type: 'Counter' method: 'value' selfPtr: ptr) equals: 41.
	self assert: (shim callTyped: '_shimtest' type: 'Counter' method: 'incr' selfPtr: ptr) equals: 42.
%

category: 'Grail-Tests - Heap Types'
method: CPythonShimTestCase
testCounterBufferProtocol
	"PyObject_GetBuffer consults a heap type's bf_getbuffer slot."

	| shim ptr text |
	shim := CPythonShim current.
	ptr := shim callModuleReturnCPtr: '_shimtest' method: 'test_make_counter'.
	text := shim callModule: '_shimtest' method: 'test_counter_text' with: ptr.
	self assert: text equals: 'counter!'.
%

! ===============================================================================
! Tests - P5: slices, sets, bytearray, FromFormat
! ===============================================================================

category: 'Grail-Tests - Slices'
method: CPythonShimTestCase
testSliceRoundtrip
	"PySlice_New + PySlice_Unpack round-trip explicit values."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_slice_roundtrip'
		with: 1 with: 10 with: 2.
	self assert: result asArray equals: #(1 10 2).
%

category: 'Grail-Tests - Slices'
method: CPythonShimTestCase
testSliceUnpackDefaults
	"slice(None, None, None) unpacks to CPython defaults (0, MAX, 1)."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_slice_defaults'.
	self assert: result equals: 1.
%

category: 'Grail-Tests - Sets'
method: CPythonShimTestCase
testSetRoundtrip
	"PySet_New/Add/Contains/Size/Check against the Grail set class."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_set_roundtrip'
		with: 'a'.
	self assert: (result isKindOf: Set).
	self assert: result size equals: 1.
	self assert: (result includes: 'a').
%

category: 'Grail-Tests - Bytearray'
method: CPythonShimTestCase
testByteArrayRoundtrip
	"PyByteArray_FromStringAndSize creates a Grail bytearray instance."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_bytearray'
		with: 'abc' asByteArray.
	self assert: result class name equals: #bytearray.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 97.
	self assert: (result at: 3) equals: 99.
%

category: 'Grail-Tests - String API'
method: CPythonShimTestCase
testFromFormatObjectConversions
	"PyUnicode_FromFormat handles %R (repr), %S (str), and %d."

	| result |
	result := CPythonShim current
		callModule: '_shimtest' method: 'test_from_format'
		with: 'hi'.
	self assert: result equals: 'repr=<''hi''> str=<hi> n=42'.
%
