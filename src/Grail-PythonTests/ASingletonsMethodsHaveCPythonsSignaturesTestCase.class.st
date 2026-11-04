Class {
	#name : 'ASingletonsMethodsHaveCPythonsSignaturesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ASingletonsMethodsHaveCPythonsSignaturesTestCase >> testNonesMethodsKeepTheirReceiverInTheirSignature [
	"tests/python/a_singletons_methods_have_cpythons_signatures.py: every method
	of None reports CPython's parameters, its receiver kept because __self__ is
	None, inherited ones included; a class method still drops its type,
	Ellipsis's and NotImplemented's and an int's bound methods drop theirs, and
	rlcompleter leaves ``None.__bool__('' open.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_singletons_methods_have_cpythons_signatures' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_singletons_methods_have_cpythons_signatures.py')
		name: 'a_singletons_methods_have_cpythons_signatures'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
