Class {
	#name : 'IntSubclassDefaultedOverrideTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
IntSubclassDefaultedOverrideTestCase >> testDefaultedOverrideWinsAndPowIsTheOperator [
	"tests/python/int_subclass_defaulted_override.py: an int or float
	subclass's __pow__ with a defaulted modulus runs for ``**'' and pow(),
	pow() tries the reflected __rpow__ as ``**'' does, a None modulus is the
	2-argument form, and int's own pow takes an int subclass's modulus.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'int_subclass_defaulted_override' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_subclass_defaulted_override.py')
		name: 'int_subclass_defaulted_override'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
