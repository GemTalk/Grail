! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RawUnicodeEscapeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RawUnicodeEscapeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
RawUnicodeEscapeTestCase comment:
'The raw-unicode-escape codec, both directions.

Latin-1 plus exactly two escapes -- \uXXXX and \UXXXXXXXX.  Every OTHER
backslash sequence is literal, which is the whole difference from
unicode-escape: b''\n'' decodes to backslash-then-n, not to a newline.

The case worth a test class is the doubled backslash.  CPython consumes the
byte after a backslash unconditionally, so in ``\\u00e9'' the second backslash
is eaten as a literal and the ``u'' can no longer open an escape -- the six
characters survive.  An implementation that scans for the two-byte sequence
``\u'' decodes it to e-acute instead, which is backwards.

Grail had no codec at all under either name, so test.test_builtin failed to
IMPORT: it writes its Arabic-Indic digit cases as
``str(br''٣١٤ '', ''raw-unicode-escape'')'' at module level.

Writing the decoder also exposed a latent bug in its neighbours: the
pre-existing env-0 helpers ___decodeUnicodeEscape___ and ___parseHex___ sent
``UnicodeDecodeError ___signal___:'' unqualified, and ___signal___: is an env-1
classmethod -- so a malformed unicode-escape raised MessageNotUnderstood rather
than a catchable Python UnicodeDecodeError.  The truncated-escape cases below
cover the corrected path.

See tests/python/raw_unicode_escape.py.'
%

expectvalue /Class
doit
RawUnicodeEscapeTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
RawUnicodeEscapeTestCase removeAllMethods: 0.
RawUnicodeEscapeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: RawUnicodeEscapeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'raw_unicode_escape' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/raw_unicode_escape.py')
		name: 'raw_unicode_escape'.
%

category: 'Grail-Helpers'
method: RawUnicodeEscapeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: RawUnicodeEscapeTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testDecodesTheCaseTestBuiltinWrites
	"The literal that kept test.test_builtin from importing, and the int() it
	feeds -- via both bytes>>decode and the two-argument str()."

	self assertAll: #('decode_arabic_indic' 'int_of_decoded_arabic'
		'str_two_arg_form')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testDecodesTheTwoEscapes
	"\uXXXX and \UXXXXXXXX, with either case of hex digit, anywhere in the
	input."

	self assertAll: #('decode_u_escape' 'decode_big_u_escape'
		'decode_uppercase_hex_digits' 'decode_escape_amid_text')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testDecodesEverythingElseAsLatin1
	"A high byte is its own code point; no escape is involved."

	self assertAll: #('decode_high_byte_is_latin1' 'decode_plain_ascii'
		'decode_empty')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testLeavesOtherBackslashSequencesAlone
	"\n, \t, \x41, \N{...}, \v and a lone trailing backslash are all literal
	here -- this is what separates the codec from unicode-escape."

	self assertAll: #('decode_leaves_newline_escape' 'decode_leaves_hex_escape'
		'decode_leaves_named_escape' 'decode_leaves_lone_backslash'
		'decode_leaves_trailing_backslash' 'decode_leaves_v_escape')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testDoubledBackslashBlocksTheEscape
	"The subtle rule: an escape only fires after an EVEN number of
	backslashes, because each pair is consumed as two literals.  Three
	backslashes therefore DO open an escape."

	self assertAll: #('doubled_backslash_blocks_escape'
		'quadrupled_backslash_blocks_escape' 'doubled_backslash_alone'
		'doubled_backslash_then_letter' 'tripled_backslash_escape_fires')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testTruncatedEscapeRaisesUnicodeDecodeError
	"Too few hex digits, a non-hex digit, or nothing at all after \u.  These
	also cover the env-0 signalling fix -- before it, the raise was a
	MessageNotUnderstood that no Python except clause could catch."

	self assertAll: #('truncated_u_escape' 'non_hex_u_escape'
		'truncated_big_u_escape' 'bare_u_at_end')
%

category: 'Grail-Tests - decoding'
method: RawUnicodeEscapeTestCase
testCodecNameNormalisation
	"''-'' and ''_'' name the same codec; squashing the separators out names
	no codec at all."

	self assertAll: #('alias_underscore' 'squashed_name_is_not_an_alias')
%

category: 'Grail-Tests - encoding'
method: RawUnicodeEscapeTestCase
testEncodesBelow256AsOneByte
	"Latin-1 range passes through as raw bytes."

	self assertAll: #('encode_ascii' 'encode_empty'
		'encode_latin1_stays_one_byte' 'encode_ff_stays_one_byte')
%

category: 'Grail-Tests - encoding'
method: RawUnicodeEscapeTestCase
testEncodesAboveLatin1AsAnEscape
	"U+0100 and up become \uXXXX; astral code points become \UXXXXXXXX.  Hex
	is LOWERCASE and zero-padded to the escape''s fixed width -- GemStone''s
	printString: 16 answers uppercase and unpadded, so both are converted."

	self assertAll: #('encode_100_becomes_escape' 'encode_bmp_char'
		'encode_astral_char' 'encode_hex_is_lowercase' 'encode_pads_to_four'
		'encode_pads_to_eight' 'encode_alias_underscore')
%

category: 'Grail-Tests - encoding'
method: RawUnicodeEscapeTestCase
testEncodingDoesNotDoubleBackslashes
	"Which is what makes the codec lossy: text holding a literal A and
	the single character A encode differently but decode alike."

	self assertAll: #('encode_leaves_backslash' 'encode_leaves_escape_text'
		'round_trip_of_escape_text_is_lossy')
%

category: 'Grail-Tests - encoding'
method: RawUnicodeEscapeTestCase
testRoundTripsTextWithoutBackslashes
	"Everything else survives encode-then-decode unchanged."

	self assertAll: #('round_trip_astral' 'round_trip_mixed')
%
