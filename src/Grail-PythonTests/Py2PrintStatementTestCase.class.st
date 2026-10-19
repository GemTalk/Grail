Class {
	#name : 'Py2PrintStatementTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
Py2PrintStatementTestCase >> setUp [
	"Reload tests/python/py2_print_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'py2_print_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/py2_print_statement.py')
		name: 'py2_print_statement'.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testAnUnnamedJuxtapositionIsPlainInvalidSyntax [
	"Only those two names get the hint.  Answering the print message for every
	juxtaposition would pass the tests above and misdescribe everything else."

	self assert: testModule @env1:an_unnamed_juxtaposition_is_plain_invalid_syntax asArray
		equals: #( true false ).

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testARealPrintCallStillParses [
	"The Python-3 spelling, a semicolon-separated run and a trailing semicolon
	all still parse -- the terminator check must not reject what it never
	rejected before."

	self assert: testModule @env1:a_real_print_call_still_parses asArray last
		equals: 2.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testExecGetsItsOwnHint [
	"``exec'' is the other Python-2 statement keyword CPython names."

	self assert: testModule @env1:exec_gets_its_own_hint equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testInALoopOnTheSameLine [
	"bpo-32685 -- the hint must survive a compound-statement header on the same
	line, which is where the statement run starts after the colon."

	self assert: testModule @env1:in_a_loop_on_the_same_line equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testNormalString [
	"THE BUG.  Grail parsed this as two statements and reported nothing."

	self assert: testModule @env1:normal_string equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testWithExcessiveWhitespace [
	"The hint is keyed on the statement, not on the spacing."

	self assert: testModule @env1:with_excessive_whitespace equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testWithLeadingWhitespace [
	"Indented inside a compound statement -- the check runs per simple-statement
	run, so it fires in a suite as well as at top level."

	self assert: testModule @env1:with_leading_whitespace equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testWithSemicolon [
	"``print p;'' used to raise a NameError naming p, which named the wrong
	problem: the syntax is Python 2, and p is beside the point."

	self assert: testModule @env1:with_semicolon equals: true.

]

{ #category : 'Grail-Tests' }
Py2PrintStatementTestCase >> testWithSoftSpace [
	"Python 2's trailing comma."

	self assert: testModule @env1:with_soft_space equals: true.

]
