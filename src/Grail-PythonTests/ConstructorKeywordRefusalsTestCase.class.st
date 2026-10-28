Class {
	#name : 'ConstructorKeywordRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ConstructorKeywordRefusalsTestCase >> testBuiltinsRefuseKeywordsHoweverTheyAreCalled [
	"tests/python/constructor_keyword_refusals.py: int refuses a stray keyword
	through a name too, mappingproxy and memoryview take their nameable
	parameter, bytearray and super refuse in their own names, and what takes
	no keyword says so.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'constructor_keyword_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/constructor_keyword_refusals.py')
		name: 'constructor_keyword_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
