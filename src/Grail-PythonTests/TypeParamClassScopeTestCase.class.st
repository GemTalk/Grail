Class {
	#name : 'TypeParamClassScopeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeParamClassScopeTestCase >> testAnnotationScopesInAClassBodySeeTheClass [
	"tests/python/type_param_class_scope.py: a generic class nested in a class
	body has its Generic base and its own parameters; a type alias's value, a
	nested class's bound and its bases read the class namespace first, then
	the globals, as CPython's annotation scopes do; a class in a class-body
	``if'' reaches the enclosing function's locals.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_param_class_scope' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_class_scope.py')
		name: 'type_param_class_scope'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
