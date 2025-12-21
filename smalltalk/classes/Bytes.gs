! ===============================================================================
! ByteArray Methods (Python 'bytes' type)
! ===============================================================================
! This file contains Python method implementations for ByteArray
! to make it behave like Python's bytes type.
!
! Python's bytes is an immutable sequence of bytes (integers 0-255).
! ByteArray in GemStone is mutable, but we enforce immutability through Python methods.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytes
expectvalue /Metaclass3
doit
bytes removeAllMethods: 2.
bytes class removeAllMethods: 2.
%

! ------------------- Class methods for bytes
set compile_env: 2

category: 'Python-Constructors'
classmethod: bytes
__new__: cls
	"bytes() - create empty bytes"

	^ cls perform: #new env: 0
%

category: 'Python-Constructors'
classmethod: bytes
__new__: cls _: source
	"bytes(source) - create bytes from various sources"

	| result sourceClass |
	sourceClass := source perform: #class env: 0.

	"If source is an integer, create bytes of that size filled with zeros"
	sourceClass == SmallInteger ifTrue: [
		(source perform: #< env: 0 withArguments: {0}) ifTrue: [
			ValueError perform: #signal: env: 0 withArguments: {'negative count'}
		].
		^ cls perform: #new: env: 0 withArguments: {source}
	].

	"If source is a string, raise TypeError (need encoding)"
	(source perform: #isKindOf: env: 0 withArguments: {String}) ifTrue: [
		TypeError perform: #signal: env: 0 withArguments: {'string argument without an encoding'}
	].

	"If source is bytes, make a copy"
	(sourceClass == bytes) ifTrue: [
		result := cls perform: #new: env: 0 withArguments: {source perform: #size env: 0}.
		1 perform: #to:do: env: 0 withArguments: {source perform: #size env: 0. [:i |
			result perform: #at:put: env: 0 withArguments: {i. source perform: #at: env: 0 withArguments: {i}}
		]}.
		^ result
	].

	"If source is a list, tuple, or array, convert elements to bytes"
	((sourceClass perform: #= env: 0 withArguments: {OrderedCollection}) or: [
		(sourceClass perform: #= env: 0 withArguments: {InvariantArray}) or: [
			sourceClass perform: #= env: 0 withArguments: {Array}
		]
	]) ifTrue: [
		| ba size |
		size := source perform: #size env: 0.
		ba := cls perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| elem val |
			elem := source perform: #at: env: 0 withArguments: {i}.
			val := elem.
			"Validate byte value (0-255)"
			((val perform: #< env: 0 withArguments: {0}) or: [
				val perform: #> env: 0 withArguments: {255}
			]) ifTrue: [
				ValueError perform: #signal: env: 0 withArguments: {'bytes must be in range(0, 256)'}
			].
			ba perform: #at:put: env: 0 withArguments: {i. val}
		]}.
		^ ba
	].

	"If source is a range, convert to bytes"
	(sourceClass perform: #= env: 0 withArguments: {Interval}) ifTrue: [
		| ba size |
		size := source perform: #size env: 0.
		ba := cls perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| val |
			val := source perform: #at: env: 0 withArguments: {i}.
			"Validate byte value (0-255)"
			((val perform: #< env: 0 withArguments: {0}) or: [
				val perform: #> env: 0 withArguments: {255}
			]) ifTrue: [
				ValueError perform: #signal: env: 0 withArguments: {'bytes must be in range(0, 256)'}
			].
			ba perform: #at:put: env: 0 withArguments: {i. val}
		]}.
		^ ba
	].

	"Default: empty bytes"
	^ cls perform: #new env: 0
%

category: 'Python-Constructors'
classmethod: bytes
__new__: cls _: source _: encoding
	"bytes(string, encoding) - encode string to bytes"

	| result sourceClass encodingStr |
	sourceClass := source perform: #class env: 0.

	"Source must be a string (String or Unicode7)"
	((source perform: #isKindOf: env: 0 withArguments: {String}) not) ifTrue: [
		TypeError perform: #signal: env: 0 withArguments: {'encoding without a string argument'}
	].

	"Get encoding as a Smalltalk string"
	encodingStr := encoding.

	"Support ASCII encoding"
	(encodingStr perform: #= env: 0 withArguments: {'ascii'}) ifTrue: [
		| ba size |
		size := source perform: #size env: 0.
		ba := cls perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| char codePoint |
			char := source perform: #at: env: 0 withArguments: {i}.
			codePoint := char perform: #codePoint env: 0.
			(codePoint perform: #> env: 0 withArguments: {127}) ifTrue: [
				UnicodeEncodeError perform: #signal: env: 0 withArguments: {'ordinal not in range(128)'}
			].
			ba perform: #at:put: env: 0 withArguments: {i. codePoint}
		]}.
		^ ba
	].

	"Support UTF-8 encoding"
	((encodingStr perform: #= env: 0 withArguments: {'utf-8'}) or: [
		encodingStr perform: #= env: 0 withArguments: {'utf8'}
	]) ifTrue: [
		| utf8Bytes |
		utf8Bytes := source perform: #encodeAsUTF8 env: 0.
		result := cls perform: #new: env: 0 withArguments: {utf8Bytes perform: #size env: 0}.
		1 perform: #to:do: env: 0 withArguments: {utf8Bytes perform: #size env: 0. [:i |
			result perform: #at:put: env: 0 withArguments: {i. utf8Bytes perform: #at: env: 0 withArguments: {i}}
		]}.
		^ result
	].

	"Support Latin-1 encoding"
	((encodingStr perform: #= env: 0 withArguments: {'latin-1'}) or: [
		encodingStr perform: #= env: 0 withArguments: {'latin1'}
	]) ifTrue: [
		| ba size |
		size := source perform: #size env: 0.
		ba := cls perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| char codePoint |
			char := source perform: #at: env: 0 withArguments: {i}.
			codePoint := char perform: #codePoint env: 0.
			(codePoint perform: #> env: 0 withArguments: {255}) ifTrue: [
				UnicodeEncodeError perform: #signal: env: 0 withArguments: {'ordinal not in range(256)'}
			].
			ba perform: #at:put: env: 0 withArguments: {i. codePoint}
		]}.
		^ ba
	].

	"Unsupported encoding"
	LookupError perform: #signal: env: 0 withArguments: {'unknown encoding: ', encodingStr}
%

category: 'Python-Constructors'
classmethod: bytes
fromhex: cls _: hexString
	"Create bytes from hex string (e.g., 'deadbeef')"

	| cleaned size ba |
	"Remove spaces from hex string"
	cleaned := hexString perform: #select: env: 0 withArguments: {[:ch |
		(ch perform: #~= env: 0 withArguments: {$ })
	]}.

	"Hex string must have even length"
	size := cleaned perform: #size env: 0.
	((size perform: #\\ env: 0 withArguments: {2}) perform: #~= env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'non-hexadecimal number found in fromhex() arg'}
	].

	"Create bytes and fill with hex values"
	ba := cls perform: #new: env: 0 withArguments: {size perform: #// env: 0 withArguments: {2}}.
	1 perform: #to:by:do: env: 0 withArguments: {size. 2. [:i |
		| hexPair byte stream |
		hexPair := cleaned perform: #copyFrom:to: env: 0 withArguments: {i. i perform: #+ env: 0 withArguments: {1}}.
		stream := ReadStream perform: #on: env: 0 withArguments: {'16r' perform: #, env: 0 withArguments: {hexPair}}.
		byte := Number perform: #fromStream: env: 0 withArguments: {stream}.
		ba perform: #at:put: env: 0 withArguments: {(i perform: #+ env: 0 withArguments: {1}) perform: #// env: 0 withArguments: {2}. byte}
	]}.

	^ ba
