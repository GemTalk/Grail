Class {
	#name : 'UnicodedataRefusesANonCharacterTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodedataRefusesANonCharacterTestCase >> testEachRefusalAnswersAsCPythonsDoes [

	"tests/python/unicodedata_refuses_a_non_character.py: unicodedata.name and
	its siblings refuse anything but a one-character str with Argument Clinic's
	TypeError, naming None as None.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicodedata_refuses_a_non_character' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/unicodedata_refuses_a_non_character.py'
		name: 'unicodedata_refuses_a_non_character'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
