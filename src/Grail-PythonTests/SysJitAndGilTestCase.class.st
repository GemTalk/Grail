Class {
	#name : 'SysJitAndGilTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SysJitAndGilTestCase >> testSysHasTheJitModuleAndTheGilProbe [
	"tests/python/sys_jit_and_gil.py: sys._jit is a module named 'sys._jit'
	whose three probes answer bools, and sys._is_gil_enabled() answers True.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sys_jit_and_gil' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_jit_and_gil.py')
		name: 'sys_jit_and_gil'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
