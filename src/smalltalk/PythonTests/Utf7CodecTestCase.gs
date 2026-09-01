! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Utf7CodecTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Utf7CodecTestCase comment:
'The UTF-7 codec (RFC 2152).

Grail shipped utf-8, utf-16 and utf-32 but not utf-7: thirteen tests in
test_codecs, most of them the incremental and stream cases the shared
ReadTest base drives.  UTF7Test went 12 -> 3.

UTF-7 is the odd one of the family.  No byte order, no BOM, and SEVEN-BIT:
a character outside a small direct set goes into a shifted run -- ``+'',
the UTF-16 code units in modified base64, then ``-''.  A literal ``+'' is
``+-''.  Base64 takes six bits and a UTF-16 unit gives sixteen, so the two
realign only every three units and the run has to be a BIT ACCUMULATOR
rather than a per-character encoding.

Two things fall out of that shape and are worth knowing:

  * UTF-7 CARRIES a lone surrogate, which every other codec here refuses
    -- a surrogate is a UTF-16 code unit like any other.  That meant
    teaching PyStrSurrogate (the class holding a string with one) to route
    utf-7 to the encoder instead of raising, and the encoder itself lives
    on ``bytes'' keyed by CODE POINTS so both string classes share it.
  * A high byte cannot appear in utf-7 at all.  Passing one through as a
    code point would decode b''\xff'' to U+00FF -- a plausible-looking
    wrong answer rather than the error CPython gives -- so the decoder
    refuses it.

The byte maths is in Smalltalk from the start, which is the lesson the
utf-32 work paid for: a per-character Python loop is ~55us a character in
Grail and timed test_codecs out.

What remains in UTF7Test is three tests that need decode ERROR POLICIES
(``replace'' over malformed runs).  Grail drops the errors argument on the
way to a table-backed codec, which is a pre-existing gap documented in
docs/Issues.md.

See tests/python/utf7_codec.py (34 checks, CPython-validated first, with
every encode and decode form diffed against CPython''s own output before
being wired up).'
%

expectvalue /Class
doit
Utf7CodecTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Utf7CodecTestCase removeAllMethods: 0.
Utf7CodecTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Utf7CodecTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'utf7_codec' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/utf7_codec.py')
		name: 'utf7_codec'.
%

category: 'Grail-Helpers'
method: Utf7CodecTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Utf7CodecTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Utf7CodecTestCase
testDirectCharactersAndTheShiftEscape
	"What stands for itself -- ASCII, tab, LF, CR -- and what does not:
	backslash and tilde are printable but outside RFC 2152's direct set,
	and a literal ``+'' is written ``+-''."

	self assertAll: #('ascii_is_direct' 'whitespace_is_direct' 'empty'
		'backslash_is_shifted' 'tilde_is_shifted' 'plus_is_escaped'
		'plus_between_letters')
%

category: 'Grail-Tests'
method: Utf7CodecTestCase
testShiftedRuns
	"Runs of one and two characters, a run between letters, controls, a
	supplementary character (a surrogate PAIR inside the run), and the
	closing ``-'' that CPython writes even at end of string -- followed
	there by a literal dash, which is how the two are told apart."

	self assertAll: #('latin1_char' 'two_shifted_chars' 'cjk'
		'run_between_letters' 'controls' 'escape_char' 'non_bmp'
		'run_then_dash')
%

category: 'Grail-Tests'
method: Utf7CodecTestCase
testLoneSurrogatesAreCarried
	"The property that separates utf-7 from every other codec here: a lone
	surrogate encodes rather than raising, and a run holding two of them
	decodes back to two -- they are not a pair and utf-7 does not object."

	self assertAll: #('lone_surrogate_encodes' 'lone_surrogate_in_context'
		'decode_two_lone_surrogates')
%

category: 'Grail-Tests'
method: Utf7CodecTestCase
testDecoding
	"Every way a run can end: an explicit ``-'', the end of input, and a
	character that cannot be in one -- plus two runs in a row, a run
	followed by direct text, and a full round trip."

	self assertAll: #('decode_ascii' 'decode_plus' 'decode_run'
		'decode_cjk' 'decode_non_bmp' 'decode_unterminated_run_at_end'
		'decode_bare_plus_at_end' 'decode_run_ended_by_other'
		'decode_two_runs' 'decode_run_then_direct' 'round_trip')
%

category: 'Grail-Tests'
method: Utf7CodecTestCase
testMalformedInput
	"The three ways a run is malformed, each with its own CPython wording,
	and the high byte utf-7 cannot contain -- which decoded to U+00FF
	before the guard, a wrong answer that looked like a right one."

	self assertAll: #('ill_formed_sequence' 'unterminated_shift_sequence'
		'partial_character' 'double_plus' 'high_byte_refused')
%
