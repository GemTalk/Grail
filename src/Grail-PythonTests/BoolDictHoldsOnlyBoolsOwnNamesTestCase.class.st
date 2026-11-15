Class {
	#name : 'BoolDictHoldsOnlyBoolsOwnNamesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BoolDictHoldsOnlyBoolsOwnNamesTestCase >> testBoolsDictionaryHoldsOnlyTheNamesCPythonsDoes [

	"tests/python/bool_dict_holds_only_bools_own_names.py: bool's __dict__ lists
	CPython's ten names, int's methods are found on int, and reads through bool
	still work.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'bool_dict_holds_only_bools_own_names' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/bool_dict_holds_only_bools_own_names.py'
		name: 'bool_dict_holds_only_bools_own_names'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
