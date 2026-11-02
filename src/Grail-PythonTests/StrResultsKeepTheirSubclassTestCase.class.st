Class {
	#name : 'StrResultsKeepTheirSubclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrResultsKeepTheirSubclassTestCase >> testStrAndAsciiAnswerTheSubclassInstanceTheirHookAnswered [
	"tests/python/str_results_keep_their_subclass.py: str(x) answers the str
	subclass instance x's __str__ answered, while str(subclass_instance) is
	exact str, and ascii(x) answers an all-ASCII repr unchanged and escapes
	only code points past 127.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_results_keep_their_subclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_results_keep_their_subclass.py')
		name: 'str_results_keep_their_subclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
