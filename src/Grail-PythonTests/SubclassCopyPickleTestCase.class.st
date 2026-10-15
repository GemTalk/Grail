Class {
	#name : 'SubclassCopyPickleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
SubclassCopyPickleTestCase >> setUp [
	"Reload tests/python/set_subclass.py fresh each test (CPython-cold: no
	deployed/committed instance).  The fixture computes its checks in the
	module body inside try/except, so an import-time failure surfaces as a
	``*_ok'' = false boolean (read below) rather than a Python exception
	escaping setUp -- which, being a non-Smalltalk-Error, would bypass SUnit's
	per-test handler and crash the whole shard."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'set_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/set_subclass.py')
		name: 'set_subclass'.

]

{ #category : 'Grail-Tests - frozenset subclass' }
SubclassCopyPickleTestCase >> testFrozensetSubclassDeepcopy [
	"copy.deepcopy of a frozenset subclass yields an object of the SAME subclass
	with equal contents (copy.py's isinstance(obj, frozenset) fallback)."

	self assert: (testModule @env1:___pyAttrLoad___: #frozenset_deepcopy_ok)
		description: (testModule @env1:___pyAttrLoad___: #frozenset_deepcopy_err).

]

{ #category : 'Grail-Tests - frozenset subclass' }
SubclassCopyPickleTestCase >> testFrozensetSubclassPickle [
	"A frozenset subclass round-trips through pickle as the SAME subclass with
	equal contents, and its instance attribute is preserved."

	self assert: (testModule @env1:___pyAttrLoad___: #frozenset_pickle_ok)
		description: (testModule @env1:___pyAttrLoad___: #frozenset_pickle_err).

]

{ #category : 'Grail-Tests - placement guard' }
SubclassCopyPickleTestCase >> testPlacementOffCollectionsShard [
	"runTestsShard.gs partitions the suite by charSum(className) \\ workers.
	The allocation-heavy collections classes (SetTestCase/DictTestCase/
	FrozensetTestCase) all hash to shard 0, where a fixture-loading subclass
	test flaked under 4-way parallel peak.  This class MUST NOT hash there --
	assert it for the suite's worker count (4).  A rename that moves it back
	onto the collections shard fails HERE, loudly, instead of silently
	re-introducing the flake."

	| charSum |
	charSum := self class name asString
		inject: 0 into: [:acc :ch | acc + ch asInteger].
	self deny: (charSum \\ 4) = 0
		description: 'SubclassCopyPickleTestCase must not hash to the collections shard 0'.

]

{ #category : 'Grail-Tests - set subclass' }
SubclassCopyPickleTestCase >> testSetSubclassDeepcopy [
	"copy.deepcopy of a set subclass yields an independent object of the SAME
	subclass with equal contents (copy.py's isinstance(obj, set) fallback)."

	self assert: (testModule @env1:___pyAttrLoad___: #set_deepcopy_ok)
		description: (testModule @env1:___pyAttrLoad___: #set_deepcopy_err).

]

{ #category : 'Grail-Tests - set subclass' }
SubclassCopyPickleTestCase >> testSetSubclassPickle [
	"A set subclass round-trips through pickle as the SAME subclass with equal
	contents, and its instance attribute is preserved (pickle.py's y tag +
	object>>__getstate__)."

	self assert: (testModule @env1:___pyAttrLoad___: #set_pickle_ok)
		description: (testModule @env1:___pyAttrLoad___: #set_pickle_err).

]

{ #category : 'Grail-Tests - sys.modules seam' }
SubclassCopyPickleTestCase >> testSysModulesUnifiedAcrossModules [
	"Every holder of a sys instance must see the ONE session sys.modules dict.
	The bug: a deployed module (pickle) warm-binds a COMMITTED instance whose
	``import sys'' global is a stale deploy-time sys instance; its captured
	#modules slot pointed at the deploy session's (committed) dict, so
	pickle.sys.modules was a DIFFERENT object than the current session's
	sys.modules -- and pickle could not resolve a module the session had
	cold-loaded (breaking pickle-by-reference under canonical mode).  The
	sys>>modules instance accessor makes every read return the session
	registry, so the two views are identical.  Meaningful under the per-push
	canonical suite (committed pickle from a prior deploy); trivially true in a
	cold isolated session."

	self assert: (self eval: 'import sys, pickle
pickle.sys.modules is sys.modules')
		description: 'pickle.sys.modules must be the same object as sys.modules'.

]
