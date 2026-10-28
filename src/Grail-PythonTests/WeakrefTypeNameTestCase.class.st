Class {
	#name : 'WeakrefTypeNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
WeakrefTypeNameTestCase >> testWeakrefRefNamesItselfAsReferenceType [
	"tests/python/weakref_type_name.py: weakref.ref is weakref.ReferenceType by
	name, qualname, module and repr, a subclass keeps its own name, and a
	weakref's repr is CPython's -- live, to a named referent, and dead.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'weakref_type_name' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/weakref_type_name.py')
		name: 'weakref_type_name'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
