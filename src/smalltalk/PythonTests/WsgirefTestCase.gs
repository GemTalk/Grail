! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WsgirefTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WsgirefTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WsgirefTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
WsgirefTestCase removeAllMethods: 0.
WsgirefTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - headers'
method: WsgirefTestCase
testHeadersBasics
	| result |
	result := self eval: 'from wsgiref.headers import Headers
h = Headers()
h["Content-Type"] = "text/plain"
h.add_header("Set-Cookie", "a=1")
h.add_header("Set-Cookie", "b=2")
(h["content-type"] == "text/plain"
 and h.get_all("set-cookie") == ["a=1", "b=2"]
 and "SET-COOKIE" in h and "X-Nope" not in h
 and h["missing"] is None and len(h) == 3)'.
	self assert: result
%

category: 'Grail-Tests - headers'
method: WsgirefTestCase
testHeadersReplaceDeleteAndString
	| result |
	result := self eval: 'from wsgiref.headers import Headers
h = Headers([("X-A", "1"), ("x-a", "2"), ("X-B", "3")])
h["X-A"] = "replaced"
del h["X-B"]
(h.get_all("x-a") == ["replaced"] and "x-b" not in h
 and str(h) == "X-A: replaced\r\n\r\n")'.
	self assert: result
%

category: 'Grail-Tests - headers'
method: WsgirefTestCase
testAddHeaderWithParams
	| result |
	result := self eval: 'from wsgiref.headers import Headers
h = Headers()
h.add_header("Content-Disposition", "attachment", filename="report.csv")
h["Content-Disposition"] == ''attachment; filename="report.csv"'''.
	self assert: result
%

category: 'Grail-Tests - util'
method: WsgirefTestCase
testRequestUri
	| result |
	result := self eval: 'from wsgiref.util import request_uri, application_uri
environ = {
    "wsgi.url_scheme": "http",
    "HTTP_HOST": "example.com:8080",
    "SCRIPT_NAME": "/app",
    "PATH_INFO": "/things/7",
    "QUERY_STRING": "k=v",
    "SERVER_NAME": "ignored",
    "SERVER_PORT": "8080",
}
(request_uri(environ) == "http://example.com:8080/app/things/7?k=v"
 and request_uri(environ, False) == "http://example.com:8080/app/things/7"
 and application_uri(environ) == "http://example.com:8080/app")'.
	self assert: result
%

category: 'Grail-Tests - util'
method: WsgirefTestCase
testShiftPathInfo
	| result |
	result := self eval: 'from wsgiref.util import shift_path_info
environ = {"SCRIPT_NAME": "", "PATH_INFO": "/api/items"}
first = shift_path_info(environ)
mid = (environ["SCRIPT_NAME"], environ["PATH_INFO"])
second = shift_path_info(environ)
last = (environ["SCRIPT_NAME"], environ["PATH_INFO"])
done = shift_path_info(environ)
(first == "api" and mid == ("/api", "/items")
 and second == "items" and last == ("/api/items", "")
 and done is None)'.
	self assert: result
%

category: 'Grail-Tests - util'
method: WsgirefTestCase
testSetupTestingDefaultsAndFileWrapper
	| result |
	result := self eval: 'from wsgiref.util import setup_testing_defaults, FileWrapper
import io
environ = {"REQUEST_METHOD": "POST"}
setup_testing_defaults(environ)
buf = io.StringIO("abcdefghij")
chunks = list(FileWrapper(buf, 4))
(environ["REQUEST_METHOD"] == "POST"
 and environ["PATH_INFO"] == "/" and environ["wsgi.url_scheme"] == "http"
 and chunks == ["abcd", "efgh", "ij"])'.
	self assert: result
%
