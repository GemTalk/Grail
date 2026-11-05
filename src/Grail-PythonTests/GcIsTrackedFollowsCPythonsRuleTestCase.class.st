Class {
	#name : 'GcIsTrackedFollowsCPythonsRuleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GcIsTrackedFollowsCPythonsRuleTestCase >> testGcIsTrackedAnswersFalseForAtomsAndTrueForContainers [
	"tests/python/gc_is_tracked_follows_cpythons_rule.py: gc.is_tracked answers
	False for the atomic types and the empty tuple, True for containers,
	functions, classes and user objects -- an int subclass's instance among
	them -- and True for a struct_time holding a list.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'gc_is_tracked_follows_cpythons_rule' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/gc_is_tracked_follows_cpythons_rule.py')
		name: 'gc_is_tracked_follows_cpythons_rule'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