%

! ------------------- Instance methods for bytes
category: 'Python-Type'
method: bytes
__class__
	"Return the Python type for bytes"
	^ bytes
%

category: 'Python-Sequence Protocol'
method: bytes
__len__
	"Return the number of bytes"
	^ self perform: #size env: 0
%

category: 'Python-Sequence Protocol'
method: bytes
__getitem__: index
	"Get byte at index (0-based, supports negative indices)"
	| idx size |
	size := self perform: #size env: 0.
	idx := index.

	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].

	"Check bounds"
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'index out of range'}
	].

	"Return byte value (convert to 1-based index)"
	^ self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%

category: 'Python-Sequence Protocol'
method: bytes
__setitem__: index _: value
	"bytes is immutable - raise TypeError"
	TypeError perform: #signal: env: 0 withArguments: {'''bytes'' object does not support item assignment'}
%

category: 'Python-Sequence Protocol'
method: bytes
__contains__: item
	"Check if byte value is in bytes"
	| size |
	size := self perform: #size env: 0.
	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		(byte perform: #= env: 0 withArguments: {item}) ifTrue: [
			^ true
		]
	]}.
	^ false
%

category: 'Python-Comparison'
method: bytes
__eq__: other
	"Compare bytes for equality"
	| otherClass size |
	otherClass := other perform: #class env: 0.

	"Can only concatenate with bytes or bytearray"
	((otherClass perform: #= env: 0 withArguments: {bytes}) or: [
		otherClass perform: #= env: 0 withArguments: {bytearray}
	]) ifFalse: [
		^ false
	].

	"Check sizes"
	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {other perform: #size env: 0}) ifFalse: [
		^ false
	].

	"Compare each byte"
	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| myByte otherByte |
		myByte := self perform: #at: env: 0 withArguments: {i}.
		otherByte := other perform: #at: env: 0 withArguments: {i}.
		(myByte perform: #= env: 0 withArguments: {otherByte}) ifFalse: [
			^ false
		]
	]}.

	^ true
%

category: 'Python-Comparison'
method: bytes
__ne__: other
	"Compare bytes for inequality"
	| result |
	result := self perform: #__eq__: env: 2 withArguments: {other}.
	^ result perform: #not env: 0
%

category: 'Python-Hashing'
method: bytes
__hash__
	"Return hash of bytes"
	^ self perform: #hash env: 0
%

category: 'Python-String Representation'
method: bytes
__repr__
	"Return string representation of bytes (e.g., b'hello')"
	| result size |
	result := 'b'''.
	size := self perform: #size env: 0.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.

		"Printable ASCII characters (32-126)"
		((byte perform: #>= env: 0 withArguments: {32}) and: [
			byte perform: #<= env: 0 withArguments: {126}
		]) ifTrue: [
			"Special cases that need escaping"
			(byte perform: #= env: 0 withArguments: {39}) ifTrue: [  "single quote"
				result := result perform: #, env: 0 withArguments: {'\'''}
			] ifFalse: [
				(byte perform: #= env: 0 withArguments: {92}) ifTrue: [  "backslash"
					result := result perform: #, env: 0 withArguments: {'\\'}
				] ifFalse: [
					| char |
					char := Character perform: #codePoint: env: 0 withArguments: {byte}.
					result := result perform: #, env: 0 withArguments: {char perform: #asString env: 0}
				]
			]
		] ifFalse: [
			"Non-printable: use \xNN format"
			| hex |
			hex := byte perform: #printStringRadix: env: 0 withArguments: {16}.
			((hex perform: #size env: 0) perform: #= env: 0 withArguments: {1}) ifTrue: [
				hex := '0' perform: #, env: 0 withArguments: {hex}
			].
			result := result perform: #, env: 0 withArguments: {'\x' perform: #, env: 0 withArguments: {hex}}
		]
	]}.

	result := result perform: #, env: 0 withArguments: {''''}.
	^ result
%

category: 'Python-Concatenation'
method: bytes
__add__: other
	"Concatenate bytes"
	| otherClass size1 size2 result |
	otherClass := other perform: #class env: 0.

	"Can only concatenate with bytes or bytearray"
	((otherClass perform: #= env: 0 withArguments: {bytes}) or: [
		otherClass perform: #= env: 0 withArguments: {bytearray}
	]) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'can''t concat bytes to ', otherClass}
	].

	size1 := self perform: #size env: 0.
	size2 := other perform: #size env: 0.
	result := (self perform: #class env: 0) perform: #new: env: 0 withArguments: {size1 perform: #+ env: 0 withArguments: {size2}}.

	"Copy self"
	1 perform: #to:do: env: 0 withArguments: {size1. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"Copy other"
	1 perform: #to:do: env: 0 withArguments: {size2. [:i |
		result perform: #at:put: env: 0 withArguments: {size1 perform: #+ env: 0 withArguments: {i}. other perform: #at: env: 0 withArguments: {i}}
	]}.

	^ result
%

category: 'Python-Concatenation'
method: bytes
__mul__: count
	"Repeat bytes count times"
	| n size result offset |
	n := count.

	"Validate count is an integer"
	(n perform: #class env: 0) == SmallInteger ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'can''t multiply sequence by non-int'}
	].

	"If count <= 0, return empty bytes"
	(n perform: #<= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	size := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {size perform: #* env: 0 withArguments: {n}}.
	offset := 0.

	1 perform: #to:do: env: 0 withArguments: {n. [:rep |
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			result perform: #at:put: env: 0 withArguments: {offset perform: #+ env: 0 withArguments: {i}. self perform: #at: env: 0 withArguments: {i}}
		]}.
		offset := offset perform: #+ env: 0 withArguments: {size}
	]}.

	^ result
%

category: 'Python-Search Methods'
method: bytes
count: sub
	"Count non-overlapping occurrences of sub"
	| subClass subSize mySize count i |
	subClass := sub perform: #class env: 0.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Count occurrences of single byte"
		count := 0.
		mySize := self perform: #size env: 0.
		1 perform: #to:do: env: 0 withArguments: {mySize. [:idx |
			| byte |
			byte := self perform: #at: env: 0 withArguments: {idx}.
			(byte perform: #= env: 0 withArguments: {sub}) ifTrue: [
				count := count perform: #+ env: 0 withArguments: {1}
			]
		]}.
		^ count
	].

	"sub must be bytes"
	subClass == bytes ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'argument should be bytes or integer'}
	].

	subSize := sub perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty sub always returns 0"
	(subSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ 0
	].

	count := 0.
	i := 1.

	[i perform: #<= env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {subSize perform: #- env: 0 withArguments: {1}}}] perform: #whileTrue: env: 0 withArguments: {[
		| match |
		match := true.
		1 perform: #to:do: env: 0 withArguments: {subSize. [:j |
			| myByte subByte |
			myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
			subByte := sub perform: #at: env: 0 withArguments: {j}.
			(myByte perform: #= env: 0 withArguments: {subByte}) ifFalse: [
				match := false
			]
		]}.
		match ifTrue: [
			count := count perform: #+ env: 0 withArguments: {1}.
			i := i perform: #+ env: 0 withArguments: {subSize}
		] ifFalse: [
			i := i perform: #+ env: 0 withArguments: {1}
		]
	]}.

	^ count
