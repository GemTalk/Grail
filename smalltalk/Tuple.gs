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
__getslice__: aPyIntStart _: aPyIntEnd

	| end |
	end := aPyIntEnd.

	end class == NoneType ifTrue: [
		end := int ___value: container size
	].

	^self class ___value: (self ___getslice: aPyIntStart _: end)
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
category: 'Smalltalk'
method: tuple
___typeName

	^'tuple'
%
