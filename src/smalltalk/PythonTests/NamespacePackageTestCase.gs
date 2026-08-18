! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NamespacePackageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NamespacePackageTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
NamespacePackageTestCase comment:
'PEP 420: a directory with no __init__.py is still a package.

Grail''s resolver checked ``name.py'' then ``name/__init__.py'' and gave up, so
a directory that was only a directory could not be imported at all.  CPython
has allowed it since 3.3, and the vendored test tree relies on it --
test/test_warnings/data holds three modules and no __init__.py, matching
CPython.

Two properties separate a namespace package from a regular one, and both are
tested because getting either wrong still looks like it works:

	__file__ is None -- there is no file, and that is what code asking
	"is this a namespace package?" actually tests.

	__path__ holds EVERY matching directory across the search path, not the
	first.  That is the point of the PEP -- one package assembled from several
	distributions -- and stopping at the first match passes every
	single-directory test while failing the feature''s reason to exist.  The
	fixture builds two real search roots so this is measured rather than
	assumed.

The ordering rule is tested from the other side too: a regular package or a
plain module anywhere on the path beats a namespace package, even when a bare
directory of the same name sits in an EARLIER root.  Portions are recorded as
the scan goes, but real source stops it and discards them.

See tests/python/namespace_packages.py.'
%

expectvalue /Class
doit
NamespacePackageTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
NamespacePackageTestCase removeAllMethods: 0.
NamespacePackageTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: NamespacePackageTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'namespace_packages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/namespace_packages.py')
		name: 'namespace_packages'.
%

category: 'Grail-Helpers'
method: NamespacePackageTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: NamespacePackageTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testDirectoryWithoutInitImportsAsAPackage
	"The base case: a submodule of a directory that has no __init__.py."

	self assertAll: #('submodule_imports' 'package_is_in_sys_modules'
		'package_has_path' 'package_name')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testNamespacePackageHasNoFile
	"__file__ is None -- the attribute code actually tests to tell a
	namespace package from a regular one."

	self assertAll: #('file_is_none')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testPathHoldsEveryPortion
	"__path__ collects the matching directory from EVERY search root, which
	is the whole point of the PEP; an implementation that stops at the first
	match passes every single-directory test and still fails this."

	self assertAll: #('path_holds_every_portion' 'path_holds_root_a'
		'path_holds_root_b')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testOnePackageSpansTwoRoots
	"A submodule from each portion, both reachable through the one package."

	self assertAll: #('submodule_from_second_portion' 'both_portions_coexist')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testNamespacePackagesNest
	"Namespace packages inside namespace packages, no __init__.py anywhere
	along the chain."

	self assertAll: #('nested_namespace_leaf' 'nested_intermediate_is_package'
		'nested_intermediate_file_is_none')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testRealSourceBeatsABareDirectory
	"A regular package and a plain module each win over a same-named bare
	directory sitting in an EARLIER search root."

	self assertAll: #('regular_package_beats_directory'
		'regular_package_file_is_not_none' 'module_beats_directory'
		'module_has_no_path')
%

category: 'Grail-Tests'
method: NamespacePackageTestCase
testAbsentModulesStillRaise
	"The point is to add a case, not to make every import succeed: a name
	matching neither file nor directory must still fail."

	self assertAll: #('absent_module_still_raises'
		'absent_submodule_still_raises')
%
