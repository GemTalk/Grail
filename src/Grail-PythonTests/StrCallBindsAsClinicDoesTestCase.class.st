Class {
	#name : 'StrCallBindsAsClinicDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrCallBindsAsClinicDoesTestCase >> testStrRefusesItsArgumentsInClinicsWordsAndOrder [
	"tests/python/str_call_binds_as_clinic_does.py: str() counts keywords in
	its at-most-three limit, before their names, and refuses any of its three
	parameters given by position and by name.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_call_binds_as_clinic_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_call_binds_as_clinic_does.py')
		name: 'str_call_binds_as_clinic_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
