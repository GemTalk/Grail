! ===============================================================================
! bytearray Methods (Python 'bytearray' type - mutable bytes)
! ===============================================================================
! This file contains Python method implementations for the bytearray class.
! bytearray is a mutable sequence of bytes (integers 0-255).
!
! bytearray inherits from bytes, which implements Python's bytes type.
! Most methods are inherited from bytes. This file only contains:
!   1. Overrides for methods that differ (e.g., __class__, __setitem__)
!   2. Additional mutation methods (append, extend, insert, remove, pop, etc.)
!   3. Constructors that return bytearray instances
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from bytearray
expectvalue /Metaclass3
doit
bytearray removeAllMethods: 2.
bytearray class removeAllMethods: 2.
%

! ------------------- Class methods for bytearray
set compile_env: 2

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls
	"bytearray() - create empty bytearray"

	^ cls perform: #new env: 0
%

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls _: source
	"bytearray(source) - create bytearray from various sources"

	| result sourceClass |
	sourceClass := source perform: #class env: 0.

	"If source is an integer, create bytearray of that size filled with zeros"
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

	"If source is bytes or bytearray, make a copy"
	((sourceClass perform: #= env: 0 withArguments: {bytes}) or: [
		sourceClass perform: #= env: 0 withArguments: {bytearray}
	]) ifTrue: [
		result := cls perform: #new: env: 0 withArguments: {source perform: #size env: 0}.
		1 perform: #to:do: env: 0 withArguments: {source perform: #size env: 0. [:i |
			result perform: #at:put: env: 0 withArguments: {i. source perform: #at: env: 0 withArguments: {i}}
		]}.
		^ result
	].

	"If source is a list, tuple, or array, convert elements to bytes"
	((sourceClass == OrderedCollection) or: [
		(sourceClass == InvariantArray) or: [
			sourceClass == Array
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

	"If source is a range, convert to bytearray"
	(sourceClass == Interval) ifTrue: [
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

	"Default: empty bytearray"
	^ cls perform: #new env: 0
%

category: 'Python-Constructors'
classmethod: bytearray
__new__: cls _: source _: encoding
	"bytearray(string, encoding) - encode string to bytearray"

	| result sourceClass encodingStr |
	sourceClass := source perform: #class env: 0.

	"Source must be a string"
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
classmethod: bytearray
fromhex: cls _: hexString
	"Create bytearray from hex string (e.g., 'deadbeef')"

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

	"Create bytearray and fill with hex values"
	ba := cls perform: #new: env: 0 withArguments: {size perform: #// env: 0 withArguments: {2}}.
	1 perform: #to:by:do: env: 0 withArguments: {size. 2. [:i |
		| hexPair byte stream |
		hexPair := cleaned perform: #copyFrom:to: env: 0 withArguments: {i. i perform: #+ env: 0 withArguments: {1}}.
		stream := ReadStream perform: #on: env: 0 withArguments: {'16r' perform: #, env: 0 withArguments: {hexPair}}.
		byte := Integer perform: #fromStream: env: 0 withArguments: {stream}.
		ba perform: #at:put: env: 0 withArguments: {(i perform: #+ env: 0 withArguments: {1}) perform: #// env: 0 withArguments: {2}. byte}
	]}.

	^ ba
%

! ------------------- Instance methods for bytearray
category: 'Python-Type'
method: bytearray
__class__
	"Return the Python type for bytearray"
	^ bytearray
%

category: 'Python-Sequence Protocol'
method: bytearray
__setitem__: index _: value
	"Set byte at index (mutable)"
	| idx size val |
	size := self perform: #size env: 0.
	idx := index.
	val := value.

	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].

	"Check bounds"
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'bytearray index out of range'}
	].

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val perform: #> env: 0 withArguments: {255}
	]) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'byte must be in range(0, 256)'}
	].

	"Set value (convert to 1-based index)"
	self perform: #at:put: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}. val}
%

category: 'Python-Mutation Methods'
method: bytearray
append: item
	"Append a single byte to the end"

	| val |
	val := item.

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val perform: #> env: 0 withArguments: {255}
	]) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'byte must be in range(0, 256)'}
	].

	"Add to end"
	self perform: #add: env: 0 withArguments: {val}
%

category: 'Python-Mutation Methods'
method: bytearray
clear
	"Remove all bytes"

	self perform: #size: env: 0 withArguments: {0}
%

category: 'Python-Mutation Methods'
method: bytearray
copy
	"Return a shallow copy"

	| result size |
	size := self perform: #size env: 0.
	result := bytearray perform: #new: env: 0 withArguments: {size}.
	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		result perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.
	^ result
%

category: 'Python-Mutation Methods'
method: bytearray
extend: iterable
	"Extend bytearray with bytes from iterable"

	| iterClass size |
	iterClass := iterable perform: #class env: 0.

	"Handle bytes or bytearray"
	((iterClass perform: #= env: 0 withArguments: {bytes}) or: [
		iterClass perform: #= env: 0 withArguments: {bytearray}
	]) ifTrue: [
		size := iterable perform: #size env: 0.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| byte |
			byte := iterable perform: #at: env: 0 withArguments: {i}.
			self perform: #add: env: 0 withArguments: {byte}
		]}.
		^ nil
	].

	"Handle list or tuple"
	((iterClass perform: #= env: 0 withArguments: {OrderedCollection}) or: [
		iterClass perform: #= env: 0 withArguments: {InvariantArray}
	]) ifTrue: [
		size := iterable perform: #size env: 0.
		1 perform: #to:do: env: 0 withArguments: {size. [:i |
			| val |
			val := iterable perform: #at: env: 0 withArguments: {i}.
			"Validate byte value"
			((val perform: #< env: 0 withArguments: {0}) or: [
				val perform: #> env: 0 withArguments: {255}
			]) ifTrue: [
				ValueError perform: #signal: env: 0 withArguments: {'byte must be in range(0, 256)'}
			].
			self perform: #add: env: 0 withArguments: {val}
		]}.
		^ nil
	].

	TypeError perform: #signal: env: 0 withArguments: {'extend() argument must be iterable'}
