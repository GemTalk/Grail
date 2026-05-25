! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BytesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BytesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BytesTestCase - Tests for Python bytes type (mapped to GemStone ByteArray)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BytesTestCase removeAllMethods.
BytesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Concatenation'
method: BytesTestCase
test__add__
	"Test bytes concatenation: b1 + b2"

	| b1 b2 result |
	b1 :=  bytes withAll: {1. 2}.
	b2 :=  bytes withAll: {3. 4}.

	result := b1 @env1:__add__: b2.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 4) equals: 4.
%

category: 'Grail-Tests - Type'
method: BytesTestCase
test__class__
	"Test that bytes.__class__ returns bytes type"

	| b bytesType result |
	b :=  bytes withAll: {1. 2. 3}.
	bytesType := Python at: #'bytes'.

	result := b @env1:__class__.
	self assert: result equals: bytesType.
	self assert: result equals: bytes.
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__contains__
	"Test membership: x in bytes"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b @env1:__contains__: 65).
	self assert: (b @env1:__contains__: 66).
	self deny: (b @env1:__contains__: 68).
	self deny: (b @env1:__contains__: 256).
%

category: 'Grail-Tests - Comparison'
method: BytesTestCase
test__eq__
	"Test bytes equality"

	| b1 b2 b3 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 3}.
	b3 :=  bytes withAll: {1. 2. 4}.

	self assert: (b1 @env1:__eq__: b2).
	self deny: (b1 @env1:__eq__: b3).
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__
	"Test indexing: b[i]"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b @env1:__getitem__: 0) equals: 65.
	self assert: (b @env1:__getitem__: 1) equals: 66.
	self assert: (b @env1:__getitem__: 2) equals: 67.
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__negative
	"Test negative indexing: b[-1]"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b @env1:__getitem__: -1) equals: 67.
	self assert: (b @env1:__getitem__: -2) equals: 66.
	self assert: (b @env1:__getitem__: -3) equals: 65.
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b @env1:__getitem__: 10] raise: IndexError.
	self should: [b @env1:__getitem__: -10] raise: IndexError.
%

category: 'Grail-Tests - Hashing'
method: BytesTestCase
test__hash__
	"Test bytes hashing"

	| b1 b2 h1 h2 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 3}.

	h1 := b1 @env1:__hash__.
	h2 := b2 @env1:__hash__.

	"Same bytes should have same hash"
	self assert: h1 equals: h2.
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__len__
	"Test len(bytes)"

	| b |
	b := bytes ___new___: {1. 2. 3}.
	self assert: b size equals: 3.
%

category: 'Grail-Tests - Concatenation'
method: BytesTestCase
test__mul__
	"Test bytes repetition: b * n"

	| b result |
	b :=  bytes withAll: {1. 2}.

	result := b @env1:__mul__: 3.
	self assert: result size equals: 6.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 3) equals: 1.
	self assert: (result at: 5) equals: 1.
%

