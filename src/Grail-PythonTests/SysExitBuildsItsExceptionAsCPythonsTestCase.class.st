Class {
	#name : 'SysExitBuildsItsExceptionAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysExitBuildsItsExceptionAsCPythonsTestCase >> testSysExitBuildsItsExceptionAsCPythonsDoes [
	"tests/python/sys_exit_builds_its_exception_as_cpythons.py: sys.exit's
	argument becomes the SystemExit as PyErr_SetObject builds it -- None is no
	argument, a tuple is the argument list, a SystemExit is raised itself --
	and a second argument or a keyword is a TypeError.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_exit_builds_its_exception_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_exit_builds_its_exception_as_cpythons.py')
		name: 'sys_exit_builds_its_exception_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
