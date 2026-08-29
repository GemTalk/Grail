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
'Nine small, independent stdlib gaps, each of which was measured as the FIRST
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

They have nothing in common except that shape -- one missing name standing
between Grail and a package that would otherwise import -- so they are tested
together rather than scattered across nine files.

Two of them are deliberately LESS than CPython, and the tests say so rather
than papering over it: atexit keeps the registry but never fires it by itself
(a gem has no observable shutdown), and http.client.IncompleteRead is a name
and a shape that Grail''s HTTPResponse does not yet raise.'
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
