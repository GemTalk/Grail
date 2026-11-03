Class {
	#name : 'Utf7EndsARunAsCPythonDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
Utf7EndsARunAsCPythonDoesTestCase >> testAShiftedRunEndsOnlyWhereItMust [
	"tests/python/utf7_ends_a_run_as_cpython_does.py: UTF-7 closes a base64
	run with ``-'' only before a base64 character or a ``-'' and at the end,
	encodes a ``+'' inside a run, and round-trips.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'utf7_ends_a_run_as_cpython_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/utf7_ends_a_run_as_cpython_does.py')
		name: 'utf7_ends_a_run_as_cpython_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
