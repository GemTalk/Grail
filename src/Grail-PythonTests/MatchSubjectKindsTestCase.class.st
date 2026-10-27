Class {
	#name : 'MatchSubjectKindsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchSubjectKindsTestCase >> testSequenceAndMappingPatternsMatchWhatCPythonsTypeFlagsAdmit [
	"tests/python/match_subject_kinds.py: range, memoryview, deque, array,
	UserList and Sequence subclasses match a sequence pattern; mappingproxy,
	UserDict, ChainMap and Mapping subclasses a mapping one; str, bytes and
	duck-typed classes neither; multiple inheritance takes the first flag in
	the MRO; registration sets it, late included.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_subject_kinds' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_subject_kinds.py')
		name: 'match_subject_kinds'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
