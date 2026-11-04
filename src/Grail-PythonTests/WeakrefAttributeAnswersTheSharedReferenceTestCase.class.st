Class {
	#name : 'WeakrefAttributeAnswersTheSharedReferenceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
WeakrefAttributeAnswersTheSharedReferenceTestCase >> testWeakrefAttributeAnswersTheReferenceEveryCallbackLessWeakrefRefShares [
	"tests/python/weakref_attribute_answers_the_shared_reference.py: every
	weakref.ref(x) without a callback answers one shared reference while it
	lives, and x.__weakref__ -- read as an attribute or through the slot's
	descriptor -- answers it, None before there is one; a callback or a
	subclass makes a reference of its own, and sharing keeps no referent
	alive.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'weakref_attribute_answers_the_shared_reference' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/weakref_attribute_answers_the_shared_reference.py')
		name: 'weakref_attribute_answers_the_shared_reference'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
