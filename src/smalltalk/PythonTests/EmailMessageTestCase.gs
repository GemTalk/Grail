! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EmailMessageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EmailMessageTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
EmailMessageTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
EmailMessageTestCase removeAllMethods: 0.
EmailMessageTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - parsing'
method: EmailMessageTestCase
testParseSimpleMessage
	"Headers (case-insensitive, first-wins), folded continuation, body."

	| result |
	result := self eval: 'import email
src = "From: a@example.com\nTo: b@example.com\nSubject: a folded\n subject line\nX-Dup: one\nX-Dup: two\n\nbody line 1\nbody line 2"
m = email.message_from_string(src)
(m["from"] == "a@example.com"
 and m["SUBJECT"] == "a folded subject line"
 and m["x-dup"] == "one"
 and m.get_all("X-Dup") == ["one", "two"]
 and m.get_payload() == "body line 1\nbody line 2"
 and not m.is_multipart()
 and "to" in m and "X-Nope" not in m)'.
	self assert: result
%

category: 'Grail-Tests - parsing'
method: EmailMessageTestCase
testParseMultipart
	| result |
	result := self eval: 'import email
src = "MIME-Version: 1.0\nContent-Type: multipart/mixed; boundary=XYZ\n\npreamble here\n--XYZ\nContent-Type: text/plain\n\nfirst part\n--XYZ\nContent-Type: text/html\n\n<p>second</p>\n--XYZ--\n"
m = email.message_from_string(src)
parts = m.get_payload()
(m.is_multipart() and len(parts) == 2
 and m.get_boundary() == "XYZ"
 and parts[0].get_content_type() == "text/plain"
 and parts[0].get_payload() == "first part"
 and parts[1].get_content_type() == "text/html"
 and parts[1].get_payload() == "<p>second</p>"
 and m.preamble == "preamble here"
 and len(list(m.walk())) == 3)'.
	self assert: result
%

category: 'Grail-Tests - parsing'
method: EmailMessageTestCase
testContentTypeAndParams
	| result |
	result := self eval: 'import email
src = ''Content-Type: text/html; charset="utf-8"; name=page.html\nContent-Disposition: attachment; filename="report.csv"\n\nx''
m = email.message_from_string(src)
(m.get_content_type() == "text/html"
 and m.get_content_maintype() == "text"
 and m.get_content_subtype() == "html"
 and m.get_content_charset() == "utf-8"
 and m.get_param("name") == "page.html"
 and m.get_filename() == "report.csv")'.
	self assert: result
%

category: 'Grail-Tests - parsing'
method: EmailMessageTestCase
testBase64PayloadDecode
	| result |
	result := self eval: 'import email
src = "Content-Type: application/octet-stream\nContent-Transfer-Encoding: base64\n\naGVsbG8gd29ybGQ="
m = email.message_from_string(src)
m.get_payload(decode=True) == b"hello world"'.
	self assert: result
%

category: 'Grail-Tests - building'
method: EmailMessageTestCase
testBuildAndRoundTrip
	"Build a message programmatically, serialize, reparse."

	| result |
	result := self eval: 'import email
from email.message import Message
m = Message()
m["From"] = "x@y.z"
m["Subject"] = "round trip"
m.add_header("Content-Disposition", "attachment", filename="f.txt")
m.set_payload("the body")
back = email.message_from_string(m.as_string())
(back["from"] == "x@y.z" and back["subject"] == "round trip"
 and back.get_filename() == "f.txt"
 and back.get_payload() == "the body")'.
	self assert: result
%

category: 'Grail-Tests - building'
method: EmailMessageTestCase
testMultipartRoundTrip
	| result |
	result := self eval: 'import email
from email.message import Message
outer = Message()
outer["Content-Type"] = ''multipart/mixed; boundary="B42"''
p1 = Message()
p1["Content-Type"] = "text/plain"
p1.set_payload("alpha")
p2 = Message()
p2["Content-Type"] = "text/plain"
p2.set_payload("beta")
outer.attach(p1)
outer.attach(p2)
back = email.message_from_string(outer.as_string())
parts = back.get_payload()
(back.is_multipart() and len(parts) == 2
 and parts[0].get_payload() == "alpha" and parts[1].get_payload() == "beta")'.
	self assert: result
%

category: 'Grail-Tests - building'
method: EmailMessageTestCase
testHeaderMutation
	"__setitem__ APPENDS (email semantics); del removes all;
	replace_header replaces the first and errors when absent."

	| result |
	result := self eval: 'import email
from email.message import Message
m = Message()
m["X-A"] = "1"
m["X-A"] = "2"
appended = m.get_all("x-a") == ["1", "2"]
m.replace_header("X-A", "replaced")
replaced = m.get_all("x-a") == ["replaced", "2"]
del m["X-A"]
gone = "x-a" not in m
try:
    m.replace_header("X-Missing", "v")
    missing = False
except KeyError:
    missing = True
appended and replaced and gone and missing'.
	self assert: result
%

category: 'Grail-Tests - building'
method: EmailMessageTestCase
testEmailMessageSetContent
	| result |
	result := self eval: 'import email
from email.message import EmailMessage
m = EmailMessage()
m["Subject"] = "modern"
m.set_content("hello", "html")
(m.get_content_type() == "text/html"
 and m.get_content() == "hello"
 and m.get_content_charset() == "utf-8")'.
	self assert: result
%

category: 'Grail-Tests - building'
method: EmailMessageTestCase
testMessageFromBytes
	| result |
	result := self eval: 'import email
m = email.message_from_bytes(b"Subject: from bytes\n\npayload")
m["subject"] == "from bytes" and m.get_payload() == "payload"'.
	self assert: result
%
