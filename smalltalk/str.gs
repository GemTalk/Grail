! ------------------- Remove existing behavior from str
removeAllMethods str
removeAllClassMethods str
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
	|countPercents indexHolder characterAfter conversions|
	countPercents := 0.
	indexHolder := 0.
	conversions := ({
				$d->[:object| object __floor__ ___value asString.].
				$i->[:object| object __floor__ ___value asString.].
				$o->[].
				$u->[].
				$x->[].
				$X->[].
				$e->[:object| object ___value asStringUsingFormat: #(0 6 true).].
				$E->[:object| (object ___value asStringUsingFormat: #(0 6 true)) asUppercase.].
				$f->[:object| (object ___value asDecimalFloat asStringUsingFormat: #(0 6 false)).].
				$F->[:object| (object ___value asDecimalFloat asStringUsingFormat: #(0 6 false)) asUppercase.].
				$g->[].
				$G->[].
				$c->[].
				$r->[].
				$s->[].
				$a->[].
			} asDictionary)
	"count the number of %"
	value do: [:element |
		element = $%
			ifTrue:[
				countPercents := countPercents + 1
			].
	].
	anObject class = tuple
		ifTrue:[
			"if it is a tuple then check that there are enough places to put each value in the tuple"
			
			countPercents > (anObject __len__)
				ifTrue: [
					TypeError signal: 'TypeError: not enough arguments for format string'
				].
			countPercents < (anObject __len__)
				ifTrue: [
					TypeError signal: 'TypeError: not all arguments converted during string formatting'
				].
			
		]
		ifFalse:[
			"if it is not tuple the number of arguments must be 1"
			countPercents > 1
				ifTrue: [
					TypeError signal: 'TypeError: not enough arguments for format string'
				].
			countPercents <= 0
				ifTrue: [
					TypeError signal: 'TypeError: not all arguments converted during string formatting'
				].
			indexHolder := value indexOf: $% startingAt: 0.
			characterAfter := value at: (indexHolder + 1).

			 (conversions
				at:characterAfter
				ifAbsent:[
					ValueError signal:
						'ValueError: unsupported format character ''',
						characterAfter asString,''' (0x', (characterAfter asciiValue printStringRadix: 16) ,') at ', (indexHolder + 1) asString.
				]
			) value: (anObject ___value).
		].
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
set compile_env: 0
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
