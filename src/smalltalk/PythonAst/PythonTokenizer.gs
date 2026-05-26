! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonTokenizer
expectvalue /Class
doit
Object subclass: 'PythonTokenizer'
  instVarNames: #( source position line column
                    tokens indentStack parenDepth atLineStart)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PythonTokenizer comment:
'A lexer for Python source code.

Converts a Python source string into a sequence of PythonToken objects.
Handles indentation-based INDENT/DEDENT tokens, string literals,
numbers, operators, keywords, and comments.

Usage:
  PythonTokenizer tokenize: ''x = 1 + 2''

Hierarchy:
Object
  PythonTokenizer(source position line column tokens indentStack parenDepth atLineStart)
'
%

expectvalue /Class
doit
PythonTokenizer category: 'Grail-Parser'
%

! ===============================================================================
! PythonTokenizer - Lexer for Python source code
! ===============================================================================
! Converts a Python source string into a sequence of PythonToken objects.
! Handles indentation-based INDENT/DEDENT tokens, string literals
! (including triple-quoted and f-strings), numbers, operators, and keywords.
! ===============================================================================

! ------------------- Remove existing behavior from PythonTokenizer
removeallmethods PythonTokenizer
removeallclassmethods PythonTokenizer

set compile_env: 0

category: 'Grail-private'
classmethod: PythonTokenizer
keywords

	^#('False' 'None' 'True' 'and' 'as' 'assert' 'async' 'await'
	   'break' 'class' 'continue' 'def' 'del' 'elif' 'else' 'except'
	   'finally' 'for' 'from' 'global' 'if' 'import' 'in' 'is'
	   'lambda' 'nonlocal' 'not' 'or' 'pass' 'raise' 'return'
	   'try' 'while' 'with' 'yield')
%

category: 'Grail-instance creation'
classmethod: PythonTokenizer
on: aString

	^self basicNew
		source: aString;
		yourself
%

category: 'Grail-tokenizing'
classmethod: PythonTokenizer
tokenize: aString

	^(self on: aString) tokenize
%

category: 'Grail-private'
method: PythonTokenizer
addToken: aType value: aValue line: aLine column: aCol endLine: anEndLine endColumn: anEndCol

	tokens add: (PythonToken
		type: aType
		value: aValue
		line: aLine
		column: aCol
		endLine: anEndLine
		endColumn: anEndCol).
%

category: 'Grail-private'
method: PythonTokenizer
advance

	| char |
	char := source at: position.
	position := position + 1.
	char == Character lf ifTrue: [
		line := line + 1.
		column := 0.
	] ifFalse: [
		column := column + 1.
	].
	^char
%

category: 'Grail-private'
method: PythonTokenizer
atEnd

	^position > source size
%

category: 'Grail-private'
method: PythonTokenizer
currentChar

	^source at: position
%

category: 'Grail-tokenizing'
method: PythonTokenizer
handleIndentation: indent
	"Emit INDENT or DEDENT tokens based on the new indentation level."

	| currentIndent |
	currentIndent := indentStack last.
	indent > currentIndent ifTrue: [
		indentStack add: indent.
		self addToken: #INDENT value: '' line: line column: 0 endLine: line endColumn: indent.
	] ifFalse: [
		[indent < indentStack last] whileTrue: [
			indentStack removeLast.
			self addToken: #DEDENT value: '' line: line column: 0 endLine: line endColumn: indent.
		].
		indent ~= indentStack last ifTrue: [
			SyntaxError signal: 'unindent does not match any outer indentation level at line ' , line printString.
		].
	].
%

category: 'Grail-private'
method: PythonTokenizer
isDigit: aChar

	aChar ifNil: [^false].
	^aChar isDigit
%

category: 'Grail-private'
method: PythonTokenizer
isIdentifierPart: aChar

	aChar ifNil: [^false].
	^aChar isLetter or: [aChar isDigit or: [aChar == $_]]
%

category: 'Grail-private'
method: PythonTokenizer
isIdentifierStart: aChar

	aChar ifNil: [^false].
	^aChar isLetter or: [aChar == $_]
%

