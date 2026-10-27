Class {
	#name : 'ExecAnnotationsNamespaceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ExecAnnotationsNamespaceTestCase >> testExecBindsTheAnnotateFunctionInItsNamespace [
	"tests/python/exec_annotations_namespace.py: exec() binds __annotate__ in
	the namespace of the code it runs -- the locals mapping when it is given
	one -- or, under the annotations future import, the __annotations__ dict
	of source strings, and the annotations evaluate only when read.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'exec_annotations_namespace' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_annotations_namespace.py')
		name: 'exec_annotations_namespace'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
