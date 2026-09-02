! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonTokenizer
expectvalue /Class
doit
Object subclass: 'PythonTokenizer'
  instVarNames: #( source position line tokens indentStack parenDepth atLineStart sourceSize openBrackets )
  classVars: #( Lf Tab NameToCodepointDict KeywordDict KeywordSet )
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
'
%

expectvalue /Class
doit
PythonTokenizer category: 'Grail-Parser'
%
doit
PythonTokenizer _addInvariantClassVar: #Lf value: Character lf ;
                _addInvariantClassVar: #Tab value: Character tab .
true
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
^ #( 'and' 'as' 'assert' 'async' 'await' 'break' 'class' 'continue' 'def' 'del' 
     'elif' 'else' 'except' 'False' 'finally' 'for' 'from' 'global' 'if' 'import'
     'in' 'is' 'lambda' 'None' 'nonlocal' 'not' 'or' 'pass' 'raise' 'return' 'True'
      'try' 'while' 'with' 'yield')
%
doit
| dict |
dict := StringKeyValueDictionary new .
PythonTokenizer keywords do:[:aWord |
  dict at: aWord put: 1 .
].
PythonTokenizer _addInvariantClassVar: #KeywordDict value: dict .
true
%

category: 'Grail-tokenizing'
method: PythonTokenizer
isKeyword: aString
  ^ (KeywordDict at: aString otherwise: nil) ~~ nil 
%

category: 'Grail-instance creation'
classmethod: PythonTokenizer
on: aString

	^self basicNew
		source: aString;
		yourself
%

category: 'Grail-tokenizing'
method: PythonTokenizer
___unicodeNameToCodePoint___: aName
	"Code point for a \N{NAME} escape, or nil when unknown.  A curated
	table of the names that appear in real code and in CPython's test
	suite -- Grail has no unicodedata name database.  Callers raise
	SyntaxError on nil, so an unsupported name fails loudly instead of
	silently corrupting the literal; extend the table as needed."

	| dict |
  dict := NameToCodepointDict ifNil:[ | t |
	  t := StringKeyValueDictionary new.
		t at: 'NULL' put: 16r0.
		t at: 'NO-BREAK SPACE' put: 16rA0.
		t at: 'NARROW NO-BREAK SPACE' put: 16r202F.
		t at: 'ZERO WIDTH SPACE' put: 16r200B.
		t at: 'ZERO WIDTH NO-BREAK SPACE' put: 16rFEFF.
		t at: 'EN SPACE' put: 16r2002.
		t at: 'EM SPACE' put: 16r2003.
		t at: 'THIN SPACE' put: 16r2009.
		t at: 'HAIR SPACE' put: 16r200A.
		t at: 'EN DASH' put: 16r2013.
		t at: 'EM DASH' put: 16r2014.
		t at: 'HORIZONTAL ELLIPSIS' put: 16r2026.
		t at: 'BULLET' put: 16r2022.
		t at: 'LINE SEPARATOR' put: 16r2028.
		t at: 'PARAGRAPH SEPARATOR' put: 16r2029.
		t at: 'LEFT SINGLE QUOTATION MARK' put: 16r2018.
		t at: 'RIGHT SINGLE QUOTATION MARK' put: 16r2019.
		t at: 'LEFT DOUBLE QUOTATION MARK' put: 16r201C.
		t at: 'RIGHT DOUBLE QUOTATION MARK' put: 16r201D.
		t at: 'DEGREE SIGN' put: 16rB0.
		t at: 'MICRO SIGN' put: 16rB5.
		t at: 'MULTIPLICATION SIGN' put: 16rD7.
		t at: 'LATIN CAPITAL LETTER A WITH DIAERESIS' put: 16rC4.
		t at: 'LATIN CAPITAL LETTER O WITH DIAERESIS' put: 16rD6.
		t at: 'LATIN CAPITAL LETTER U WITH DIAERESIS' put: 16rDC.
		t at: 'LATIN SMALL LETTER A WITH DIAERESIS' put: 16rE4.
		t at: 'LATIN SMALL LETTER O WITH DIAERESIS' put: 16rF6.
		t at: 'LATIN SMALL LETTER U WITH DIAERESIS' put: 16rFC.
		t at: 'LATIN SMALL LETTER SHARP S' put: 16rDF.
		t at: 'GREEK SMALL LETTER ALPHA' put: 16r3B1.
		t at: 'GREEK SMALL LETTER PI' put: 16r3C0.
		t at: 'REPLACEMENT CHARACTER' put: 16rFFFD.
		t at: 'SNOWMAN' put: 16r2603.
    NameToCodepointDict := t .
  ].
	^ dict at: aName otherwise: nil
