! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GlobTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GlobTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
GlobTestCase removeAllMethods: 0.
GlobTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: GlobTestCase
setUp
	"Build a small fixture tree:
		$TMP/glob_test/a.txt  b.txt  c.py  .hidden  sub/d.txt"

	super setUp.
	self eval: 'import os
base = "$TMP/glob_test"
if not os.path.exists(base):
    os.mkdir(base)
if not os.path.exists(base + "/sub"):
    os.mkdir(base + "/sub")
for name in ["a.txt", "b.txt", "c.py", ".hidden", "sub/d.txt"]:
    f = open(base + "/" + name, "w")
    f.write("x")
    f.close()'
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testStarPattern
	| result |
	result := self eval: 'import glob
glob.glob("$TMP/glob_test/*.txt") == ["$TMP/glob_test/a.txt", "$TMP/glob_test/b.txt"]'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testQuestionMarkAndCharClass
	| result |
	result := self eval: 'import glob
q = glob.glob("$TMP/glob_test/?.py")
c = glob.glob("$TMP/glob_test/[ab].txt")
q == ["$TMP/glob_test/c.py"] and c == ["$TMP/glob_test/a.txt", "$TMP/glob_test/b.txt"]'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testMultiComponentPattern
	"Magic chars in a non-final component."

	| result |
	result := self eval: 'import glob
glob.glob("$TMP/glob_test/s*/d.txt") == ["$TMP/glob_test/sub/d.txt"]'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testLiteralAndNoMatch
	| result |
	result := self eval: 'import glob
lit = glob.glob("$TMP/glob_test/a.txt")
none = glob.glob("$TMP/glob_test/*.json")
missing = glob.glob("$TMP/glob_test_nope/x.txt")
lit == ["$TMP/glob_test/a.txt"] and none == [] and missing == []'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testHiddenFilesNeedDotPattern
	| result |
	result := self eval: 'import glob
star = glob.glob("$TMP/glob_test/*")
dot = glob.glob("$TMP/glob_test/.h*")
(".hidden" not in [p.split("/")[-1] for p in star]) and dot == ["$TMP/glob_test/.hidden"]'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testIglobReturnsIterator
	| result |
	result := self eval: 'import glob
it = glob.iglob("$TMP/glob_test/*.py")
next(it) == "$TMP/glob_test/c.py"'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testDoubleStarRaises
	self
		should: [self eval: 'import glob
glob.glob("$TMP/glob_test/**/*.txt")']
		raise: ValueError
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testEscape
	| result |
	result := self eval: 'import glob
glob.escape("a*b?c[d") == "a[*]b[?]c[[]d"'.
	self assert: result
%
