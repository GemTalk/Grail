! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StdlibLongTailTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StdlibLongTailTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StdlibLongTailTestCase comment:
'Eleven small, independent stdlib gaps, each of which was measured as the FIRST
error raised by importing a real pip-installed package.

  atexit (absent)                    certifi, tqdm, colorama
  str.maketrans (wrong arity)        wcwidth, humanize
  pkgutil.get_data                   python-slugify, text_unidecode
  importlib.util.spec_from_loader    six
  typing.ForwardRef                  typing_extensions
  os.supports_fd                     filelock
  inspect.Signature.replace          decorator
  contextlib.redirect_stdout         (no single package; widely used)
  http.client.IncompleteRead         urllib3
  urllib.parse.urldefrag             kaggle (via requests.compat)
  urllib.request proxy family        kaggle (via requests.compat)

They have nothing in common except that shape -- one missing name standing
between Grail and a package that would otherwise import -- so they are tested
together rather than scattered across eleven files.

The last two are the wider ones: requests.compat imports urldefrag from
urllib.parse and getproxies / getproxies_environment / proxy_bypass /
proxy_bypass_environment from urllib.request, and requests then CALLS the proxy
family on every request, so the behaviour had to be right and not just the
name.  Their expectations live in tests/python/urllib_defrag_and_proxies.py,
which is self-running and therefore measured against real CPython by
scripts/check_python_fixtures.sh.

Four of them are deliberately LESS than CPython, and the tests say so rather
than papering over it: atexit keeps the registry but never fires it by itself
(a gem has no observable shutdown); http.client.IncompleteRead is a name and a
shape that Grail''s HTTPResponse does not yet raise; urldefrag returns the URL
exactly as given where CPython lowercases the scheme; and
getproxies_environment cannot honour an EMPTY proxy variable, because GemStone
has no representation for one -- setting a variable to the empty string is
precisely how it unsets it.'
%

expectvalue /Class
doit
StdlibLongTailTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
StdlibLongTailTestCase removeAllMethods: 0.
StdlibLongTailTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: StdlibLongTailTestCase
withSysPathRestoredDo: aBlock
	"Run aBlock, then put sys.path back exactly as it was.  sys.path is SESSION
	state shared by every test in the shard, so a test that appends to it and
	does not clean up changes what the next test resolves."

	| p saved |
	p := (sys @env1:instance) @env0:at: #path.
	saved := p asArray.
	^ [aBlock value] ensure: [
		p size: 0.
		saved do: [:each | p add: each]]
%

category: 'Grail-Tests - atexit'
method: StdlibLongTailTestCase
testAtexitRunsCallbacksMostRecentFirst
	"The registry is faithful -- registration order, LIFO firing, and the
	handlers are consumed -- even though Grail never fires it on its own.
	certifi, tqdm and colorama each register a cleanup at import time and never
	look at it again, so a registry that ACCEPTS the registration is the whole
	of what they need; before this module existed, ``import certifi'' failed on
	the import line."

	| result |
	result := self eval: 'import atexit
atexit._clear()
_calls = []
def _cb(x):
    _calls.append(x)
atexit.register(_cb, 1)
atexit.register(_cb, 2)
_n = atexit._ncallbacks()
atexit._run_exitfuncs()
(_n == 2 and _calls == [2, 1] and atexit._ncallbacks() == 0)'.
	self assert: result
%

category: 'Grail-Tests - atexit'
method: StdlibLongTailTestCase
testAtexitRegisterAnswersTheFunctionAndUnregisterRemovesIt
	"register() answers its argument, which is what makes ``@atexit.register''
	work as a decorator."

	| result |
	result := self eval: 'import atexit
atexit._clear()
def _cb():
    pass
