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
___modString: aUnicode7 parameters: anInteger

	"a string is the string to be formated and anInteger is the number of % that need an argument"
	|stringOutput indexHolder characterAfter conversions percentIndexes counter|

	anInteger < 1 ifTrue: [TypeError signal: 'TypeError: not all arguments converted during string formatting'].
	anInteger > 1 ifTrue: [TypeError signal: 'TypeError: not enough arguments for format string'].
	
	"toDo replace 1 %s with our string and perform formating on it"

	conversions := conversions := ({
				$d->[:object :string :index | TypeError signal: 'TypeError: %d format: a real number is required, not str'].
				$i->[:object :string :index | TypeError signal: 'TypeError: %i format: a real number is required, not str'].
				$o->[:object :string :index | TypeError signal: 'TypeError: %o format: a real number is required, not str'].
				$u->[:object :string :index | TypeError signal: 'TypeError: %u format: a real number is required, not str'].
				$x->[:object :string :index | TypeError signal: 'TypeError: %x format: a real number is required, not str'].
				$X->[:object :string :index | TypeError signal: 'TypeError: %X format: a real number is required, not str'].
				$e->[:object :string :index | TypeError signal: 'TypeError: %e format: a real number is required, not str'].
				$E->[:object :string :index | TypeError signal: 'TypeError: %i format: a real number is required, not str'].
				$f->[:object :string :index | TypeError signal: 'TypeError: %i format: a real number is required, not str'].
				$F->[:object :string :index | TypeError signal: 'TypeError: %i format: a real number is required, not str'].
				$g->[:object :string :index | TypeError signal: 'TypeError: must be real number, not str'].
				$G->[:object :string :index | TypeError signal: 'TypeError: must be real number, not str'].
				$c->
					[:object :string :index |
						(object __len__ ___value) = 1 ifFalse: [TypeError signal: 'TypeError: %c requires int or char'].
						
					].
				$r->[].
				$s->[].
				$a->[].
			} asDictionary).

	(aUnicode7 at: (aUnicode7 size)) = $% ifTrue: [ ValueError signal: 'ValueError: incomplete format'].

	percentIndexes := OrderedCollection new.
	
	counter := 1.
	stringOutput := aUnicode7 asString.

	[counter < stringOutput size] whileTrue: [
		((stringOutput at: counter) = $%)
			ifTrue: [
				((stringOutput at: (counter + 1)) = $%)
					ifTrue:[stringOutput removeFrom: counter to: counter.]
					ifFalse:[percentIndexes add: counter]
			].
		counter := counter + 1.	
	].

	counter := percentIndexes at: 1.
	[(stringOutput at: counter) isLetter] whileFalse: [
		counter := counter + 1.
	].

	(conversions
		at:characterAfter ifAbsent:[
			ValueError signal:
				'ValueError: unsupported format character ''',
				characterAfter asString,''' (0x', (characterAfter asciiValue printStringRadix: 16) ,') at ', (indexHolder + 1) asString.
		]
	) value: (value, stringOutput, indexHolder).


	^str ___value: stringOutput.
%
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
	|incrementor countPercents indexHolder|
	incrementor := 1.
	countPercents := 0.
	indexHolder := 0.
"	conversions := ({
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
			} asDictionary)."
	"count the number of % but if there are double %s it shouldn't count for the total"
	[incrementor <= (value size)] whileTrue: [
		(value at: incrementor) = $%
			ifTrue:[
				countPercents := countPercents + 1.
				incrementor := incrementor + 1.
				(value at: incrementor) = $%
					ifTrue:[ countPercents := countPercents - 1 ]
					ifFalse:[ incrementor := incrementor - 1 ].
			].
		incrementor := incrementor + 1.
	].

	

	"anObject class = tuple
		ifFalse:[

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
		]."

	^anObject ___modString: value parameters: countPercents.
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
