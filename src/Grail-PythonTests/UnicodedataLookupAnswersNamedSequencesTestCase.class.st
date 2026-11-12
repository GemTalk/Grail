Class {
	#name : 'UnicodedataLookupAnswersNamedSequencesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodedataLookupAnswersNamedSequencesTestCase >> testEachLookupAnswersAsCPythonsDoes [

	"tests/python/unicodedata_lookup_answers_named_sequences.py: unicodedata.lookup()
	answers a Unicode named sequence as its characters, and the \N{} escape still
	refuses one (#1562).  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicodedata_lookup_answers_named_sequences' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/unicodedata_lookup_answers_named_sequences.py'
		name: 'unicodedata_lookup_answers_named_sequences'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
