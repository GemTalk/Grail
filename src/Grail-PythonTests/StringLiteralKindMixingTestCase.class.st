Class {
	#name : 'StringLiteralKindMixingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StringLiteralKindMixingTestCase >> testBytesBesideStrAndTStringBesideOthersAreRefused [
	"tests/python/string_literal_kind_mixing.py: adjacent bytes and str
	literals, and a t-string beside any other literal, are CPython's
	SyntaxErrors at CPython's locations, and literals of one kind still
	concatenate.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'string_literal_kind_mixing' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/string_literal_kind_mixing.py')
		name: 'string_literal_kind_mixing'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
