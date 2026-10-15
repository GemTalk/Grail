Class {
	#name : 'InspectGetmembersTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InspectGetmembersTestCase >> check: aName [
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil

]

{ #category : 'Grail-Setup' }
InspectGetmembersTestCase >> setUp [
	"Reload tests/python/inspect_getmembers.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_getmembers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_getmembers.py')
		name: 'inspect_getmembers'.

]

{ #category : 'Grail-Tests - DynamicClassAttribute sweep' }
InspectGetmembersTestCase >> testADynamicClassAttributeIsReported [
	"It hides from dir(), so only the sweep over the bases' __dict__ finds it."

	self assert: (self check: #'dynamic_class_attribute_is_reported') equals: true.

]

{ #category : 'Grail-Tests - The MRO fallback' }
InspectGetmembersTestCase >> testANameNothingBacksIsSkipped [
	"A __dir__ offering a name with no attribute and no __dict__ entry is
	discarded rather than raising -- the ``else'' of CPython's for/else."

	self assert: (self check: #'a_name_nothing_backs_is_skipped') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
InspectGetmembersTestCase >> testGetmroAnswersTheMro [
	"inspect.getmro is CPython's public spelling of cls.__mro__, and getmembers
	needs it for the fallback walk."

	self assert: (self check: #'getmro_answers_the_mro') equals: true.

]

{ #category : 'Grail-Tests - Unchanged behaviour' }
InspectGetmembersTestCase >> testOrdinaryMembersAndPredicateAreUnaffected [
	"Guard rail: the common path still answers what it always did, and a
	predicate still filters."

	self assert: (self check: #'ordinary_members_are_unaffected') equals: true.
	self assert: (self check: #'predicate_still_filters') equals: true.

]

{ #category : 'Grail-Tests - DynamicClassAttribute sweep' }
InspectGetmembersTestCase >> testTheDescriptorItselfIsReported [
	"Not the value it would compute: getattr on the CLASS produces none, so the
	__dict__ entry is what is reported.  This is the identity test_enum's
	version relies on (``result['name'] == Enum.__dict__['name']'')."

	self assert: (self check: #'the_descriptor_itself_is_reported') equals: true.

]
