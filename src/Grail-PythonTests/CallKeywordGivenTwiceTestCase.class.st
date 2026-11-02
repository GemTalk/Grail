Class {
	#name : 'CallKeywordGivenTwiceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CallKeywordGivenTwiceTestCase >> testAKeywordGivenTwiceThroughASplatIsRefused [
	"tests/python/call_keyword_given_twice.py: a keyword given twice -- named
	and in a ``**m'', or in two of them -- is CPython's TypeError naming the
	callee, and keywords that do not overlap are merged in source order.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'call_keyword_given_twice' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/call_keyword_given_twice.py')
		name: 'call_keyword_given_twice'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
