Class {
	#name : 'EvalGlobalsLocalsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EvalGlobalsLocalsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
EvalGlobalsLocalsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_globals_locals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_globals_locals.py')
		name: 'eval_globals_locals'.

]

{ #category : 'Grail-Tests - Controls' }
EvalGlobalsLocalsTestCase >> testANameStillResolvesLocalsOverGlobals [
	"THE DISCRIMINATING CONTROL for the split: the merged scope is still the
	lookup ORDER, so a bare name takes the local even though globals() cannot
	see it.  A fix that simply stopped merging would pass the tests above and
	fail here."

	self assertMatchesCPythonAt: 'name_prefers_locals'.
	self assertMatchesCPythonAt: 'name_from_globals'.
	self assertMatchesCPythonAt: 'name_with_no_args'.

]

{ #category : 'Grail-Tests - Controls' }
EvalGlobalsLocalsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '13 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - globals() sees only the globals' }
EvalGlobalsLocalsTestCase >> testExecTakesTheSameSplit [
	"exec() builds its scope through the same helper, so the split has to hold
	there too rather than only where the test suite happened to look."

	self assertMatchesCPythonAt: 'exec_globals'.
	self assertMatchesCPythonAt: 'exec_locals'.

]

{ #category : 'Grail-Tests - globals() sees only the globals' }
EvalGlobalsLocalsTestCase >> testGlobalsAnswersASuppliedGlobalsMapping [
	"The other direction, and the one that already worked -- kept because the
	fix must not close the first row by breaking this one."

	self assertMatchesCPythonAt: 'globals_kwarg'.
	self assertMatchesCPythonAt: 'positional_globals'.

]

{ #category : 'Grail-Tests - globals() sees only the globals' }
EvalGlobalsLocalsTestCase >> testGlobalsIgnoresASuppliedLocalsMapping [
	"The failing row.  A name handed in as the LOCALS must not be reachable
	through globals(), which answers the caller's own value instead."

	self assertMatchesCPythonAt: 'locals_kwarg'.
	self assertMatchesCPythonAt: 'positional_both'.

]

{ #category : 'Grail-Tests - Controls' }
EvalGlobalsLocalsTestCase >> testTheCommonShapesAreUntouched [
	"The split is reached only when the two mappings DIFFER.  One mapping, the
	same mapping twice, or none at all must behave exactly as before -- this is
	what makes the change safe for the corpus, where nearly every eval() passes
	at most one."

	self assertMatchesCPythonAt: 'same_mapping_twice'.
	self assertMatchesCPythonAt: 'globals_is_a_dict'.
	self assertMatchesCPythonAt: 'globals_has_the_key'.
	self assertMatchesCPythonAt: 'assignment_goes_to_locals'.

]
