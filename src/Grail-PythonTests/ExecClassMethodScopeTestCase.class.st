Class {
	#name : 'ExecClassMethodScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ExecClassMethodScopeTestCase >> setUp [
	"Reload tests/python/exec_class_method_scope.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_class_method_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/exec_class_method_scope.py')
		name: 'exec_class_method_scope'.

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testAClassBodyValueReadingTheScopeStillWorks [
	"A class BODY could always read exec-level names -- it is emitted inline
	into the doit, not compiled as a method.  Pins that the change left that
	path alone."

	self assert: testModule @env1:a_class_body_value_reading_the_scope_still_works asArray
		equals: #( 6 ).

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testAMissingNameStillRaisesNameError [
	"Putting the scope on the symbol list must not turn an unbound name into a
	compile failure or a silent nil.  It is still a Python NameError, raised
	when the method RUNS -- which is also what tells the two apart: the old
	behaviour raised at the first call of ANY method mentioning an exec-level
	name, bound or not."

	self assert: testModule @env1:a_missing_name_still_raises_name_error asArray
		equals: #( 'NameError' ).

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testMethodCallsAnExecLevelFunction [
	"A function the same source bound is the same kind of name -- nothing
	about the fix is specific to variables."

	self assert: testModule @env1:method_calls_an_exec_level_function asArray
		equals: #( 12 ).

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testMethodReadsAnExecLevelVariable [
	"THE BUG, at its smallest.  Before: the call raised the codegen-gap
	NameError, because ``get'' had never compiled."

	self assert: testModule @env1:method_reads_an_exec_level_variable asArray
		equals: #( 12 ).

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testMethodReadsASiblingClass [
	self assert: testModule @env1:method_reads_a_sibling_class asArray
		equals: #( 7 ).

]

{ #category : 'Grail-Tests' }
ExecClassMethodScopeTestCase >> testTheReadIsLiveNotCaptured [
	"The method references the scope SLOT, so rebinding the exec-level name
	after the class is built changes what the next call answers.  A fix that
	baked the value in at compile time would answer 1 twice and still pass
	every other test here."

	self assert: testModule @env1:the_read_is_live_not_captured asArray
		equals: #( 1 2 ).

]
