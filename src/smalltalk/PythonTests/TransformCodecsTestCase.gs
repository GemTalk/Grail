! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TransformCodecsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
TransformCodecsTestCase comment:
'The bytes-to-bytes transform codecs, and the three things under them.

``codecs.encode(data, ''base64_codec'')'' is not a text encoding: it takes
bytes and answers bytes.  CPython ships base64, uu, quopri, hex and zlib
(bz2 where the library is there), plus ``rot_13'', which is the mirror
case, str to str.  Grail shipped none, so each answered ``LookupError:
unknown encoding''.

They are pure Python upstream too, and porting them was the small part.
Three things underneath were not:

  * int() STRIPPED A PREFIX WHATEVER THE BASE.  ``int(''0b1'', 16)'' is 177
    -- in base 16, ``0'' and ``b'' are two digits -- and Grail answered 1,
    having taken ``0b'' as a prefix and switched to base 2.  A wrong
    ANSWER, not an error, and the hex codec walked straight into it: every
    input byte whose hex is 0b decoded to 1.  A 256-value round trip is
    what noticed, because it disagreed with itself.

  * codecs.encode / decode CALLED THE OBJECT.  Grail shortcut a str
    through str.encode and reached the registry only on LookupError.  A
    non-str has no ``.encode'' to shortcut through, and the transform
    codecs are exactly the ones whose input is not a str -- so
    codecs.encode(b''..'', ''base64_codec'') died with ``''ByteArray''
    object has no attribute ''encode''''.

  * THE DENYLIST.  A transform codec must not be reachable from
    str.encode / bytes.decode at all.  CodecInfo has carried
    ``_is_text_encoding'' all along and nothing read it, because no
    shipped codec set it false; registering these without the check would
    have made ``''x''.encode(''base64'')'' quietly answer base64 of the UTF-8
    BYTES instead of raising.  CPython''s refusal names the way out, and
    quotes the encoding AS THE CALLER WROTE IT -- which bytes.decode had
    already normalised, so the message named an encoding nobody typed.

Under the codecs, binascii grew ``b2a_hex''/``a2b_hex'', hexlify''s
separator argument, and the ``b2a_uu''/``a2b_uu'' pair the uu codec is a
wrapper over; all four were checked against CPython''s C versions rather
than against their own output.

Took test.test_codecs 107 -> 89.

See tests/python/transform_codecs.py (17 checks, CPython-validated
first).'
%

expectvalue /Class
doit
TransformCodecsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
TransformCodecsTestCase removeAllMethods: 0.
TransformCodecsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: TransformCodecsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'transform_codecs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/transform_codecs.py')
		name: 'transform_codecs'.
%

category: 'Grail-Helpers'
method: TransformCodecsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: TransformCodecsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testTheBinasciiUnderneath
	"Checked against CPython's C implementations over every shape that
	differs -- odd lengths, both grouping directions, the 45-byte uu
	line limit -- rather than against their own output."

	self assertAll: #('hex_primitives' 'hexlify_with_a_separator'
		'uu_primitives' 'hex_rejects_bad_input')
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testEveryTransformRoundTripsAll256Bytes
	"The check that caught int('0b1', 16): a codec that decodes 0b to 1
	still round-trips most inputs, and disagrees with itself on the rest."

	self assertAll: #('round_trips' 'encode_decode_helpers' 'incremental')
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testTheAliasesReachTheSameCodec
	"``base64''/``base_64'', ``quoted_printable'', ``zip'' -- aliases.py is
	CPython's verbatim, so shipping the module is all any of them needed."

	self assertAll: #('aliases_resolve')
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testRot13IsTheStrToStrCase
	"Same denylist, opposite types.  Its map is built rather than
	transcribed, and is identical to upstream's 100-line literal."

	self assertAll: #('rot13' 'rot13_incremental')
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testNoneOfThemIsReachableFromStrEncode
	"The half that had to land WITH the codecs: registering them without
	this would have made ``'x'.encode('base64')'' answer base64 of the
	UTF-8 bytes rather than raise.  LookupError, naming the encoding as
	the caller wrote it, with no __cause__."

	self assertAll: #('str_encode_denylists_binary_transforms'
		'bytes_decode_denylists_binary_transforms'
		'str_encode_denylists_rot13' 'bytes_decode_denylists_rot13'
		'text_codecs_unaffected')
%

category: 'Grail-Tests'
method: TransformCodecsTestCase
testTheErrorsTheCodecsRaise
	"A uu stream with no ``begin'' line, and a binascii.Error that
	propagates out of the codec rather than being flattened."

	self assertAll: #('uu_rejects_truncated' 'hex_error_propagates')
%
