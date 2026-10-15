Class {
	#name : 'ExecWithClosureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecWithClosureTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ExecWithClosureTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_with_closure' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_with_closure.py')
		name: 'exec_with_closure'.

]

{ #category : 'Grail-Tests - Controls' }
ExecWithClosureTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '15 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - the refusals' }
ExecWithClosureTestCase >> testEveryMalformedClosureIsRefused [
	"Six shapes, one message.  CPython names the LENGTH whatever the fault
	was, so a list of the right length and a tuple holding a non-cell report
	what looks like the wrong complaint -- and matching it is the point."

	self assertMatchesCPythonAt: 'no_free_variables'.
	self assertMatchesCPythonAt: 'closure_is_none'.
	self assertMatchesCPythonAt: 'wrong_length'.
	self assertMatchesCPythonAt: 'a_list_not_a_tuple'.
	self assertMatchesCPythonAt: 'string_source_any_closure'.
	self assertMatchesCPythonAt: 'string_source_real_closure'.
	self assertMatchesCPythonAt: 'tuple_with_a_non_cell'.

]

{ #category : 'Grail-Tests - Controls' }
ExecWithClosureTestCase >> testOrdinaryExecAndCellsAreUnaffected [
	"An exec with no closure at all, and a cell used on its own."

	self assertMatchesCPythonAt: 'exec_without_closure'.
	self assertMatchesCPythonAt: 'cell_roundtrip'.

]

{ #category : 'Grail-Tests - the substitution' }
ExecWithClosureTestCase >> testTheBodyRunsWithTheSuppliedCells [
	"The first row runs with the def's OWN cells and the second with two
	replaced -- 2*3 against 35*72.  The second is the one that proves the
	cells are being used rather than the def being called."

	self assertMatchesCPythonAt: 'own_closure'.
	self assertMatchesCPythonAt: 'substituted_closure'.

]

{ #category : 'Grail-Tests - Controls' }
ExecWithClosureTestCase >> testTheClosureItselfIsUndisturbed [
	"Carrying the body text must not change what the def IS: its free
	variables, its cells, and calling it normally are all as before."

	self assertMatchesCPythonAt: 'freevars'.
	self assertMatchesCPythonAt: 'closure_length'.
	self assertMatchesCPythonAt: 'plain_call'.

]