%

category: 'Python-Search Methods'
method: bytes
find: sub
	"Find first occurrence of sub, return index or -1"
	| subClass subSize mySize i w x y z |
	subClass := sub perform: #class env: 0.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find first occurrence of single byte"
		mySize := self perform: #size env: 0.
		1 perform: #to:do: env: 0 withArguments: {mySize. [:idx |
			| byte |
			byte := self perform: #at: env: 0 withArguments: {idx}.
			(byte perform: #= env: 0 withArguments: {sub}) ifTrue: [
				^ idx perform: #- env: 0 withArguments: {1}  "Convert to 0-based"
			]
		]}.
		^ -1
	].

	"sub must be bytes"
	w := bytearray.
	x := subClass == bytes.
	y := subClass == bytearray.
	z := x or: [y].
	(subClass == bytes or: [subClass == bytearray]) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'argument should be bytes, bytearray or int'}
	].

	subSize := sub perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty sub always returns 0"
	(subSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ 0
	].

	i := 1.
	[i perform: #<= env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {subSize perform: #- env: 0 withArguments: {1}}}] perform: #whileTrue: env: 0 withArguments: {[
		| match |
		match := true.
		1 perform: #to:do: env: 0 withArguments: {subSize. [:j |
			| myByte subByte |
			myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
			subByte := sub perform: #at: env: 0 withArguments: {j}.
			(myByte perform: #= env: 0 withArguments: {subByte}) ifFalse: [
				match := false
			]
		]}.
		match ifTrue: [
			^ i perform: #- env: 0 withArguments: {1}  "Convert to 0-based"
		].
		i := i perform: #+ env: 0 withArguments: {1}
	]}.

	^ -1
%

category: 'Python-Search Methods'
method: bytes
index: sub
	"Find first occurrence of sub, raise ValueError if not found"
	| result |
	result := self perform: #find: env: 2 withArguments: {sub}.
	(result perform: #= env: 0 withArguments: {-1}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'subsection not found'}
	].
	^ result
%

category: 'Python-Search Methods'
method: bytes
rfind: sub
	"Find last occurrence of sub, return index or -1"
	| subClass subSize mySize i |
	subClass := sub perform: #class env: 0.

	"sub must be bytes or integer"
	subClass == SmallInteger ifTrue: [
		"Find last occurrence of single byte"
		mySize := self perform: #size env: 0.
		mySize perform: #to:by:do: env: 0 withArguments: {1. -1. [:idx |
			| byte |
			byte := self perform: #at: env: 0 withArguments: {idx}.
			(byte perform: #= env: 0 withArguments: {sub}) ifTrue: [
				^ idx perform: #- env: 0 withArguments: {1}  "Convert to 0-based"
			]
		]}.
		^ -1
	].

	"sub must be bytes"
	(subClass == bytes or: [subClass == bytearray]) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'argument should be bytes, bytearray or int'}
	].

	subSize := sub perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty sub always returns size"
	(subSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ mySize
	].

	i := mySize perform: #- env: 0 withArguments: {subSize perform: #- env: 0 withArguments: {1}}.
	[i perform: #>= env: 0 withArguments: {1}] perform: #whileTrue: env: 0 withArguments: {[
		| match |
		match := true.
		1 perform: #to:do: env: 0 withArguments: {subSize. [:j |
			| myByte subByte |
			myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
			subByte := sub perform: #at: env: 0 withArguments: {j}.
			(myByte perform: #= env: 0 withArguments: {subByte}) ifFalse: [
				match := false
			]
		]}.
		match ifTrue: [
			^ i perform: #- env: 0 withArguments: {1}  "Convert to 0-based"
		].
		i := i perform: #- env: 0 withArguments: {1}
	]}.

	^ -1
%

category: 'Python-Search Methods'
method: bytes
rindex: sub
	"Find last occurrence of sub, raise ValueError if not found"
	| result |
	result := self perform: #rfind: env: 2 withArguments: {sub}.
	(result perform: #= env: 0 withArguments: {-1}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'subsection not found'}
	].
	^ result
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
startswith: prefix
	"Check if bytes starts with prefix"
	| prefixClass prefixSize mySize |
	prefixClass := prefix perform: #class env: 0.

	"prefix must be bytes"
	(prefixClass perform: #= env: 0 withArguments: {bytes}) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'argument should be bytes'}
	].

	prefixSize := prefix perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"If prefix is longer, can't match"
	(prefixSize perform: #> env: 0 withArguments: {mySize}) ifTrue: [
		^ false
	].

	"Compare each byte"
	1 perform: #to:do: env: 0 withArguments: {prefixSize. [:i |
		| myByte prefixByte |
		myByte := self perform: #at: env: 0 withArguments: {i}.
		prefixByte := prefix perform: #at: env: 0 withArguments: {i}.
		(myByte perform: #= env: 0 withArguments: {prefixByte}) ifFalse: [
			^ false
		]
	]}.

	^ true
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
endswith: suffix
	"Check if bytes ends with suffix"
	| suffixClass suffixSize mySize offset |
	suffixClass := suffix perform: #class env: 0.

	"suffix must be bytes"
	(suffixClass perform: #= env: 0 withArguments: {bytes}) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'argument should be bytes'}
	].

	suffixSize := suffix perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"If suffix is longer, can't match"
	(suffixSize perform: #> env: 0 withArguments: {mySize}) ifTrue: [
		^ false
	].

	offset := mySize perform: #- env: 0 withArguments: {suffixSize}.

	"Compare each byte"
	1 perform: #to:do: env: 0 withArguments: {suffixSize. [:i |
		| myByte suffixByte |
		myByte := self perform: #at: env: 0 withArguments: {offset perform: #+ env: 0 withArguments: {i}}.
		suffixByte := suffix perform: #at: env: 0 withArguments: {i}.
		(myByte perform: #= env: 0 withArguments: {suffixByte}) ifFalse: [
			^ false
		]
	]}.

	^ true
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
removeprefix: prefix
	"Remove prefix if present, otherwise return copy"
	| hasPrefix prefixSize mySize result |
	hasPrefix := self perform: #startswith: env: 2 withArguments: {prefix}.
	hasPrefix ifFalse: [
		^ self perform: #copy env: 0
	].

	prefixSize := prefix perform: #size env: 0.
	mySize := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {prefixSize}}.

	1 perform: #to:do: env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {prefixSize}. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {prefixSize perform: #+ env: 0 withArguments: {i}}}
	]}.

	^ result
%

category: 'Python-Prefix/Suffix Methods'
method: bytes
removesuffix: suffix
	"Remove suffix if present, otherwise return copy"
	| hasSuffix suffixSize mySize result |
	hasSuffix := self perform: #endswith: env: 2 withArguments: {suffix}.
	hasSuffix ifFalse: [
		^ self perform: #copy env: 0
	].

	suffixSize := suffix perform: #size env: 0.
	mySize := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {suffixSize}}.

	1 perform: #to:do: env: 0 withArguments: {mySize perform: #- env: 0 withArguments: {suffixSize}. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	^ result
%

category: 'Python-Testing Methods'
method: bytes
isascii
	"Return True if the sequence is empty or all bytes are ASCII (0-127)"

	| size |
	size := self perform: #size env: 0.
	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"ASCII bytes are in the range 0-0x7F (0-127)"
		(byte perform: #> env: 0 withArguments: {127}) ifTrue: [
			^ false
		]
	]}.
	^ true
