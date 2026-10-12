! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubmoduleParentPathTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubmoduleParentPathTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubmoduleParentPathTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubmoduleParentPathTestCase - a submodule is found through its parent's __path__
! ===============================================================================
!   CPython looks for ``pkg.sub'' only in ``pkg.__path__''.  Grail joined the
!   dotted name onto its search roots, which misses every package whose
!   __path__ is not the directory its name spells: setuptools' ``distutils''
!   (setuptools._distutils registered under another name by a meta-path
!   finder), a package that appends to its __path__, and one that replaces it.
!   __path__ is also a Python list now, so the append idiom can run at all.
!
! tests/python/submodule_parent_path.py holds the 8 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SubmoduleParentPathTestCase removeAllMethods.
SubmoduleParentPathTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SubmoduleParentPathTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/submodule_parent_path.py'
		name: 'submodule_parent_path'
%

category: 'Grail-Helpers'
method: SubmoduleParentPathTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SubmoduleParentPathTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: SubmoduleParentPathTestCase
testAPackageRegisteredUnderAnotherNameFindsItsSubmodules
	"setuptools' shape: a meta-path finder answers ``spp_alias'' with the
	already-imported spp_real.  Its submodules, a relative import inside one,
	and two namespace levels under it all live in spp_real's directory."

	self assertAll: #('alias_is_the_real_package' 'alias_submodule'
		'alias_relative_import' 'alias_namespace_levels')
%

category: 'Grail-Tests'
method: SubmoduleParentPathTestCase
testAPackageThatEditsItsPathFindsItsSubmodules

	self assertAll: #('appended_path_entry' 'replaced_path')
%

category: 'Grail-Tests'
method: SubmoduleParentPathTestCase
testOrdinarySubmodulesAreUnchanged

	self assertAll: #('ordinary_submodule' 'missing_submodule')
%

category: 'Grail-Tests - coverage'
method: SubmoduleParentPathTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8
%
