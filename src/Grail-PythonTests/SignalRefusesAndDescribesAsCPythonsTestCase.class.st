Class {
	#name : 'SignalRefusesAndDescribesAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SignalRefusesAndDescribesAsCPythonsTestCase >> testSignalRefusesDescribesAndTakesAWakeupFdAsCPythonsDoes [
	"tests/python/signal_refuses_and_describes_as_cpythons.py: signal refuses a
	number out of range, a handler that is no callable or constant, and
	SIGKILL; strsignal describes; set_wakeup_fd refuses a closed descriptor
	and answers the one it replaces.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'signal_refuses_and_describes_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signal_refuses_and_describes_as_cpythons.py')
		name: 'signal_refuses_and_describes_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
