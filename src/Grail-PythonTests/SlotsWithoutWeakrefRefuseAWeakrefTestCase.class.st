Class {
	#name : 'SlotsWithoutWeakrefRefuseAWeakrefTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SlotsWithoutWeakrefRefuseAWeakrefTestCase >> testAnObjectWithoutAWeakrefSlotRefusesAWeakReference [
	"tests/python/slots_without_weakref_refuse_a_weakref.py: an instance of a
	class whose __slots__, and whose bases', grant no __weakref__ refuses
	weakref.ref, a WeakSet and a WeakValueDictionary in CPython's words, while
	a class without __slots__ or one naming __weakref__ grants one.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'slots_without_weakref_refuse_a_weakref' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slots_without_weakref_refuse_a_weakref.py')
		name: 'slots_without_weakref_refuse_a_weakref'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
