! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ZlibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ZlibTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ZlibTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ZlibTestCase removeAllMethods: 0.
ZlibTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testRoundTrip
	"compress/decompress round-trips; output carries the standard zlib
	header (0x78 0x9C at default level); repetitive data shrinks."

	| result |
	result := self eval: 'import zlib
payload = ("the quick brown fox " * 50).encode()
packed = zlib.compress(payload)
back = zlib.decompress(packed)
(back == payload and len(packed) < len(payload)
 and packed[0] == 120 and packed[1] == 156
 and isinstance(packed, bytes))'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testCompressionLevels
	"Level 0 stores (bigger than level 9); an out-of-range level raises
	zlib.error."

	| result |
	result := self eval: 'import zlib
payload = ("abcabcabc" * 100).encode()
stored = zlib.compress(payload, 0)
best = zlib.compress(payload, 9)
try:
    zlib.compress(payload, 99)
    bad_level = False
except zlib.error:
    bad_level = True
(len(stored) > len(best)
 and zlib.decompress(stored) == payload
 and zlib.decompress(best) == payload
 and bad_level)'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testEmptyData
	| result |
	result := self eval: 'import zlib
packed = zlib.compress(b"")
zlib.decompress(packed) == b"" and len(packed) > 0'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testLargeDataGrowsBuffer
	"Decompressed size far exceeds the default 16384-byte buffer, so
	the Z_BUF_ERROR retry loop must grow it."

	| result |
	result := self eval: 'import zlib
payload = ("0123456789abcdef" * 16384).encode()
packed = zlib.compress(payload)
back = zlib.decompress(packed)
len(payload) == 262144 and back == payload'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testCorruptAndTruncatedRaise
	| result |
	result := self eval: 'import zlib
try:
    zlib.decompress(b"this is not a zlib stream")
    a = False
except zlib.error:
    a = True
packed = zlib.compress(("data " * 100).encode())
try:
    zlib.decompress(packed[:10])
    b = False
except zlib.error:
    b = True
a and b'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testChecksums
	"Known-answer values from CPython, plus running-checksum chaining
	and the empty-input identities."

	| result |
	result := self eval: 'import zlib
(zlib.crc32(b"hello") == 907060870
 and zlib.adler32(b"hello") == 103547413
 and zlib.crc32(b"llo", zlib.crc32(b"he")) == zlib.crc32(b"hello")
 and zlib.adler32(b"llo", zlib.adler32(b"he")) == zlib.adler32(b"hello")
 and zlib.crc32(b"") == 0 and zlib.adler32(b"") == 1)'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testStrArgRaisesTypeError
	self
		should: [self eval: 'import zlib
zlib.compress("not bytes")']
		raise: TypeError
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testUnsupportedFormsRaise
	"Raw-deflate wbits and the streaming objects are documented V1
	gaps with clear errors."

	| result |
	result := self eval: 'import zlib
packed = zlib.compress(b"x")
try:
    zlib.decompress(packed, -15)
    a = False
except zlib.error:
    a = True
try:
    zlib.compressobj()
    b = False
except NotImplementedError:
    b = True
a and b'.
	self assert: result
%

category: 'Grail-Tests - zlib'
method: ZlibTestCase
testConstants
	| result |
	result := self eval: 'import zlib
(zlib.MAX_WBITS == 15 and zlib.DEFLATED == 8
 and zlib.Z_BEST_COMPRESSION == 9 and zlib.Z_DEFAULT_COMPRESSION == -1
 and zlib.error is not None)'.
	self assert: result
%
