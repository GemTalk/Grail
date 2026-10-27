Class {
	#name : 'TypeParamEvaluateFunctionsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeParamEvaluateFunctionsTestCase >> testTypeParamsExposeEvaluateFunctionsAndRetryLazyValues [
	"tests/python/type_param_evaluate_functions.py: type parameters and aliases answer
	evaluate_bound, evaluate_constraints, evaluate_default and evaluate_value
	as attributes -- the lazy function, a _ConstEvaluator, or None -- and a
	lazy value that raised is evaluated again on the next read; a plain type
	statement makes a typing.TypeAliasType.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_param_evaluate_functions' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_evaluate_functions.py')
		name: 'type_param_evaluate_functions'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '10 checks, 0 disagreeing [], keys match: True'

]
