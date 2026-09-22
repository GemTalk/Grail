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
	"Compared SORTED, because glob promises no order: it answers entries in
	the order the directory yields them.  This used to compare the raw list,
	which pinned the former hand-written glob's sorting -- measured, CPython
	3.14 itself answers this tree's *.txt out of order, so the old assertion
	failed under CPython too."

	| result |
	result := self eval: 'import glob
sorted(glob.glob("$TMP/glob_test/*.txt")) == ["$TMP/glob_test/a.txt", "$TMP/glob_test/b.txt"]'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testQuestionMarkAndCharClass
	| result |
	result := self eval: 'import glob
q = sorted(glob.glob("$TMP/glob_test/?.py"))
c = sorted(glob.glob("$TMP/glob_test/[ab].txt"))
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
testDoubleStarRecursesOnlyWhenAsked
	"``**'' as CPython has it.  This used to be testDoubleStarRaises, pinning
	the former hand-written glob's refusal of recursive patterns; the glob here
	is now CPython's own.  Without recursive=True a ``**'' is an ordinary
	``*'' -- it matches exactly one directory level, so only sub/d.txt -- and
	with it, it also matches zero levels.  Both answers measured against
	CPython 3.14 on this same tree."

	| result |
	result := self eval: 'import glob
flat = sorted(glob.glob("$TMP/glob_test/**/*.txt"))
deep = sorted(glob.glob("$TMP/glob_test/**/*.txt", recursive=True))
(flat == ["$TMP/glob_test/sub/d.txt"]
 and deep == ["$TMP/glob_test/a.txt", "$TMP/glob_test/b.txt", "$TMP/glob_test/sub/d.txt"])'.
	self assert: result
%

category: 'Grail-Tests - glob'
method: GlobTestCase
testEscape
	| result |
	result := self eval: 'import glob
glob.escape("a*b?c[d") == "a[*]b[?]c[[]d"'.
	self assert: result
%
