Class {
	#name : 'ClassHashAssignedAfterCreationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassHashAssignedAfterCreationTestCase >> testAnAssignedHashIsTheClassHash [
	"tests/python/class_hash_assigned_after_creation.py: a __hash__ assigned
	on a class after creation is its hash -- a function over a body's None,
	over an __eq__'s implied None and for its subclasses, and None over
	nothing or over a def makes it unhashable -- and so dataclasses'
	unsafe_hash=True hashes a class with its own __eq__.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_hash_assigned_after_creation' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_hash_assigned_after_creation.py')
		name: 'class_hash_assigned_after_creation'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
