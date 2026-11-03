Class {
	#name : 'AssertWarnsKeepsItsWarningsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AssertWarnsKeepsItsWarningsTestCase >> testAssertWarnsKeepsItsRecordsAndManagerAsCPythonsDoes [
	"tests/python/assert_warns_keeps_its_warnings.py: assertWarns' context
	keeps every record as ``warnings'' and its catch_warnings as
	``warnings_manager'', CPython's names.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'assert_warns_keeps_its_warnings' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/assert_warns_keeps_its_warnings.py')
		name: 'assert_warns_keeps_its_warnings'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
