Class {
	#name : 'TypeBuiltClassIsPythonTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeBuiltClassIsPythonTestCase >> testATypeBuiltClassIsJudgedAsAClassStatements [
	"tests/python/type_built_class_is_python.py: a class built by type(), a
	metaclass call or types.new_class() refuses a subscript it has no
	__class_getitem__ for, and object.__new__ / object.__init__ refuse its
	excess arguments, as for a class statement's.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_built_class_is_python' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_built_class_is_python.py')
		name: 'type_built_class_is_python'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '19 checks, 0 disagreeing [], keys match: True'

]
