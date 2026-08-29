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
testCompressobjStillUnsupported
	"The COMPRESSING half of the z_stream API is still a documented gap.
	Decompression is not: see the streaming tests below."

	| result |
	result := self eval: 'import zlib
try:
    zlib.compressobj()
    b = False
except NotImplementedError:
    b = True
b'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testDecompressobjChunked
	"decompressobj() inflates across arbitrary input chunk boundaries and
	reassembles byte-identical output; eof flips only at the end marker."

	| result |
	result := self eval: 'import zlib
payload = ("the quick brown fox " * 500).encode()
packed = zlib.compress(payload)
d = zlib.decompressobj()
out = b""
mid_eof = None
for i in range(0, len(packed), 7):
    out += d.decompress(packed[i:i+7])
    if mid_eof is None and i == 0:
        mid_eof = d.eof
out += d.flush()
(out == payload and d.eof and mid_eof is False
 and d.unused_data == b"" and d.unconsumed_tail == b"")'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testRawDeflateFromCPython
	"RAW DEFLATE (wbits -15) is what every zip entry holds, and libz''s
	one-shot uncompress() cannot read it.  The fixture below was produced
	by CPython''s zlib.compressobj(9, DEFLATED, -15) -- decompressing it
	is a round trip against ANOTHER TOOL, not against ourselves."

	| result |
	result := self eval: 'import zlib
raw = bytes.fromhex("4b2f4acccc51282e294a4dcccdcc4b57c8cc4bcb492c495548cbac28292d4ae54a1fe6f200")
expected = b"grail streaming inflate fixture\n" * 8
one_shot = zlib.decompress(raw, -15)
d = zlib.decompressobj(-15)
streamed = b"".join(d.decompress(raw[i:i+5]) for i in range(0, len(raw), 5)) + d.flush()
(one_shot == expected and streamed == expected and len(expected) == 256)'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testGzipWbitsFromCPython
	"wbits 31 (gzip framing) and 47 (auto-detect) both read a real
	gzip member produced by CPython''s gzip.compress()."

	| result |
	result := self eval: 'import zlib
gz = bytes.fromhex("1f8b08000000000002ff4b2f4acccc51282e294a4dcccdcc4b57c8cc4bcb492c"
                   "495548cbac28292d4ae54a1fe6f2009f68ff8400010000")
expected = b"grail streaming inflate fixture\n" * 8
(zlib.decompress(gz, 31) == expected
 and zlib.decompress(gz, 47) == expected
 and zlib.decompress(zlib.compress(expected), 47) == expected)'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testMaxLengthAndUnconsumedTail
	"decompress(data, max_length) caps the OUTPUT and parks the rest of
	the input in unconsumed_tail, which the next call picks up."

	| result |
	result := self eval: 'import zlib
payload = ("0123456789abcdef" * 8192).encode()
packed = zlib.compress(payload)
d = zlib.decompressobj()
first = d.decompress(packed, 100)
capped = (len(first) == 100 and len(d.unconsumed_tail) > 0 and not d.eof)
out = first
while not d.eof:
    chunk = d.decompress(b"", 4096)
    if len(chunk) == 0 and len(d.unconsumed_tail) == 0:
        break
    out += chunk
(capped and out == payload and len(payload) == 131072)'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testTrailingBytesBecomeUnusedData
	"Bytes past the stream''s end marker are not an error -- they are
	unused_data.  zipfile and tarfile both rely on this."

	| result |
	result := self eval: 'import zlib
payload = b"payload that compresses" * 20
packed = zlib.compress(payload)
d = zlib.decompressobj()
out = d.decompress(packed + b"TRAILER")
(out == payload and d.eof and d.unused_data == b"TRAILER")'.
	self assert: result
%

category: 'Grail-Tests - zlib streaming'
method: ZlibTestCase
testBadWbitsRaises
	| result |
	result := self eval: 'import zlib
bad = 0
for wb in (3, 7, 0, 100, -20):
    try:
        zlib.decompressobj(wb)
    except zlib.error:
        bad += 1
bad == 5'.
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
