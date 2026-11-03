Class {
	#name : 'FileIOTruncatesThroughItsDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIOTruncatesThroughItsDescriptorTestCase >> testFileIOTruncatesAndReportsItsBlockSize [
	"tests/python/fileio_truncates_through_its_descriptor.py: FileIO.truncate
	shortens or extends the file through ftruncate(2), to the position when
	given no size, answering the size and keeping the position, for a binary
	and a text file; _blksize is the descriptor's st_blksize.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fileio_truncates_through_its_descriptor' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_truncates_through_its_descriptor.py')
		name: 'fileio_truncates_through_its_descriptor'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '16 checks, 0 disagreeing [], keys match: True'

]
