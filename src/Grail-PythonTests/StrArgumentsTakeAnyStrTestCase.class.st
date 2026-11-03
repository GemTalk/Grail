Class {
	#name : 'StrArgumentsTakeAnyStrTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrArgumentsTakeAnyStrTestCase >> testAnEncodingOrErrorsArgumentMayBeAnyStr [
	"tests/python/str_arguments_take_any_str.py: str.encode, bytes.decode and
	str() take a str subclass or a StrEnum member as their encoding or errors,
	and a str holding lone surrogates raises its UTF-8 encoding's
	UnicodeEncodeError, which email's encoded-word decoder turns into a
	CharsetError.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'str_arguments_take_any_str' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_arguments_take_any_str.py')
		name: 'str_arguments_take_any_str'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
