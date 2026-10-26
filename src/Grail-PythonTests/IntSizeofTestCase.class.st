Class {
	#name : 'IntSizeofTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Int' }
IntSizeofTestCase >> testAnIntReportsCPythonsIntModel [
	"tests/python/int_sizeof.py: int.__basicsize__ and int.__itemsize__ exist and
	read as numbers (24 and sys.int_info.sizeof_digit), for int and for a
	subclass; n.__sizeof__() is the fixed part plus one digit per 30 bits,
	at least one; sys.getsizeof asks __sizeof__, with CPython's checks on what
	it answers and its default for a TypeError.  Each check agrees with CPython
	3.14 (test_long's test___sizeof__)."

	| fixture |
	importlib @env1:modules removeKey: #'int_sizeof' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_sizeof.py')
		name: 'int_sizeof'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]
