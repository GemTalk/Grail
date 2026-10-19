Class {
	#name : 'KwargsSplatDictSubclassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
KwargsSplatDictSubclassTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
KwargsSplatDictSubclassTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
KwargsSplatDictSubclassTestCase >> setUp [

	importlib @env1:modules removeKey: #'kwargs_splat_dict_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/kwargs_splat_dict_subclass.py')
		name: 'kwargs_splat_dict_subclass'

]

{ #category : 'Grail-Tests - OrderedDict' }
KwargsSplatDictSubclassTestCase >> testACalleesPopLeavesTheCallersOrderedDictAlone [

	self assertAll: #('an_ordered_dicts_kwargs_is_a_plain_dict'
		'a_pop_in_the_callee_leaves_the_caller_alone' 'the_same_ordered_dict_splats_again'
		'a_classmethod_pops_from_the_same_rule_twice')

]

{ #category : 'Grail-Tests - other subclasses' }
KwargsSplatDictSubclassTestCase >> testAnyDictSubclassGivesAPlainDict [

	self assertAll: #('a_dict_subclasss_kwargs_is_its_own_plain_dict'
		'a_counter_and_a_defaultdict_give_plain_dicts')

]

{ #category : 'Grail-Tests - unchanged' }
KwargsSplatDictSubclassTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 11

]

{ #category : 'Grail-Tests - other subclasses' }
KwargsSplatDictSubclassTestCase >> testOnlyAnIterOverrideIsReadThroughKeys [

	self assertAll: #('keys_without_iter_is_not_consulted'
		'an_iter_override_reads_keys_and_getitem')

]

{ #category : 'Grail-Tests - unchanged' }
KwargsSplatDictSubclassTestCase >> testPlainAndMixedSplatsAreUnchanged [

	self assertAll: #('a_plain_dicts_kwargs_is_still_a_copy' 'mixed_with_named_keywords_too')

]

{ #category : 'Grail-Tests - OrderedDict' }
KwargsSplatDictSubclassTestCase >> testTheKwargsKeepTheOrderedDictsOrder [

	self assertAll: #('the_kwargs_keep_the_ordered_dicts_order')

]
