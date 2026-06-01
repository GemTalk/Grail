! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SocketModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SocketModuleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SocketModuleTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SocketModuleTestCase — the native ``socket`` module (PySocket over GsSocket).
! Exercises bind/listen/accept/connect/recv/send/sendall/close/shutdown and
! getsockname/gethostname through single-process round-trips (the client's
! connect+send buffer in the OS backlog before the server accepts, so no fork
! is needed).  Foundation for M8 (``flask run`` serving real HTTP).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SocketModuleTestCase removeAllMethods.
SocketModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
loadFixture
	"Load tests/python/use_socket.py fresh."

	importlib @env1:modules @env0:removeKey: #'use_socket' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/use_socket.py')
		name: 'use_socket'
%

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
testEchoRoundTrip
	"A full client<->server byte exchange over a real TCP socket."

	self assert: (self loadFixture @env1:echo_roundtrip) equals: 'pong:ping'
%

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
testEphemeralPortAssigned
	"bind((host, 0)) asks the OS for a port; getsockname reports it."

	self assert: (self loadFixture @env1:ephemeral_port_assigned) @env0:> 0
%

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
testLargePayloadRoundTrip
	"50000 bytes exceeds one OS buffer — sendall loops over partial writes
	and recv reassembles."

	| r |
	r := self loadFixture @env1:large_payload_roundtrip.
	self assert: (r @env1:__getitem__: 0) equals: 50000.
	self assert: (r @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
testContextManagerCloses
	"``with socket.socket() as s:`` closes the socket on exit (fileno -1)."

	| r |
	r := self loadFixture @env1:context_manager_closes.
	self assert: (r @env1:__getitem__: 0) equals: true.
	self assert: (r @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests-Socket'
method: SocketModuleTestCase
testGethostnameNonEmpty
	"socket.gethostname() returns the local host name."

	self assert: (self loadFixture @env1:gethostname_nonempty) equals: true
%
