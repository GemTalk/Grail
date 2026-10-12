! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpKeepAliveStallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpKeepAliveStallTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpKeepAliveStallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpKeepAliveStallTestCase
!
! ONE KEEP-ALIVE CLIENT MUST NOT STALL A SINGLE-THREADED SERVER (#1227).  A
! single-threaded server serves one connection at a time, so a connection it
! holds open blocks every other client until that client closes it.
!
! http.server kept any HTTP/1.1 connection, though CPython keeps one only when
! the handler's protocol_version is HTTP/1.1 too (the default is HTTP/1.0).
! parse_request is now CPython's, which also refuses the request lines Grail
! answered 200 (FOO/1.0, HTTP/2.0, an extra word) and enforces http.client's
! header limits.  Grail's Werkzeug set protocol_version = "HTTP/1.1" on its
! handler class; it now follows upstream, raising it only for a threaded
! server -- through a subclass, not by assigning to the class as upstream does,
! because a class is database state here and a commit would keep the change.
!
! Fixture: tests/python/http_keepalive_stall.py (self-verifying under CPython
! 3.14 -- 14 http.server checks, plus 5 Werkzeug checks that hold under
! Werkzeug 3.1.5).  It runs a server on a green thread and real sockets; a
! stalled client reads as '<stalled>' after 3 s rather than hanging.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpKeepAliveStallTestCase removeAllMethods.
HttpKeepAliveStallTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: HttpKeepAliveStallTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #http_keepalive_stall ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/http_keepalive_stall.py')
		name: 'http_keepalive_stall'.
%

category: 'Grail-Private'
method: HttpKeepAliveStallTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests'
method: HttpKeepAliveStallTestCase
testAnHttp10HandlerClosesEveryConnection
	"The headline: at the default protocol_version, a 1.1 request or a
	keep-alive header still gets its connection closed, so a second client is
	served while the first holds its socket."

	#('http10_handler_status_line' 'http10_handler_closes_an_11_request'
	  'http10_handler_closes_despite_keepalive'
	  'second_client_is_served_while_first_holds')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests'
method: HttpKeepAliveStallTestCase
testRequestLinesAreValidatedAsCPythonDoes
	"400 for a malformed version or request line, 505 for HTTP/2, 431 and 414
	for oversized headers and request lines; HTTP/0.9 and the '//' reduction."

	#('request_lines' 'http09_get_has_no_status_line' 'leading_slashes_are_reduced'
	  'header_limit' 'request_line_too_long')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests'
method: HttpKeepAliveStallTestCase
testWerkzeugSpeaksHttp11OnlyWhenThreaded
	"make_server's single-threaded default closes each connection and serves a
	second client; a threaded server serves HTTP/1.1, unless the handler pins
	its own version."

	#('wz_single_threaded' 'wz_second_client_is_served'
	  'wz_single_threaded_leaves_the_class_alone' 'wz_threaded'
	  'wz_threaded_respects_a_pinned_version')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests - Controls'
method: HttpKeepAliveStallTestCase
testAnHttp11HandlerStillKeepsTheConnection
	"The other side of the rule: a handler at HTTP/1.1 keeps a 1.1 connection,
	honours Connection: close, answers Expect: 100-continue, and still closes
	after an error."

	#('http11_handler_keeps_the_connection' 'http11_handler_honours_connection_close'
	  'http11_handler_closes_an_10_request' 'expect_100_continue'
	  'a_505_closes_even_on_an_11_handler')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests - Controls'
method: HttpKeepAliveStallTestCase
testAThreadedServerLeavesTheHandlerClassAlone
	"DELIBERATE DIVERGENCE from upstream Werkzeug, which assigns
	protocol_version to the handler class.  Here that class is database state,
	and one threaded server in a session that commits would make every later
	single-threaded server stall again.  Grail serves through a subclass."

	| b |
	b := builtins @env1:instance.
	self
		assert: (b @env1:repr: (testModule @env1:threaded_server_leaves_the_handler_class_alone)) asString
		equals: '[False, False, ''HTTP/1.1'', True]'
%

category: 'Grail-Tests - Controls'
method: HttpKeepAliveStallTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'
%
