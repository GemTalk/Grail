Class {
	#name : 'FileIOTakesADescriptorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FileIOTakesADescriptorTestCase >> testFileioOverADescriptorAgreesWithCPython [

	"tests/python/fileio_takes_a_descriptor.py: io.FileIO(fd) reads, writes and
	seeks a descriptor os.open handed out, closes it only when closefd is true,
	refuses a negative, closed or directory descriptor, takes a bool with a
	RuntimeWarning, parses its mode in fileio.c's words and binds its arguments
	as Argument Clinic does.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'fileio_takes_a_descriptor' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fileio_takes_a_descriptor.py')
		name: 'fileio_takes_a_descriptor'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '16 checks, 0 disagreeing [], keys match: True'

]
