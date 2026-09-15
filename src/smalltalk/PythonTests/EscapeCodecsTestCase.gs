! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EscapeCodecsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
EscapeCodecsTestCase comment:
'The unicode-escape / raw-unicode-escape codecs, five roots deep.

Each root was found by fixing the one before it, and the last two were
found because the earlier fixes let the decoder get FURTHER and die worse.

1. ``\<newline>'''' is a LINE CONTINUATION -- both characters go.  It
reached the unknown-escape arm, which keeps the backslash and rescans.  LF
ONLY: CPython does not continue on CR or CRLF.

2. A lone TRAILING backslash is an error in unicode-escape, though not in
raw-unicode-escape, where a backslash beginning no escape is an ordinary
byte.

3. A SUPPLEMENTARY code point encodes as \UXXXXXXXX.  The encoder emitted
\u for everything above 255, so U+1D120 came out as ``ᴒ0'''' -- a
five-digit \u, which is not an escape any reader accepts: decoding it back
gives U+1D12 followed by ''''0''''.  raw-unicode-escape beside it had
always chosen the width by the code point.

4. The decode errors carried no POSITIONS, so exc.start was nil.  That is
why bytes >> ___decodeSubstituting___ had to leave these codecs alone, and
why ``replace'''' on a bad escape still raised.  ONE RULE now covers both
ways an escape can fail -- scan the hex digits that ARE there and report
i+1+avail -- because CPython does not distinguish a short escape from one
carrying a non-hex digit.

5. These codecs PRODUCE and CONSUME lone surrogates, which is the point of
them: b''\ud800'' decodes to U+D800 and encodes back to the escape under
every handler, ``strict'''' included.  Building into a Unicode32 stream
could not express that -- Character codePoint: refuses a surrogate -- so
the decoder died with an uncatchable OutOfRange the moment it reached such
an escape.  The same holds above U+10FFFF, which is not a character at
all.

ROOTS 4 AND 5 ARE THE LESSON.  Fixing the continuation and the truncation
messages let the decoder reach escapes it had never reached before, and it
died there UNCATCHABLY -- two tests went from a Python error to a Smalltalk
one while the failure COUNT improved.  Both are part of this change rather
than a follow-up, for the same reason the UTF-16 decode raise was.

The batch codec is now correct; the INCREMENTAL one is a separate
mechanism and its tests still fail, on buffering an escape split across
chunks.'
%

doit
EscapeCodecsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
EscapeCodecsTestCase removeAllMethods: 0.
EscapeCodecsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: EscapeCodecsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'escape_codecs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/escape_codecs.py')
		name: 'escape_codecs'.
%

category: 'Grail-Helpers'
method: EscapeCodecsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: EscapeCodecsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: EscapeCodecsTestCase
testLineContinuationAndTrailingBackslash
	"A backslash-newline removes both; CR and CRLF do not continue; and a
	lone trailing backslash is an error in one codec and a byte in the
	other."

	self assertAll: #('a_backslash_newline_is_a_continuation'
		'only_LF_continues' 'a_trailing_backslash_differs_by_codec')
%

category: 'Grail-Tests'
method: EscapeCodecsTestCase
testSupplementaryEscapesUseCapitalU
	"A five-digit \u is not an escape anything can read back, which the
	round-trip check is there to say."

	self assertAll: #('supplementary_uses_capital_U'
		'the_escape_round_trips')
%

category: 'Grail-Tests'
method: EscapeCodecsTestCase
testDecodeErrorsReportPositions
	"Both ways an escape can fail, from one scan -- and the reason the
	positions matter: the substituting handlers can now consume a range
	from these codecs like any other."

	self assertAll: #('errors_report_positions'
		'positions_let_the_handlers_work')
%

category: 'Grail-Tests'
method: EscapeCodecsTestCase
testSurrogatesAndOutOfRangeCodePoints
	"What made the decoder die uncatchably once it could get this far: a
	lone surrogate, which these codecs exist to carry, and a code point
	above U+10FFFF, which is not a character."

	self assertAll: #('the_codecs_carry_a_lone_surrogate'
		'and_encode_one_back_under_every_handler'
		'a_surrogate_round_trips' 'above_10FFFF_is_not_a_character')
%

category: 'Grail-Tests'
method: EscapeCodecsTestCase
testOrdinaryEscapesAreUnchanged
	"Five roots in one pair of codecs is a lot of moving parts; this is
	the everyday behaviour none of it may disturb."

	self assertAll: #('the_ordinary_escapes_still_decode'
		'the_ordinary_escapes_still_encode')
%
