! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConfigparserTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ConfigparserTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ConfigparserTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ConfigparserTestCase removeAllMethods: 0.
ConfigparserTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testReadStringAndGet
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[server]\nhost = example.com\nport: 8080\n\n[client]\nretries = 3\n")
(cp.sections() == ["server", "client"]
 and cp.get("server", "host") == "example.com"
 and cp.get("server", "port") == "8080"
 and cp.getint("client", "retries") == 3)'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testDefaultsAndFallback
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[DEFAULT]\ntimeout = 30\n\n[a]\nx = 1\n")
(cp.get("a", "timeout") == "30"
 and cp.get("a", "missing", fallback="zz") == "zz"
 and cp.getint("a", "x") == 1)'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testGetbooleanStates
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[f]\na = yes\nb = off\nc = True\n")
(cp.getboolean("f", "a") and not cp.getboolean("f", "b")
 and cp.getboolean("f", "c"))'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testInterpolation
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[paths]\nhome = /home/u\nlogs = %(home)s/logs\npct = 50%%\n")
cp.get("paths", "logs") == "/home/u/logs" and cp.get("paths", "pct") == "50%"'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testMappingAccessAndSet
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.add_section("s")
cp.set("s", "k", "v")
cp["s"]["k2"] = "v2"
("s" in cp and cp["s"]["k"] == "v" and cp["s"]["k2"] == "v2"
 and cp["s"].get("nope", "dflt") == "dflt"
 and cp.has_option("s", "K"))'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testCommentsAndContinuations
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[s]\n# comment\n; also comment\nmulti = one\n  two\nafter = 1\n")
cp.get("s", "multi") == "one\ntwo" and cp.get("s", "after") == "1"'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testMissingRaises
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
cp.read_string("[s]\nk = v\n")
try:
    cp.get("nosec", "k")
    a = False
except configparser.NoSectionError:
    a = True
try:
    cp.get("s", "noopt")
    b = False
except configparser.NoOptionError:
    b = True
a and b'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testFileRoundTrip
	"write() to a real file, read() back."

	| result |
	result := self eval: 'import configparser
path = "/tmp/grail_configparser_test.ini"
cp = configparser.ConfigParser()
cp.add_section("db")
cp.set("db", "host", "localhost")
cp.set("db", "port", "5432")
f = open(path, "w")
cp.write(f)
f.close()
cp2 = configparser.ConfigParser()
ok = cp2.read(path) == [path]
ok and cp2.get("db", "host") == "localhost" and cp2.getint("db", "port") == 5432'.
	self assert: result
%

category: 'Grail-Tests - configparser'
method: ConfigparserTestCase
testMissingSectionHeaderRaises
	| result |
	result := self eval: 'import configparser
cp = configparser.ConfigParser()
try:
    cp.read_string("k = v\n")
    caught = False
except configparser.MissingSectionHeaderError:
    caught = True
caught'.
	self assert: result
%