%

category: 'Python-Mutation Methods'
method: bytearray
insert: index _: item
"Insert byte at index"

	| idx size val |
	size := self perform: #size env: 0.
	idx := index.
	val := item.

	"Handle negative indices"
	(index perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].

	"Clamp to valid range"
	(index perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := 0
	].
	(index perform: #> env: 0 withArguments: {size}) ifTrue: [
		idx := size
	].

	"Validate byte value"
	((val perform: #< env: 0 withArguments: {0}) or: [
		val perform: #> env: 0 withArguments: {255}
	]) ifTrue: [
		ValueError perform: #signal: env: 0 withArguments: {'byte must be in range(0, 256)'}
	].

	"Insert at position (convert to 1-based)"
	self 
		perform: #insertAll:at: 
		env: 0 
		withArguments: {
			bytearray perform: #with: env: 0 withArguments: {val}. 
			index perform: #+ env: 0 withArguments: {1}.
			
		}
%

category: 'Python-Mutation Methods'
method: bytearray
remove: value
	"Remove first occurrence of value"

	| size |
	size := self perform: #size env: 0.

	1 perform: #to:do: env: 0 withArguments: {size. [:i |
		| byte |
		byte := self perform: #at: env: 0 withArguments: {i}.
		(byte perform: #= env: 0 withArguments: {value}) ifTrue: [
			self perform: #removeAtIndex: env: 0 withArguments: {i}.
			^ nil
		]
	]}.

	ValueError perform: #signal: env: 0 withArguments: {'value not in bytearray'}
%

category: 'Python-Mutation Methods'
method: bytearray
pop
	"Remove and return last byte"

	| size |
	size := self perform: #size env: 0.

	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'pop from empty bytearray'}
	].

	^ self perform: #removeLast env: 0
%

category: 'Python-Mutation Methods'
method: bytearray
pop: index
	"Remove and return byte at index"

	| idx size byte |
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
		IndexError perform: #signal: env: 0 withArguments: {'pop index out of range'}
	].

	"Get byte and remove (convert to 1-based)"
	byte := self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}.
	self perform: #removeAtIndex: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}.
	^ byte
%

category: 'Python-Mutation Methods'
method: bytearray
reverse
	"Reverse bytearray in place"

	| size |
	size := self perform: #size env: 0.

	1 perform: #to:do: env: 0 withArguments: {size perform: #// env: 0 withArguments: {2}. [:i |
		| temp j |
		j := size perform: #- env: 0 withArguments: {i perform: #- env: 0 withArguments: {1}}.
		temp := self perform: #at: env: 0 withArguments: {i}.
		self perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {j}}.
		self perform: #at:put: env: 0 withArguments: {j. temp}
	]}
%

category: 'Python-Sequence Protocol'
method: bytearray
__delitem__: index
	"Delete byte at index"

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
		IndexError perform: #signal: env: 0 withArguments: {'bytearray index out of range'}
	].

	"Remove (convert to 1-based)"
	self perform: #removeAtIndex: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%

category: 'Python-Concatenation'
method: bytearray
__iadd__: other
	"In-place concatenation"

	| otherClass |
	otherClass := other perform: #class env: 0.

	"Can only concatenate with bytes or bytearray"
	((otherClass perform: #= env: 0 withArguments: {bytes}) or: [
		otherClass perform: #= env: 0 withArguments: {bytearray}
	]) ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'can''t concat bytearray to ', otherClass}
	].

	self perform: #extend: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-Concatenation'
method: bytearray
__imul__: count
	"In-place repetition"

	| n originalSize original |
	n := count.

	"Validate count is an integer"
	(n perform: #class env: 0) == SmallInteger ifFalse: [
		TypeError perform: #signal: env: 0 withArguments: {'can''t multiply sequence by non-int'}
	].

	"If count <= 1, nothing to do (or clear if <= 0)"
	(n perform: #<= env: 0 withArguments: {0}) ifTrue: [
		self perform: #size: env: 0 withArguments: {0}.
		^ self
	].

	(n perform: #= env: 0 withArguments: {1}) ifTrue: [
		^ self
	].

	"Save original content"
	originalSize := self perform: #size env: 0.
	original := bytearray perform: #new: env: 0 withArguments: {originalSize}.
	1 perform: #to:do: env: 0 withArguments: {originalSize. [:i |
		original perform: #at:put: env: 0 withArguments: {i. self perform: #at: env: 0 withArguments: {i}}
	]}.

	"Repeat n-1 times"
	2 perform: #to:do: env: 0 withArguments: {n. [:rep |
		self perform: #extend: env: 2 withArguments: {original}
	]}.

	^ self
%

set compile_env: 0

