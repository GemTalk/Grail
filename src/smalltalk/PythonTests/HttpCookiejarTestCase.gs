! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpCookiejarTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpCookiejarTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpCookiejarTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpCookiejarTestCase - http.cookiejar (RFC 2965 / Netscape cookie handling)
! ===============================================================================
! Grail VENDORS CPython 3.14.6's http/cookiejar.py verbatim into
! src/python/stdlib/http/cookiejar.py, with one adaptation (os.fdopen; see the
! module header).  tests/python/http_cookiejar_conformance.py states the
! expectations as literals and scripts/check_python_fixtures.sh runs it under
! real CPython 3.14, so what this class asserts is measured against CPython and
! not against Grail's own behaviour.
!
! WHY VENDORING WAS THE ROUTE HERE, when the sibling http.client / http.server /
! http.cookies are all hand-rolled subsets: those three have a small public API
! sitting on simple syntax, so a subset is a subset.  This module is one
! interlocking algorithm -- reaching extract_cookies/add_cookie_header goes
! through Set-Cookie/Set-Cookie2 header-word splitting, four date formats, and a
! ~15-predicate domain/path/port/secure policy, each a detail of a written
! specification with no room to be approximately right.  A subset would have
! been a reimplementation of the whole module minus whatever it happened not to
! exercise.  The drop was tried FIRST and it imported and ran unmodified apart
! from os.fdopen, so there was nothing to trade off.
!
! A vendored module still needs a conformance test, for a reason that is not the
! usual one: it is a demanding CLIENT of Grail machinery -- the re engine (a
! dozen patterns, several with named groups and re.X), time/datetime/calendar
! arithmetic, threading.RLock, copy.copy, urllib.parse -- so it can be
! byte-identical to CPython and still behave differently here.  It also drives
! urllib.request.Request, which this change extended and which is NOT vendored.
!
! What is deliberately absent is pinned by testOmissionsAreDeliberate below.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpCookiejarTestCase removeAllMethods.
HttpCookiejarTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - http.cookiejar'
method: HttpCookiejarTestCase
testCookiejarMatchesCPython
	"Every check in tests/python/http_cookiejar_conformance.py, which the
	fixture gate also runs under CPython 3.14.

	The keys are listed rather than iterated so that a check DISAPPEARING is
	a failure too -- a fixture that stopped defining RESULTS entirely would
	otherwise pass this test with an empty loop."

	| mod results keys |
	importlib @env1:modules removeKey: #'http_cookiejar_conformance' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/http_cookiejar_conformance.py')
		name: 'http_cookiejar_conformance'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	keys :=
	#('allowed_domains_excludes' 'allowed_domains_includes' 'blocked_domain'
	  'cleanup' 'clear_all' 'clear_one' 'clear_session_cookies'
	  'clear_unknown_raises' 'cookie_attrs_default_domain'
	  'cookie_attrs_explicit_domain' 'cookie_default_path'
	  'cookie_get_nonstandard_attr' 'cookie_httponly_in_rest'
	  'cookie_repr_shape' 'cookiejar_internals' 'cookies_nested_dict_shape'
	  'corrupt_file_raises_loaderror' 'domain_match_exact'
	  'domain_match_other' 'domain_match_subdomain' 'eff_request_host'
	  'expired_never_stored' 'exports_all' 'extract_len' 'extract_two'
	  'filecookiejar_is_base' 'future_expiry_stored' 'future_expiry_value'
	  'header_lands_in_unredirected' 'header_longest_path_first'
	  'header_path_match' 'header_path_scoped' 'header_subdomain'
	  'header_two_cookies' 'header_unrelated_domain'
	  'hide_cookie2_off_by_default' 'http2time_bare_date' 'http2time_empty'
	  'http2time_junk' 'http2time_loose_is_int' 'http2time_no_weekday'
	  'http2time_rejects_asctime' 'http2time_rfc1123'
	  'http2time_rfc850_two_digit_year' 'http2time_strict_is_float'
	  'is_HDN_ip' 'is_HDN_leading_dot' 'is_HDN_true' 'iso2time_junk'
	  'iso2time_offset' 'iso2time_z' 'jar_repr' 'join_header_words'
	  'join_header_words_quotes' 'liberal_is_HDN' 'loaderror_is_oserror'
	  'lwp_header_line' 'lwp_roundtrip' 'max_age_zero_deletes_v0'
	  'max_age_zero_deletes_v1' 'missing_file_raises' 'mozilla_header_line'
	  'mozilla_roundtrip' 'no_cookie_header_when_empty' 'parse_ns_headers'
	  'policy_is_cookiepolicy' 'reach' 'reach_two_labels' 'request_host'
	  'request_path' 'request_port_default' 'request_port_explicit'
	  'resend_replaces_value' 'rfc2965_off_by_default'
	  'secure_not_sent_over_http' 'secure_sent_over_https'
	  'set_blocked_domains_roundtrip' 'set_cookie_hand_built' 'set_policy'
	  'split_header_words' 'split_header_words_bare'
	  'strict_ns_domain_default' 'time2isoz' 'time2netscape'
	  'user_domain_match_exact').
	keys do: [:key |
		self
			assert: ((results @env1:__getitem__: key) = true)
			description: key , ' -> ' , (results @env1:__getitem__: key) printString].
	self assert: keys size equals: 85
