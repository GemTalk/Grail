! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GetoptTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GetoptTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GetoptTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
GetoptTestCase removeAllMethods: 0.
GetoptTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testShortOptions
	| result |
	result := self eval: 'import getopt
opts, args = getopt.getopt(["-a", "-b", "val", "rest"], "ab:")
opts == [("-a", ""), ("-b", "val")] and args == ["rest"]'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testShortOptionClusterAndAttachedArg
	| result |
	result := self eval: 'import getopt
opts, args = getopt.getopt(["-ab", "-cval"], "abc:")
opts == [("-a", ""), ("-b", ""), ("-c", "val")] and args == []'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testLongOptions
	| result |
	result := self eval: 'import getopt
opts, args = getopt.getopt(
    ["--verbose", "--out=x.txt", "--in", "y.txt", "z"],
    "", ["verbose", "out=", "in="])
(opts == [("--verbose", ""), ("--out", "x.txt"), ("--in", "y.txt")]
 and args == ["z"])'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testLongOptionPrefixMatch
	| result |
	result := self eval: 'import getopt
opts, args = getopt.getopt(["--verb"], "", ["verbose"])
opts == [("--verbose", "")]'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testDoubleDashStopsParsing
	| result |
	result := self eval: 'import getopt
opts, args = getopt.getopt(["-a", "--", "-b"], "ab")
opts == [("-a", "")] and args == ["-b"]'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testUnknownOptionRaises
	| result |
	result := self eval: 'import getopt
try:
    getopt.getopt(["-x"], "ab")
    caught = False
except getopt.GetoptError:
    caught = True
caught'.
	self assert: result
%

category: 'Grail-Tests - getopt'
method: GetoptTestCase
testGnuGetoptInterspersed
	| result |
	result := self eval: 'import getopt
opts, args = getopt.gnu_getopt(["file1", "-a", "file2", "-b", "v"], "ab:")
opts == [("-a", ""), ("-b", "v")] and args == ["file1", "file2"]'.
	self assert: result
%
