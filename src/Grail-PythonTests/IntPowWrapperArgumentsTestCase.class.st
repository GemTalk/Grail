Class {
	#name : 'IntPowWrapperArgumentsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
IntPowWrapperArgumentsTestCase >> testIntPowAndRpowRefuseWhatTheSlotWrapperRefuses [
	"tests/python/int_pow_wrapper_arguments.py: int.__pow__ and int.__rpow__
	take one or two positional arguments, refusing any other count and any
	keyword in the words of CPython's ternary slot wrapper, and still compute
	with a modulus.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'int_pow_wrapper_arguments' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_pow_wrapper_arguments.py')
		name: 'int_pow_wrapper_arguments'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
