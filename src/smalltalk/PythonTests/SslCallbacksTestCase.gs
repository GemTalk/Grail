! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SslCallbacksTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SslCallbacksTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SslCallbacksTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SslCallbacksTestCase - the OpenSSL callbacks behind ssl
! ===============================================================================
!   Server-side ALPN selection, the message callback, the keylog file and
!   PSK, all of which need a C function pointer.  They come from
!   src/c/ssl/grail_ssl.c, a plain library _ssl.py reaches through CCallout
!   (_grail_openssl cb()); no Python runs inside OpenSSL.  See that file's
!   header for how each callback reaches Python, and why a user action,
!   which could call back into Smalltalk, cannot be used: Smalltalk inside a
!   user action may not switch GsProcess (6011), and a PSK callback that ran
!   a generator crashed the gem that way.
!
! tests/python/ssl_callbacks.py holds the 11 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SslCallbacksTestCase removeAllMethods.
SslCallbacksTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SslCallbacksTestCase
setUp

	importlib @env1:modules removeKey: #'ssl_callbacks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ssl_callbacks.py')
		name: 'ssl_callbacks'
%

category: 'Grail-Helpers'
method: SslCallbacksTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SslCallbacksTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - ALPN'
method: SslCallbacksTestCase
testServerSelectsAlpn

	self assertAll: #('alpn_server_selects_its_preference'
		'alpn_without_overlap_selects_nothing')
%

category: 'Grail-Tests - message callback'
method: SslCallbacksTestCase
testMessageCallback

	self assertAll: #('msg_callback_sees_the_handshake'
		'msg_callback_exception_ends_the_call')
%

category: 'Grail-Tests - keylog'
method: SslCallbacksTestCase
testKeylogFile

	self assertAll: #('keylog_writes_a_header_and_the_tls13_secrets')
%

category: 'Grail-Tests - PSK'
method: SslCallbacksTestCase
testPsk

	self assertAll: #('psk_tls12_passes_the_hint_and_the_identity'
		'psk_without_a_hint_asks_with_none'
		'psk_tls13_handshakes'
		'psk_wrong_key_fails_the_handshake'
		'psk_callback_exception_is_unraisable')
%

category: 'Grail-Tests - PSK'
method: SslCallbacksTestCase
testPskCallbackMayRunAGenerator
	"A generator body is its own GsProcess.  Run from inside OpenSSL (a
	user-action callback) that is error 6011 and then a crashed gem; run as
	the answer to a paused ASYNC job it is ordinary Python."

	self assertAll: #('psk_callback_may_run_a_generator')
%

category: 'Grail-Tests - loading'
method: SslCallbacksTestCase
testEachCallbackTakesWithTheLibrary

	self assert: (testModule @env1:refusals) asString
		equals: 'msg:ok keylog:ok psk:ok'
%

category: 'Grail-Tests - loading'
method: SslCallbacksTestCase
testWithoutTheLibraryEachCallbackRefuses
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
%

category: 'Grail-Tests - loading'
method: SslCallbacksTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11
%
