Class {
	#name : 'ExecDefsTakeTheirGlobalsModuleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExecDefsTakeTheirGlobalsModuleTestCase >> testAnExecdFunctionReportsTheModuleItsGlobalsName [
	"tests/python/exec_defs_take_their_globals_module.py: a def, a lambda and a
	def nested in one, exec'd in either mode, take their __module__ from the
	globals' __name__, and their errors name them by it.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exec_defs_take_their_globals_module' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_defs_take_their_globals_module.py')
		name: 'exec_defs_take_their_globals_module'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