_r = atexit.register(_cb)
_mid = atexit._ncallbacks()
atexit.unregister(_cb)
(_r is _cb and _mid == 1 and atexit._ncallbacks() == 0)'.
	self assert: result
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransTwoArgumentForm
	"The arity that wcwidth and humanize call at import time.  Every arity used
	to fail: the only maketrans here was a UNARY stub that raised ``Not yet
	implemented''."

	| result |
	result := self eval: '"abc".translate(str.maketrans("abc", "xyz")) == "xyz"'.
	self assert: result
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransThreeArgumentFormDeletesAfterMapping
	"The third argument deletes, and it is applied AFTER the pairwise mapping,
	so a character named in both is deleted rather than replaced."

	| result |
	result := self eval: '"hello world".translate(str.maketrans("lo", "01", " ")) == "he001w1r0d"'.
	self assert: result
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransOneArgumentFormTakesStringOrIntKeys
	"A one-argument table is a mapping whose keys are either one-character
	strings or integer codepoints; both are normalised to the codepoint that
	str.translate looks up."

	| result |
	result := self eval: '"abc".translate(str.maketrans({"a": "X", 98: None})) == "Xc"'.
	self assert: result
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransIsSpelledOnTheClassNotTheInstance
	"CPython's str.maketrans is a STATICMETHOD, so an instance reaches it too.
	Grail offers only the CLASS spelling, and that is a MEASURED decision rather
	than an omission: delegating instance-side methods were written, and they made
	things worse.  With them in place Grail resolved ``str.maketrans(x)'' as an
	unbound instance method and bound x as the RECEIVER -- humanize's one-argument
	call arrived with ZERO arguments, and wcwidth's ``str.maketrans('', '', chars)''
	arrived as the two-argument form with mismatched lengths.  This pins the
	spelling every real caller uses."

	| result |
	result := self eval: 'str.maketrans("a", "z") == {97: 122}'.
	self assert: result
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransRejectsUnequalLengths
	self
		should: [self eval: 'str.maketrans("ab", "xyz")']
		raise: ValueError
%

category: 'Grail-Tests - str.maketrans'
method: StdlibLongTailTestCase
testMaketransRejectsANonMappingSingleArgument
	self
		should: [self eval: 'str.maketrans("ab")']
		raise: TypeError
%

category: 'Grail-Tests - pkgutil'
method: StdlibLongTailTestCase
testPkgutilGetDataReadsAFileBesideThePackage
	"python-slugify and text_unidecode both load their data tables this way at
	import time.  Grail's loader has no get_data, so this resolves the package
	to its __file__ and reads the file beside it -- which is what CPython's own
	filesystem loader does in the end."

	| result |
	self eval: 'import os
_d = "$TMP/llt_pkg"
if not os.path.isdir(_d):
    os.makedirs(_d)
with open(_d + "/__init__.py", "w") as _f:
    _f.write("NAME = \"llt_pkg\"\n")