category: 'Grail-Tests - Comparison'
method: BytesTestCase
test__ne__
	"Test bytes inequality"

	| b1 b2 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 4}.

	self assert: (b1 @env1:__ne__: b2).
	self deny: (b1 @env1:__ne__: b1).
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__empty
	"Test bytes() constructor"

	| result |
	result := bytes ___new___: bytes.
	self assert: result size equals: 0.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromBytes
	"Test bytes(b'hello') creates a copy"

	| original copy |
	original := bytes @env1:__new__: 'hello' _: 'ascii'.
	copy := bytes ___new___: original.
	
	self assert: copy size equals: 5.
	self assert: (copy @env1:__eq__: original).
	self deny: (copy == original).
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromInteger
	"Test bytes(n) - create n zero bytes"

	| result |
	result := bytes ___new___: 5.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 0.
	self assert: (result at: 5) equals: 0.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromIntegerNegative
	"Test bytes(-1) raises ValueError"

	self 
		should: [bytes ___new___: -1]
		raise: ValueError.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromList
	"Test bytes([65, 66, 67]) creates b'ABC'"

	| list result |
	list := OrderedCollection new.
	list add: 65.
	list add: 66.
	list add: 67.
	
	result := bytes ___new___: list.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 65.
	self assert: (result at: 2) equals: 66.
	self assert: (result at: 3) equals: 67.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromListInvalidByte
	"Test bytes([256]) raises ValueError"

	| list |
	list := OrderedCollection new.
	list add: 256.
	
	self 
		should: [bytes ___new___: list]
		raise: ValueError.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromRange
	"Test bytes(range(65, 68)) creates b'ABC'"

	| range result |
	range := Interval @env1:__new__: 65 _: 68 _: 1.
	
	result := bytes ___new___: range.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 65.
	self assert: (result at: 2) equals: 66.
	self assert: (result at: 3) equals: 67.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromStringAscii
	"Test bytes('hello', 'ascii')"

	| str result |
	str := 'hello'.
	
	result := bytes @env1:__new__: str _: 'ascii'.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 104.
	self assert: (result at: 5) equals: 111.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromStringLatin1
	"Test bytes('hello', 'latin-1')"

	| str result |
	str := 'hello'.

	result := bytes @env1:__new__: str _: 'latin-1'.
	self assert: result size equals: 5.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromStringNoEncoding
	"Test bytes('hello') raises TypeError"

	| str |
	str := 'hello'.
	
	self 
		should: [bytes ___new___: str]
		raise: TypeError.
%

category: 'Grail-Tests - Initialization'
method: BytesTestCase
test__new__fromStringUtf8
	"Test bytes('hello', 'utf-8')"

	| str result |
	str := 'hello'.
	
	result := bytes @env1:__new__: str _: 'utf-8'.
	self assert: result size equals: 5.
%

category: 'Grail-Tests - String Representation'
method: BytesTestCase
test__repr__
	"Test bytes.__repr__()"

	| b result |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	result := b @env1:__repr__.

	"Should start with b' and end with '"
	self assert: ((result at: 1) codePoint) == 98.
	self assert: ((result at: 2) codePoint) == 39.
%

category: 'Grail-Tests - Sequence Protocol'
method: BytesTestCase
test__setitem__immutable
	"Test that bytes is immutable"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b @env1:__setitem__: 0 _: 99] raise: TypeError.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_capitalize
	"Test bytes.capitalize()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	result := b @env1:capitalize.
	self assert: (result at: 1) equals: 72.
	self assert: (result at: 7) equals: 119.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_center
	"Test bytes.center(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b @env1:center: 9.

	self assert: result size equals: 9.
	self assert: (result at: 4) equals: 97.
%

