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

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testOpensslVersionNamesTheLoadedLibrary
	"ssl.OPENSSL_VERSION must be the banner of the OpenSSL that THIS gem
	loaded, not a constant baked into ssl.py.  Compared against
	GsSecureSocket's own answer, so the test fails if ssl.py ever starts
	inventing a version: the two are read by different routes and can only
	agree if ssl.py really asked."

	| mod r |
	mod := self loadFixture.
	r := mod @env1:openssl_constants.
	self assert: (r @env1:__getitem__: 'version') asString
		equals: GsSecureSocket sslLibraryVersionString asString
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testOpensslVersionConstantsAgree
	"The three constants must have CPython's shapes and describe the same
	version: the tuple is the bit-decomposition of the number, and both
	re-spell the version the banner names.  tests/python/use_ssl.py runs the
	identical checks under real CPython (scripts/check_python_fixtures.sh),
	so this is measured conformance, not a Grail-shaped expectation."

	| mod r |
	mod := self loadFixture.
	r := mod @env1:openssl_constants.
	self assert: (r @env1:__getitem__: 'types_ok')
		description: 'OPENSSL_VERSION* do not have CPython''s types'.
	self assert: (r @env1:__getitem__: 'info_is_decomposition')
		description: 'OPENSSL_VERSION_INFO is not the decomposition of _NUMBER: ',
			(r @env1:__getitem__: 'info') printString, ' vs ',
			(r @env1:__getitem__: 'number') printString.
	self assert: (r @env1:__getitem__: 'info_matches_banner')
		description: 'OPENSSL_VERSION_INFO does not match the banner: ',
			(r @env1:__getitem__: 'info') printString, ' vs ',
			(r @env1:__getitem__: 'version') printString
%

category: 'Grail-Tests-Ssl'
method: SslModuleTestCase
testOpensslVersionPassesUrllib3Gate
	"urllib3 2.x refuses to import unless ssl names an OpenSSL of 1.1.1 or
	later (urllib3/__init__.py, the prefix test then the tuple compare).
	This is the whole reason the constants exist here."

	| mod r |
	mod := self loadFixture.
	r := mod @env1:openssl_constants.
	self assert: (r @env1:__getitem__: 'urllib3_gate')
		description: 'urllib3 would reject ',
			(r @env1:__getitem__: 'version') printString, ' ',
			(r @env1:__getitem__: 'info') printString
%
