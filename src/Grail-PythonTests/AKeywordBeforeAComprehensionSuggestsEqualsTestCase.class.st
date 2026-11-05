Class {
	#name : 'AKeywordBeforeAComprehensionSuggestsEqualsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AKeywordBeforeAComprehensionSuggestsEqualsTestCase >> testAKeywordValueRunningIntoAComprehensionIsTheEqualsSuggestion [
	"tests/python/a_keyword_before_a_comprehension_suggests_equals.py: a
	keyword whose value runs into ``for'', ``async for'' or a ``for ... if''
	is CPython's invalid_kwarg SyntaxError suggesting ``=='' or ``:='',
	over the name through the ``='', and a parenthesised generator or a
	comprehension display as the value still compiles.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_keyword_before_a_comprehension_suggests_equals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_keyword_before_a_comprehension_suggests_equals.py')
		name: 'a_keyword_before_a_comprehension_suggests_equals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
