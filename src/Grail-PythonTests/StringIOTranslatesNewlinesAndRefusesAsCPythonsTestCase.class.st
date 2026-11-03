Class {
	#name : 'StringIOTranslatesNewlinesAndRefusesAsCPythonsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StringIOTranslatesNewlinesAndRefusesAsCPythonsTestCase >> testStringIOTranslatesNewlinesAndRefusesAsCPythonsDoes [
	"tests/python/stringio_translates_newlines_and_refuses_as_cpythons.py:
	io.StringIO translates newlines and splits lines as each newline argument
	says, reports the endings it saw, takes its sizes through __index__,
	refuses what stringio.c refuses in its words, answers TextIOBase's
	properties, restarts on __init__ and pickles through a 4-item state.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'stringio_translates_newlines_and_refuses_as_cpythons' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stringio_translates_newlines_and_refuses_as_cpythons.py')
		name: 'stringio_translates_newlines_and_refuses_as_cpythons'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '17 checks, 0 disagreeing [], keys match: True'

]
