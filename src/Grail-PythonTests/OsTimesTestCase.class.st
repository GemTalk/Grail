Class {
	#name : 'OsTimesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OsTimesTestCase >> testOsTimesAnswersATimesResult [
	"tests/python/os_times.py: os.times() answers a posix.times_result of five
	non-negative float times, which copy.replace handles field by field.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'os_times' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_times.py')
		name: 'os_times'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
