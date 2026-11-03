Class {
	#name : 'ABytearrayTakesAnArraysBytesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ABytearrayTakesAnArraysBytesTestCase >> testExtendConcatenationAndSliceAssignmentTakeAnArraysBytes [
	"tests/python/a_bytearray_takes_an_arrays_bytes.py: bytearray.extend(),
	+= and slice assignment read an array.array by its bytes, as they read any
	buffer, so GzipFile.write(array) writes them; a list still extends by its
	items and += still refuses a non-buffer.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_bytearray_takes_an_arrays_bytes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_bytearray_takes_an_arrays_bytes.py')
		name: 'a_bytearray_takes_an_arrays_bytes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