category: 'Grail-Tests - Sequence Methods'
method: BytesTestCase
test_count
	"Test bytes.count(x)"

	| b |
	b :=  bytes withAll: {65. 66. 65. 67. 65}.
	self assert: (b @env1:count: 65) equals: 3.
	self assert: (b @env1:count: 66) equals: 1.
	self assert: (b @env1:count: 68) equals: 0.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_decode_ascii
	"Test bytes.decode('ascii')"

	| b result |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	result := b @env1:decode: 'ascii'.
	self assert: result equals: 'hello'.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_decode_unicode_escape
	"bytes.decode('unicode-escape') interprets Python-source backslash
	escapes.  Required by jinja2's lexer, which round-trips every
	TOKEN_STRING through .encode('ascii', 'backslashreplace').decode(
	'unicode-escape') to convert source-form '\\n' into a real newline."

	| b |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	self assert: (b @env1:decode: 'unicode-escape') equals: 'hello'.

	b := bytes @env1:__new__: 'a\nb' _: 'ascii'.
	self assert: (b @env1:decode: 'unicode-escape') equals: (String new
		add: $a; add: (Character codePoint: 10); add: $b; yourself).

	b := bytes @env1:__new__: 'A\x41' _: 'ascii'.
	self assert: (b @env1:decode: 'unicode-escape') equals: 'AA'.

	b := bytes @env1:__new__: '\xe9' _: 'ascii'.
	self assert: (b @env1:decode: 'unicode-escape')
		equals: (String new add: (Character codePoint: 16r00e9); yourself).

	b := bytes @env1:__new__: '\t\\\"' _: 'ascii'.
	self assert: (b @env1:decode: 'unicode-escape')
		equals: (String new add: (Character codePoint: 9); add: $\; add: $"; yourself)
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_endswith
	"Test bytes.endswith(suffix)"

	| b suffix |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	suffix :=  bytes withAll: {108. 111}.

	self assert: (b @env1:endswith: suffix).

	suffix :=  bytes withAll: {104. 101}.
	self deny: (b @env1:endswith: suffix).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_expandtabs
	"Test bytes.expandtabs()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 9. 119. 111. 114. 108. 100}.

	result := b @env1:expandtabs.
	self assert: result size > 9.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_find
	"Test bytes.find(sub)"

	| b sub |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	sub :=  bytes withAll: {108. 108}.

	self assert: (b @env1:find: sub) equals: 2.

	sub :=  bytes withAll: {120. 121}.
	self assert: (b @env1:find: sub) equals: -1.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_fromhex
	"Test bytes.fromhex(string)"

	| result |
	result := bytes @env1:fromhex: 'ff0010'.

	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 255.
	self assert: (result at: 2) equals: 0.
	self assert: (result at: 3) equals: 16.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_hex
	"Test bytes.hex()"

	| b result |
	b :=  bytes withAll: {255. 0. 16}.
	result := b @env1:hex.
	self assert: result equals: 'FF0010'.
%

category: 'Grail-Tests - Sequence Methods'
method: BytesTestCase
test_index
	"Test bytes.index(x)"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b @env1:index: 65) equals: 0.
	self assert: (b @env1:index: 66) equals: 1.
	self assert: (b @env1:index: 67) equals: 2.
%

