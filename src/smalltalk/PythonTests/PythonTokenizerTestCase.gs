! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonTokenizerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonTokenizerTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PythonTokenizerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonTokenizerTestCase - Tests for PythonTokenizer
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonTokenizerTestCase removeAllMethods.
PythonTokenizerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-helpers'
method: PythonTokenizerTestCase
findToken: aSymbol value: aString in: tokens

	^tokens detect: [:t | t type == aSymbol and: [t value = aString]] ifNone: [nil]
%

category: 'Grail-tests - basic tokens'
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

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_binary_number
	"Tokenize binary numbers."

	| tokens numTok |
	tokens := self tokenize: '0b1010'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0b1010'.
%

category: 'Grail-tests - edge cases'
method: PythonTokenizerTestCase
test_blank_lines_ignored
	"Blank lines should not produce NEWLINE tokens between statements."

	| tokens nameToks |
	tokens := self tokenize: 'x

y'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 2.
%

category: 'Grail-tests - structure'
method: PythonTokenizerTestCase
test_bracket_suppresses_newline
	"Newlines inside brackets should produce NL, not NEWLINE."

	| tokens newlines |
	tokens := self tokenize: '[1,
2]'.
	newlines := self tokensOfType: #NEWLINE from: tokens.
	self assert: newlines size <= 1.
%

