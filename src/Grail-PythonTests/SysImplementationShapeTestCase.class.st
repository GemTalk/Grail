Class {
	#name : 'SysImplementationShapeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysImplementationShapeTestCase >> testSysImplementationHasThePepAttributes [
	"tests/python/sys_implementation_shape.py: sys.implementation has PEP
	421's attributes, its version a named struct sequence that its hexversion
	encodes, and PEP 734's supports_isolated_interpreters, a bool.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_implementation_shape' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_implementation_shape.py')
		name: 'sys_implementation_shape'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
