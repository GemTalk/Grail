Class {
	#name : 'GzipTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testBadGzipRaises [
	| result |
	result := self eval: 'import gzip
try:
    gzip.decompress(b"this is not gzip data")
    caught = False
except gzip.BadGzipFile:
    caught = True
caught and issubclass(gzip.BadGzipFile, OSError)'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testCompressDecompress [
	"In-memory gzip bytes round-trip and carry the magic."

	| result |
	result := self eval: 'import gzip
payload = ("squeeze me " * 100).encode()
packed = gzip.compress(payload)
back = gzip.decompress(packed)
(packed[0] == 31 and packed[1] == 139 and back == payload
 and len(packed) < len(payload))'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testCompressInteropWithFiles [
	"Bytes from gzip.compress are a valid gzip FILE and vice versa."

	| result |
	result := self eval: 'import gzip
path = "$TMP/gzip_t4.gz"
data = gzip.compress(b"interop")
f = open(path, "wb")
f.write(data)
f.close()
a = gzip.open(path, "rb").read()
with gzip.open(path, "wb") as g:
    g.write(b"other way")
b = gzip.decompress(open(path, "rb").read())
a == b"interop" and b == b"other way"'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testFileRoundTripBinary [
	"gzip.open writes real gzip framing (1F 8B magic on disk) and
	reads it back transparently."

	| result |
	result := self eval: 'import gzip
path = "$TMP/gzip_t1.gz"
f = gzip.open(path, "wb")
f.write(b"binary payload " * 10)
f.close()
raw = open(path, "rb").read()
g = gzip.open(path, "rb")
back = g.read()
g.close()
raw[0] == 31 and raw[1] == 139 and back == b"binary payload " * 10'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testFileRoundTripText [
	| result |
	result := self eval: 'import gzip
path = "$TMP/gzip_t2.gz"
with gzip.open(path, "wt") as f:
    f.write("line one\nline two\n")
with gzip.open(path, "rt") as g:
    text = g.read()
text == "line one\nline two\n"'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testGzipFileFactory [
	| result |
	result := self eval: 'import gzip
path = "$TMP/gzip_t5.gz"
f = gzip.GzipFile(path, "wb")
f.write(b"via GzipFile")
f.close()
gzip.GzipFile(path).read() == b"via GzipFile"'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testIterationYieldsLines [
	| result |
	result := self eval: 'import gzip
path = "$TMP/gzip_t3.gz"
with gzip.open(path, "wt") as f:
    f.write("a\nb\nc\n")
out = []
for line in gzip.open(path, "rt"):
    out.append(line)
out == ["a\n", "b\n", "c\n"]'.
	self assert: result

]

{ #category : 'Grail-Tests - gzip' }
GzipTestCase >> testStrArgsRaiseTypeError [
	self
		should: [self eval: 'import gzip
gzip.compress("not bytes")']
		raise: TypeError

]
