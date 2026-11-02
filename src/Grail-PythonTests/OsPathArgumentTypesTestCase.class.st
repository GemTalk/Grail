Class {
	#name : 'OsPathArgumentTypesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OsPathArgumentTypesTestCase >> testOsFunctionsConvertAPathArgumentAsCPythonDoes [
	"tests/python/os_path_argument_types.py: an argument that is no path is a
	TypeError in CPython's words, not an uncatchable MessageNotUnderstood from
	the file primitive; os.stat takes a descriptor, warning for a bool; None is
	listdir's and scandir's current directory; the predicates convert as
	os.stat and os.lstat do; and os.fspath refuses a bytearray.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'os_path_argument_types' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_path_argument_types.py')
		name: 'os_path_argument_types'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '29 checks, 0 disagreeing [], keys match: True'

]
