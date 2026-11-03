Class {
	#name : 'CallStarArgumentMustBeIterableTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CallStarArgumentMustBeIterableTestCase >> testALoneSplatThatIsNotIterableIsRefusedNamingTheCallee [
	"tests/python/call_star_argument_must_be_iterable.py: a call whose
	positional arguments are one ``*x'' refuses a non-iterable x naming the
	callee -- ``mod.h()'', or ``dir()'' for a builtin -- while any other shape,
	and a display, says ``Value after *''.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'call_star_argument_must_be_iterable' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/call_star_argument_must_be_iterable.py')
		name: 'call_star_argument_must_be_iterable'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
