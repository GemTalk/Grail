Class {
	#name : 'ZlibTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testABadCompressorOptionIsAValueError [
	"libz judges the options itself; its Z_STREAM_ERROR is reported as CPython
	reports it."

	self
		should: [self eval: 'import zlib
zlib.compressobj(10)']
		raise: ValueError

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testAFinishedCompressorRefusesMoreWorkAsCPythonDoes [
	"After a finishing flush libz has its state back, and CPython reports any
	further use as zlib.error with this exact text.  Measured against CPython
	3.14."

	self assert: (self eval: 'import zlib
compressor = zlib.compressobj()
compressor.compress(b"x")
compressor.flush()
try:
    compressor.compress(b"y")
    outcome = "no error"
except zlib.error as error:
    outcome = str(error)
outcome') equals: 'Error -2 while compressing data: inconsistent stream state'

]

{ #category : 'Grail-Tests' }
ZlibTestCase >> testAnEmptyBufferChecksumKeepsTheStartingValue [

	"libz answers its initial value, ignoring the one passed, for a NULL
	buffer; an empty one was passed as NULL, so adler32(b'', 0) was 1."

	self assert: (self eval: 'import zlib
(zlib.adler32(b"", 0), zlib.adler32(b"", 432), zlib.crc32(b"", 1), zlib.crc32(b"", 432)) == (0, 432, 1, 432)')

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testAnEmptyFollowUpCallDoesNotResumeFromTheTail [
	"The half that would catch the bug coming back: decompress(b'') does NOT
	re-read unconsumed_tail, so it cannot fill a 4096-byte cap.  Under the old
	prepend it did, which is exactly what doubled the tail for every caller
	that also passed it back."

	self assert: (self eval: 'import zlib
packed = zlib.compress(("0123456789abcdef" * 8192).encode())
d = zlib.decompressobj()
d.decompress(packed, 100)
len(d.decompress(b"", 4096)) < 4096') equals: true

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testBadWbitsRaises [

	"A window libz refuses is CPython's ValueError, and 0 -- take the window
	from the zlib header -- is accepted.  This test used to expect zlib.error
	for all five, 0 included; CPython 3.14 says otherwise, and libz now judges
	the window as it does there."

	| result |

	result := self eval: 'import zlib
bad = 0
for wb in (3, 7, 100, -20):
    try:
        zlib.decompressobj(wb)
    except ValueError:
        bad += 1
zlib.decompressobj(0)
bad == 4'.
	self assert: result

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testChecksums [
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

]

{ #category : 'Grail-Tests' }
ZlibTestCase >> testCompressHonoursAGzipOrRawWindow [

	"compress(data, level, wbits) wrote the zlib format whatever wbits said,
	so gzip.compress -- which asks for wbits=31 -- answered data its own
	decompress refused as not gzipped."

	self assert: (self eval: 'import zlib, gzip
data = b"Grail " * 50
(zlib.compress(data, wbits=31)[:2] == b"\x1f\x8b"
 and zlib.decompress(zlib.compress(data, 9, -15), -15) == data
 and gzip.decompress(gzip.compress(data)) == data)')

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testCompressionLevels [
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

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testCompressobjRoundTripsThroughDecompressobj [
	"The COMPRESSING half of the z_stream API.  This test used to be
	testCompressobjStillUnsupported, which pinned compressobj() raising
	NotImplementedError as a documented gap; ZlibCompress closed the gap, so
	it now pins the behaviour instead of the absence of it.

	Raw deflate at wbits -15 is the shape asserted because it is what a zip
	entry holds and what CPython's zipfile asks compressobj for."

	self assert: (self eval: 'import zlib
payload = b"grail " * 5000
compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
packed = compressor.compress(payload) + compressor.flush()
decompressor = zlib.decompressobj(-15)
(decompressor.decompress(packed) + decompressor.flush() == payload, len(packed) < len(payload))')
		equals: (self eval: '(True, True)')

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testConstants [
	| result |
	result := self eval: 'import zlib
(zlib.MAX_WBITS == 15 and zlib.DEFLATED == 8
 and zlib.Z_BEST_COMPRESSION == 9 and zlib.Z_DEFAULT_COMPRESSION == -1
 and zlib.error is not None)'.
	self assert: result

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testCorruptAndTruncatedRaise [
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

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testDecompressobjChunked [
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

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testEmptyData [
	| result |
	result := self eval: 'import zlib
packed = zlib.compress(b"")
zlib.decompress(packed) == b"" and len(packed) > 0'.
	self assert: result

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testGzipWbitsFromCPython [
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

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testLargeDataGrowsBuffer [
	"Decompressed size far exceeds the default 16384-byte buffer, so
	the Z_BUF_ERROR retry loop must grow it."

	| result |
	result := self eval: 'import zlib
payload = ("0123456789abcdef" * 16384).encode()
packed = zlib.compress(payload)
back = zlib.decompress(packed)
len(payload) == 262144 and back == payload'.
	self assert: result

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testMaxLengthAndUnconsumedTail [
	"decompress(data, max_length) caps the OUTPUT and parks the rest of the
	input in unconsumed_tail -- which the CALLER passes back, as CPython's
	documented protocol has it.

	This test used to feed empty follow-up calls and expect them to continue
	from the tail, pinning a Grail behaviour CPython does not have: run under
	CPython 3.14 its own final assertion was False, recovering 533 of 131072
	bytes.  Grail prepended the tail itself, so a protocol-following caller got
	it twice and the input grew with every call -- which is how CPython's own
	zipfile ran the gem out of memory reading a large member.  Both halves are
	now measured against CPython."

	| result |
	result := self eval: 'import zlib
payload = ("0123456789abcdef" * 8192).encode()
packed = zlib.compress(payload)
d = zlib.decompressobj()
first = d.decompress(packed, 100)
capped = (len(first) == 100 and len(d.unconsumed_tail) > 0 and not d.eof)
out = first
while d.unconsumed_tail:
    out += d.decompress(d.unconsumed_tail, 4096)
out += d.flush()
(capped and out == payload and len(payload) == 131072)'.
	self assert: result

]

{ #category : 'Grail-Tests' }
ZlibTestCase >> testNonBytesArgumentsAreTypeErrors [

	"CPython's TypeError, naming the type.  An int died on an uncatchable
	MessageNotUnderstood, and a call with no data read past the arguments."

	self assert: (self eval: 'import zlib
caught = 0
for call in (lambda: zlib.crc32(42), lambda: zlib.adler32(None), lambda: zlib.compress([1, 2]),
             lambda: zlib.compress(), lambda: zlib.decompress(), lambda: zlib.crc32()):
    try:
        call()
    except TypeError:
        caught += 1
caught == 6')

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testRawDeflateFromCPython [
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

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testRoundTrip [
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

]

{ #category : 'Grail-Tests - zlib' }
ZlibTestCase >> testStrArgRaisesTypeError [
	self
		should: [self eval: 'import zlib
zlib.compress("not bytes")']
		raise: TypeError

]

{ #category : 'Grail-Tests' }
ZlibTestCase >> testTheZlibDecompressorIsTheClassAndCallsMakeInstances [

	"zlib._ZlibDecompressor is the class gzip's reader is built on: reading it
	answers the class, calling it an incremental decompressor."

	self assert: (self eval: 'import zlib
d = zlib._ZlibDecompressor()
data = zlib.compress(b"abc" * 100)
first = d.decompress(data[:10])
rest = d.decompress(data[10:] + b"extra")
(isinstance(zlib._ZlibDecompressor, type) and first + rest == b"abc" * 100
 and d.eof and d.unused_data == b"extra" and not d.needs_input)')

]

{ #category : 'Grail-Tests - zlib streaming' }
ZlibTestCase >> testTrailingBytesBecomeUnusedData [
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

]

{ #category : 'Grail-Tests' }
ZlibTestCase >> testVersionConstants [

	"ZLIB_RUNTIME_VERSION is the loaded library's zlibVersion(); test_zlib
	reads it at import time."

	self assert: (self eval: 'import zlib
v = zlib.ZLIB_RUNTIME_VERSION
isinstance(v, str) and v[0].isdigit() and zlib.ZLIB_VERSION == v')

]
