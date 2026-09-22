! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BreakpointHookTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BreakpointHookTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BreakpointHookTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BreakpointHookTestCase
!
! PEP 553's breakpoint(), and the module-attribute store underneath it.  Three
! bugs, each hiding the next.
!
! 1. sys.breakpoint was a CLASSMETHOD.  ``sys'' in Python is the module OBJECT,
!    so an attribute read resolves against it and never saw the class-side
!    method.  pdb.set_trace() -- the default hook's target -- calls
!    sys.breakpoint(), so a bare breakpoint() with $PYTHONBREAKPOINT unset
!    raised ``'sys' object has no attribute 'breakpoint'.  Did you mean:
!    'breakpointhook'?'', naming the hook it had just come through.  Every
!    other sys function is an instance method; this one was the exception.
!
! 2. ``del sys.breakpointhook'' did NOTHING.  A module is a SymbolDictionary
!    subclass keeping globals in two stores -- dictionary entries (built-in
!    module data, where sys puts breakpointhook) and dynamic instVars (what a
!    module body assigns) -- and object's delete knew only the second.  So the
!    delete answered None and the attribute was still there, which is the worst
!    shape a delete can have: the caller is told it worked.  PEP 553 makes it
!    load-bearing, because breakpoint() is specified to raise RuntimeError once
!    the hook is gone and it could not, the hook never having gone.
!
!    Fixing the delete was not enough.  The attribute READ lazy-wraps a class
!    method when no binding is found, and sys still HAS a _breakpointhook
!    method -- the default hook's own implementation -- so breakpoint() wrapped
!    it again and ran the default, ending up in the GemStone debugger.  The
!    guard now asks ___globalNames___, the SAME list vars(sys) and dir(sys)
!    report, so the guard and the enumeration cannot disagree.  Reading the two
!    stores directly was tried first and is NOT equivalent: it answered
!    ``present'' for a hook the enumeration had already dropped.
!
! 3. ``sys.exit = f'' CALLED sys.exit(f).  object's store reads (name, name:)
!    as a getter/setter pair wherever both exist; on a module that shape is an
!    ARITY FAMILY far more often than an accessor, because sys.exit() and
!    sys.exit(code) are both legal.  So patching sys.exit terminated the
!    process with the Mock as its exit status -- which is exactly how the two
!    envar tests reported ``aMock'' as a Smalltalk error: the test process was
!    being asked to exit.
!
!    That one has nothing to do with breakpoint().  unittest.mock.patch on ANY
!    module function with a one-argument twin did this.  It is the same failure
!    object>>___mayDispatchToSetter___ already carves ``__new__'' out for, and
!    for the reason its comment gives: the pair shape lies when the one-argument
!    form takes an ARGUMENT rather than a value.  Dunders keep the old path,
!    since __name__ and __doc__ are genuine value accessors.
!
! A membership/enumeration disagreement went with it: PyModuleDict answered
! ``in'' from the value chain while keys / __len__ / __iter__ came from the key
! list, so ``'exit' in vars(sys)'' was True and ``'exit' in set(vars(sys))''
! False -- and a deleted name was still ``in'' the dict it had been deleted
! from.  Both now come from the key list.
!
! Drives tests/python/breakpoint_hook.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.  NOTE: no check calls breakpoint() with the DEFAULT
! hook in place -- under CPython that enters pdb and hangs the run, which it
! did once while this fixture was being written.
!
! test_builtin's TestBreakpoint: test_envar_good_path_other,
! test_envar_ignored_when_hook_is_set, test_runtime_error_when_hook_is_lost.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BreakpointHookTestCase removeAllMethods.
BreakpointHookTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BreakpointHookTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'breakpoint_hook' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/breakpoint_hook.py')
		name: 'breakpoint_hook'.
%

category: 'Grail-Private'
method: BreakpointHookTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - Module attribute store'
method: BreakpointHookTestCase
testPatchingAModuleFunctionStoresRatherThanCalls
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
%

category: 'Grail-Tests - Module attribute store'
method: BreakpointHookTestCase
testDundersKeepTheAccessorPath
	"THE CONTROL for narrowing the setter rule: __name__ and __doc__ are
	genuine value accessors that Grail's own module machinery reads back
	through, so the narrowing is to NON-dunder names."

	self assertMatchesCPythonAt: 'module_doc_assignable'.
	self assertMatchesCPythonAt: 'module_plain_attr'.
%

category: 'Grail-Tests - Module attribute delete'
method: BreakpointHookTestCase
testDeletingAModuleAttributeTakesEffect
	"A delete that silently does nothing is worse than one that fails: the
	caller is told it worked.  The missing-name row is the other half -- the
	fall-through to super still raises for a name that was never bound."

	self assertMatchesCPythonAt: 'before_delete'.
	self assertMatchesCPythonAt: 'after_delete'.
	self assertMatchesCPythonAt: 'delete_missing_raises'.
%

category: 'Grail-Tests - breakpoint'
method: BreakpointHookTestCase
testBreakpointForwardsToTheHook
	"Arguments and keywords pass through unchanged, and a hook that is not a
	function at all is still just called -- breakpoint() does ONE thing."

	self assertMatchesCPythonAt: 'hook_return'.
	self assertMatchesCPythonAt: 'hook_saw_no_args'.
	self assertMatchesCPythonAt: 'hook_return_args'.
	self assertMatchesCPythonAt: 'hook_saw_args'.
	self assertMatchesCPythonAt: 'hook_int'.
%

category: 'Grail-Tests - breakpoint'
method: BreakpointHookTestCase
testTheEnvironmentVariableRedirectsUnlessAHookIsSet
	"$PYTHONBREAKPOINT is read by the DEFAULT hook, so an installed hook wins
	by never letting the default run.  Both rows need patch() on a module
	function to work at all, which is how these two found bug 3."

	self assertMatchesCPythonAt: 'envar_called_target_once'.
	self assertMatchesCPythonAt: 'envar_ignored_when_hook_set'.
	self assertMatchesCPythonAt: 'envar_zero_returns_none'.
%

category: 'Grail-Tests - breakpoint'
method: BreakpointHookTestCase
testTheHookCanBeLostAndThenBreakpointRaises
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
%

category: 'Grail-Tests - Controls'
method: BreakpointHookTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '23 checks, 0 disagreeing [], keys match: True'
%
