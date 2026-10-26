Class {
	#name : 'DatetimeAcceleratorNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DatetimeAcceleratorNameTestCase >> testTheAcceleratorNameAnswersDatetimesOwnClasses [
	"tests/python/datetime_accelerator_name.py: ``import _datetime'' works and
	answers the same classes and constants as datetime, as CPython's does
	(datetime.py re-exports its C accelerator).  test_types imports it at
	module level.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'datetime_accelerator_name' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/datetime_accelerator_name.py')
		name: 'datetime_accelerator_name'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
