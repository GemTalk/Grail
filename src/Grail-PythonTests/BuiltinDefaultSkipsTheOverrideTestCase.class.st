Class {
	#name : 'BuiltinDefaultSkipsTheOverrideTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
BuiltinDefaultSkipsTheOverrideTestCase >> testEachOverrideRunsOnceAsInCPython [

	"tests/python/builtin_default_skips_the_override.py: a Python subclass of
	a built-in overrides a method and calls the base with fewer arguments, and
	the base answers without sending the override back to itself (#1393).
	Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'builtin_default_skips_the_override' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/builtin_default_skips_the_override.py'
		name: 'builtin_default_skips_the_override'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '40 checks, 0 disagreeing [], keys match: True'

]
