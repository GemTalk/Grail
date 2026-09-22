! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EvalLiveMappingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvalLiveMappingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EvalLiveMappingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EvalLiveMappingTestCase
!
! The globals/locals arguments of exec()/eval() may be MAPPINGS, and CPython
! reads them AS THE CODE RUNS: ``eval('a', g, m)'' calls ``m['a']''.
!
! Grail COPIED the caller's mappings into the SymbolDictionary the doit is
! compiled against.  For a plain dict a copy and a live read cannot be told
! apart, which is why this went unnoticed for so long; for everything else they
! can, and each difference is a wrong answer rather than a missing feature:
!
!   * a class with a __getitem__ and no storage behind it -- there is nothing to
!     enumerate, so the copy came out EMPTY and every name raised NameError;
!   * a dict subclass overriding __getitem__ -- the copy read the storage
!     underneath and never called the override, so a mapping that computes, or
!     that raises on read, was simply not consulted;
!   * a mapping whose keys() is not its contents -- dir() reported the copy;
!   * a mapping that REFUSES a write -- the bindings were written back with an
!     env-0 at:put: that its __setitem__ never saw, so a read-only namespace
!     accepted writes silently.
!
! Such a mapping is now left UNSEEDED, and that is what makes the read live:
! every name then misses the doit scope, and a miss is what reaches
! NameError >> ___resolveBuiltinOrSignal___:, which consults the live locals,
! then the live globals, then builtins.  locals() answers the mapping ITSELF --
! CPython's contract is identity, not contents, and test_general_eval compares
! against a mapping defining no __eq__ -- dir() asks it for keys(), and the
! write-back goes through __setitem__.
!
! THE TRIGGER IS AN EXACT-CLASS TEST, and getting it wrong is not subtle.  The
! first cut named KeyValueDictionary, which is PyDict's SUPERCLASS and which
! nothing Python instantiates, so EVERY dict in the corpus took the live path;
! and since an unseeded scope holds nothing, globals() answered empty.  It
! presented as an unrelated regression two cuts back.  The five controls below
! are what caught it and what keeps it caught.
!
! The two refusals are asked of different things, which is the other thing easy
! to get wrong: globals must be a real dict, locals need only be a mapping, and
! ``a mapping'' is decided by asking the TYPE for __getitem__ -- not for keys,
! which the SpreadSheet row does not have at all.
!
! Drives tests/python/eval_live_mapping.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_general_eval and test_exec_globals_error_on_get.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EvalLiveMappingTestCase removeAllMethods.
EvalLiveMappingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EvalLiveMappingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_live_mapping' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_live_mapping.py')
		name: 'eval_live_mapping'.
%

category: 'Grail-Private'
method: EvalLiveMappingTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - reads are live'
method: EvalLiveMappingTestCase
testANameIsReadThroughTheMapping
	"Both shapes a copy gets wrong: a mapping with no storage to enumerate,
	and a dict subclass whose storage is empty while its __getitem__ answers."

	self assertMatchesCPythonAt: 'name_from_mapping'.
	self assertMatchesCPythonAt: 'missing_name'.
	self assertMatchesCPythonAt: 'name_from_dict_subclass'.
	self assertMatchesCPythonAt: 'missing_in_dict_subclass'.
%

category: 'Grail-Tests - reads are live'
method: EvalLiveMappingTestCase
testTheMappingsOwnReadAndWriteAreCalled
	"A mapping that RAISES is the sharpest form of the question: if its
	__getitem__ is never called, the error never fires and the exec quietly
	succeeds.  The same for a __setitem__ that refuses."

	self assertMatchesCPythonAt: 'globals_getitem_raises'.
	self assertMatchesCPythonAt: 'write_through_setitem'.
%

category: 'Grail-Tests - locals() and dir()'
method: EvalLiveMappingTestCase
testLocalsIsTheMappingItself
	"Identity, not contents.  M defines no __eq__, so a view with exactly the
	right contents still fails -- which is the contract, not an accident of
	the test."

	self assertMatchesCPythonAt: 'locals_is_the_mapping'.
	self assertMatchesCPythonAt: 'locals_is_the_subclass'.
%

category: 'Grail-Tests - locals() and dir()'
method: EvalLiveMappingTestCase
testDirAsksTheMappingForKeys
	"keys() and __getitem__ need not agree, and here they deliberately do
	not: the mapping knows only 'a' and reports xyz.  dir() reports the keys,
	so iterating the mapping instead would answer the wrong list -- and an
	arbitrary mapping need not be iterable at all."

	self assertMatchesCPythonAt: 'dir_uses_keys'.
	self assertMatchesCPythonAt: 'dir_uses_keys_subclass'.
	self assertMatchesCPythonAt: 'globals_is_the_caller'.
%

category: 'Grail-Tests - what is refused'
method: EvalLiveMappingTestCase
testTheTwoArgumentsAreCheckedDifferently
	"globals must be a REAL DICT; locals need only be a mapping.  And
	``a mapping'' is decided by asking the TYPE for __getitem__: asking the
	INSTANCE says yes to everything, because Grail answers obj.__getitem__
	with a BoundMethod for any object at all, so the refusal never fired."

	self assertMatchesCPythonAt: 'mapping_as_globals'.
	self assertMatchesCPythonAt: 'non_mapping_locals'.
%

category: 'Grail-Tests - what is refused'
method: EvalLiveMappingTestCase
testAMappingWithNoKeysIsStillUsableAsLocals
	"The row that makes __getitem__ rather than keys the right check: this
	class has __getitem__ and __setitem__ and no keys at all, and the lookups
	nest three deep through it."

	self assertMatchesCPythonAt: 'nested_lookups'.
%

category: 'Grail-Tests - Controls'
method: EvalLiveMappingTestCase
testAPlainDictTakesThePathItAlwaysTook
	"THE CONTROL THAT MATTERS.  The live path must be reached only by a
	mapping that needs it, and the trigger is an exact-class test -- naming
	PyDict's SUPERCLASS put the whole corpus on it, and an unseeded scope
	made globals() answer empty.  These are the shapes every exec and eval in
	the corpus actually uses."

	self assertMatchesCPythonAt: 'plain_globals'.
	self assertMatchesCPythonAt: 'plain_locals'.
	self assertMatchesCPythonAt: 'plain_globals_call'.
	self assertMatchesCPythonAt: 'plain_write_back'.
	self assertMatchesCPythonAt: 'no_arguments'.
	self assertMatchesCPythonAt: 'module_globals'.
%

category: 'Grail-Tests - Controls'
method: EvalLiveMappingTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'
%