category: 'Grail-Tests - Sequence Methods'
method: BytesTestCase
test_indexNotFound
	"Test bytes.index(x) raises ValueError when not found"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b @env1:index: 99] raise: ValueError.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isalnum
	"Test bytes.isalnum()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 49. 98}.
	b2 :=  bytes withAll: {97. 32. 98}.

	self assert: (b1 @env1:isalnum).
	self deny: (b2 @env1:isalnum).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isalpha
	"Test bytes.isalpha()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 98. 99}.
	b2 :=  bytes withAll: {97. 49. 99}.

	self assert: (b1 @env1:isalpha).
	self deny: (b2 @env1:isalpha).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isascii
	"Test bytes.isascii()"

	| b1 b2 |
	b1 :=  bytes withAll: {65. 66. 67}.
	b2 :=  bytes withAll: {65. 200. 67}.

	self assert: (b1 @env1:isascii).
	self deny: (b2 @env1:isascii).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isdigit
	"Test bytes.isdigit()"

	| b1 b2 |
	b1 :=  bytes withAll: {49. 50. 51}.
	b2 :=  bytes withAll: {49. 97. 51}.

	self assert: (b1 @env1:isdigit).
	self deny: (b2 @env1:isdigit).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_islower
	"Test bytes.islower()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 98. 99}.
	b2 :=  bytes withAll: {97. 66. 99}.

	self assert: (b1 @env1:islower).
	self deny: (b2 @env1:islower).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isspace
	"Test bytes.isspace()"

	| b1 b2 |
	b1 :=  bytes withAll: {32. 9. 10}.
	b2 :=  bytes withAll: {32. 97. 10}.

	self assert: (b1 @env1:isspace).
	self deny: (b2 @env1:isspace).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_istitle
	"Test bytes.istitle()"

	| b1 b2 b3 |
	b1 :=  bytes withAll: {72. 101. 108. 108. 111. 32. 87. 111. 114. 108. 100}.
	b2 :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	b3 :=  bytes withAll: {72. 69. 76. 76. 79. 32. 87. 79. 82. 76. 68}.

	self assert: (b1 @env1:istitle).
	self deny: (b2 @env1:istitle).
	self deny: (b3 @env1:istitle).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_isupper
	"Test bytes.isupper()"

	| b1 b2 |
	b1 :=  bytes withAll: {65. 66. 67}.
	b2 :=  bytes withAll: {65. 98. 67}.

	self assert: (b1 @env1:isupper).
	self deny: (b2 @env1:isupper).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_join
	"Test bytes.join(iterable)"

	| sep parts result |
	sep := bytes ___new___: {44}.
	parts := OrderedCollection new.
	parts add: (bytes ___new___: {97}).
	parts add: (bytes ___new___: {98}).

	result := sep @env1:join: parts.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 97.
	self assert: (result at: 2) equals: 44.
	self assert: (result at: 3) equals: 98.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_ljust
	"Test bytes.ljust(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b @env1:ljust: 10.

	self assert: result size equals: 10.
	self assert: (result at: 1) equals: 97.
	self assert: (result at: 10) equals: 32.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_lower
	"Test bytes.lower()"

	| b result |
	b :=  bytes withAll: {72. 69. 76. 76. 79}.
	result := b @env1:lower.
	self assert: (result at: 1) equals: 104.
	self assert: (result at: 2) equals: 101.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_lstrip
	"Test bytes.lstrip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b @env1:lstrip.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 97.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_maketrans
	"Test bytes.maketrans(from, to)"

	| frm to table |
	frm :=  bytes withAll: {97. 98. 99}.
	to :=  bytes withAll: {49. 50. 51}.

	table := bytes @env1:maketrans: frm _: to.
	self assert: (table size) equals: 256.
	self assert: (table at: 98) equals: 49.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_partition
	"Test bytes.partition(sep)"

	| b sep result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	sep := bytes ___new___: {32}.

	result := b @env1:partition: sep.
	self assert: result size equals: 3.
	self assert: (result at: 1) size equals: 5.
	self assert: (result at: 3) size equals: 5.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_removeprefix
	"Test bytes.removeprefix(prefix)"

	| b prefix result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	prefix :=  bytes withAll: {104. 101. 108. 108. 111. 32}.

	result := b @env1:removeprefix: prefix.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 119.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_removesuffix
	"Test bytes.removesuffix(suffix)"

	| b suffix result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	suffix :=  bytes withAll: {32. 119. 111. 114. 108. 100}.

	result := b @env1:removesuffix: suffix.
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 104.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_replace
	"Test bytes.replace(old, new)"

	| b old new result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	old :=  bytes withAll: {108. 108}.
	new :=  bytes withAll: {120. 120}.

	result := b @env1:replace: old _: new.
	self assert: (result at: 3) equals: 120.
	self assert: (result at: 4) equals: 120.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rfind
	"Test bytes.rfind(sub)"

	| b sub |
	b :=  bytes withAll: {97. 98. 97. 98. 99}.
	sub := bytes ___new___: {97}.

	self assert: (b @env1:rfind: sub) equals: 2.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rindex
	"Test bytes.rindex(sub)"

	| b sub |
	b :=  bytes withAll: {97. 98. 97. 98. 99}.
	sub := bytes ___new___: {97}.

	self assert: (b @env1:rindex: sub) equals: 2.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rindexNotFound
	"Test bytes.rindex(sub) raises ValueError when not found"

	| b sub |
	b :=  bytes withAll: {1. 2. 3}.
	sub := bytes ___new___: {99}.

	self should: [b @env1:rindex: sub] raise: ValueError.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rjust
	"Test bytes.rjust(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b @env1:rjust: 10.

	self assert: result size equals: 10.
	self assert: (result at: 1) equals: 32.
	self assert: (result at: 10) equals: 99.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rpartition
	"Test bytes.rpartition(sep)"

	| b sep result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	sep := bytes ___new___: {32}.

	result := b @env1:rpartition: sep.
	self assert: (result size) equals: 3.
	self assert: (result at: 1) size equals: 5.
	self assert: (result at: 3) size equals: 5.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rsplit
	"Test bytes.rsplit(sep, maxsplit)"

	| b sep result |
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: {44}.

	result := b @env1:rsplit: sep _: 1.
	self assert: (result size) equals: 2.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit
	"Test bytes.rsplit(sep, maxsplit) - split from right with limit"

	| b sep result part0 part1 part2 |
	"Test: b'a,b,c,d'.rsplit(b',', 2) should give [b'a,b', b'c', b'd']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: {44}.

	result := b @env1:rsplit: sep _: 2.
	self assert: (result size) equals: 3.

	part0 := result at: 1.
	self assert: (part0 size) equals: 3.
	self assert: (part0 at: 1) equals: 97.  "a"
	self assert: (part0 at: 2) equals: 44.  ","
	self assert: (part0 at: 3) equals: 98.  "b"

	part1 := result at: 2.
	self assert: (part1 size) equals: 1.
	self assert: (part1 at: 1) equals: 99.  "c"

	part2 := result at: 3.
	self assert: (part2 size) equals: 1.
	self assert: (part2 at: 1) equals: 100. "d"
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit_negative
	"Test bytes.rsplit(sep, -1) - negative maxsplit means unlimited"

	| b sep result |
	"Test: b'a,b,c'.rsplit(b',', -1) should give [b'a', b'b', b'c']"
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: {44}.

	result := b @env1:rsplit: sep _: -1.
	self assert: (result size) equals: 3.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit_one
	"Test bytes.rsplit(sep, 1) - split only once from right"

	| b sep result part0 part1 |
	"Test: b'a,b,c,d'.rsplit(b',', 1) should give [b'a,b,c', b'd']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: {44}.

	result := b @env1:rsplit: sep _: 1.
	self assert: (result size) equals: 2.

	part0 := result at: 1.
	self assert: (part0 size) equals: 5.
	self assert: (part0 at: 1) equals: 97.  "a"
	self assert: (part0 at: 5) equals: 99.  "c"

	part1 := result at: 2.
	self assert: (part1 size) equals: 1.
	self assert: (part1 at: 1) equals: 100. "d"
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_rstrip
	"Test bytes.rstrip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b @env1:rstrip.
	self assert: result size equals: 4.
	self assert: (result at: 4) equals: 99.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_split
	"Test bytes.split(sep)"

	| b sep result |
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: {44}.

	result := b @env1:split: sep.
	self assert: (result size) equals: 3.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit
	"Test bytes.split(sep, maxsplit) - split from left with limit"

	| b sep result part0 part1 part2 |
	"Test: b'a,b,c,d'.split(b',', 2) should give [b'a', b'b', b'c,d']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: {44}.

	result := b @env1:split: sep _: 2.
	self assert: (result size) equals: 3.

	part0 := result at: 1.
	self assert: (part0 size) equals: 1.
	self assert: (part0 at: 1) equals: 97.  "a"

	part1 := result at: 2.
	self assert: (part1 size) equals: 1.
	self assert: (part1 at: 1) equals: 98.  "b"

	part2 := result at: 3.
	self assert: (part2 size) equals: 3.
	self assert: (part2 at: 1) equals: 99.  "c"
	self assert: (part2 at: 2) equals: 44.  ","
	self assert: (part2 at: 3) equals: 100. "d"
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit_negative
	"Test bytes.split(sep, -1) - negative maxsplit means unlimited"

	| b sep result |
	"Test: b'a,b,c'.split(b',', -1) should give [b'a', b'b', b'c']"
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: {44}.

	result := b @env1:split: sep _: -1.
	self assert: (result size) equals: 3.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit_one
	"Test bytes.split(sep, 1) - split only once from left"

	| b sep result part0 part1 |
	"Test: b'a,b,c,d'.split(b',', 1) should give [b'a', b'b,c,d']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: {44}.

	result := b @env1:split: sep _: 1.
	self assert: (result size) equals: 2.

	part0 := result at: 1.
	self assert: (part0 size) equals: 1.
	self assert: (part0 at: 1) equals: 97.  "a"

	part1 := result at: 2.
	self assert: (part1 size) equals: 5.
	self assert: (part1 at: 1) equals: 98.  "b"
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_splitlines
	"Test bytes.splitlines()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 10. 119. 111. 114}.

	result := b @env1:splitlines.
	self assert: result size equals: 2.
	self assert: (result at: 1) size equals: 5.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_startswith
	"Test bytes.startswith(prefix)"

	| b prefix |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	prefix :=  bytes withAll: {104. 101}.

	self assert: (b @env1:startswith: prefix).

	prefix :=  bytes withAll: {108. 108}.
	self deny: (b @env1:startswith: prefix).
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_strip
	"Test bytes.strip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b @env1:strip.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 97.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_swapcase
	"Test bytes.swapcase()"

	| b result |
	b :=  bytes withAll: {72. 101. 108. 108. 111. 32. 87. 111. 114. 108. 100}.
	result := b @env1:swapcase.
	self assert: (result at: 1) equals: 104.
	self assert: (result at: 7) equals: 119.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_title
	"Test bytes.title()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	result := b @env1:title.
	self assert: (result at: 1) equals: 72.
	self assert: (result at: 7) equals: 87.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_translate
	"Test bytes.translate(table)"

	| b frm to table result |
	b :=  bytes withAll: {97. 98. 99}.
	frm :=  bytes withAll: {97. 98. 99}.
	to :=  bytes withAll: {49. 50. 51}.

	table := bytes @env1:maketrans: frm _: to.
	result := b @env1:translate: table.

	self assert: (result at: 1) equals: 49.
	self assert: (result at: 2) equals: 50.
	self assert: (result at: 3) equals: 51.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_upper
	"Test bytes.upper()"

	| b result |
	b := bytes @env1:__new__: 'hello' _: 'ascii'.
	result := b @env1:upper.
	self assert: (result at: 1) equals: 72.
	self assert: (result at: 2) equals: 69.
