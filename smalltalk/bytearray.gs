! ------------------- Remove existing behavior from bytearray
removeallmethods bytearray
removeallclassmethods bytearray
! ------------------- Class methods for bytearray
! ------------------- Instance methods for bytearray
category: 'Python'
method: bytearray
__delitem__: pyIntIndex

	| idx |
	idx := pyIntIndex ___value.
	idx < 0 ifTrue: [idx := container size + idx].
	(idx < 0 or: [idx >= container size]) ifTrue: [IndexError signal: 'bytearray index out of range'].
	container := (container copyFrom: 1 to: idx), (container copyFrom: idx + 2 to: container size).
	^None
%
category: 'Python'
method: bytearray
__doc__

	^str ___value: 'bytearray(iterable_of_ints) -> bytearray\n' ,
		'bytearray(string, encoding[, errors]) -> bytearray\n' ,
		'bytearray(bytes_or_buffer) -> mutable copy of bytes_or_buffer\n' ,
		'bytearray(int) -> bytes array of size given by the parameter initialized with null bytes\n' ,
		'bytearray() -> empty bytes array\n' ,
		'\n' ,
		'Construct a mutable bytearray object from:\n' ,
		'  - an iterable yielding integers in range(256)\n' ,
		'  - a text string encoded using the specified encoding\n' ,
		'  - a bytes or a buffer object\n' ,
		'  - any object implementing the buffer API.\n' ,
		'  - an integer'
%
category: 'Python'
method: bytearray
__setitem__: pyIntIndex _: pyIntValue

	| idx val |
	idx := pyIntIndex ___value.
	val := pyIntValue ___value.
	idx < 0 ifTrue: [idx := container size + idx].
	(idx < 0 or: [idx >= container size]) ifTrue: [IndexError signal: 'bytearray index out of range'].
	(val < 0 or: [val > 255]) ifTrue: [ValueError signal: 'byte must be in range(0, 256)'].
	container at: idx + 1 put: val.
	^None
%
category: 'Python'
method: bytearray
append: pyIntItem

	| val |
	val := pyIntItem ___value.
	(val < 0 or: [val > 255]) ifTrue: [ValueError signal: 'byte must be in range(0, 256)'].
	container := container, (ByteArray with: val).
	^None
%
category: 'Python'
method: bytearray
clear

	container := ByteArray new.
	^None
%
category: 'Python'
method: bytearray
copy

	^bytearray ___value: container copy
%
category: 'Python'
method: bytearray
extend: pyIterable

	pyIterable ___container do: [:each |
		| val |
		val := each ___value.
		(val < 0 or: [val > 255]) ifTrue: [ValueError signal: 'byte must be in range(0, 256)'].
		container := container, (ByteArray with: val).
	].
	^None
%
category: 'Python'
method: bytearray
insert: pyIntIndex _: pyIntItem

	| idx val |
	idx := pyIntIndex ___value.
	val := pyIntItem ___value.
	(val < 0 or: [val > 255]) ifTrue: [ValueError signal: 'byte must be in range(0, 256)'].
	idx < 0 ifTrue: [idx := (container size + idx) max: 0].
	idx > container size ifTrue: [idx := container size].
	container := (container copyFrom: 1 to: idx), (ByteArray with: val), (container copyFrom: idx + 1 to: container size).
	^None
%
category: 'Python'
method: bytearray
pop

	^self pop: (int ___value: -1)
%
category: 'Python'
method: bytearray
pop: pyIntIndex

	| idx val |
	container size == 0 ifTrue: [IndexError signal: 'pop from empty bytearray'].
	idx := pyIntIndex ___value.
	idx < 0 ifTrue: [idx := container size + idx].
	(idx < 0 or: [idx >= container size]) ifTrue: [IndexError signal: 'pop index out of range'].
	val := container at: idx + 1.
	container := (container copyFrom: 1 to: idx), (container copyFrom: idx + 2 to: container size).
	^int ___value: val
%
category: 'Python'
method: bytearray
remove: pyIntValue

	| val idx |
	val := pyIntValue ___value.
	idx := container indexOf: val.
	idx == 0 ifTrue: [ValueError signal: 'value not found in bytearray'].
	container := (container copyFrom: 1 to: idx - 1), (container copyFrom: idx + 1 to: container size).
	^None
%
category: 'Python'
method: bytearray
reverse

	container := container reverse.
	^None
%
category: 'Smalltalk'
method: bytearray
___value: aByteArray

	"Ensure we have a mutable copy - #[...] creates invariant ByteArrays in GemStone"
	container := aByteArray isInvariant
		ifTrue: [ByteArray withAll: aByteArray]
		ifFalse: [aByteArray].
	^self
%
