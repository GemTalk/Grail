Class {
	#name : 'ClassBodyCallableBindsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyCallableBindsTestCase >> assertAll: names [

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
ClassBodyCallableBindsTestCase >> setUp [

	importlib @env1:modules removeKey: #'class_body_callable_binds' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_callable_binds.py')
		name: 'class_body_callable_binds'

]

{ #category : 'Grail-Tests' }
ClassBodyCallableBindsTestCase >> testAssignedFunctionsBindSelf [
	"object >> ___instanceClassAttrGet___: asks ___isDescriptorCallable___:, as
	the holder path does, instead of binding an UnboundMethod alone."

	self assertAll: #('lambda_binds' 'lambda_default_binds'
		'lambda_default_takes_the_argument' 'lambda_star_receives_self'
		'module_def_binds' 'module_def_takes_the_argument' 'wraps_result_binds'
		'lru_cache_wrapper_binds' 'other_class_method_binds'
		'bound_self_is_the_instance' 'class_read_stays_a_function'
		'assigned_after_the_class_binds_too')

]

{ #category : 'Grail-Tests' }
ClassBodyCallableBindsTestCase >> testWhatCPythonLeavesUnboundStaysUnbound [
	"A staticmethod, a builtin function and a bound method are not function
	descriptors; ElementTree's iterparse stores a generator's bound __next__.
	A Grail stdlib function may stand in for a C builtin
	(object >> ___grailMayStandInForABuiltin___:)."

	self assertAll: #('staticmethod_does_not_bind' 'builtin_does_not_bind'
		'stdlib_builtin_does_not_bind'
		'bound_method_does_not_rebind' 'data_is_data'
		'bound_dunder_next_does_not_rebind')

]
