Class {
	#name : 'ContextvarTokenIsAContextManagerTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ContextvarTokenIsAContextManagerTestCase >> testWithTheTokenScopesTheValueToTheBlock [
	"tests/python/contextvar_token_is_a_context_manager.py: ``with
	var.set(x)'' answers the token and resets the variable when the block is
	left, by an exception too, and the token then resets no more.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'contextvar_token_is_a_context_manager' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/contextvar_token_is_a_context_manager.py')
		name: 'contextvar_token_is_a_context_manager'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
