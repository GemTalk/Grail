! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MissingArgumentMessageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MissingArgumentMessageTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MissingArgumentMessageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MissingArgumentMessageTestCase
!
! The TypeError text for a call that leaves required parameters unfilled.
!
! Grail raised from INSIDE the parameter-binding loop, which sees one parameter
! at a time, so whichever it reached first was the entire report:
!
!     def f(a, b, c): ...
!     f()
!     Grail:   missing required argument: a
!     CPython: f() missing 3 required positional arguments: 'a', 'b', and 'c'
!
! Four differences in one line, and only the first is cosmetic: the function is
! named by its __qualname__, the missing parameters are COUNTED, they are all
! listed, and the singular/plural and comma joining follow from the count.
! Collecting them cannot be done while binding, so the check is now a pre-pass
! over the same inputs the binding loop is about to use, guarded by a size
! comparison so an ordinary call pays a compare and no send.
!
! ORDER matters and is CPython's, not an accident of emission: the call is
! validated first (unexpected keyword, too many positional), then the missing
! POSITIONAL parameters are reported, and only when those are all filled are the
! missing KEYWORD-ONLY ones.  Three tests pin the three steps.
!
! Which parameters are required is not entirely a compile-time fact:
! ``__kwdefaults__'' is writable, so deleting an entry makes an
! apparently-defaulted keyword-only parameter required, and the generator that
! reads its defaults from that live cell has to consult it at runtime.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/missing_argument_message.py under it directly.
!
! KNOWN GAP, deliberately not asserted as equality.  The neighbouring
! unexpected-keyword message still reads ``got an unexpected keyword argument:
! z'' where CPython quotes the name and drops the colon; and hand-written
! library messages (functools, datetime, warnings, ...) keep their own older
! wording.  Both are separate from the binding loop this change is about.
! A classmethod or staticmethod called with too few arguments also still fails
! earlier, in BoundMethod's fixed-arity dispatch, with ``takes a different
! number of arguments'' -- a different error, not a differently-worded one.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MissingArgumentMessageTestCase removeAllMethods.
MissingArgumentMessageTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: MissingArgumentMessageTestCase
setUp
	"Reload tests/python/missing_argument_message.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'missing_argument_message' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/missing_argument_message.py')
		name: 'missing_argument_message'.
%

! ------------------------------------------------ counting and joining

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testOnePositional
	"THE BUG, at its smallest: the name alone was the whole message."

	self assert: testModule @env1:one_positional
		equals: 'f1() missing 1 required positional argument: ''a'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testTwoPositionalJoinWithBareAnd
	"Exactly two names take a bare ``and'' with no comma before it."

	self assert: testModule @env1:two_positional
		equals: 'f2() missing 2 required positional arguments: ''a'' and ''b'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testThreePositionalTakeTheOxfordComma
	"Three or more take a comma BEFORE the ``and'' as well as between the
	earlier names -- test_positional_only_arg matches this shape as a regex,
	so the joining is not cosmetic."

	self assert: testModule @env1:three_positional
		equals: 'f3() missing 3 required positional arguments: ''a'', ''b'', and ''c'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testOnlyTheUnfilledParametersAreNamed
	"``c'' arrives by keyword, so the report is the parameters actually
	unfilled -- not simply every parameter declared without a default."

	self assert: testModule @env1:only_the_unfilled_are_named
		equals: 'f3() missing 2 required positional arguments: ''a'' and ''c'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testDefaultedParametersAreNotRequired
	self assert: testModule @env1:defaults_are_not_required
		equals: 'defaulted() missing 1 required positional argument: ''a'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testStarArgsDoesNotExcuseARequiredParameter
	"``*rest'' absorbs a surplus; it does not fill ``a''.  Its presence
	suppresses the too-many-positional guard, so this is the one shape where
	nothing else would have complained."

	self assert: testModule @env1:star_args_does_not_excuse_a_required_parameter
		equals: 'starred() missing 1 required positional argument: ''a'''.
%