%

category: 'Grail-tokenizing'
classmethod: PythonTokenizer
translateNewlines: aString
	"Universal newline translation: CRLF and lone CR both become LF.

	This is CPython's ``translate_newlines'' (Parser/tokenizer.c), which runs
	while DECODING the source, before a single token is scanned -- so it
	applies to the whole text, STRING LITERALS INCLUDED.  In CPython, a
	triple-quoted literal spanning a CRLF line break holds a bare LF, and
	this method reproduces that.

	An ESCAPED carriage return in the source is two characters (backslash,
	then r), not a CR byte, so a raw-character replacement leaves it alone --
	which is what CPython does too.

	Without this, a .py file written on Windows fails to tokenize at all: the
	CR is not whitespace, not a newline, and not an identifier character, so
	it reaches checkSimpleStatementTerminator: and raises a SyntaxError that
	names no line.  Real distributions ship this way -- 29 of the 32 files in
	the ``kaggle'' sdist are CRLF -- and asking a caller to convert the files
	first is not an answer.

	Cost when there is no CR, the overwhelmingly common case, is one indexOf:
	over the source and no allocation; a file that DOES carry CRs pays two
	copies, once."

	| cr crlf lf |
	cr := Character cr.
	(aString indexOf: cr) == 0 ifTrue: [^ aString].
	lf := String with: Character lf.
	crlf := (String with: cr) , lf.
	^ ((aString copyReplaceAll: crlf with: lf)
		copyReplaceAll: (String with: cr) with: lf)
%

classmethod: PythonTokenizer
tokenize: aString

	^(self on: aString) tokenize
%

category: 'Grail-private'
method: PythonTokenizer
addToken: aType value: aValue line: aLine position: aPos 
	"``position'' has already been advanced past the token at every call site
	that scans one, so its last character is at position - 1.  The zero-width
	markers (INDENT / DEDENT / NEWLINE / ENDMARKER) pass the CURRENT position as
	their start, and for those the max: keeps the end from preceding it."

	tokens add: ((PythonToken
		type: aType
		value: aValue
		line: aLine
		position: aPos)
			endPosition: ((position - 1) max: aPos);
			endLine: (line max: aLine);
			yourself).
%

category: 'Grail-private'
method: PythonTokenizer
advance
	| char pos |
	char := source atOrNil: (pos := position) .
  char ifNotNil:[ 
	  position := pos + 1.
	  char == Lf ifTrue: [
		  line := line + 1.
    ].
  ].
	^char
%

category: 'Grail-private'
method: PythonTokenizer
atEnd
	^ position > sourceSize 
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
		self addToken: #INDENT value: '' line: line position: position .
	] ifFalse: [
		[indent < indentStack last] whileTrue: [
			indentStack removeLast.
			self addToken: #DEDENT value: '' line: line position: position .
		].
		indent ~= indentStack last ifTrue: [
			"An IndentationError, not a bare SyntaxError, and located.  CPython
			 reports this AT END OF LINE -- offset 10 for a nine-character line --
			 so the caret sits after the statement rather than on the whitespace
			 that was wrong, and end_offset is -1, which the renderer normalises to
			 one caret.  The line number used to be pasted into the MESSAGE, which
			 is why the error carried no location at all."
			PythonParser ___signalLocated___: IndentationError
				message: 'unindent does not match any outer indentation level'
				in: source
				at: (PythonParser ___endOfLinePositionIn___: source at: position)
				endOffset: -1.
		].
	].
