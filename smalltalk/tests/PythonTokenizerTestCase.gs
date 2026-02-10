! ===============================================================================
! PythonTokenizerTestCase - Tests for PythonTokenizer
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonTokenizerTestCase removeAllMethods.
PythonTokenizerTestCase class removeAllMethods.
%

! ------------------- Helper methods
category: 'helpers'
method: PythonTokenizerTestCase
tokenize: aString

	^PythonTokenizer tokenize: aString
%
category: 'helpers'
method: PythonTokenizerTestCase
tokensOfType: aSymbol from: tokens

	^tokens select: [:t | t type == aSymbol]
%
category: 'helpers'
method: PythonTokenizerTestCase
findToken: aSymbol value: aString in: tokens

	^tokens detect: [:t | t type == aSymbol and: [t value = aString]] ifNone: [nil]
%

! ------------------- Tests - Basic Tokens
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_empty_source
	"Tokenizing empty string produces ENDMARKER."

	| tokens |
	tokens := self tokenize: ''.
	self assert: tokens last type equals: #ENDMARKER.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_single_name
	"Tokenize a single identifier."

	| tokens nameToks |
	tokens := self tokenize: 'hello'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 1.
	self assert: nameToks first value equals: 'hello'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_multiple_names
	"Tokenize multiple identifiers."

	| tokens nameToks |
	tokens := self tokenize: 'foo bar baz'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 3.
	self assert: nameToks first value equals: 'foo'.
	self assert: (nameToks at: 2) value equals: 'bar'.
	self assert: nameToks last value equals: 'baz'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_keyword_recognition
	"Keywords should be tokenized as KEYWORD type."

	| tokens kwToks |
	tokens := self tokenize: 'if else while'.
	kwToks := self tokensOfType: #KEYWORD from: tokens.
	self assert: kwToks size equals: 3.
	self assert: kwToks first value equals: 'if'.
	self assert: (kwToks at: 2) value equals: 'else'.
	self assert: kwToks last value equals: 'while'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_all_keywords
	"All Python keywords should be recognized."

	| keywords |
	keywords := #('False' 'None' 'True' 'and' 'as' 'assert' 'async' 'await'
		'break' 'class' 'continue' 'def' 'del' 'elif' 'else' 'except'
		'finally' 'for' 'from' 'global' 'if' 'import' 'in' 'is' 'lambda'
		'nonlocal' 'not' 'or' 'pass' 'raise' 'return' 'try' 'while' 'with' 'yield').
	keywords do: [:kw |
		| tokens kwTok |
		tokens := self tokenize: kw.
		kwTok := (self tokensOfType: #KEYWORD from: tokens) first.
		self assert: kwTok value equals: kw.
	].
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_integer_literal
	"Tokenize integer literals."

	| tokens numToks |
	tokens := self tokenize: '42'.
	numToks := self tokensOfType: #NUMBER from: tokens.
	self assert: numToks size equals: 1.
	self assert: numToks first value equals: '42'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_float_literal
	"Tokenize float literals."

	| tokens numToks |
	tokens := self tokenize: '3.14'.
	numToks := self tokensOfType: #NUMBER from: tokens.
	self assert: numToks size equals: 1.
	self assert: numToks first value equals: '3.14'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_string_single_quotes
	"Tokenize single-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '''hello'''.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_string_double_quotes
	"Tokenize double-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '"hello"'.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_operators
	"Tokenize basic operators."

	| tokens opToks |
	tokens := self tokenize: '+ - * /'.
	opToks := self tokensOfType: #OP from: tokens.
	self assert: opToks size equals: 4.
	self assert: opToks first value equals: '+'.
	self assert: (opToks at: 2) value equals: '-'.
	self assert: (opToks at: 3) value equals: '*'.
	self assert: (opToks at: 4) value equals: '/'.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_newline_token
	"Statement-ending newline produces NEWLINE token."

	| tokens nlToks |
	tokens := self tokenize: 'x
y'.
	nlToks := self tokensOfType: #NEWLINE from: tokens.
	self assert: nlToks size >= 1.
%
category: 'tests - basic tokens'
method: PythonTokenizerTestCase
test_endmarker
	"Every token stream ends with ENDMARKER."

	| tokens |
	tokens := self tokenize: 'x = 1'.
	self assert: tokens last type equals: #ENDMARKER.
%

! ------------------- Tests - Numbers
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_hex_number
	"Tokenize hexadecimal numbers."

	| tokens numTok |
	tokens := self tokenize: '0xFF'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0xFF'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_octal_number
	"Tokenize octal numbers."

	| tokens numTok |
	tokens := self tokenize: '0o77'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0o77'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_binary_number
	"Tokenize binary numbers."

	| tokens numTok |
	tokens := self tokenize: '0b1010'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0b1010'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_complex_number
	"Tokenize complex number literals."

	| tokens numTok |
	tokens := self tokenize: '3.14j'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '3.14j'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_underscore_in_number
	"Tokenize numbers with underscores."

	| tokens numTok |
	tokens := self tokenize: '1_000_000'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '1000000'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_float_with_exponent
	"Tokenize float with exponent."

	| tokens numTok |
	tokens := self tokenize: '1e10'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '1e10'.
%
category: 'tests - numbers'
method: PythonTokenizerTestCase
test_float_dot_only
	"Tokenize float starting with dot."

	| tokens numTok |
	tokens := self tokenize: '.5'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '.5'.
%

! ------------------- Tests - Strings
category: 'tests - strings'
method: PythonTokenizerTestCase
test_triple_single_quoted
	"Tokenize triple single-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '''''''hello world'''''''.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello world'.
%
category: 'tests - strings'
method: PythonTokenizerTestCase
test_escape_sequences
	"Tokenize strings with escape sequences."

	| tokens strTok |
	tokens := self tokenize: '''hello\nworld'''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: (strTok value includes: Character lf).
%
category: 'tests - strings'
method: PythonTokenizerTestCase
test_raw_string
	"Tokenize raw strings (backslash not interpreted)."

	| tokens strTok |
	tokens := self tokenize: 'r''hello\nworld'''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: (strTok value includes: $\).
%
category: 'tests - strings'
method: PythonTokenizerTestCase
test_byte_string
	"Tokenize byte string prefix."

	| tokens strTok |
	tokens := self tokenize: 'b''hello'''.
	strTok := (self tokensOfType: #BYTES from: tokens) first.
	self assert: strTok value equals: 'hello'.
%
category: 'tests - strings'
method: PythonTokenizerTestCase
test_empty_string
	"Tokenize empty strings."

	| tokens strTok |
	tokens := self tokenize: ''''''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: strTok value equals: ''.
%

! ------------------- Tests - Operators
category: 'tests - operators'
method: PythonTokenizerTestCase
test_two_char_operators
	"Tokenize two-character operators."

	| ops |
	ops := #('==' '!=' '<=' '>=' '+=' '-=' '*=' '/=' '**' '//' ':=' '->' '<<' '>>').
	ops do: [:op |
		| tokens opTok |
		tokens := self tokenize: op.
		opTok := (self tokensOfType: #OP from: tokens) first.
		self assert: opTok value equals: op.
	].
%
category: 'tests - operators'
method: PythonTokenizerTestCase
test_three_char_operators
	"Tokenize three-character operators."

	| ops |
	ops := #('**=' '//=' '<<=' '>>=').
	ops do: [:op |
		| tokens opTok |
		tokens := self tokenize: op.
		opTok := (self tokensOfType: #OP from: tokens) first.
		self assert: opTok value equals: op.
	].
%
category: 'tests - operators'
method: PythonTokenizerTestCase
test_ellipsis
	"Tokenize ellipsis (...)."

	| tokens opTok |
	tokens := self tokenize: '...'.
	opTok := (self tokensOfType: #OP from: tokens) first.
	self assert: opTok value equals: '...'.
%
category: 'tests - operators'
method: PythonTokenizerTestCase
test_delimiters
	"Tokenize parentheses, brackets, braces."

	| tokens opToks |
	tokens := self tokenize: '()[]{}:;,.'.
	opToks := self tokensOfType: #OP from: tokens.
	self assert: opToks size equals: 10.
%

! ------------------- Tests - Indentation
category: 'tests - indentation'
method: PythonTokenizerTestCase
test_indent_dedent
	"Indented block produces INDENT and DEDENT tokens."

	| tokens indents dedents |
	tokens := self tokenize: 'if x:
    y
z'.
	indents := self tokensOfType: #INDENT from: tokens.
	dedents := self tokensOfType: #DEDENT from: tokens.
	self assert: indents size equals: 1.
	self assert: dedents size equals: 1.
%
category: 'tests - indentation'
method: PythonTokenizerTestCase
test_nested_indent
	"Nested indentation produces multiple INDENT/DEDENT pairs."

	| tokens indents dedents |
	tokens := self tokenize: 'if x:
    if y:
        z
'.
	indents := self tokensOfType: #INDENT from: tokens.
	dedents := self tokensOfType: #DEDENT from: tokens.
	self assert: indents size equals: 2.
	self assert: dedents size equals: 2.
%
category: 'tests - indentation'
method: PythonTokenizerTestCase
test_multiple_dedent
	"Dedenting multiple levels at once."

	| tokens indents dedents |
	tokens := self tokenize: 'if x:
    if y:
        z
a'.
	indents := self tokensOfType: #INDENT from: tokens.
	dedents := self tokensOfType: #DEDENT from: tokens.
	self assert: indents size equals: 2.
	self assert: dedents size equals: 2.
%

! ------------------- Tests - Paren Depth
category: 'tests - structure'
method: PythonTokenizerTestCase
test_paren_suppresses_newline
	"Newlines inside parentheses should produce NL, not NEWLINE."

	| tokens newlines |
	tokens := self tokenize: '(1,
2)'.
	newlines := self tokensOfType: #NEWLINE from: tokens.
	"There should only be the final NEWLINE after the closing paren, not one inside"
	self assert: newlines size <= 1.
%
category: 'tests - structure'
method: PythonTokenizerTestCase
test_bracket_suppresses_newline
	"Newlines inside brackets should produce NL, not NEWLINE."

	| tokens newlines |
	tokens := self tokenize: '[1,
2]'.
	newlines := self tokensOfType: #NEWLINE from: tokens.
	self assert: newlines size <= 1.
%
category: 'tests - structure'
method: PythonTokenizerTestCase
test_comment_ignored
	"Comments should not produce tokens."

	| tokens nameToks |
	tokens := self tokenize: 'x # this is a comment
y'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 2.
	self assert: nameToks first value equals: 'x'.
	self assert: nameToks last value equals: 'y'.
%
category: 'tests - structure'
method: PythonTokenizerTestCase
test_line_continuation
	"Backslash-newline joins lines."

	| tokens nameToks |
	tokens := self tokenize: 'x \
+ y'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 2.
%

! ------------------- Tests - Line/Column Tracking
category: 'tests - positions'
method: PythonTokenizerTestCase
test_line_numbers
	"Tokens should have correct line numbers."

	| tokens first second |
	tokens := self tokenize: 'x
y'.
	first := (self findToken: #NAME value: 'x' in: tokens).
	second := (self findToken: #NAME value: 'y' in: tokens).
	self assert: first line equals: 1.
	self assert: second line equals: 2.
%
category: 'tests - positions'
method: PythonTokenizerTestCase
test_column_numbers
	"Tokens should have correct column numbers."

	| tokens xTok yTok |
	tokens := self tokenize: '  x + y'.
	xTok := (self findToken: #NAME value: 'x' in: tokens).
	yTok := (self findToken: #NAME value: 'y' in: tokens).
	self assert: xTok column equals: 2.
	self assert: yTok column equals: 6.
%

! ------------------- Tests - Edge Cases
category: 'tests - edge cases'
method: PythonTokenizerTestCase
test_blank_lines_ignored
	"Blank lines should not produce NEWLINE tokens between statements."

	| tokens nameToks |
	tokens := self tokenize: 'x

y'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 2.
%
category: 'tests - edge cases'
method: PythonTokenizerTestCase
test_mixed_expression
	"Tokenize a complex expression."

	| tokens |
	tokens := self tokenize: 'x = foo(1, "bar", y=True)'.
	self assert: (self findToken: #NAME value: 'x' in: tokens) notNil.
	self assert: (self findToken: #OP value: '=' in: tokens) notNil.
	self assert: (self findToken: #NAME value: 'foo' in: tokens) notNil.
	self assert: (self findToken: #OP value: '(' in: tokens) notNil.
	self assert: (self findToken: #NUMBER value: '1' in: tokens) notNil.
	self assert: (self findToken: #STRING value: 'bar' in: tokens) notNil.
	self assert: (self findToken: #KEYWORD value: 'True' in: tokens) notNil.
	self assert: (self findToken: #OP value: ')' in: tokens) notNil.
%