%

category: 'Grail-Tests - Bytes Methods'
method: BytesTestCase
test_zfill
	"Test bytes.zfill(width)"

	| b result |
	b :=  bytes withAll: {52. 50}.
	result := b @env1:zfill: 5.

	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 48.
	self assert: (result at: 4) equals: 52.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesConcatenation
	"Test bytes + bytes via Python source"

	| result |
	result := self eval: 'b''hello'' + b'' world'''.
	self assert: result size equals: 11.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesContains
	"Test in operator for bytes via Python source"

	self assert: (self eval: '65 in b''ABC''').
	self deny: (self eval: '68 in b''ABC''').
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesEquality
	"Test bytes equality via Python source"

	self assert: (self eval: 'b''abc'' == b''abc''').
	self deny: (self eval: 'b''abc'' == b''def''').
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesIndexing
	"Test bytes indexing via Python source"

	self assert: (self eval: 'b''ABC''[0]') equals: 65.
	self assert: (self eval: 'b''ABC''[2]') equals: 67.
	self assert: (self eval: 'b''ABC''[-1]') equals: 67.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesLen
	"Test len() on bytes via Python source"

	self assert: (self eval: 'len(b''hello'')') equals: 5.
	self assert: (self eval: 'len(b'''')') equals: 0.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesLiteral
	"Test bytes literal via Python source"

	| result |
	result := self eval: 'b''hello'''.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 5.
	self assert: (result at: 1) equals: 104.
	self assert: (result at: 5) equals: 111.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalBytesRepetition
	"Test bytes * n via Python source"

	| result |
	result := self eval: 'b''ab'' * 3'.
	self assert: result size equals: 6.
%

category: 'Grail-Tests - Eval'
method: BytesTestCase
testEvalEmptyBytes
	"Test empty bytes literal via Python source"

	| result |
	result := self eval: 'b'''''.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 0.
%
