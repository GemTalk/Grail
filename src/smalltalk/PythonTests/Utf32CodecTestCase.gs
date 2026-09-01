! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Utf32CodecTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Utf32CodecTestCase comment:
'The UTF-32 codec family: utf-32, utf-32-le, utf-32-be.

Grail shipped utf-8 and utf-16 but not utf-32, so every spelling raised
``unknown encoding'' -- 33 tests in test_codecs, most of them the
incremental and stream cases the shared ReadTest base drives.

UTF-32 is the simpler of the two multi-byte families: every code point is
exactly ONE four-byte unit, so there are no surrogate PAIRS to straddle a
chunk boundary and an incremental decoder''s held-back tail is just
``len % 4''.  What it shares with UTF-16 is a byte ORDER, so the same
BOM-sniffing dance applies.

Three layers, all pure Python: the byte maths and the BOM/incremental
logic as _codecs entry points, the names exported from codecs.py, and
utf_32 / utf_32_le / utf_32_be in the encodings package (modelled on the
utf_16 trio, carrying the same Grail edit -- a class-body binding of a
codec entry point becomes a def, because Grail installs a self-passing
forwarder where CPython relies on a C function not becoming a method).
No Smalltalk encoding table was touched: str.encode reaches these through
the codec registry, which keeps the encodings package the single door.

One fix came out of it.  ``bytes.decode(encoding, errors)'' dropped the
errors argument when it fell through to the one-argument form, so every
codec behaved as ``strict''; the registry is now consulted where errors
still exists.  Two related gaps are documented rather than fixed
(docs/Issues.md): the encode side ignores the policy for a lone surrogate
in EVERY codec, and a shipped codec is reachable from str.encode only
once ``codecs'' is imported.

See tests/python/utf32_codec.py (26 checks, CPython-validated first).'
%

expectvalue /Class
doit
Utf32CodecTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Utf32CodecTestCase removeAllMethods: 0.
Utf32CodecTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Utf32CodecTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'utf32_codec' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/utf32_codec.py')
		name: 'utf32_codec'.
%

category: 'Grail-Helpers'
method: Utf32CodecTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Utf32CodecTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Utf32CodecTestCase
testTheThreeSpellingsEncodeAndDecode
	"Registry lookup, the bare LE/BE forms, and the BOM form -- whose mark
	is native order, so it is checked as ``one of the two'' rather than
	pinned to this machine."

	self assertAll: #('lookup_utf_32' 'lookup_utf_32_le' 'lookup_utf_32_be'
		'encode_le' 'encode_be' 'encode_bom_has_a_bom' 'encode_bom_length'
		'decode_le' 'decode_be' 'decode_bom_le' 'decode_bom_be')
%

category: 'Grail-Tests'
method: Utf32CodecTestCase
testRoundTripsAndAliases
	"Text with non-BMP content survives all three forms; a non-BMP point is
	ONE unit here where UTF-16 needs a surrogate pair; and the alias
	spellings reach the same codec."

	self assertAll: #('round_trip_bom' 'round_trip_le' 'round_trip_be'
		'non_bmp_is_one_unit' 'utf_16_needs_two_units' 'alias_utf32'
		'alias_u32' 'alias_underscore')
%

category: 'Grail-Tests'
method: Utf32CodecTestCase
testIncrementalDecoding
	"What an incremental decoder is FOR: a chunk ending mid-unit yields
	nothing for those bytes and picks them up next time -- including a BOM
	split across the boundary."

	self assertAll: #('incremental_split_mid_unit'
		'incremental_bom_then_body' 'incremental_bom_split')
%

category: 'Grail-Tests'
method: Utf32CodecTestCase
testTheErrorCases
	"A lone surrogate and an out-of-range unit raise, and a truncated FINAL
	chunk raises rather than waiting for more input that will not come.

	The errors POLICIES are deliberately not pinned here: Grail drops the
	errors argument on the way to a table-backed codec, so no such codec
	honours one -- utf-8 and utf-16 included.  Pinning it would be testing
	that pre-existing gap rather than utf-32; docs/Issues.md carries it."

	self assertAll: #('lone_surrogate_encode_raises'
		'out_of_range_decode_raises' 'truncated_final_raises')
%
