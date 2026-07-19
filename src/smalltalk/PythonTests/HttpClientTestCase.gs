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
