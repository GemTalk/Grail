! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BytesSubclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytesSubclassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BytesSubclassTestCase comment:
'``class X(bytes)`` / ``class X(bytearray)`` -- Grail''s byte-format-subclass
mechanism (the bytes analog of str subclassing).  Construction routes through
the self-typed ``bytes>>__new__:'' (ClassDefAst firstBaseIsBytesLike), so
instances are the SUBCLASS type and carry the content; Class>>___subclass___
retries with no named instVars for a byte-format base so ``__slots__'' fall to
dynamic instVars; and bytes/bytearray ``__class__'' returns the receiver''s
actual class so ``type(instance)'' is the subclass while a plain bytes/bytearray
still reports bytes/bytearray.'
%

expectvalue /Class
doit
BytesSubclassTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
BytesSubclassTestCase removeAllMethods: 0.
BytesSubclassTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BytesSubclassTestCase
setUp
	"Load tests/python/bytes_subclass.py fresh."

	importlib @env1:modules removeKey: #'bytes_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bytes_subclass.py')
		name: 'bytes_subclass'.
%

category: 'Grail-Helpers'
method: BytesSubclassTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - bytes subclass'
method: BytesSubclassTestCase
testBytesSubclass
	"``class MyBytes(bytes)'': self-typed populated construction, isinstance,
	content/indexing, empty, equality, per-instance attribute, inherited method."

	#('bytes_type_is_subclass' 'bytes_isinstance_self' 'bytes_isinstance_bytes'
	  'bytes_content' 'bytes_index' 'bytes_empty' 'bytes_eq_plain' 'bytes_attr'
	  'bytes_method') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - bytearray subclass'
method: BytesSubclassTestCase
testByteArraySubclass
	"``class MyBA(bytearray)'': self-typed populated construction, isinstance,
	content, empty, equality, per-instance attribute, in-place mutation, and
	__slots__ (stored as dynamic instVars on a byte-format subclass)."

	#('ba_type_is_subclass' 'ba_isinstance_self' 'ba_isinstance_bytearray'
	  'ba_content' 'ba_empty' 'ba_eq_plain' 'ba_attr' 'ba_mutate' 'slots') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - type distinction'
method: BytesSubclassTestCase
testByteArrayIsNotBytes
	"CPython: bytes and bytearray are DISTINCT types -- neither is a subclass
	of the other -- even though Grail stores bytearray as a ByteArray(=bytes)
	subclass for storage/method reuse.  isinstance/issubclass must reflect the
	distinction (both directions, plus subclasses), while the positive checks
	still hold."

	#('ba_not_isinstance_bytes' 'bytes_not_isinstance_bytearray'
	  'ba_not_subclass_bytes' 'bytes_not_subclass_bytearray'
	  'bytes_is_bytes' 'ba_is_bytearray') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - bytes-like arguments'
method: BytesSubclassTestCase
testBytesMethodsAcceptBytesLikeArguments
	"bytes methods accept any bytes-like ARGUMENT (a bytearray -- and its
	subclasses), matching CPython: split/replace/find/count/startswith/
	endswith, concatenation, ==, and the bytes() constructor.  A str is still
	rejected (not bytes-like)."

	#('arg_split_ba' 'arg_replace_ba' 'arg_find_ba' 'arg_count_ba'
	  'arg_startswith_ba' 'arg_endswith_ba' 'arg_concat_ba' 'arg_eq_ba'
	  'arg_ctor_ba' 'arg_reject_str') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - whitespace split'
method: BytesSubclassTestCase
testWhitespaceSplitWithMaxsplit
	"split(None, maxsplit) / rsplit(None, maxsplit) split on runs of ASCII
	whitespace and honor maxsplit -- the piece after the split limit is kept
	whole (leading whitespace stripped, internal/trailing retained); rsplit
	counts from the right."

	#('ws_split_1' 'ws_split_2' 'ws_split_0' 'ws_split_lead' 'ws_split_empty'
	  'ws_split_none' 'ws_rsplit_1' 'ws_rsplit_2' 'ws_rsplit_pad') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - tuple prefix'
method: BytesSubclassTestCase
testStartswithEndswithTuplePrefix
	"startswith/endswith accept a TUPLE of prefixes/suffixes -- True if the
	receiver starts/ends with ANY element (also with start/end bounds) -- and
	raise a TypeError naming both 'bytes' and 'tuple' for a non-bytes/non-tuple
	argument.  removeprefix/removesuffix take a single bytes-like object and
	must still REJECT a tuple."

	#('tup_startswith_any' 'tup_startswith_bounded' 'tup_startswith_empty'
	  'tup_endswith_any' 'tup_bad_arg_msg' 'removeprefix_ok' 'removesuffix_ok'
	  'removeprefix_rejects_tuple') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - codecs'
method: BytesSubclassTestCase
testCodecEncodeDecode
	"Encode/decode codecs: UTF-8 (multi-byte) and UTF-16 round-trip, the bytes
	constructor agrees with str.encode, latin-1 raises (strict) / drops (ignore),
	and decode honors the default utf-8, 'ignore', keyword args, strict errors,
	and the bytearray path."

	#('codec_utf8_roundtrip' 'codec_utf16_roundtrip' 'codec_utf8_ctor_eq_encode'
	  'codec_utf16_ctor_eq_encode' 'codec_latin1_raises' 'codec_latin1_ignore'
	  'codec_decode_default_multibyte' 'codec_decode_ignore' 'codec_decode_kwargs'
	  'codec_decode_strict_raises' 'codec_bytearray_utf16') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - None search bounds'
