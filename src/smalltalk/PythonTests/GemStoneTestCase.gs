! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GemStoneTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GemStoneTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GemStoneTestCase category: 'SUnit'
%

! ===============================================================================
! GemStoneTestCase - Tests for Python gemstone module
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GemStoneTestCase removeAllMethods.
GemStoneTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests'
method: GemStoneTestCase
test_delitem

	| gs key value |
	gs := gemstone perform: #instance env: 1.
	key := str withAll: '_grail_test_delitem'.
	value := str withAll: 'to_be_deleted'.
	"Add an entry, then delete it"
	gs perform: #__setitem__:_: env: 1 withArguments: { key . value }.
	self assert: (gs perform: #__getitem__: env: 1 withArguments: { key }) equals: value.
	gs perform: #__delitem__: env: 1 withArguments: { key }.
	"Should now raise KeyError"
	self should: [
		gs perform: #__getitem__: env: 1 withArguments: { key }
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_delitem_keyError

	| gs |
	gs := gemstone perform: #instance env: 1.
	self should: [
		gs perform: #__delitem__: env: 1 withArguments: { str withAll: '_no_such_key' }
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_getitem

	| gs userGlobals |
	gs := gemstone perform: #instance env: 1.
	userGlobals := gs perform: #__getitem__: env: 1 withArguments: { str withAll: 'UserGlobals' }.
	self assert: userGlobals identical: UserGlobals.
%

category: 'Tests'
method: GemStoneTestCase
test_getitem_keyError

	| gs |
	gs := gemstone perform: #instance env: 1.
	self should: [
		gs perform: #__getitem__: env: 1 withArguments: { str withAll: '_no_such_key' }
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_setitem_existing

	| gs original |
	gs := gemstone perform: #instance env: 1.
	"Save original value"
	original := gs perform: #__getitem__: env: 1 withArguments: { str withAll: 'UserGlobals' }.
	self assert: original identical: UserGlobals.
	"Set it to something else and verify"
	gs perform: #__setitem__:_: env: 1 withArguments: { str withAll: 'UserGlobals' . original }.
	self assert: (gs perform: #__getitem__: env: 1 withArguments: { str withAll: 'UserGlobals' }) identical: UserGlobals.
%

category: 'Tests'
method: GemStoneTestCase
test_setitem_new

	| gs key value result |
	gs := gemstone perform: #instance env: 1.
	key := str withAll: '_grail_test_setitem'.
	value := str withAll: 'test_value'.
	"Should add to UserGlobals"
	gs perform: #__setitem__:_: env: 1 withArguments: { key . value }.
	result := gs perform: #__getitem__: env: 1 withArguments: { key }.
	self assert: result equals: value.
	"Clean up"
	UserGlobals perform: #'removeKey:' env: 0 withArguments: { #'_grail_test_setitem' }.
%

category: 'Tests'
method: GemStoneTestCase
test_version

	| gs result |
	gs := gemstone perform: #instance env: 1.
	result := gs perform: #version env: 1.
	self assert: result equals: '3.7.4.3'.
%

category: 'Tests'
method: GemStoneTestCase
testGemstoneModuleIsAvailable
	"Test that gemstone module is registered and importable"

	| modules imp importModuleBlock result |
	modules := importlib perform: #modules env: 1.
	self assert: (modules includesKey: #gemstone).

	imp := importlib perform: #instance env: 1.
	importModuleBlock := imp perform: #import_module env: 1.
	result := importModuleBlock value: {'gemstone'} value: nil.

	self assert: result class equals: gemstone
%
