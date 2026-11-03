Class {
	#name : 'TypePassesToTheWinningMetaclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypePassesToTheWinningMetaclassTestCase >> testTypeCallRunsTheWinningMetaclass [
	"tests/python/type_passes_to_the_winning_metaclass.py: type(name, bases,
	ns), literal or not, over a base whose metaclass has its own __new__ or
	__init__ runs them, class keywords included, and a raising __new__
	raises; a metaclass that overrides neither, and a direct metaclass call,
	are unchanged.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_passes_to_the_winning_metaclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_passes_to_the_winning_metaclass.py')
		name: 'type_passes_to_the_winning_metaclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]
