Class {
	#name : 'CallableMetaclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CallableMetaclassTestCase >> testAMetaclassThatIsNoClassIsCalledWithTheNamespace [
	"tests/python/callable_metaclass.py: a function, a generic alias or a
	callable instance given as ``metaclass='' gets its __prepare__ asked, is
	called with the name, the bases, the namespace and the class keywords, and
	the name is bound to its answer; a parent's __init_subclass__ runs only if
	the call reaches type.__new__.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'callable_metaclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/callable_metaclass.py')
		name: 'callable_metaclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
