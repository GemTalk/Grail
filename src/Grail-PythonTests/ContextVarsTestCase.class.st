Class {
	#name : 'ContextVarsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ContextVarsTestCase >> setUp [
	"Load tests/python/contextvar_basics.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'contextvar_basics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/contextvar_basics.py')
		name: 'contextvar_basics'.

]

{ #category : 'Grail-Tests - Session-Local State' }
ContextVarsTestCase >> testCurrentContextLivesOnTheThreadNotCommitted [
	"Regression: the current Context must live with the calling THREAD, not
	in the committed contextvars module.  It used to be a module
	global, so every gem shared one Context and one _data dict: two sessions
	that each set a ContextVar -- or did decimal arithmetic, whose context is a
	ContextVar -- collided on commit.  The two-session half is
	tests/scripts/run_contextvars_session_test.sh; this checks the storage.

	Per THREAD now, as CPython's (see _thread >> _get_context): a thread
	started by start_new_thread keeps it on its GsProcess, and the main thread
	-- this test's -- in SessionTemps, since successive GCI calls need not run
	on the same process."

	| cv ctx |
	cv := (importlib ___instance___) @env1:import_module: 'contextvars'.
	ctx := cv @env1:_get_current_context.
	self assert: (SessionTemps current at: #'GrailPyMainContext' otherwise: nil) == ctx.
	self deny: ctx isCommitted.

]

{ #category : 'Grail-Tests' }
ContextVarsTestCase >> testDefaultAndSetReset [
	"A ContextVar with a default returns it until set; set overrides;
	reset(token) restores the default."

	self assert: (testModule @env1:___pyAttrLoad___: #'got_default') equals: 10.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_after_set') equals: 20.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_with_arg') equals: 20.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_after_reset') equals: 10.

]

{ #category : 'Grail-Tests' }
ContextVarsTestCase >> testNoDefault [
	"Without a default and with no value set, get() raises LookupError,
	but get(fallback) returns the fallback."

	self assert: (testModule @env1:___pyAttrLoad___: #'no_default_caught') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_with_fallback') equals: 'fallback'.

]
