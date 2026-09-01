! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CodecsEscapeHelpersTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CodecsEscapeHelpersTestCase comment:
'``codecs.escape_decode'' / ``escape_encode'' / ``readbuffer_encode''.

CPython exposes these three from _codecs and the stdlib reaches for them
directly -- escape_decode is what ast.literal_eval and the unicode_escape
codec are built on, escape_encode its inverse, and readbuffer_encode the
passthrough a codec uses to get bytes out of anything with a buffer.
Grail had none of them: test.test_codecs 126 -> 117.

Three details are worth keeping, because each was a second pass after the
functions themselves worked:

  * escape_decode honours the ERRORS argument on a malformed ``\x'':
    strict raises ValueError, ignore drops the escape, replace answers a
    question mark.  The first cut raised regardless.
  * An octal escape over \377 names a value no byte holds.  CPython keeps
    the low eight bits and DEPRECATES the spelling; the first cut masked
    silently, which is the same bytes and a missing warning.
  * escape_encode takes BYTES ONLY -- stricter than the buffer protocol
    its neighbours accept, and test_codecs asserts the bytearray refusal
    as well as the str one.

readbuffer_encode''s type check earns its keep for a related reason:
``bytes(42)'' answers forty-two zero bytes rather than raising, so the
permissive spelling would turn CPython''s TypeError into
plausible-looking data.

See tests/python/codecs_escape_helpers.py (36 checks, CPython-validated
first).'
%

expectvalue /Class
doit
CodecsEscapeHelpersTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CodecsEscapeHelpersTestCase removeAllMethods: 0.
CodecsEscapeHelpersTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CodecsEscapeHelpersTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'codecs_escape_helpers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/codecs_escape_helpers.py')
		name: 'codecs_escape_helpers'.
%

category: 'Grail-Helpers'
method: CodecsEscapeHelpersTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CodecsEscapeHelpersTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: CodecsEscapeHelpersTestCase
testEscapeDecode
	"Every escape shape: simple, hex, octal (short, three-digit, and one
	that stops at three), the quote pair, a line continuation, str input,
	and an unrecognised escape kept verbatim."

	self assertAll: #('decode_plain' 'decode_newline' 'decode_hex'
		'decode_octal' 'decode_short_octal' 'decode_octal_stops_at_three'
		'decode_quote' 'decode_backslash' 'decode_line_continuation'
		'decode_accepts_str' 'decode_unknown_kept')
%

category: 'Grail-Tests'
method: CodecsEscapeHelpersTestCase
testEscapeDecodeErrorsAndWarnings
	"A trailing backslash and a malformed \x raise; ignore and replace
	handle the same input without raising; and the deprecations fire --
	including the octal one over \377, which is the case a silent mask
	would have passed."

	self assertAll: #('decode_trailing_backslash' 'decode_bad_hex_strict'
		'decode_bad_hex_ignore' 'decode_bad_hex_replace'
		'decode_short_hex_ignore' 'decode_short_hex_replace'
		'unknown_escape_warns' 'non_octal_digit_warns'
		'octal_overflow_warns' 'octal_overflow_value'
		'octal_in_range_is_silent')
%

category: 'Grail-Tests'
method: CodecsEscapeHelpersTestCase
testEscapeEncodeAndReadBuffer
	"The inverse mapping, the double quote it deliberately leaves alone,
	and the two type refusals each function makes -- escape_encode taking
	bytes only, readbuffer_encode refusing an int that bytes() would have
	turned into zeros."

	self assertAll: #('encode_plain' 'encode_nul' 'encode_quote'
		'encode_backslash' 'encode_newline' 'encode_return' 'encode_del'
		'encode_leaves_double_quote' 'encode_refuses_str'
		'encode_refuses_bytearray' 'readbuffer_bytes'
		'readbuffer_empty_str' 'readbuffer_bytearray'
		'readbuffer_refuses_int')
%
