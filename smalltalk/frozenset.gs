! ------------------- Remove existing behavior from frozenset
removeAllMethods frozenset
removeAllClassMethods frozenset
! ------------------- Class methods for frozenset
set compile_env: 0
category: 'Smalltalk'
classmethod: frozenset
___containerClass

	^Set
%
category: 'Smalltalk'
classmethod: frozenset
___endChar
	^$}
%
category: 'Smalltalk'
classmethod: frozenset
___startChar
	^${
%
! ------------------- Instance methods for frozenset
set compile_env: 0
category: 'Python'
method: frozenset
___convertWithFlags: aSet precision: anObject andType: aCharacter

	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	|validTypes invalidTypes return|
	validTypes := {$a. $s. $r. $c} asSet.
	invalidTypes := {
			$d->[TypeError signal: 'TypeError: %d format: a real number is required, not str'].
			$i->[TypeError signal: 'TypeError: %i format: a real number is required, not str'].
			$u->[TypeError signal: 'TypeError: %u format: a real number is required, not str'].
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$f->[TypeError signal: 'TypeError: must be real number, not str'].
			$F->[TypeError signal: 'TypeError: must be real number, not str'].
			$e->[TypeError signal: 'TypeError: must be real number, not str'].
			$E->[TypeError signal: 'TypeError: must be real number, not str'].
			$g->[TypeError signal: 'TypeError: must be real number, not str'].
			$G->[TypeError signal: 'TypeError: must be real number, not str'].
		} asDictionary.

	(validTypes includes: aCharacter) ifFalse:[
		(invalidTypes at: aCharacter) value.
	].

	(aCharacter == $r or:[aCharacter == $a])
		ifTrue:[
			return := self __repr__ ___value
		]
		ifFalse:[
			return := self __str__ ___value
		].
	(anObject ~= '' and: [anObject < (return size)]) ifFalse:[ return := return copyFrom: 1 to: return size].
	^return
%
category: 'Python'
method: frozenset
__and__: aSet

	^self intersection: aSet
%
category: 'Python'
method: frozenset
__eq__: otherCollection

	^bool ___value: (self ___container = otherCollection ___container)
%
category: 'Python'
method: frozenset
__ge__: otherCollection
	^self issuperset: otherCollection
%
category: 'Python'
method: frozenset
__gt__: otherCollection

	^(self __ge__: otherCollection) and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__le__: otherCollection
	^self issubset: otherCollection
%
category: 'Python'
method: frozenset
__lt__: otherCollection

	^(self __le__: otherCollection) and: [self __ne__: otherCollection]
%
category: 'Python'
method: frozenset
__or__: aSet

	^self union: aSet
%
category: 'Python'
method: frozenset
__repr__

	| stream index|
	index := 1.
	stream := WriteStream on: String new.
	stream nextPutAll: 'frozenset({'.
	container do: [ :each |
		stream nextPutAll: each __repr__ ___value.
		index ~= container size ifTrue: [
			stream nextPutAll: ', '.
		].
		index := index + 1.
	].
	stream nextPut: $};
		nextPut: $);
		yourself.

	^(str ___value: (stream contents)).
%
category: 'Python'
method: frozenset
__sub__: aSet

	^self difference: aSet
%
category: 'Python'
method: frozenset
__xor__: aSet

	^self symmetric_difference: aSet
%
category: 'Python'
method: frozenset
difference: aSet

	^self class ___value: container - aSet ___container
%
category: 'Python'
method: frozenset
intersection: aSet

	^self class ___value: container * aSet ___container
%
category: 'Python'
method: frozenset
isdisjoint: aSet

	^(self intersection: aSet) __len__ ___value == 0
%
category: 'Python'
method: frozenset
issubset: aSet

	self ___container do: [ :each | (aSet ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: frozenset
issuperset: aSet

	aSet ___container do: [ :each | (self ___container includesValue: each) ifFalse: [ ^false ] ].
	^true
%
category: 'Python'
method: frozenset
symmetric_difference: aSet
	"A + B - (AxB)
	"
	^(self union: aSet) difference: (self intersection: aSet)
%
category: 'Python'
method: frozenset
union: aSet
	| newSet |
	newSet := self copy.
	newSet ___container addAll: aSet ___container.
	^newSet
%
set compile_env: 0
category: 'Smalltalk'
method: frozenset
__rand__: aSet

	^aSet intersection: self
%
category: 'Smalltalk'
method: frozenset
__ror__: aSet

	^aSet union: self
%
category: 'Smalltalk'
method: frozenset
__rsub__: aSet

	^aSet difference: self
%
category: 'Smalltalk'
method: frozenset
__rxor__: aSet

	^aSet symmetric_difference: self
%
category: 'Smalltalk'
method: frozenset
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

   aStream nextPutAll: self class name.
	aStream nextPut: $(.
	super printElementsOn: aStream.
	aStream nextPut: $).
%
