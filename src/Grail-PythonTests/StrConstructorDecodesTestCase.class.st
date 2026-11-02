Class {
	#name : 'StrConstructorDecodesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrConstructorDecodesTestCase >> testStrDecodesAnyBufferAndRefusesAsCPythonDoes [
	"tests/python/str_constructor_decodes.py: str(object, encoding, errors)
	decodes bytes and any other buffer, answers '' with no object, checks that
	encoding and errors are str first, and refuses a str, a non-buffer and a
	fourth argument in CPython's words.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_constructor_decodes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_constructor_decodes.py')
		name: 'str_constructor_decodes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
