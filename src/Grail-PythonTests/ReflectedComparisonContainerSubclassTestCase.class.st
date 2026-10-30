Class {
	#name : 'ReflectedComparisonContainerSubclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReflectedComparisonContainerSubclassTestCase >> testABuiltinComparisonReflectsToAContainerSubclassDunder [
	"tests/python/reflected_comparison_container_subclass.py: an int, float,
	str or tuple on the left of a comparison with a Python subclass of list or
	dict runs that subclass's reflected dunder, for the orderings and for
	== and !=, while a subclass with no dunder of its own, or a pair both
	sides decline, is still refused.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'reflected_comparison_container_subclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reflected_comparison_container_subclass.py')
		name: 'reflected_comparison_container_subclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
