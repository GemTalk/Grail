Class {
	#name : 'AStrEnumMemberIsANumberLiteralTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AStrEnumMemberIsANumberLiteralTestCase >> testIntFloatAndComplexParseAStrEnumMember [
	"tests/python/a_str_enum_member_is_a_number_literal.py: int(), float() and
	complex() parse a StrEnum member's value as any str's, and name a bad one
	by the member's repr.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_str_enum_member_is_a_number_literal' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_str_enum_member_is_a_number_literal.py')
		name: 'a_str_enum_member_is_a_number_literal'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
