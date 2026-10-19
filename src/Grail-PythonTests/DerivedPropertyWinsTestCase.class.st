Class {
	#name : 'DerivedPropertyWinsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DerivedPropertyWinsTestCase >> assertAll: names [

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
DerivedPropertyWinsTestCase >> setUp [

	importlib @env1:modules removeKey: #'derived_property_wins' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/derived_property_wins.py')
		name: 'derived_property_wins'

]

{ #category : 'Grail-Tests' }
DerivedPropertyWinsTestCase >> testANearerDataDescriptorWinsThePairRead [
	"object >> ___grailDerivedDataDescriptorFor: -- asked before the pair read
	performs an ancestor's getter."

	self assertAll: #('property_set_on_the_subclass_later'
		'deleter_only_reads_the_inherited_getter' 'deleter_only_deletes'
		'decorator_returning_a_property' 'getattr_agrees')

]

{ #category : 'Grail-Tests' }
DerivedPropertyWinsTestCase >> testWhatAlreadyWorkedStillDoes [
	"The accessor forms that compile their own half, and an instance attribute
	behind a class value of the same name."

	self assertAll: #('setter_only_reads_the_inherited_getter' 'setter_only_sets'
		'getter_only_reads_its_own_getter' 'class_value_does_not_outrank_the_instance'
		'base_is_unchanged')

]
