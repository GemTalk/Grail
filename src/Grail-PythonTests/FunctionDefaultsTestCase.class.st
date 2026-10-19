Class {
	#name : 'FunctionDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionDefaultsTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionDefaultsTestCase >> setUp [
	"Reload tests/python/function_defaults.py fresh each test: several probes
	ASSIGN __defaults__, which now writes through to the def-time temps, so a
	shared instance would let one test bind what another test wrote."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_defaults.py')
		name: 'function_defaults'.

]

{ #category : 'Grail-Tests - None Is The Honest Answer' }
FunctionDefaultsTestCase >> testADefWithNoDefaultsReportsNone [
	"None rather than an empty tuple, and None for a def with parameters that
	simply have no defaults -- the two shapes a shortcut would have got right
	while getting everything else wrong."

	self assertMatchesCPythonAt: 'no_parameters_at_all'.
	self assertMatchesCPythonAt: 'parameters_but_no_defaults'.

]

{ #category : 'Grail-Tests - Reading The Real Values' }
FunctionDefaultsTestCase >> testAMutableDefaultIsTheSameObject [
	"By IDENTITY: what __defaults__ reports is the object the call binds, not a
	re-evaluation of the default expression.  A default is evaluated once, at
	def time, and for a mutable or side-effecting one the difference between
	those two readings is the whole of Python's most famous gotcha."

	self assertMatchesCPythonAt: 'closes_over_a_mutable'.

]

{ #category : 'Grail-Tests - Writing Them' }
FunctionDefaultsTestCase >> testAssignmentChangesWhatTheCallBinds [
	"The half that makes the attribute worth having.  A default that reads back
	but does not take effect is worse than no attribute at all -- and that is
	exactly what a read-only implementation would have produced, since the
	write already had somewhere to land.  Checked at three arities so a write
	that clobbered the binding logic rather than the defaults would show."

	self assertMatchesCPythonAt: 'assignment_reads_back'.
	self assertMatchesCPythonAt: 'assignment_changes_what_the_call_binds'.

]

{ #category : 'Grail-Tests - Writing Them' }
FunctionDefaultsTestCase >> testDeletingAndTypeChecking [
	"``del f.__defaults__'' reports None afterwards, and a non-tuple is refused
	with CPython's message.  See this class's comment for what deleting does NOT
	do."

	self assertMatchesCPythonAt: 'deleting_clears_them'.
	self assertMatchesCPythonAt: 'a_non_tuple_is_refused'.

]

{ #category : 'Grail-Tests - Reading The Real Values' }
FunctionDefaultsTestCase >> testOnlyTheTrailingPositionalParameters [
	"CPython pairs defaults with the LAST positional parameters, so three
	parameters and one default is a one-tuple.  Keyword-only defaults are not
	here at all -- they belong to __kwdefaults__ -- which the mixed def checks
	from both sides at once."

	self assertMatchesCPythonAt: 'only_the_trailing_parameters'.
	self assertMatchesCPythonAt: 'keyword_only_defaults_are_not_here'.
	self assertMatchesCPythonAt: 'positional_and_keyword_only_together'.

]

{ #category : 'Grail-Tests - Reading The Real Values' }
FunctionDefaultsTestCase >> testTheDefaultsThemselves [
	"THE TEST THIS EXISTS FOR, and what makes the None above honest: when there
	ARE defaults, the same walk reports them."

	self assertMatchesCPythonAt: 'one_default'.
	self assertMatchesCPythonAt: 'two_defaults'.

]
