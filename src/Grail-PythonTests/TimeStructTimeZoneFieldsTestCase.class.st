Class {
	#name : 'TimeStructTimeZoneFieldsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TimeStructTimeZoneFieldsTestCase >> testGmtimeAndLocaltimeFillTheZoneFields [
	"tests/python/time_struct_time_zone_fields.py: gmtime is not daylight time
	and 0 seconds from UTC, and localtime's tm_zone and tm_gmtoff are the
	zone's name and offset for its half of the year.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'time_struct_time_zone_fields' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/time_struct_time_zone_fields.py')
		name: 'time_struct_time_zone_fields'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
