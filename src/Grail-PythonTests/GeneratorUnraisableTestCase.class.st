Class {
	#name : 'GeneratorUnraisableTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GeneratorUnraisableTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
GeneratorUnraisableTestCase >> setUp [
	"Reload tests/python/generator_unraisable.py fresh each test -- the module
	body installs and restores sys.unraisablehook and closes the generators it
	measures, so a shared instance would be measuring a previous test's leftovers."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'generator_unraisable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_unraisable.py')
		name: 'generator_unraisable'.

]

{ #category : 'Grail-Tests - The Hook Runs' }
GeneratorUnraisableTestCase >> testAFailedCloseLookupReachesTheHook [
	"THE TEST THIS EXISTS FOR.  The sub-iterator's __getattr__ raises
	ZeroDivisionError while ``close'' is being looked up, and that exception
	used to go nowhere at all -- no raise, no report, no record."

	self assertMatchesCPythonAt: 'hook_calls'.
	self assertMatchesCPythonAt: 'exc_type_is_zero_division'.
	self assertMatchesCPythonAt: 'exc_value_is_instance'.
	self assertMatchesCPythonAt: 'exc_value_message'.

]

{ #category : 'Grail-Tests - The Hook Runs' }
GeneratorUnraisableTestCase >> testAnOrdinaryDelegatedCloseDoesNotReachTheHook [
	"The control, and the reason the count above means anything: a sub-iterator
	with no ``close'' is SKIPPED, silently and correctly.  A hook that fired on
	every delegated close would satisfy every other test here."

	self assertMatchesCPythonAt: 'fine_hook_calls'.
	self assertMatchesCPythonAt: 'fine_value'.
	self assertMatchesCPythonAt: 'fine_close_returns'.

]

{ #category : 'Grail-Tests - The Close Still Works' }
GeneratorUnraisableTestCase >> testCloseStillAnswersNoneAndExhaustsTheGenerator [
	"The reporting is OUT OF BAND: the GeneratorExit close() injected still
	carries on out of the body, so close() answers None and the generator is
	finished.  Letting the sub-iterator's exception propagate instead would turn
	close() into a raise, which is the obvious wrong fix."

	self assertMatchesCPythonAt: 'first_value'.
	self assertMatchesCPythonAt: 'close_returns'.
	self assertMatchesCPythonAt: 'closed_is_exhausted'.

]

{ #category : 'Grail-Tests - Hook Argument' }
GeneratorUnraisableTestCase >> testEveryFieldIsReadableIncludingTheEmptyOnes [
	"An ABSENT attribute would raise AttributeError where CPython answers None,
	and a hook reads the fields it was not given as readily as the ones it was."

	self assertMatchesCPythonAt: 'has_all_fields'.

]

{ #category : 'Grail-Tests - The Close Still Works' }
GeneratorUnraisableTestCase >> testTheHookIsAnAssignableAttribute [
	"``sys.unraisablehook = h'' has to take, and has to be restorable, or a
	context manager cannot be built on it -- which is what
	test.support.catch_unraisable_exception is."

	self assertMatchesCPythonAt: 'hook_restored'.

]

{ #category : 'Grail-Tests - Hook Argument' }
GeneratorUnraisableTestCase >> testTheReportNamesTheObjectInTheMessage [
	"CPython 3.14 uses PyErr_FormatUnraisable here, which puts the repr in
	``err_msg'' and leaves ``object'' None -- the opposite of
	PyErr_WriteUnraisable.  Both fields are checked, because filling the wrong
	one still produces a hook call and a correct exc_type."

	self assertMatchesCPythonAt: 'object_is_none'.
	self assertMatchesCPythonAt: 'err_msg'.

]
