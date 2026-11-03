Class {
	#name : 'ContextvarsReprsAndRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ContextvarsReprsAndRefusalsTestCase >> testContextvarsReprsAndRefusesAsCPythonDoes [
	"tests/python/contextvars_reprs_and_refusals.py: Context, ContextVar and
	Token repr themselves, compare, refuse bad arguments and keys, refuse a
	reset in CPython's order and words, are final, and Context is a Mapping.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'contextvars_reprs_and_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/contextvars_reprs_and_refusals.py')
		name: 'contextvars_reprs_and_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