%

category: 'Grail-Tests - http.cookiejar'
method: HttpCookiejarTestCase
testVendoredFileIsTheModuleThatLoads
	"A pre-seeded sys.modules entry, or a Smalltalk module of the same name,
	would make src/python/stdlib/http/cookiejar.py unreachable SILENTLY --
	the import succeeds, it is just a different module.  So do not settle
	for ``the import worked'': check __file__, and check for a name that
	exists ONLY in the vendored file (_open_cookie_file_for_write is Grail's
	one adaptation and appears in no CPython release).

	The module class name is also asserted: Grail flattens dots, so
	http.cookiejar becomes the class http_cookiejar, and a fixture or module
	that took that name first would collide."

	self assert: (self eval:
'import http.cookiejar as m
m.__file__.endswith(''/src/python/stdlib/http/cookiejar.py'')
') equals: true.
	self assert: (self eval:
'import http.cookiejar as m
hasattr(m, ''_open_cookie_file_for_write'')
') equals: true.
	self assert: (self eval:
'import http.cookiejar as m
type(m).__name__
') equals: 'http_cookiejar'.
	self assert: (self eval:
'import http.cookiejar as m
m.__name__
') equals: 'http.cookiejar'
%

category: 'Grail-Tests - http.cookiejar'
method: HttpCookiejarTestCase
testImportShapes
	"The spellings the real callers use.  requests/compat.py opens with

	    from http import cookiejar as cookielib

	and that line was the ImportError that stopped ``import kaggle'' dead;
	requests/cookies.py then does

	    from http.cookiejar import Cookie, CookieJar, CookiePolicy

	and SUBCLASSES CookieJar, so those names must bind the classes."

	self assert: (self eval:
'from http import cookiejar as cookielib
cookielib.__name__
') equals: 'http.cookiejar'.
	self assert: (self eval:
'from http.cookiejar import Cookie, CookieJar, CookiePolicy
Cookie.__name__ + '','' + CookieJar.__name__ + '','' + CookiePolicy.__name__
') equals: 'Cookie,CookieJar,CookiePolicy'.
	self assert: (self eval:
'from http.cookiejar import CookieJar, DefaultCookiePolicy
class MyJar(CookieJar):
    pass
j = MyJar()
isinstance(j, CookieJar) and isinstance(j._policy, DefaultCookiePolicy)
') equals: true.
	self assert: (self eval:
'from http.cookiejar import MozillaCookieJar, LWPCookieJar, FileCookieJar, LoadError
repr((issubclass(MozillaCookieJar, FileCookieJar),
      issubclass(LWPCookieJar, FileCookieJar),
      issubclass(LoadError, OSError)))
') equals: '(True, True, True)'
%

category: 'Grail-Tests - http.cookiejar'
method: HttpCookiejarTestCase
testRequestCarriesThePolicySurface
	"urllib.request.Request is NOT vendored -- Grail's is a small hand-written
	class -- and CookiePolicy reads eight things off a request.  Before this
	change it had four of them, and ``jar.extract_cookies(resp, Request(url))''
	died on request.unverifiable.  Pin the whole surface, because the failure
	mode of a missing one is an AttributeError deep inside vendored code."

	self assert: (self eval:
'import urllib.request
r = urllib.request.Request(''http://www.example.com:8080/a/b?q=1'')
missing = [n for n in (''type'', ''host'', ''selector'', ''origin_req_host'',
                       ''unverifiable'', ''unredirected_hdrs'',
                       ''has_header'', ''get_header'',
                       ''add_unredirected_header'', ''header_items'',
                       ''remove_header'', ''get_full_url'')
           if not hasattr(r, n)]
len(missing)
') equals: 0.
	self assert: (self eval:
'import urllib.request
r = urllib.request.Request(''http://www.example.com:8080/a/b?q=1'')
repr((r.type, r.host, r.selector, r.origin_req_host, r.unverifiable))
') equals: '(''http'', ''www.example.com:8080'', ''/a/b?q=1'', ''www.example.com'', False)'.
	"origin_req_host is host-only and lowercased, and drops userinfo."
	self assert: (self eval:
'import urllib.request
urllib.request.Request(''http://User@WWW.Example.COM:8080/'').origin_req_host
') equals: 'www.example.com'.
	"add_unredirected_header is a separate store from add_header, and
	 get_header/has_header see both.  That separation is the point: a
	 redirect to another host must not re-send the Cookie header."
	self assert: (self eval:
'import urllib.request
r = urllib.request.Request(''http://www.example.com/'')
r.add_header(''Accept'', ''text/html'')
r.add_unredirected_header(''Cookie'', ''a=1'')
repr((r.headers, r.unredirected_hdrs, r.has_header(''Cookie''),
      r.get_header(''Accept''), r.get_header(''Cookie'')))
') equals: '({''Accept'': ''text/html''}, {''Cookie'': ''a=1''}, True, ''text/html'', ''a=1'')'
%

category: 'Grail-Tests - http.cookiejar'
method: HttpCookiejarTestCase
testOmissionsAreDeliberate
	"The boundary of what landed, written down as a decision rather than
	left as an oversight.

	1. os.fdopen.  CPython's FileCookieJar.save creates the cookie file
	   mode 0600 through os.open/os.fdopen so it is never world-readable.
	   Grail's os module has no file-descriptor layer at all, so the two
	   save sites go through _open_cookie_file_for_write, which uses
	   builtin open() -- and the saved file therefore gets the process
	   umask.  That is a REAL deviation with a security consequence on a
	   multi-user host, not a cosmetic one.  This test asserts the os gap
	   still exists; when os.open/os.fdopen arrive it fails, which is the
	   reminder to restore the original two lines.

	2. HTTPCookieProcessor.  In CPython it lives in urllib.request, not
	   here, and it needs the opener/handler chain that Grail's urlopen()
	   does not have.  A caller wires a jar up by hand instead:
	   add_cookie_header before the call, extract_cookies after.  Stubbing
	   it would let code that expects automatic cookie handling get
	   something that merely looks like it."

	self assert: (self eval:
'import os
len([n for n in (''open'', ''fdopen'', ''close'', ''chmod'') if hasattr(os, n)])
') equals: 0.
	self assert: (self eval:
'import urllib.request
hasattr(urllib.request, ''HTTPCookieProcessor'') or hasattr(urllib.request, ''build_opener'')
') equals: false.
	"MSIECookieJar and the bsddb-backed jars are not in CPython's __all__
	 either -- they are Windows/bsddb specific and the vendored file does
	 not define them."
	self assert: (self eval:
'import http.cookiejar as m
len([n for n in (''MSIECookieJar'', ''BSDDBCookieJar'', ''MSIEDBCookieJar'')
     if hasattr(m, n)])
') equals: 0
%
