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
GemStoneTestCase category: 'Grail-SUnit'
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

category: 'Grail-Tests'
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

category: 'Grail-Tests'
method: GemStoneTestCase
test_delitem_keyError

	| gs |
	gs := gemstone @env1:instance.
	self should: [
		gs @env1:__delitem__: (str withAll: '_no_such_key')
	] raise: KeyError
%

category: 'Grail-Tests'
method: GemStoneTestCase
test_getitem

	| gs userGlobals |
	gs := gemstone @env1:instance.
	userGlobals := gs @env1:__getitem__: (str withAll: 'UserGlobals').
	self assert: userGlobals identical: UserGlobals.
%

category: 'Grail-Tests'
method: GemStoneTestCase
test_getitem_keyError

	| gs |
	gs := gemstone @env1:instance.
	self should: [
		gs @env1:__getitem__: (str withAll: '_no_such_key')
	] raise: KeyError
%

category: 'Grail-Tests'
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

category: 'Grail-Tests'
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

category: 'Grail-Tests'
method: GemStoneTestCase
test_version

	| gs result expected |
	gs := gemstone @env1:instance.
	result := gs @env1:version.
	expected := System @env0:stoneVersionAt: 'gsVersion'.
	self assert: result equals: expected.
%

category: 'Grail-Tests'
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

category: 'Grail-Tests - Phase 4d Attribute Calls'
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

category: 'Grail-Tests - Phase 4d Attribute Calls'
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

category: 'Grail-Tests - Session-Local State'
method: GemStoneTestCase
testSessionDictSameNameReturnsSameDict
	"Regression for commit 3a8f2e9: sessionDict(name) must return the one
	per-session dict for that name, so a module-level cache built on it (jinja2's
	lexer cache) keeps working within a session."

	| gs |
	gs := gemstone ___instance___.
	self assert: (gs @env1:sessionDict: 'grail_test_sd_same')
		== (gs @env1:sessionDict: 'grail_test_sd_same')
%

category: 'Grail-Tests - Session-Local State'
method: GemStoneTestCase
testSessionDictDistinctNamesDistinctDicts
	"Different names get independent session dicts."

	| gs |
	gs := gemstone ___instance___.
	self deny: (gs @env1:sessionDict: 'grail_test_sd_a')
		== (gs @env1:sessionDict: 'grail_test_sd_b')
%

category: 'Grail-Tests - Session-Local State'
method: GemStoneTestCase
testSessionDictLivesInSessionTempsNotCommitted
	"Regression for commit 3a8f2e9: sessionDict storage must live in SessionTemps
	(per-process, never committed) so caches built on it don't leak into the
	commit set.  The backing key is namespaced by the dict's name."

	| gs d |
	gs := gemstone ___instance___.
	d := gs @env1:sessionDict: 'grail_test_sd_temps'.
	d @env1:__setitem__: 'k' _: 'v'.
	self assert: (SessionTemps current
		includesKey: #'___GrailSessionDict___grail_test_sd_temps').
	"Re-fetching the same name yields the same store we just mutated."
	self assert: ((gs @env1:sessionDict: 'grail_test_sd_temps') @env1:__getitem__: 'k')
		equals: 'v'
%
