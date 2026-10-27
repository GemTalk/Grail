Class {
	#name : 'GenericFunctionScopeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
GenericFunctionScopeTestCase >> testAGenericFunctionBindsItsTypeParameters [
	"tests/python/generic_function_scope.py: ``def f[T]()'' returns T from its
	body, sees it in its annotations and its __type_params__, evaluates its
	defaults outside, and recurses through its decorated self; a nonlocal may
	not reach a type parameter.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generic_function_scope' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_function_scope.py')
		name: 'generic_function_scope'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
