Class {
	#name : 'MixinClassAttributePrecedenceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MixinClassAttributePrecedenceTestCase >> testAMixinsClassAttributeOutranksTheDeeperBaseBehindIt [
	"tests/python/mixin_class_attribute_precedence.py: a class attribute a mixin
	and the deeper base it precedes both bind reads as the mixin's, off the
	class, an instance and a subclass; the class's own binding still wins; an
	ancestor the deeper chain shares comes after it, as C3 has it; and the copy
	is not listed as the class's own.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'mixin_class_attribute_precedence' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mixin_class_attribute_precedence.py')
		name: 'mixin_class_attribute_precedence'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
