Class {
	#name : 'FunctionAnnotationOrderTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
FunctionAnnotationOrderTestCase >> testAFunctionsAnnotationsListItsParametersInCPythonsOrder [
	"tests/python/function_annotation_order.py: __annotations__ lists the
	regular parameters, then the positional-only ones, then *args, the
	keyword-only ones, **kwargs and the return, as CPython does.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'function_annotation_order' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_annotation_order.py')
		name: 'function_annotation_order'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
