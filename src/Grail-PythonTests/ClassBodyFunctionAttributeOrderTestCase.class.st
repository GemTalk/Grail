Class {
	#name : 'ClassBodyFunctionAttributeOrderTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBodyFunctionAttributeOrderTestCase >> testAFunctionAttributeIsSetAtItsOwnPlaceInTheBody [
	"tests/python/class_body_function_attribute_order.py: ``f.attr = value'' on
	a sibling def runs when the body reaches it, so a later statement reads the
	mark, an earlier one does not, and the value reads the body's names as they
	stand there.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'class_body_function_attribute_order' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_function_attribute_order.py')
		name: 'class_body_function_attribute_order'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
