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
___modString: aString parameters: anOrderedCollection

	"a string is the string to be formated and anInteger is the number of % that need an argument"
	|stringOutput flags types resultString insertString offset tempSize|

	(anOrderedCollection size) < 1 ifTrue: [TypeError signal: 'TypeError: not all arguments converted during string formatting'].
	(anOrderedCollection size) > 1 ifTrue: [TypeError signal: 'TypeError: not enough arguments for format string'].
	
	"toDo replace 1 %s with our string and perform formating on it"
	flags := (#'#', #'0', #'-', #'+', #' ') asSet.
	types := (#'c', #'s', #'r', #'a') asSet.

	offset := 0.
	tempSize := aString size.
	resultString := aString.

	[(anOrderedCollection size) = 0] whileFalse: [
		|percentIndex padding flag width precision type counter|

		percentIndex := (anOrderedCollection first) + offset.
		counter := percentIndex + 1.
		flag := nil.
		width := ''.
		precision := ''.
		type := nil.
		
		"find the flags so they can be properly saved and skipped"
		(flags includes: (resultString at: counter)) ifTrue:[
			flag := resultString at: counter.
			counter := counter + 1.
		].
		
		"ensures that * result in an error because they require a second parameter"
		(resultString at: counter) = $* ifTrue:[ TypeError signal: 'TypeError: * wants int'].

		"saves the width component and if none exists preserves the empty string"
		[(resultString at: counter) isNumber] whileTrue: [
			width := width + (resultString at: counter).
			counter := counter + 1.
		].
		
		"covert to a number for later string length formating"
		(width = '') ifFalse: [width := width asNumber.].
		
		"if there is a . it indicates that the string will have a precision"
		(resultString at: counter) = $. ifTrue:[
			counter := counter + 1.

			"if the character is a * then fail because it needs another parameter"
			(resultString at: counter) = $* ifTrue:[ TypeError signal: 'TypeError: * wants int'].

			[(resultString at: counter) isNumber] whileTrue: [
				precision := precision + (resultString at: counter).
				counter := counter + 1.
			].
		].

		"covert to a number for later value length formating"
		(precision = '') ifFalse: [precision := precision asNumber.].

		(types includes: (resultString at: counter)) ifFalse: [
				"change to real error message(s)"
				ValueError signal:
					'ValueError: unsupported format character ''',
					(resultString at: counter) asString,''' (0x', ((resultString at: counter) asciiValue printStringRadix: 16),
					') at ', (percentIndex + 1) asString.
		].

		(((resultString at: counter) = $c) and: [value size > 1]) ifTrue:[
			TypeError signal: 'TypeError: %c requires int or char'
		].

		(((resultString at: counter) = $r) or:[(resultString at: counter) = $a])
			ifTrue:[
				insertString := self __repr__ value
			]
			ifFalse:[
				insertString := self __str__ value
			].
		(precision = '') ifFalse: [insertString := insertString copyFrom: 1 to: precision].
		(width = '') ifFalse: [
				padding := ''.
				1 to: (width - (insertString size)) do: [:i | padding := padding + ' '].
		].

		flag = $- ifTrue:[insertString := insertString + padding].
		flag = $+ ifTrue:[insertString := padding + insertString].

		resultString removeFrom: percentIndex to: counter.
		resultString insertAll: insertString at: percentIndex.

		anOrderedCollection removeAtIndex: 1.
		offset := (resultString size) - tempSize.
	].

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
	|incrementor indexHolder percentIndexes counter stringOutput|
	incrementor := 1.
	counter := 0.
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
	(value at: (value size)) = $% ifTrue: [ ValueError signal: 'ValueError: incomplete format'].

	percentIndexes := OrderedCollection new.
	
	counter := 1.
	stringOutput := value asString.

	[counter < stringOutput size] whileTrue: [
		((stringOutput at: counter) = $%)
			ifTrue: [
				((stringOutput at: (counter + 1)) = $%)
					ifTrue:[stringOutput removeFrom: counter to: counter.]
					ifFalse:[percentIndexes add: counter]
			].
		counter := counter + 1.	
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

	^anObject ___modString: stringOutput parameters: percentIndexes.
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
