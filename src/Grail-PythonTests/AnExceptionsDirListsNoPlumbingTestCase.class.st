Class {
	#name : 'AnExceptionsDirListsNoPlumbingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AnExceptionsDirListsNoPlumbingTestCase >> testAnExceptionsDirListsNeitherGetitemNorUnsetNotes [
	"tests/python/an_exceptions_dir_lists_no_plumbing.py: dir() of an exception
	class lists neither __getitem__ nor __notes__, hasattr finds no class
	__getitem__, an instance lists __notes__ only once add_note stored it,
	subscribing the class still refuses and a generic exception still
	subscribes.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'an_exceptions_dir_lists_no_plumbing' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/an_exceptions_dir_lists_no_plumbing.py')
		name: 'an_exceptions_dir_lists_no_plumbing'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
