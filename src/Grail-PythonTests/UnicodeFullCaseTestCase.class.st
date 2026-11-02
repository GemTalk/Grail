Class {
	#name : 'UnicodeFullCaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeFullCaseTestCase >> testStrCasesByUnicodesFullCaseData [
	"tests/python/unicode_full_case.py: lower, upper, casefold, swapcase,
	capitalize and title map by the full Unicode mappings -- final sigma,
	casefold's 'ss', titlecase's 'ǅ' and 'Fi' -- and islower, isupper and
	istitle read the Lowercase, Uppercase and Titlecase properties.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unicode_full_case' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_full_case.py')
		name: 'unicode_full_case'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
