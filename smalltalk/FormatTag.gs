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
	
	|insertString padding|
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

	insertString := aReadStream next ___convertWithFlags: flags precision: precision andType: type.

	(width = '') ifFalse: [
			padding := ''.
			1 to: (width - (insertString size)) do: [:i | padding := padding + ' '].
	].

	(flags includes: $-)
		ifTrue:[insertString := insertString + padding]
		ifFalse:[insertString := padding + insertString].
	^insertString
%
