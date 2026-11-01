Class {
	#name : 'TStringSpecErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TStringSpecErrorsTestCase >> testAnErrorInATemplateStringSpecNamesTheTemplateString [
	"tests/python/tstring_spec_errors.py: a SyntaxError in a replacement field
	nested in a t-string field's format spec begins ``t-string:'', at any
	depth, while an f-string's still begins ``f-string:''.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'tstring_spec_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tstring_spec_errors.py')
		name: 'tstring_spec_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
