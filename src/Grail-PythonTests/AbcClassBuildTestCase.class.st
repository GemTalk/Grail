Class {
	#name : 'AbcClassBuildTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
AbcClassBuildTestCase >> assertAll: names [

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
AbcClassBuildTestCase >> setUp [

	importlib @env1:modules removeKey: #'abc_class_build' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/abc_class_build.py')
		name: 'abc_class_build'

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testAbstractPropertyIsAbstract [
	"object >> ___subclassAttrShadowing___: and object class >>
	___grailNsRebind___:, which together make an abstractproperty count."

	self assertAll: #('subclass_attr_shadows_a_value_attr'
		'abstractproperty_makes_a_class_abstract'
		'abstractproperty_refuses_instantiation'
		'namespace_holds_the_decorated_object'
		'enum_body_takes_a_decorated_method')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testAnAccessorFormOverANonPropertyIsADecorator [
	"FunctionDefAst >> ___isForeignAccessorDecorator___:."

	self assertAll: #('foreign_setter_is_an_ordinary_decorator')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testAPropertyReadOffTheClassIsAProperty [
	"UnboundMethod class >> ___forClassRead___:family:selector: answers the
	property a declarative @property compiled to."

	self assertAll: #('class_read_answers_a_property'
		'class_read_property_is_one_object'
		'class_read_property_keeps_the_doc'
		'class_read_property_has_its_halves')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testClassKeywordsTravelThroughAMetaclass [
	"The deferred __init_subclass__ (object class >> ___grailInitSubclass___:)
	and type >> ___new__:kw:'s leading metaclass."

	self assertAll: #('forwarded_keywords_reach_init_subclass'
		'abcmeta_forwards_keywords'
		'type_new_counts_after_cls')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testDelAndIsabstract [
	"object >> ___pyAttrDelete___: on a decorated def, and inspect.isabstract."

	self assertAll: #('del_removes_a_decorated_def'
		'update_after_del_clears_abstracts'
		'isabstract_true_for_an_abstract_class'
		'isabstract_false_for_a_concrete_class'
		'isabstract_false_for_a_non_class')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testHeaderNamesBeyondTheEnclosingClassReadItsCell [
	"A class statement in a METHOD, naming a free variable of a function beyond
	that method's class in its bases, metaclass= or a decorator, compiled to an
	undefined symbol (NameAst / FunctionDefAst >> ___headerLocalBeyondClass___:).
	The method-local case must stay a plain temp."

	self assertAll: #('header_metaclass_beyond_the_class'
		'header_base_beyond_the_class'
		'class_decorator_beyond_the_class'
		'method_decorator_beyond_the_class'
		'header_local_of_the_method'
		'header_two_classes_deep')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testInlineClassBodyNamesReadTheRightScope [
	"NameAst >> ___readsThroughClassCell___ for attribute values and the
	sibling-def ``f.attr = v''."

	self assertAll: #('body_value_beyond_the_class'
		'def_attribute_reads_a_method_local')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testMarkedAndOverriddenPropertyAccessors [
	"FunctionDefAst >> printMarkingDecoratorsOn:..., and the accessor chain
	over a base's property (___declaresPropertyBinding___)."

	self assertAll: #('marked_property_is_abstract'
		'getter_over_an_abstract_setter_stays_abstract'
		'both_halves_overridden_is_concrete'
		'accessor_chain_over_a_base_property')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testOwnClassSideMethodsUnderAMetaclass [
	"object >> ___pythonSourceChainOwnsAnyOf___:orUnary:from: stops at a
	class-side def."

	self assertAll: #('own_staticmethod_under_a_metaclass'
		'own_classmethod_under_a_metaclass')

]

{ #category : 'Grail-Tests' }
AbcClassBuildTestCase >> testSuperAsksADescriptorForItsValue [
	"Super >> ___bindHolderValue___:."

	self assertAll: #('super_binds_a_classmethod_object'
		'super_binds_a_classmethod_subclass'
		'super_gets_a_property_value')

]
