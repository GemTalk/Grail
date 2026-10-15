Class {
	#name : 'SslCallbacksTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SslCallbacksTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
SslCallbacksTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
SslCallbacksTestCase >> setUp [

	importlib @env1:modules removeKey: #'ssl_callbacks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ssl_callbacks.py')
		name: 'ssl_callbacks'

]

{ #category : 'Grail-Tests - loading' }
SslCallbacksTestCase >> testEachCallbackTakesWithTheLibrary [

	self assert: (testModule @env1:refusals) asString
		equals: 'msg:ok keylog:ok psk:ok'

]

{ #category : 'Grail-Tests - loading' }
SslCallbacksTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11

]

{ #category : 'Grail-Tests - keylog' }
SslCallbacksTestCase >> testKeylogFile [

	self assertAll: #('keylog_writes_a_header_and_the_tls13_secrets')

]

{ #category : 'Grail-Tests - message callback' }
SslCallbacksTestCase >> testMessageCallback [

	self assertAll: #('msg_callback_sees_the_handshake'
		'msg_callback_exception_ends_the_call')

]

{ #category : 'Grail-Tests - PSK' }
SslCallbacksTestCase >> testPsk [

	self assertAll: #('psk_tls12_passes_the_hint_and_the_identity'
		'psk_without_a_hint_asks_with_none'
		'psk_tls13_handshakes'
		'psk_wrong_key_fails_the_handshake'
		'psk_callback_exception_is_unraisable')

]

{ #category : 'Grail-Tests - PSK' }
SslCallbacksTestCase >> testPskCallbackMayRunAGenerator [
	"A generator body is its own GsProcess.  Run from inside OpenSSL (a
	user-action callback) that is error 6011 and then a crashed gem; run as
	the answer to a paused ASYNC job it is ordinary Python."

	self assertAll: #('psk_callback_may_run_a_generator')

]

{ #category : 'Grail-Tests - ALPN' }
SslCallbacksTestCase >> testServerSelectsAlpn [

	self assertAll: #('alpn_server_selects_its_preference'
		'alpn_without_overlap_selects_nothing')

]

{ #category : 'Grail-Tests - loading' }
SslCallbacksTestCase >> testWithoutTheLibraryEachCallbackRefuses [
	"No library (install.sh could not build it): each setter raises
	NotImplementedError, naming why, instead of being silently ignored."

	| saved |
	saved := _grail_openssl callbackLibraryPath.
	[_grail_openssl callbackLibraryPath: nil.
	 SessionTemps current removeKey: #GrailOpenSslCallbacks ifAbsent: [].
	 self assert: (testModule @env1:refusals) asString
		equals: 'msg:NotImplementedError keylog:NotImplementedError psk:NotImplementedError']
		ensure: [
			_grail_openssl callbackLibraryPath: saved.
			SessionTemps current removeKey: #GrailOpenSslCallbacks ifAbsent: []]

]
