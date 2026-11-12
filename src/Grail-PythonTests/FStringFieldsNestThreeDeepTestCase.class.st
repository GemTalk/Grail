Class {
	#name : 'FStringFieldsNestThreeDeepTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringFieldsNestThreeDeepTestCase >> testEachCompileAnswersAsCPythonsDoes [

	"tests/python/fstring_fields_nest_three_deep.py: an f-string's fields
	nest three deep through their format specs, and a fourth level is
	CPython's SyntaxError.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'fstring_fields_nest_three_deep' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/fstring_fields_nest_three_deep.py'
		name: 'fstring_fields_nest_three_deep'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
