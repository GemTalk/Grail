Class {
	#name : 'GenericAliasSubclassConstructionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GenericAliasSubclassConstructionTestCase >> testSubclassOfGenericAliasConstructsAnAlias [
	"tests/python/genericalias_subclass_construction.py: a Python subclass of
	types.GenericAlias with no __new__ of its own builds an alias from origin
	and arguments, refusing CPython's way any other arity or a keyword; one
	with a __new__ builds through GenericAlias.__new__, which refuses the
	keywords a subclass forwards.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'genericalias_subclass_construction' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/genericalias_subclass_construction.py')
		name: 'genericalias_subclass_construction'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