%

category: 'Python-String-like Methods'
method: bytes
upper
	"Return uppercase version of bytes"

	| result size |
	size := self perform: #size env: 0.
	result := (self perform: #class env: 0) perform: #new: env: 0 withArguments: {size}.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Convert lowercase ASCII (97-122) to uppercase (65-90)"
		((byte perform: #>= env: 0 withArguments: {97}) and: [
			byte perform: #<= env: 0 withArguments: {122}
		]) ifTrue: [
			byte := byte perform: #- env: 0 withArguments: {32}
		].
		result perform: #at:put: env: 0 withArguments: {i. byte}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
lower
	"Return lowercase version of bytes"

	| result size |
	size := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {size}.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Convert uppercase ASCII (65-90) to lowercase (97-122)"
		((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) ifTrue: [
			byte := byte perform: #+ env: 0 withArguments: {32}
		].
		result perform: #at:put: env: 0 withArguments: {i. byte}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
capitalize
	"Return capitalized version (first byte uppercase, rest lowercase)"

	| result size firstByte |
	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	result := self perform: #lower env: 2.

	"Capitalize first byte if it's a lowercase letter"
	firstByte := result perform: #at: env: 0 withArguments: {1}.
	((firstByte perform: #>= env: 0 withArguments: {97}) and: [
		firstByte perform: #<= env: 0 withArguments: {122}
	]) ifTrue: [
		result perform: #at:put: env: 0 withArguments: {1. firstByte perform: #- env: 0 withArguments: {32}}
	].

	^ result
%

category: 'Python-Encoding/Decoding'
method: bytes
decode
	"Decode bytes to string using UTF-8"
	^ self perform: #decode: env: 2 withArguments: {'utf-8'}
%

category: 'Python-Encoding/Decoding'
method: bytes
decode: encoding
	"Decode bytes to string using specified encoding"

	| encodingStr |
	encodingStr := encoding.

	"Support UTF-8"
	((encodingStr perform: #= env: 0 withArguments: {'utf-8'}) or: [
		encodingStr perform: #= env: 0 withArguments: {'utf8'}
	]) ifTrue: [
		^ self perform: #decodeFromUTF8 env: 0
	].

	"Support ASCII"
	(encodingStr perform: #= env: 0 withArguments: {'ascii'}) ifTrue: [
		| result size |
		size := self perform: #size env: 0.
		result := Unicode7 perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| byte char |
			byte := self perform: #at: env: 0 withArguments: {i}.
			(byte perform: #> env: 0 withArguments: {127}) ifTrue: [
				UnicodeDecodeError perform: #signal: env: 0 withArguments: {'ordinal not in range(128)'}
			].
			char := Character perform: #codePoint: env: 0 withArguments: {byte}.
			result perform: #at:put: env: 0 withArguments: {i. char}
		]}.
		^ result
	].

	"Support Latin-1"
	((encodingStr perform: #= env: 0 withArguments: {'latin-1'}) or: [
		encodingStr perform: #= env: 0 withArguments: {'latin1'}
	]) ifTrue: [
		| result size |
		size := self perform: #size env: 0.
		result := Unicode7 perform: #new: env: 0 withArguments: {size}.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| byte char |
			byte := self perform: #at: env: 0 withArguments: {i}.
			char := Character perform: #codePoint: env: 0 withArguments: {byte}.
			result perform: #at:put: env: 0 withArguments: {i. char}
		]}.
		^ result
	].

	"Unsupported encoding"
	LookupError perform: #signal: env: 0 withArguments: {'unknown encoding: ', encodingStr}
%

category: 'Python-Encoding/Decoding'
method: bytes
hex
	"Return hex representation of bytes"
	| result size |
	result := ''.
	size := self perform: #size env: 0.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte hexStr |
		byte := self perform: #at: env: 0 withArguments: {i}.
		hexStr := byte perform: #printStringRadix: env: 0 withArguments: {16}.
		"Pad with leading zero if needed"
		((hexStr perform: #size env: 0) perform: #= env: 0 withArguments: {1}) ifTrue: [
			hexStr := '0' perform: #, env: 0 withArguments: {hexStr}
		].
		result := result perform: #, env: 0 withArguments: {hexStr}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
strip
	"Remove leading and trailing whitespace bytes"
	| start end size result newSize |

	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Find first non-whitespace"
	start := 1.
	[(start perform: #<= env: 0 withArguments: {size}) and: [
		| byte |
		byte := self perform: #at: env: 0 withArguments: {start}.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13)"
		(byte perform: #= env: 0 withArguments: {32}) or: [
			(byte perform: #= env: 0 withArguments: {9}) or: [
				(byte perform: #= env: 0 withArguments: {10}) or: [
					byte perform: #= env: 0 withArguments: {13}
				]
			]
		]
	]] perform: #whileTrue: env: 0 withArguments: {[
		start := start perform: #+ env: 0 withArguments: {1}
	]}.

	"All whitespace"
	(start perform: #> env: 0 withArguments: {size}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Find last non-whitespace"
	end := size.
	[(end perform: #>= env: 0 withArguments: {start}) and: [
		| byte |
		byte := self perform: #at: env: 0 withArguments: {end}.
		(byte perform: #= env: 0 withArguments: {32}) or: [
			(byte perform: #= env: 0 withArguments: {9}) or: [
				(byte perform: #= env: 0 withArguments: {10}) or: [
					byte perform: #= env: 0 withArguments: {13}
				]
			]
		]
	]] perform: #whileTrue: env: 0 withArguments: {[
		end := end perform: #- env: 0 withArguments: {1}
	]}.

	"Extract substring"
	newSize := end perform: #- env: 0 withArguments: {start perform: #- env: 0 withArguments: {1}}.
	result := bytes perform: #new: env: 0 withArguments: {newSize}.
	1 perform: #to:do: env: 0 withArguments: {newSize. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {start perform: #+ env: 0 withArguments: {i perform: #- env: 0 withArguments: {1}}}}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
