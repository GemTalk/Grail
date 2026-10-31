Class {
	#name : 'ExecGlobalAndComprehensionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExecGlobalAndComprehensionTestCase >> testExecdCodeWritesGlobalsAndKeepsComprehensionTargets [
	"tests/python/exec_global_and_comprehension.py: in code an exec() compiled,
	``global x; x = v'' reaches the namespace the exec was handed even when it
	runs after the exec returned, and a comprehension's iteration variable is
	its own, not an enclosing binding read through the class's cell.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exec_global_and_comprehension' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_global_and_comprehension.py')
		name: 'exec_global_and_comprehension'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
