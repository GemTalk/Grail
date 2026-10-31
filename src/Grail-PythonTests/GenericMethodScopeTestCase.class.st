Class {
	#name : 'GenericMethodScopeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GenericMethodScopeTestCase >> testGenericMethodsBindTheirTypeParameters [
	"tests/python/generic_method_scope.py: a generic method's type parameters
	are bound for its annotations, bounds and body, its bounds see the class
	namespace and the enclosing function, and it still behaves as a method --
	zero-argument super(), decorators, dunders, private names, signature --
	in a class defined in a function too.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generic_method_scope' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_method_scope.py')
		name: 'generic_method_scope'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
