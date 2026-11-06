Class {
	#name : 'BufferedWriterTakesABufferTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BufferedWriterTakesABufferTestCase >> testBufferedWriterRefusesWhatIsNoBufferAndWritesBytes [

	"tests/python/buffered_writer_takes_a_buffer.py: io.BufferedWriter.write
	refuses what is no buffer as PyObject_GetBuffer does, before it looks at
	whether the file is closed, writes a buffer as its bytes, and a GzipFile
	refuses a list.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'buffered_writer_takes_a_buffer' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/buffered_writer_takes_a_buffer.py')
		name: 'buffered_writer_takes_a_buffer'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