with open(_d + "/table.txt", "w") as _f:
    _f.write("payload")'.
	result := self withSysPathRestoredDo: [
		self eval: 'import sys, pkgutil
sys.path.append("$TMP")
pkgutil.get_data("llt_pkg", "table.txt") == b"payload"'].
	self assert: result
%

category: 'Grail-Tests - pkgutil'
method: StdlibLongTailTestCase
testPkgutilGetDataAnswersNoneForAModuleWithNoFile
	"CPython's contract for a package with no __file__ is None, not an error."

	| result |
	result := self eval: 'import pkgutil
pkgutil.get_data("sys", "anything") is None'.
	self assert: result
%

category: 'Grail-Tests - importlib.util'
method: StdlibLongTailTestCase
testSpecFromLoaderAsksTheLoaderWhetherItIsAPackage
	"six installs a meta-path importer for its ``six.moves'' shims and asks for
	a spec this way; without it ``import six'' failed at module scope.  An empty
	search-location list is what marks a spec as a package."

	| result |
	result := self eval: 'import importlib.util
class _PkgLoader:
    def is_package(self, name):
        return True
class _ModLoader:
    def is_package(self, name):
        return False
_p = importlib.util.spec_from_loader("llt_pkgmod", _PkgLoader())
_m = importlib.util.spec_from_loader("llt_plainmod", _ModLoader())
(_p.name == "llt_pkgmod" and _p.submodule_search_locations == []
 and _m.submodule_search_locations is None)'.
	self assert: result
%

category: 'Grail-Tests - importlib.util'
method: StdlibLongTailTestCase
testSpecFromLoaderToleratesALoaderThatCannotAnswer
	"A loader is free not to implement is_package -- Grail's own _Loader does
	not -- so the question is asked with getattr and skipped when it cannot be."

	| result |
	result := self eval: 'import importlib.util
class _Bare:
    pass
_s = importlib.util.spec_from_loader("llt_bare", _Bare(), origin="frozen")
(_s.name == "llt_bare" and _s.origin == "frozen"
 and _s.submodule_search_locations is None)'.
	self assert: result
%

category: 'Grail-Tests - typing'
method: StdlibLongTailTestCase
testTypingForwardRefIsARealClassCarryingItsArgument
	"typing_extensions both TYPE-TESTS ForwardRef and reads
	__forward_arg__, so a _StubGeneric placeholder would not have done."

	| result |
	result := self eval: 'import typing
_r = typing.ForwardRef("Foo")
(isinstance(_r, typing.ForwardRef)
 and _r.__forward_arg__ == "Foo"
 and _r._evaluate(None, None) == "Foo"
 and _r == typing.ForwardRef("Foo")
 and _r != typing.ForwardRef("Bar"))'.
	self assert: result
%

category: 'Grail-Tests - typing'
method: StdlibLongTailTestCase
testTypingForwardRefRejectsANonString
	self
		should: [self eval: 'import typing
typing.ForwardRef(42)']
		raise: TypeError
%

category: 'Grail-Tests - os'
method: StdlibLongTailTestCase
testOsSupportsSetsExistAndAreEmpty
	"Empty is the HONEST answer, not a placeholder: no Grail os function takes
	a file descriptor or a dir_fd.  filelock probes these at import time, and
	an empty set both lets it import AND steers it onto the path-based branch,
	which is the branch Grail can serve."

	| result |
	result := self eval: 'import os
(len(os.supports_fd) == 0 and len(os.supports_dir_fd) == 0
 and len(os.supports_follow_symlinks) == 0
 and len(os.supports_effective_ids) == 0)'.
	self assert: result
%

category: 'Grail-Tests - inspect'
method: StdlibLongTailTestCase
testSignatureReplaceChangesOneFieldAndCopies
	"The ``decorator'' package builds every wrapper's signature this way."

	| result |
	result := self eval: 'import inspect
_p = inspect.Parameter("x", inspect.Parameter.POSITIONAL_OR_KEYWORD)
_s = inspect.Signature([_p])
_s2 = _s.replace(return_annotation=int)
_s3 = _s.replace(parameters=[])
(_s2.return_annotation is int
 and list(_s2.parameters) == ["x"]
 and list(_s3.parameters) == []
 and _s.return_annotation is inspect.Signature.empty
 and list(_s.parameters) == ["x"])'.
	self assert: result
%

category: 'Grail-Tests - inspect'
method: StdlibLongTailTestCase
testParameterReplaceChangesOneFieldAndCopies
	| result |
	result := self eval: 'import inspect
_p = inspect.Parameter("x", inspect.Parameter.POSITIONAL_OR_KEYWORD)
_q = _p.replace(name="y")
(_q.name == "y" and _q.kind is _p.kind and _p.name == "x")'.
	self assert: result
%

category: 'Grail-Tests - inspect'
method: StdlibLongTailTestCase
testReplaceDistinguishesAnOmittedArgumentFromNone
	"The sentinel cannot be None and cannot be Parameter.empty: both are
	legitimate values, so either would make replace(default=None) look like
	replace()."

	| result |
	result := self eval: 'import inspect
_p = inspect.Parameter("x", inspect.Parameter.POSITIONAL_OR_KEYWORD, default=1)
(_p.replace().default == 1 and _p.replace(default=None).default is None)'.
	self assert: result
%

category: 'Grail-Tests - contextlib'
method: StdlibLongTailTestCase
testRedirectStdoutCapturesPrint
	"print() reads sys.stdout at CALL time, which is what makes redirection
	work at all (see PrintOutputRoutingTestCase).

	The restore assertion is against WHAT IT WAS, not against None.  Grail's
	default sys.stdout is None (the console), but sys.stdout is session state a
	harness may already have redirected -- these three tests were written
	against None, passed alone, and failed in the shard run for exactly that
	reason.  ``restored to what it was'' is also the promise the manager
	actually makes."

	| result |
	result := self eval: 'import contextlib, io, sys
_before = sys.stdout
_buf = io.StringIO()
with contextlib.redirect_stdout(_buf):
    print("captured")
(_buf.getvalue() == "captured\n" and sys.stdout is _before)'.
	self assert: result
%

category: 'Grail-Tests - contextlib'
method: StdlibLongTailTestCase
testRedirectStdoutNestsDifferentTargets
	"Two managers nested: the inner one unwinds to the outer target, and the
	outer one to the original.

	Note this does NOT exercise the saved-target STACK -- each manager is a
	separate object with its own slot, so one slot each would do.  Measured:
	replacing the stack with a single slot leaves this test green.  The next
	test is the one that needs it."

	| result |
	result := self eval: 'import contextlib, io, sys
_before = sys.stdout
_a = io.StringIO()
_b = io.StringIO()
with contextlib.redirect_stdout(_a):
    print("outer")
    with contextlib.redirect_stdout(_b):
        print("inner")
    print("outer again")
(_a.getvalue() == "outer\nouter again\n" and _b.getvalue() == "inner\n"
 and sys.stdout is _before)'.
	self assert: result
%

category: 'Grail-Tests - contextlib'
method: StdlibLongTailTestCase
testRedirectStdoutReusesOneManagerReentrantly
	"ONE manager entered twice -- which is what the saved-target stack is for,
	and the only shape that can tell a stack from a single slot.  With a single
	slot the inner exit consumes the only saved target and the outer exit pops
	an empty list."

	| result |
	result := self eval: 'import contextlib, io, sys
_before = sys.stdout
_buf = io.StringIO()
_mgr = contextlib.redirect_stdout(_buf)
with _mgr:
    print("outer")
    with _mgr:
        print("inner")
    _still_redirected = sys.stdout is _buf
    print("after inner")
(_buf.getvalue() == "outer\ninner\nafter inner\n"
 and _still_redirected and sys.stdout is _before)'.
	self assert: result
%

category: 'Grail-Tests - contextlib'
method: StdlibLongTailTestCase
testRedirectStderrRestoresOnAnException
	| result |
	result := self eval: 'import contextlib, io, sys
_before = sys.stderr
_buf = io.StringIO()
try:
    with contextlib.redirect_stderr(_buf):
        raise ValueError("boom")
except ValueError:
    pass
sys.stderr is _before'.
	self assert: result
%

category: 'Grail-Tests - http.client'
method: StdlibLongTailTestCase
testIncompleteReadCarriesPartialAndExpected
	"urllib3 imports this by name at module scope, so its absence stopped
	``import urllib3'' on the import line.  This is the NAME and the SHAPE:
	Grail's HTTPResponse still answers a short read rather than raising it, so
	a caller's ``except IncompleteRead'' compiles and never fires."

	| result |
	result := self eval: 'import http.client as _h
_e = _h.IncompleteRead(b"abc", 5)
_f = _h.IncompleteRead(b"abc")
(isinstance(_e, _h.HTTPException)
 and _e.partial == b"abc" and _e.expected == 5
 and _f.expected is None
 and repr(_e) == "IncompleteRead(3 bytes read, 5 more expected)"
 and repr(_f) == "IncompleteRead(3 bytes read)")'.
	self assert: result
%

! ===============================================================================
! urllib.parse.urldefrag and the urllib.request proxy-environment family
!
! The same shape as the nine gaps above, measured the same way: with urllib3 and
! bleach importing, ``import kaggle'' failed on requests/compat.py's
!
!     from urllib.parse import ..., urldefrag, ...
!     from urllib.request import getproxies, getproxies_environment,
!                                proxy_bypass, proxy_bypass_environment
!
! -- one missing name, then four more behind it.  requests does not merely
! import them: should_bypass_proxies() calls proxy_bypass() and
! get_environ_proxies() calls getproxies() on every request, so the behaviour
! has to be right, not just the name.
!
! The expectations live in tests/python/urllib_defrag_and_proxies.py, which is
! self-running and therefore measured against real CPython by
! scripts/check_python_fixtures.sh -- not written from a Grail session.
! ===============================================================================

category: 'Grail-helpers'
method: StdlibLongTailTestCase
loadUrllibFixture
	"Load tests/python/urllib_defrag_and_proxies.py fresh."

	importlib @env1:modules removeKey: #'urllib_defrag_and_proxies' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/urllib_defrag_and_proxies.py')
		name: 'urllib_defrag_and_proxies'
%

category: 'Grail-helpers'
method: StdlibLongTailTestCase
assertUrllibChecks: aCollectionOfSelectors
	"Run the named zero-argument checks from the urllib fixture and assert each
	answered true.  Failures are reported BY NAME -- a bare ``assert: false'' on
	a conjunction of six checks says only that one of them moved."

	| fixture failures |
	fixture := self loadUrllibFixture.
	failures := OrderedCollection new.
	aCollectionOfSelectors do: [:each |
		((fixture @env0:perform: each env: 1) = true)
			ifFalse: [ failures add: each ] ].
	self assert: failures isEmpty
		description: 'checks that did not answer true: ' , failures printString
%

category: 'Grail-Tests - urllib.parse.urldefrag'
method: StdlibLongTailTestCase
testUrldefragSplitsAtTheFirstFragmentMarker
	"The split is at the FIRST '#'; a missing fragment normalises to '', not
	None, and everything after the first '#' stays in the fragment."

	self assertUrllibChecks: #(
		#'defrag_splits_at_the_hash'
		#'defrag_absent_fragment_is_empty_string'
		#'defrag_trailing_hash_is_an_empty_fragment'
		#'defrag_keeps_later_hashes_in_the_fragment'
		#'defrag_bare_fragment_leaves_an_empty_url'
		#'defrag_relative_url' )
%

category: 'Grail-Tests - urllib.parse.urldefrag'
method: StdlibLongTailTestCase
testUrldefragResultIsATwoTupleWithGeturl
	"CPython's DefragResult is a namedtuple, so it unpacks, indexes, has len 2,
	compares equal to the plain tuple of its fields and hashes with it -- and
	carries a geturl() that puts the fragment back."

	self assertUrllibChecks: #(
		#'defrag_geturl_round_trips'
		#'defrag_result_is_a_two_tuple'
		#'defrag_result_equals_a_plain_tuple' )
%

category: 'Grail-Tests - urllib.parse.urldefrag'
method: StdlibLongTailTestCase
testUrldefragIsBytesInBytesOut
	"bytes in gives a DefragResultBytes, and the two results convert to each
	other with encode()/decode(), as CPython's _coerce_args arranges."

	self assertUrllibChecks: #(
		#'defrag_bytes_in_bytes_out'
		#'defrag_bytes_result_decodes_back_to_str'
		#'defrag_str_result_encodes_to_bytes' )
%

category: 'Grail-Tests - urllib.parse.urldefrag'
method: StdlibLongTailTestCase
testUrldefragLeavesTheSchemeAlone
	"DELIBERATELY LESS than CPython, and the test says so rather than papering
	over it.  CPython's urldefrag rebuilds through urlsplit()/urlunsplit(),
	which lowercases the scheme, so ``HTTP://Example.COM/p#f'' comes back as
	``http://Example.COM/p'' there.  Grail partitions at the '#' and returns the
	URL exactly as given, because no urlsplit/urlparse in Grail's urllib.parse
	lowercases a scheme -- singling urldefrag out would be the inconsistency.
	The fixture marks this check grail_only, so the CPython gate expects it to
	disagree."

	self assertUrllibChecks: #( #'defrag_leaves_the_scheme_alone' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testGetproxiesEnvironmentScansSchemeProxyVariables
	"<scheme>_proxy becomes proxies['<scheme>'], case-folded; the lowercase
	spelling wins over the uppercase one whatever the iteration order; and
	no_proxy rides along as the 'no' key, which is how proxy_bypass_environment
	finds it."

	self assertUrllibChecks: #(
		#'getproxies_reads_lowercase_scheme_variables'
		#'getproxies_strips_the_proxy_suffix_and_lowercases_the_scheme'
		#'getproxies_prefers_the_lowercase_spelling'
		#'getproxies_ignores_an_empty_uppercase_value'
		#'getproxies_no_proxy_is_carried_as_the_no_key'
		#'getproxies_is_getproxies_environment' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testGetproxiesEnvironmentDropsForgedHttpProxyUnderRequestMethod
	"CVE-2016-1000110.  In a CGI environment HTTP_PROXY may have been set from a
	client's ``Proxy:'' header, so REQUEST_METHOD being present disables the
	UPPERCASE spelling -- and only that one: https_proxy survives, and the
	lowercase http_proxy is put back by the second pass.  This is a real CPython
	behaviour, not an accident of the two-pass loop."

	self assertUrllibChecks: #(
		#'getproxies_drops_uppercase_http_proxy_under_request_method'
		#'getproxies_keeps_lowercase_http_proxy_under_request_method' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testGetproxiesEnvironmentCannotSeeAnEmptyProxyVariable
	"DELIBERATELY LESS than CPython, and the cause is below urllib entirely.

	In CPython an empty lowercase ``http_proxy'' is an explicit ``no proxy for
	http'' that suppresses an uppercase ``HTTP_PROXY'', so that environment
	yields {}.  GemStone cannot represent an empty environment variable at all:
	setting one to '' is precisely how os.unsetenv and ``del os.environ[k]''
	UNSET it, and reading it back answers nil.  So the empty name is
	indistinguishable from an absent one and the uppercase value survives.

	Closing this needs a System-level environment primitive, not a change in
	urllib.request; the test pins what Grail actually does so the day it changes
	is visible."

	self assertUrllibChecks: #( #'getproxies_empty_value_cannot_unset_the_uppercase_one' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testProxyBypassEnvironmentMatchesNoProxy
	"no_proxy is a comma-separated list of DNS suffixes, or '*' for everything.
	Matching is case-insensitive, on a DOT boundary (so ``example.com'' does not
	match ``notexample.com''), ignores leading dots and surrounding whitespace,
	and compares both the host and the host:port form -- which is what lets an
	entry that carries a port match only that port."

	self assertUrllibChecks: #(
		#'bypass_is_false_without_no_proxy'
		#'bypass_star_matches_everything'
		#'bypass_matches_an_exact_host'
		#'bypass_matches_a_dns_suffix'
		#'bypass_ignores_a_leading_dot_in_no_proxy'
		#'bypass_ignores_whitespace_and_empty_entries'
		#'bypass_is_case_insensitive'
		#'bypass_strips_the_port_before_matching'
		#'bypass_matches_a_host_and_port_entry_literally' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testProxyBypassReadsTheEnvironmentWhenNotGivenProxies
	"Called with one argument -- which is how requests.utils calls it -- it
	builds the proxy dict itself.  proxy_bypass IS proxy_bypass_environment on
	Grail, the same aliasing CPython does on every platform without _scproxy or
	winreg."

	self assertUrllibChecks: #(
		#'bypass_reads_the_environment_when_given_no_proxies'
		#'bypass_is_proxy_bypass_environment' )
%

category: 'Grail-Tests - urllib.request proxies'
method: StdlibLongTailTestCase
testGetproxiesEnvironmentSeesAnInheritedProxyVariable
	"The check the fixture cannot make on its own, because it needs a variable
	set in the process BEFORE anything named it.

	getproxies_environment SCANS os.environ, and Grail's os.environ can only
	iterate names the session has already touched -- GemStone exposes no
	primitive that reads the environment block back (see the os_Environ class
	comment).  So a proxy variable inherited from the shell was perfectly
	visible to ``environ['http_proxy']'' and INVISIBLE to the scan, which would
	have made Grail silently ignore a proxy the environment had configured.
	os_Environ >> ___seedKnownNames___ now probes the standard proxy names.

	``zope_proxy'' is the negative control: it is set here exactly like
	``ftp_proxy'' but is not in the probe list, so a run where BOTH are found
	means the test is not measuring the seeding at all."

	| temps saved seen |
	temps := SessionTemps current.
	saved := temps at: #'___GrailOsEnviron___' ifAbsent: [nil].
	System gemEnvironmentVariable: 'ftp_proxy' put: 'http://seeded:1'.
	System gemEnvironmentVariable: 'zope_proxy' put: 'http://unseeded:1'.
	"Drop the memoised view so the seed scan runs again against the environment
	 as it now stands."
	temps removeKey: #'___GrailOsEnviron___' ifAbsent: [].
	seen := [ self eval: 'from urllib.request import getproxies_environment
_p = getproxies_environment()
(_p.get("ftp"), _p.get("zope"))' ]
		ensure: [
			System gemEnvironmentVariable: 'ftp_proxy' put: nil.
			System gemEnvironmentVariable: 'zope_proxy' put: nil.
			saved == nil
				ifTrue: [ temps removeKey: #'___GrailOsEnviron___' ifAbsent: [] ]
				ifFalse: [ temps at: #'___GrailOsEnviron___' put: saved ] ].
	self assert: (seen @env1:__getitem__: 0) equals: 'http://seeded:1'.
	self assert: (seen @env1:__getitem__: 1) == None
%
