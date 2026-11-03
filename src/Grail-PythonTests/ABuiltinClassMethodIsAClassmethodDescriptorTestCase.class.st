Class {
	#name : 'ABuiltinClassMethodIsAClassmethodDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ABuiltinClassMethodIsAClassmethodDescriptorTestCase >> testABuiltinClassMethodBindsAndCallsAsCPythonsDescriptorDoes [
	"tests/python/a_builtin_class_method_is_a_classmethod_descriptor.py: a
	built-in type's class method, as its __dict__ holds it, is a
	classmethod_descriptor that reprs as CPython's, binds only to its type or
	a subtype, is callable with the class first and refuses to be pickled.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_builtin_class_method_is_a_classmethod_descriptor' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_builtin_class_method_is_a_classmethod_descriptor.py')
		name: 'a_builtin_class_method_is_a_classmethod_descriptor'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
