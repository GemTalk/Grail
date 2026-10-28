Class {
	#name : 'ExceptionProtocolRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExceptionProtocolRefusalsTestCase >> testExceptionsRefuseABadNoteStateLocationOrHandler [
	"tests/python/exception_protocol_refusals.py: add_note refuses a non-str
	note and a non-list __notes__, __setstate__ a non-dict state, SyntaxError a
	location of the wrong shape, and an except tuple a member that is not an
	exception class -- each a TypeError, where Grail died uncatchably or
	accepted it.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exception_protocol_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_protocol_refusals.py')
		name: 'exception_protocol_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
