Class {
	#name : 'SysThreadInfoIsAStructSequenceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysThreadInfoIsAStructSequenceTestCase >> testSysThreadInfoIsAThreeFieldStructSequence [
	"tests/python/sys_thread_info_is_a_struct_sequence.py: sys.thread_info is
	a struct sequence of three fields, its type sys.thread_info, read by
	index and by name, with values test_sys accepts.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_thread_info_is_a_struct_sequence' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_thread_info_is_a_struct_sequence.py')
		name: 'sys_thread_info_is_a_struct_sequence'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
