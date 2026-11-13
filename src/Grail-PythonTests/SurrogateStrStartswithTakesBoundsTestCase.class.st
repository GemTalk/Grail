Class {
	#name : 'SurrogateStrStartswithTakesBoundsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SurrogateStrStartswithTakesBoundsTestCase >> testEachCallAnswersAsCPythonsDoes [

	"tests/python/surrogate_str_startswith_takes_bounds.py: a str holding lone
	surrogates answers startswith and endswith with a start, an end and a tuple
	as CPython's tailmatch does.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'surrogate_str_startswith_takes_bounds' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/surrogate_str_startswith_takes_bounds.py'
		name: 'surrogate_str_startswith_takes_bounds'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
