Class {
	#name : 'SysInfoStructSequencesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysInfoStructSequencesTestCase >> testSysFlagsAndTheInfoTuplesAreStructSequences [
	"tests/python/sys_info_struct_sequences.py: sys.flags, float_info,
	int_info and hash_info derive from tuple, index, repr and read as struct
	sequences, flags keeps its bools and refuses new instances, and the
	others construct from a sequence.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_info_struct_sequences' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_info_struct_sequences.py')
		name: 'sys_info_struct_sequences'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
