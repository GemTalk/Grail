Class {
	#name : 'AttributeDundersRefuseANonStrNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AttributeDundersRefuseANonStrNameTestCase >> testAttributeDundersRefuseANameThatIsNoStr [
	"tests/python/attribute_dunders_refuse_a_non_str_name.py: object's and
	type's __getattribute__, __setattr__ and __delattr__ raise TypeError,
	``attribute name must be string'', for a name that is no str, and store
	nothing; a str and a str subclass still get, set and delete.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'attribute_dunders_refuse_a_non_str_name' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_dunders_refuse_a_non_str_name.py')
		name: 'attribute_dunders_refuse_a_non_str_name'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
