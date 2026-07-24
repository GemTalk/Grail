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
