Class {
	#name : 'ClassmethodGetOwnerTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassmethodGetOwnerTestCase >> testGetWithNoOwnerBindsThePythonType [
	"tests/python/classmethod_get_owner.py: classmethod.__get__(obj) binds
	type(obj) -- int for 0, bool for True, the class for an instance -- an
	owner given wins, and neither given is CPython's TypeError.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'classmethod_get_owner' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_get_owner.py')
		name: 'classmethod_get_owner'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