lstrip
	"Remove leading whitespace bytes"
	| start size result newSize |
	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Find first non-whitespace"
	start := 1.
	[(start perform: #<= env: 0 withArguments: {size}) and: [
		| byte |
		byte := self perform: #at: env: 0 withArguments: {start}.
		(byte perform: #= env: 0 withArguments: {32}) or: [
			(byte perform: #= env: 0 withArguments: {9}) or: [
				(byte perform: #= env: 0 withArguments: {10}) or: [
					byte perform: #= env: 0 withArguments: {13}
				]
			]
		]
	]] perform: #whileTrue: env: 0 withArguments: {[
		start := start perform: #+ env: 0 withArguments: {1}
	]}.

	"All whitespace"
	(start perform: #> env: 0 withArguments: {size}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Extract substring"
	newSize := size perform: #- env: 0 withArguments: {start perform: #- env: 0 withArguments: {1}}.
	result := bytes perform: #new: env: 0 withArguments: {newSize}.
	1 perform: #to:do: env: 0 withArguments: {newSize. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {start perform: #+ env: 0 withArguments: {i perform: #- env: 0 withArguments: {1}}}}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
rstrip
	"Remove trailing whitespace bytes"
	| end size result |
	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Find last non-whitespace"
	end := size.
	[(end perform: #>= env: 0 withArguments: {1}) and: [
		| byte |
		byte := self perform: #at: env: 0 withArguments: {end}.
		(byte perform: #= env: 0 withArguments: {32}) or: [
			(byte perform: #= env: 0 withArguments: {9}) or: [
				(byte perform: #= env: 0 withArguments: {10}) or: [
					byte perform: #= env: 0 withArguments: {13}
				]
			]
		]
	]] perform: #whileTrue: env: 0 withArguments: {[
		end := end perform: #- env: 0 withArguments: {1}
	]}.

	"All whitespace"
	(end perform: #< env: 0 withArguments: {1}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Extract substring"
	result := bytes perform: #new: env: 0 withArguments: {end}.
	1 perform: #to:do: env: 0 withArguments: {end. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
split: sep
	"Split bytes by separator, return list of bytes"
	| sepClass sepSize mySize parts currentPart i |
	sepClass := sep perform: #class env: 0.

	"sep must be bytes"
	(sepClass perform: #= env: 0 withArguments: {bytes}) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'sep must be bytes'}
	].

	sepSize := sep perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty separator not allowed"
	(sepSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'empty separator'}
	].

	parts := OrderedCollection perform: #new env: 0.
	currentPart := bytes perform: #new env: 0.
	i := 1.

	[i perform: #<= env: 0 withArguments: {mySize}] perform: #whileTrue: env: 0 withArguments: {[
		| match |
		match := true.

		"Check if separator matches at current position"
		((i perform: #+ env: 0 withArguments: {sepSize perform: #- env: 0 withArguments: {1}}) perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
			1 perform: #to:do: env: 0 withArguments: {sepSize. [:j |
				| myByte sepByte |
				myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
				sepByte := sep perform: #at: env: 0 withArguments: {j}.
				(myByte perform: #= env: 0 withArguments: {sepByte}) ifFalse: [
					match := false
				]
			]}
		] ifFalse: [
			match := false
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts perform: #add: env: 0 withArguments: {currentPart}.
			currentPart := bytes perform: #new env: 0.
			i := i perform: #+ env: 0 withArguments: {sepSize}
		] ifFalse: [
			"Add byte to current part"
			| byte |
			byte := self perform: #at: env: 0 withArguments: {i}.
			currentPart := currentPart perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. byte}; yourself}.
			i := i perform: #+ env: 0 withArguments: {1}
		]
	]}.

	"Add final part"
	parts perform: #add: env: 0 withArguments: {currentPart}.

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
split: sep _: maxsplit
	"Split bytes by separator with maximum number of splits"
	| sepClass sepSize mySize parts currentPart i splitCount match |
	sepClass := sep perform: #class env: 0.

	"sep must be bytes"
	(sepClass == bytes) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'sep must be bytes'}
	].

	sepSize := sep perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty separator not allowed"
	(sepSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'empty separator'}
	].

	"If maxsplit is -1 or < 0, do unlimited split"
	(maxsplit perform: #< env: 0 withArguments: {0}) ifTrue: [
		^ self perform: #split: env: 2 withArguments: {sep}
	].

	parts := OrderedCollection perform: #new env: 0.
	currentPart := bytes perform: #new env: 0.
	i := 1.
	splitCount := 0.

	[i perform: #<= env: 0 withArguments: {mySize}] perform: #whileTrue: env: 0 withArguments: {[
		match := true.

		"Check if we've reached maxsplit"
		(splitCount perform: #>= env: 0 withArguments: {maxsplit}) ifTrue: [
			match := false
		] ifFalse: [
			"Check if separator matches at current position"
			((i perform: #+ env: 0 withArguments: {sepSize perform: #- env: 0 withArguments: {1}}) perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
				1 perform: #to:do: env: 0 withArguments: {sepSize. [:j |
					| myByte sepByte |
					myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
					sepByte := sep perform: #at: env: 0 withArguments: {j}.
					(myByte perform: #= env: 0 withArguments: {sepByte}) ifFalse: [
						match := false
					]
				]}
			] ifFalse: [
				match := false
			]
		].

		match ifTrue: [
			"Found separator - add current part to list"
			parts perform: #add: env: 0 withArguments: {currentPart}.
			currentPart := bytes perform: #new env: 0.
			i := i perform: #+ env: 0 withArguments: {sepSize}.
			splitCount := splitCount perform: #+ env: 0 withArguments: {1}
		] ifFalse: [
			"Add byte to current part"
			| byte |
			byte := self perform: #at: env: 0 withArguments: {i}.
			currentPart := currentPart perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. byte}; yourself}.
			i := i perform: #+ env: 0 withArguments: {1}
		]
	]}.

	"Add final part"
	parts perform: #add: env: 0 withArguments: {currentPart}.

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
join: iterable
	"Join iterable of bytes with self as separator"
	| iterClass parts totalSize result offset |
	iterClass := iterable perform: #class env: 0.

	"iterable must be list or tuple"
	((iterClass perform: #= env: 0 withArguments: {OrderedCollection}) or: [
		iterClass perform: #= env: 0 withArguments: {InvariantArray}
	]) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'can only join an iterable'}
	].

	parts := iterable.

	"Empty iterable"
	((parts perform: #size env: 0) perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ bytes perform: #new env: 0
	].

	"Calculate total size"
	totalSize := 0.
	1 perform: #to:do: env: 0 withArguments: {parts perform: #size env: 0. [:i |
		| part |
		part := parts perform: #at: env: 0 withArguments: {i}.
		totalSize := totalSize perform: #+ env: 0 withArguments: {part perform: #size env: 0}.
		(i perform: #< env: 0 withArguments: {parts perform: #size env: 0}) ifTrue: [
			totalSize := totalSize perform: #+ env: 0 withArguments: {self perform: #size env: 0}
		]
	]}.

	"Build result"
	result := bytes perform: #new: env: 0 withArguments: {totalSize}.
	offset := 0.

	1 perform: #to:do: env: 0 withArguments: {parts perform: #size env: 0. [:i |
		| part partSize |
		part := parts perform: #at: env: 0 withArguments: {i}.
		partSize := part perform: #size env: 0.

		"Copy part"
		1 perform: #to:do: env: 0 withArguments: {partSize. [:j |
			result perform: #at:put: env: 0 withArguments: {offset perform: #+ env: 0 withArguments: {j}. part perform: #at: env: 0 withArguments: {j}}
		]}.
		offset := offset perform: #+ env: 0 withArguments: {partSize}.

		"Add separator (except after last part)"
		(i perform: #< env: 0 withArguments: {parts perform: #size env: 0}) ifTrue: [
			| sepSize |
			sepSize := self perform: #size env: 0.
			1 perform: #to:do: env: 0 withArguments: {sepSize. [:j |
				result perform: #at:put: env: 0 withArguments: {offset perform: #+ env: 0 withArguments: {j}. self perform: #at: env: 0 withArguments: {j}}
			]}.
			offset := offset perform: #+ env: 0 withArguments: {sepSize}
		]
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
replace: old _: new
	"Replace all occurrences of old with new"
	| oldClass newClass oldSize newSize mySize parts i |
	oldClass := old perform: #class env: 0.
	newClass := new perform: #class env: 0.

	"old and new must be bytes"
	(oldClass perform: #= env: 0 withArguments: {bytes}) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'first argument must be bytes'}
	].
	(newClass perform: #= env: 0 withArguments: {bytes}) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'second argument must be bytes'}
	].

	oldSize := old perform: #size env: 0.
	newSize := new perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty old not allowed"
	(oldSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ self perform: #copy env: 0
	].

	"Split by old, then join with new"
	parts := self perform: #split: env: 2 withArguments: {old}.
	^ new perform: #join: env: 2 withArguments: {parts}
