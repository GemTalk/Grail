Class {
	#name : 'ReboundDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ReboundDefaultsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ReboundDefaultsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ReboundDefaultsTestCase >> setUp [

	importlib @env1:modules removeKey: #'rebound_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rebound_defaults.py')
		name: 'rebound_defaults'

]

{ #category : 'Grail-Tests - methods' }
ReboundDefaultsTestCase >> testARebuiltClassIsRebindableAgain [
	"Loading the fixture again in the same session rebuilds its classes in
	place (they are canonical), recompiling ``_m:kw:'' -- which displaces the
	first load's session entry point while its record survives.  The record is
	recognised as stale and dropped, so the second load's writes rebind afresh
	rather than updating a record nothing reads.  Measured: without that,
	a_methods_new_defaults_bind_however_it_is_called failed on every load after
	the first."

	importlib @env1:modules removeKey: #'rebound_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/rebound_defaults.py')
		name: 'rebound_defaults'.
	(self results @env1:keys) @env0:do: [:name |
		self assert: (self results @env1:__getitem__: name) == true
			description: 'second load: ' , name asString]

]

{ #category : 'Grail-Tests - module functions' }
ReboundDefaultsTestCase >> testCallSitesAndCallers [

	self assertAll: #('a_call_compiled_in_the_same_module_binds'
		'the_callers_keyword_dict_is_untouched')

]

{ #category : 'Grail-Tests - module functions' }
ReboundDefaultsTestCase >> testDefaultsAddedOrRemovedBind [

	self assertAll: #('defaults_added_to_a_def_that_had_none_bind'
		'later_writes_of_any_shape_take_effect' 'defaults_set_to_none_stop_binding'
		'too_many_positional_names_the_new_range'
		'deleting_defaults_stops_binding_and_reads_none')

]

{ #category : 'Grail-Tests - methods' }
ReboundDefaultsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 17

]

{ #category : 'Grail-Tests - module functions' }
ReboundDefaultsTestCase >> testEveryParameterKindBinds [

	self assertAll: #('keyword_only_defaults_added_mutated_and_removed'
		'positional_only_parameters_take_their_defaults' 'a_varargs_def_takes_new_defaults'
		'a_longer_tuple_supplies_the_last_parameters'
		'keywords_mix_with_new_defaults_and_every_missing_one_is_named')

]

{ #category : 'Grail-Tests - methods' }
ReboundDefaultsTestCase >> testMethodsRebind [

	self assertAll: #('a_methods_new_defaults_bind_however_it_is_called'
		'a_methods_defaults_set_to_none_stop_binding'
		'a_subclass_shares_the_function_and_an_override_keeps_its_own'
		'the_method_is_still_a_bound_method' 'a_methods_keyword_only_defaults_bind')

]
