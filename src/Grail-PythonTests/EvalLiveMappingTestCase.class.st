Class {
	#name : 'EvalLiveMappingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EvalLiveMappingTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
EvalLiveMappingTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_live_mapping' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_live_mapping.py')
		name: 'eval_live_mapping'.

]

{ #category : 'Grail-Tests - what is refused' }
EvalLiveMappingTestCase >> testAMappingWithNoKeysIsStillUsableAsLocals [
	"The row that makes __getitem__ rather than keys the right check: this
	class has __getitem__ and __setitem__ and no keys at all, and the lookups
	nest three deep through it."

	self assertMatchesCPythonAt: 'nested_lookups'.

]

{ #category : 'Grail-Tests - reads are live' }
EvalLiveMappingTestCase >> testANameIsReadThroughTheMapping [
	"Both shapes a copy gets wrong: a mapping with no storage to enumerate,
	and a dict subclass whose storage is empty while its __getitem__ answers."

	self assertMatchesCPythonAt: 'name_from_mapping'.
	self assertMatchesCPythonAt: 'missing_name'.
	self assertMatchesCPythonAt: 'name_from_dict_subclass'.
	self assertMatchesCPythonAt: 'missing_in_dict_subclass'.

]

{ #category : 'Grail-Tests - Controls' }
EvalLiveMappingTestCase >> testAPlainDictTakesThePathItAlwaysTook [
	"THE CONTROL THAT MATTERS.  The live path must be reached only by a
	mapping that needs it, and the trigger is an exact-class test -- naming
	PyDict's SUPERCLASS put the whole corpus on it, and an unseeded scope
	made globals() answer empty.  These are the shapes every exec and eval in
	the corpus actually uses."

	self assertMatchesCPythonAt: 'plain_globals'.
	self assertMatchesCPythonAt: 'plain_locals'.
	self assertMatchesCPythonAt: 'plain_globals_call'.
	self assertMatchesCPythonAt: 'plain_write_back'.
	self assertMatchesCPythonAt: 'no_arguments'.
	self assertMatchesCPythonAt: 'module_globals'.

]

{ #category : 'Grail-Tests - locals() and dir()' }
EvalLiveMappingTestCase >> testDirAsksTheMappingForKeys [
	"keys() and __getitem__ need not agree, and here they deliberately do
	not: the mapping knows only 'a' and reports xyz.  dir() reports the keys,
	so iterating the mapping instead would answer the wrong list -- and an
	arbitrary mapping need not be iterable at all."

	self assertMatchesCPythonAt: 'dir_uses_keys'.
	self assertMatchesCPythonAt: 'dir_uses_keys_subclass'.
	self assertMatchesCPythonAt: 'globals_is_the_caller'.

]

{ #category : 'Grail-Tests - Controls' }
EvalLiveMappingTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - locals() and dir()' }
EvalLiveMappingTestCase >> testLocalsIsTheMappingItself [
	"Identity, not contents.  M defines no __eq__, so a view with exactly the
	right contents still fails -- which is the contract, not an accident of
	the test."

	self assertMatchesCPythonAt: 'locals_is_the_mapping'.
	self assertMatchesCPythonAt: 'locals_is_the_subclass'.

]

{ #category : 'Grail-Tests - reads are live' }
EvalLiveMappingTestCase >> testTheMappingsOwnReadAndWriteAreCalled [
	"A mapping that RAISES is the sharpest form of the question: if its
	__getitem__ is never called, the error never fires and the exec quietly
	succeeds.  The same for a __setitem__ that refuses."

	self assertMatchesCPythonAt: 'globals_getitem_raises'.
	self assertMatchesCPythonAt: 'write_through_setitem'.

]

{ #category : 'Grail-Tests - what is refused' }
EvalLiveMappingTestCase >> testTheTwoArgumentsAreCheckedDifferently [
	"globals must be a REAL DICT; locals need only be a mapping.  And
	``a mapping'' is decided by asking the TYPE for __getitem__: asking the
	INSTANCE says yes to everything, because Grail answers obj.__getitem__
	with a BoundMethod for any object at all, so the refusal never fired."

	self assertMatchesCPythonAt: 'mapping_as_globals'.
	self assertMatchesCPythonAt: 'non_mapping_locals'.

]
