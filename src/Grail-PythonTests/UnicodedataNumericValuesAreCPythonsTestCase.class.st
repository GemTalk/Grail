Class {
	#name : 'UnicodedataNumericValuesAreCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodedataNumericValuesAreCPythonsTestCase >> testTheNumericAndWidthQueriesAreCPythons [

	"tests/python/unicodedata_numeric_values_are_cpythons.py: unicodedata's
	decimal, digit, numeric, mirrored and east_asian_width answer from tables
	generated from CPython's database, for the current version and for
	ucd_3_2_0, and refuse a bad argument in CPython's words.  Each check
	agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicodedata_numeric_values_are_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicodedata_numeric_values_are_cpythons.py')
		name: 'unicodedata_numeric_values_are_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