%

category: 'Grail-private'
method: PythonTokenizer
___dotStartsNumberTail___
	"After digits and a dot, decide whether the identifier-looking char that
	follows the dot actually CONTINUES the number literal rather than starting an
	attribute name.  Two cases, both valid Python:

	  * ``j''/``J''      -- the imaginary suffix: ``0.j'' is the complex 0j;
	  * ``e''/``E'' + digits (optionally signed) -- an exponent: ``1.e+300''.

	Without this, ``0.j'' parsed as ``0 . j'' (``SmallInteger object has no
	attribute 'j''') and ``1.e+300'' as ``0 . e'' -- while ``1.5j'', ``.01j'' and
	``1e3j'' all worked, because only the TRAILING-DOT form reaches here.

	The exponent case REQUIRES the digits, so an attribute read is never stolen:
	``0.encode'' keeps its old (syntax-error) tokenisation, and the common
	``0 .bit_length()'' spelling never reaches this branch at all -- whitespace
	ends the number before the dot is examined."

	| c1 c2 |
	c1 := self peekAt: 1.
	c1 ifNil: [^false].
	(c1 == $j or: [c1 == $J]) ifTrue: [^true].
	(c1 == $e or: [c1 == $E]) ifFalse: [^false].
	c2 := self peekAt: 2.
	c2 ifNil: [^false].
	(self isDigit: c2) ifTrue: [^true].
	(c2 == $+ or: [c2 == $-]) ifFalse: [^false].
	^(self peekAt: 3) notNil and: [self isDigit: (self peekAt: 3)]
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
	^ source atOrNil: position
%

category: 'Grail-private'
method: PythonTokenizer
peekAt: offset
  ^ source atOrNil: (position + offset) 
%

