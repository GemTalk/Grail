Class {
	#name : 'KeywordListsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
KeywordListsTestCase >> testKeywordListsTheHardKeywordsAndSoftOnesApart [
	"tests/python/keyword_lists.py: kwlist holds the 35 hard keywords, sorted,
	softkwlist the soft ones, iskeyword reads a frozenset taken at load, and a
	soft keyword is an ordinary name.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'keyword_lists' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/keyword_lists.py')
		name: 'keyword_lists'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
