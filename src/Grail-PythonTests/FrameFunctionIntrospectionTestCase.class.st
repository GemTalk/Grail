Class {
	#name : 'FrameFunctionIntrospectionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FrameFunctionIntrospectionTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
FrameFunctionIntrospectionTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
FrameFunctionIntrospectionTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/frame_function_introspection.py'
		name: 'frame_function_introspection'

]

{ #category : 'Grail-Tests' }
FrameFunctionIntrospectionTestCase >> testCoVarnamesAndGetargs [

	self assertAll: #('co_varnames_parameters' 'co_varnames_method' 'getargs'
		'getargs_method' 'getargs_static' 'getargs_refuses_non_code'
		'compiled_module_code_varnames' 'module_frame_varnames_and_getargs'
		'replace_keeps_varnames')

]

{ #category : 'Grail-Tests' }
FrameFunctionIntrospectionTestCase >> testCoVarnamesOmitsBodyLocals [
	"The pinned difference: CPython continues co_varnames with the body's
	locals; Grail records the parameters only."

	| expected actual |
	expected := (testModule @env1:___pyAttrLoad___: #GRAIL_ONLY)
		@env1:__getitem__: 'co_varnames_with_locals'.
	actual := (testModule @env1:___pyAttrLoad___: #r_grail_only)
		@env1:__getitem__: 'co_varnames_with_locals'.
	self assert: actual asString equals: expected asString

]

{ #category : 'Grail-Tests - coverage' }
FrameFunctionIntrospectionTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 17 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 17

]

{ #category : 'Grail-Tests' }
FrameFunctionIntrospectionTestCase >> testFramesAndLineNumbers [

	self assertAll: #('live_frame_f_locals' 'caller_frame_f_locals'
		'co_firstlineno_is_the_def_line')

]

{ #category : 'Grail-Tests' }
FrameFunctionIntrospectionTestCase >> testModuleFunctionDict [

	self assertAll: #('function_dict_empty' 'function_dict' 'function_dict_is_live'
		'functools_wraps_copies_it' 'pytest_keywords_update')

]
