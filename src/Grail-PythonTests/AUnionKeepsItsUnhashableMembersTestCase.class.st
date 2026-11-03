Class {
	#name : 'AUnionKeepsItsUnhashableMembersTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AUnionKeepsItsUnhashableMembersTestCase >> testAUnionHashesAndComparesAsCPythonsDoes [
	"tests/python/a_union_keeps_its_unhashable_members.py: a union keeps which
	members did not hash when it was built, stays unhashable for them, compares
	its hashable members as sets and its unhashable ones each way, and lets the
	errors of == propagate.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_union_keeps_its_unhashable_members' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_union_keeps_its_unhashable_members.py')
		name: 'a_union_keeps_its_unhashable_members'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
