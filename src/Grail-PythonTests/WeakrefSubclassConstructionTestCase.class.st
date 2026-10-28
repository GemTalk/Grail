Class {
	#name : 'WeakrefSubclassConstructionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
WeakrefSubclassConstructionTestCase >> testWeakrefSubclassRefersToItsReferent [
	"tests/python/weakref_subclass_construction.py: a Python subclass of
	weakref.ref -- with or without an __init__ of its own -- refers to the
	object it is built on, runs its callback when that object dies, and
	refuses CPython's wrong arities.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'weakref_subclass_construction' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/weakref_subclass_construction.py')
		name: 'weakref_subclass_construction'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
