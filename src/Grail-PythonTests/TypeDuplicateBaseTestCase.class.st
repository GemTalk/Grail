Class {
	#name : 'TypeDuplicateBaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeDuplicateBaseTestCase >> testTypeRefusesTheSameBaseTwice [
	"tests/python/type_duplicate_base.py: three-argument type() refuses the
	same class twice among its bases with CPython's ``duplicate base class'',
	as a class statement does, and the MRO refusals and legal orders stay as
	they were.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_duplicate_base' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_duplicate_base.py')
		name: 'type_duplicate_base'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
