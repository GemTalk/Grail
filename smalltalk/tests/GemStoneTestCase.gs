! ===============================================================================
! GemStoneTestCase - Tests for Python gemstone module
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GemStoneTestCase removeAllMethods.
GemStoneTestCase class removeAllMethods.
%

! ------------------- Instance Methods

category: 'Tests'
method: GemStoneTestCase
testGemstoneModuleIsAvailable
	"Test that gemstone module is registered and importable"

	| modules imp importModuleBlock result |
	modules := importlib perform: #modules env: 2.
	self assert: (modules includesKey: #gemstone).

	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.
	result := importModuleBlock value: {'gemstone'} value: nil.

	self assert: result class equals: gemstone
%

category: 'Tests'
method: GemStoneTestCase
test_objectNamed

	| gs method userGlobals |
	gs := gemstone perform: #instance env: 2.
	method := gs perform: #objectNamed env: 2.
	userGlobals := method value: { str withAll: 'UserGlobals' } value: nil.
	self assert: userGlobals identical: UserGlobals.
%

category: 'Tests'
method: GemStoneTestCase
test_version

	| gs result |
	gs := gemstone perform: #instance env: 2.
	result := gs perform: #version env: 2.
	self assert: result equals: '3.7.4.3'.
%
