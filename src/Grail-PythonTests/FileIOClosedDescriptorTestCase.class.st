Class {
	#name : 'FileIOClosedDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIOClosedDescriptorTestCase >> testADescriptorClosedUnderAFileIsEbadfToEveryOperationThatReachesIt [
	"tests/python/fileio_closed_descriptor.py: os.close(f.fileno()) takes the
	descriptor and leaves the file open over nothing, so every read, write,
	seek, tell, truncate and close is EBADF while readable(), writable() and
	fileno() still answer, close() still closes, and a file over a borrowed
	descriptor fails the same way once its lender closes.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fileio_closed_descriptor' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_closed_descriptor.py')
		name: 'fileio_closed_descriptor'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
