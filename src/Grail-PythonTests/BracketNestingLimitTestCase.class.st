Class {
	#name : 'BracketNestingLimitTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BracketNestingLimitTestCase >> testTheTwoHundredAndFirstOpenBracketIsRefused [
	"tests/python/bracket_nesting_limit.py: 200 open brackets of any kinds
	parse, and the 201st is ``too many nested parentheses'' where it opens.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'bracket_nesting_limit' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bracket_nesting_limit.py')
		name: 'bracket_nesting_limit'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
