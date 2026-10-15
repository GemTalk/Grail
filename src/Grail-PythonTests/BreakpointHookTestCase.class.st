Class {
	#name : 'BreakpointHookTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BreakpointHookTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
BreakpointHookTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'breakpoint_hook' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/breakpoint_hook.py')
		name: 'breakpoint_hook'.

]

{ #category : 'Grail-Tests - breakpoint' }
BreakpointHookTestCase >> testBreakpointForwardsToTheHook [
	"Arguments and keywords pass through unchanged, and a hook that is not a
	function at all is still just called -- breakpoint() does ONE thing."

	self assertMatchesCPythonAt: 'hook_return'.
	self assertMatchesCPythonAt: 'hook_saw_no_args'.
	self assertMatchesCPythonAt: 'hook_return_args'.
	self assertMatchesCPythonAt: 'hook_saw_args'.
	self assertMatchesCPythonAt: 'hook_int'.

]

{ #category : 'Grail-Tests - Module attribute delete' }
BreakpointHookTestCase >> testDeletingAModuleAttributeTakesEffect [
	"A delete that silently does nothing is worse than one that fails: the
	caller is told it worked.  The missing-name row is the other half -- the
	fall-through to super still raises for a name that was never bound."

	self assertMatchesCPythonAt: 'before_delete'.
	self assertMatchesCPythonAt: 'after_delete'.
	self assertMatchesCPythonAt: 'delete_missing_raises'.

]

{ #category : 'Grail-Tests - Module attribute store' }
BreakpointHookTestCase >> testDundersKeepTheAccessorPath [
	"THE CONTROL for narrowing the setter rule: __name__ and __doc__ are
	genuine value accessors that Grail's own module machinery reads back
	through, so the narrowing is to NON-dunder names."

	self assertMatchesCPythonAt: 'module_doc_assignable'.
	self assertMatchesCPythonAt: 'module_plain_attr'.

]

{ #category : 'Grail-Tests - Controls' }
BreakpointHookTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '23 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Module attribute store' }
BreakpointHookTestCase >> testPatchingAModuleFunctionStoresRatherThanCalls [
	"sys.exit is the case that bit, because it has both a zero- and a
	one-argument form.  os.getcwd is the CONTROL -- no one-argument twin, so it
	was never affected -- and the pair is what says the fix is about the SHAPE
	rather than about sys."

	self assertMatchesCPythonAt: 'patched_exit_is_the_mock'.
	self assertMatchesCPythonAt: 'patched_exit_type'.
	self assertMatchesCPythonAt: 'exit_mock_gone_after_del'.
	self assertMatchesCPythonAt: 'exit_restored_by_assignment'.
	self assertMatchesCPythonAt: 'patched_getcwd_is_the_mock'.
	self assertMatchesCPythonAt: 'getcwd_restored'.

]

{ #category : 'Grail-Tests - breakpoint' }
BreakpointHookTestCase >> testTheEnvironmentVariableRedirectsUnlessAHookIsSet [
	"$PYTHONBREAKPOINT is read by the DEFAULT hook, so an installed hook wins
	by never letting the default run.  Both rows need patch() on a module
	function to work at all, which is how these two found bug 3."

	self assertMatchesCPythonAt: 'envar_called_target_once'.
	self assertMatchesCPythonAt: 'envar_ignored_when_hook_set'.
	self assertMatchesCPythonAt: 'envar_zero_returns_none'.

]

{ #category : 'Grail-Tests - breakpoint' }
BreakpointHookTestCase >> testTheHookCanBeLostAndThenBreakpointRaises [
	"The guard asks the module's two STORES -- a dynamic instVar and a
	dictionary entry -- and NOT the enumeration, which looks like the tidier
	question and is a different one: that list includes every name the
	module's own METHODS could be lazily wrapped under, and sys keeps a
	``_breakpointhook'' method.  A guard written that way can never fire, and
	the consequence is not a failed test but a HALT into the GemStone
	debugger, which takes the whole module down -- test.test_builtin went to
	CRASH while this was being written.

	Which is also why the enumeration AFTER the delete is not asserted: Grail
	still lists the name, because the method is still there.  That divergence
	is about the lazy wrap rather than the store, and pinning it would claim
	this change addresses it."

	self assertMatchesCPythonAt: 'hook_present_before_del'.
	self assertMatchesCPythonAt: 'breakpoint_after_del'.
	self assertMatchesCPythonAt: 'hook_restored_by_assignment'.
	self assertMatchesCPythonAt: 'hook_present_again'.

]
