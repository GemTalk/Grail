Class {
	#name : 'ASurrogateStrIsNoNumberTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ASurrogateStrIsNoNumberTestCase >> testAStrHoldingLoneSurrogatesIsAMalformedNumber [
	"tests/python/a_surrogate_str_is_no_number.py: int(), int(s, base),
	float() and complex() of a str holding lone surrogates raise CPython's
	ValueError for a malformed literal, not the TypeError for a non-str.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_surrogate_str_is_no_number' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_surrogate_str_is_no_number.py')
		name: 'a_surrogate_str_is_no_number'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
