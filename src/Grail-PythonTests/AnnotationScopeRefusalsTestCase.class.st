Class {
	#name : 'AnnotationScopeRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AnnotationScopeRefusalsTestCase >> testAnAnnotationRefusesYieldAwaitAndNamedExpressions [
	"tests/python/annotation_scope_refusals.py: a parameter's, a return's, a
	module's, a class's and a local variable's annotation refuse a yield, an
	await and a named expression, with CPython's messages; a lambda or a
	comprehension inside one keeps its own rules.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'annotation_scope_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/annotation_scope_refusals.py')
		name: 'annotation_scope_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
