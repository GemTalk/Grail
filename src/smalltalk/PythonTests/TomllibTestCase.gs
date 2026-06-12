! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TomllibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TomllibTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
TomllibTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
TomllibTestCase removeAllMethods: 0.
TomllibTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - scalars'
method: TomllibTestCase
testIntegers
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("a = 42\nb = -17\nc = 0xFF\no = 0o17\nbin = 0b101\nu = 1_000_000\np = +5")
(d["a"] == 42 and d["b"] == -17 and d["c"] == 255 and d["o"] == 15
 and d["bin"] == 5 and d["u"] == 1000000 and d["p"] == 5)'.
	self assert: result
%

category: 'Grail-Tests - scalars'
method: TomllibTestCase
testFloatsAndBooleans
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("f = 3.14\ne = 5e2\nneg = -0.5\ni = inf\nni = -inf\nt = true\nf2 = false")
(d["f"] == 3.14 and d["e"] == 500.0 and d["neg"] == -0.5
 and d["i"] == float("inf") and d["ni"] == float("-inf")
 and d["t"] is True and d["f2"] is False)'.
	self assert: result
%

category: 'Grail-Tests - strings'
method: TomllibTestCase
testBasicStringsAndEscapes
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads(''a = "hello"\nb = "tab\\there"\nc = "quote\\"in"\nu = "caf\\u00E9"'')
(d["a"] == "hello" and d["b"] == "tab\there"
 and d["c"] == ''quote"in'' and d["u"] == "caf" + chr(233))'.
	self assert: result
%

category: 'Grail-Tests - strings'
method: TomllibTestCase
testLiteralStrings
	"No escape processing in literal strings."

	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("p = ''C:\\\\Users\\\\x''\nr = ''no \\\\n escape''")
d["p"] == "C:\\\\Users\\\\x" and d["r"] == "no \\\\n escape"'.
	self assert: result
%

category: 'Grail-Tests - strings'
method: TomllibTestCase
testMultilineStrings
	"Leading newline is trimmed; line-ending backslash folds whitespace;
	multi-line literal keeps everything."

	| result |
	result := self eval: 'import tomllib
d = tomllib.loads(''m = """\nab\ncd"""'')
e = tomllib.loads(''f = """\\\n   folded"""'')
g = tomllib.loads("lit = ''''''raw\nkeep''''''")
d["m"] == "ab\ncd" and e["f"] == "folded" and g["lit"] == "raw\nkeep"'.
	self assert: result
%

category: 'Grail-Tests - containers'
method: TomllibTestCase
testArraysAndInlineTables
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("a = [1, 2, 3,]\nnested = [[1, 2], [\"x\"]]\npoint = { x = 1, y = -2 }\nmix = [ { n = 1 }, { n = 2 } ]")
(d["a"] == [1, 2, 3] and d["nested"] == [[1, 2], ["x"]]
 and d["point"] == {"x": 1, "y": -2}
 and d["mix"][1] == {"n": 2})'.
	self assert: result
%

category: 'Grail-Tests - containers'
method: TomllibTestCase
testMultilineArrayWithComments
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("a = [\n  1,  # first\n  2,\n  # only a comment\n  3\n]")
d["a"] == [1, 2, 3]'.
	self assert: result
%

category: 'Grail-Tests - tables'
method: TomllibTestCase
testTablesAndDottedKeys
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("top = 1\n\n[server]\nhost = \"h\"\nport = 80\n\n[server.limits]\nmax = 10\n\n[other]\na.b = 2")
(d["top"] == 1 and d["server"]["host"] == "h"
 and d["server"]["limits"]["max"] == 10
 and d["other"]["a"]["b"] == 2)'.
	self assert: result
%

category: 'Grail-Tests - tables'
method: TomllibTestCase
testArrayOfTables
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("[[products]]\nname = \"a\"\n\n[[products]]\nname = \"b\"\nsku = 1\n\n[[products]]\n")
(len(d["products"]) == 3 and d["products"][0]["name"] == "a"
 and d["products"][1]["sku"] == 1 and d["products"][2] == {})'.
	self assert: result
%

category: 'Grail-Tests - dates'
method: TomllibTestCase
testDatesAndTimes
	| result |
	result := self eval: 'import tomllib
d = tomllib.loads("date = 2026-06-12\ntime = 07:32:00\nldt = 2026-06-12T07:32:00\nfrac = 2026-06-12 07:32:00.25\nodt = 1979-05-27T00:32:00-07:00\nzdt = 1979-05-27T07:32:00Z")
(str(d["date"]) == "2026-06-12" and str(d["time"]) == "07:32:00"
 and str(d["ldt"]) == "2026-06-12 07:32:00"
 and d["frac"].microsecond == 250000
 and str(d["odt"]) == "1979-05-27 00:32:00-07:00"
 and str(d["zdt"]) == "1979-05-27 07:32:00+00:00")'.
	self assert: result
%

category: 'Grail-Tests - errors'
method: TomllibTestCase
testDuplicateKeyRaises
	self
		should: [self eval: 'import tomllib
tomllib.loads("a = 1\na = 2")']
		raise: ValueError.
	self
		should: [self eval: 'import tomllib
tomllib.loads("[t]\nx = 1\n[t]\ny = 2")']
		raise: ValueError
%

category: 'Grail-Tests - errors'
method: TomllibTestCase
testSyntaxErrorsRaise
	self
		should: [self eval: 'import tomllib
tomllib.loads("a = ")']
		raise: ValueError.
	self
		should: [self eval: 'import tomllib
tomllib.loads(''b = "unclosed'')']
		raise: ValueError.
	self
		should: [self eval: 'import tomllib
tomllib.loads("junk on a line")']
		raise: ValueError
%

category: 'Grail-Tests - api'
method: TomllibTestCase
testLoadBinaryFile
	| result |
	result := self eval: 'import tomllib
path = "/tmp/grail_tomllib_test.toml"
f = open(path, "w")
f.write("[pkg]\nname = \"grail\"\nversion = \"1.0\"\n")
f.close()
g = open(path, "rb")
d = tomllib.load(g)
g.close()
d["pkg"]["name"] == "grail" and d["pkg"]["version"] == "1.0"'.
	self assert: result
%

category: 'Grail-Tests - api'
method: TomllibTestCase
testLoadTextModeRaisesTypeError
	self
		should: [self eval: 'import tomllib
tomllib.load(open("/tmp/grail_tomllib_test.toml", "r"))']
		raise: TypeError
%

category: 'Grail-Tests - api'
method: TomllibTestCase
testParseFloatHook
	| result |
	result := self eval: 'import tomllib
def keep(text):
    return "F:" + text
d = tomllib.loads("x = 1.5\ny = 2", parse_float=keep)
d["x"] == "F:1.5" and d["y"] == 2'.
	self assert: result
%
