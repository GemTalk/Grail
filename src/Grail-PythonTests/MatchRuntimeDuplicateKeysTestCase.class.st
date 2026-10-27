Class {
	#name : 'MatchRuntimeDuplicateKeysTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchRuntimeDuplicateKeysTestCase >> testMappingKeysThatCollideAtRunTimeRaiseValueError [
	"tests/python/match_runtime_duplicate_keys.py: ``{Keys.A: y, 'a': z}''
	raises ``mapping pattern checks duplicate key ('a')'' with nothing bound,
	a missing earlier key is a quiet miss, and distinct dotted keys match.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_runtime_duplicate_keys' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_runtime_duplicate_keys.py')
		name: 'match_runtime_duplicate_keys'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
