Class {
	#name : 'MatchClassPatternErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchClassPatternErrorsTestCase >> testAClassPatternRaisesTheTypeErrorsCPythonsMatchClassRaises [
	"tests/python/match_class_pattern_errors.py: once isinstance passes, a
	class pattern refuses a __match_args__ that is not an exact tuple of exact
	strs, more positional sub-patterns than it names (``(N given)''), and an
	attribute named twice -- with CPython's messages.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_class_pattern_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_class_pattern_errors.py')
		name: 'match_class_pattern_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
