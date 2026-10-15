Class {
	#name : 'ObjectNewArgsAndSurrogateWarningsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ObjectNewArgsAndSurrogateWarningsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ObjectNewArgsAndSurrogateWarningsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ObjectNewArgsAndSurrogateWarningsTestCase >> setUp [

	importlib @env1:modules removeKey: #'object_new_args_and_surrogate_warnings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/object_new_args_and_surrogate_warnings.py')
		name: 'object_new_args_and_surrogate_warnings'

]

{ #category : 'Grail-Tests - pins' }
ObjectNewArgsAndSurrogateWarningsTestCase >> testAbstractPropertyAndReadOnlyMessage [

	self assertAll: #('an_abstract_property_makes_the_class_abstract'
		'a_read_only_property_names_the_class_by_qualname')

]

{ #category : 'Grail-Tests - surrogates' }
ObjectNewArgsAndSurrogateWarningsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7

]

{ #category : 'Grail-Tests - object' }
ObjectNewArgsAndSurrogateWarningsTestCase >> testOnlyObjectsInitAndNewRejectArguments [

	self assertAll: #('only_a_class_with_object_s_init_and_new_rejects_arguments')

]

{ #category : 'Grail-Tests - object' }
ObjectNewArgsAndSurrogateWarningsTestCase >> testThePropertyTypeIsBuiltinsProperty [

	self assertAll: #('the_property_type_is_builtins_property')

]

{ #category : 'Grail-Tests - surrogates' }
ObjectNewArgsAndSurrogateWarningsTestCase >> testWarningsKeepALoneSurrogate [

	self assertAll: #('formatwarning_keeps_a_lone_surrogate'
		'showwarning_writes_a_lone_surrogate_to_its_file'
		'a_lone_surrogate_message_warns_and_is_filtered')

]
