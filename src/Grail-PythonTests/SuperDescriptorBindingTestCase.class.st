Class {
	#name : 'SuperDescriptorBindingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SuperDescriptorBindingTestCase >> testAnUnboundSuperBindsToTheInstanceItIsReadThrough [
	"tests/python/super_descriptor_binding.py: ``C._C__super = super(C)''
	read as ``self.__super'' binds to the instance and continues along its
	MRO, a super subclass is rebuilt by calling its type, __get__ called
	explicitly binds the same way, and a bound super or a read with no
	instance answers itself.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'super_descriptor_binding' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_descriptor_binding.py')
		name: 'super_descriptor_binding'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
