Class {
	#name : 'ExcepthookPrintsTracebackTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExcepthookPrintsTracebackTestCase >> testExcepthookPrintsTheTracebackToStderr [
	"tests/python/excepthook_prints_traceback.py: sys.excepthook and
	sys.__excepthook__ print the exception, its chain and its traceback to
	sys.stderr, put a handed-in traceback on an exception that has none, and
	print nothing when sys.stderr is None.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'excepthook_prints_traceback' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/excepthook_prints_traceback.py')
		name: 'excepthook_prints_traceback'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
