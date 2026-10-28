Class {
	#name : 'MethodKeywordRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MethodKeywordRefusalsTestCase >> testStrSetAndBytesMethodsTakeAndRefuseKeywordsAsCPythonsDo [
	"tests/python/method_keyword_refusals.py: the positional-only str and set
	methods and bytes.replace refuse any keyword in their type's name, and
	str.expandtabs takes its tabsize by name.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'method_keyword_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_keyword_refusals.py')
		name: 'method_keyword_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
