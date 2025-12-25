! ===============================================================================
! BytesTestCase - Tests for Python bytes type (mapped to GemStone ByteArray)
! ===============================================================================

set compile_env: 0

category: 'Tests - Initialization'
method: BytesTestCase
test__new__empty
	"Test bytes() constructor"

	| result |
	result := bytes ___new___: bytes.
	self assert: (result ___len___) equals: 0.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromInteger
	"Test bytes(n) - create n zero bytes"

	| result |
	result := bytes ___new___: bytes _: 5.
	self assert: (result ___len___) equals: 5.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 0.
	self assert: (result perform: #at: env: 0 withArguments: {5}) equals: 0.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromIntegerNegative
	"Test bytes(-1) raises ValueError"

	self 
		should: [bytes ___new___: bytes _: -1]
		raise: ValueError.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromList
	"Test bytes([65, 66, 67]) creates b'ABC'"

	| list result |
	list := OrderedCollection new.
	list perform: #add: env: 0 withArguments: {65}.
	list perform: #add: env: 0 withArguments: {66}.
	list perform: #add: env: 0 withArguments: {67}.
	
	result := bytes ___new___: bytes _: list.
	self assert: (result ___len___) equals: 3.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 65.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 66.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 67.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromListInvalidByte
	"Test bytes([256]) raises ValueError"

	| list |
	list := OrderedCollection new.
	list perform: #add: env: 0 withArguments: {256}.
	
	self 
		should: [bytes ___new___: bytes _: list]
		raise: ValueError.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromRange
	"Test bytes(range(65, 68)) creates b'ABC'"

	| range result |
	range := Interval perform: #__new__:_:_:_: env: 2 withArguments: {Interval. 65. 68. 1}.
	
	result := bytes ___new___: bytes _: range.
	self assert: (result ___len___) equals: 3.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 65.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 66.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 67.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromBytes
	"Test bytes(b'hello') creates a copy"

	| original copy |
	original := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	copy := bytes ___new___: bytes _: original.
	
	self assert: (copy ___len___) equals: 5.
	self assert: (copy perform: #__eq__: env: 2 withArguments: {original}).
	self deny: (copy perform: #== env: 0 withArguments: {original}).
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromStringNoEncoding
	"Test bytes('hello') raises TypeError"

	| str |
	str := 'hello'.
	
	self 
		should: [bytes ___new___: bytes _: str]
		raise: TypeError.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromStringAscii
	"Test bytes('hello', 'ascii')"

	| str result |
	str := 'hello'.
	
	result := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. str. 'ascii'}.
	self assert: (result ___len___) equals: 5.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 104.
	self assert: (result perform: #at: env: 0 withArguments: {5}) equals: 111.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromStringUtf8
	"Test bytes('hello', 'utf-8')"

	| str result |
	str := 'hello'.
	
	result := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. str. 'utf-8'}.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Initialization'
method: BytesTestCase
test__new__fromStringLatin1
	"Test bytes('hello', 'latin-1')"

	| str result |
	str := 'hello'.

	result := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. str. 'latin-1'}.
	self assert: (result ___len___) equals: 5.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__len__
	"Test len(bytes)"

	| b arr |
	arr := Array perform: #with:with:with: env: 0 withArguments: {1. 2. 3}.
	b := bytes ___new___: bytes _: arr.
	self assert: (b ___len___) equals: 3.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__
	"Test indexing: b[i]"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {0}) equals: 65.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {1}) equals: 66.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {2}) equals: 67.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__negative
	"Test negative indexing: b[-1]"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {-1}) equals: 67.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {-2}) equals: 66.
	self assert: (b perform: #__getitem__: env: 2 withArguments: {-3}) equals: 65.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__getitem__outOfRange
	"Test index out of range raises IndexError"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b perform: #__getitem__: env: 2 withArguments: {10}] raise: IndexError.
	self should: [b perform: #__getitem__: env: 2 withArguments: {-10}] raise: IndexError.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__setitem__immutable
	"Test that bytes is immutable"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b perform: #__setitem__:_: env: 2 withArguments: {0. 99}] raise: TypeError.
%

category: 'Tests - Sequence Protocol'
method: BytesTestCase
test__contains__
	"Test membership: x in bytes"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b ___contains___: 65).
	self assert: (b ___contains___: 66).
	self deny: (b ___contains___: 68).
	self deny: (b ___contains___: 256).
%

category: 'Tests - Comparison'
method: BytesTestCase
test__eq__
	"Test bytes equality"

	| b1 b2 b3 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 3}.
	b3 :=  bytes withAll: {1. 2. 4}.

	self assert: (b1 perform: #__eq__: env: 2 withArguments: {b2}).
	self deny: (b1 perform: #__eq__: env: 2 withArguments: {b3}).
%

category: 'Tests - Comparison'
method: BytesTestCase
test__ne__
	"Test bytes inequality"

	| b1 b2 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 4}.

	self assert: (b1 perform: #__ne__: env: 2 withArguments: {b2}).
	self deny: (b1 perform: #__ne__: env: 2 withArguments: {b1}).
%

category: 'Tests - Hashing'
method: BytesTestCase
test__hash__
	"Test bytes hashing"

	| b1 b2 h1 h2 |
	b1 :=  bytes withAll: {1. 2. 3}.
	b2 :=  bytes withAll: {1. 2. 3}.

	h1 := b1 perform: #__hash__ env: 2.
	h2 := b2 perform: #__hash__ env: 2.

	"Same bytes should have same hash"
	self assert: h1 equals: h2.
%

category: 'Tests - Sequence Methods'
method: BytesTestCase
test_count
	"Test bytes.count(x)"

	| b |
	b :=  bytes withAll: {65. 66. 65. 67. 65}.
	self assert: (b perform: #count: env: 2 withArguments: {65}) equals: 3.
	self assert: (b perform: #count: env: 2 withArguments: {66}) equals: 1.
	self assert: (b perform: #count: env: 2 withArguments: {68}) equals: 0.
%

category: 'Tests - Sequence Methods'
method: BytesTestCase
test_index
	"Test bytes.index(x)"

	| b |
	b :=  bytes withAll: {65. 66. 67}.
	self assert: (b perform: #index: env: 2 withArguments: {65}) equals: 0.
	self assert: (b perform: #index: env: 2 withArguments: {66}) equals: 1.
	self assert: (b perform: #index: env: 2 withArguments: {67}) equals: 2.
%

category: 'Tests - Sequence Methods'
method: BytesTestCase
test_indexNotFound
	"Test bytes.index(x) raises ValueError when not found"

	| b |
	b :=  bytes withAll: {1. 2. 3}.
	self should: [b perform: #index: env: 2 withArguments: {99}] raise: ValueError.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_hex
	"Test bytes.hex()"

	| b result |
	b :=  bytes withAll: {255. 0. 16}.
	result := b perform: #hex env: 2.
	self assert: result equals: 'FF0010'.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_decode_ascii
	"Test bytes.decode('ascii')"

	| b result |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	result := b perform: #decode: env: 2 withArguments: {'ascii'}.
	self assert: result equals: 'hello'.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_startswith
	"Test bytes.startswith(prefix)"

	| b prefix |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	prefix :=  bytes withAll: {104. 101}.

	self assert: (b perform: #startswith: env: 2 withArguments: {prefix}).

	prefix :=  bytes withAll: {108. 108}.
	self deny: (b perform: #startswith: env: 2 withArguments: {prefix}).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_endswith
	"Test bytes.endswith(suffix)"

	| b suffix |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	suffix :=  bytes withAll: {108. 111}.

	self assert: (b perform: #endswith: env: 2 withArguments: {suffix}).

	suffix :=  bytes withAll: {104. 101}.
	self deny: (b perform: #endswith: env: 2 withArguments: {suffix}).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_find
	"Test bytes.find(sub)"

	| b sub |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	sub :=  bytes withAll: {108. 108}.

	self assert: (b perform: #find: env: 2 withArguments: {sub}) equals: 2.

	sub :=  bytes withAll: {120. 121}.
	self assert: (b perform: #find: env: 2 withArguments: {sub}) equals: -1.
%

category: 'Tests - Concatenation'
method: BytesTestCase
test__add__
	"Test bytes concatenation: b1 + b2"

	| b1 b2 result |
	b1 :=  bytes withAll: {1. 2}.
	b2 :=  bytes withAll: {3. 4}.

	result := b1 perform: #__add__: env: 2 withArguments: {b2}.
	self assert: (result ___len___) equals: 4.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 1.
	self assert: (result perform: #at: env: 0 withArguments: {4}) equals: 4.
%

category: 'Tests - Concatenation'
method: BytesTestCase
test__mul__
	"Test bytes repetition: b * n"

	| b result |
	b :=  bytes withAll: {1. 2}.

	result := b perform: #__mul__: env: 2 withArguments: {3}.
	self assert: (result ___len___) equals: 6.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 1.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 1.
	self assert: (result perform: #at: env: 0 withArguments: {5}) equals: 1.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_split
	"Test bytes.split(sep)"

	| b sep result |
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #split: env: 2 withArguments: {sep}.
	self assert: (result size) equals: 3.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_join
	"Test bytes.join(iterable)"

	| sep parts result |
	sep := bytes ___new___: bytes _: {44}.
	parts := OrderedCollection new.
	parts perform: #add: env: 0 withArguments: {bytes ___new___: bytes _: {97}}.
	parts perform: #add: env: 0 withArguments: {bytes ___new___: bytes _: {98}}.

	result := sep perform: #join: env: 2 withArguments: {parts}.
	self assert: (result ___len___) equals: 3.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 97.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 44.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 98.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_upper
	"Test bytes.upper()"

	| b result |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	result := b perform: #upper env: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 72.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 69.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_lower
	"Test bytes.lower()"

	| b result |
	b :=  bytes withAll: {72. 69. 76. 76. 79}.
	result := b perform: #lower env: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 104.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 101.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_strip
	"Test bytes.strip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b perform: #strip env: 2.
	self assert: (result ___len___) equals: 3.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 97.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_lstrip
	"Test bytes.lstrip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b perform: #lstrip env: 2.
	self assert: (result ___len___) equals: 4.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 97.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rstrip
	"Test bytes.rstrip()"

	| b result |
	b :=  bytes withAll: {32. 97. 98. 99. 32}.
	result := b perform: #rstrip env: 2.
	self assert: (result ___len___) equals: 4.
	self assert: (result perform: #at: env: 0 withArguments: {4}) equals: 99.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rfind
	"Test bytes.rfind(sub)"

	| b sub |
	b :=  bytes withAll: {97. 98. 97. 98. 99}.
	sub := bytes ___new___: bytes _: {97}.

	self assert: (b perform: #rfind: env: 2 withArguments: {sub}) equals: 2.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isalpha
	"Test bytes.isalpha()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 98. 99}.
	b2 :=  bytes withAll: {97. 49. 99}.

	self assert: (b1 perform: #isalpha env: 2).
	self deny: (b2 perform: #isalpha env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isdigit
	"Test bytes.isdigit()"

	| b1 b2 |
	b1 :=  bytes withAll: {49. 50. 51}.
	b2 :=  bytes withAll: {49. 97. 51}.

	self assert: (b1 perform: #isdigit env: 2).
	self deny: (b2 perform: #isdigit env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isalnum
	"Test bytes.isalnum()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 49. 98}.
	b2 :=  bytes withAll: {97. 32. 98}.

	self assert: (b1 perform: #isalnum env: 2).
	self deny: (b2 perform: #isalnum env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isspace
	"Test bytes.isspace()"

	| b1 b2 |
	b1 :=  bytes withAll: {32. 9. 10}.
	b2 :=  bytes withAll: {32. 97. 10}.

	self assert: (b1 perform: #isspace env: 2).
	self deny: (b2 perform: #isspace env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_islower
	"Test bytes.islower()"

	| b1 b2 |
	b1 :=  bytes withAll: {97. 98. 99}.
	b2 :=  bytes withAll: {97. 66. 99}.

	self assert: (b1 perform: #islower env: 2).
	self deny: (b2 perform: #islower env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isupper
	"Test bytes.isupper()"

	| b1 b2 |
	b1 :=  bytes withAll: {65. 66. 67}.
	b2 :=  bytes withAll: {65. 98. 67}.

	self assert: (b1 perform: #isupper env: 2).
	self deny: (b2 perform: #isupper env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_isascii
	"Test bytes.isascii()"

	| b1 b2 |
	b1 :=  bytes withAll: {65. 66. 67}.
	b2 :=  bytes withAll: {65. 200. 67}.

	self assert: (b1 perform: #isascii env: 2).
	self deny: (b2 perform: #isascii env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_istitle
	"Test bytes.istitle()"

	| b1 b2 b3 |
	b1 :=  bytes withAll: {72. 101. 108. 108. 111. 32. 87. 111. 114. 108. 100}.
	b2 :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	b3 :=  bytes withAll: {72. 69. 76. 76. 79. 32. 87. 79. 82. 76. 68}.

	self assert: (b1 perform: #istitle env: 2).
	self deny: (b2 perform: #istitle env: 2).
	self deny: (b3 perform: #istitle env: 2).
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_capitalize
	"Test bytes.capitalize()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	result := b perform: #capitalize env: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 72.
	self assert: (result perform: #at: env: 0 withArguments: {7}) equals: 119.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_swapcase
	"Test bytes.swapcase()"

	| b result |
	b :=  bytes withAll: {72. 101. 108. 108. 111. 32. 87. 111. 114. 108. 100}.
	result := b perform: #swapcase env: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 104.
	self assert: (result perform: #at: env: 0 withArguments: {7}) equals: 119.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_title
	"Test bytes.title()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	result := b perform: #title env: 2.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 72.
	self assert: (result perform: #at: env: 0 withArguments: {7}) equals: 87.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_removeprefix
	"Test bytes.removeprefix(prefix)"

	| b prefix result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	prefix :=  bytes withAll: {104. 101. 108. 108. 111. 32}.

	result := b perform: #removeprefix: env: 2 withArguments: {prefix}.
	self assert: (result ___len___) equals: 5.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 119.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_removesuffix
	"Test bytes.removesuffix(suffix)"

	| b suffix result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	suffix :=  bytes withAll: {32. 119. 111. 114. 108. 100}.

	result := b perform: #removesuffix: env: 2 withArguments: {suffix}.
	self assert: (result ___len___) equals: 5.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 104.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_replace
	"Test bytes.replace(old, new)"

	| b old new result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	old :=  bytes withAll: {108. 108}.
	new :=  bytes withAll: {120. 120}.

	result := b perform: #replace:_: env: 2 withArguments: {old. new}.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 120.
	self assert: (result perform: #at: env: 0 withArguments: {4}) equals: 120.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rindex
	"Test bytes.rindex(sub)"

	| b sub |
	b :=  bytes withAll: {97. 98. 97. 98. 99}.
	sub := bytes ___new___: bytes _: {97}.

	self assert: (b perform: #rindex: env: 2 withArguments: {sub}) equals: 2.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rindexNotFound
	"Test bytes.rindex(sub) raises ValueError when not found"

	| b sub |
	b :=  bytes withAll: {1. 2. 3}.
	sub := bytes ___new___: bytes _: {99}.

	self should: [b perform: #rindex: env: 2 withArguments: {sub}] raise: ValueError.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_ljust
	"Test bytes.ljust(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b perform: #ljust: env: 2 withArguments: {10}.

	self assert: (result ___len___) equals: 10.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 97.
	self assert: (result perform: #at: env: 0 withArguments: {10}) equals: 32.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rjust
	"Test bytes.rjust(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b perform: #rjust: env: 2 withArguments: {10}.

	self assert: (result ___len___) equals: 10.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 32.
	self assert: (result perform: #at: env: 0 withArguments: {10}) equals: 99.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_center
	"Test bytes.center(width)"

	| b result |
	b :=  bytes withAll: {97. 98. 99}.
	result := b perform: #center: env: 2 withArguments: {9}.

	self assert: (result ___len___) equals: 9.
	self assert: (result perform: #at: env: 0 withArguments: {4}) equals: 97.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_zfill
	"Test bytes.zfill(width)"

	| b result |
	b :=  bytes withAll: {52. 50}.
	result := b perform: #zfill: env: 2 withArguments: {5}.

	self assert: (result ___len___) equals: 5.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 48.
	self assert: (result perform: #at: env: 0 withArguments: {4}) equals: 52.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_partition
	"Test bytes.partition(sep)"

	| b sep result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	sep := bytes ___new___: bytes _: {32}.

	result := b perform: #partition: env: 2 withArguments: {sep}.
	self assert: (result size) equals: 3.
	self assert: ((result perform: #at: env: 0 withArguments: {1}) ___len___) equals: 5.
	self assert: ((result perform: #at: env: 0 withArguments: {3}) ___len___) equals: 5.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rpartition
	"Test bytes.rpartition(sep)"

	| b sep result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 32. 119. 111. 114. 108. 100}.
	sep := bytes ___new___: bytes _: {32}.

	result := b perform: #rpartition: env: 2 withArguments: {sep}.
	self assert: (result size) equals: 3.
	self assert: ((result perform: #at: env: 0 withArguments: {1}) ___len___) equals: 5.
	self assert: ((result perform: #at: env: 0 withArguments: {3}) ___len___) equals: 5.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rsplit
	"Test bytes.rsplit(sep, maxsplit)"

	| b sep result |
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #rsplit:_: env: 2 withArguments: {sep. 1}.
	self assert: (result size) equals: 2.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit
	"Test bytes.split(sep, maxsplit) - split from left with limit"

	| b sep result part0 part1 part2 |
	"Test: b'a,b,c,d'.split(b',', 2) should give [b'a', b'b', b'c,d']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #split:_: env: 2 withArguments: {sep. 2}.
	self assert: (result size) equals: 3.

	part0 := result perform: #at: env: 0 withArguments: {1}.
	self assert: (part0 size) equals: 1.
	self assert: (part0 perform: #at: env: 0 withArguments: {1}) equals: 97.  "a"

	part1 := result perform: #at: env: 0 withArguments: {2}.
	self assert: (part1 size) equals: 1.
	self assert: (part1 perform: #at: env: 0 withArguments: {1}) equals: 98.  "b"

	part2 := result perform: #at: env: 0 withArguments: {3}.
	self assert: (part2 size) equals: 3.
	self assert: (part2 perform: #at: env: 0 withArguments: {1}) equals: 99.  "c"
	self assert: (part2 perform: #at: env: 0 withArguments: {2}) equals: 44.  ","
	self assert: (part2 perform: #at: env: 0 withArguments: {3}) equals: 100. "d"
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit_one
	"Test bytes.split(sep, 1) - split only once from left"

	| b sep result part0 part1 |
	"Test: b'a,b,c,d'.split(b',', 1) should give [b'a', b'b,c,d']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #split:_: env: 2 withArguments: {sep. 1}.
	self assert: (result size) equals: 2.

	part0 := result perform: #at: env: 0 withArguments: {1}.
	self assert: (part0 size) equals: 1.
	self assert: (part0 perform: #at: env: 0 withArguments: {1}) equals: 97.  "a"

	part1 := result perform: #at: env: 0 withArguments: {2}.
	self assert: (part1 size) equals: 5.
	self assert: (part1 perform: #at: env: 0 withArguments: {1}) equals: 98.  "b"
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_split_maxsplit_negative
	"Test bytes.split(sep, -1) - negative maxsplit means unlimited"

	| b sep result |
	"Test: b'a,b,c'.split(b',', -1) should give [b'a', b'b', b'c']"
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #split:_: env: 2 withArguments: {sep. -1}.
	self assert: (result size) equals: 3.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit
	"Test bytes.rsplit(sep, maxsplit) - split from right with limit"

	| b sep result part0 part1 part2 |
	"Test: b'a,b,c,d'.rsplit(b',', 2) should give [b'a,b', b'c', b'd']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #rsplit:_: env: 2 withArguments: {sep. 2}.
	self assert: (result size) equals: 3.

	part0 := result perform: #at: env: 0 withArguments: {1}.
	self assert: (part0 size) equals: 3.
	self assert: (part0 perform: #at: env: 0 withArguments: {1}) equals: 97.  "a"
	self assert: (part0 perform: #at: env: 0 withArguments: {2}) equals: 44.  ","
	self assert: (part0 perform: #at: env: 0 withArguments: {3}) equals: 98.  "b"

	part1 := result perform: #at: env: 0 withArguments: {2}.
	self assert: (part1 size) equals: 1.
	self assert: (part1 perform: #at: env: 0 withArguments: {1}) equals: 99.  "c"

	part2 := result perform: #at: env: 0 withArguments: {3}.
	self assert: (part2 size) equals: 1.
	self assert: (part2 perform: #at: env: 0 withArguments: {1}) equals: 100. "d"
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit_one
	"Test bytes.rsplit(sep, 1) - split only once from right"

	| b sep result part0 part1 |
	"Test: b'a,b,c,d'.rsplit(b',', 1) should give [b'a,b,c', b'd']"
	b :=  bytes withAll: {97. 44. 98. 44. 99. 44. 100}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #rsplit:_: env: 2 withArguments: {sep. 1}.
	self assert: (result size) equals: 2.

	part0 := result perform: #at: env: 0 withArguments: {1}.
	self assert: (part0 size) equals: 5.
	self assert: (part0 perform: #at: env: 0 withArguments: {1}) equals: 97.  "a"
	self assert: (part0 perform: #at: env: 0 withArguments: {5}) equals: 99.  "c"

	part1 := result perform: #at: env: 0 withArguments: {2}.
	self assert: (part1 size) equals: 1.
	self assert: (part1 perform: #at: env: 0 withArguments: {1}) equals: 100. "d"
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_rsplit_maxsplit_negative
	"Test bytes.rsplit(sep, -1) - negative maxsplit means unlimited"

	| b sep result |
	"Test: b'a,b,c'.rsplit(b',', -1) should give [b'a', b'b', b'c']"
	b :=  bytes withAll: {97. 44. 98. 44. 99}.
	sep := bytes ___new___: bytes _: {44}.

	result := b perform: #rsplit:_: env: 2 withArguments: {sep. -1}.
	self assert: (result size) equals: 3.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_splitlines
	"Test bytes.splitlines()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 108. 111. 10. 119. 111. 114}.

	result := b perform: #splitlines env: 2.
	self assert: (result size) equals: 2.
	self assert: ((result perform: #at: env: 0 withArguments: {1}) ___len___) equals: 5.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_expandtabs
	"Test bytes.expandtabs()"

	| b result |
	b :=  bytes withAll: {104. 101. 108. 9. 119. 111. 114. 108. 100}.

	result := b perform: #expandtabs env: 2.
	self assert: (result ___len___) > 9.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_maketrans
	"Test bytes.maketrans(from, to)"

	| frm to table |
	frm :=  bytes withAll: {97. 98. 99}.
	to :=  bytes withAll: {49. 50. 51}.

	table := bytes perform: #maketrans:_: env: 2 withArguments: {frm. to}.
	self assert: (table size) equals: 256.
	self assert: (table perform: #at: env: 0 withArguments: {98}) equals: 49.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_translate
	"Test bytes.translate(table)"

	| b frm to table result |
	b :=  bytes withAll: {97. 98. 99}.
	frm :=  bytes withAll: {97. 98. 99}.
	to :=  bytes withAll: {49. 50. 51}.

	table := bytes perform: #maketrans:_: env: 2 withArguments: {frm. to}.
	result := b perform: #translate: env: 2 withArguments: {table}.

	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 49.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 50.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 51.
%

category: 'Tests - Bytes Methods'
method: BytesTestCase
test_fromhex
	"Test bytes.fromhex(string)"

	| result |
	result := bytes perform: #fromhex:_: env: 2 withArguments: {bytes. 'ff0010'}.

	self assert: (result ___len___) equals: 3.
	self assert: (result perform: #at: env: 0 withArguments: {1}) equals: 255.
	self assert: (result perform: #at: env: 0 withArguments: {2}) equals: 0.
	self assert: (result perform: #at: env: 0 withArguments: {3}) equals: 16.
%

category: 'Tests - String Representation'
method: BytesTestCase
test__repr__
	"Test bytes.__repr__()"

	| b result |
	b := bytes perform: #__new__:_:_: env: 2 withArguments: {bytes. 'hello'. 'ascii'}.
	result := b perform: #__repr__ env: 2.

	"Should start with b' and end with '"
	self assert: ((result perform: #at: env: 0 withArguments: {1}) perform: #codePoint env: 0) == 98.
	self assert: ((result perform: #at: env: 0 withArguments: {2}) perform: #codePoint env: 0) == 39.
%

category: 'Tests - Type'
method: BytesTestCase
test__class__
	"Test that bytes.__class__ returns bytes type"

	| b bytesType result |
	b :=  bytes withAll: {1. 2. 3}.
	bytesType := Python at: #'bytes'.

	result := b perform: #__class__ env: 2.
	self assert: result equals: bytesType.
	self assert: result equals: bytes.
%
