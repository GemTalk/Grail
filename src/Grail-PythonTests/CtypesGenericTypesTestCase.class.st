Class {
	#name : 'CtypesGenericTypesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CtypesGenericTypesTestCase >> testTheGenericCtypesTypesSubscriptToAnAlias [
	"tests/python/ctypes_generic_types.py: ctypes.Array -- and so an array
	type such as ``c_int * 3'' -- LibraryLoader and py_object subscript to a
	types.GenericAlias, as CPython's do, while Structure stays not
	subscriptable and the types still work as data.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'ctypes_generic_types' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ctypes_generic_types.py')
		name: 'ctypes_generic_types'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
