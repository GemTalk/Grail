Class {
	#name : 'MissingArgumentMessageTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
MissingArgumentMessageTestCase >> setUp [
	"Reload tests/python/missing_argument_message.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'missing_argument_message' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/missing_argument_message.py')
		name: 'missing_argument_message'.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testConstructorIsNamedForItsInit [
	"``D()'' reports against __init__, not against the class."

	self assert: testModule @env1:init_is_named_by_qualname
		equals: 'D.__init__() missing 1 required positional argument: ''x'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testDefaultedParametersAreNotRequired [
	self assert: testModule @env1:defaults_are_not_required
		equals: 'defaulted() missing 1 required positional argument: ''a'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testDeletedKeywordDefaultBecomesRequired [
	"``del g.__kwdefaults__['k']'' makes a parameter declared WITH a default
	required for the next call.  A check that baked in the compile-time
	required set would answer NO ERROR here."

	self assert: testModule @env1:deleted_keyword_default_becomes_required
		equals: 'kwdefaulted.<locals>.g() missing 1 required keyword-only argument: ''k'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testKeywordOnlyReportedOncePositionalIsSatisfied [
	"Same def, same missing keyword-only parameters -- now that the positional
	ones are filled they are what gets reported."

	self assert: testModule @env1:keyword_only_once_positional_is_satisfied
		equals: 'mixed() missing 2 required keyword-only arguments: ''k'' and ''m'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testLambdaKeywordOnly [
	self assert: testModule @env1:lambda_keyword_only
		equals: '<lambda>() missing 1 required keyword-only argument: ''k'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testLambdaPositional [
	self assert: testModule @env1:lambda_positional
		equals: '<lambda>() missing 2 required positional arguments: ''a'' and ''b'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testMethodIsNamedByQualname [
	"CPython names the __qualname__, so a method reports ``C.m()'' -- which is
	what test_call's expected text is built from."

	self assert: testModule @env1:method_is_named_by_qualname
		equals: 'C.m() missing 1 required positional argument: ''x'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testNestedFunctionIsNamedByQualname [
	self assert: testModule @env1:nested_function_is_named_by_qualname
		equals: 'outer.<locals>.inner() missing 1 required positional argument: ''q'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testOneKeywordOnly [
	"``missing keyword-only argument: k'' before -- no qualname, no count, and
	CPython's ``required'' absent."

	self assert: testModule @env1:one_keyword_only
		equals: 'kwonly1() missing 1 required keyword-only argument: ''k'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testOnePositional [
	"THE BUG, at its smallest: the name alone was the whole message."

	self assert: testModule @env1:one_positional
		equals: 'f1() missing 1 required positional argument: ''a'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testOnlyTheUnfilledParametersAreNamed [
	"``c'' arrives by keyword, so the report is the parameters actually
	unfilled -- not simply every parameter declared without a default."

	self assert: testModule @env1:only_the_unfilled_are_named
		equals: 'f3() missing 2 required positional arguments: ''a'' and ''c'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testPositionalOnlyIsNotFillableByKeyword [
	"``posonly(c=3)'' fills c.  A keyword named ``a'' or ``b'' could not have
	filled those (PEP 570 sends it to **kwargs instead), so both are missing --
	a check that consulted the keywords for every parameter would report
	neither when they were passed that way."

	self assert: testModule @env1:positional_only_is_not_fillable_by_keyword
		equals: 'posonly() missing 2 required positional arguments: ''a'' and ''b'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testPositionalOnlyPartiallyFilled [
	self assert: testModule @env1:positional_only_partially_filled
		equals: 'posonly() missing 2 required positional arguments: ''b'' and ''c'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testPositionalOutranksKeywordOnly [
	"Both kinds missing: CPython reports the POSITIONAL ones ALONE, and says
	nothing about k and m."

	self assert: testModule @env1:positional_outranks_keyword_only
		equals: 'mixed() missing 2 required positional arguments: ''a'' and ''b'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testStarArgsDoesNotExcuseARequiredParameter [
	"``*rest'' absorbs a surplus; it does not fill ``a''.  Its presence
	suppresses the too-many-positional guard, so this is the one shape where
	nothing else would have complained."

	self assert: testModule @env1:star_args_does_not_excuse_a_required_parameter
		equals: 'starred() missing 1 required positional argument: ''a'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testThreePositionalTakeTheOxfordComma [
	"Three or more take a comma BEFORE the ``and'' as well as between the
	earlier names -- test_positional_only_arg matches this shape as a regex,
	so the joining is not cosmetic."

	self assert: testModule @env1:three_positional
		equals: 'f3() missing 3 required positional arguments: ''a'', ''b'', and ''c'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testTooManyPositionalCountsAMethodsReceiver [
	"CPython counts self (or cls) on both sides of ``takes N positional
	arguments but M were given''; Grail's were one short for every method
	(#1472).  tests/python/method_arity_message.py holds the checks -- methods,
	__init__, keyword-only and positional-only methods, a classmethod, and
	receiver-less controls -- and agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'method_arity_message' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_arity_message.py')
		name: 'method_arity_message'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testTooManyPositionalOutranksMissing [
	self assert: testModule @env1:too_many_positional_outranks_missing
		equals: 'f2() takes 2 positional arguments but 3 were given'.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testTwoKeywordOnlyAreReportedTogether [
	self assert: testModule @env1:two_keyword_only
		equals: 'kwonly2() missing 2 required keyword-only arguments: ''k'' and ''j'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testTwoPositionalJoinWithBareAnd [
	"Exactly two names take a bare ``and'' with no comma before it."

	self assert: testModule @env1:two_positional
		equals: 'f2() missing 2 required positional arguments: ''a'' and ''b'''.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testUnexpectedKeywordOutranksMissing [
	"``a'' is unfilled too, but CPython validates the CALL first.  Asserted as
	a substring: that message's own wording still differs (see the class
	comment), and what this test is for is the ordering."

	self assert: testModule @env1:unexpected_keyword_outranks_missing.

]

{ #category : 'Grail-Tests' }
MissingArgumentMessageTestCase >> testVarargsForwarderMethod [
	"A class-body method whose signature is not simple positional compiles
	through the FORWARDER generator, which carries its own binding loop -- and
	so carried its own copy of the old message."

	self assert: testModule @env1:varargs_forwarder_method
		equals: 'E.meth() missing 2 required positional arguments: ''a'' and ''b'''.

]
