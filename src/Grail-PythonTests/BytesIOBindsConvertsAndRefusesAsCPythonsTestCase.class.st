Class {
	#name : 'BytesIOBindsConvertsAndRefusesAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BytesIOBindsConvertsAndRefusesAsCPythonsTestCase >> testBytesIOTakesAnyBufferAndRefusesAsCPythonsDoes [
	"tests/python/bytesio_binds_converts_and_refuses_as_cpythons.py: io.BytesIO
	reads any buffer, takes its sizes through __index__, refuses what
	bytesio.c refuses in its words, answers IOBase's fileno, detach, read1,
	readinto1 and _checkClosed, restarts on __init__, and pickles through
	__getstate__ and __setstate__.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'bytesio_binds_converts_and_refuses_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bytesio_binds_converts_and_refuses_as_cpythons.py')
		name: 'bytesio_binds_converts_and_refuses_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '16 checks, 0 disagreeing [], keys match: True'

]