category: 'Grail-tokenizing'
method: PythonTokenizer
readIndentation
	"Read whitespace at the beginning of a line and return the indent level."

	| indent ch |
	indent := 0.
	[ ch := self peek . ch == $ or: [ ch == Tab ] ] whileTrue: [
		ch == Tab
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

	[self atEnd not and: [self peek ~~ Lf ]] whileTrue: [
		self advance.
	].
%

category: 'Grail-tokenizing'
method: PythonTokenizer
skipNewline
	"Skip a newline character and emit NEWLINE token if not inside parens."

	self atEnd ifTrue: [
		parenDepth == 0 ifTrue: [
			self addToken: #NEWLINE value: '' line: line position: position .
		].
		^self
	].
	self peek == Lf ifTrue: [
		| startLine startPos |
		startLine := line.
		startPos := position .
		self advance.
		parenDepth == 0 ifTrue: [
			self addToken: #NEWLINE value: '' line: startLine position: startPos .
		].
	].
%

category: 'Grail-accessors'
method: PythonTokenizer
source: aString

	source := self class translateNewlines: aString.
  sourceSize := source size .
	"``Character lf'' is a real message send, not a literal, and ``advance''
	  tests it once per SOURCE CHARACTER of every module Grail compiles -- it
	  came to ~2-4% of the whole SUnit suite's samples, together with the same
	  constant in PrettyWriteStream>>___atLineStart.  Using class variable Lf ."
	position := 1.
	line := 1.
	tokens := { } .
	indentStack := { 0 } .
	parenDepth := 0.
	"Positions of the brackets still open, innermost last, so an unterminated
	 one can be reported AT ITSELF rather than at end of input."
	openBrackets := OrderedCollection new.
	atLineStart := true.
%

category: 'Grail-private'
method: PythonTokenizer
sourceSize

	^ sourceSize
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
		self addToken: #DEDENT value: '' line: line position: position .
	].
	"AN UNCLOSED BRACKET IS AN ERROR, AND IT IS REPORTED AT THE BRACKET.
	 Grail used to tokenize ``blech  (  '' happily and leave the parser to fail on
	 the ENDMARKER, which put the caret at END OF INPUT -- CPython points at the
	 ``('' that was never closed, which is the only position that tells you where
	 to look.  The innermost still-open bracket is the one CPython names."
	openBrackets isEmpty ifFalse: [
		| entry |
		entry := openBrackets last.
		PythonParser ___signalUnclosedBracket___: (entry at: 1)
			in: source
			at: (entry at: 2)].
	self addToken: #ENDMARKER value: '' line: line position: position .
	^tokens
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeIdentifier
	"Tokenize an identifier or keyword."

	| startLine startPos name |
	startLine := line.
	startPos := position .
	name := Unicode7 new.
	[self atEnd not and: [self isIdentifierPart: self peek]] whileTrue: [
		name add: self advance.
	].
	(self isKeyword: name)
		ifTrue: [ self addToken: #KEYWORD value: name line: startLine position: startPos ]
		ifFalse: [self addToken: #NAME value: name line: startLine position: startPos ].
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeLine
	"Tokenize a single logical line."

	| indent startLine ch |
	startLine := line.
	"Handle blank lines and comments at line start"
	atLineStart ifTrue: [
		indent := self readIndentation.
		(ch := self peek) ifNil: [^self].
		ch == Lf ifTrue: [
			self advance.
			atLineStart := true.
			^self
		].
		ch == $# ifTrue: [
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
	[ ch := self peek . ch notNil and: [ ch ~~ Lf] ] whileTrue: [
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

	| startLine startPos str isFloat ch next |
	startLine := line.
	startPos := position .
	str := Unicode7 new.
	isFloat := false.
	ch := self peek.

	"Hex, octal, binary"
	(ch == $0 and: [(next := self peekAt: 1) notNil]) ifTrue: [
		(next == $x or: [next == $X]) ifTrue: [
			str add: self advance; add: self advance.
			[ ch := self peek.  ch notNil and: ['0123456789abcdefABCDEF_' includesValue: ch ]] whileTrue: [
				ch == $_ ifFalse: [ str add: ch ].
				self advance.
			].
			self addToken: #NUMBER value: str line: startLine position: startPos .
			^self
		].
		(next == $o or: [next == $O]) ifTrue: [
			str add: self advance; add: self advance.
			[ ch := self peek .  ch notNil and: ['01234567_' includesValue: ch ]] whileTrue: [
				ch == $_ ifFalse: [ str add: ch ].
				self advance.
			].
			self addToken: #NUMBER value: str line: startLine position: startPos .
			^self
		].
		(next == $b or: [next == $B]) ifTrue: [
			str add: self advance; add: self advance.
			[ ch := self peek .  ch notNil and: ['01_' includesValue: ch ]] whileTrue: [
				ch == $_ ifFalse: [ str add: ch ].
				self advance.
			].
			self addToken: #NUMBER value: str line: startLine position: startPos .
			^self
		].
	].

	"Decimal integer or float"
	[ ch := self peek .  ch notNil and: [(self isDigit: ch ) or: [ch == $_]]] whileTrue: [
		ch == $_ ifFalse: [ str add: ch ].
		self advance.
	].

	"Decimal point"
  ch := self peek  .
  ch == $.  ifTrue: [ 
		next := self peekAt: 1.
		next ifNotNil: [
			(self isDigit: next) ifTrue: [
				isFloat := true.
				str add: self advance.
				[ ch := self peek.  ch notNil and: [(self isDigit: ch ) or: [ch == $_]]] whileTrue: [
					ch == $_ ifFalse: [ str  add: ch ].
					self advance.
				].
			] ifFalse: [
				"Standalone dot after digits - check if it's really a dot operator.
				``j''/``J'' is the exception: it is the IMAGINARY suffix, not an
				attribute, so ``0.j'' is the complex literal 0j (CPython reads the
				fraction, then an optional exponent, then an optional j).  Treating
				it as attribute access made ``0.j'' parse as ``0 . j'' and raise
				``SmallInteger object has no attribute 'j''' -- while ``1.5j'',
				``.01j'' and ``1e3j'' all worked, because only the trailing-dot form
				reaches this branch (test_format test_negative_zero uses 0.j/-0.j)."
				((self isIdentifierStart: next )
					and: [(self ___dotStartsNumberTail___) not])
					ifTrue: [
						"This is attr access, e.g. 123 .method - stop here"
					] ifFalse: [
						"Trailing dot, e.g. 1. -- or the dot of 0.j / 1.e+300"
						isFloat := true.
						str add: self advance.
					].
			].
		] ifNil: [
			"Dot at end of source"
			isFloat := true.
			str add: self advance.
		].
	].
	"Also handle case like .5 (dot first)"
	(str size == 0 and: [ self peek == $. ]) ifTrue: [
		isFloat := true.
		str add: self advance.
		[ ch := self peek .
      ch notNil and: [(self isDigit: ch ) or: [ ch == $_]]] whileTrue: [
			ch == $_ ifFalse: [ str add: ch ].
			self advance.
		].
	].

	"Exponent"
  ch := self peek .
	(ch == $e or: [ ch == $E ]) ifTrue: [
		isFloat := true.
		str add: self advance.
    ch := self peek .
		(ch == $+ or: [ ch == $- ]) ifTrue: [
			str add: self advance.
		].
		[ ch := self peek .
      ch notNil and: [(self isDigit: ch ) or: [ ch == $_]]] whileTrue: [
			ch == $_ ifFalse: [ str add: ch ].
			self advance.
		].
	].

	"Complex suffix"
  ch := self peek .
	(ch == $j or: [ ch == $J ]) ifTrue: [
		str add: self advance.
	].
	self addToken: #NUMBER value: str line: startLine position: startPos .
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeOne
	"Tokenize a single token from the current position."

	| char |
	"Skip whitespace (not newlines)"
	[self atEnd not and: [(self peek == Character space) or: [self peek == Tab]]] whileTrue: [
		self advance.
	].
	self atEnd ifTrue: [^self].
	char := self peek.
	char == Lf ifTrue: [^self].

	"Line continuation"
	char == $\ ifTrue: [
		(self peekAt: 1) == Lf ifTrue: [
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

	| startLine startPos char next third |
	startLine := line.
	startPos := position .
	char := self advance.
	next := self peek.

	"Three-character operators  **= //= <<= >>= ... "
  ( '*/<>.' includesValue: char) ifTrue:[
    next == char ifTrue:[
      third := self peekAt: 1 .
      (third == $=  or:[  third == $. and:[ char == $. ]]) ifTrue:[
		    | three |
		    (three := Unicode7 new) add: char; add: next; add: third .
			  self advance ; advance.
			  self addToken: #OP value: three line: startLine position: startPos .
			  ^self
		  ].
	  ].
  ].
	"Two-character operators"
	next notNil ifTrue: [
		| two |
		"``..'' is intentionally NOT in the two-char OP set even though
		  earlier versions of this tokenizer treated it as one — Python
		  has no such operator, and merging the two dots blocks relative
		  imports like ``from .. import x'' (the parser counts single
		  dots to compute the import level)."
    next == char ifTrue:[
       ('=/*<>' includesValue: char) ifTrue:[  " == // **  << >> "
         (two := Unicode7 new) add: char; add: next . 
		     self advance.
		     self addToken: #OP value: two line: startLine position: startPos .
         ^ self
    ]]. 
    next == $= ifTrue:[
      ( '!<>+-*/%&|^@:' includesValue: char) ifTrue:[
            "== != <= >= += -= *= /= %= &= |= ^= @=  := "
         (two := Unicode7 new) add: char; add: next . 
		     self advance.
		     self addToken: #OP value: two line: startLine position: startPos .
         ^ self
    ]] .
    (char == $- and:[ next == $> ]) ifTrue:[ " -> "
       (two := Unicode7 new) add: char; add: next . 
		   self advance.
		   self addToken: #OP value: two line: startLine position: startPos .
       ^ self
		 ].
	].

	"Update paren depth"
  (char == $( or: [char == $[ or: [char == ${ ]]) ifTrue: [
		parenDepth := parenDepth + 1.
		openBrackets add: (Array with: char with: startPos with: startLine).
	].
	(char == $) or: [char == $] or: [char == $} ]]) ifTrue: [
		parenDepth := parenDepth - 1.
		parenDepth < 0 ifTrue: [parenDepth := 0].
		openBrackets isEmpty ifFalse: [openBrackets removeLast].
	].

	"Single-character operator"
	self addToken: #OP value: char asString line: startLine position: startPos 
%

category: 'Grail-tokenizing'
method: PythonTokenizer
___addCodePoint___: aCodePoint to: aBuilder
	"Append one code point to the literal being scanned, answering the
	builder to carry on with -- normally the SAME object, so the common
	path costs one extra send and nothing else.

	When the code point is a lone surrogate (D800..DFFF), GemStone cannot
	make a Character for it and ``addCodePoint:'' would raise OutOfRange out
	of the tokenizer, failing the whole module's import over one literal.
	Promote to PyStrSurrogate instead: it answers the same three accumulator
	selectors (add: / addCodePoint: / lf), so scanning continues unchanged
	and the finished token is a Python str that happens not to be a
	CharacterCollection.

	Only \\u and \\U can reach this: \\x tops out at 0xFF, an octal escape at
	0o777, \\N resolves against a table with no surrogates in it, and a raw
	source character cannot be a lone surrogate (the file would not have
	decoded).  So this is the whole trap, in one place."

	((aCodePoint >= 16rD800 and: [aCodePoint <= 16rDFFF])
		and: [(aBuilder isKindOf: PyStrSurrogate) not])
		ifTrue: [
			| promoted |
			promoted := PyStrSurrogate ___onPrefix___: aBuilder.
			promoted addCodePoint: aCodePoint.
			^ promoted].
	aBuilder addCodePoint: aCodePoint.
	^ aBuilder
%

category: 'Grail-tokenizing'
method: PythonTokenizer
tokenizeString
	"Tokenize a string literal (handles prefixes, single/double/triple quotes, escapes)."

	| startLine startPos prefix quoteChar triple str isFString isRaw isBytes tokenType char
	  braceDepth nestQuote |
	startLine := line.
	startPos := position.
	prefix := Unicode7 new.
	isFString := false.
	isRaw := false.
	isBytes := false.

	"Read prefix"
	[ char := self peek . (char notNil and:[ (char == $' or: [ char == $"]) not])] whileTrue: [
		prefix add: self advance .
	].
  1 to: prefix size do:[:n |
    char := (prefix at: n) asLowercase .
		char == $f ifTrue: [isFString := true].
		char == $r ifTrue: [isRaw := true].
		char == $b ifTrue: [isBytes := true].
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
	str := Unicode7 new.
	braceDepth := 0.
	nestQuote := nil.
	[
		char := self peek.
		char ifNil:[ SyntaxError signal: 'unterminated string literal at line ' , startLine printString ].
		"PEP 701: inside an f-string's {...} replacement field the text is
		SOURCE for the inner parser, not string data.  Two consequences, and
		together they are why this is a separate branch rather than a guard on
		the terminator check below:
		  * the outer quote does NOT close the f-string here, so
		    f'{' '.join(cmd)}' is one token rather than three; and
		  * escapes must survive VERBATIM, because f'{'\n'.join(cmd)}' has to
		    reach the inner parser as text it can tokenize -- decoding the \n
		    here would hand it a string literal with a raw newline inside.
		A ``#`` here is NOT treated as a comment: a format spec may legitimately
		contain one (``{id(self):#x}``), and swallowing to end of line there ate
		the closing quote.  Comments inside a field still work, because the
		parser hands the field to a child parse wrapped in parentheses and that
		parse strips them; only a ``}`` or a quote INSIDE a comment would now
		mislead the depth, which is rarer than a ``#`` spec by a wide margin.

		Nested quotes are tracked so a brace inside an embedded literal cannot
		shift the depth.  That tracking is also what makes arbitrary nesting
		work: each nested f-string's quotes pair off in turn, so the scan
		finds the right closing quote without recursing."
		(isFString and: [braceDepth > 0 or: [nestQuote notNil]]) ifTrue: [
			nestQuote
				ifNil: [
					(char == $' or: [char == $"])
						ifTrue: [nestQuote := char. str add: self advance]
						ifFalse: [
						char == ${ ifTrue: [braceDepth := braceDepth + 1. str add: self advance]
						ifFalse: [
						char == $} ifTrue: [braceDepth := braceDepth - 1. str add: self advance]
						ifFalse: [
						char == $\ ifTrue: [
							str add: self advance.
							self atEnd ifFalse: [str add: self advance]]
						ifFalse: [str add: self advance]]]]]
				ifNotNil: [
					char == $\
						ifTrue: [
							str add: self advance.
							self atEnd ifFalse: [str add: self advance]]
						ifFalse: [
							char == nestQuote ifTrue: [nestQuote := nil].
							str add: self advance]]
		] ifFalse: [
			triple ifTrue: [
				"Check for closing triple quote"
				(char == quoteChar and: [(self peekAt: 1) == quoteChar and: [(self peekAt: 2) == quoteChar]]) ifTrue: [
					self advance. self advance. self advance.
					self addToken: tokenType value: str line: startLine position: startPos .
					^self
				].
			] ifFalse: [
				char == quoteChar ifTrue: [
					self advance.
					self addToken: tokenType value: str line: startLine position: startPos .
					^self
				].
				char == Lf ifTrue: [
					SyntaxError signal: 'EOL while scanning string literal at line ' , startLine printString.
				].
			].
			"Raw strings: backslash followed by anything is a two-char
			unit, kept verbatim.  If the next char is the quote it does
			NOT terminate the string (CPython raw-string rule).  Handled
			here as a parallel case to the non-raw escape branch below —
			both consume their characters in a single block so the
			default-fallthrough consumer at the bottom doesn't run."
			(char == $\ and:[ isRaw ]) ifTrue: [
				| nextCh |
				self advance.
				nextCh := self advance.
				nextCh ifNil:[ SyntaxError signal: 'unterminated string literal'].
				str add: $\; add: nextCh
			] ifFalse: [
			"Handle escape sequences"
			(char == $\ and: [isRaw not]) ifTrue: [
				| escaped |
				self advance.
				escaped := self advance.
	      escaped ifNil:[ SyntaxError signal: 'unterminated string literal'].
				escaped == $n ifTrue: [ str lf ]
				ifFalse: [escaped == $t ifTrue: [ str add: Tab ]
				ifFalse: [escaped == $r ifTrue: [ str addCodePoint: 13 ]
				ifFalse: [escaped == $\ ifTrue: [ str add: $\ ]
				ifFalse: [escaped == quoteChar ifTrue: [ str add: quoteChar]
				ifFalse: [escaped == $a ifTrue: [ str addCodePoint: 7 ]
				ifFalse: [escaped == $b ifTrue: [ str addCodePoint: 8 ]
				ifFalse: [escaped == $f ifTrue: [ str addCodePoint: 12 ]
				ifFalse: [escaped == $v ifTrue: [ str addCodePoint: 11 ]
				ifFalse: [(escaped isDigit and: [escaped digitValue < 8]) ifTrue: [
					"Octal escape \ooo: 1 to 3 octal digits (0-7).  \8 and \9
					are NOT octal and fall through to the unknown-escape branch."
					| octStr |
					octStr := escaped asString.
					[octStr size < 3 and: [self atEnd not
						and: [self peek isDigit and: [self peek digitValue < 8]]]]
							whileTrue:[ octStr add: self advance ].
					 str addCodePoint: (PythonParser integerFrom: octStr radix: 8).
				]
				ifFalse: [escaped == $x ifTrue: [
					| hex |
					(hex := Unicode7 new) add: self advance ; add: self advance .
					"integerFrom:radix: instead of ('16r',hex) asInteger — a host
					 extent may override asInteger with Squeak semantics."
					 str addCodePoint: (PythonParser integerFrom: hex radix: 16).
				]
				ifFalse: [escaped == $u ifTrue: [
					| hex |
					(hex := Unicode7 new) add: self advance ; add: self advance ; add: self advance; add: self advance.
					 str := self ___addCodePoint___: (PythonParser integerFrom: hex radix: 16) to: str.
				]
				ifFalse: [escaped == $U ifTrue: [
					| hex |
					hex := Unicode7 new.
					8 timesRepeat: [hex := hex , self advance asString].
					 str := self ___addCodePoint___: (PythonParser integerFrom: hex radix: 16) to: str.
				]
				ifFalse: [escaped == $N ifTrue: [
					"\N{NAME} named-character escape.  Resolved against a
					curated table of common names (see
					___unicodeNameToCodePoint___:); an unknown name raises
					SyntaxError, matching CPython -- silently keeping the raw
					text (the old behavior for every \N) corrupted string
					literals invisibly."
					| nameStr cp |
					(self atEnd not and: [self peek == ${]) ifFalse: [
						SyntaxError signal: '(unicode error) malformed \N character escape'].
					self advance.
					nameStr := Unicode7 new .
					[self atEnd not and: [self peek ~~ $}]] whileTrue: [
						nameStr add: self advance].
					self atEnd ifTrue: [
						SyntaxError signal: '(unicode error) malformed \N character escape'].
					self advance.
					cp := self ___unicodeNameToCodePoint___: nameStr .
					cp isNil ifTrue: [
						SyntaxError signal: '(unicode error) unknown Unicode character name: ' , nameStr ].
					str addCodePoint: cp .
				]
				ifFalse: [escaped == Lf ifTrue: ["line continuation in string - skip"]
				ifFalse: [
					"Unknown escape - keep as-is"
					str add: $\; add: escaped.
				]]]]]]]]]]]]]]].
			] ifFalse: [
				"A bytes literal may only hold ASCII SOURCE characters -- CPython
				rejects b'<non-ascii>' at compile time (escapes like \xaa are fine
				and never reach here, having been decoded above)."
				(isBytes and: [char codePoint > 127]) ifTrue: [
					SyntaxError signal:
						'bytes can only contain ASCII literal characters at line '
							, startLine printString].
				"An f-string's ``{`` opens a replacement field, and from there the
				branch above takes over.  A DOUBLED brace is the literal ``{``:
				consume the first here so the second falls through, leaving ``{{``
				in the token for the parser to collapse, and leave the depth alone."
				(isFString and: [char == ${]) ifTrue: [
					(self peekAt: 1) == ${
						ifTrue: [str add: self advance]
						ifFalse: [braceDepth := 1]].
				str add: self advance.
			]].
		].
		true
	] whileTrue.
%
