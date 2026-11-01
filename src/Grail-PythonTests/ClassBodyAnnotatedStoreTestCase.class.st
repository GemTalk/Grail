Class {
	#name : 'ClassBodyAnnotatedStoreTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBodyAnnotatedStoreTestCase >> testAnAnnotatedAttributeOrSubscriptIsExecuted [
	"tests/python/class_body_annotated_store.py: an annotated assignment to an
	attribute or a subscript runs in a class body -- the value, then the store
	-- and records no annotation; with no value, its object and key are still
	evaluated, in a class, a function or a module.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_body_annotated_store' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_annotated_store.py')
		name: 'class_body_annotated_store'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
