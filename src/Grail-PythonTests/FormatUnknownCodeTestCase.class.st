Class {
	#name : 'FormatUnknownCodeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FormatUnknownCodeTestCase >> testUnknownPresentationTypeIsNamedWithTheValuesType [
	"tests/python/format_unknown_code.py: the one character left after a
	format spec's flags is its presentation type, and a code the value's type
	lacks is ``Unknown format code'' naming that type -- bool, complex and a
	subclass by their own names -- after the separator check and before the
	type's own refusals.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'format_unknown_code' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_unknown_code.py')
		name: 'format_unknown_code'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
