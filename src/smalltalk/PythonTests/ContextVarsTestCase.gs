! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ContextVarsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ContextVarsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ContextVarsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ContextVarsTestCase
!
! contextvars.ContextVar get/set/reset, with and without a default — the
! protocol the CPython shim's PyContextVar_New / _Get / _Set delegate to
! (numpy's extobj / printoptions context vars create ContextVars from C),
! and that werkzeug.local relies on.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ContextVarsTestCase removeAllMethods.
ContextVarsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ContextVarsTestCase
setUp
	"Load tests/python/contextvar_basics.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'contextvar_basics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/contextvar_basics.py')
		name: 'contextvar_basics'.
%

category: 'Grail-Tests'
method: ContextVarsTestCase
testDefaultAndSetReset
	"A ContextVar with a default returns it until set; set overrides;
	reset(token) restores the default."

	self assert: (testModule @env1:___pyAttrLoad___: #'got_default') equals: 10.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_after_set') equals: 20.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_with_arg') equals: 20.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_after_reset') equals: 10.
%

category: 'Grail-Tests'
method: ContextVarsTestCase
testNoDefault
	"Without a default and with no value set, get() raises LookupError,
	but get(fallback) returns the fallback."

	self assert: (testModule @env1:___pyAttrLoad___: #'no_default_caught') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'got_with_fallback') equals: 'fallback'.
%

category: 'Grail-Tests - Session-Local State'
method: ContextVarsTestCase
testCurrentContextLivesInSessionTempsNotCommitted
	"Regression: the current Context must live in SessionTemps, not in the
	committed contextvars module.  It used to be a module global, so every gem
	shared one Context and one _data dict: two sessions that each set a
	ContextVar -- or did decimal arithmetic, whose context is a ContextVar --
	collided on commit.  The two-session half is
	tests/scripts/run_contextvars_session_test.sh; this checks the storage."

	| cv ctx store |
	cv := (importlib ___instance___) @env1:import_module: 'contextvars'.
	ctx := cv @env1:_get_current_context.
	store := SessionTemps current
		at: #'___GrailSessionDict___contextvars' otherwise: nil.
	self assert: store notNil.
	self assert: (store @env1:__getitem__: 'current') == ctx.
	self deny: ctx isCommitted.
%
