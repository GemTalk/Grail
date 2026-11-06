Class {
	#name : 'BasesAssignmentKeepsTheLayoutTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BasesAssignmentKeepsTheLayoutTestCase >> testBasesThatLayInstancesOutOtherwiseAreRefused [

	"tests/python/bases_assignment_keeps_the_layout.py: __bases__ cannot make a
	list subclass a dict subclass, a dict subclass a list subclass or a plain
	class a list subclass; a builtin's is refused as an immutable type first;
	a base of the same layout can still be added.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'bases_assignment_keeps_the_layout' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bases_assignment_keeps_the_layout.py')
		name: 'bases_assignment_keeps_the_layout'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
