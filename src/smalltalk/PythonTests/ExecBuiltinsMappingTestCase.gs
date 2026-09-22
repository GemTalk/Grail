! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecBuiltinsMappingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecBuiltinsMappingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecBuiltinsMappingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecBuiltinsMappingTestCase
!
! ``__builtins__'' in the globals mapping REPLACES the builtins namespace for
! the code exec()/eval() runs.
!
! That is the whole of CPython's sandboxing story: ``exec(src, {'__builtins__':
! {}})'' runs source that cannot reach print, open or __import__, and
! ``{'__builtins__': m}'' runs it with m's names instead of the real ones.  It
! is an EXCLUSIVE choice, not an extra place to look -- falling back to the real
! builtins after the override missed hands back exactly the name the caller took
! away, which is the one thing the caller was trying to prevent.
!
! Grail resolved builtins against the one real builtins singleton and never
! looked at the mapping, so every such call ran with the FULL builtins
! available.  The restriction was accepted and then silently ignored, which is
! worse than refusing it: code written to be sandboxed ran unsandboxed and
! nothing said so.
!
! TWO HALVES HAD TO MOVE, and only the first is obvious.
!
! The RUNTIME resolver -- NameError >> ___resolveBuiltinOrSignal___:, where a
! name the compiler could not bind ends up -- now consults the override through
! __getitem__.  Through the Python protocol rather than a class-specific read,
! because the mappings are deliberately exotic: a dict subclass, a
! MappingProxyType, one whose __getitem__ RAISES.  Only KeyError is absorbed;
! anything else is the caller's mapping saying something, and swallowing it
! would report a NameError about the wrong thing.
!
! The COMPILE-TIME binding is the half that is easy to miss.  A call to a name
! Grail knows is a builtin never reaches the resolver -- it compiles straight to
! a send on the builtins singleton -- so ``exec(\"print('x')\", {'__builtins__':
! {}})'' PRINTED.  Worse, removing only the fast path left the arity check
! behind, which concluded the call was malformed and emitted a TypeError about
! print's arity where CPython raises NameError for print itself.  A doit
! compiled while an override is installed declines the fast paths AND the arity
! check, and the call goes through the resolver.
!
! AbstractNode >> ___builtinsAreOverridden___ is where that is decided.  It can
! be a compile-time question because a doit is compiled by the exec() that is
! about to run it: the override is already installed, and the answer cannot
! change under the compiled method.  Module code is never affected -- its
! builtins are not replaceable and its compile long predates any exec.
!
! Drives tests/python/exec_builtins_mapping.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_exec_globals, test_exec_globals_dict_subclass and
! test_eval_builtins_mapping.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecBuiltinsMappingTestCase removeAllMethods.
ExecBuiltinsMappingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecBuiltinsMappingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_builtins_mapping' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_builtins_mapping.py')
		name: 'exec_builtins_mapping'.
%

category: 'Grail-Private'
method: ExecBuiltinsMappingTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the override is consulted'
method: ExecBuiltinsMappingTestCase
testANameResolvesThroughTheSuppliedMapping
	"Three mapping shapes, because the callers are deliberately exotic and the
	only thing they agree on is that a name can be subscripted out of them."

	self assertMatchesCPythonAt: 'found_in_dict'.
	self assertMatchesCPythonAt: 'found_in_subclass'.
	self assertMatchesCPythonAt: 'found_in_proxy'.
%

category: 'Grail-Tests - the override is consulted'
method: ExecBuiltinsMappingTestCase
testTheRealBuiltinsAreNotConsultedAfterAMiss
	"The row that makes the choice EXCLUSIVE rather than additive.  ``len''
	exists in the real builtins, and under an empty override it must not:
	falling through would hand back exactly the name the caller took away."

	self assertMatchesCPythonAt: 'missing_in_dict'.
	self assertMatchesCPythonAt: 'missing_in_subclass'.
	self assertMatchesCPythonAt: 'missing_in_proxy'.
	self assertMatchesCPythonAt: 'real_builtin_is_gone'.
%

category: 'Grail-Tests - the compile-time half'
method: ExecBuiltinsMappingTestCase
testACompileTimeBoundBuiltinIsGatedToo
	"A call to a name Grail binds while compiling never reaches the runtime
	resolver, so print() under an empty __builtins__ PRINTED.  The last row is
	the one that proves the gate routes rather than merely refuses: a
	SUBSTITUTED print is the one that gets called."

	self assertMatchesCPythonAt: 'print_call_gated'.
	self assertMatchesCPythonAt: 'len_call_gated'.
	self assertMatchesCPythonAt: 'print_substituted'.
%

category: 'Grail-Tests - error shapes'
method: ExecBuiltinsMappingTestCase
testOnlyKeyErrorMeansNoSuchName
	"A mapping whose __getitem__ raises something else is saying something,
	and absorbing it would report a NameError about the wrong thing."

	self assertMatchesCPythonAt: 'getitem_raises'.
%

category: 'Grail-Tests - error shapes'
method: ExecBuiltinsMappingTestCase
testANonMappingIsLazyNotEager
	"CPython does not check the type at exec() time.  Source that never asks
	builtins for a name RUNS TO COMPLETION with __builtins__ = 123, and source
	that does gets whatever subscripting that object raises -- three different
	messages for an int, a str and a list.  An eager check would raise where
	CPython does not and replace three accurate messages with one invented
	one."

	self assertMatchesCPythonAt: 'nonmapping_unused'.
	self assertMatchesCPythonAt: 'nonmapping_int'.
	self assertMatchesCPythonAt: 'nonmapping_none'.
%

category: 'Grail-Tests - Controls'
method: ExecBuiltinsMappingTestCase
testNothingWithoutAnOverrideChanges
	"THE CONTROL for the compile-time gate, which is the risky half: it
	suppresses Grail's builtin fast paths, so it must fire ONLY under an
	override.  An exec with no __builtins__ keeps every fast path, the caller
	keeps its own builtins afterwards, and a NESTED exec that strips them must
	not strip the outer one's."

	self assertMatchesCPythonAt: 'no_override_builtin'.
	self assertMatchesCPythonAt: 'no_override_print'.
	self assertMatchesCPythonAt: 'restored_after'.
	self assertMatchesCPythonAt: 'nested_exec_restores'.
	self assertMatchesCPythonAt: 'module_scope_unaffected'.
%

category: 'Grail-Tests - Controls'
method: ExecBuiltinsMappingTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'
%
