Class {
	#name : 'MroConflictMessageTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MroConflictMessageTestCase >> testMroConflictNamesTheBasesThatCouldNotBeMerged [
	"tests/python/mro_conflict_message.py: a class statement or a type() call
	whose bases have no consistent MRO raises CPython's TypeError, naming the
	heads that could not be merged.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'mro_conflict_message' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mro_conflict_message.py')
		name: 'mro_conflict_message'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
