Class {
	#name : 'StructModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StructModuleTestCase >> assertMatchesCPythonAt: key [
	self
		assert: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key) asString
		equals: ((testModule @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
StructModuleTestCase >> setUp [
	"Reload tests/python/struct_module.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'struct_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/struct_module.py')
		name: 'struct_module'.

]

{ #category : 'Grail-Tests - Range' }
StructModuleTestCase >> testAFloatIsNotAnIntegerButABoolIs [
	"CPython rejects 1.0 for an integer code and accepts True."

	self assertMatchesCPythonAt: 'float_for_int'.
	self assertMatchesCPythonAt: 'bool_for_int'.

]

{ #category : 'Grail-Tests - Format Strings' }
StructModuleTestCase >> testAFormatMayBeBytesButMayNotContainANull [
	"#asString on a ByteArray answers its PRINT string, so a bytes
	format used to be parsed as the literal text 'aByteArray' -- every
	character bad, and Struct.format reporting that back."

	self assertMatchesCPythonAt: 'bytes_format'.
	self assertMatchesCPythonAt: 'bytes_format_type'.
	self assertMatchesCPythonAt: 'embedded_null'.
	self assertMatchesCPythonAt: 'repeat_no_code'.

]

{ #category : 'Grail-Tests - Format Strings' }
StructModuleTestCase >> testANonAsciiFormatIsAUnicodeEncodeError [
	"A format is ASCII-ENCODED first, so ANY code point above 127 fails
	the same way, naming its POSITION and the character's Python escape.
	A lone surrogate is not a special case -- it is simply the one Grail
	cannot put in a Smalltalk String.

	That last point is why the code points are checked BEFORE coercing:
	coercing first let Grail's internal NotImplementedError (``does not
	support coerced to a Smalltalk string'') escape to the caller in
	place of the UnicodeEncodeError CPython raises, which no portable
	``except UnicodeEncodeError'' could catch."

	self assertMatchesCPythonAt: 'nonascii_latin1'.
	self assertMatchesCPythonAt: 'nonascii_bmp'.
	self assertMatchesCPythonAt: 'lone_surrogate'.
	self assertMatchesCPythonAt: 'surrogate_position'.
	self assertMatchesCPythonAt: 'surrogate_in_struct'.

]

{ #category : 'Grail-Tests - Struct' }
StructModuleTestCase >> testARejectedFormatLeavesTheInstanceUsable [
	"Struct precompiles, so the format is validated BEFORE it is stored.
	Storing first left the instance holding a format it could neither
	pack nor unpack with -- and CPython packs with the OLD format after
	a rejected ``__init__''."

	self assertMatchesCPythonAt: 'reinit_rejected'.
	self assertMatchesCPythonAt: 'reinit_keeps_old_format'.
	self assertMatchesCPythonAt: 'reinit_still_packs'.
	self assertMatchesCPythonAt: 'bad_format_at_construction'.

]

{ #category : 'Grail-Tests - Bool' }
StructModuleTestCase >> testBoolPacksTruthinessAndUnpacksAnyNonZeroByte [
	"Unpacking a bool raised an uncatchable MessageNotUnderstood for
	every input -- ``= 0 not'' sent #not to the SmallInteger 0, because
	unary binds tighter than binary."

	self assertMatchesCPythonAt: 'bool_pack_list'.
	self assertMatchesCPythonAt: 'bool_pack_three'.
	self assertMatchesCPythonAt: 'bool_unpack_one'.
	self assertMatchesCPythonAt: 'bool_unpack_seven'.
	self assertMatchesCPythonAt: 'bool_unpack_zero'.

]

{ #category : 'Grail-Tests - struct.error' }
StructModuleTestCase >> testErrorIsItsOwnClassAndNotAValueError [
	"struct.error subclasses Exception DIRECTLY.  Raising ValueError
	instead got the hierarchy wrong in BOTH directions: the name did not
	exist to be caught, and an unrelated ``except ValueError'' caught
	what CPython would let propagate."

	self assertMatchesCPythonAt: 'error_name'.
	self assertMatchesCPythonAt: 'error_module'.
	self assertMatchesCPythonAt: 'error_is_exception'.
	self assertMatchesCPythonAt: 'error_is_not_valueerror'.
	self assertMatchesCPythonAt: 'caught_by_struct_error'.
	self assertMatchesCPythonAt: 'not_caught_as_valueerror'.

]

{ #category : 'Grail-Tests - Float' }
StructModuleTestCase >> testHalfFloatRoundTrips [
	"``e'' was rejected outright as a bad format char."

	self assertMatchesCPythonAt: 'half_size'.
	self assertMatchesCPythonAt: 'half_round_trip'.
	self assertMatchesCPythonAt: 'half_precision'.
	self assertMatchesCPythonAt: 'half_overflow'.

]

{ #category : 'Grail-Tests - Buffer API' }
StructModuleTestCase >> testIterUnpackWalksFixedSizeRecords [
	"A ragged buffer and a zero-length record are BOTH errors; the zero
	case would otherwise loop forever."

	self assertMatchesCPythonAt: 'iter_unpack'.
	self assertMatchesCPythonAt: 'iter_unpack_ragged'.
	self assertMatchesCPythonAt: 'iter_unpack_empty_fmt'.

]

{ #category : 'Grail-Tests - Layout' }
StructModuleTestCase >> testNAndCapitalNAreNativeOnly [
	"n/N exist natively and are an ERROR under a standard prefix, rather
	than silently taking some other size."

	self assertMatchesCPythonAt: 'native_n'.
	self assertMatchesCPythonAt: 'standard_n'.
	self assertMatchesCPythonAt: 'native_n_roundtrip'.

]

{ #category : 'Grail-Tests - Float' }
StructModuleTestCase >> testNaNSurvivesAsNaNAndInfinityKeepsItsSign [
	"NaN missed an ``abs > fmax'' check -- every comparison involving
	NaN is false -- so it looked finite with an exponent of 1024 and
	raised OverflowError.  Decoding collapsed NaN to infinity, turning a
	round trip into a value change rather than an error."

	self assertMatchesCPythonAt: 'nan_round_trip'.
	self assertMatchesCPythonAt: 'inf_round_trip'.
	self assertMatchesCPythonAt: 'inf_sign_kept'.

]

{ #category : 'Grail-Tests - Layout' }
StructModuleTestCase >> testNativeLongIsEightBytesAndStandardLongIsFour [
	"l/L are the codes whose SIZE depends on the mode, and native is the
	default -- so a bare 'l' is 8 bytes, not 4."

	self assertMatchesCPythonAt: 'native_long'.
	self assertMatchesCPythonAt: 'standard_long'.

]

{ #category : 'Grail-Tests - Layout' }
StructModuleTestCase >> testNativeModePadsAndStandardModeDoesNot [
	"The default (unprefixed) mode is the PADDING one, which is the
	surprising half: calcsize('ci') is 8, not 5."

	self assertMatchesCPythonAt: 'native_ci'.
	self assertMatchesCPythonAt: 'standard_ci'.
	self assertMatchesCPythonAt: 'native_pack_ci'.
	self assertMatchesCPythonAt: 'standard_pack_ci'.

]

{ #category : 'Grail-Tests - Range' }
StructModuleTestCase >> testOutOfRangeIntegersRaiseInsteadOfTruncating [
	"pack('B', 256) answered b'\\x00' before: the round trip returned a
	different number with nothing to notice."

	self assertMatchesCPythonAt: 'byte_256'.
	self assertMatchesCPythonAt: 'byte_neg'.
	self assertMatchesCPythonAt: 'short_big'.

]

{ #category : 'Grail-Tests - Buffer API' }
StructModuleTestCase >> testPackIntoWritesInPlaceAndRejectsAnImmutableTarget [
	"pack_into did not exist at all.  bytes is immutable and must be a
	TypeError; a bogus OFFSET is also a TypeError, NOT a struct.error."

	self assertMatchesCPythonAt: 'pack_into'.
	self assertMatchesCPythonAt: 'pack_into_immutable'.
	self assertMatchesCPythonAt: 'pack_into_overflow'.
	self assertMatchesCPythonAt: 'pack_into_bad_offset_kind'.

]

{ #category : 'Grail-Tests - Strings' }
StructModuleTestCase >> testPascalStringsStoreALengthByteAndTruncate [
	"``p'' was unimplemented.  An over-long value truncates rather than
	raising, and the STORED length follows the truncation."

	self assertMatchesCPythonAt: 'pascal_pack'.
	self assertMatchesCPythonAt: 'pascal_unpack'.
	self assertMatchesCPythonAt: 'pascal_truncates'.

]

{ #category : 'Grail-Tests - Float' }
StructModuleTestCase >> testSinglePrecisionRoundsToNearestRatherThanTruncating [
	"The carry out of the discarded mantissa bits must propagate into
	the exponent.  Truncating returned the neighbouring float, so the
	round trip silently changed the value -- CPython's test_705836
	exists for precisely this."

	self assertMatchesCPythonAt: 'float_rounds_to_nearest'.

]

{ #category : 'Grail-Tests - Struct' }
StructModuleTestCase >> testStructMirrorsTheModuleBufferAPI [
	"Struct grew the same entry points as the module, including the
	keyword form of unpack_from's offset."

	self assertMatchesCPythonAt: 'struct_iter_unpack'.
	self assertMatchesCPythonAt: 'struct_unpack_from_kw'.

]

{ #category : 'Grail-Tests - Struct' }
StructModuleTestCase >> testStructReprAndReinitialization [
	"__init__ is RE-CALLABLE in CPython: it repoints an existing Struct
	at a new format."

	self assertMatchesCPythonAt: 'struct_repr'.
	self assertMatchesCPythonAt: 'struct_reinit_format'.
	self assertMatchesCPythonAt: 'struct_reinit_pack'.

]

{ #category : 'Grail-Tests - Layout' }
StructModuleTestCase >> testThereIsNoTrailingPaddingButAZeroCountStillAligns [
	"Unlike a C struct, the total is NOT rounded up to the widest
	member -- calcsize('@qc') is 9.  A zero repeat count still aligns,
	which is the only reason to write ``0i''."

	self assertMatchesCPythonAt: 'no_trailing_pad'.
	self assertMatchesCPythonAt: 'zero_count_aligns'.

]

{ #category : 'Grail-Tests - Buffer API' }
StructModuleTestCase >> testUnpackFromAcceptsAnOffsetIncludingANegativeOne [
	"A negative offset counts back from the end, as everywhere else in
	Python, and running off either end is an error rather than a read of
	whatever happened to be there."

	self assertMatchesCPythonAt: 'unpack_from'.
	self assertMatchesCPythonAt: 'unpack_from_offset'.
	self assertMatchesCPythonAt: 'unpack_from_negative'.
	self assertMatchesCPythonAt: 'unpack_from_short'.
	self assertMatchesCPythonAt: 'unpack_from_far_neg'.

]

{ #category : 'Grail-Tests - Buffer API' }
StructModuleTestCase >> testUnpackRequiresAnExactBufferAndARealBytesLike [
	"A LONG buffer used to unpack fine and silently drop the tail; a
	non-buffer raised a raw Smalltalk MessageNotUnderstood, which no
	Python except can catch."

	self assertMatchesCPythonAt: 'unpack_exact'.
	self assertMatchesCPythonAt: 'unpack_too_long'.
	self assertMatchesCPythonAt: 'unpack_not_bytes'.

]
