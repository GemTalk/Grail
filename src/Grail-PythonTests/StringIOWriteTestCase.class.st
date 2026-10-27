Class {
	#name : 'StringIOWriteTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StringIOWriteTestCase >> testWriteRefusesAnythingButAStr [
	"tests/python/stringio_write_refuses_non_str.py: io.StringIO.write takes
	a str or a str subclass, refuses bytes, int, None and bytearray with
	CPython's ``string argument expected, got ...'' before asking whether the
	stream is closed, and writes nothing for a refused argument -- so
	base64.encode into a StringIO raises.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'stringio_write_refuses_non_str' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stringio_write_refuses_non_str.py')
		name: 'stringio_write_refuses_non_str'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
