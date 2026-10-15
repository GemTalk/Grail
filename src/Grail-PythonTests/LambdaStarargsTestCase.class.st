Class {
	#name : 'LambdaStarargsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
LambdaStarargsTestCase >> setUp [
	"Load tests/python/lambda_starargs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'lambda_starargs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/lambda_starargs.py')
		name: 'lambda_starargs'.

]

{ #category : 'Grail-Tests' }
LambdaStarargsTestCase >> testForwarderLambda [
	"``lambda self, *args, **kwargs: self(*args, **kwargs)'' forwards
	all positional + kwarg args to the called sink."

	self assert: testModule @env1:call_forwarder equals: true

]

{ #category : 'Grail-Tests' }
LambdaStarargsTestCase >> testKwargOnlyLambda [
	"``lambda **kw: list(kw.keys())'' — bare **kwargs, no named params."

	self assert: testModule @env1:call_kwarg_only equals: true

]

{ #category : 'Grail-Tests' }
LambdaStarargsTestCase >> testVarargOnlyLambda [
	"``lambda *args: len(args)'' — bare *args, no named params."

	self assert: testModule @env1:call_vararg_only equals: true

]