! ------------------------------------------------ keyword-only parameters

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testOneKeywordOnly
	"``missing keyword-only argument: k'' before -- no qualname, no count, and
	CPython's ``required'' absent."

	self assert: testModule @env1:one_keyword_only
		equals: 'kwonly1() missing 1 required keyword-only argument: ''k'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testTwoKeywordOnlyAreReportedTogether
	self assert: testModule @env1:two_keyword_only
		equals: 'kwonly2() missing 2 required keyword-only arguments: ''k'' and ''j'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testPositionalOutranksKeywordOnly
	"Both kinds missing: CPython reports the POSITIONAL ones ALONE, and says
	nothing about k and m."

	self assert: testModule @env1:positional_outranks_keyword_only
		equals: 'mixed() missing 2 required positional arguments: ''a'' and ''b'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testKeywordOnlyReportedOncePositionalIsSatisfied
	"Same def, same missing keyword-only parameters -- now that the positional
	ones are filled they are what gets reported."

	self assert: testModule @env1:keyword_only_once_positional_is_satisfied
		equals: 'mixed() missing 2 required keyword-only arguments: ''k'' and ''m'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testDeletedKeywordDefaultBecomesRequired
	"``del g.__kwdefaults__['k']'' makes a parameter declared WITH a default
	required for the next call.  A check that baked in the compile-time
	required set would answer NO ERROR here."

	self assert: testModule @env1:deleted_keyword_default_becomes_required
		equals: 'kwdefaulted.<locals>.g() missing 1 required keyword-only argument: ''k'''.
%

! ------------------------------------------------ positional-only parameters

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testPositionalOnlyIsNotFillableByKeyword
	"``posonly(c=3)'' fills c.  A keyword named ``a'' or ``b'' could not have
	filled those (PEP 570 sends it to **kwargs instead), so both are missing --
	a check that consulted the keywords for every parameter would report
	neither when they were passed that way."

	self assert: testModule @env1:positional_only_is_not_fillable_by_keyword
		equals: 'posonly() missing 2 required positional arguments: ''a'' and ''b'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testPositionalOnlyPartiallyFilled
	self assert: testModule @env1:positional_only_partially_filled
		equals: 'posonly() missing 2 required positional arguments: ''b'' and ''c'''.
%

! ------------------------------------------------ qualified names

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testMethodIsNamedByQualname
	"CPython names the __qualname__, so a method reports ``C.m()'' -- which is
	what test_call's expected text is built from."

	self assert: testModule @env1:method_is_named_by_qualname
		equals: 'C.m() missing 1 required positional argument: ''x'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testConstructorIsNamedForItsInit
	"``D()'' reports against __init__, not against the class."

	self assert: testModule @env1:init_is_named_by_qualname
		equals: 'D.__init__() missing 1 required positional argument: ''x'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testNestedFunctionIsNamedByQualname
	self assert: testModule @env1:nested_function_is_named_by_qualname
		equals: 'outer.<locals>.inner() missing 1 required positional argument: ''q'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testLambdaPositional
	self assert: testModule @env1:lambda_positional
		equals: '<lambda>() missing 2 required positional arguments: ''a'' and ''b'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testLambdaKeywordOnly
	self assert: testModule @env1:lambda_keyword_only
		equals: '<lambda>() missing 1 required keyword-only argument: ''k'''.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testVarargsForwarderMethod
	"A class-body method whose signature is not simple positional compiles
	through the FORWARDER generator, which carries its own binding loop -- and
	so carried its own copy of the old message."

	self assert: testModule @env1:varargs_forwarder_method
		equals: 'E.meth() missing 2 required positional arguments: ''a'' and ''b'''.
%

! ------------------------------------------------ order against the call guards

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testUnexpectedKeywordOutranksMissing
	"``a'' is unfilled too, but CPython validates the CALL first.  Asserted as
	a substring: that message's own wording still differs (see the class
	comment), and what this test is for is the ordering."

	self assert: testModule @env1:unexpected_keyword_outranks_missing.
%

category: 'Grail-Tests'
method: MissingArgumentMessageTestCase
testTooManyPositionalOutranksMissing
	self assert: testModule @env1:too_many_positional_outranks_missing
		equals: 'f2() takes 2 positional arguments but 3 were given'.
%
