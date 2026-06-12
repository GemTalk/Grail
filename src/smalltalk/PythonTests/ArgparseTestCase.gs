! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ArgparseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ArgparseTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ArgparseTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ArgparseTestCase removeAllMethods: 0.
ArgparseTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testStoreTrueAndDefaults
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("--verbose", action="store_true")
p.add_argument("--name", default="anon")
a = p.parse_args(["--verbose"])
b = p.parse_args([])
a.verbose is True and b.verbose is False and b.name == "anon"'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testOptionValueForms
	"--opt val, --opt=val, -o val, attached -oval all bind the value."

	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("-o", "--out")
a = p.parse_args(["--out", "x1"])
b = p.parse_args(["--out=x2"])
c = p.parse_args(["-o", "x3"])
d = p.parse_args(["-ox4"])
(a.out, b.out, c.out, d.out) == ("x1", "x2", "x3", "x4")'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testPositionalWithType
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("count", type=int)
p.add_argument("scale", type=float)
a = p.parse_args(["7", "1.5"])
a.count == 7 and a.scale == 1.5'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testNargsStarPlusFixed
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("--pair", nargs=2)
p.add_argument("files", nargs="*")
a = p.parse_args(["--pair", "x", "y", "f1", "f2", "f3"])
q = argparse.ArgumentParser(prog="t2")
q.add_argument("items", nargs="+")
b = q.parse_args(["one"])
a.pair == ["x", "y"] and a.files == ["f1", "f2", "f3"] and b.items == ["one"]'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testAppendAndCount
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("-I", action="append")
p.add_argument("-v", action="count")
a = p.parse_args(["-I", "a", "-I", "b", "-vvv"])
a.I == ["a", "b"] and a.v == 3'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testChoicesAndRequiredErrors
	"Violations print a message and raise SystemExit."

	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("--mode", choices=["fast", "slow"])
try:
    p.parse_args(["--mode", "wrong"])
    a = False
except SystemExit:
    a = True
q = argparse.ArgumentParser(prog="t2")
q.add_argument("--must", required=True)
try:
    q.parse_args([])
    b = False
except SystemExit:
    b = True
ok = q.parse_args(["--must", "x"])
a and b and ok.must == "x"'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testUnknownAndMissingErrors
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("needed")
try:
    p.parse_args(["--nope"])
    a = False
except SystemExit:
    a = True
try:
    p.parse_args([])
    b = False
except SystemExit:
    b = True
a and b'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testDoubleDashPositionals
	"After --, dash-prefixed tokens are positionals."

	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("--flag", action="store_true")
p.add_argument("words", nargs="*")
a = p.parse_args(["--flag", "--", "--not-a-flag", "w2"])
a.flag is True and a.words == ["--not-a-flag", "w2"]'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testDestDerivationAndSetDefaults
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t")
p.add_argument("-x", "--max-size")
p.set_defaults(extra="bonus")
a = p.parse_args(["--max-size", "9"])
a.max_size == "9" and a.extra == "bonus"'.
	self assert: result
%

category: 'Grail-Tests - argparse'
method: ArgparseTestCase
testHelpRaisesSystemExit
	| result |
	result := self eval: 'import argparse
p = argparse.ArgumentParser(prog="t", description="does things")
p.add_argument("--opt", help="an option")
try:
    p.parse_args(["-h"])
    raised = False
except SystemExit:
    raised = True
text = p.format_help()
raised and "usage: t" in text and "an option" in text'.
	self assert: result
%
