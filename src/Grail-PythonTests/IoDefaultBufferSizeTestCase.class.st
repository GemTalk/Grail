Class {
	#name : 'IoDefaultBufferSizeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
IoDefaultBufferSizeTestCase >> testTheDefaultBufferSizeIsTheBufferABufferedReaderTakes [
	"tests/python/io_default_buffer_size.py: io, _io and _pyio all say 128 KiB,
	a BufferedReader asks its raw stream for that much, and a GzipFile reads at
	most one such buffer ahead.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'io_default_buffer_size' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/io_default_buffer_size.py')
		name: 'io_default_buffer_size'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
