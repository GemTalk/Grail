Class {
	#name : 'ClosureCellsSpecialReceiverTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClosureCellsSpecialReceiverTestCase >> testClassBodyDefCalledWithAnIntReachesItsEnclosingVariables [
	"tests/python/closure_cells_special_receiver.py: a class-body def called
	through the class with an int, a bool, None or a float first -- which Grail
	recompiles against that receiver's class -- reads, writes and mutates the
	variables of the function the class is defined in, as one called with any
	other first argument does.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'closure_cells_special_receiver' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/closure_cells_special_receiver.py')
		name: 'closure_cells_special_receiver'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
