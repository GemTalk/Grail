Class {
	#name : 'MetaclassProtocolsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
MetaclassProtocolsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
MetaclassProtocolsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
MetaclassProtocolsTestCase >> setUp [

	importlib @env1:modules removeKey: #'metaclass_protocols' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_protocols.py')
		name: 'metaclass_protocols'

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testAMetaclassMayRewriteTheBases [

	self assertAll: #('type_new_builds_the_bases_the_metaclass_passes'
		'a_typeddict_is_a_dict_subclass'
		'a_generic_typeddict_through_its_second_base'
		'a_namedtuple_is_a_tuple_subclass'
		'a_namedtuple_method_calls_its_sibling')

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testCallingAMetaclass [

	self assertAll: #('a_metaclass_call_builds_a_class'
		'a_metaclass_call_refuses_the_wrong_arity'
		'an_assigned_metaclass_call_is_not_bound')

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testClassReadsFollowTheMro [

	self assertAll: #('an_inherited_method_is_the_same_object'
		'a_subclass_def_beats_a_base_assignment'
		'a_protocol_refuses_and_a_subclass_constructs'
		'pprint_keeps_dict_and_defaultdict_apart')

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testCPythonsRefusals [

	self assertAll: #('typing_types_refuse_subclassing'
		'pattern_aliases_are_named_after_re'
		'a_function_type_is_callable')

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testEveryFixtureCheckIsAsserted [
	"The six tests above name 19 checks, one per check the fixture makes; a
	check added there without a test here changes the count."

	self assert: (self results @env1:__len__) equals: 19

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testTheMetaclassComesFromEveryBase [

	self assertAll: #('a_second_base_supplies_the_metaclass'
		'a_builtin_base_implements_the_abstract_methods'
		'super_instancecheck_from_a_metaclass')

]

{ #category : 'Grail-Tests' }
MetaclassProtocolsTestCase >> testTheNamespaceAMetaclassIsHanded [

	self assertAll: #('the_namespace_starts_with_module_and_qualname')

]