%

category: 'Python-Testing Methods'
method: bytes
isalpha
	"Check if all bytes are alphabetic ASCII (A-Z, a-z)"
	| size |
	size := self perform: #size env: 0.

	"Empty bytes returns False"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ false
	].

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Check if A-Z (65-90) or a-z (97-122)"
		((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) ifFalse: [
			((byte perform: #>= env: 0 withArguments: {97}) and: [
				byte perform: #<= env: 0 withArguments: {122}
			]) ifFalse: [
				^ false
			]
		]
	]}.

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isdigit
	"Check if all bytes are digits (0-9)"
	| size |
	size := self perform: #size env: 0.

	"Empty bytes returns False"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ false
	].

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Check if 0-9 (48-57)"
		((byte perform: #>= env: 0 withArguments: {48}) and: [
			byte perform: #<= env: 0 withArguments: {57}
		]) ifFalse: [
			^ false
		]
	]}.

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isalnum
	"Check if all bytes are alphanumeric ASCII"
	| size |
	size := self perform: #size env: 0.

	"Empty bytes returns False"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ false
	].

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Check if 0-9 (48-57), A-Z (65-90), or a-z (97-122)"
		((byte perform: #>= env: 0 withArguments: {48}) and: [
			byte perform: #<= env: 0 withArguments: {57}
		]) ifFalse: [
			((byte perform: #>= env: 0 withArguments: {65}) and: [
				byte perform: #<= env: 0 withArguments: {90}
			]) ifFalse: [
				((byte perform: #>= env: 0 withArguments: {97}) and: [
					byte perform: #<= env: 0 withArguments: {122}
				]) ifFalse: [
					^ false
				]
			]
		]
	]}.

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isspace
	"Check if all bytes are whitespace"
	| size |
	size := self perform: #size env: 0.

	"Empty bytes returns False"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ false
	].

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Whitespace: space(32), tab(9), newline(10), carriage return(13), form feed(12), vertical tab(11)"
		((byte perform: #= env: 0 withArguments: {32}) or: [
			(byte perform: #= env: 0 withArguments: {9}) or: [
				(byte perform: #= env: 0 withArguments: {10}) or: [
					(byte perform: #= env: 0 withArguments: {13}) or: [
						(byte perform: #= env: 0 withArguments: {12}) or: [
							byte perform: #= env: 0 withArguments: {11}
						]
					]
				]
			]
		]) ifFalse: [
			^ false
		]
	]}.

	^ true
%

category: 'Python-Testing Methods'
method: bytes
isupper
	"Check if all cased bytes are uppercase"
	| size hasCased |
	size := self perform: #size env: 0.
	hasCased := false.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Check if lowercase (97-122)"
		((byte perform: #>= env: 0 withArguments: {97}) and: [
			byte perform: #<= env: 0 withArguments: {122}
		]) ifTrue: [
			^ false
		].
		"Check if uppercase (65-90)"
		((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) ifTrue: [
			hasCased := true
		]
	]}.

	^ hasCased
%

category: 'Python-Testing Methods'
method: bytes
islower
	"Check if all cased bytes are lowercase"
	| size hasCased |
	size := self perform: #size env: 0.
	hasCased := false.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Check if uppercase (65-90)"
		((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) ifTrue: [
			^ false
		].
		"Check if lowercase (97-122)"
		((byte perform: #>= env: 0 withArguments: {97}) and: [
			byte perform: #<= env: 0 withArguments: {122}
		]) ifTrue: [
			hasCased := true
		]
	]}.

	^ hasCased
%

category: 'Python-String-like Methods'
method: bytes
swapcase
	"Return bytes with case swapped"
	| result size |
	size := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {size}.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		"Uppercase to lowercase"
		((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) ifTrue: [
			byte := byte perform: #+ env: 0 withArguments: {32}
		] ifFalse: [
			"Lowercase to uppercase"
			((byte perform: #>= env: 0 withArguments: {97}) and: [
				byte perform: #<= env: 0 withArguments: {122}
			]) ifTrue: [
				byte := byte perform: #- env: 0 withArguments: {32}
			]
		].
		result perform: #at:put: env: 0 withArguments: {i. byte}
	]}.

	^ result
%

category: 'Python-String-like Methods'
method: bytes
title
	"Return titlecased bytes (first letter of each word capitalized)"
	| result size inWord |
	size := self perform: #size env: 0.
	result := bytes perform: #new: env: 0 withArguments: {size}.
	inWord := false.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte isAlpha |
		byte := self perform: #at: env: 0 withArguments: {i}.

		"Check if alphabetic"
		isAlpha := ((byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		]) or: [
			(byte perform: #>= env: 0 withArguments: {97}) and: [
				byte perform: #<= env: 0 withArguments: {122}
			]
		].

		isAlpha ifTrue: [
			inWord ifFalse: [
				"First letter of word - capitalize"
				((byte perform: #>= env: 0 withArguments: {97}) and: [
					byte perform: #<= env: 0 withArguments: {122}
				]) ifTrue: [
					byte := byte perform: #- env: 0 withArguments: {32}
				].
				inWord := true
			] ifTrue: [
				"Not first letter - lowercase"
				((byte perform: #>= env: 0 withArguments: {65}) and: [
					byte perform: #<= env: 0 withArguments: {90}
				]) ifTrue: [
					byte := byte perform: #+ env: 0 withArguments: {32}
				]
			]
		] ifFalse: [
			inWord := false
		].

		result perform: #at:put: env: 0 withArguments: {i. byte}
	]}.

	^ result
%

category: 'Python-Testing Methods'
method: bytes
istitle
	"Check if bytes is titlecased"
	| size inWord hasCased |
	size := self perform: #size env: 0.
	inWord := false.
	hasCased := false.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte isUpper isLower |
		byte := self perform: #at: env: 0 withArguments: {i}.

		isUpper := (byte perform: #>= env: 0 withArguments: {65}) and: [
			byte perform: #<= env: 0 withArguments: {90}
		].
		isLower := (byte perform: #>= env: 0 withArguments: {97}) and: [
			byte perform: #<= env: 0 withArguments: {122}
		].

		(isUpper or: [isLower]) ifTrue: [
			inWord ifFalse: [
				"First letter of word must be uppercase"
				isLower ifTrue: [
					^ false
				].
				inWord := true.
				hasCased := true
			] ifTrue: [
				"Not first letter must be lowercase"
				isUpper ifTrue: [
					^ false
				]
			]
		] ifFalse: [
			inWord := false
		]
	]}.

	^ hasCased
%

category: 'Python-Padding Methods'
method: bytes
ljust: width
	"Left justify bytes in field of given width"
	| mySize result padding |
	mySize := self perform: #size env: 0.

	"If already wide enough, return copy"
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
		^ self perform: #copy env: 0
	].

	"Pad with spaces"
	padding := width perform: #- env: 0 withArguments: {mySize}.
	result := bytes perform: #new: env: 0 withArguments: {width}.

	"Copy original"
	1 perform: #to:do: env: 0 withArguments: {mySize. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"Add spaces"
	1 perform: #to:do: env: 0 withArguments: {padding. [:i |
		result perform: #at:put: env: 0 withArguments: {mySize perform: #+ env: 0 withArguments: {i}. 32}
	]}.

	^ result
%

