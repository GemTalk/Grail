Class {
	#name : 'ObjectInitExcessArgumentsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ObjectInitExcessArgumentsTestCase >> testObjectInitRefusesTheArgumentsItWouldDrop [
	"tests/python/object_init_excess_arguments.py: object.__init__ given
	arguments refuses them for a class with an __init__ of its own and names
	a class with neither __init__ nor __new__, accepts them where __new__
	consumed them, and a cooperative super().__init__ through a
	multiple-inheritance MRO still reaches the next base.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'object_init_excess_arguments' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/object_init_excess_arguments.py')
		name: 'object_init_excess_arguments'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
