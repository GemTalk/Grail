Class {
	#name : 'DatetimeFieldsTakeAnyIntTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DatetimeFieldsTakeAnyIntTestCase >> testDateDatetimeAndTimeTakeAnyIntForTheirFields [
	"tests/python/datetime_fields_take_any_int.py: a bool, an IntEnum member
	or an int subclass's instance is a date, datetime or time field, read as
	the int it stands for, and a float or str is refused in CPython's words.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'datetime_fields_take_any_int' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/datetime_fields_take_any_int.py')
		name: 'datetime_fields_take_any_int'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
