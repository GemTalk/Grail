Class {
	#name : 'TypeParamScopesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
TypeParamScopesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
TypeParamScopesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
TypeParamScopesTestCase >> setUp [

	importlib @env1:modules removeKey: #'type_param_scopes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_param_scopes.py')
		name: 'type_param_scopes'

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testAttributeAndDirNeighbours [

	self assertAll: #('an_annotated_attribute_store_stores'
		'every_name_dir_lists_is_gettable'
		'the_class_dict_names_each_method_once'
		'a_bare_annotation_binds_nothing'
		'getattr_static_raises_for_a_missing_name')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testBoundsAreLazyAndKindsAreRight [

	self assertAll: #('bounds_constraints_and_kinds'
		'a_bound_is_evaluated_lazily')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testCallingANonCallableInstanceIsCatchable [

	self assertAll: #('calling_a_non_callable_instance_is_a_type_error')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testClassParametersAreBoundAndGeneric [

	self assertAll: #('class_params_are_bound_in_the_body'
		'class_params_add_a_generic_base'
		'a_parameterised_class_is_subscriptable'
		'the_scope_function_is_invisible'
		'the_generic_base_follows_positional_bases'
		'a_local_class_keeps_its_qualname'
		'type_params_are_not_inherited'
		'a_parameterised_protocol')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testMetaclassNeighbours [

	self assertAll: #('a_metaclass_repr_may_call_super'
		'a_subclass_of_any_reprs_as_a_class'
		'a_metaclass_keeps_its_classes_init_subclass')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testParameterisedAliases [

	self assertAll: #('a_parameterised_alias'
		'only_a_generic_alias_is_subscriptable'
		'an_alias_value_sees_its_params_and_itself')

]

{ #category : 'Grail-Tests' }
TypeParamScopesTestCase >> testTypeVarModules [

	self assertAll: #('a_typevar_belongs_to_its_module'
		'the_typing_classes_report_typing')

]
