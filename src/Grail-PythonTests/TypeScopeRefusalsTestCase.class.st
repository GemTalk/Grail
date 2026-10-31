Class {
	#name : 'TypeScopeRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeScopeRefusalsTestCase >> testPep695ScopesRefuseYieldAwaitAndNamedExpressions [
	"tests/python/type_scope_refusals.py: a type alias's value, a TypeVar's
	bound, constraints or default, and a generic class's bases refuse a yield,
	an await and a named expression with CPython's message and location, a
	named expression in a comprehension there too; a lambda stays legal, and a
	type statement is a simple statement.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_scope_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_scope_refusals.py')
		name: 'type_scope_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
