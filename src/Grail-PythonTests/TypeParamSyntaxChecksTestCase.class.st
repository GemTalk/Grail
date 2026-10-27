Class {
	#name : 'TypeParamSyntaxChecksTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeParamSyntaxChecksTestCase >> testATypeParameterListRefusesWhatCPythonRefuses [
	"tests/python/type_param_syntax_checks.py: a non-default parameter after a
	default one, a starred default on a TypeVar or ParamSpec, and a bound or
	constraints on a ParamSpec or TypeVarTuple are SyntaxErrors with CPython's
	messages and columns; valid lists still compile.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_param_syntax_checks' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_syntax_checks.py')
		name: 'type_param_syntax_checks'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
