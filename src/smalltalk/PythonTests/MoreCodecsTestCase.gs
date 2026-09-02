! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MoreCodecsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MoreCodecsTestCase comment:
'Four more codecs the encodings package was missing, and the two things
that had to be built before any of them worked.

``punycode'' (RFC 3492), ``undefined'', and the 8-bit charmaps
``iso8859-3'' and ``iso8859-15''/``latin9''.  Each answered ``LookupError:
unknown encoding''; each is pure Python or a generated table upstream, so
shipping them is mostly a matter of shipping them.

WHAT WAS NOT.  Two gaps sat between the modules and working codecs, and
both were found by running the fixture rather than by reading:

  * SURROGATEESCAPE COULD NOT REACH A REGISTERED CODEC.  Both ends --
    bytes >> ___decodeSurrogateEscape___: and PyStrSurrogate >>
    ___surrogateEscapeBytes___: -- handled ascii, latin-1 and utf-8 by
    their maximum code point and answered LookupError for everything
    else.  A charmap has no such number: iso-8859-3 maps 0xa1 and not
    0xa5, so only the codec knows what it can represent.  Each end now
    hands the policy to the registered codec, the encode side splitting
    the string at the smuggled bytes and passing each ordinary RUN whole.
    _codecs'' charmap_decode had implemented every policy including this
    one all along; what was missing was reaching it.

  * A UnicodeError DID NOT NAME ITS ARGUMENTS.  CPython exposes
    encoding / object / start / end / reason as read-write attributes and
    its own stdlib reads them: punycode''s decoder catches the error its
    inner ascii decode raises and re-raises with the offsets adjusted,
    ``offset + exc.start''.  Grail kept them in ``args'' and named none,
    so that read answered a BoundMethod and the addition failed with
    ``unsupported operand type(s) for +''.  Naming them as accessors was
    not enough -- ___pythonValueAttrs___ is what makes a read return the
    VALUE rather than wrapping the accessor.

STILL OPEN, and deliberately not half-fixed here: an error GRAIL ITSELF
raises carries no arguments, so ``b''a\xffb''.decode(''ascii'')'' reports
None for all five.  Twenty-odd Smalltalk raise sites each build their own
message; that is its own change, and docs/Issues.md says so.

``idna'' is the other name in this family and is absent on purpose.  It
needs the whole stringprep module and unicodedata.ucd_3_2_0 -- a Unicode
database pinned at version 3.2 -- which Grail''s five-function
unicodedata shim could only fake, and a fake wearing a specific version
number is a worse answer than LookupError.

See tests/python/more_codecs.py (14 checks, CPython-validated first).'
%

expectvalue /Class
doit
MoreCodecsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MoreCodecsTestCase removeAllMethods: 0.
MoreCodecsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MoreCodecsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'more_codecs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/more_codecs.py')
		name: 'more_codecs'.
%

category: 'Grail-Helpers'
method: MoreCodecsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MoreCodecsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MoreCodecsTestCase
testPunycode
	"An ALGORITHM rather than a table, which is why it could be shipped
	when idna could not.  Pinned against RFC 3492's own vectors -- Arabic,
	both Chinese scripts, Cyrillic, a mixed Japanese/ASCII label, Maltese
	-- plus the two degenerate ones the RFC does not print: pure ASCII
	keeps its delimiter, and the empty string encodes to nothing."

	self assertAll: #('punycode_encode' 'punycode_decode'
		'punycode_is_a_text_encoding' 'punycode_rejects_bad_input'
		'punycode_incremental')
%

category: 'Grail-Tests'
method: MoreCodecsTestCase
testUndefined
	"The codec whose whole job is to refuse -- and LookupError was the
	wrong refusal."

	self assertAll: #('undefined_refuses' 'undefined_is_registered')
%

category: 'Grail-Tests'
method: MoreCodecsTestCase
testTheTwoCharmaps
	"iso-8859-3 is here for its HOLES, iso-8859-15 for the euro at 0xa4
	that is its reason to exist.  ``latin-9'' is deliberately NOT an
	alias: aliases.py normalises a hyphen to an underscore and has no
	latin_9 entry, so CPython does not know it either."

	self assertAll: #('iso8859_3_round_trip' 'latin9_round_trip'
		'charmap_aliases')
%

category: 'Grail-Tests'
method: MoreCodecsTestCase
testSurrogateescapeThroughACharmap
	"Both directions of the gap this found: decode escapes the unmapped
	0xa5, and encode puts it back.  CPython's own SurrogateEscapeTest
	test_charmap, and the reason the policy now reaches a registered
	codec at all."

	self assertAll: #('iso8859_3_has_holes')
%

category: 'Grail-Tests'
method: MoreCodecsTestCase
testAUnicodeErrorNamesItsArguments
	"encoding / object / start / end / reason, read as VALUES and
	writable -- what ``offset + exc.start'' needs, and what every error
	handler in the language is written against."

	self assertAll: #('unicode_decode_error_attributes'
		'unicode_encode_error_attributes'
		'unicode_error_attributes_are_writable')
%
