! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UrlopenCleanupAndErrorCloseTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UrlopenCleanupAndErrorCloseTestCase comment:
'``urllib.request.urlcleanup'' exists, and an HTTPError is a closable
response.

Two small gaps, both of which cost far more than their size.

urlcleanup was ABSENT.  Callers invoke it defensively to reset global
state between requests -- test_urllib2_localnet''s TestUrlopen registers
it with addCleanup in setUp -- so its absence raised AttributeError
before a single test in that class could run.  Fifteen tests lost to one
missing name, and none of the failures mentioned urlcleanup in a way that
suggested a one-line cause.  Implemented over state the module now OWNS
(``_url_tempfiles'' and ``_opener'', in CPython''s shape) rather than as
a bare no-op, so a urlretrieve or install_opener added later is correct
by construction instead of by remembering.

HTTPError carried read/info/geturl but not ``close''.  In CPython an
HTTPError IS a response -- it subclasses addinfourl -- so callers use the
error exactly as a successful response: ``data = f.read(); f.close()''.
That ordinary pairing raised AttributeError on the SECOND line, after the
read had worked.  __enter__/__exit__ come with it, since a response is
also a context manager.

The fp is CLOSED, not dropped.  The first cut set ``self.fp = None'',
which made a read after close answer b'' where CPython raises ValueError
from the file itself -- the kind of divergence a caller never notices
until it matters.  The fixture pins the raise.

test.test_urllib2_localnet 21 -> 9.  What remains is six tests needing
the opener/handler chain the module documents as unsupported, plus SNI
callbacks and header-case preservation.

See tests/python/urlopen_cleanup_and_error_close.py (12 checks,
CPython-validated first).'
%

expectvalue /Class
doit
UrlopenCleanupAndErrorCloseTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UrlopenCleanupAndErrorCloseTestCase removeAllMethods: 0.
UrlopenCleanupAndErrorCloseTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UrlopenCleanupAndErrorCloseTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'urlopen_cleanup_and_error_close' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/urlopen_cleanup_and_error_close.py')
		name: 'urlopen_cleanup_and_error_close'.
%

category: 'Grail-Helpers'
method: UrlopenCleanupAndErrorCloseTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UrlopenCleanupAndErrorCloseTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UrlopenCleanupAndErrorCloseTestCase
testUrlcleanupIsCallable
	"Present, answering None, and repeatable -- which is how defensive
	callers use it, often with nothing to clean."

	self assertAll: #('urlcleanup_exists' 'urlcleanup_returns_none'
		'urlcleanup_is_repeatable')
%

category: 'Grail-Tests'
method: UrlopenCleanupAndErrorCloseTestCase
testAnHttpErrorClosesLikeAResponse
	"read-then-close, idempotent close, close with no body at all, and the
	context-manager form -- plus the raise CPython gives for a read AFTER
	close, which is the half a dropped fp would have hidden."

	self assertAll: #('read_then_close' 'close_is_idempotent'
		'close_without_a_body' 'reading_after_close_raises'
		'usable_as_a_context_manager')
%

category: 'Grail-Tests'
method: UrlopenCleanupAndErrorCloseTestCase
testItIsStillAnErrorAfterAll
	"Closing must not cost the error its identity: the code survives, the
	response accessors still answer, and it raises and catches as a
	URLError."

	self assertAll: #('code_survives_close' 'geturl_still_works'
		'getcode_still_works' 'still_an_exception')
%
