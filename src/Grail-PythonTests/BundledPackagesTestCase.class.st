Class {
	#name : 'BundledPackagesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
BundledPackagesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
BundledPackagesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
BundledPackagesTestCase >> setUp [

	importlib @env1:modules removeKey: #'bundled_packages_yield_to_sys_path' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bundled_packages_yield_to_sys_path.py')
		name: 'bundled_packages_yield_to_sys_path'

]

{ #category : 'Grail-Tests - CPython agrees' }
BundledPackagesTestCase >> testAUsersCopyAndItsDistInfoWin [

	self assertAll: #('a_users_copy_of_every_bundled_package_resolves' 'a_users_dist_info_wins').
	self assert: (self results @env1:__len__) equals: 2

]

{ #category : 'Grail-Tests - Grail only' }
BundledPackagesTestCase >> testGrailsStdlibStillBeatsSysPath [
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

]

{ #category : 'Grail-Tests - Grail only' }
BundledPackagesTestCase >> testTheBundledCopyIsTheFallback [
	"With no copy of its own on sys.path, each name resolves to the bundled one."

	| bundled |
	bundled := importlib grailDir , '/src/python/bundled/'.
	#('flask' 'werkzeug' 'jinja2' 'markupsafe' 'django' 'sqlparse') do: [:name | | path |
		path := importlib @env1:___moduleNameToPath___: name.
		self assert: (path notNil and: [path asString beginsWith: bundled])
			description: name , ' -> ' , path printString]

]

{ #category : 'Grail-Tests - Grail only' }
BundledPackagesTestCase >> testThePinnedImporterDoesNotClaimThem [
	"GrailBuiltinImporter answers only for Grail's own roots, which no longer hold
	the bundled packages -- and still answers for the stdlib (the positive
	control: an importer that answered nothing would pass the first half)."

	#('flask' 'werkzeug' 'jinja2' 'markupsafe' 'django') do: [:name |
		self assert: (importlib @env1:___grailOwnedPathFor___: name) isNil
			description: name , ' is still claimed by the pinned importer'].
	self assert: (importlib @env1:___grailOwnedPathFor___: 'textwrap')
		equals: importlib grailDir , '/src/python/stdlib/textwrap.py'

]

{ #category : 'Grail-Helpers' }
BundledPackagesTestCase >> usersCopies [
	"The fixture's directory holding a user's copy of every bundled package."

	^ (testModule @env1:___pyAttrLoad___: #'_dir') asString

]

{ #category : 'Grail-Helpers' }
BundledPackagesTestCase >> withUsersCopiesFirstDo: aBlock [
	"Run aBlock with the user's copies at the front of sys.path, then put
	sys.path back exactly as it was: it is session state every later test in
	the shard resolves against."

	| p saved |
	p := (sys @env1:instance) @env0:at: #path.
	saved := p asArray.
	^ [p addFirst: self usersCopies. aBlock value] ensure: [
		p size: 0.
		saved do: [:each | p add: each]]

]
