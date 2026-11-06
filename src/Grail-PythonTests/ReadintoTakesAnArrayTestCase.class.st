Class {
	#name : 'ReadintoTakesAnArrayTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReadintoTakesAnArrayTestCase >> testFileioAndOsReadIntoAnArray [

	"tests/python/readinto_takes_an_array.py: FileIO.readinto() and
	os.readinto() read into an array.array, and into a view over one, by its
	bytes; a read-only buffer is still refused.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'readinto_takes_an_array' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/readinto_takes_an_array.py')
		name: 'readinto_takes_an_array'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
