Class {
	#name : 'AControlCharacterIsANonPrintableOneTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AControlCharacterIsANonPrintableOneTestCase >> testAnAsciiControlCharacterIsAnInvalidNonPrintableCharacter [
	"tests/python/a_control_character_is_a_non_printable_one.py: DEL, a
	vertical tab and other C0 controls are ``invalid non-printable
	character'' at their column, printable ASCII that starts no token stays
	``invalid syntax'', and a tab or form feed is still skipped.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_control_character_is_a_non_printable_one' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_control_character_is_a_non_printable_one.py')
		name: 'a_control_character_is_a_non_printable_one'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
