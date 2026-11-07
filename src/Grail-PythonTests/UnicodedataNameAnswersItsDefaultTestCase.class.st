Class {
	#name : 'UnicodedataNameAnswersItsDefaultTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodedataNameAnswersItsDefaultTestCase >> testANoneDefaultIsAnsweredForAnUnnamedCharacter [

	"tests/python/unicodedata_name_answers_its_default.py: unicodedata.name
	answers the default it is given for a character without a name, None too,
	raises only when none is given, and takes at most two arguments.  Each
	check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicodedata_name_answers_its_default' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicodedata_name_answers_its_default.py')
		name: 'unicodedata_name_answers_its_default'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
