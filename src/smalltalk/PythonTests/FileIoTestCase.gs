! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FileIoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FileIoTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
FileIoTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FileIoTestCase - Tests for the open() builtin and FileIO / TextIOWrapper
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
FileIoTestCase removeAllMethods: 0.
FileIoTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: FileIoTestCase
removeFile: aPath
	"Best-effort cleanup so each test starts from a known state."

	(GsFile existsOnServer: aPath) ifTrue: [
		GsFile removeServerFile: aPath]
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testOpenMissingFileRaisesFileNotFound
	self
		should: [self eval: 'open("$TMP/fileio_no_such_file_xyz.txt")']
		raise: FileNotFoundError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testOpenDirectoryRaisesIsADirectory
	self
		should: [self eval: 'open("/tmp")']
		raise: IsADirectoryError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testInvalidModeRaisesValueError
	self
		should: [self eval: 'open("$TMP/fileio_mode.txt", "z")']
		raise: ValueError.
	self
		should: [self eval: 'open("$TMP/fileio_mode.txt", "rw")']
		raise: ValueError.
	self
		should: [self eval: 'open("$TMP/fileio_mode.txt", "rbt")']
		raise: ValueError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testExclusiveCreateRaisesFileExists
	| path |
	path := (self tmp: 'fileio_xmode.txt').
	self removeFile: path.
	self eval: 'f = open("$TMP/fileio_xmode.txt", "x")
