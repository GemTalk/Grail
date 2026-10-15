Class {
	#name : 'ClassAttrShadowsInheritedTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassAttrShadowsInheritedTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
ClassAttrShadowsInheritedTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
ClassAttrShadowsInheritedTestCase >> setUp [

	importlib @env1:modules removeKey: #'class_attr_shadows_inherited' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_shadows_inherited.py')
		name: 'class_attr_shadows_inherited'

]

{ #category : 'Grail-Tests - attributes' }
ClassAttrShadowsInheritedTestCase >> testAClassAttributeShadowsWhatItInherits [

	self assertAll: #('a_class_attribute_shadows_an_inherited_property'
		'a_class_attribute_shadows_an_inherited_method'
		'it_shadows_through_a_secondary_base_too'
		'a_subclass_of_the_shadowing_class_inherits_it')

]

{ #category : 'Grail-Tests - attributes' }
ClassAttrShadowsInheritedTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests - attributes' }
ClassAttrShadowsInheritedTestCase >> testTheRestOfThePrecedenceStillHolds [

	self assertAll: #('rebinding_the_class_attribute_is_seen_by_instances'
		'an_instance_attribute_still_wins_over_the_class_one'
		'one_instance_attribute_does_not_leak_to_another')

]

{ #category : 'Grail-Tests - attributes' }
ClassAttrShadowsInheritedTestCase >> testWhatIsNotShadowedIsUnchanged [

	self assertAll: #('the_base_class_still_answers_its_property'
		'the_inherited_method_still_works_where_not_shadowed'
		'the_class_level_read_is_unchanged')

]
