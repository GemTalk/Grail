! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WarningsApi314TestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WarningsApi314TestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningsApi314TestCase comment:
'The warnings surface CPython 3.14 expects, and the modules behind it.

test.test_warnings failed to IMPORT on four separate things, each hidden behind
the last: PEP 702''s @deprecated, the vendored _py_warnings it lives in, the
_warnings accelerator that import_fresh_module probes for, and the
unittest.case seam the test uses to redirect assertWarns.

CPython 3.14 splits warnings into three layers -- _py_warnings (pure Python),
_warnings (a C extension replacing its hot parts), and a warnings shim
preferring the C one.  Grail''s arrangement differs: its warnings is a native
Smalltalk module that already IS the fast implementation, so _warnings
re-exports from IT.  That is the same inversion _contextvars makes for
contextvars, and it is what makes
``import_fresh_module("warnings", fresh=["_warnings", "_py_warnings"])'' answer
the native module instead of None.

@deprecated is CPython''s own implementation, reached through the vendored
_py_warnings rather than rewritten here -- it patches __new__ and
__init_subclass__ through functools.wraps.  _py_warnings holds no state of its
own: every global it touches is read off ``_wm'', set by _set_module, which
starts as None.  Pointing it at Grail''s warnings is what makes a @deprecated
warning land in Grail''s filters rather than in a second, parallel set that
nothing else consults.

NOT covered, deliberately: @deprecated applied to a CLASS.  It marks the class,
but instantiating one fails -- Grail does not unwrap the staticmethod that
@deprecated assigns to __new__.  That is a descriptor-path gap, not a warnings
one.

See tests/python/warnings_api_314.py.'
%

expectvalue /Class
doit
WarningsApi314TestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
WarningsApi314TestCase removeAllMethods: 0.
WarningsApi314TestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningsApi314TestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warnings_api_314' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_api_314.py')
		name: 'warnings_api_314'.
%

category: 'Grail-Helpers'
method: WarningsApi314TestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningsApi314TestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - PEP 702'
method: WarningsApi314TestCase
testDeprecatedMarksItsTarget
	"The message is recorded on the object, which is what a type checker
	reads -- and it is recorded even when category=None silences the runtime
	warning entirely."

	self assertAll: #('deprecated_importable_from_warnings'
		'marks_the_function' 'marks_even_when_silent')
%

category: 'Grail-Tests - PEP 702'
method: WarningsApi314TestCase
testDeprecatedFunctionWarnsOnCall
	"Through GRAIL''s filters: the check promotes warnings to errors with
	Grail''s own simplefilter, so a warning arriving anywhere else would not
	be seen.  That is the _set_module wiring being exercised."

	self assertAll: #('calling_a_deprecated_function_warns'
		'category_none_stays_quiet')
%

category: 'Grail-Tests - PEP 702'
method: WarningsApi314TestCase
testDeprecatedFunctionIsStillTheFunction
	"Same return value, same __name__ -- the wrapper must not be observable."

	self assertAll: #('deprecated_function_still_returns'
		'deprecated_function_keeps_its_name')
%

category: 'Grail-Tests - module surface'
method: WarningsApi314TestCase
testUseContextAndShowwarning
	"_use_context is read by the helper every filter test in test_warnings
	runs through; without it ten tests died before doing anything."

	self assertAll: #('use_context_is_false' 'showwarning_exists')
%

category: 'Grail-Tests - module surface'
method: WarningsApi314TestCase
testWarnExplicitFullSignature
	"Only the first four arguments carry information Grail acts on, but a
	call passing ``module='' must still bind rather than failing arity."

	self assertAll: #('warn_explicit_accepts_module_keyword'
		'warn_explicit_four_positional')
%

category: 'Grail-Tests - modules behind it'
method: WarningsApi314TestCase
testUnderscoreContextvarsIsTheSameClass
	"Same object, not a same-named twin: isinstance across the two spellings
	has to hold."

	self assertAll: #('contextvars_underscore_is_the_same_class'
		'contextvar_round_trips')
%

category: 'Grail-Tests - modules behind it'
method: WarningsApi314TestCase
testUnderscoreWarningsReExportsTheNativeModule
	"_warnings is the accelerator''s name, and on Grail the native Smalltalk
	warnings is what plays that role."

	self assertAll: #('underscore_warnings_exposes_warn'
		'underscore_warnings_exposes_warn_explicit')
%

category: 'Grail-Tests - modules behind it'
method: WarningsApi314TestCase
testVendoredPyWarningsImports
	"866 lines of CPython, running unchanged -- which is where @deprecated
	comes from."

	self assertAll: #('py_warnings_importable' 'py_warnings_has_deprecated')
%

category: 'Grail-Tests - modules behind it'
method: WarningsApi314TestCase
testThreeFourteenSysFlags
	"Both new flags are 0 in a default CPython build too, so the value is not
	a Grail compromise -- but the NAMES have to exist, because _py_warnings
	reads context_aware_warnings at import time."

	self assertAll: #('flag_context_aware_warnings'
		'flag_thread_inherit_context' 'flag_gil')
%

category: 'Grail-Tests - modules behind it'
method: WarningsApi314TestCase
testUnittestCaseSeamExists
	"test_warnings reassigns unittest.case.warnings to redirect assertWarns.
	CPython gets the binding free from defining TestCase there; Grail defines
	it in unittest/__init__.py, so the submodule had to be added AND bound."

	self assertAll: #('unittest_case_is_reachable')
%
