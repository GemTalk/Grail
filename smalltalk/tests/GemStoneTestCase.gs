! ===============================================================================
! GemStoneTestCase - Tests for Python gemstone module
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GemStoneTestCase removeAllMethods.
GemStoneTestCase class removeAllMethods.
%

! ------------------- Tests for module access

category: 'Tests - Module Access'
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