category: 'Grail-tests - strings'
method: PythonTokenizerTestCase
test_byte_string
	"Tokenize byte string prefix."

	| tokens strTok |
	tokens := self tokenize: 'b''hello'''.
	strTok := (self tokensOfType: #BYTES from: tokens) first.
	self assert: strTok value equals: 'hello'.
%

category: 'Grail-tests - positions'
method: PythonTokenizerTestCase
test_column_numbers
  "AbstractLocationNode understands column (deriveed from position and sourceString , 
   but Tokens only hold position."
	| tokens xTok yTok |
	tokens := self tokenize: '  x + y'.
	xTok := (self findToken: #NAME value: 'x' in: tokens).
	yTok := (self findToken: #NAME value: 'y' in: tokens).
	self assert: xTok position equals: 3.
	self assert: yTok position equals: 7.
%

category: 'Grail-tests - structure'
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

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_complex_number
	"Tokenize complex number literals."

	| tokens numTok |
	tokens := self tokenize: '3.14j'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '3.14j'.
%

category: 'Grail-tests - operators'
method: PythonTokenizerTestCase
test_delimiters
	"Tokenize parentheses, brackets, braces."

	| tokens opToks |
	tokens := self tokenize: '()[]{}:;,.'.
	opToks := self tokensOfType: #OP from: tokens.
	self assert: opToks size equals: 10.
%

category: 'Grail-tests - operators'
method: PythonTokenizerTestCase
test_ellipsis
	"Tokenize ellipsis (...)."

	| tokens opTok |
	tokens := self tokenize: '...'.
	opTok := (self tokensOfType: #OP from: tokens) first.
	self assert: opTok value equals: '...'.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_double_dot_is_two_single_dots
	"``..'' is NOT a Python operator — it must tokenize as two
	separate single-dot OPs so the parser can count them as the
	relative-import level in ``from .. import x''.  Regression:
	the tokenizer's two-char-op table previously included ``..''
	and merged them, blocking every relative import with level>=2
	(Werkzeug's ``from .. import exceptions'' tripped this)."

	| tokens ops |
	tokens := self tokenize: '..'.
	ops := self tokensOfType: #OP from: tokens.
	self assert: ops size equals: 2.
	self assert: (ops first) value equals: '.'.
	self assert: (ops second) value equals: '.'.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_empty_source
	"Tokenizing empty string produces ENDMARKER."

	| tokens |
	tokens := self tokenize: ''.
	self assert: tokens last type equals: #ENDMARKER.
%

category: 'Grail-tests - strings'
method: PythonTokenizerTestCase
test_empty_string
	"Tokenize empty strings."

	| tokens strTok |
	tokens := self tokenize: ''''''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: strTok value equals: ''.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_endmarker
	"Every token stream ends with ENDMARKER."

	| tokens |
	tokens := self tokenize: 'x = 1'.
	self assert: tokens last type equals: #ENDMARKER.
%

category: 'Grail-tests - strings'
method: PythonTokenizerTestCase
test_escape_sequences
	"Tokenize strings with escape sequences."

	| tokens strTok |
	tokens := self tokenize: '''hello\nworld'''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: (strTok value includes: Character lf).
%

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_float_dot_only
	"Tokenize float starting with dot."

	| tokens numTok |
	tokens := self tokenize: '.5'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '.5'.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_float_literal
	"Tokenize float literals."

	| tokens numToks |
	tokens := self tokenize: '3.14'.
	numToks := self tokensOfType: #NUMBER from: tokens.
	self assert: numToks size equals: 1.
	self assert: numToks first value equals: '3.14'.
%

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_float_with_exponent
	"Tokenize float with exponent."

	| tokens numTok |
	tokens := self tokenize: '1e10'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '1e10'.
%

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_hex_number
	"Tokenize hexadecimal numbers."

	| tokens numTok |
	tokens := self tokenize: '0xFF'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0xFF'.
%

category: 'Grail-tests - indentation'
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

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_integer_literal
	"Tokenize integer literals."

	| tokens numToks |
	tokens := self tokenize: '42'.
	numToks := self tokensOfType: #NUMBER from: tokens.
	self assert: numToks size equals: 1.
	self assert: numToks first value equals: '42'.
%

category: 'Grail-tests - basic tokens'
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

category: 'Grail-tests - structure'
method: PythonTokenizerTestCase
test_line_continuation
	"Backslash-newline joins lines."

	| tokens nameToks |
	tokens := self tokenize: 'x \
+ y'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 2.
%

category: 'Grail-tests - positions'
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

category: 'Grail-tests - edge cases'
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

category: 'Grail-tests - indentation'
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

category: 'Grail-tests - basic tokens'
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

category: 'Grail-tests - indentation'
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

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_newline_token
	"Statement-ending newline produces NEWLINE token."

	| tokens nlToks |
	tokens := self tokenize: 'x
y'.
	nlToks := self tokensOfType: #NEWLINE from: tokens.
	self assert: nlToks size >= 1.
%

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_octal_number
	"Tokenize octal numbers."

	| tokens numTok |
	tokens := self tokenize: '0o77'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '0o77'.
%

category: 'Grail-tests - basic tokens'
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

category: 'Grail-tests - structure'
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

category: 'Grail-tests - strings'
method: PythonTokenizerTestCase
test_raw_string
	"Tokenize raw strings (backslash not interpreted)."

	| tokens strTok |
	tokens := self tokenize: 'r''hello\nworld'''.
	strTok := (self tokensOfType: #STRING from: tokens) first.
	self assert: (strTok value includes: $\).
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_single_name
	"Tokenize a single identifier."

	| tokens nameToks |
	tokens := self tokenize: 'hello'.
	nameToks := self tokensOfType: #NAME from: tokens.
	self assert: nameToks size equals: 1.
	self assert: nameToks first value equals: 'hello'.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_string_double_quotes
	"Tokenize double-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '"hello"'.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello'.
%

category: 'Grail-tests - basic tokens'
method: PythonTokenizerTestCase
test_string_single_quotes
	"Tokenize single-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '''hello'''.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello'.
%

category: 'Grail-tests - operators'
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

category: 'Grail-tests - strings'
method: PythonTokenizerTestCase
test_triple_single_quoted
	"Tokenize triple single-quoted strings."

	| tokens strToks |
	tokens := self tokenize: '''''''hello world'''''''.
	strToks := self tokensOfType: #STRING from: tokens.
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'hello world'.
%

category: 'Grail-tests - operators'
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

category: 'Grail-tests - numbers'
method: PythonTokenizerTestCase
test_underscore_in_number
	"Tokenize numbers with underscores."

	| tokens numTok |
	tokens := self tokenize: '1_000_000'.
	numTok := (self tokensOfType: #NUMBER from: tokens) first.
	self assert: numTok value equals: '1000000'.
%

category: 'Grail-helpers'
method: PythonTokenizerTestCase
tokenize: aString

	^PythonTokenizer tokenize: aString
%

category: 'Grail-helpers'
method: PythonTokenizerTestCase
tokensOfType: aSymbol from: tokens

	^tokens select: [:t | t type == aSymbol]
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_crlf_source_tokenizes_like_lf
	"A file written on Windows must tokenize exactly as the same file with
	unix endings.  Before universal newline translation the CR was neither
	whitespace, newline, nor identifier character, so it reached
	checkSimpleStatementTerminator: and raised a line-less SyntaxError --
	which made whole pip distributions unimportable (29 of the 32 files in
	the ``kaggle'' sdist are CRLF)."

	| cr lf crlfToks lfToks |
	cr := String with: Character cr.
	lf := String with: Character lf.
	crlfToks := self tokenize: 'x = 1', cr, lf, 'y = 2', cr, lf.
	lfToks := self tokenize: 'x = 1', lf, 'y = 2', lf.
	self assert: (crlfToks collect: [:t | t type])
		equals: (lfToks collect: [:t | t type]).
	self assert: (crlfToks collect: [:t | t value])
		equals: (lfToks collect: [:t | t value]).
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_lone_cr_source_tokenizes_like_lf
	"Old-Mac line endings.  CPython's translate_newlines maps a bare CR to LF
	too, not just the CRLF pair."

	| cr lf crToks lfToks |
	cr := String with: Character cr.
	lf := String with: Character lf.
	crToks := self tokenize: 'x = 1', cr, 'y = 2', cr.
	lfToks := self tokenize: 'x = 1', lf, 'y = 2', lf.
	self assert: (crToks collect: [:t | t type])
		equals: (lfToks collect: [:t | t type]).
	self assert: (crToks collect: [:t | t value])
		equals: (lfToks collect: [:t | t value]).
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_crlf_preserves_line_numbers
	"Translation must not shift what line a token is reported on -- one
	newline per line either way.  A traceback over CRLF source is only
	trustworthy if this holds.

	Compares the WHOLE token stream against the LF baseline, lines included,
	rather than picking out the NAME tokens: the first cut of this test did
	the latter and still passed with translateNewlines: neutralised, because
	the names landed on the right lines and the junk the stray CR produced
	was simply not looked at.  A test that cannot fail for the reason it
	exists is not a test."

	| cr lf crlfToks lfToks triples |
	cr := String with: Character cr.
	lf := String with: Character lf.
	crlfToks := self tokenize: 'a = 1', cr, lf, 'b = 2', cr, lf, 'c = 3', cr, lf.
	lfToks := self tokenize: 'a = 1', lf, 'b = 2', lf, 'c = 3', lf.
	triples := [:toks | (toks collect: [:t | { t type . t value . t line }]) asArray].
	self assert: (triples value: crlfToks) equals: (triples value: lfToks).
	"And the lines really are 1, 2, 3 -- not merely equal to a baseline that
	could itself be wrong."
	self assert: ((crlfToks select: [:t | t type == #NAME])
			collect: [:t | t line]) asArray
		equals: #(1 2 3).
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_crlf_inside_triple_quoted_literal_becomes_lf
	"Translation happens while DECODING, so it reaches inside literals.
	Verified against CPython: compile of a triple-quoted literal spanning a
	CRLF break yields a bare LF in the string."

	| cr lf strToks |
	cr := String with: Character cr.
	lf := String with: Character lf.
	strToks := self tokensOfType: #STRING
		from: (self tokenize: '"""a', cr, lf, 'b"""').
	self assert: strToks size equals: 1.
	self assert: strToks first value equals: 'a', lf, 'b'.
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_escaped_cr_in_literal_is_not_translated
	"A backslash-r escape is two SOURCE characters, not a CR byte, so
	translation must leave it alone -- it still denotes a carriage return.
	CPython agrees: repr of the compiled literal is 'a\\rb'."

	| strToks |
	strToks := self tokensOfType: #STRING
		from: (self tokenize: '"a\rb"').
	self assert: strToks size equals: 1.
	self assert: strToks first value
		equals: 'a', (String with: Character cr), 'b'.
%

category: 'Grail-tests - newlines'
method: PythonTokenizerTestCase
test_translateNewlines_does_not_copy_when_there_is_no_cr
	"The fast path is load-bearing: source: runs for every module Grail
	compiles, so the ordinary CR-free file must pay one indexOf: and no
	allocation.  Identity, not equality, is the assertion that shows it."

	| s |
	s := 'x = 1', (String with: Character lf), 'y = 2'.
	self assert: (PythonTokenizer translateNewlines: s) == s.
%
