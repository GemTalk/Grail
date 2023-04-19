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
	aReadStream peek == $% ifTrue:[
		^'%'.
	].
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
	| flagSet |
	flagSet := (#'#', #'0', #'-', #'+', #' ') asSet.
	flags := Set new.
	[flagSet includes: aReadStream peek] whileTrue:[
		flags add: aReadStream next.
	].
%
category: 'other'
method: FormatTag
setPrecision: aReadStream

	precision := ''.
	aReadStream peek == $. ifTrue:[
		aReadStream next.
		aReadStream peek == $* ifTrue:[
			precision := aReadStream next.
			^nil.
		].
		[aReadStream peek isNumeric] whileTrue: [
			precision := precision + aReadStream next.
			
		].
		precision := precision asNumber.
	].
%
category: 'other'
method: FormatTag
setType: aReadStream
	|validTypes|

	aReadStream peek isAlphabetic
		ifTrue:[type := aReadStream next]
		ifFalse:[ValueError signal: 'ValueError: incomplete format'].

	validTypes := {$d. $i. $u. $x. $X. $o. $f. $F. $e. $E. $g. $G. $c. $s. $r. $a} asSet.
	
	(validTypes includes: type) ifFalse:[
		ValueError signal:
			'ValueError: unsupported format character ''',
			type asString,''' (0x', (type asciiValue printStringRadix: 16) ,
			') at ', (aReadStream position + 1) asString.
	].
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
	[aReadStream peek isNumeric]
		whileTrue: [
			width := width + (aReadStream next).
		].
	width = '' ifFalse:[width := width asNumber].
%
category: 'other'
method: FormatTag
tupleForParameters: aReadStream
	
	|insertString padding numClassHolder displacement|
	insertString := ''.
	"stars indicate that a number is required to specify that value"
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
	numClassHolder := aReadStream peek class.

	"convert the next value in the ReadStream to a string matching its type converter"
	insertString := aReadStream next ___convertWithFlags: flags precision: precision andType: type.

	padding := ''.
	(width = '') ifFalse: [
		1 to: (width - (insertString size)) do: [:i | padding := padding + ' '].

	].
	
	
	(flags includes: $-)
		ifTrue: [ ^insertString + padding ].

	"if the flag does not have a - but does have 0 then the padding must be all 0s and it
	must happen after any signs or numeric bases."
	((flags includes: $0) and:[ (numClassHolder = int) or: [(numClassHolder = float)]])
		ifFalse:[
			^padding + insertString
		].
	displacement := 0.
	padding := ''.

	1 to: (width - (insertString size)) do: [:i | padding := padding + '0'].

	"adding a displacement do determin how far into the string you must go
	go get to the first actual number."
	({Character space. $-. $+} includes: insertString first)
		ifTrue:[ displacement := displacement + 1].

	(({$x. $X. $o} includes: type) and:[flags includes: $#])
		ifTrue:[ displacement := displacement + 2].

	^((insertString copyFrom: 1 to: displacement) +
		padding +
		(insertString copyFrom: displacement +1 to: insertString size))
%
