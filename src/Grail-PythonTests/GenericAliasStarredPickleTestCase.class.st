Class {
	#name : 'GenericAliasStarredPickleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GenericAliasStarredPickleTestCase >> testAStarredAliasPicklesThroughGenericAliasIterator [
	"tests/python/generic_alias_starred_pickle.py: ``*tuple[int]'' round-trips
	through every pickle protocol, iterating an alias yields it once unpacked
	from a generic_alias_iterator, and that iterator reduces to iter(alias).
	A tuple_iterator over the starred copy pickled the starred copy again,
	without end.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generic_alias_starred_pickle' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_alias_starred_pickle.py')
		name: 'generic_alias_starred_pickle'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
