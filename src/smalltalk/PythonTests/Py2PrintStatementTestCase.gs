! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for Py2PrintStatementTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'Py2PrintStatementTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
Py2PrintStatementTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! Py2PrintStatementTestCase
!
! The Python-2 ``print'' statement, and the missing statement terminator behind
! it.
!
!     print "Hello World"
!
! parsed as TWO expression statements -- the name ``print'' and the string, each
! evaluated and discarded -- so a Python-2 print ran SILENTLY.  ``print p'' did
! raise, but as a NameError naming p, which is a confusing way to be told the
! syntax is Python 2.
!
! The cause is general rather than about ``print'': parseSimpleStatements ended
! wherever the expression ended and never checked that a NEWLINE or the end of
! input followed, so ANY two juxtaposed expressions became two statements.  The
! check now runs, and answers ``invalid syntax'' for the general case.
!
! CPython NAMES the two Python-2 statement keywords instead of leaving them
! generic, because they are the juxtaposition common enough to be worth a
! migration hint.  The wording here is CPython's exactly -- test_print's
! TestPy2MigrationHint matches the message TEXT, not the exception type, so a
! paraphrase would pass the type check and fail the assertion.
!
! Six of test_print's eight failures; the module goes ERROR/8 to FAIL/2.  The
! two that remain are a different concern entirely -- print() ignores both a
! ``file='' argument and a reassigned sys.stdout, so its output routing needs
! its own change.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/py2_print_statement.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
Py2PrintStatementTestCase removeAllMethods.
Py2PrintStatementTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: Py2PrintStatementTestCase
setUp
	"Reload tests/python/py2_print_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'py2_print_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/py2_print_statement.py')
		name: 'py2_print_statement'.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testNormalString
	"THE BUG.  Grail parsed this as two statements and reported nothing."

	self assert: testModule @env1:normal_string equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testWithSoftSpace
	"Python 2's trailing comma."

	self assert: testModule @env1:with_soft_space equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testWithExcessiveWhitespace
	"The hint is keyed on the statement, not on the spacing."

	self assert: testModule @env1:with_excessive_whitespace equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testWithLeadingWhitespace
	"Indented inside a compound statement -- the check runs per simple-statement
	run, so it fires in a suite as well as at top level."

	self assert: testModule @env1:with_leading_whitespace equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testWithSemicolon
	"``print p;'' used to raise a NameError naming p, which named the wrong
	problem: the syntax is Python 2, and p is beside the point."

	self assert: testModule @env1:with_semicolon equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testInALoopOnTheSameLine
	"bpo-32685 -- the hint must survive a compound-statement header on the same
	line, which is where the statement run starts after the colon."

	self assert: testModule @env1:in_a_loop_on_the_same_line equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testExecGetsItsOwnHint
	"``exec'' is the other Python-2 statement keyword CPython names."

	self assert: testModule @env1:exec_gets_its_own_hint equals: true.
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testAnUnnamedJuxtapositionIsPlainInvalidSyntax
	"Only those two names get the hint.  Answering the print message for every
	juxtaposition would pass the tests above and misdescribe everything else."

	self assert: testModule @env1:an_unnamed_juxtaposition_is_plain_invalid_syntax asArray
		equals: #( true false ).
%

category: 'Grail-Tests'
method: Py2PrintStatementTestCase
testARealPrintCallStillParses
	"The Python-3 spelling, a semicolon-separated run and a trailing semicolon
	all still parse -- the terminator check must not reject what it never
	rejected before."

	self assert: testModule @env1:a_real_print_call_still_parses asArray last
		equals: 2.
%
