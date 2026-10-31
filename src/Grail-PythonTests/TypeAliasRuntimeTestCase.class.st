Class {
	#name : 'TypeAliasRuntimeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeAliasRuntimeTestCase >> testTypeAliasesBehaveAsTypevarobjectHasThem [
	"tests/python/type_alias_runtime.py: TypeAliasType checks its parameters'
	default order, it and the type-variable types are immutable, an alias
	unpacks, and its lazy value reads an unbound enclosing local as a free
	variable and an exec's globals through the mapping.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_alias_runtime' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_alias_runtime.py')
		name: 'type_alias_runtime'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
