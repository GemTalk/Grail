Class {
	#name : 'MemoryviewHexTakesASeparatorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MemoryviewHexTakesASeparatorTestCase >> testEachCallAnswersAsCPythonsDoes [

	"tests/python/memoryview_hex_takes_a_separator.py: memoryview.hex takes
	bytes.hex's separator, group size and keywords.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'memoryview_hex_takes_a_separator' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/memoryview_hex_takes_a_separator.py'
		name: 'memoryview_hex_takes_a_separator'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
