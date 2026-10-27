Class {
	#name : 'LegacyStatementHintTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
LegacyStatementHintTestCase >> testThePrintHintIsGivenOnlyWhenWhatFollowsParses [
	"tests/python/legacy_statement_hint.py: ``print foo'' and ``print f(**)''
	are ``Missing parentheses in call to 'print''', drawn over what parses;
	``print {1:(foo.)}'', where nothing does, is plain invalid syntax at the
	brace.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'legacy_statement_hint' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/legacy_statement_hint.py')
		name: 'legacy_statement_hint'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
