Class {
	#name : 'SysHooksCheckTheirArgumentsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysHooksCheckTheirArgumentsTestCase >> testTheHooksTakeTheArgumentsAndReportTheLossesCPythonDoes [
	"tests/python/sys_hooks_check_their_arguments.py: sys.displayhook and
	sys.excepthook refuse a wrong argument count or a keyword with CPython's
	messages, displayhook and a 'single'-mode expression report a lost
	sys.stdout or sys.displayhook as RuntimeError, and excepthook prints one
	line for a value that is not an exception.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_hooks_check_their_arguments' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_hooks_check_their_arguments.py')
		name: 'sys_hooks_check_their_arguments'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