method: BytesSubclassTestCase
testSearchAcceptsNoneBounds
	"find/rfind/index/rindex/count and the bounded startswith/endswith accept
	None for start/end (== the default bound), matching CPython -- both the
	all-None form and None mixed with a real bound; inherited by bytearray."

	#('none_find' 'none_rfind' 'none_index' 'none_rindex' 'none_count'
	  'none_find_realstart' 'none_find_realend' 'none_startswith'
	  'none_endswith' 'none_startswith_realstart' 'none_bytearray_find') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - search bounds'
method: BytesSubclassTestCase
testSearchBoundsEdges
	"An empty subsequence is always contained (so rfind/index/rindex agree
	with ``in'' for an empty needle), and bytearray.find (which overrides
	bytes) counts a negative start/end from the end rather than clamping to 0."

	#('contains_empty_bytes' 'contains_empty_in_empty' 'contains_empty_bytearray'
	  'rfind_empty_matches_contains' 'index_empty_no_raise' 'ba_find_neg_start'
	  'ba_find_neg_start_found' 'ba_index_neg_raises') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - hex separator'
method: BytesSubclassTestCase
testHexSeparator
	"hex(sep[, bytes_per_sep]): a one-ASCII-character separator (str or bytes)
	between byte groups -- positive bytes_per_sep counts from the right,
	negative from the left, 0 or |n| >= len yields no separator; the keyword
	form and bytearray are covered; an empty/multi-char/non-ASCII sep raises
	ValueError and a None sep raises TypeError."

	#('hex_sep_default' 'hex_sep_bytes' 'hex_sep_pos2' 'hex_sep_neg2'
	  'hex_sep_zero' 'hex_sep_ge_len' 'hex_sep_six_from_right'
	  'hex_sep_six_from_left' 'hex_sep_null' 'hex_sep_del7f' 'hex_kw'
	  'hex_bytearray_sep' 'hex_empty_sep_raises' 'hex_multichar_sep_raises'
	  'hex_nonascii_sep_raises' 'hex_none_sep_raises') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - slice deletion'
method: BytesSubclassTestCase
testDeleteSlice
	"del bytearray[i:j[:k]] -- a contiguous run (step 1, incl. negative bounds
	and the whole [:]), an extended slice (positive and negative step), and a
	delete-then-extend resize -- all resizing the bytearray in place."

	#('del_slice_step1' 'del_slice_neg' 'del_slice_all' 'del_slice_step2'
	  'del_slice_neg_step' 'del_slice_big' 'del_slice_backward'
	  'set_slice_backward') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - __index__ coercion'
method: BytesSubclassTestCase
testIndexCoercion
	"__index__ coercion: bytearray __setitem__ value and index position, the
	bytes/bytearray constructor elements, and an __index__ object used as a
	count source -- with CPython's error kinds (ValueError / TypeError /
	IndexError, and a raising __index__ propagating its own exception).  The
	index is coerced before the bounds check, so an __index__ that clears the
	buffer yields IndexError."

	#('setitem_index_value' 'setitem_index_position' 'setitem_neg_value_raises'
	  'setitem_object_value_raises' 'setitem_oob_raises' 'mutating_index_oob'
	  'mutating_value_oob'
	  'ctor_from_index' 'ctor_from_index_bytearray' 'ctor_index_neg_raises'
	  'ctor_index_256_raises' 'ctor_reject_str_elem' 'ctor_reject_float_elem'
	  'ctor_reject_none_elem' 'ctor_source_index' 'ctor_source_index_raises') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - extend'
method: BytesSubclassTestCase
testExtendIterable
	"bytearray.extend accepts any iterable of ints -- range, generator,
	iterator, map, the receiver itself, and __index__ elements -- validates
	every element before mutating (a bad element leaves it unchanged), and
	rejects a str or a non-iterable with CPython's by-name TypeError."

	#('extend_range' 'extend_generator' 'extend_iterator' 'extend_map'
	  'extend_self' 'extend_index_elem' 'extend_atomic_valueerror'
	  'extend_str_rejected' 'extend_float_rejected') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - fromhex'
method: BytesSubclassTestCase
testFromHex
	"bytes/bytearray.fromhex: hex-digit pairs with ASCII whitespace ignored
	between pairs, a str or bytes-like argument, self-typed result, and
	CPython's error kinds -- TypeError for a non-(str|bytes-like) arg (naming
	the type), ValueError for an odd count / a non-ASCII-whitespace or invalid
	character (reporting the 0-based position)."

	#('fromhex_basic' 'fromhex_ws' 'fromhex_ws_kinds' 'fromhex_empty'
	  'fromhex_bytes_arg' 'fromhex_array_arg' 'fromhex_bytearray_type' 'fromhex_bytearray_val'
	  'fromhex_reject_int' 'fromhex_reject_tuple' 'fromhex_odd'
	  'fromhex_pos_first' 'fromhex_pos_second' 'fromhex_pos_ws_in_pair'
	  'fromhex_nonascii_ws' 'fromhex_single_char') do: [:key |
		self assert: ((self resultAt: key) = true) description: key]
%

category: 'Grail-Tests - base types'
method: BytesSubclassTestCase
testBaseTypesUnaffected
	"The __class__ = ``self class'' change must not disturb the base types:
	``type(b'abc') is bytes'' and ``type(bytearray(b'x')) is bytearray''."

	self assert: ((self resultAt: 'base_bytes_type') = true)
		description: 'base_bytes_type'.
	self assert: ((self resultAt: 'base_bytearray_type') = true)
		description: 'base_bytearray_type'
%
