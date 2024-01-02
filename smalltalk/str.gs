! ------------------- Remove existing behavior from str
expectvalue /Metaclass3
doit
str removeAllMethods.
str class removeAllMethods.
%
! ------------------- Class methods for str
set compile_env: 0
category: 'other'
classmethod: str
___value: aString

	^self basicNew
		___value: aString;
		yourself
%
! ------------------- Instance methods for str
set compile_env: 0
category: 'Python'
method: str
__add__: pythonObject
	
	pythonObject class ~= str ifTrue: [ TypeError signal: 'must a string, not ', pythonObject class name ].

	^str ___value: value + pythonObject ___value
%
category: 'Python'
method: str
__bool__

	^bool ___value: value ~= ''
%
category: 'Python'
method: str
__contains__: aPyStr

	^bool ___value: (value includesString: aPyStr ___value)
%
category: 'Python'
method: str
__eq__: anObject

	^bool ___value: ((anObject isKindOf: str) and: [value = anObject ___value])
%
category: 'Python'
method: str
__float__
	
	^float ___value: self ___value asNumber.
%
category: 'Python'
method: str
__ge__: other

	(1 to: value size) do: [ :i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue > otherValue ifTrue: [
			^true
		] ifFalse: [
			myValue < otherValue ifTrue: [
				^false
			].
		].
	].

	^true
%
category: 'Python'
method: str
__getitem__: pyInt

	^str ___value: (value at: pyInt ___value + 1) asString.
%
category: 'Python'
method: str
__getnewargs__

	" Not well-documented. Implementation based on what is output from Python."

	^tuple ___value: { str ___value: value. }
%
category: 'Python'
method: str
__getslice__: aPyIntStart _: aPyIntEnd

	^self class ___value: (self ___getslice: aPyIntStart _: aPyIntEnd)
%
category: 'Python'
method: str
__gt__: other

	(1 to: value size) do: [ :i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue > otherValue ifTrue: [
			^true
		] ifFalse: [
			myValue < otherValue ifTrue: [
				^false
			].
		].
	].

	^false
%
category: 'Python'
method: str
__hash__

	^value hash
%
category: 'Python'
method: str
__init__: aString

	value := aString.
%
category: 'Python'
method: str
__le__: other

	(1 to: value size) do: [ :i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue < otherValue ifTrue: [
			^true
		] ifFalse: [
			myValue > otherValue ifTrue: [
				^false
			].
		].
	].

	^true
%
category: 'Python'
method: str
__len__

	^int ___value: value size
%
category: 'Python'
method: str
__lt__: other

	(1 to: value size) do: [ :i |
		| myValue otherValue |
		myValue := (value at: i) asciiValue.
		otherValue := (other ___value at: i) asciiValue.
		myValue < otherValue ifTrue: [
			^true
		] ifFalse: [
			myValue < otherValue ifTrue: [
				^false
			].
		].
	].

	^false
%
category: 'Python'
method: str
__mod__: anObject
	|stringOutput|

	stringOutput := value asString.

	^str ___value: (anObject ___modString: stringOutput).
%
category: 'Python'
method: str
__mul__: pyInt

	| stream |
	stream := WriteStream on: String new.

	(1 to: pyInt ___value) do: [:_|
		stream nextPutAll: value.
	].

	^str ___value: stream contents
%
category: 'Python'
method: str
__ne__: anObject

	^bool ___value: ((anObject isKindOf: str) and: [value = anObject ___value]) not
%
category: 'Python'
method: str
__repr__
	
	^str ___value: self ___value printString
%
category: 'Python'
method: str
__rmod__: any

	^any __mod__: self
%
category: 'Python'
method: str
__str__
	
	^self.
%
category: 'Python'
method: str
capitalize

	| stream |
	
	stream := WriteStream on: String new.
	stream nextPut: (value at: 1) asUppercase.
	(value copyFrom: 2 to: value size) do: [ :elem | 
		stream nextPut: elem asLowercase.
	].

	^str ___value: stream contents.
%
category: 'Python'
method: str
hash

	^value hash
%
category: 'Python'
method: str
tagFrom: aReadStream

	^FormatTag new initializeFrom: aReadStream.
%
set compile_env: 0
category: 'Smalltalk'
method: str
___convertWithFlags: aSet precision: anObject andType: aCharacter

	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	|invalidTypes return|

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

	(invalidTypes includes: aCharacter) ifTrue:[
		(invalidTypes at: aCharacter) value.
	].

	return := value.
	(aCharacter == $r or:[aCharacter == $a])
		ifTrue:[
			return := self __repr__ ___value
		].
	
	((aCharacter == $c) and:[ return size > 1]) ifTrue:[
		TypeError signal: 'TypeError: %c requires int or char'
	].

	(anObject ~= '' and: [anObject < (return size)]) ifTrue:[ return := return copyFrom: 1 to: anObject].
	^return
%
category: 'Smalltalk'
method: str
___getslice: aPyIntStart _: aPyIntEnd

	| subset x y |
	x := aPyIntStart ___value.
	y := aPyIntEnd ___value.

	x < 0 ifTrue: [
		x := value size + x.
	].

	y < 0 ifTrue: [
		y := value size + y.
	].

	subset := self ___value copy.
	(y < subset size) ifTrue: [
		subset removeFrom: y + 1 to: subset size.
	].
	x > 0 ifTrue: [
		subset removeFrom: 1 to: x.
	].
	^subset
%
category: 'Smalltalk'
method: str
___string

	^value
%
category: 'Smalltalk'
method: str
___value

	^value
%
category: 'Smalltalk'
method: str
___value: aString

	value := aString.
%
category: 'Smalltalk'
method: str
printOn: aStream

	aStream
		nextPutAll: 'str(';
		print: value;
		nextPut: $);
		yourself.
%
