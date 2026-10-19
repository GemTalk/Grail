Class {
	#name : 'CompileSingleModeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CompileSingleModeTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
CompileSingleModeTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #compile_single_mode ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_single_mode.py')
		name: 'compile_single_mode'.

]

{ #category : 'Grail-Tests' }
CompileSingleModeTestCase >> testAnExpressionShowsItsRepr [
	"The headline: ``1 + 1'' shows 2 and a string shows its repr, while None
	shows nothing and a print() is not echoed a second time."

	self assertMatchesCPythonAt: 'an_expression_shows_its_repr'.
	self assertMatchesCPythonAt: 'none_shows_nothing'.
	self assertMatchesCPythonAt: 'print_is_not_doubled'.
	self assertMatchesCPythonAt: 'each_statement_on_a_line'.

]

{ #category : 'Grail-Tests - Controls' }
CompileSingleModeTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '11 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
CompileSingleModeTestCase >> testExecModeStaysSilent [
	"The rewrite is gated on the mode: the same source compiled for exec shows
	nothing, as it always did."

	self assertMatchesCPythonAt: 'exec_mode_shows_nothing'.

]

{ #category : 'Grail-Tests' }
CompileSingleModeTestCase >> testTheHookIsSysDisplayhook [
	"The value goes through sys.displayhook AS IT IS AT RUN TIME -- doctest
	and the REPL both replace it -- and the default one sets builtins._ and
	writes to a redirected sys.stdout."

	self assertMatchesCPythonAt: 'the_hook_is_looked_up_at_run_time'.
	self assertMatchesCPythonAt: 'builtins_underscore_is_set'.
	self assertMatchesCPythonAt: 'displayhook_writes_to_sys_stdout'.

]

{ #category : 'Grail-Tests' }
CompileSingleModeTestCase >> testTheInteractiveStatementIsTheScope [
	"A top-level ``for'' shows every value; a def's or a class's body shows
	nothing.  Both sides, because the walk that finds the statements is the
	part most easily got wrong in either direction."

	self assertMatchesCPythonAt: 'in_a_loop'.
	self assertMatchesCPythonAt: 'not_in_a_def'.
	self assertMatchesCPythonAt: 'not_in_a_class_body'.

]
