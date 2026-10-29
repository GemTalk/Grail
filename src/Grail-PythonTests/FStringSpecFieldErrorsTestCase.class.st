Class {
	#name : 'FStringSpecFieldErrorsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FStringSpecFieldErrorsTestCase >> testErrorInAFieldNestedInASpecIsLocatedInTheSource [
	"tests/python/fstring_spec_field_errors.py: an error in a replacement field
	nested inside a format spec -- one spec deep or two, on any line -- is
	CPython's, at CPython's location in the source, and eval's SyntaxError
	carries its message.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'fstring_spec_field_errors' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_spec_field_errors.py')
		name: 'fstring_spec_field_errors'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
