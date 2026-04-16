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
	gs := gemstone @env1:instance.
	key := str withAll: '_grail_test_delitem'.
	value := str withAll: 'to_be_deleted'.
	"Add an entry, then delete it"
	gs @env1:__setitem__: key _: value.
	self assert: (gs @env1:__getitem__: key) equals: value.
	gs @env1:__delitem__: key.
	"Should now raise KeyError"
	self should: [
		gs @env1:__getitem__: key
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_delitem_keyError

	| gs |
	gs := gemstone @env1:instance.
	self should: [
		gs @env1:__delitem__: (str withAll: '_no_such_key')
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_getitem

	| gs userGlobals |
	gs := gemstone @env1:instance.
	userGlobals := gs @env1:__getitem__: (str withAll: 'UserGlobals').
	self assert: userGlobals identical: UserGlobals.
%

category: 'Tests'
method: GemStoneTestCase
test_getitem_keyError

	| gs |
	gs := gemstone @env1:instance.
	self should: [
		gs @env1:__getitem__: (str withAll: '_no_such_key')
	] raise: KeyError
%

category: 'Tests'
method: GemStoneTestCase
test_setitem_existing

	| gs original |
	gs := gemstone @env1:instance.
	"Save original value"
	original := gs @env1:__getitem__: (str withAll: 'UserGlobals').
	self assert: original identical: UserGlobals.
	"Set it to something else and verify"
	gs @env1:__setitem__: (str withAll: 'UserGlobals') _: original.
	self assert: (gs @env1:__getitem__: (str withAll: 'UserGlobals')) identical: UserGlobals.
%

category: 'Tests'
method: GemStoneTestCase
test_setitem_new

	| gs key value result |
	gs := gemstone @env1:instance.
	key := str withAll: '_grail_test_setitem'.
	value := str withAll: 'test_value'.
	"Should add to UserGlobals"
	gs @env1:__setitem__: key _: value.
	result := gs @env1:__getitem__: key.
	self assert: result equals: value.
	"Clean up"
	UserGlobals @env0:removeKey: #'_grail_test_setitem'.
%

category: 'Tests'
method: GemStoneTestCase
test_version

	| gs result expected |
	gs := gemstone @env1:instance.
	result := gs @env1:version.
	expected := System @env0:stoneVersionAt: 'gsVersion'.
	self assert: result equals: expected.
%

category: 'Tests'
method: GemStoneTestCase
testGemstoneModuleIsAvailable
	"Test that gemstone module is registered and importable"

	| modules imp result |
	modules := importlib @env1:modules.
	self assert: (modules includesKey: #gemstone).

	imp := importlib @env1:instance.
	result := imp @env1:import_module: 'gemstone'.

	self assert: result class equals: gemstone
%

category: 'Tests - Phase 4d Attribute Calls'
method: GemStoneTestCase
testEvalGemstoneVersion
	"Phase 4d: `gemstone.version` from Python source. Exercises the
	attribute-read path on a converted module."

	| result expected |
	result := self eval: '
import gemstone
gemstone.version
'.
	expected := System @env0:stoneVersionAt: 'gsVersion'.
	self assert: result equals: expected
%

category: 'Tests - Phase 4d Attribute Calls'
method: GemStoneTestCase
testEvalGemstoneSetGetDelItem
	"Exercises __setitem__, __getitem__, and __delitem__ dunder methods
	on a converted module via the subscript protocol."

	| result |
	result := self eval: '
import gemstone
gemstone["_grail_p4d_key"] = "p4d_value"
v = gemstone["_grail_p4d_key"]
del gemstone["_grail_p4d_key"]
v
'.
	self assert: result equals: 'p4d_value'.
	"Verify deletion: the key should no longer exist"
	self deny: (UserGlobals @env0:includesKey: #'_grail_p4d_key')
%
