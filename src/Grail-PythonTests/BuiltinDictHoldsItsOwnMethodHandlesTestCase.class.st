Class {
	#name : 'BuiltinDictHoldsItsOwnMethodHandlesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinDictHoldsItsOwnMethodHandlesTestCase >> testEachEntryAnswersAsCPythonsDoes [

	"tests/python/builtin_dict_holds_its_own_method_handles.py: a builtin type's
	__dict__ entry is the object a read off the class answers, with that class as
	__objclass__, and bytearray's are not bytes'.  Each check agrees with CPython
	3.14."

	| fixture |

	importlib @env1:modules removeKey: #'builtin_dict_holds_its_own_method_handles' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/builtin_dict_holds_its_own_method_handles.py'
		name: 'builtin_dict_holds_its_own_method_handles'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
