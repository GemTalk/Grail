Class {
	#name : 'RegexWordAndSpaceAreCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RegexWordAndSpaceAreCPythonsTestCase >> testEachClassMatchesWhatCPythonsDoes [

	"tests/python/regex_word_and_space_are_cpythons.py: \w is str.isalnum()
	or '_' and \s is str.isspace(), character by character over the Basic
	Multilingual Plane, as in CPython's _sre.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'regex_word_and_space_are_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/regex_word_and_space_are_cpythons.py'
		name: 'regex_word_and_space_are_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
