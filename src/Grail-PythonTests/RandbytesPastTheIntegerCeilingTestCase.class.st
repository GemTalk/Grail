Class {
	#name : 'RandbytesPastTheIntegerCeilingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RandbytesPastTheIntegerCeilingTestCase >> testRandbytesPastOneIntegerGivesCPythonsBytesAndState [
	"tests/python/randbytes_past_the_integer_ceiling.py: random.randbytes(n)
	for an n whose bits no single Grail integer holds -- 17 KB, 100 KB, 10 MB --
	draws the bytes CPython draws and leaves the generator where CPython's
	does.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'randbytes_past_the_integer_ceiling' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/randbytes_past_the_integer_ceiling.py')
		name: 'randbytes_past_the_integer_ceiling'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
