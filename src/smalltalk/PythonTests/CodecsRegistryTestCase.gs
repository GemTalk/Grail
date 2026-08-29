! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CodecsRegistryTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CodecsRegistryTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CodecsRegistryTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CodecsRegistryTestCase
!
! THE CODEC REGISTRY: ``codecs'' and the ``encodings'' package.
!
! What was here before was a STUB, and it said so: lookup() raised LookupError
! for every name, CodecInfo carried a ``.name'' and nothing else, register_error
! stored handlers that could never fire, and there was no ``encodings'' package
! at all.  That was deliberate and it was enough for werkzeug, which is the only
! thing that had needed codecs -- CharsetAccept wraps lookup() in
! ``except LookupError'' and falls back to name.lower().
!
! It was also a wall, and the far side of it is wide.  Measured, from
! pip-installed trees:
!
!   charset_normalizer   ImportError: cannot import name 'BOM_UTF8' from 'codecs'
!   webencodings/bleach  AttributeError: module '?' has no attribute 'Codec'
!   protobuf (pure-Py)   ModuleNotFoundError: No module named
!                        'encodings.raw_unicode_escape'
!   socket.makefile('r') io.TextIOWrapper over a buffer is _pyio's, and _pyio's
!                        asks codecs.lookup(enc).incrementaldecoder
!
! WHAT LANDED.  codecs.py is now CPython 3.14.6's own file with one edit (the
! import); the registry and the low-level entry points it imports live in
! _codecs.py, pure Python over Grail's Smalltalk str.encode / bytes.decode; and
! ``encodings'' is the CPython package with its verbatim alias table plus ten
! codec modules -- utf_8, utf_8_sig, ascii, latin_1, utf_16 (+le/be),
! raw_unicode_escape, unicode_escape, cp1252.
!
! WHAT DID NOT.  CPython ships about a hundred codecs and Grail ships ten, so
! ``lookup('cp500')'' is a LookupError here and a codec there.  That difference
! is why the fixture checks the PROTOCOL -- what a codec has to do -- rather
! than the inventory: an inventory check would disagree with CPython by design
! and stop being evidence.
!
! Fixture: tests/python/codecs_registry.py (self-verifying under CPython
! 3.14.6 -- all 21 checks pass there unchanged, which is what makes them
! evidence rather than a transcript of Grail's current behaviour).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CodecsRegistryTestCase removeAllMethods.
CodecsRegistryTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: CodecsRegistryTestCase
setUp
	probe := self ___loadProbe___: 'codecs_registry'.
%

category: 'Grail-Private'
method: CodecsRegistryTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: CodecsRegistryTestCase
reprAt: aKey
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

! ---- the constants and the lookup -------------------------------------------

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testBomConstants
	"The cheapest thing here and the one that unblocked the most: five module
	constants that charset_normalizer/constant.py imports at module level, so
	their absence was an ImportError before any of its code ran."

	self assert: (self reprAt: 'bom_constants')
		equals: '[b''\xef\xbb\xbf'', b''\xff\xfe'', b''\xfe\xff'', b''\xff\xfe\x00\x00'', b''\x00\x00\xfe\xff'']'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testLookupAnswersAFullCodecInfo
	"A CodecInfo is a 4-tuple carrying six named callables.  The stub had only
	``.name'', which is exactly why ``codecs.lookup(enc).incrementaldecoder''
	-- what _pyio.TextIOWrapper does on every construction -- had nothing to
	reach for."

	self assert: (self reprAt: 'lookup_answers_a_full_codecinfo')
		equals: '[''utf-8'', True, True, True, True, True, True, 4]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testLookupNormalizesTheName
	"Case, hyphen/underscore and the alias table all collapse onto one codec.
	webencodings depends on it: its WHATWG label table hands over python names
	like 'iso-8859-1' that no module file is called."

	self assert: (self reprAt: 'lookup_normalizes_the_name')
		equals: '[''utf-8'', ''utf-8'', ''utf-8'', ''iso8859-1'', ''iso8859-1'', ''ascii'']'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAnUnknownEncodingIsALookupError
	"The stub's behaviour for EVERY name has to survive as the behaviour for
	an unknown one -- werkzeug's CharsetAccept catches exactly this and falls
	back to name.lower(), and it is still the only thing werkzeug wants."

	self assert: (self reprAt: 'an_unknown_encoding_is_a_lookuperror')
		equals: '''LookupError'''.
%

! ---- the codecs themselves ---------------------------------------------------

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testCodecsRoundTrip
	"utf-8 and the three utf-16 spellings, each encode-then-decode with the
	CONSUMED count checked as well: a codec that answered the right bytes and
	the wrong count would still break every incremental caller."

	self assert: (self reprAt: 'codecs_round_trip')
		equals: '[[True, True, True], [True, True, True], [True, True, True], [True, True, True]]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testSingleByteCodecsRoundTrip
	"latin-1 and ascii, separately from the multi-byte set because neither can
	carry the euro sign the other test round-trips."

	self assert: (self reprAt: 'single_byte_codecs_round_trip')
		equals: '[True, True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testEncodingACharacterTheCodecLacks
	"The strict policy raises UnicodeEncodeError rather than substituting
	something.  A codec that quietly replaced would pass every round-trip test
	above and be wrong in the way that matters on a wire."

	self assert: (self reprAt: 'encoding_a_character_the_codec_lacks')
		equals: '''UnicodeEncodeError'''.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAnIncrementalDecoderHoldsAPartialSequence
	"The one behaviour a stateless decode cannot fake, and the reason the
	registry has to hand out an incremental decoder at all: the two bytes of
	e-acute arrive in different chunks.  Decoding each chunk on its own raises
	on the truncated sequence; this holds it back and resumes."

	self assert: (self reprAt: 'an_incremental_decoder_holds_a_partial_sequence')
		equals: '[''h'', True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAnIncrementalDecoderResets
	"reset() drops the held-back partial sequence.  Without it the next
	decode would splice a stale byte onto the front of unrelated input."

	self assert: (self reprAt: 'an_incremental_decoder_resets') equals: '''ok'''.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAnIncrementalEncoderSpansChunks
	self assert: (self reprAt: 'an_incremental_encoder_spans_chunks')
		equals: '[b''caf'', b''\xc3\xa9'']'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAStreamWriterAndReader
	"codecs.getwriter / getreader over a stream that offers write/read and
	nothing else -- the two CodecInfo slots nobody had been able to reach."

	self assert: (self reprAt: 'a_stream_writer_and_reader')
		equals: '[b''caf\xc3\xa9\n'', True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testIterdecodeAndIterencode
	self assert: (self reprAt: 'iterdecode_and_iterencode')
		equals: '[True, b''caf\xc3\xa9'']'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testEncodeAndDecodeHelpers
	"codecs.encode / codecs.decode, the module-level pair.  These predate the
	registry -- pickle names _codecs.encode as the reconstructor for bytes
	under protocols 0-2 -- so the check is that adding a registry behind them
	did not move them."

	self assert: (self reprAt: 'encode_and_decode_helpers')
		equals: '[b''caf\xc3\xa9'', True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testTheEscapeCodecs
	"raw-unicode-escape and unicode-escape.  protobuf's pure-Python path
	imports encodings.raw_unicode_escape BY NAME, which is the literal text of
	its failure before this."

	self assert: (self reprAt: 'the_escape_codecs')
		equals: '[b''a\xe9\\u20ac'', b''a\\xe9'', True]'.
%

! ---- extensibility: register, register_error, charmap ------------------------

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testACustomCodecCanBeRegistered
	"codecs.register has to be more than a no-op: webencodings installs its own
	``replacement'' and ``x-user-defined'' codecs through it.

	This also pins the NAME a search function is handed, which is not the name
	the caller passed: runs of non-alphanumerics collapse to one underscore and
	the result is lowercased, so lookup('grail-test-upper') arrives as
	'grail_test_upper'.  A search function written against the older documented
	rule (spaces only) never matches its own name."

	self assert: (self reprAt: 'a_custom_codec_can_be_registered')
		equals: '[''grail-test-upper'', b''ABC'', ''abc'']'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testTheBuiltinErrorHandlersAreRegistered
	"strict / ignore / replace / xmlcharrefreplace / backslashreplace /
	namereplace resolve by name, and codecs.strict_errors and friends -- which
	are just lookup_error() calls at module scope -- resolve at import time.
	A missing one is an ImportError for the whole module, not a late failure."

	self assert: (self reprAt: 'the_builtin_error_handlers_are_registered')
		equals: '[True, True, True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testACustomErrorHandlerRoundTrips
	"register_error / lookup_error.  This pair already worked -- werkzeug.urls
	registers a percent-quote handler at import time -- and the check is that
	moving the table into _codecs kept it working."

	self assert: (self reprAt: 'a_custom_error_handler_round_trips')
		equals: 'True'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testAnUnknownErrorHandlerIsALookupError
	self assert: (self reprAt: 'an_unknown_error_handler_is_a_lookuperror')
		equals: '''LookupError'''.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testCharmapPrimitives
	"charmap_build / charmap_encode / charmap_decode: the three that
	webencodings' custom.py builds its codecs out of, and the reason
	``import webencodings'' needed more than a CodecInfo class."

	self assert: (self reprAt: 'charmap_primitives')
		equals: '[True, 3, b''ab\x80'', 3]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testCharmapUndefinedIsAnError
	"U+FFFE in a decoding table means UNDEFINED, not that character.  Strict
	raises; 'replace' answers U+FFFD.  A charmap that mapped the hole to the
	sentinel itself would round-trip and be silently wrong."

	self assert: (self reprAt: 'charmap_undefined_is_an_error')
		equals: '[''UnicodeDecodeError'', True]'.
%

category: 'Grail-Tests'
method: CodecsRegistryTestCase
testTheEncodingsPackageIsImportableByModuleName
	"The literal shape of protobuf's failure -- ``No module named
	'encodings.raw_unicode_escape''' -- plus the two pieces of the package the
	search function is built on: normalize_encoding, and the alias table that
	maps 'utf8' onto the module actually called utf_8."

	self assert: (self reprAt: 'the_encodings_package_is_importable_by_module_name')
		equals: '[''raw-unicode-escape'', ''utf-8'', ''UTF_8'', ''utf_8'']'.
%
