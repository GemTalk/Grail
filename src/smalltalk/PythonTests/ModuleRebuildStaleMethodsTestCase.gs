! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleRebuildStaleMethodsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleRebuildStaleMethodsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleRebuildStaleMethodsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleRebuildStaleMethodsTestCase (issue #1219)
!
! A module rebuild -- importlib.reload, or a fresh gem rebuilding a stale
! committed module into its instance -- recompiles the module class in place.
! It used to only ADD methods, so a def whose call shapes changed kept its old
! fixed-arity selector, and ``f(1, 2)'' ran the old body after ``def f(a, b)''
! became ``def f(a, b=None)''.  importlib ___removeStaleModuleMethods___:...
! now removes what the build did not compile again, for every name the new
! source binds.
!
! Driven by tests/python/module_rebuild_stale_methods.py, whose EXPECTED table
! is CPython 3.14's output.  It exercises the reload path; the committed-gem
! path goes through the same build (___buildModuleClassBody:name:), and a test
! case cannot commit.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleRebuildStaleMethodsTestCase removeAllMethods.
ModuleRebuildStaleMethodsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleRebuildStaleMethodsTestCase
setUp
	(importlib @env1:modules) removeKey: #'module_rebuild_stale_methods' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_rebuild_stale_methods.py')
		name: 'module_rebuild_stale_methods'.
%

category: 'Grail-Setup'
method: ModuleRebuildStaleMethodsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'module_rebuild_stale_methods' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: ModuleRebuildStaleMethodsTestCase
testRebuiltModulesMatchCPython
	"Every row of the fixture agrees with CPython, and the one known
	divergence (a handle fetched before the reload) still diverges."

	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
