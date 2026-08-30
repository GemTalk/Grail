! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpClientTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpClientTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpClientTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpClientTestCase
!
! Exercises Grail's hand-rolled http.client (HTTPConnection /
! HTTPResponse over the native socket module) against an in-process
! loopback server.  Uses the deterministic single-session pattern from
! SocketModuleTestCase: client request bytes complete via the OS listen
! backlog + send buffer before the server accept()s.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpClientTestCase removeAllMethods.
HttpClientTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: HttpClientTestCase
setUp
	"Reload tests/python/use_http_client.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'use_http_client' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_http_client.py')
		name: 'use_http_client'.
%

category: 'Grail-Private'
method: HttpClientTestCase
resultAt: moduleAttr at: key
	^ (testModule @env1:___pyAttrLoad___: moduleAttr) @env1:__getitem__: key
%

category: 'Grail-Tests'
method: HttpClientTestCase
testGetWithContentLength
	self assert: (self resultAt: #r_get at: 'status') equals: 200.
	self assert: (self resultAt: #r_get at: 'reason') equals: 'OK'.
	self assert: (self resultAt: #r_get at: 'body') equals: 'hello world'.
	self assert: (self resultAt: #r_get at: 'ctype') equals: 'text/plain'.
	self assert: (self resultAt: #r_get at: 'ctype_titled') equals: 'text/plain'.
	self assert: (self resultAt: #r_get at: 'request_line')
		equals: 'GET /hello?x=1 HTTP/1.1'.
	self assert: (self resultAt: #r_get at: 'has_host').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testPostBody
	self assert: (self resultAt: #r_post at: 'status') equals: 201.
	self assert: (self resultAt: #r_post at: 'request_has_clen').
	self assert: (self resultAt: #r_post at: 'request_has_ctype').
	self assert: (self resultAt: #r_post at: 'request_body')
		equals: 'To=%2B15551234567&Body=Hi+there'.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testChunkedResponse
	self assert: (self resultAt: #r_chunked at: 'status') equals: 200.
	self assert: (self resultAt: #r_chunked at: 'body') equals: 'hello world!'.
	self assert: (self resultAt: #r_chunked at: 'chunked').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testHeadNoBody
	self assert: (self resultAt: #r_head at: 'status') equals: 200.
	self assert: (self resultAt: #r_head at: 'body_len') equals: 0.
	self assert: (self resultAt: #r_head at: 'clen_header') equals: '5000'.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testErrorStatusFlowsThrough
	self assert: (self resultAt: #r_error at: 'status') equals: 404.
	self assert: (self resultAt: #r_error at: 'reason') equals: 'Not Found'.
	self assert: (self resultAt: #r_error at: 'body')
		equals: '{"error": "no such thing"}'.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testConnectionCloseBodyStillReadable
	"``Connection: close'' is the ordinary case for requests/urllib.
	getresponse() drops the connection's socket as soon as the headers
	say the server will close; the body is then read through the file
	object the response already holds.  Before the socket _io_refs
	handshake this raised
	  a UndefinedObject does not understand #read:into:startingAt:"

	self assert: (self resultAt: #r_conn_close at: 'status') equals: 200.
	self assert: (self resultAt: #r_conn_close at: 'will_close').
	self assert: (self resultAt: #r_conn_close at: 'sock_dropped').
	self assert: (self resultAt: #r_conn_close at: 'body_len') equals: 21000.
	self assert: (self resultAt: #r_conn_close at: 'body_intact').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testResponseIsContextManager
	"CPython's HTTPResponse is an io.BufferedIOBase, so ``with
	urlopen(...) as r:'' works.  Grail's returned no __enter__."

	self assert: (self resultAt: #r_ctx at: 'body') equals: 'inctx'.
	self assert: (self resultAt: #r_ctx at: 'is_bufferedio').
	self assert: (self resultAt: #r_ctx at: 'closed_after').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testSocketCloseDeferredWhileMakefileOpen
	"socket.close() marks the socket closed but keeps the GsSocket until
	the last makefile() handle closes (CPython socket._io_refs)."

	self assert: (self resultAt: #r_io_refs at: 'alive_after_close').
	self assert: (self resultAt: #r_io_refs at: 'data') equals: 'payload'.
	self assert: (self resultAt: #r_io_refs at: 'released_after_fp_close').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testResponseHeadersAreEmailMessage
	"http.client.HTTPMessage is a REAL email.message.Message subclass,
	as CPython's is.  Consumers check the ancestry, not just the
	mapping surface: urllib3/util/response.py::assert_header_parsing
	opens with ``isinstance(headers, httplib.HTTPMessage)'' and then
	uses is_multipart / get_payload / defects.  Grail's used to be a
	stand-alone shim, so that isinstance answered false.

	_NotAMessage in the fixture is the NEGATIVE CONTROL: it has the old
	shim's surface (get/items/keys all answer) and must still fail both
	ancestry checks -- otherwise the checks above prove nothing."

	self assert: (self resultAt: #r_ancestry at: 'subclass_of_message').
	self assert: (self resultAt: #r_ancestry at: 'isinstance_message').
	self assert: (self resultAt: #r_ancestry at: 'isinstance_httpmessage').
	self assert: (self resultAt: #r_ancestry at: 'control_has_surface').
	self deny: (self resultAt: #r_ancestry at: 'control_isinstance_message').
	self deny: (self resultAt: #r_ancestry at: 'control_isinstance_httpmessage').
%

category: 'Grail-Tests'
method: HttpClientTestCase
testHeaderMessageInheritedSurface
	"The Message surface HTTPMessage no longer has to imitate: defects,
	is_multipart, get_payload and get_content_type all come from
	email.message.Message now."

	self deny: (self resultAt: #r_msg_surface at: 'is_multipart').
	self assert: (self resultAt: #r_msg_surface at: 'payload_is_none').
	self assert: (self resultAt: #r_msg_surface at: 'len') equals: 3.
	self assert: (self resultAt: #r_msg_surface at: 'contains_ci').
	self assert: (self resultAt: #r_msg_surface at: 'getitem_ci')
		equals: 'example.test'.
	self assert: (self resultAt: #r_msg_surface at: 'getitem_missing_is_none').
	self assert: (self resultAt: #r_msg_surface at: 'get_all_missing_is_none').
	self assert: (self resultAt: #r_msg_surface at: 'content_type_default')
		equals: 'text/plain'.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testParseHeadersRecordsDefects
	"http.client.parse_headers(fp) is public in CPython and was absent
	here.  Its defect behaviour is the point: a line with no colon ends
	the header block with a MissingHeaderBodySeparatorDefect and becomes
	the payload -- which is exactly what urllib3 raises
	HeaderParsingError on."

	self assert: (self resultAt: #r_ph_ok at: 'class') equals: 'HTTPMessage'.
	self assert: (self resultAt: #r_ph_ok at: 'isinstance_message').
	self assert: (self resultAt: #r_ph_ok at: 'payload') equals: ''.
	self assert: (self resultAt: #r_ph_ok at: 'rest') equals: 'BODY'.
	self assert: (self resultAt: #r_ph_ok at: 'folded')
		equals: (String withAll: {$o. $n. $e. Character cr. Character lf.
			$  . $  . $t. $w. $o}).

	self assert: (self resultAt: #r_ph_sep at: 'defects_are_messagedefect').
	self assert: (self resultAt: #r_ph_sep at: 'rest') equals: 'BODY'.
	self assert: (self resultAt: #r_ph_cont at: 'payload') equals: ''.
	self assert: (self resultAt: #r_ph_empty at: 'payload') equals: ''.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testUrllib3AssertHeaderParsing
	"The call this change exists to make work.  urllib3 is not vendored,
	so the fixture inlines assert_header_parsing verbatim: a clean block
	passes, a malformed one reports the defect and the unparsed data,
	and something that is not an HTTPMessage raises TypeError."

	self assert: (self resultAt: #r_u3 at: 'control_raises_typeerror').
	self assert: (self resultAt: #r_live_headers at: 'assert_header_parsing_ok').
	self assert: (self resultAt: #r_live_headers at: 'assert_header_parsing_unparsed')
		equals: ''.
	self assert: (self resultAt: #r_live_headers at: 'isinstance_message').
	self assert: (self resultAt: #r_live_headers at: 'isinstance_httpmessage').
	self assert: (self resultAt: #r_live_headers at: 'msg_is_headers').
	self deny: (self resultAt: #r_live_headers at: 'is_multipart').
	self assert: (self resultAt: #r_live_headers at: 'payload') equals: ''.
	self assert: (self resultAt: #r_live_headers at: 'content_type')
		equals: 'text/plain'.
	self assert: (self resultAt: #r_live_headers at: 'body') equals: 'hi'.
%

category: 'Grail-Tests'
method: HttpClientTestCase
testHeaderChecksAgreeWithCPython
	"The fixture carries 50+ expectations MEASURED against CPython 3.14
	and re-checked by scripts/check_python_fixtures.sh on every run.
	Rather than restate them in Topaz, assert here that Grail agrees
	with every one of them; the failing labels come back in 'failures'."

	self assert: (self resultAt: #r_selfcheck at: 'failures') equals: ''.
	self assert: (self resultAt: #r_selfcheck at: 'ok').
	self assert: (self resultAt: #r_selfcheck at: 'count') > 40.
%
