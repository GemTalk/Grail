! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpCookiesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpCookiesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpCookiesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpCookiesTestCase
!
! Exercises http.cookies SimpleCookie / BaseCookie / Morsel: value
! quoting (space-wrap, octal escape), reserved-attribute rendering in
! sorted order, header-string parsing, quote/unquote round-tripping,
! dict construction, and CookieError on bad attributes.  Drives
! tests/python/use_http_cookies.py, which stashes results in a dict.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpCookiesTestCase removeAllMethods.
HttpCookiesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: HttpCookiesTestCase
setUp
	"Reload tests/python/use_http_cookies.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'use_http_cookies' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_http_cookies.py')
		name: 'use_http_cookies'.
%

category: 'Grail-Private'
method: HttpCookiesTestCase
resultAt: key
	"Read a value the fixture stashed in its module-level dict ``r``."

	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testBasicSetAndOutput
	self assert: (self resultAt: 'basic_value') equals: 'value'.
	self assert: (self resultAt: 'basic_coded') equals: 'value'.
	self assert: (self resultAt: 'basic_key') equals: 'name'.
	self assert: (self resultAt: 'basic_output') equals: 'Set-Cookie: name=value'.
	self assert: (self resultAt: 'basic_str') equals: 'Set-Cookie: name=value'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testReservedAttributesSorted
	"Domain / HttpOnly (flag) / Path render in sorted key order."

	self assert: (self resultAt: 'attr_output')
		equals: 'Set-Cookie: sid=abc123; Domain=example.com; HttpOnly; Path=/'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testQuoting
	"A space wraps the value in doublequotes; a separator char is
	octal-escaped inside the quotes."

	self assert: (self resultAt: 'space_value') equals: 'a b'.
	self assert: (self resultAt: 'space_coded') equals: '"a b"'.
	self assert: (self resultAt: 'semi_value') equals: 'a;b'.
	self assert: (self resultAt: 'semi_coded') equals: '"a\073b"'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testBaseCookieDoesNotQuote
	self assert: (self resultAt: 'base_coded') equals: 'a b'.
	self assert: (self resultAt: 'base_output') equals: 'Set-Cookie: k=a b'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testLoadPairs
	self assert: (self resultAt: 'load_chips') equals: 'ahoy'.
	self assert: (self resultAt: 'load_vienna') equals: 'finger'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testLoadAttributes
	self assert: (self resultAt: 'load_attr_value') equals: 'value'.
	self assert: (self resultAt: 'load_attr_path') equals: '/'.
	self assert: (self resultAt: 'load_attr_domain') equals: 'example.com'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testLoadQuotedAndRoundTrip
	"A quoted value with an octal escape decodes; a special char
	survives quote-then-unquote."

	self assert: (self resultAt: 'load_quoted') equals: 'Hello, World'.
	self assert: (self resultAt: 'roundtrip') equals: 'p;q'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testConstructFromDict
	self assert: (self resultAt: 'fromdict_a') equals: '1'.
	self assert: (self resultAt: 'fromdict_b') equals: '2'.
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testInvalidAttributeRaises
	self assert: (self resultAt: 'invalid_attr_raises').
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testMorselDirectApi
	self assert: (self resultAt: 'morsel_key') equals: 'color'.
	self assert: (self resultAt: 'morsel_value') equals: 'blue'.
	self assert: (self resultAt: 'morsel_reserved').
	self deny: (self resultAt: 'morsel_not_reserved').
%

category: 'Grail-Tests'
method: HttpCookiesTestCase
testMultipleCookiesSorted
	self assert: (self resultAt: 'multi_count') equals: 2.
	self assert: (self resultAt: 'multi_line0') equals: 'Set-Cookie: a=1'.
	self assert: (self resultAt: 'multi_line1') equals: 'Set-Cookie: b=2'.
%
