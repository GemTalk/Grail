! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SpanEndTokenTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SpanEndTokenTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SpanEndTokenTestCase - where a traceback frame's PEP 657 span ends.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SpanEndTokenTestCase removeAllMethods.
SpanEndTokenTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: SpanEndTokenTestCase
testSpanReachesTheEndOfItsLastToken
	"A node's extent is set from its first and last TOKENS, and the last token
	contributed its START where the span needed its END.  So every span whose
	last token was longer than one character was truncated to that token's
	first character -- ``_bad + _other'' underlined ``_bad + _o''.

	``foo(x)'' and ``a[i]'' were unaffected, because ``)'' and ``]'' are one
	character long, and calls and subscripts are nearly all of what the existing
	caret tests exercise.  The bracket check below is kept as a CONTROL for
	exactly that reason: with the fix reverted it still passes while the other
	five fail, which is what a fixture made only of calls would have done.

	A token's end cannot be computed from its value: a string token's value is
	its DECODED content, so the quotes are already gone and an f-string is
	shorter as a value than as source.  Tokens carry their own end position."

	| mod |
	importlib @env1:modules removeKey: #'span_end_token' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/span_end_token.py')
		name: 'span_end_token'.
	#( 'a_span_ending_in_a_name_reaches_its_last_character'
	   'a_span_ending_in_a_number_reaches_its_last_character'
	   'a_span_ending_in_a_string_reaches_its_closing_quote'
	   'a_span_ending_in_an_fstring_reaches_its_closing_quote'
	   'a_span_ending_in_a_keyword_literal_reaches_its_last_character'
	   'a_span_ending_in_a_bracket_is_unchanged' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'span end check failed: ' , k , ' -> ' , answer printString]
%
