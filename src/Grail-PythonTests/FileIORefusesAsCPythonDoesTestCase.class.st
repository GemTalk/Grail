Class {
	#name : 'FileIORefusesAsCPythonDoesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIORefusesAsCPythonDoesTestCase >> testFileIORefusesBadBuffersPathsAndDirections [
	"tests/python/fileio_refuses_as_cpython_does.py: FileIO.write takes any
	buffer and refuses anything else with CPython's TypeError, a path that is
	no str, bytes or PathLike is os.fspath's TypeError, and the wrong
	direction is io.UnsupportedOperation in CPython's words for a binary and a
	text file.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fileio_refuses_as_cpython_does' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_refuses_as_cpython_does.py')
		name: 'fileio_refuses_as_cpython_does'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
