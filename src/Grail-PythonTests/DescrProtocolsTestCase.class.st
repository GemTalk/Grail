Class {
	#name : 'DescrProtocolsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Descriptors' }
DescrProtocolsTestCase >> testClassConstructionAndDescriptorRules [
	"tests/python/descr_protocols.py: the class-construction and descriptor
	rules test_descr pins -- isinstance and super through a forwarding proxy,
	a __doc__ descriptor, @staticmethod __new__ and the implicit wrappers in
	the class dict, type()'s non-string-key warning, print through __getattr__,
	layout conflicts, ModuleType's MRO, __slots__ over a plain or
	__dict__-naming base, slot and slot-wrapper type checks, a built-in method
	assigned to a dunder, super().__new__ in list and dict subclasses, and
	bool's reflected ==, plus guards that must not move.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'descr_protocols' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/descr_protocols.py')
		name: 'descr_protocols'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '31 checks, 0 disagreeing [], keys match: True'

]
