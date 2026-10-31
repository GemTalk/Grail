Class {
	#name : 'MethodAnnotationClassScopeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MethodAnnotationClassScopeTestCase >> testMethodAnnotationsReadTheClassNamespaceFirst [
	"tests/python/method_annotation_class_scope.py: a method's annotations
	look a free name up in its defining class's namespace before the enclosing
	function, the module and builtins -- a nested class defined after the
	method, one named like a builtin, a sibling def, a class attribute over an
	enclosing local, through a subclass too -- and an enclosing local they read
	unbound is a free variable.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'method_annotation_class_scope' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_annotation_class_scope.py')
		name: 'method_annotation_class_scope'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
