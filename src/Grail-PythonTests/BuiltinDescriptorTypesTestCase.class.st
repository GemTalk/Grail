Class {
	#name : 'BuiltinDescriptorTypesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinDescriptorTypesTestCase >> testBuiltinMethodsAreTheDescriptorTypesCPythonsAre [
	"tests/python/builtin_descriptor_types.py: a built-in type's method read off
	the type is a method descriptor or slot wrapper, bound it is a builtin or a
	method-wrapper, the types module's classes admit them, and the reprs and
	error messages follow, while a Python def stays a function.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_descriptor_types' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_descriptor_types.py')
		name: 'builtin_descriptor_types'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
