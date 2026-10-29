Class {
	#name : 'RuntimeObjectBaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RuntimeObjectBaseTestCase >> testAClassOverARuntimeObjectBaseIsAPythonClass [
	"tests/python/runtime_object_base.py: a class statement whose base is
	object, known only at run time, builds the class ``class C(object)''
	builds -- reflected operators reach its methods, its instances have a
	__dict__, its __slots__ hold.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'runtime_object_base' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/runtime_object_base.py')
		name: 'runtime_object_base'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
