Class {
	#name : 'FileIOReadsAllAndIntoTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIOReadsAllAndIntoTestCase >> testAFileIOReadsTheRestIntoABufferAndUpToAHint [
	"tests/python/fileio_reads_all_and_into.py: readall() reads the rest of the
	file, readinto(b) fills a bytearray or a memoryview over one, shaped or
	sliced, and refuses a buffer it cannot write, and readlines(hint) stops
	after the line that reaches hint.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fileio_reads_all_and_into' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_reads_all_and_into.py')
		name: 'fileio_reads_all_and_into'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
