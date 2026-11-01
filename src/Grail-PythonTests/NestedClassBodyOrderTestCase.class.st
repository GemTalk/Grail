Class {
	#name : 'NestedClassBodyOrderTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
NestedClassBodyOrderTestCase >> testANestedClassRunsAtItsOwnPlaceInTheBody [
	"tests/python/nested_class_body_order.py: a nested class's header --
	bases, keywords, decorators -- is evaluated when the body reaches it, so
	it reads the class-body names bound above it, a statement above it does
	not see it, and a class defined twice is seen by each statement as the one
	above it.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'nested_class_body_order' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_class_body_order.py')
		name: 'nested_class_body_order'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
