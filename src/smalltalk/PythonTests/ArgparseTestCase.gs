! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ArgparseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ArgparseTestCase'
  instVarNames: #( testModule)
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

category: 'Grail-Setup'
method: ArgparseTestCase
setUp
	"Reload tests/python/argparse_constructor.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'argparse_constructor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/argparse_constructor.py')
		name: 'argparse_constructor'.
%

category: 'Grail-Helpers'
method: ArgparseTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ArgparseTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one.  The fixture
	stores the OFFENDING VALUE rather than false, so a failure reports what
	came back instead of only that something did."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testConstructorTakesEveryCPythonParameter
	"All fifteen, by name and in order.  Grail's hand-written subset took
	four, and ``formatter_class'' being one of the eleven missing is what
	stopped the pip-installed kaggle CLI from starting at all."

	self assertAll: #('constructor_takes_cpython_parameters')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testProgUsageDescriptionEpilog
	self assertAll: #('prog_names_the_program'
		'usage_replaces_the_generated_line'
		'description_precedes_epilog')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testParents
	self assertAll: #('parents_contributes_its_arguments')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testFormatterClassChangesTheRendering
	"Each formatter must render DIFFERENTLY from the default one -- the
	assertion an accept-and-ignore constructor cannot satisfy, since it
	renders the default layout whatever it is handed."

	self assertAll: #('raw_description_keeps_description_newlines'
		'raw_text_also_keeps_help_newlines'
		'defaults_formatter_appends_the_default')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testPrefixCharsAndFromfilePrefixChars
	self assertAll: #('prefix_chars_changes_the_option_prefix'
		'fromfile_prefix_chars_expands_the_file')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testArgumentDefaultAndConflictHandler
	self assertAll: #('argument_default_supplies_the_default'
		'conflict_handler_resolve_replaces_the_option'
		'conflict_handler_defaults_to_error')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testAddHelpAllowAbbrevExitOnError
	self assertAll: #('add_help_false_drops_the_h_option'
		'allow_abbrev_false_rejects_a_prefix'
		'exit_on_error_false_raises_argument_error')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testSuggestOnErrorAndColor
	self assertAll: #('suggest_on_error_suggests_the_near_choice'
		'suggest_on_error_is_off_by_default'
		'color_is_stored_and_is_plain_off_a_terminal')
%

category: 'Grail-Tests - constructor'
method: ArgparseTestCase
testSubparsers
	"The other half of the kaggle blocker: ``kaggle datasets list'' is a
	subcommand, and the subset's _SubParsersAction was a bare ``pass''."

	self assertAll: #('subparsers_dispatch_to_the_named_parser')
%

category: 'Grail-Tests - dependencies'
method: ArgparseTestCase
testWhatHelpFormatterReachesFor
	"shutil.get_terminal_size and _colorize's argparse theme + decolor(),
	both hit on the first _get_formatter(); and str.splitlines(keepends=)
	as a KEYWORD, which RawDescriptionHelpFormatter._fill_text uses."

	self assertAll: #('shutil_get_terminal_size_reads_COLUMNS'
		'colorize_decolor_strips_the_argparse_theme'
		'splitlines_accepts_keepends_as_a_keyword'
		'splitlines_rejects_an_unknown_keyword')
%

category: 'Grail-Tests - dependencies'
method: ArgparseTestCase
testNestedClassInVarsUsingBodyCompiles
	"The codegen defect the vendored file uncovered, reduced: a class NESTED
	in a body that mentions vars()/locals() had its METHODS generated under
	the outer class's class-body flags, emitting a probe on the nested
	class's Smalltalk block temp.  Those methods did not compile and became
	raising stubs -- argparse's HelpFormatter._Section is this exact shape."

	self assertAll: #('nested_class_in_a_vars_using_body_compiles')
%

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
