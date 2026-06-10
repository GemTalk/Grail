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

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
test_mySymbolList
	"gemstone.mySymbolList returns a Python list whose elements are the
	session's SymbolDictionary instances, in symbolList order."

	| gs result expected |
	gs := gemstone @env1:instance.
	result := gs @env1:mySymbolList.
	expected := GsCurrentSession currentSession symbolList.
	self assert: (result isKindOf: list).
	self assert: result size equals: expected size.
	1 to: expected size do: [:i |
		self assert: (result at: i) identical: (expected at: i)]
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
test_mySymbolListIsFreshCopy
	"Each read builds a fresh list, so Python-side mutation cannot
	disturb the session's real symbol list."

	| gs a sizeBefore |
	gs := gemstone @env1:instance.
	sizeBefore := GsCurrentSession currentSession symbolList size.
	a := gs @env1:mySymbolList.
	self deny: a == (gs @env1:mySymbolList).
	a removeFirst.
	self assert: GsCurrentSession currentSession symbolList size
		equals: sizeBefore
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
test_system
	"gemstone.system is the GemStone System class itself."

	| gs |
	gs := gemstone @env1:instance.
	self assert: (gs @env1:system) identical: System
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
testEvalMySymbolList
	"Attribute read from Python source: gemstone.mySymbolList[0] is the
	first SymbolDictionary in the session's symbol list."

	| result |
	result := self eval: '
import gemstone
gemstone.mySymbolList[0]
'.
	self assert: result
		identical: (GsCurrentSession currentSession symbolList at: 1)
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
testEvalSystemIsSystemClass
	"Attribute read from Python source: gemstone.system is System."

	| result |
	result := self eval: '
import gemstone
gemstone.system
'.
	self assert: result identical: System
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
testEvalSystemAbortResolvesToBoundMethod
	"gemstone.system.abort resolves to a BoundMethod wrapping
	(System, #abort) — i.e. System carries the env-1 class-side method
	from System.gs.  Invoking it mid-suite would discard the session's
	uncommitted state (cf. the xtest precedent in CPythonReplTestCase),
	so the functional behavior is exercised by the standalone script
	tests/scripts/runGemstoneSystemTest.gs instead."

	| result |
	result := self eval: '
import gemstone
gemstone.system.abort
'.
	self assert: (result isKindOf: BoundMethod).
	self assert: result receiver identical: System.
	self assert: result selector equals: #abort
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
testEvalSystemCommitResolvesToBoundMethod
	"gemstone.system.commit resolves to a BoundMethod wrapping
	(System, #commit).  See testEvalSystemAbortResolvesToBoundMethod
	for why the suite must not invoke it."

	| result |
	result := self eval: '
import gemstone
gemstone.system.commit
'.
	self assert: (result isKindOf: BoundMethod).
	self assert: result receiver identical: System.
	self assert: result selector equals: #commit
%

category: 'Grail-Tests - GemStone Interop'
method: GemStoneTestCase
testEvalModuleLevelCommitAbortRemoved
	"The module-level gemstone.commit()/gemstone.abort() fast paths were
	replaced by gemstone.system.commit()/gemstone.system.abort(); the old
	attribute names must now raise AttributeError."

	self should: [self eval: '
import gemstone
gemstone.commit
'] raise: AttributeError.
	self should: [self eval: '
import gemstone
gemstone.abort
'] raise: AttributeError
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
