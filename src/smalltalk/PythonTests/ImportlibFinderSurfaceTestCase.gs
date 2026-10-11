! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibFinderSurfaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibFinderSurfaceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportlibFinderSurfaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportlibFinderSurfaceTestCase - G5 (docs/Package_Census.md)
! ===============================================================================
!   The importlib surface finders and loaders are written against:
!   importlib.abc, importlib.machinery.PathFinder / NamespaceLoader,
!   importlib.util.MAGIC_NUMBER, importlib.resources.readers.FileReader, and
!   spec_from_file_location keeping the caller's loader -- which is what lets a
!   sys.meta_path finder like pytest's assertion-rewriting hook supply a module.
!
! tests/python/importlib_finder_surface.py holds the 11 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportlibFinderSurfaceTestCase removeAllMethods.
ImportlibFinderSurfaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportlibFinderSurfaceTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/importlib_finder_surface.py'
		name: 'importlib_finder_surface'
%

category: 'Grail-Helpers'
method: ImportlibFinderSurfaceTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ImportlibFinderSurfaceTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: ImportlibFinderSurfaceTestCase
testAbcClassesCanBeSubclassed

	self assertAll: #('abc_names' 'abc_subclass_defaults')
%

category: 'Grail-Tests'
method: ImportlibFinderSurfaceTestCase
testPathFinderSearchesTheEntriesItIsGiven

	self assertAll: #('pathfinder_module' 'pathfinder_package'
		'pathfinder_namespace' 'pathfinder_missing')
%

category: 'Grail-Tests'
method: ImportlibFinderSurfaceTestCase
testAMetaPathFinderSuppliesAModuleThroughItsOwnLoader

	self assertAll: #('spec_keeps_loader' 'meta_path_loader_runs')
%

category: 'Grail-Tests'
method: ImportlibFinderSurfaceTestCase
testSmallerNames

	self assertAll: #('magic_number' 'file_reader' 'namespace_loader')
%

category: 'Grail-Tests - coverage'
method: ImportlibFinderSurfaceTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11
%
