Class {
	#name : 'StarUnpackingTargetLimitTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StarUnpackingTargetLimitTestCase >> testAStarAfter255TargetsIsRefusedAndOneAt255Compiles [
	"tests/python/star_unpacking_target_limit.py: a starred target at index 256
	or later is CPython's compile-time ``too many expressions in star-unpacking
	assignment'', in an assignment, a for target and a list target, and one at
	index 255 compiles and unpacks.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'star_unpacking_target_limit' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/star_unpacking_target_limit.py')
		name: 'star_unpacking_target_limit'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
