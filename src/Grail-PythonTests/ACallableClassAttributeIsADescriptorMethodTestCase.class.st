Class {
	#name : 'ACallableClassAttributeIsADescriptorMethodTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ACallableClassAttributeIsADescriptorMethodTestCase >> testACallableInstanceUnderADunderMakesItsClassADescriptor [
	"tests/python/a_callable_class_attribute_is_a_descriptor_method.py: a
	callable instance stored as __set__, __get__ or __delete__ on a class,
	after it was made or in its body, makes its instances descriptors, called
	as CPython calls them -- __set__ and __delete__ without the descriptor,
	__get__ with it -- a __get__-only one is shadowed by the instance's own
	attribute, and a def is still bound.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_callable_class_attribute_is_a_descriptor_method' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_callable_class_attribute_is_a_descriptor_method.py')
		name: 'a_callable_class_attribute_is_a_descriptor_method'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
