Class {
	#name : 'TracebackFrameReachesItsCallersTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TracebackFrameReachesItsCallersTestCase >> testTracebackFramesReachTheirCallersAsCPythonsDo [
	"tests/python/traceback_frame_reaches_its_callers.py: a traceback's
	catching frame walks out to its callers and reports the handler's line
	while the handler runs, an inner frame's f_back is the entry outside it,
	another thread's handled exception (sys._current_exceptions) and blocked
	stack (sys._current_frames) reach that thread's callers, and a handler in
	the function that raised reports its own line.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'traceback_frame_reaches_its_callers' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/traceback_frame_reaches_its_callers.py')
		name: 'traceback_frame_reaches_its_callers'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
