! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BundledPackagesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BundledPackagesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BundledPackagesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BundledPackagesTestCase - the third-party packages Grail bundles are a
! fallback after sys.path, so a user's own copy wins (#1713)
! ===============================================================================
! flask, werkzeug, jinja2, markupsafe, django and the rest used to sit in
! src/python/stdlib, one of Grail's own roots: searched before sys.path and
! answered by the pinned GrailBuiltinImporter, so a user's own copy never
! imported (the package census's SHADOWED).  They are now in
! src/python/bundled, searched after sys.path (importlib >>
! ___grailBundledRoots___), while Grail's ported stdlib keeps its priority.
!
! tests/python/bundled_packages_yield_to_sys_path.py holds the 2 checks that
! CPython agrees with (a user's copy and a user's dist-info win); the tests
! below are the Grail-only half, and reuse that fixture's directory of user
! copies.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BundledPackagesTestCase removeAllMethods.
BundledPackagesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BundledPackagesTestCase
setUp

	importlib @env1:modules removeKey: #'bundled_packages_yield_to_sys_path' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bundled_packages_yield_to_sys_path.py')
		name: 'bundled_packages_yield_to_sys_path'
%

category: 'Grail-Helpers'
method: BundledPackagesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: BundledPackagesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Helpers'
method: BundledPackagesTestCase
usersCopies
	"The fixture's directory holding a user's copy of every bundled package."

	^ (testModule @env1:___pyAttrLoad___: #'_dir') asString
%

category: 'Grail-Helpers'
method: BundledPackagesTestCase
withUsersCopiesFirstDo: aBlock
	"Run aBlock with the user's copies at the front of sys.path, then put
	sys.path back exactly as it was: it is session state every later test in
	the shard resolves against."

	| p saved |
	p := (sys @env1:instance) @env0:at: #path.
	saved := p asArray.
	^ [p addFirst: self usersCopies. aBlock value] ensure: [
		p size: 0.
		saved do: [:each | p add: each]]
%

category: 'Grail-Tests - CPython agrees'
method: BundledPackagesTestCase
testAUsersCopyAndItsDistInfoWin

	self assertAll: #('a_users_copy_of_every_bundled_package_resolves' 'a_users_dist_info_wins').
	self assert: (self results @env1:__len__) equals: 2
%

category: 'Grail-Tests - Grail only'
method: BundledPackagesTestCase
testTheBundledCopyIsTheFallback
	"With no copy of its own on sys.path, each name resolves to the bundled one."

	| bundled |
	bundled := importlib grailDir , '/src/python/bundled/'.
	#('flask' 'werkzeug' 'jinja2' 'markupsafe' 'django' 'sqlparse') do: [:name | | path |
		path := importlib @env1:___moduleNameToPath___: name.
		self assert: (path notNil and: [path asString beginsWith: bundled])
			description: name , ' -> ' , path printString]
%

category: 'Grail-Tests - Grail only'
method: BundledPackagesTestCase
testThePinnedImporterDoesNotClaimThem
	"GrailBuiltinImporter answers only for Grail's own roots, which no longer hold
	the bundled packages -- and still answers for the stdlib (the positive
	control: an importer that answered nothing would pass the first half)."

	#('flask' 'werkzeug' 'jinja2' 'markupsafe' 'django') do: [:name |
		self assert: (importlib @env1:___grailOwnedPathFor___: name) isNil
			description: name , ' is still claimed by the pinned importer'].
	self assert: (importlib @env1:___grailOwnedPathFor___: 'textwrap')
		equals: importlib grailDir , '/src/python/stdlib/textwrap.py'
%

category: 'Grail-Tests - Grail only'
method: BundledPackagesTestCase
testGrailsStdlibStillBeatsSysPath
	"A user's textwrap.py on sys.path does NOT displace Grail's stdlib -- the
	order the move must not lose -- while the user's sqlparse, in the same
	directory, does displace the bundled one."

	| dir f stdlibHit bundledHit |
	dir := self usersCopies.
	f := GsFile openWriteOnServer: dir , '/textwrap.py'.
	f nextPutAll: 'IMPOSTER = True
'; close.
	self withUsersCopiesFirstDo: [
		stdlibHit := importlib @env1:___moduleNameToPath___: 'textwrap'.
		bundledHit := importlib @env1:___moduleNameToPath___: 'sqlparse'].
	self assert: stdlibHit equals: importlib grailDir , '/src/python/stdlib/textwrap.py'.
	self assert: bundledHit equals: dir , '/sqlparse/__init__.py'
%
