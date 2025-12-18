! ------------------- Remove existing behavior from tuple
removeallmethods tuple
removeallclassmethods tuple
! ------------------- Class methods for tuple
category: 'Smalltalk'
classmethod: tuple
___containerClass

	^Array
%
category: 'Smalltalk'
classmethod: tuple
___endChar
	^$)
%
category: 'Smalltalk'
classmethod: tuple
___startChar
	^$(
%
category: 'Smalltalk'
classmethod: tuple
__call__: aPythonTuple

	^(self __new__: aPythonTuple) __init__: aPythonTuple; yourself
%
category: 'Smalltalk'
classmethod: tuple
__new__: aPythonTuple

	^self basicNew ___value: aPythonTuple ___container copy immediateInvariant
%
! ------------------- Instance methods for tuple
category: 'Python'
method: tuple
___modString: aString


	| readStream writeStream pieces piece counter |

	readStream := ReadStream on: aString.
	piece := ''.
	pieces := OrderedCollection new.
	counter := 0.
	[readStream atEnd] whileFalse: [
		| char |
		char := readStream next.
		char == $% ifFalse: [
			piece := piece, char asString.
		] ifTrue: [
			pieces add: piece.
			piece := ''.
			pieces add: (FormatTag new initializeFrom: readStream).
			counter := counter + 1.
		].
	].
	pieces add: piece.
	readStream := ReadStream on: self ___value.

	readStream size > counter ifTrue: [
		TypeError signal: 'TypeError: not all arguments converted during string formatting'.
	].

	writeStream := WriteStream on: String new.
	pieces do: [:each |
		(each isKindOf: String) ifTrue: [
			writeStream nextPutAll: each.
		] ifFalse: [
			writeStream nextPutAll: (each tupleForParameters: readStream).
		].
	].
	^writeStream contents
%
category: 'Python'
method: tuple
__doc__

	^str ___value: 'Built-in immutable sequence.\n' ,
		'\n' ,
		'If no argument is given, the constructor returns an empty tuple.\n' ,
		'If iterable is specified the tuple is initialized from iterable''s items.\n' ,
		'\n' ,
		'If the argument is a tuple, the return value is the same object.'
%
category: 'Python'
method: tuple
__iadd__: aList
	"Tuples are immutable, so += creates a new tuple instead of modifying in place.
	 This is different from list where += modifies in place."

	^self __add__: aList
%
category: 'Python'
method: tuple
__getnewargs__
	"Return args for pickling. Returns a tuple containing this tuple."

	^tuple ___value: { self }
%
category: 'Python'
method: tuple
__hash__
	"Return hash of the tuple. Combines hashes of all elements.
	 Raises TypeError if any element is unhashable."

	| result |
	result := 0.
	container do: [:each |
		| elemHash |
		[elemHash := each __hash__ ___value]
			on: MessageNotUnderstood
			do: [:ex | TypeError signal: 'unhashable type: ''', each ___typeName, ''''].
		result := result bitXor: elemHash.
		result := (result * 31) bitAnd: 16rFFFFFFFF.  "Keep it bounded"
	].
	^int ___value: result
%
category: 'Python'
method: tuple
__init__: aPythonTuple
%
category: 'Python'
method: tuple
__repr__

	| stream |

	stream := WriteStream on: String new.
	stream nextPut: $(.
	stream nextPutAll: container removeFirst __repr__ ___value.
	container do: [:elem |
		stream
			nextPutAll: ', ';
			nextPutAll: elem __repr__ ___value;
			yourself.
	].
	stream nextPut: $).

	^(str ___value: stream contents)
%