f.write("once")
f.close()'.
	self
		should: [self eval: 'open("$TMP/fileio_xmode.txt", "x")']
		raise: FileExistsError.
	self removeFile: path
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testReadAfterCloseRaisesValueError
	self removeFile: (self tmp: 'fileio_closed.txt').
	self
		should: [self eval: 'f = open("$TMP/fileio_closed.txt", "w")
f.close()
f.write("late")']
		raise: ValueError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testWriteOnReadOnlyRaises
	self removeFile: (self tmp: 'fileio_ro.txt').
	self eval: 'f = open("$TMP/fileio_ro.txt", "w")
f.write("data")
f.close()'.
	self
		should: [self eval: 'f = open("$TMP/fileio_ro.txt", "r")
f.write("nope")']
		raise: OSError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testReadOnWriteOnlyRaises
	self removeFile: (self tmp: 'fileio_wo.txt').
	self
		should: [self eval: 'f = open("$TMP/fileio_wo.txt", "w")
f.read()']
		raise: OSError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testStrWriteOnBinaryRaisesTypeError
	self removeFile: (self tmp: 'fileio_tb.bin').
	self
		should: [self eval: 'f = open("$TMP/fileio_tb.bin", "wb")
f.write("str not bytes")']
		raise: TypeError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testBytesWriteOnTextRaisesTypeError
	self removeFile: (self tmp: 'fileio_bt.txt').
	self
		should: [self eval: 'f = open("$TMP/fileio_bt.txt", "w")
f.write(b"bytes not str")']
		raise: TypeError
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testUnknownEncodingRaisesLookupError
	self
		should: [self eval: 'open("$TMP/fileio_enc.txt", "w", -1, "klingon")']
		raise: LookupError
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testWriteReturnsCountAndReadsBack
	| result |
	self removeFile: (self tmp: 'fileio_basic.txt').
	result := self eval: 'f = open("$TMP/fileio_basic.txt", "w")
n = f.write("hello\n")
f.close()
g = open("$TMP/fileio_basic.txt")
text = g.read()
g.close()
n == 6 and text == "hello\n"'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testWithStatementClosesFile
	| result |
	self removeFile: (self tmp: 'fileio_with.txt').
	result := self eval: 'with open("$TMP/fileio_with.txt", "w") as f:
    f.write("managed")
    was_open = not f.closed
f.closed and was_open'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testReadline
	| result |
	self removeFile: (self tmp: 'fileio_lines.txt').
	result := self eval: 'with open("$TMP/fileio_lines.txt", "w") as f:
    f.write("one\ntwo\nthree")
g = open("$TMP/fileio_lines.txt")
a = g.readline()
b = g.readline()
c = g.readline()
d = g.readline()
g.close()
a == "one\n" and b == "two\n" and c == "three" and d == ""'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testIterationYieldsLines
	| result |
	self removeFile: (self tmp: 'fileio_iter.txt').
	result := self eval: 'with open("$TMP/fileio_iter.txt", "w") as f:
    f.write("a\nb\nc\n")
out = []
for line in open("$TMP/fileio_iter.txt"):
    out.append(line)
out == ["a\n", "b\n", "c\n"]'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testReadlines
	| result |
	self removeFile: (self tmp: 'fileio_rls.txt').
	result := self eval: 'with open("$TMP/fileio_rls.txt", "w") as f:
    f.write("x\ny\n")
g = open("$TMP/fileio_rls.txt")
lines = g.readlines()
g.close()
lines == ["x\n", "y\n"]'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testReadSizeAndRest
	| result |
	self removeFile: (self tmp: 'fileio_sizes.txt').
	result := self eval: 'with open("$TMP/fileio_sizes.txt", "w") as f:
    f.write("abcdef")
g = open("$TMP/fileio_sizes.txt")
head = g.read(2)
rest = g.read()
empty = g.read()
g.close()
head == "ab" and rest == "cdef" and empty == ""'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testAppendMode
	| result |
	self removeFile: (self tmp: 'fileio_app.txt').
	result := self eval: 'with open("$TMP/fileio_app.txt", "w") as f:
    f.write("first\n")
with open("$TMP/fileio_app.txt", "a") as f:
    f.write("second\n")
open("$TMP/fileio_app.txt").read() == "first\nsecond\n"'.
	self assert: result
%

category: 'Grail-Tests - Text round trips'
method: FileIoTestCase
testPlusModeReadWrite
	| result |
	self removeFile: (self tmp: 'fileio_plus.txt').
	result := self eval: 'with open("$TMP/fileio_plus.txt", "w") as f:
    f.write("AAAA")
g = open("$TMP/fileio_plus.txt", "r+")
g.seek(2)
g.write("ZZ")
g.seek(0)
text = g.read()
g.close()
text == "AAZZ"'.
	self assert: result
%

category: 'Grail-Tests - Attributes'
method: FileIoTestCase
testModeNameClosedAttrs
	| result |
	self removeFile: (self tmp: 'fileio_attrs.txt').
	result := self eval: 'f = open("$TMP/fileio_attrs.txt", "w")
checks = (f.name == "$TMP/fileio_attrs.txt" and f.mode == "w"
          and not f.closed and f.writable() and not f.readable()
          and f.encoding == "utf-8")
f.close()
checks and f.closed'.
	self assert: result
%

category: 'Grail-Tests - Position'
method: FileIoTestCase
testSeekTell
	| result |
	self removeFile: (self tmp: 'fileio_seek.txt').
	result := self eval: 'with open("$TMP/fileio_seek.txt", "w") as f:
    f.write("0123456789")
g = open("$TMP/fileio_seek.txt")
p0 = g.tell()
g.seek(4)
p4 = g.tell()
mid = g.read(2)
pend = g.seek(0, 2)
back = g.seek(-3, 1)
tail = g.read()
g.close()
p0 == 0 and p4 == 4 and mid == "45" and pend == 10 and back == 7 and tail == "789"'.
	self assert: result
%

category: 'Grail-Tests - Binary'
method: FileIoTestCase
testBinaryRoundTrip
	| result |
	self removeFile: (self tmp: 'fileio_bin.bin').
	result := self eval: 'payload = b"\x00\x01\xffabc"
with open("$TMP/fileio_bin.bin", "wb") as f:
    n = f.write(payload)
g = open("$TMP/fileio_bin.bin", "rb")
data = g.read()
g.close()
n == 6 and data == payload and isinstance(data, bytes)'.
	self assert: result
%

category: 'Grail-Tests - Binary'
method: FileIoTestCase
testBinaryReadline
	| result |
	self removeFile: (self tmp: 'fileio_binl.bin').
	result := self eval: 'with open("$TMP/fileio_binl.bin", "wb") as f:
    f.write(b"ab\ncd")
g = open("$TMP/fileio_binl.bin", "rb")
a = g.readline()
b = g.readline()
g.close()
a == b"ab\n" and b == b"cd"'.
	self assert: result
%

category: 'Grail-Tests - Encodings'
method: FileIoTestCase
testUtf8RoundTrip
	| result |
	self removeFile: (self tmp: 'fileio_utf8.txt').
	result := self eval: 'text = "caf" + chr(233) + " " + chr(960) + "\n"
with open("$TMP/fileio_utf8.txt", "w") as f:
    f.write(text)
back = open("$TMP/fileio_utf8.txt").read()
raw = open("$TMP/fileio_utf8.txt", "rb").read()
back == text and len(back) == 7 and len(raw) == 9'.
	self assert: result
%

category: 'Grail-Tests - Encodings'
method: FileIoTestCase
testReadSizeCompletesSplitMultibyteChar
	| result |
	self removeFile: (self tmp: 'fileio_split.txt').
	result := self eval: 'pi = chr(960)
with open("$TMP/fileio_split.txt", "w") as f:
    f.write(pi + "x")
g = open("$TMP/fileio_split.txt")
first = g.read(1)
second = g.read()
g.close()
first == pi and second == "x"'.
	self assert: result
%

category: 'Grail-Tests - Encodings'
method: FileIoTestCase
testLatin1Encoding
	| result |
	self removeFile: (self tmp: 'fileio_l1.txt').
	result := self eval: 'word = "caf" + chr(233)
with open("$TMP/fileio_l1.txt", "w", -1, "latin-1") as f:
    f.write(word)
raw = open("$TMP/fileio_l1.txt", "rb").read()
back = open("$TMP/fileio_l1.txt", "r", -1, "latin-1").read()
len(raw) == 4 and raw[3] == 233 and back == word'.
	self assert: result
%

category: 'Grail-Tests - Call shapes'
method: FileIoTestCase
testOpenKwargsEncoding
	| result |
	self removeFile: (self tmp: 'fileio_kw.txt').
	result := self eval: 'with open("$TMP/fileio_kw.txt", mode="w", encoding="utf-8") as f:
    f.write("kwargs ok")
open("$TMP/fileio_kw.txt", encoding="utf-8").read() == "kwargs ok"'.
	self assert: result
%

category: 'Grail-Tests - Call shapes'
method: FileIoTestCase
testOpenAsFirstClassValue
	| result |
	self removeFile: (self tmp: 'fileio_fcv.txt').
	result := self eval: 'opener = open
with opener("$TMP/fileio_fcv.txt", "w") as f:
    f.write("indirect")
opener("$TMP/fileio_fcv.txt").read() == "indirect"'.
	self assert: result
%

category: 'Grail-Tests - Call shapes'
method: FileIoTestCase
testIoOpenAlias
	| result |
	self removeFile: (self tmp: 'fileio_io.txt').
	result := self eval: 'import io
with io.open("$TMP/fileio_io.txt", "w") as f:
    f.write("via io")
text = io.open("$TMP/fileio_io.txt").read()
text == "via io" and io.FileIO is not None and io.TextIOWrapper is not None'.
	self assert: result
%

category: 'Grail-Tests - Call shapes'
method: FileIoTestCase
testWritelines
	| result |
	self removeFile: (self tmp: 'fileio_wl.txt').
	result := self eval: 'with open("$TMP/fileio_wl.txt", "w") as f:
    f.writelines(["a\n", "b\n"])
open("$TMP/fileio_wl.txt").read() == "a\nb\n"'.
	self assert: result
%

category: 'Grail-Tests - Descriptors'
method: FileIoTestCase
testFilenoAnswersRealDescriptor
	"REGRESSION: fileno() used to refuse with ``not supported in Grail''.
	Every open server-side GsFile carries a real OS descriptor (GsFile fills
	it in from the GsfGetFileDesc user action; IO >> fileDescriptor answers
	it), so the refusal was unnecessary.  Two distinct open files must also
	report two distinct descriptors."

	| a b |
	self removeFile: (self tmp: 'fileio_fd_a.txt').
	self removeFile: (self tmp: 'fileio_fd_b.txt').
	a := self eval: 'f = open("$TMP/fileio_fd_a.txt", "w")
n = f.fileno()
f.close()
n'.
	self assert: (a isKindOf: Integer).
	self assert: a >= 0.
	b := self eval: 'f1 = open("$TMP/fileio_fd_a.txt", "w")
f2 = open("$TMP/fileio_fd_b.txt", "w")
same = f1.fileno() == f2.fileno()
f1.close()
f2.close()
same'.
	self assert: b equals: false.
	self removeFile: (self tmp: 'fileio_fd_a.txt').
	self removeFile: (self tmp: 'fileio_fd_b.txt')
%

category: 'Grail-Tests - Descriptors'
method: FileIoTestCase
testFilenoOnClosedFileRaises
	"CPython raises on fileno() after close (ValueError, I/O on a closed
	file); the _checkOpen guard must run before the descriptor is read."

	self removeFile: (self tmp: 'fileio_fd_closed.txt').
	self
		should: [self eval: 'f = open("$TMP/fileio_fd_closed.txt", "w")
f.close()
f.fileno()']
		raise: ValueError.
	self removeFile: (self tmp: 'fileio_fd_closed.txt')
%

category: 'Grail-Tests - Descriptors'
method: FileIoTestCase
testIsattyFalseForRegularFile
	"isatty() was hardcoded false; it now asks GsFile.  A regular file must
	still answer false -- this pins that asking the file did not turn the
	common case true."

	| r |
	self removeFile: (self tmp: 'fileio_tty.txt').
	r := self eval: 'f = open("$TMP/fileio_tty.txt", "w")
v = f.isatty()
f.close()
v'.
	self assert: r equals: false.
	self removeFile: (self tmp: 'fileio_tty.txt')
%

category: 'Grail-Tests - Errors'
method: FileIoTestCase
testOpenBelowAPlainFileRaisesNotADirectory
	"A path whose PARENT component is a plain file stats with ENOTDIR, and
	GsFile>>existsOnServer: answers NIL there rather than false.  ___open___
	fed that nil to an inlined and:/not:/ifTrue:, so ``open('grail/x.txt')''
	-- ./grail being the repo''s CLI shell script -- raised ImproperOperation
	(error 2085), which no ``except OSError'' can catch, where CPython raises
	NotADirectoryError.  Both directions: the read path tested existence, the
	write path reached GsFile and failed there."

	| parent f |
	parent := (self tmp: 'fileio_notadir').
	self removeFile: parent.
	f := GsFile open: parent mode: 'wb' onClient: false.
	f nextPutAll: 'not a directory'; close.
	self
		should: [self eval: 'open("$TMP/fileio_notadir/x.txt")']
		raise: NotADirectoryError.
	self
		should: [self eval: 'open("$TMP/fileio_notadir/x.txt", "w")']
		raise: NotADirectoryError.
	"Every OSError subclass here is catchable as OSError, which is what
	Python code actually writes."
	self
		should: [self eval: 'open("$TMP/fileio_notadir/x.txt", "x")']
		raise: OSError.
	self removeFile: parent
%
