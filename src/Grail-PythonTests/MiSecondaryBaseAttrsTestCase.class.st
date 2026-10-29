"A class attribute set on a SECONDARY base of a multiple-inheritance class is
read through the subclass in MRO order, as in CPython.  The subclass inherits
only its primary base through Smalltalk, the other bases' methods and declared
attributes are copied when it is made, and an attribute set with setattr --
before or after -- was neither copied nor found (test_email's @parameterize).

Every expectation in tests/python/mi_secondary_base_attrs.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'MiSecondaryBaseAttrsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
MiSecondaryBaseAttrsTestCase >> assertAll: keys [

	keys do: [:each |
		| result |
		result := self resultAt: each.
		self assert: result == true description: each , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
MiSecondaryBaseAttrsTestCase >> resultAt: aKey [

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
MiSecondaryBaseAttrsTestCase >> setUp [

	importlib @env1:modules removeKey: #'mi_secondary_base_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mi_secondary_base_attrs.py')
		name: 'mi_secondary_base_attrs'

]

{ #category : 'Grail-Tests' }
MiSecondaryBaseAttrsTestCase >> testALeftBaseClassAttributeBeatsThePrimaryChain [

	"A class-body attribute on a base written left of the primary chain is the
	one the MRO finds -- test_email's TestGenerator read TestEmailBase's policy
	instead of TestGeneratorBase's -- and the class's own still beats it."

	self assertAll: #('a_left_base_class_attribute_beats_the_primary_chain'
		'a_left_base_class_attribute_beats_it_through_an_instance'
		'a_left_base_class_attribute_reaches_a_further_subclass'
		'the_class_own_attribute_still_wins'
		'a_left_base_only_attribute_is_still_found')

]

{ #category : 'Grail-Tests' }
MiSecondaryBaseAttrsTestCase >> testAnAttributeSetOnASecondaryBaseIsInherited [

	self assertAll: #('set_before_the_subclass_is_seen_on_the_class'
		'set_before_the_subclass_binds_the_instance'
		'set_after_the_subclass_is_seen')

]

{ #category : 'Grail-Tests' }
MiSecondaryBaseAttrsTestCase >> testTheMroDecidesBetweenAnAttributeAndAMethod [

	"An earlier base's attribute beats a later base's method; the subclass's
	own method beats both; the primary chain and the mixin's methods are as
	before."

	self assertAll: #('an_earlier_base_attribute_beats_a_later_method'
		'the_subclass_own_method_still_wins'
		'the_primary_chain_still_works'
		'the_mixin_method_still_works')

]
