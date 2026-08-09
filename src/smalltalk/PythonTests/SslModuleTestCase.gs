! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SslModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SslModuleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SslModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SslModuleTestCase — the native ``ssl`` module (SSLContext/SSLSocket over
! GsSecureSocket).  A TLS handshake is bidirectional, so the test forks the
! client into its own GsProcess while the server runs on the main thread;
! GsSecureSocket's secureAccept/secureConnect suspend on readiness, so the two
! green threads drive the handshake cooperatively.  Uses the OpenSSL example
! certificate shipped with GemStone.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SslModuleTestCase removeAllMethods.
SslModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
loadFixture
	"Load tests/python/use_ssl.py fresh."

	importlib @env1:modules removeKey: #'use_ssl' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir, '/tests/python/use_ssl.py')
		name: 'use_ssl'
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
serverCertFile
	^ (System gemEnvironmentVariable: 'GEMSTONE'),
		'/examples/openssl/certs/server_1_servercert.pem'
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
serverKeyFile
	^ (System gemEnvironmentVariable: 'GEMSTONE'),
		'/examples/openssl/private/server_1_serverkey.pem'
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
serverKeyPassword
	^ GsSecureSocket getPasswordFromFile:
		(System gemEnvironmentVariable: 'GEMSTONE'),
			'/examples/openssl/private/server_1_server_passwd.txt'
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testTlsRoundtrip
	"A full TLS client<->server exchange: the server wraps a listener with a
	certificate and accepts (secureAccept handshake); a forked client connects,
	completes the client handshake (secureConnect), sends 'ping' and reads back
	'echo:ping' — all encrypted.  Also checks the negotiated protocol version."

	| mod res lsock port sem holder result resp version |
	mod := self loadFixture.
	res := mod @env1:make_https_listener: self serverCertFile
		_: self serverKeyFile _: self serverKeyPassword.
	lsock := res at: 1.
	port := res at: 2.
	sem := Semaphore new.
	holder := Array new: 1.
	[
		[holder at: 1 put: (mod @env1:client_roundtrip: port _: 'ping' asByteArray)]
			on: Error do: [:e | holder at: 1 put: e].
		sem signal
	] fork.
	mod @env1:serve_one_echo: lsock.
	sem wait.
	result := holder at: 1.
	self assert: (result isKindOf: OrderedCollection)
		description: 'client raised: ', result printString.
	resp := result at: 1.
	version := result at: 2.
	self assert: resp equals: 'echo:ping' asByteArray.
	self assert: version equals: 'TLSv1.3'
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testDefaultContextLoadsTrustStore
	"ssl.create_default_context() must arrive with CA anchors loaded, the
	way CPython's does via load_default_certs().  Without them every
	verifying handshake fails with 'certificate verify failed', which is
	what made all HTTPS requests fail.  Offline: only inspects config."

	| mod r |
	mod := self loadFixture.
	r := mod @env1:trust_store_defaults.
	self assert: (r @env1:__getitem__: 'has_cafile')
		description: 'no platform CA bundle found'.
	self assert: (r @env1:__getitem__: 'cafile_exists').
	self assert: (r @env1:__getitem__: 'default_verifies').
	self assert: (r @env1:__getitem__: 'default_checks_hostname').
	self assert: (r @env1:__getitem__: 'default_loaded_anchors')
		description: 'default context loaded no CA anchors'.
	self assert: (r @env1:__getitem__: 'explicit_cafile_kept').
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testUnverifiedContextHasVerificationOff
	"_create_unverified_context() stays off — requests(verify=False)
	and the TLS roundtrip test both depend on it."

	| mod r |
	mod := self loadFixture.
	r := mod @env1:trust_store_defaults.
	self assert: (r @env1:__getitem__: 'unverified_off').
	self assert: (r @env1:__getitem__: 'unverified_has_no_anchors').
	self assert: (r @env1:__getitem__: 'omitted_args_raise')
		description: 'load_verify_locations() with no args must raise TypeError'.
%
