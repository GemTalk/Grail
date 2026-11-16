Class {
	#name : 'FramesInExceptTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Frames' }
FramesInExceptTestCase >> testTheLiveStackStartsAtTheHandlingFunction [
	"tests/python/frames_in_except.py: inside an except body, sys._getframe(),
	traceback.extract_stack(), warnings' stacklevel and logging's caller all
	start at the function whose except is running, as in CPython -- not at
	the function that raised, whose frames a Smalltalk handler still runs on
	top of.  Covers the first handler tried, one reached past non-matching
	excepts, a nested except, __exit__, a finally during the unwind and a
	generator started from an except body.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'frames_in_except' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frames_in_except.py')
		name: 'frames_in_except'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
