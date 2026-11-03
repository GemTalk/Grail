Class {
	#name : 'FileIOReprAndModeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIOReprAndModeTestCase >> testFileIOReprModeAndReadOnlyAttributesAreCPythons [
	"tests/python/fileio_repr_and_mode.py: a FileIO's repr names the file, its
	descriptor once the name is deleted, or [closed], and refuses to recurse
	through a name that is the file; its mode is CPython's mode_string, for
	the constructor and binary open() alike; mode and closed cannot be
	assigned or deleted; a text file's repr is textiowrapper_repr's.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fileio_repr_and_mode' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_repr_and_mode.py')
		name: 'fileio_repr_and_mode'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
