Class {
	#name : 'AFieldHoldingANoBreakSpaceNamesItTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AFieldHoldingANoBreakSpaceNamesItTestCase >> testANonPythonSpaceInAReplacementFieldIsAnInvalidCharacter [
	"tests/python/a_field_holding_a_no_break_space_names_it.py: a replacement
	field holding U+00A0, alone or beside an expression, or U+3000, is
	``invalid non-printable character'', while spaces, tabs, form feeds and
	newlines still trim and an empty field is still refused.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_field_holding_a_no_break_space_names_it' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_field_holding_a_no_break_space_names_it.py')
		name: 'a_field_holding_a_no_break_space_names_it'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
