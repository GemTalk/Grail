Class {
	#name : 'ReversedIsAClassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReversedIsAClassTestCase >> testReversedIsATypeWhoseCallAnswersAReversedObject [
	"tests/python/reversed_is_a_class.py: reversed is a type named reversed in
	builtins; a tuple, a str, bytes and a user sequence give reversed objects,
	a range, a dict and a class with __reversed__ their own iterators; it
	subclasses; its refusals are CPython's; and a reversed object hints,
	reduces, takes a state and pickles as CPython's does.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'reversed_is_a_class' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reversed_is_a_class.py')
		name: 'reversed_is_a_class'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
