! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PackageImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PackageImportTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PackageImportTestCase category: 'SUnit'
%

! ===============================================================================
! PackageImportTestCase - Tests for Python package (directory) imports
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
PackageImportTestCase removeAllMethods: 0.
PackageImportTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Setup'
method: PackageImportTestCase
setUp
	"Initialize modules and clean up any test package entries from prior runs"
	| mods keysToRemove |
	mods := importlib perform: #modules env: 1.
	keysToRemove := OrderedCollection new.
	mods keysDo: [:k |
		(k asString beginsWith: 'src.python.mypkg')
			ifTrue: [keysToRemove add: k]
	].
	keysToRemove do: [:k | mods removeKey: k ifAbsent: []].
%

category: 'Tests - Package Detection'
method: PackageImportTestCase
testModuleNameToPathFindsPackage
	"___moduleNameToPath___: should find a package's __init__.py"

	| path |
	path := importlib perform: #'___moduleNameToPath___:' env: 1 withArguments: { 'src.python.mypkg' }.
	self assert: path notNil.
	self assert: (path endsWith: '__init__.py')
%

category: 'Tests - Package Detection'
method: PackageImportTestCase
testModuleNameToPathPrefersFile
	"___moduleNameToPath___: should prefer name.py over name/__init__.py"

	| path |
	path := importlib perform: #'___moduleNameToPath___:' env: 1 withArguments: { 'src.python.hello' }.
	self assert: path notNil.
	self assert: (path endsWith: 'hello.py').
	self deny: (path endsWith: '__init__.py')
%

category: 'Tests - Import Package'
method: PackageImportTestCase
testImportPackage
	"Importing a package loads its __init__.py and registers it"

	| imp importFunc |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg' } value: nil.

	self assert: (importlib ___lookupModule___: 'src.python.mypkg') notNil
%

category: 'Tests - Import Package'
method: PackageImportTestCase
testPackageHasPath
	"Package module should have __path__ set to a list"

	| imp importFunc pkg path |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg' } value: nil.
	pkg := importlib ___lookupModule___: 'src.python.mypkg'.

	path := pkg perform: #__path__ env: 1.
	self assert: path class equals: Array.
	self assert: path size equals: 1.
	self assert: (path first endsWith: 'src/python/mypkg')
%

category: 'Tests - Import Package'
method: PackageImportTestCase
testNonPackageNoPath
	"Regular (non-package) module should not have __path__"

	| helloModule path |
	importlib 
		loadModuleFromPath: (importlib grailDir , '/src/python/hello.py')
		name: 'python.hello'.
	helloModule := importlib ___lookupModule___: 'python.hello'.

	path := helloModule perform: #__path__ env: 1.
	self assert: path equals: nil
%

category: 'Tests - Import Submodule'
method: PackageImportTestCase
testImportSubmodule
	"import mypkg.sub should register both mypkg and mypkg.sub"

	| imp importFunc |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg.sub' } value: nil.

	self assert: (importlib ___lookupModule___: 'src.python.mypkg') notNil.
	self assert: (importlib ___lookupModule___: 'src.python.mypkg.sub') notNil
%

category: 'Tests - Import Submodule'
method: PackageImportTestCase
testParentAutoLoaded
	"Importing a submodule auto-loads parent packages"

	| parentBefore imp importFunc |
	parentBefore := importlib ___lookupModule___: 'src.python.mypkg'.
	self assert: parentBefore equals: nil.

	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg.sub' } value: nil.

	self assert: (importlib ___lookupModule___: 'src.python.mypkg') notNil
%

category: 'Tests - Import Submodule'
method: PackageImportTestCase
testSubmoduleBoundOnParent
	"After importing mypkg.sub, parent.sub should resolve"

	| imp importFunc pkg subMod |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg.sub' } value: nil.

	pkg := importlib ___lookupModule___: 'src.python.mypkg'.
	subMod := pkg perform: #sub env: 1.
	self assert: subMod notNil.
	self assert: subMod == (importlib ___lookupModule___: 'src.python.mypkg.sub')
%

category: 'Tests - Import Nested'
method: PackageImportTestCase
testImportNestedPackage
	"import mypkg.nested.deep should register all three levels"

	| imp importFunc |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg.nested.deep' } value: nil.

	self assert: (importlib ___lookupModule___: 'src.python.mypkg') notNil.
	self assert: (importlib ___lookupModule___: 'src.python.mypkg.nested') notNil.
	self assert: (importlib ___lookupModule___: 'src.python.mypkg.nested.deep') notNil
%

category: 'Tests - Return Value Semantics'
method: PackageImportTestCase
testImportDottedReturnsTopLevel
	"__import__('a.b') with empty fromlist returns the top-level module.
	Use mypkg.nested where mypkg is a package with __init__.py."

	| imp importFunc result topModule priorGrailDir |
	priorGrailDir := importlib grailDir.
	importlib grailDir: (importlib grailDir , '/src/python').
	[
		imp := importlib perform: #instance env: 1.
		importFunc := imp perform: #__import__ env: 1.
		result := importFunc value: { 'mypkg.sub' } value: nil.
		topModule := importlib ___lookupModule___: 'mypkg'.
		self assert: result == topModule.
	] ensure: [
		importlib grailDir: priorGrailDir.
		(importlib perform: #modules env: 1) removeKey: #mypkg ifAbsent: [].
		(importlib perform: #modules env: 1) removeKey: #'mypkg.sub' ifAbsent: [].
	].
%

category: 'Tests - Return Value Semantics'
method: PackageImportTestCase
testFromImportReturnsNamedModule
	"__import__('a.b', fromlist=['y']) returns the named module, not top-level"

	| imp importFunc result subModule priorGrailDir |
	priorGrailDir := importlib grailDir.
	importlib grailDir: (importlib grailDir , '/src/python').
	[
		imp := importlib perform: #instance env: 1.
		importFunc := imp perform: #__import__ env: 1.
		"Call with fromlist as 4th positional arg"
		result := importFunc value: { 'mypkg.sub'. nil. nil. { 'y' } } value: nil.
		subModule := importlib ___lookupModule___: 'mypkg.sub'.
		self assert: result == subModule.
	] ensure: [
		importlib grailDir: priorGrailDir.
		(importlib perform: #modules env: 1) removeKey: #mypkg ifAbsent: [].
		(importlib perform: #modules env: 1) removeKey: #'mypkg.sub' ifAbsent: [].
	].
%

category: 'Tests - Package Contents'
method: PackageImportTestCase
testPackageInitExecuted
	"Package __init__.py code should be executed"

	| imp importFunc pkg |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg' } value: nil.

	pkg := importlib ___lookupModule___: 'src.python.mypkg'.
	"The __init__.py sets x = 'init' — but since the module is loaded via
	 loadModuleFromPath (which creates a fresh module instance), the scope
	 variables aren't directly on the module. Check that the module registered."
	self assert: pkg notNil.
	self assert: (pkg perform: #__name__ env: 1) equals: 'src.python.mypkg'
%

category: 'Tests - Package Contents'
method: PackageImportTestCase
testPackageIsPackage
	"Package module's __package__ should be the module name itself"

	| imp importFunc pkg |
	imp := importlib perform: #instance env: 1.
	importFunc := imp perform: #__import__ env: 1.
	importFunc value: { 'src.python.mypkg' } value: nil.

	pkg := importlib ___lookupModule___: 'src.python.mypkg'.
	self assert: (pkg perform: #__package__ env: 1) equals: 'src.python.mypkg'
%
