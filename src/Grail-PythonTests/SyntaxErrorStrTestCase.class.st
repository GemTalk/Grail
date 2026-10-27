Class {
	#name : 'SyntaxErrorStrTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SyntaxErrorStrTestCase >> testStrOfASyntaxErrorIsTheMessageFileAndLine [
	"tests/python/syntax_error_str.py: ``str(e)'' is ``msg (file, line N)''
	with the file's basename, or whichever of the two is known, or the
	message alone -- for a SyntaxError built directly, one raised by the
	parser, and its subclasses.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'syntax_error_str' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/syntax_error_str.py')
		name: 'syntax_error_str'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
