Class {
	#name : 'TwilioShapeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
TwilioShapeTestCase >> setUp [
	"Reload tests/python/twilio_shape.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'twilio_shape' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/twilio_shape.py')
		name: 'twilio_shape'.

]

{ #category : 'Grail-Tests - Base method' }
TwilioShapeTestCase >> testBaseGetInstanceRaisesNotImplemented [
	"Un-overridden Page.get_instance raises NotImplementedError."

	self assert: (testModule @env1:___pyAttrLoad___: #base_get_instance)
		equals: 'not_implemented'.

]

{ #category : 'Grail-Tests - Classmethod via instance' }
TwilioShapeTestCase >> testClassmethodThroughInstanceReturnsException [
	"version.exception(...) — twilio's ``raise self.exception(...)``
	shape: a @classmethod (decorator ignored by Grail codegen) invoked
	through the instance, RETURNING a built-in exception as a value."

	self assert: (testModule @env1:___pyAttrLoad___: #exc_text)
		equals: 'POST /Messages: oops'.

]

{ #category : 'Grail-Tests - Inheritance' }
TwilioShapeTestCase >> testInheritedMethodThroughTwoUserHops [
	"version.absolute_url() is inherited from Version and calls through
	to Domain.absolute_url — two user-defined classes deep."

	self assert: (testModule @env1:___pyAttrLoad___: #abs_url)
		equals: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json'.

]

{ #category : 'Grail-Tests - Inheritance' }
TwilioShapeTestCase >> testIsinstanceThroughUserBases [
	"isinstance(msg, InstanceResource) etc. — all four checks true."

	| checks |
	checks := testModule @env1:___pyAttrLoad___: #inst_checks.
	checks do: [:each | self assert: each].

]

{ #category : 'Grail-Tests - Property' }
TwilioShapeTestCase >> testLazyPropertyCaches [
	"api.v2010 constructs once and returns the same object on re-read."

	self assert: (testModule @env1:___pyAttrLoad___: #same_version).

]

{ #category : 'Grail-Tests - Resource shapes' }
TwilioShapeTestCase >> testListResourceCreatesInstance [
	"MessageList.create() builds a MessageInstance whose ctor chain ran."

	self assert: (testModule @env1:___pyAttrLoad___: #msg_body) equals: 'hello'.
	self assert: (testModule @env1:___pyAttrLoad___: #msg_sid) equals: 'SM123'.
	self assert: (testModule @env1:___pyAttrLoad___: #msg_version_is_shared).
	self assert: (testModule @env1:___pyAttrLoad___: #list_uri)
		equals: '/Accounts/AC123/Messages.json'.

]

{ #category : 'Grail-Tests - Page iteration' }
TwilioShapeTestCase >> testPageIteratorProtocolWithOverride [
	"Page.__next__ delegates to the subclass's get_instance override."

	| sids |
	sids := testModule @env1:___pyAttrLoad___: #page_sids.
	self assert: sids asArray equals: #('SM1' 'SM2').

]

{ #category : 'Grail-Tests - Page iteration' }
TwilioShapeTestCase >> testProcessResponseHappyAndError [
	"page.process_response() returns the body on 200 and raises
	ValueError otherwise (caught Python-side)."

	self assert: (testModule @env1:___pyAttrLoad___: #processed)
		equals: 'payload-text'.
	self assert: (testModule @env1:___pyAttrLoad___: #process_err)
		equals: 'value_error'.

]

{ #category : 'Grail-Tests - Inheritance' }
TwilioShapeTestCase >> testSuperInitChainPopulatesBothLevels [
	"V2010.__init__ -> super().__init__(domain, '2010-04-01') and
	Api.__init__ -> super().__init__('https://api.twilio.com') both
	land their state."

	self assert: (testModule @env1:___pyAttrLoad___: #version_string)
		equals: '2010-04-01'.
	self assert: (testModule @env1:___pyAttrLoad___: #domain_base)
		equals: 'https://api.twilio.com'.

]
