Class {
	#name : 'TwilioClientTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TwilioClientTestCase >> resultAt: moduleAttr at: key [
	^ (testModule @env1:___pyAttrLoad___: moduleAttr) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
TwilioClientTestCase >> setUp [
	"Reload tests/python/twilio_client.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'twilio_client' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/twilio_client.py')
		name: 'twilio_client'.

]

{ #category : 'Grail-Tests - Client resource path' }
TwilioClientTestCase >> testMessagesCreate [
	"client.messages.create() composes the exact twilio API request
	(method, account-scoped URL, form params, basic-auth tuple) and
	deserializes the response payload into a MessageInstance."

	self assert: (self resultAt: #r_create at: 'method') equals: 'POST'.
	self assert: (self resultAt: #r_create at: 'url')
		equals: 'https://api.twilio.com/2010-04-01/Accounts/AC00000000000000000000000000000001/Messages.json'.
	self assert: (self resultAt: #r_create at: 'data_to') equals: '+15558675310'.
	self assert: (self resultAt: #r_create at: 'data_from') equals: '+15017122661'.
	self assert: (self resultAt: #r_create at: 'data_body') equals: 'Hello from Grail'.
	self assert: ((self resultAt: #r_create at: 'auth') asArray)
		equals: #('AC00000000000000000000000000000001' 'authtoken99').
	self assert: (self resultAt: #r_create at: 'msg_sid')
		equals: 'SM00000000000000000000000000000042'.
	self assert: (self resultAt: #r_create at: 'msg_status') equals: 'queued'.
	self assert: (self resultAt: #r_create at: 'msg_body') equals: 'Hello from Grail'.
	self assert: (self resultAt: #r_create at: 'msg_num_segments') equals: '1'.
	self assert: (self resultAt: #r_create at: 'date_created_year') equals: 2026.

]

{ #category : 'Grail-Tests - Client resource path' }
TwilioClientTestCase >> testMessagesCreateErrorRaisesTwilioRestException [
	"A 400 with a twilio error payload surfaces as TwilioRestException
	carrying the decoded twilio error code."

	self assert: (self resultAt: #r_create_error at: 'name')
		equals: 'TwilioRestException'.
	self assert: (self resultAt: #r_create_error at: 'code') equals: 21211.
	self assert: (self resultAt: #r_create_error at: 'status') equals: 400.

]

{ #category : 'Grail-Tests - requests shim' }
TwilioClientTestCase >> testRequestsGetAgainstLoopback [
	self assert: (self resultAt: #r_requests at: 'status') equals: 200.
	self assert: (self resultAt: #r_requests at: 'ok').
	self assert: ((self resultAt: #r_requests at: 'json') @env1:__getitem__: 'hello')
		equals: 'json'.
	self assert: (self resultAt: #r_requests at: 'ctype')
		equals: 'application/json'.
	self assert: (self resultAt: #r_requests at: 'sent_query').
	self assert: (self resultAt: #r_requests at: 'sent_auth').

]

{ #category : 'Grail-Tests - TwilioHttpClient' }
TwilioClientTestCase >> testTwilioHttpClientPostsFormWithAuth [
	"twilio's real sync transport driving the requests shim over a
	live loopback socket: form body, urlencoded content type, and
	basic auth all reach the wire."

	self assert: (self resultAt: #r_twilio_http at: 'status') equals: 201.
	self assert: (self resultAt: #r_twilio_http at: 'text')
		equals: '{"sid": "SM123"}'.
	self assert: (self resultAt: #r_twilio_http at: 'posted_form').
	self assert: (self resultAt: #r_twilio_http at: 'form_ctype').
	self assert: (self resultAt: #r_twilio_http at: 'authed').

]

{ #category : 'Grail-Tests - urlopen' }
TwilioClientTestCase >> testUrlopenGet [
	self assert: (self resultAt: #r_urlopen at: 'status') equals: 200.
	self assert: (self resultAt: #r_urlopen at: 'body') equals: 'grail'.

]

{ #category : 'Grail-Tests - urlopen' }
TwilioClientTestCase >> testUrlopenRaisesHttpError [
	self assert: (testModule @env1:___pyAttrLoad___: #r_urlopen_error)
		equals: 'HTTPError:404'.

]
