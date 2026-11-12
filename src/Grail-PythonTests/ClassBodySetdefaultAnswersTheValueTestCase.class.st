Class {
	#name : 'ClassBodySetdefaultAnswersTheValueTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassBodySetdefaultAnswersTheValueTestCase >> testEachCallAnswersAsCPythonsDoes [

	"tests/python/class_body_setdefault_answers_the_value.py: a class body's
	vars().setdefault answers the value the namespace holds for the name, not
	None.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'class_body_setdefault_answers_the_value' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_setdefault_answers_the_value.py'
		name: 'class_body_setdefault_answers_the_value'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
