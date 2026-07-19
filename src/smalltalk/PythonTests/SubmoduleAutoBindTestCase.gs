! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubmoduleAutoBindTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubmoduleAutoBindTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubmoduleAutoBindTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
SubmoduleAutoBindTestCase removeAllMethods.
SubmoduleAutoBindTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! SubmoduleAutoBindTestCase
!
! When a submodule like `pkg.sub` is registered (via any path, not
! just the ``___import__:`` flow), it should be reachable as an
! attribute on the parent package — ``pkg.sub`` not just
! ``sys.modules['pkg.sub']``.  CPython binds at import time; Grail
! used to only do it inside ``___import__:``, leaving direct
! loadModuleFromPath: callers (test setUps, dynamic .so loading,
! the recursive parent-loading inside ``___import__:`` itself) to
! produce a package with no attribute for the submodule.
! ===============================================================================

category: 'Grail-Setup'
method: SubmoduleAutoBindTestCase
setUp
	"Load the submodule and the package via direct loadModuleFromPath:.
	Ordering: _leaf first (gets registered as pkg_autobind._leaf and
	—after the fix— bound as the `_leaf` attribute on pkg_autobind);
	then __init__.py executes, whose body uses ``from . import _leaf``
	which resolves to pkg_autobind._leaf and finds it cached."

	| mods |
	mods := importlib @env1:modules.
	#( 'pkg_autobind' 'pkg_autobind._leaf' ) do: [:n |
		mods removeKey: n asSymbol ifAbsent: []].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_autobind/_leaf.py')
		name: 'pkg_autobind._leaf'.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_autobind/__init__.py')
		name: 'pkg_autobind'.
%

category: 'Grail-Tests - Submodule auto-bind'
method: SubmoduleAutoBindTestCase
testLeafBoundOnPackageBeforeInitRuns
	"After loading pkg_autobind._leaf directly, the leaf is reachable
	via attribute access on the package — required for
	``from . import _leaf`` inside __init__.py to bind anything."

	self assert: (testModule @env1:_leaf) notNil.
%

category: 'Grail-Tests - Submodule auto-bind'
method: SubmoduleAutoBindTestCase
testInitRanWithLeafAvailable
	"__init__.py's ``from . import _leaf`` + ``leaf_value = _leaf.VALUE``
	executed successfully because the leaf attribute was present."

	self assert: (testModule @env1:leaf_value) equals: 'leaf-loaded'.
%
