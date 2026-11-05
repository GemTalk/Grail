Class {
	#name : 'AFailingPrepareLookupIsRaisedTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AFailingPrepareLookupIsRaisedTestCase >> testAPrepareDescriptorThatRaisesFailsTheClassStatement [
	"tests/python/a_failing_prepare_lookup_is_raised.py: a metaclass whose
	__prepare__ descriptor raises fails the class statement with that
	exception, one raising AttributeError reads as no __prepare__, and a
	metaclass without one or with a real one builds the class as before.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_failing_prepare_lookup_is_raised' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_failing_prepare_lookup_is_raised.py')
		name: 'a_failing_prepare_lookup_is_raised'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
