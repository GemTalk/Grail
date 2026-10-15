Class {
	#name : 'InspectSignatureObjectsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InspectSignatureObjectsTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
InspectSignatureObjectsTestCase >> setUp [
	"Reload tests/python/inspect_signature_objects.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_signature_objects' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_signature_objects.py')
		name: 'inspect_signature_objects'.

]

{ #category : 'Grail-Tests - Constructing' }
InspectSignatureObjectsTestCase >> testADefaultOfNoneIsNotTheSameAsNoDefault [
	"Both spellings are legal and they mean different things.  None cannot be
	the marker for absent when it is also a perfectly good default."

	self assert: (self check: #'a_default_of_none_is_not_the_same_as_no_default') equals: true.

]

{ #category : 'Grail-Tests - Constructing' }
InspectSignatureObjectsTestCase >> testAHandBuiltSignatureRenders [
	"The crash: Signature(list) stored the list where the rendered TEXT goes,
	and repr then added a string to a list."

	self assert: (self check: #'a_hand_built_signature_renders') equals: true.

]

{ #category : 'Grail-Tests - Comparing' }
InspectSignatureObjectsTestCase >> testAnIntrospectedSignatureEqualsTheSameOneBuiltByHand [
	"The whole point, and what test_inspect_signatures does.  Bridges Grail's
	source-text defaults to the values an expected signature is written with."

	self assert: (self check: #'an_introspected_signature_equals_the_same_one_built_by_hand')
		equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
InspectSignatureObjectsTestCase >> testAnIntrospectedSignatureStillRenders [
	"Guard rail: the introspection path is untouched by all of this."

	self assert: (self check: #'an_introspected_signature_still_renders') equals: true.

]

{ #category : 'Grail-Tests - getfullargspec' }
InspectSignatureObjectsTestCase >> testGetfullargspecIsTheSevenFieldNamedtuple [
	"It used to be a stub that could not be unpacked, so Django's
	@register.simple_tag raised and the tag was silently never registered
	(issue #1369)."

	self assert: (self check: #'getfullargspec_is_the_seven_field_namedtuple') equals: true.

]

{ #category : 'Grail-Tests - getfullargspec' }
InspectSignatureObjectsTestCase >> testGetfullargspecPutsPositionalOnlyFirstAndEmptiesAsNone [
	self assert: (self check: #'getfullargspec_puts_positional_only_first_and_empties_as_none')
		equals: true.

]

{ #category : 'Grail-Tests - Comparing' }
InspectSignatureObjectsTestCase >> testParametersCompareByValue [
	self assert: (self check: #'parameters_compare_by_value') equals: true.

]

{ #category : 'Grail-Tests - Comparing' }
InspectSignatureObjectsTestCase >> testSignaturesCompareByValue [
	self assert: (self check: #'signatures_compare_by_value') equals: true.

]

{ #category : 'Grail-Tests - Constructing' }
InspectSignatureObjectsTestCase >> testTheEmptyMarkerIsShared [
	"Parameter.empty and Signature.empty are one object, as upstream."

	self assert: (self check: #'the_empty_marker_is_shared') equals: true.

]
