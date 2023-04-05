! ------------------- Remove existing behavior from FormatTag
removeAllMethods FormatTag
removeAllClassMethods FormatTag
! ------------------- Class methods for FormatTag
! ------------------- Instance methods for FormatTag
set compile_env: 0
category: 'other'
method: FormatTag
adjustWidth: aReadStream
	self halt.
%
category: 'other'
method: FormatTag
initializeFrom: aReadStream

	"aReadStream is at the character after a single %"
	self setFlag: aReadStream.
	self setWidth: aReadStream.
	self setPrecision: aReadStream.
	self setType: aReadStream.
	^self.
%
category: 'other'
method: FormatTag
numberForParameters: aReadStream
	"return a formated string based on hash, width, precision, and type"
	|returnString|
	self halt.
	^self adjustWidth: returnString.
%
category: 'other'
method: FormatTag
setFlag: aReadStream
		"Method comment"
	| flags |
	flags := (#'#', #'0', #'-', #'+', #' ') asSet.
	flag := ''.
	(flags includes: aReadStream peek) ifTrue:[
		flag := aReadStream next.
	].
%
category: 'other'
method: FormatTag
setPrecision: aReadStream

	
	aReadStream peek == $. ifTrue:[
		aReadStream next.
		precision := '0'.
		aReadStream peek == $* ifTrue:[
			precision := aReadStream next.
			^nil.
		].
		[aReadStream peek isNumber] whileTrue: [
			precision := precision + aReadStream next.
			
		].
		precision := precision asNumber.
	].
%
category: 'other'
method: FormatTag
setType: aReadStream
	aReadStream position isCharacter ifTrue:[]
%
category: 'other'
method: FormatTag
setWidth: aReadStream
		"Method comment"
	
	width := ''.
	aReadStream peek == $* ifTrue:[
		width := aReadStream next.
		^nil.
	].
	[aReadStream peek isNumber]
		whileTrue: [
			width := width + (aReadStream next).
		].
	width = '' ifFalse:[width := width asNumber].
%
category: 'other'
method: FormatTag
strForParameters: aReadStream
	"return a formated string based on hash, width, precision, and type"
	|returnString|
	self halt.
	^self adjustWidth: returnString.
%
category: 'other'
method: FormatTag
stringForParameters: aReadStream
	"return a formated string based on hash, width, precision, and type"
	|returnString|
	self halt.
	^self adjustWidth: returnString.
%
category: 'other'
method: FormatTag
tupleForParameters: aReadStream
	
	|insertString padding conversion|
	insertString := ''.
	width == $* ifTrue:[
		aReadStream peek class = int ifFalse:[
			TypeError signal: 'TypeError: * wants int'
		].
		width := aReadStream next ___value.
	].
	precision == $* ifTrue:[
		aReadStream peek class = int ifFalse:[
			TypeError signal: 'TypeError: * wants int'
		].
		precision := aReadStream next ___value.
	].

	insertString := conversion at: (aReadStream next class asString).

	(precision = '') ifFalse: [insertString := insertString copyFrom: 1 to: precision].
	(width = '') ifFalse: [
			padding := ''.
			1 to: (width - (insertString size)) do: [:i | padding := padding + ' '].
	].

	flag = $-
		ifTrue:[insertString := insertString + padding]
		ifFalse:[insertString := padding + insertString].
%
