Class {
	#name : 'DefDefaultsScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
DefDefaultsScopeTestCase >> setUp [
	"Reload tests/python/def_defaults_scope.py fresh each test -- one of the
	fixtures rebinds a module global to prove definition-time evaluation."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'def_defaults_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/def_defaults_scope.py')
		name: 'def_defaults_scope'.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testALambdaInADefOverAModuleGlobal [
	"The lambda half of the same emit, over a module global rather than an
	enclosing local -- the case LambdaDefaultsTestCase does not reach, since
	the rule was already right for lambdas over enclosing locals."

	self assert: testModule @env1:a_lambda_in_a_def_over_a_module_global
		equals: 7.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testAMutableDefaultIsStillShared [
	"The same list across calls -- the property the definition-time emit exists
	to preserve, and the one a naive ``re-evaluate the default per call'' fix
	would lose."

	self assert: testModule @env1:a_mutable_default_is_still_shared asArray
		equals: #( 1 2 3 ).

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testAnOrdinaryDefaultIsUnaffected [
	"A default naming something the function does not bind takes the path it
	always did."

	self assert: testModule @env1:an_ordinary_default_is_unaffected
		equals: 'h3'.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testClassBodyMethodDefaults [
	"A class-body method's default is emitted INLINE -- a third emit path with
	the same rule.  The third element passes the parameter explicitly, so the
	body's own binding is pinned here too."

	self assert: testModule @env1:class_body_method_defaults asArray
		equals: #( 7 'h5' 42 ).

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testDefaultsAreEvaluatedAtDefinitionTime [
	"A default is evaluated ONCE, when the def executes, so rebinding the name
	afterwards does not change it."

	self assert: testModule @env1:defaults_are_evaluated_at_definition_time
		equals: 7.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testModuleLevelCallableDefault [
	"The shape that matters in practice -- the idiom exists to make a
	module-level function a local lookup, so the None was CALLED rather than
	merely read.  That is copy.py's ``deepcopy=deepcopy''."

	self assert: (testModule @env1:module_level_callable: 0) equals: 'h0'.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testModuleLevelDefault [
	"THE BUG, simplest form.  Grail answered None: the default read the very
	parameter it was about to bind."

	self assert: (testModule @env1:module_level: 0) equals: 7.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testNestedDefOverAModuleGlobal [
	"THE COMPILE ERROR.  The default is hoisted into a definition-time block
	OUTSIDE the nested def, where the name is a module attribute rather than a
	temp; emitting a bare identifier there failed to compile and took the whole
	module with it -- so this fixture could not be imported at all."

	self assert: testModule @env1:nested_def_over_a_module_global equals: 7.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testNestedDefOverAnEnclosingLocal [
	"THE OTHER HALF, and the reason the rule is per-scope rather than a blanket
	``defaults resolve at module scope''.  The walk skips only the scope it
	climbed out of, so an enclosing FUNCTION's local still claims the name."

	self assert: testModule @env1:nested_def_over_an_enclosing_local
		equals: 'enclosing'.

]

{ #category : 'Grail-Tests' }
DefDefaultsScopeTestCase >> testTheBodyStillReadsTheParameter [
	"Only the DEFAULT escapes the function's scope.  A fix that routed every
	mention of the name to the enclosing scope would pass the test above and
	break this one."

	self assert: (testModule @env1:the_body_still_reads_the_parameter: 0)
		equals: 7.

]