category: 'Python-Padding Methods'
method: bytes
rjust: width
	"Right justify bytes in field of given width"
	| mySize result padding |
	mySize := self perform: #size env: 0.

	"If already wide enough, return copy"
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
		^ self perform: #copy env: 0
	].

	"Pad with spaces"
	padding := width perform: #- env: 0 withArguments: {mySize}.
	result := bytes perform: #new: env: 0 withArguments: {width}.

	"Add spaces"
	1 perform: #to:do: env: 0 withArguments: {padding. [:i |
		result perform: #at:put: env: 0 withArguments: {i. 32}
	]}.

	"Copy original"
	1 perform: #to:do: env: 0 withArguments: {mySize. [:i |
		result perform: #at:put: env: 0 withArguments: {padding perform: #+ env: 0 withArguments: {i}. self perform: #at: env: 0 withArguments: {i}}
	]}.

	^ result
%

category: 'Python-Padding Methods'
method: bytes
center: width
	"Center bytes in field of given width"
	| mySize result totalPadding leftPadding rightPadding |
	mySize := self perform: #size env: 0.

	"If already wide enough, return copy"
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
		^ self perform: #copy env: 0
	].

	"Calculate padding"
	totalPadding := width perform: #- env: 0 withArguments: {mySize}.
	leftPadding := totalPadding perform: #// env: 0 withArguments: {2}.
	rightPadding := totalPadding perform: #- env: 0 withArguments: {leftPadding}.
	result := bytes perform: #new: env: 0 withArguments: {width}.

	"Add left spaces"
	1 perform: #to:do: env: 0 withArguments: {leftPadding. [:i |
		result perform: #at:put: env: 0 withArguments: {i. 32}
	]}.

	"Copy original"
	1 perform: #to:do: env: 0 withArguments: {mySize. [:i |
		result perform: #at:put: env: 0 withArguments: {leftPadding perform: #+ env: 0 withArguments: {i}. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"Add right spaces"
	1 perform: #to:do: env: 0 withArguments: {rightPadding. [:i |
		result perform: #at:put: env: 0 withArguments: {leftPadding perform: #+ env: 0 withArguments: {mySize perform: #+ env: 0 withArguments: {i}}. 32}
	]}.

	^ result
%

category: 'Python-Padding Methods'
method: bytes
zfill: width
	"Pad bytes with zeros on the left to fill width"
	| mySize result padding |
	mySize := self perform: #size env: 0.

	"If already wide enough, return copy"
	(width perform: #<= env: 0 withArguments: {mySize}) ifTrue: [
		^ self perform: #copy env: 0
	].

	"Pad with zeros"
	padding := width perform: #- env: 0 withArguments: {mySize}.
	result := bytes perform: #new: env: 0 withArguments: {width}.

	"Add zeros"
	1 perform: #to:do: env: 0 withArguments: {padding. [:i |
		result perform: #at:put: env: 0 withArguments: {i. 48}  "ASCII '0'"
	]}.

	"Copy original"
	1 perform: #to:do: env: 0 withArguments: {mySize. [:i |
		result perform: #at:put: env: 0 withArguments: {padding perform: #+ env: 0 withArguments: {i}. self perform: #at: env: 0 withArguments: {i}}
	]}.

	^ result
%

category: 'Python-Splitting Methods'
method: bytes
partition: sep
	"Partition bytes at first occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize |
	idx := self perform: #find: env: 2 withArguments: {sep}.

	"Not found - return (self, empty, empty)"
	(idx perform: #= env: 0 withArguments: {-1}) ifTrue: [
		^ InvariantArray perform: #with:with:with: env: 0 withArguments: {
			self perform: #copy env: 0.
			bytes perform: #new env: 0.
			bytes perform: #new env: 0
		}
	].

	"Found - split at separator"
	mySize := self perform: #size env: 0.
	sepSize := sep perform: #size env: 0.

	"Before separator"
	before := bytes perform: #new: env: 0 withArguments: {idx}.
	1 perform: #to:do: env: 0 withArguments: {idx. [:i |
		before perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"After separator"
	afterSize := mySize perform: #- env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {sepSize}}.
	after := bytes perform: #new: env: 0 withArguments: {afterSize}.
	1 perform: #to:do: env: 0 withArguments: {afterSize. [:i |
		after perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {sepSize perform: #+ env: 0 withArguments: {i}}}}
	]}.

	^ InvariantArray perform: #with:with:with: env: 0 withArguments: {before. sep. after}
%

category: 'Python-Splitting Methods'
method: bytes
rpartition: sep
	"Partition bytes at last occurrence of sep, return tuple (before, sep, after)"
	| idx before after mySize sepSize afterSize|
	idx := self perform: #rfind: env: 2 withArguments: {sep}.

	"Not found - return (empty, empty, self)"
	(idx perform: #= env: 0 withArguments: {-1}) ifTrue: [
		^ InvariantArray perform: #with:with:with: env: 0 withArguments: {
			bytes perform: #new env: 0.
			bytes perform: #new env: 0.
			self perform: #copy env: 0
		}
	].

	"Found - split at separator"
	mySize := self perform: #size env: 0.
	sepSize := sep perform: #size env: 0.

	"Before separator"
	before := bytes perform: #new: env: 0 withArguments: {idx}.
	1 perform: #to:do: env: 0 withArguments: {idx. [:i |
		before perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"After separator"
	afterSize := mySize perform: #- env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {sepSize}}.
	after := bytes perform: #new: env: 0 withArguments: {afterSize}.
	1 perform: #to:do: env: 0 withArguments: {afterSize. [:i |
		after perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {sepSize perform: #+ env: 0 withArguments: {i}}}}
	]}.

	^ InvariantArray perform: #with:with:with: env: 0 withArguments: {before. sep. after}
%

category: 'Python-Splitting Methods'
method: bytes
rsplit: sep
	"Split from right (same as split for now - full implementation would need maxsplit)"
	^ self perform: #split: env: 2 withArguments: {sep}
%

