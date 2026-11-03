Class {
	#name : 'FunctionTypeBindsAsClinicDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FunctionTypeBindsAsClinicDoesTestCase >> testFunctionTypeBindsAndChecksItsArguments [
	"tests/python/function_type_binds_as_clinic_does.py: types.FunctionType
	refuses a bad call with Argument Clinic's messages and an optional
	argument of the wrong type with func_new's (arg 3 to arg 6), and keeps
	the name and the defaults it is given.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'function_type_binds_as_clinic_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_type_binds_as_clinic_does.py')
		name: 'function_type_binds_as_clinic_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]
