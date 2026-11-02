Class {
	#name : 'StructSequencesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StructSequencesTestCase >> testStructTimeStatResultAndVersionInfoAreCPythonsStructSequences [
	"tests/python/struct_sequences.py: the three derive from tuple, report
	n_fields and friends, construct and refuse as structseq_new does, keep
	their fields read-only, repr, reduce, pickle and replace as CPython's do,
	and sys.version_info refuses instances.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'struct_sequences' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/struct_sequences.py')
		name: 'struct_sequences'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
