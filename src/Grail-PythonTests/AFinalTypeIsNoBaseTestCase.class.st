Class {
	#name : 'AFinalTypeIsNoBaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AFinalTypeIsNoBaseTestCase >> testATypeThatAllowsNoSubclassIsRefusedAsABase [
	"tests/python/a_final_type_is_no_base.py: NoneType, range, a function's
	type, a dict view and the other types without Py_TPFLAGS_BASETYPE are
	refused as a base in any position, by a class statement, type() and a
	__bases__ assignment, while int, list, dict, Exception and a user class
	named range stay subclassable.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_final_type_is_no_base' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_final_type_is_no_base.py')
		name: 'a_final_type_is_no_base'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
