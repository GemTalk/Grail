Class {
	#name : 'BuiltinInstancesHaveNoDictTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinInstancesHaveNoDictTestCase >> testABuiltinInstanceRefusesANewAttribute [
	"tests/python/builtin_instances_have_no_dict.py: object(), list, dict,
	set, frozenset, range, slice and bytearray instances refuse a new
	attribute, and its delete, with CPython's no-__dict__ message, object()
	refuses a __class__ assignment, while their Python subclasses, functions,
	exceptions, modules and classes still take one.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'builtin_instances_have_no_dict' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_instances_have_no_dict.py')
		name: 'builtin_instances_have_no_dict'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