category: 'Grail-tokenizing'
method: PythonTokenizer
isStringStart
	"Check if current position starts a string literal."

	| char next third |
	char := self peek.
	char ifNil: [^false].

	"Direct quote"
	(char == $' or: [char == $"]) ifTrue: [^true].

	"String prefix followed by quote"
	next := self peekAt: 1.
	next ifNil: [^false].

	"Single-char prefix: r, b, f, u, R, B, F, U"
	((char == $r or: [char == $R or: [char == $b or: [char == $B or: [char == $f or: [char == $F or: [char == $u or: [char == $U]]]]]]]) and: [next == $' or: [next == $"]]) ifTrue: [^true].

	"Two-char prefix: rb, br, fr, rf (and case variants)"
	third := self peekAt: 2.
	third ifNil: [^false].
	(third == $' or: [third == $"]) ifTrue: [
		| pair |
		pair := (char asString , next asString) asLowercase.
		^(pair = 'rb' or: [pair = 'br' or: [pair = 'fr' or: [pair = 'rf']]])
	].
	^false
%

category: 'Grail-private'
method: PythonTokenizer
peek

	position > source size ifTrue: [^nil].
	^source at: position
%

category: 'Grail-private'
method: PythonTokenizer
peekAt: offset

	| pos |
	pos := position + offset.
	(pos > source size or: [pos < 1]) ifTrue: [^nil].
	^source at: pos
%

category: 'Grail-tokenizing'
method: PythonTokenizer
readIndentation
	"Read whitespace at the beginning of a line and return the indent level."

	| indent |
	indent := 0.
	[self atEnd not and: [(self peek == Character space) or: [self peek == Character tab]]] whileTrue: [
		self peek == Character tab
			ifTrue: [indent := (indent // 8 + 1) * 8]
			ifFalse: [indent := indent + 1].
		self advance.
	].
	^indent
%

category: 'Grail-tokenizing'
method: PythonTokenizer
skipComment
	"Skip a comment (from # to end of line)."

	[self atEnd not and: [self peek ~~ Character lf]] whileTrue: [
		self advance.
	].
%

category: 'Grail-tokenizing'
method: PythonTokenizer
skipNewline
	"Skip a newline character and emit NEWLINE token if not inside parens."

	self atEnd ifTrue: [
		parenDepth == 0 ifTrue: [
			self addToken: #NEWLINE value: '' line: line column: column endLine: line endColumn: column.
		].
		^self
	].
	self peek == Character lf ifTrue: [
		| startLine startCol |
		startLine := line.
		startCol := column.
		self advance.
		parenDepth == 0 ifTrue: [
			self addToken: #NEWLINE value: '' line: startLine column: startCol endLine: line endColumn: column.
		].
	].
%

category: 'Grail-accessors'
method: PythonTokenizer
source: aString

	source := aString.
	position := 1.
	line := 1.
	column := 0.
	tokens := Array new.
	indentStack := Array new.
	indentStack add: 0.
	parenDepth := 0.
	atLineStart := true.
%

category: 'Grail-private'
method: PythonTokenizer
sourceSize

	^source size
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenize
	"Main entry point: tokenize the entire source string.
	Returns an Array of PythonToken objects."

	[self atEnd] whileFalse: [
		self tokenizeLine.
	].
	"Emit DEDENT tokens for any remaining indentation"
	[indentStack size > 1] whileTrue: [
		indentStack removeLast.
		self addToken: #DEDENT value: '' line: line column: column endLine: line endColumn: column.
	].
	self addToken: #ENDMARKER value: '' line: line column: column endLine: line endColumn: column.
	^tokens
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeIdentifier
	"Tokenize an identifier or keyword."

	| startLine startCol writeStream name |
	startLine := line.
	startCol := column.
	writeStream := WriteStream on: String new.
	[self atEnd not and: [self isIdentifierPart: self peek]] whileTrue: [
		writeStream nextPut: self advance.
	].
	name := writeStream contents.
	(self class keywords includes: name)
		ifTrue: [self addToken: #KEYWORD value: name line: startLine column: startCol endLine: line endColumn: column]
		ifFalse: [self addToken: #NAME value: name line: startLine column: startCol endLine: line endColumn: column].
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeLine
	"Tokenize a single logical line."

	| indent startLine |
	startLine := line.

	"Handle blank lines and comments at line start"
	atLineStart ifTrue: [
		indent := self readIndentation.
		self peek ifNil: [^self].
		(self peek == Character lf) ifTrue: [
			self advance.
			atLineStart := true.
			^self
		].
		(self peek == $#) ifTrue: [
			self skipComment.
			self skipNewline.
			atLineStart := true.
			^self
		].
		"Emit INDENT/DEDENT tokens based on indentation change"
		parenDepth == 0 ifTrue: [
			self handleIndentation: indent.
		].
		atLineStart := false.
	].

	"Tokenize tokens on this line"
	[self atEnd not and: [self peek ~~ Character lf]] whileTrue: [
		self tokenizeOne.
	].

	"Handle the newline at end of line"
	self skipNewline.
	atLineStart := true.
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeNumber
	"Tokenize a numeric literal (int, float, hex, oct, bin, complex)."

	| startLine startCol start char writeStream isFloat |
	startLine := line.
	startCol := column.
	writeStream := WriteStream on: String new.
	isFloat := false.
	char := self peek.

	"Hex, octal, binary"
	(char == $0 and: [(self peekAt: 1) notNil]) ifTrue: [
		| next |
		next := self peekAt: 1.
		(next == $x or: [next == $X]) ifTrue: [
			writeStream nextPut: self advance; nextPut: self advance.
			[self atEnd not and: [self peek notNil and: ['0123456789abcdefABCDEF_' includes: self peek]]] whileTrue: [
				self peek == $_ ifFalse: [writeStream nextPut: self peek].
				self advance.
			].
			self addToken: #NUMBER value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
			^self
		].
		(next == $o or: [next == $O]) ifTrue: [
			writeStream nextPut: self advance; nextPut: self advance.
			[self atEnd not and: [self peek notNil and: ['01234567_' includes: self peek]]] whileTrue: [
				self peek == $_ ifFalse: [writeStream nextPut: self peek].
				self advance.
			].
			self addToken: #NUMBER value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
			^self
		].
		(next == $b or: [next == $B]) ifTrue: [
			writeStream nextPut: self advance; nextPut: self advance.
			[self atEnd not and: [self peek notNil and: ['01_' includes: self peek]]] whileTrue: [
				self peek == $_ ifFalse: [writeStream nextPut: self peek].
				self advance.
			].
			self addToken: #NUMBER value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
			^self
		].
	].

	"Decimal integer or float"
	[self atEnd not and: [self peek notNil and: [(self isDigit: self peek) or: [self peek == $_]]]] whileTrue: [
		self peek == $_ ifFalse: [writeStream nextPut: self peek].
		self advance.
	].

	"Decimal point"
	(self atEnd not and: [self peek == $.]) ifTrue: [
		(self peekAt: 1) notNil ifTrue: [
			(self isDigit: (self peekAt: 1)) ifTrue: [
				isFloat := true.
				writeStream nextPut: self advance.
				[self atEnd not and: [self peek notNil and: [(self isDigit: self peek) or: [self peek == $_]]]] whileTrue: [
					self peek == $_ ifFalse: [writeStream nextPut: self peek].
					self advance.
				].
			] ifFalse: [
				"Standalone dot after digits - check if it's really a dot operator"
				(self isIdentifierStart: (self peekAt: 1)) ifTrue: [
					"This is attr access, e.g. 123 .method - stop here"
				] ifFalse: [
					"Trailing dot, e.g. 1."
					isFloat := true.
					writeStream nextPut: self advance.
				].
			].
		] ifFalse: [
			"Dot at end of source"
			isFloat := true.
			writeStream nextPut: self advance.
		].
	].
	"Also handle case like .5 (dot first)"
	(writeStream contents isEmpty and: [self atEnd not and: [self peek == $.]]) ifTrue: [
		isFloat := true.
		writeStream nextPut: self advance.
		[self atEnd not and: [self peek notNil and: [(self isDigit: self peek) or: [self peek == $_]]]] whileTrue: [
			self peek == $_ ifFalse: [writeStream nextPut: self peek].
			self advance.
		].
	].

	"Exponent"
	(self atEnd not and: [self peek == $e or: [self peek == $E]]) ifTrue: [
		isFloat := true.
		writeStream nextPut: self advance.
		(self atEnd not and: [self peek == $+ or: [self peek == $-]]) ifTrue: [
			writeStream nextPut: self advance.
		].
		[self atEnd not and: [self peek notNil and: [(self isDigit: self peek) or: [self peek == $_]]]] whileTrue: [
			self peek == $_ ifFalse: [writeStream nextPut: self peek].
			self advance.
		].
	].

	"Complex suffix"
	(self atEnd not and: [self peek == $j or: [self peek == $J]]) ifTrue: [
		writeStream nextPut: self advance.
	].

	self addToken: #NUMBER value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeOne
	"Tokenize a single token from the current position."

	| char |
	"Skip whitespace (not newlines)"
	[self atEnd not and: [(self peek == Character space) or: [self peek == Character tab]]] whileTrue: [
		self advance.
	].
	self atEnd ifTrue: [^self].
	char := self peek.
	char == Character lf ifTrue: [^self].

	"Line continuation"
	char == $\ ifTrue: [
		(self peekAt: 1) == Character lf ifTrue: [
			self advance. "skip \"
			self advance. "skip newline"
			^self
		].
	].

	"Comment"
	char == $# ifTrue: [
		self skipComment.
		^self
	].

	"String literals (check for prefixes: r, b, f, u, rb, br, fr, rf)"
	(self isStringStart) ifTrue: [
		self tokenizeString.
		^self
	].

	"Numbers"
	(self isDigit: char) ifTrue: [
		self tokenizeNumber.
		^self
	].
	"Dot followed by digit is also a number"
	(char == $. and: [self isDigit: (self peekAt: 1)]) ifTrue: [
		self tokenizeNumber.
		^self
	].

	"Identifiers and keywords"
	(self isIdentifierStart: char) ifTrue: [
		self tokenizeIdentifier.
		^self
	].

	"Operators and delimiters"
	self tokenizeOperator.
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeOperator
	"Tokenize an operator or delimiter."

	| startLine startCol char next third |
	startLine := line.
	startCol := column.
	char := self advance.
	next := self peek.

	"Three-character operators"
	(next notNil and: [(self peekAt: 1) notNil]) ifTrue: [
		| three |
		three := char asString , next asString , (self peekAt: 1) asString.
		(three = '**=' or: [three = '//=' or: [three = '<<=' or: [three = '>>=' or: [three = '...']]]]) ifTrue: [
			self advance. self advance.
			self addToken: #OP value: three line: startLine column: startCol endLine: line endColumn: column.
			^self
		].
	].

	"Two-character operators"
	next notNil ifTrue: [
		| two |
		two := char asString , next asString.
		"``..'' is intentionally NOT in the two-char OP set even though
		earlier versions of this tokenizer treated it as one — Python
		has no such operator, and merging the two dots blocks relative
		imports like ``from .. import x'' (the parser counts single
		dots to compute the import level)."
		(two = '==' or: [two = '!=' or: [two = '<=' or: [two = '>=' or: [
		 two = '+=' or: [two = '-=' or: [two = '*=' or: [two = '/=' or: [
		 two = '%=' or: [two = '&=' or: [two = '|=' or: [two = '^=' or: [
		 two = '@=' or: [two = '->' or: [two = '//' or: [two = '**' or: [
		 two = '<<' or: [two = '>>' or: [two = ':=']]]]]]]]]]]]]]]]]]) ifTrue: [
			self advance.
			self addToken: #OP value: two line: startLine column: startCol endLine: line endColumn: column.
			^self
		].
	].

	"Update paren depth"
	(char == $( or: [char == $[ or: [char == ${]]) ifTrue: [
		parenDepth := parenDepth + 1.
	].
	(char == $) or: [char == $] or: [char == $}]]) ifTrue: [
		parenDepth := parenDepth - 1.
		parenDepth < 0 ifTrue: [parenDepth := 0].
	].

	"Single-character operator"
	self addToken: #OP value: char asString line: startLine column: startCol endLine: line endColumn: column.
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeString
	"Tokenize a string literal (handles prefixes, single/double/triple quotes, escapes)."

	| startLine startCol prefix quoteChar triple writeStream char isFString isRaw isBytes tokenType |
	startLine := line.
	startCol := column.
	prefix := ''.
	isFString := false.
	isRaw := false.
	isBytes := false.

	"Read prefix"
	[self peek notNil and: [(self peek == $' or: [self peek == $"]) not]] whileTrue: [
		| ch |
		ch := self advance.
		prefix := prefix , ch asString.
	].
	prefix asLowercase do: [:c |
		c == $f ifTrue: [isFString := true].
		c == $r ifTrue: [isRaw := true].
		c == $b ifTrue: [isBytes := true].
	].
	tokenType := isBytes
		ifTrue: [#BYTES]
		ifFalse: [isFString ifTrue: [#FSTRING] ifFalse: [#STRING]].

	"Read quote character"
	quoteChar := self advance.

	"Check for triple quote"
	triple := false.
	(self peek == quoteChar and: [(self peekAt: 1) == quoteChar]) ifTrue: [
		self advance.
		self advance.
		triple := true.
	].

	"Read string contents"
	writeStream := WriteStream on: Unicode7 new.
	[
		self atEnd ifTrue: [SyntaxError signal: 'unterminated string literal at line ' , startLine printString].
		char := self peek.
		triple ifTrue: [
			"Check for closing triple quote"
			(char == quoteChar and: [(self peekAt: 1) == quoteChar and: [(self peekAt: 2) == quoteChar]]) ifTrue: [
				self advance. self advance. self advance.
				self addToken: tokenType value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
				^self
			].
		] ifFalse: [
			char == quoteChar ifTrue: [
				self advance.
				self addToken: tokenType value: writeStream contents line: startLine column: startCol endLine: line endColumn: column.
				^self
			].
			char == Character lf ifTrue: [
				SyntaxError signal: 'EOL while scanning string literal at line ' , startLine printString.
			].
		].
		"Handle escape sequences"
		(char == $\ and: [isRaw not]) ifTrue: [
			| escaped |
			self advance.
			self atEnd ifTrue: [SyntaxError signal: 'unterminated string literal'].
			escaped := self advance.
			escaped == $n ifTrue: [writeStream nextPut: Character lf]
			ifFalse: [escaped == $t ifTrue: [writeStream nextPut: Character tab]
			ifFalse: [escaped == $r ifTrue: [writeStream nextPut: (Character codePoint: 13)]
			ifFalse: [escaped == $\ ifTrue: [writeStream nextPut: $\]
			ifFalse: [escaped == quoteChar ifTrue: [writeStream nextPut: quoteChar]
			ifFalse: [escaped == $a ifTrue: [writeStream nextPut: (Character codePoint: 7)]
			ifFalse: [escaped == $b ifTrue: [writeStream nextPut: (Character codePoint: 8)]
			ifFalse: [escaped == $f ifTrue: [writeStream nextPut: (Character codePoint: 12)]
			ifFalse: [escaped == $v ifTrue: [writeStream nextPut: (Character codePoint: 11)]
			ifFalse: [escaped == $0 ifTrue: [writeStream nextPut: (Character codePoint: 0)]
			ifFalse: [escaped == $x ifTrue: [
				| hex |
				hex := (self advance asString , self advance asString).
				writeStream nextPut: (Character codePoint: ('16r' , hex) asInteger).
			]
			ifFalse: [escaped == $u ifTrue: [
				| hex |
				hex := (self advance asString , self advance asString , self advance asString , self advance asString).
				writeStream nextPut: (Character codePoint: ('16r' , hex) asInteger).
			]
			ifFalse: [escaped == Character lf ifTrue: ["line continuation in string - skip"]
			ifFalse: [
				"Unknown escape - keep as-is"
				writeStream nextPut: $\; nextPut: escaped.
			]]]]]]]]]]]]].
		] ifFalse: [
			writeStream nextPut: self advance.
		].
		true
	] whileTrue.
%
