! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubclassCopyPickleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubclassCopyPickleTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubclassCopyPickleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubclassCopyPickleTestCase
!
! Per-push guard for the set / frozenset SUBCLASS copy.deepcopy + pickle paths:
!   - copy.py's isinstance(obj, set)/isinstance(obj, frozenset) deepcopy
!     fallbacks (rebuild a distinct object of the SAME subclass),
!   - pickle.py's "y" tag for a builtin-collection subclass, and
!   - object>>__getstate__ (carries the instance __dict__ through pickle).
!
! A builtin subclass can't be defined in the eval: module scope (class-body
! #new DNU), so -- unlike SetTestCase's eval-based pickling tests -- this
! coverage needs a real loaded module (tests/python/set_subclass.py).  It lives
! in its OWN class, deliberately named so runTestsShard.gs's charSum(className)
! partition keeps its fixture COMPILE OFF the allocation-heavy collections shard
! (SetTestCase/DictTestCase/FrozensetTestCase, shard 0), where a fixture-loading
! subclass test flaked under 4-way parallel peak (temp-cache exhaustion).
! testPlacementOffCollectionsShard guards that invariant against a rename.
!
! Pickle-by-reference of the (cold-loaded) subclass needs the canonical
! sys.modules seam fix (sys>>modules instance accessor): the per-push shards
! run with canonical classes ON, and before the fix pickle._find_global read a
! deployed pickle's STALE committed sys.modules, which never saw this cold
! fixture -> PicklingError.  See docs/Persistent_Modules_and_Classes.md.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SubclassCopyPickleTestCase removeAllMethods.
SubclassCopyPickleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SubclassCopyPickleTestCase
setUp
	"Reload tests/python/set_subclass.py fresh each test (CPython-cold: no
	deployed/committed instance).  The fixture computes its checks in the
	module body inside try/except, so an import-time failure surfaces as a
	``*_ok'' = false boolean (read below) rather than a Python exception
	escaping setUp -- which, being a non-Smalltalk-Error, would bypass SUnit's
	per-test handler and crash the whole shard."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'set_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/set_subclass.py')
		name: 'set_subclass'.
%

! --- set subclass ---

category: 'Grail-Tests - set subclass'
method: SubclassCopyPickleTestCase
testSetSubclassDeepcopy
	"copy.deepcopy of a set subclass yields an independent object of the SAME
	subclass with equal contents (copy.py's isinstance(obj, set) fallback)."

	self assert: (testModule @env1:___pyAttrLoad___: #set_deepcopy_ok)
		description: (testModule @env1:___pyAttrLoad___: #set_deepcopy_err).
%

category: 'Grail-Tests - set subclass'
method: SubclassCopyPickleTestCase
testSetSubclassPickle
	"A set subclass round-trips through pickle as the SAME subclass with equal
	contents, and its instance attribute is preserved (pickle.py's y tag +
	object>>__getstate__)."

	self assert: (testModule @env1:___pyAttrLoad___: #set_pickle_ok)
		description: (testModule @env1:___pyAttrLoad___: #set_pickle_err).
%

! --- frozenset subclass ---

category: 'Grail-Tests - frozenset subclass'
method: SubclassCopyPickleTestCase
testFrozensetSubclassDeepcopy
	"copy.deepcopy of a frozenset subclass yields an object of the SAME subclass
	with equal contents (copy.py's isinstance(obj, frozenset) fallback)."

	self assert: (testModule @env1:___pyAttrLoad___: #frozenset_deepcopy_ok)
		description: (testModule @env1:___pyAttrLoad___: #frozenset_deepcopy_err).
%

category: 'Grail-Tests - frozenset subclass'
method: SubclassCopyPickleTestCase
testFrozensetSubclassPickle
	"A frozenset subclass round-trips through pickle as the SAME subclass with
	equal contents, and its instance attribute is preserved."

	self assert: (testModule @env1:___pyAttrLoad___: #frozenset_pickle_ok)
		description: (testModule @env1:___pyAttrLoad___: #frozenset_pickle_err).
%

! --- sys.modules seam (the fix these pickle tests depend on) ---

category: 'Grail-Tests - sys.modules seam'
method: SubclassCopyPickleTestCase
testSysModulesUnifiedAcrossModules
	"Every holder of a sys instance must see the ONE session sys.modules dict.
	The bug: a deployed module (pickle) warm-binds a COMMITTED instance whose
	``import sys'' global is a stale deploy-time sys instance; its captured
	#modules slot pointed at the deploy session's (committed) dict, so
	pickle.sys.modules was a DIFFERENT object than the current session's
	sys.modules -- and pickle could not resolve a module the session had
	cold-loaded (breaking pickle-by-reference under canonical mode).  The
	sys>>modules instance accessor makes every read return the session
	registry, so the two views are identical.  Meaningful under the per-push
	canonical suite (committed pickle from a prior deploy); trivially true in a
	cold isolated session."

	self assert: (self eval: 'import sys, pickle
pickle.sys.modules is sys.modules')
		description: 'pickle.sys.modules must be the same object as sys.modules'.
%

! --- placement guard ---

category: 'Grail-Tests - placement guard'
method: SubclassCopyPickleTestCase
testPlacementOffCollectionsShard
	"runTestsShard.gs partitions the suite by charSum(className) \\ workers.
	The allocation-heavy collections classes (SetTestCase/DictTestCase/
	FrozensetTestCase) all hash to shard 0, where a fixture-loading subclass
	test flaked under 4-way parallel peak.  This class MUST NOT hash there --
	assert it for the suite's worker count (4).  A rename that moves it back
	onto the collections shard fails HERE, loudly, instead of silently
	re-introducing the flake."

	| charSum |
	charSum := self class name asString
		inject: 0 into: [:acc :ch | acc + ch asInteger].
	self deny: (charSum \\ 4) = 0
		description: 'SubclassCopyPickleTestCase must not hash to the collections shard 0'.
%
