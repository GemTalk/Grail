! ------------------- Remove existing behavior from dict
removeAllMethods dict
removeAllClassMethods dict
! ------------------- Class methods for dict
set compile_env: 0
category: 'Smalltalk'
classmethod: dict
___containerClass

	^Dictionary
%
category: 'Smalltalk'
classmethod: dict
___endChar
	^$}
%
category: 'Smalltalk'
classmethod: dict
___startChar
	^${
%
! ------------------- Instance methods for dict
set compile_env: 0
category: 'Python'
method: dict
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
method: dict
___modString: aString parameters: anOrderedCollection

	"a string is the string to be formated and anInteger is the number of % that need an argument"

	(anOrderedCollection size) < 1 ifTrue: [TypeError signal: 'TypeError: not all arguments converted during string formatting'].
	(anOrderedCollection size) > 1 ifTrue: [TypeError signal: 'TypeError: not enough arguments for format string'].
	
	"toDo find () and look up its contents as a string in the dictionary then look at the trailing
	character and use that to put it into the string."

	^str ___value: aString.
%
category: 'Python'
method: dict
__contains__: anElement

	^self ___container includesKey: anElement
%
category: 'Python'
method: dict
__delitem__: aKey
	^self ___container
		removeKey: aKey
		ifAbsent: [KeyError signal: aKey printString ].
%
category: 'Python'
method: dict
__ge__: otherCollection
	^(self __gt__: otherCollection) or: [self __eq__: otherCollection ]
%
category: 'Python'
method: dict
__getitem__: aKey
	^self ___container
		at: aKey
		ifAbsent: [KeyError signal: aKey printString ].
%
category: 'Python'
method: dict
__getslice__: aPyIntStart _: aPyIntEnd

	TypeError signal:  'unhashable type: slice'
%
category: 'Python'
method: dict
__gt__: otherDict
	"https://stackoverflow.com/questions/29916585/dictionary-gt-and-lt-implementation"
	#pyElaborate. "this is an aproximated implementation"

	^(self ___container size > otherDict ___container size) or: [
		 (self ___container size = otherDict ___container size) and: [
			self ___container keys do: [:key |
				(self ___container at: key) > (otherDict ___container at: key ifAbsent: [^true])
					ifTrue: [^true].
				(self ___container at: key) < (otherDict ___container at: key)
				   ifTrue: [^false]
			]
		].
		false
	]
%
category: 'Python'
method: dict
__ior__: aDict
	self ___container addAll: aDict ___container.
%
category: 'Python'
method: dict
__le__: otherCollection
	^(self __gt__: otherCollection) not
%
category: 'Python'
method: dict
__lt__: otherCollection
	^(self __gt__: otherCollection) not and: [self __ne__: otherCollection]
%
category: 'Python'
method: dict
__ne__: otherCollection
	^(self __eq__: otherCollection) __not__
%
category: 'Python'
method: dict
__or__: aDict
	^self copy __ior__: aDict
%
category: 'Python'
method: dict
__ror__: aDict
   ^aDict __or__: self
%
category: 'Python'
method: dict
__setitem__: aKey _: aValue
	^self ___container
		at: aKey
		put: aValue.
%
category: 'Python'
method: dict
clear

	^self ___container removeAllKeys: self ___container keys
%
category: 'Python'
method: dict
copy

	^self class ___value: container copy
%
category: 'Python'
method: dict
get: aKey
	^self __getitem__: aKey
%
category: 'Python'
method: dict
items

	| s |
	s := OrderedCollection new.
	container keysAndValuesDo: [:eachKey :eachValue |
		s add: (tuple ___value: (Array with: eachKey with: eachValue)).
	].
	#pyTodo "We should actually be returning dict_items".
	^frozenset ___value: s
%
category: 'Python'
method: dict
keys

	^frozenset ___value: container keys
%
category: 'Python'
method: dict
pop: aKey
	^self __delitem__: aKey.
%
category: 'Python'
method: dict
update: anObject
	"update the dictionary with the new key, value pairs in anObject,
		this can be done with another dictionary or nested data structures"
	| index KeyAndValue|
	anObject class == dict
		ifTrue:[
			anObject ___container keysAndValuesDo: [:key :val | self ___container at: key put: val].
		]
		ifFalse: [
			anObject __len__ ___value == 0 ifFalse:[
				anObject class == str ifTrue: [
					ValueError signal: 'ValueError: dictionary update sequence element #0 has length 1; 2 is required'.
				].
				index := 0.
				KeyAndValue := OrderedCollection new.
				anObject ___container do: [ :each |
					each __len__ ___value == 2 ifFalse: [
						ValueError signal:
							'TypeError: dictionary update sequence element #',
							index asString,
							' has a length ',
							each __len__ ___value asString, 
							'; 2 is required'.
					].
					each class == str
						ifTrue: [
							each ___value do: [:elem | KeyAndValue add: (str ___value: elem asString) ].
						]
						ifFalse: [
							each ___container do: [:elem | KeyAndValue add: elem].
							
						].
					self ___container add: ((KeyAndValue at: 1) -> (KeyAndValue at: 2))
				].
			].
		].
%
category: 'Python'
method: dict
values

	^frozenset ___value: container values
%
set compile_env: 0
category: 'Smalltalk'
method: dict
printElementsOn: aStream
	"The original code used #skip:, but some streams do not support that,
	 and we don't really need it."

	aStream nextPut: self class ___startChar.
	self ___container keys do: [:key | aStream print: key; nextPut: $:; space; print: (self ___container at: key)] separatedBy: [aStream nextPutAll: ', '].
	aStream nextPut: self class ___endChar.
%
