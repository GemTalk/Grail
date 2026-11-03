Class {
	#name : 'ZlibStreamsBindAndDrainAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ZlibStreamsBindAndDrainAsCPythonsTestCase >> testZlibStreamsBindPositionallyAndFlushDrainsEverything [
	"tests/python/zlib_streams_bind_and_drain_as_cpythons.py: compress,
	decompress and both flushes refuse their positional-only argument by
	keyword in Argument Clinic's words, and Decompress.flush(length) answers
	all the remaining output whatever the length.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'zlib_streams_bind_and_drain_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/zlib_streams_bind_and_drain_as_cpythons.py')
		name: 'zlib_streams_bind_and_drain_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