category: 'Python-Splitting Methods'
method: bytes
rsplit: sep _: maxsplit
	"Split from right with maximum number of splits"
	| sepClass sepSize mySize parts positions i actualSplits lastEnd firstPart firstPartSize |
	sepClass := sep perform: #class env: 0.

	"sep must be bytes"
	(sepClass == bytes) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'sep must be bytes'}
	].

	sepSize := sep perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Empty separator not allowed"
	(sepSize perform: #= env: 0 withArguments: {0}) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'empty separator'}
	].

	"If maxsplit is -1 or < 0, do unlimited split"
	(maxsplit perform: #< env: 0 withArguments: {0}) ifTrue: [
		^ self perform: #split: env: 2 withArguments: {sep}
	].

	"Find all separator positions from right to left"
	positions := OrderedCollection perform: #new env: 0.
	i := mySize perform: #- env: 0 withArguments: {sepSize perform: #- env: 0 withArguments: {1}}.
	
	[i perform: #>= env: 0 withArguments: {1}] perform: #whileTrue: env: 0 withArguments: {[
		| match |
		match := true.
		1 perform: #to:do: env: 0 withArguments: {sepSize. [:j |
			| myByte sepByte |
			myByte := self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}.
			sepByte := sep perform: #at: env: 0 withArguments: {j}.
			(myByte perform: #= env: 0 withArguments: {sepByte}) ifFalse: [
				match := false
			]
		]}.
		match ifTrue: [
			positions perform: #add: env: 0 withArguments: {i}
		].
		i := i perform: #- env: 0 withArguments: {1}
	]}.

	"Limit to maxsplit splits (take first maxsplit positions since we collected from right)"
	actualSplits := positions perform: #size env: 0.
	(actualSplits perform: #> env: 0 withArguments: {maxsplit}) ifTrue: [
		| newPositions |
		newPositions := OrderedCollection perform: #new env: 0.
		1 perform: #to:do: env: 0 withArguments: {maxsplit. [:idx |
			newPositions perform: #add: env: 0 withArguments: {positions perform: #at: env: 0 withArguments: {idx}}
		]}.
		positions := newPositions
	].

	"Build parts from right to left"
	parts := OrderedCollection perform: #new env: 0.
	lastEnd := mySize perform: #+ env: 0 withArguments: {1}.
	
	1 perform: #to:do: env: 0 withArguments: {positions perform: #size env: 0. [:idx |
		| pos part partSize |
		pos := positions perform: #at: env: 0 withArguments: {idx}.
		partSize := lastEnd perform: #- env: 0 withArguments: {pos perform: #+ env: 0 withArguments: {sepSize}}.
		part := bytes perform: #new: env: 0 withArguments: {partSize}.
		1 perform: #to:do: env: 0 withArguments: {partSize. [:j |
			part perform: #at:put: env: 0 withArguments: {j. self perform: #at: env: 0 withArguments: {pos perform: #+ env: 0 withArguments: {sepSize perform: #+ env: 0 withArguments: {j perform: #- env: 0 withArguments: {1}}}}}
		]}.
		parts perform: #addFirst: env: 0 withArguments: {part}.
		lastEnd := pos
	]}.

	"Add first part (everything before first split position)"
	firstPartSize := lastEnd perform: #- env: 0 withArguments: {1}.
	firstPart := bytes perform: #new: env: 0 withArguments: {firstPartSize}.
	1 perform: #to:do: env: 0 withArguments: {firstPartSize. [:j |
		firstPart perform: #at:put: env: 0 withArguments: {j. self perform: #at: env: 0 withArguments: {j}}
	]}.
	parts perform: #addFirst: env: 0 withArguments: {firstPart}.

	^ parts
%

category: 'Python-Splitting Methods'
method: bytes
splitlines
	"Split bytes at line boundaries, return list"
	| parts currentPart size i |
	size := self perform: #size env: 0.
	parts := OrderedCollection perform: #new env: 0.
	currentPart := bytes perform: #new env: 0.
	i := 1.

	[i perform: #<= env: 0 withArguments: {size}] perform: #whileTrue: env: 0 withArguments: {[
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.

		"Check for line endings"
		(byte perform: #= env: 0 withArguments: {10}) ifTrue: [  "LF"
			parts perform: #add: env: 0 withArguments: {currentPart}.
			currentPart := bytes perform: #new env: 0.
			i := i perform: #+ env: 0 withArguments: {1}
		] ifFalse: [
			(byte perform: #= env: 0 withArguments: {13}) ifTrue: [  "CR"
				parts perform: #add: env: 0 withArguments: {currentPart}.
				currentPart := bytes perform: #new env: 0.
				"Check for CRLF"
				((i perform: #< env: 0 withArguments: {size}) and: [
					(self perform: #at: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {1}}) perform: #= env: 0 withArguments: {10}
				]) ifTrue: [
					i := i perform: #+ env: 0 withArguments: {2}
				] ifFalse: [
					i := i perform: #+ env: 0 withArguments: {1}
				]
			] ifFalse: [
				"Regular character"
				currentPart := currentPart perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. byte}; yourself}.
				i := i perform: #+ env: 0 withArguments: {1}
			]
		]
	]}.

	"Add final part if non-empty"
	((currentPart perform: #size env: 0) perform: #> env: 0 withArguments: {0}) ifTrue: [
		parts perform: #add: env: 0 withArguments: {currentPart}
	].

	^ parts
%

category: 'Python-String-like Methods'
method: bytes
expandtabs
	"Expand tabs to spaces (default tabsize=8)"
	^ self perform: #expandtabs: env: 2 withArguments: {8}
%

category: 'Python-String-like Methods'
method: bytes
expandtabs: tabsize
	"Expand tabs to spaces with given tabsize"
	| result size column |
	result := bytes perform: #new env: 0.
	size := self perform: #size env: 0.
	column := 0.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.

		(byte perform: #= env: 0 withArguments: {9}) ifTrue: [  "Tab"
			| spaces |
			spaces := tabsize perform: #- env: 0 withArguments: {column perform: #\\ env: 0 withArguments: {tabsize}}.
			1 perform: #to:do: env: 0 withArguments: {spaces. [:j |
				result := result perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. 32}; yourself}
			]}.
			column := column perform: #+ env: 0 withArguments: {spaces}
		] ifFalse: [
			(byte perform: #= env: 0 withArguments: {10}) ifTrue: [  "Newline"
				result := result perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. byte}; yourself}.
				column := 0
			] ifFalse: [
				result := result perform: #, env: 0 withArguments: {(bytes perform: #new: env: 0 withArguments: {1}) perform: #at:put: env: 0 withArguments: {1. byte}; yourself}.
				column := column perform: #+ env: 0 withArguments: {1}
			]
		]
	]}.

	^ result
%

category: 'Python-Translation Methods'
classmethod: bytes
maketrans: frm _: to
	"Create translation table (identity table with replacements)
	Note: This is actually a staticmethod in Python (doesn't receive cls),
	but Grail doesn't have a staticmethod: directive for hand-written methods."
	| frmSize toSize table |
	frmSize := frm perform: #size env: 0.
	toSize := to perform: #size env: 0.

	"frm and to must be same size"
	(frmSize perform: #= env: 0 withArguments: {toSize}) ifFalse: [
		ValueError perform: #signal: env: 0 withArguments: {'maketrans arguments must have same length'}
	].

	"Create identity table (0-255)"
	table := bytes perform: #new: env: 0 withArguments: {256}.
	0 perform: #to:do: env: 0 withArguments: {255. [:i |
		table perform: #at:put: env: 0 withArguments: {i perform: #+ env: 0 withArguments: {1}. i}
	]}.

	"Apply replacements"
	1 perform: #to:do: env: 0 withArguments: {frmSize. [:i |
		| frmByte toByte |
		frmByte := frm perform: #at: env: 0 withArguments: {i}.
		toByte := to perform: #at: env: 0 withArguments: {i}.
		table perform: #at:put: env: 0 withArguments: {frmByte perform: #+ env: 0 withArguments: {1}. toByte}
	]}.

	^ table
%

category: 'Python-Translation Methods'
method: bytes
translate: table
	"Translate bytes using translation table"
	| tableSize mySize result |
	tableSize := table perform: #size env: 0.
	mySize := self perform: #size env: 0.

	"Table must be 256 bytes"
	(tableSize perform: #= env: 0 withArguments: {256}) ifFalse: [
		ValueError perform: #signal: env: 0 withArguments: {'translation table must be 256 characters long'}
	].

	result := bytes perform: #new: env: 0 withArguments: {mySize}.

	1 perform: #to:do: env: 0 withArguments: {mySize. [:i |
		| byte newByte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		newByte := table perform: #at: env: 0 withArguments: {byte perform: #+ env: 0 withArguments: {1}}.
		result perform: #at:put: env: 0 withArguments: {i. newByte}
	]}.

	^ result
%

set compile_env: 0


