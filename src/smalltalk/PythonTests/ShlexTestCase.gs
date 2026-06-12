! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ShlexTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ShlexTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ShlexTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ShlexTestCase removeAllMethods: 0.
ShlexTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testSplitBasic
	| result |
	result := self eval: 'import shlex
shlex.split("ls -la /tmp") == ["ls", "-la", "/tmp"]'.
	self assert: result
%

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testSplitQuotes
	| result |
	result := self eval: 'import shlex
a = shlex.split("echo \"hello world\" done")
b = shlex.split("echo ''one two'' three")
a == ["echo", "hello world", "done"] and b == ["echo", "one two", "three"]'.
	self assert: result
%

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testSplitEscapes
	| result |
	result := self eval: 'import shlex
shlex.split("a\\ b c") == ["a b", "c"]'.
	self assert: result
%

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testSplitComments
	| result |
	result := self eval: 'import shlex
shlex.split("cmd arg # trailing comment", True) == ["cmd", "arg"]'.
	self assert: result
%

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testUnclosedQuoteRaises
	self
		should: [self eval: 'import shlex
shlex.split("oops \"unclosed")']
		raise: ValueError
%

category: 'Grail-Tests - shlex'
method: ShlexTestCase
testQuoteAndJoin
	| result |
	result := self eval: 'import shlex
a = shlex.quote("safe-name_1.txt")
b = shlex.quote("has space")
c = shlex.join(["echo", "two words"])
a == "safe-name_1.txt" and b == "''has space''" and c == "echo ''two words''"'.
	self assert: result
%
