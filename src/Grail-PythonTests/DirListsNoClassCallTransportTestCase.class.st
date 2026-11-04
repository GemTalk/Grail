Class {
	#name : 'DirListsNoClassCallTransportTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DirListsNoClassCallTransportTestCase >> testDirListsNoMethodNamedAfterABuiltInType [
	"tests/python/dir_lists_no_class_call_transport.py: dir(str), dir('') and
	dir() of a str subclass list no ``str'', datetime and timedelta list
	themselves neither in dir() nor in __dict__, and rlcompleter offers no
	``str.str()''; datetime.date, str.maketrans and a Python class's own
	same-named method stay.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dir_lists_no_class_call_transport' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_lists_no_class_call_transport.py')
		name: 'dir_lists_no_class_call_transport'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
