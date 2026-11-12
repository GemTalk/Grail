Class {
	#name : 'DoitLastLineKeepsItsLastCharacterTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DoitLastLineKeepsItsLastCharacterTestCase >> testEachFrameLineIsEmptyOrWhole [

	"tests/python/doit_last_line_keeps_its_last_character.py: a traceback's source
	line for code compiled under a name not on disk is empty, as CPython's is, or
	the whole recorded line, never one cut short on a last line with no newline
	(#1982).  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'doit_last_line_keeps_its_last_character' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/doit_last_line_keeps_its_last_character.py'
		name: 'doit_last_line_keeps_its_last_character'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
