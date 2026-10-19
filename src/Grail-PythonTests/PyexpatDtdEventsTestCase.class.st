Class {
	#name : 'PyexpatDtdEventsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
PyexpatDtdEventsTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
PyexpatDtdEventsTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
PyexpatDtdEventsTestCase >> setUp [
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/pyexpat_dtd_events.py'
		name: 'pyexpat_dtd_events'

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testCharacterDataComesInExpatsPieces [

	self assertAll: #('character_data_comes_in_expats_pieces')

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testEntityReferencesThatAreErrors [

	self assertAll: #('an_undefined_entity_is_an_error_without_an_external_subset'
		'entity_references_that_cannot_be_used')

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 8 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 8

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testExternalEntitiesGoToTheHandler [

	self assertAll: #('an_external_entity_goes_to_the_handler'
		'the_external_subset_is_asked_for_with_param_parsing')

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testNamespacePrefixesIsAThirdNamePart [

	self assertAll: #('namespace_prefixes_is_a_third_name_part')

]

{ #category : 'Grail-Tests - handlers' }
PyexpatDtdEventsTestCase >> testTheInternalSubsetIsReported [

	self assertAll: #('the_internal_subset_is_reported'
		'internal_entities_expand_as_markup')

]
