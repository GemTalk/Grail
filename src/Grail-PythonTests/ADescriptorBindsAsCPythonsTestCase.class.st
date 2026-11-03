Class {
	#name : 'ADescriptorBindsAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ADescriptorBindsAsCPythonsTestCase >> testAMethodsGetBindsAndRefusesAsCPythons [
	"tests/python/a_descriptor_binds_as_cpythons.py: a built-in type's method
	descriptor's __get__ refuses an object of another type in descr_check's
	words, any method's __get__(None) is refused, and with an owner, or an
	instance of the type or a subtype, it binds; a def binds anything.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_descriptor_binds_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_descriptor_binds_as_cpythons.py')
		name: 'a_descriptor_binds_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
