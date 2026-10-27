Class {
	#name : 'StarredTargetPlacementTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StarredTargetPlacementTestCase >> testAStarredTargetOutsideAListOrTupleIsRefusedWhereverItBinds [
	"tests/python/starred_target_placement.py: ``[x for *a in y]'' and
	``with x as *a:'' are ``starred assignment target must be in a list or
	tuple'', as an assignment and a for statement already were; a starred
	target inside a list or tuple still compiles.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'starred_target_placement' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/starred_target_placement.py')
		name: 'starred_target_placement'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '2 checks, 0 disagreeing [], keys match: True'

]
