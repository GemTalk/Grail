Class {
	#name : 'MatchCaptureBindingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MatchCaptureBindingTestCase >> testACasesCapturesAreBoundOnlyOnceItsWholePatternHasMatched [
	"tests/python/match_capture_binding.py: a case pattern that fails
	part-way, or an or-alternative that fails after capturing, binds nothing;
	a guard sees the captures and they stay bound when it fails.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'match_capture_binding' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/match_capture_binding.py')
		name: 'match_capture_binding'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
