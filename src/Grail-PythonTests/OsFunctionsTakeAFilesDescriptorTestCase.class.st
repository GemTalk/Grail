Class {
	#name : 'OsFunctionsTakeAFilesDescriptorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OsFunctionsTakeAFilesDescriptorTestCase >> testOsTakesTheDescriptorUnderAnOpenFile [
	"tests/python/os_functions_take_a_files_descriptor.py: os.fstat, os.fsync
	and os.isatty take the descriptor an open binary or text file's fileno()
	answers, refuse it with EBADF once the file is closed, and
	shutil.copyfile copies through it.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'os_functions_take_a_files_descriptor' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/os_functions_take_a_files_descriptor.py')
		name: 'os_functions_take_a_files_descriptor'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
