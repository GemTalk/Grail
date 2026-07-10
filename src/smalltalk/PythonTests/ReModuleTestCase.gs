! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReModuleTestCase'
  instVarNames: #( re )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReModuleTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ReModuleTestCase removeAllMethods.
ReModuleTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! ReModuleTestCase
!
! Covers the upstream Python-level `re` module end-to-end through the
! Grail-ported `_constants`, `_casefix`, `_parser`, `_compiler` stack
! and the C-backed `_sre` engine.  Restoring `re/__init__.py` to
! upstream form (it used to be a 17-line stub) was the goal of the
! `re-init-restore` branch.
!
! Scope of *this* test: literal patterns with capture groups.  Regex
! character classes (`\d`, `[...]`), quantifiers (`+`, `*`), and the
! high-level helpers (`findall`, `sub`, `split`) hit a separate set
! of gaps in the `bytes`/`bytearray` protocol that need their own
! branch — see TODO.md for the list.
! ===============================================================================

category: 'Grail-Setup'
method: ReModuleTestCase
setUp

	"Fully unload re (removeModule: drops re + every re.* submodule AND
	clears their SessionTemps caches) so each test rebuilds re from source
	rather than against a half-unloaded mix of stale submodules / cache."
	importlib removeModule: 're'.
	re := importlib
		loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/re/__init__.py')
		name: 're'.
%

category: 'Grail-Tests - Module loading'
method: ReModuleTestCase
testModuleLoads
	"The upstream re/__init__.py — 428 lines of class definitions,
	module-level state, and a sentinel-based public API — loads
	end-to-end and binds the public names."

	self assert: re notNil.
	self assert: (re @env1:__name__) equals: 're'.
	self assert: (re @env1:compile) notNil.
	self assert: (re @env1:match) notNil.
	self assert: (re @env1:Pattern) notNil.
	self assert: (re @env1:Match) notNil.
%

category: 'Grail-Tests - Compile'
method: ReModuleTestCase
testCompileReturnsPattern
	"re.compile('abc') round-trips through _parser → _compiler →
	_sre.compile and returns a Pattern (== SrePattern wrapping a C
	PatternObject*)."

	| pat |
	pat := re @env1:compile: 'abc'.
	self assert: pat notNil.
	self assert: (pat @env1:groups) equals: 0.
	CPythonShim isConfigured ifTrue: [
		self assert: pat class name equals: #'SrePattern'
	]
%

category: 'Grail-Tests - Match'
method: ReModuleTestCase
testMatchLiteral
	"Match a literal pattern at the start of a string and read
	group(0).  Exercises the Smalltalk → C boundary for both
	compile (Smalltalk → C PatternObject) and match (C MatchObject*
	→ Smalltalk str)."

	| m |
	m := (re @env1:compile: 'hello') @env1:match: 'hello world'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'hello'.
%

category: 'Grail-Tests - Match'
method: ReModuleTestCase
testMatchNoMatchReturnsNone
	"A non-matching pattern returns Python None — distinct from
	Smalltalk nil so Python source that does
	``m = pat.match(...); if m is None: ...`` sees a bound value
	through Grail's ___checkLocal: read guard."

	| m |
	m := (re @env1:compile: 'foo') @env1:match: 'hello world'.
	self assert: m equals: None.
%

category: 'Grail-Tests - Errors'
method: ReModuleTestCase
testBadArgTypeRaisesCatchableTypeError
	"A non-string argument to Pattern.search makes the _sre C shim raise a
	Python TypeError.  Regression (CPythonShim>>___translateShimError:):
	it must surface as a CATCHABLE Grail TypeError, not a raw GemStone
	Error that escapes Python try/except and unittest.assertRaises.  This
	is what tanked CPython's test_re as an uncatchable-error STERROR."

	| pat |
	CPythonShim isConfigured ifFalse: [^ self].
	pat := re @env1:compile: 'abc'.
	self should: [pat @env1:search: 123] raise: TypeError
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testSingleCaptureGroup
	"A pattern with a single capture group works end-to-end.
	The dispatch fixes that this branch introduced (PythonInstance
	DNU routing `_name:kw:`, SubscriptAst's slice-object codegen,
	NamedIntConstant.__eq__'s env-0 value access) are all on the
	hot path here — without them `state.opengroup` silently
	dropped every group open."

	| m |
	m := (re @env1:compile: 'h(.)llo') @env1:match: 'hello'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'hello'.
	self assert: (m @env1:group: 1) equals: 'e'.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testMultipleCaptureGroups
	"Multiple sequential capture groups, group(N) for each."

	| m |
	m := (re @env1:compile: '(h)(e)(l)(l)(o)') @env1:match: 'hello'.
	self assert: m notNil.
	self assert: (m @env1:group: 1) equals: 'h'.
	self assert: (m @env1:group: 2) equals: 'e'.
	self assert: (m @env1:group: 3) equals: 'l'.
	self assert: (m @env1:group: 4) equals: 'l'.
	self assert: (m @env1:group: 5) equals: 'o'.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testNamedCaptureGroup
	"Named capture group (?P<name>...): group accessor takes the name."

	| m |
	m := (re @env1:compile: '(?P<num>\d+)') @env1:match: '42abc'.
	self assert: m notNil.
	self assert: (m @env1:group: 'num') equals: '42'.
%

category: 'Grail-Tests - Character classes & quantifiers'
method: ReModuleTestCase
testCharacterClass
	"Character class `[abc]+` matches a run of any of a, b, c.
	Exercises the bytes/bytearray.find path in _compiler's
	_optimize_charset."

	| m |
	m := re @env1:search: '[abc]+' _: 'xyzabcdef'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'abc'.
%

category: 'Grail-Tests - Character classes & quantifiers'
method: ReModuleTestCase
testDigitClass
	"Digit shorthand `\d+` returns the consecutive digit run."

	| m |
	m := re @env1:search: '\d+' _: 'abc123def'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: '123'.
%

category: 'Grail-Tests - Character classes & quantifiers'
method: ReModuleTestCase
testDotPlusGreedy
	"`h.+o` matches greedily from `h` through the last `o`."

	| m |
	m := (re @env1:compile: 'h.+o') @env1:match: 'hello'.
	self assert: m notNil.
	self assert: (m @env1:group: 0) equals: 'hello'.
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testFindall
	"re.findall returns every non-overlapping match as a list of
	strings (or tuples when there are capture groups)."

	self assert: (re @env1:findall: '\d+' _: 'a12b34c5')
		equals: (OrderedCollection new add: '12'; add: '34'; add: '5'; yourself).
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSplit
	"re.split divides the source at every match of the pattern.
	Exercises the keyword-only varargs argument binding
	(maxsplit / flags after *args) added on this branch — without
	it `maxsplit` was unbound on the no-args call path."

	self assert: (re @env1:split: ',' _: 'a,b,c,d')
		equals: (OrderedCollection new add: 'a'; add: 'b'; add: 'c'; add: 'd'; yourself).
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSubLiteralRepl
	"re.sub with a literal replacement string.  Used to fail with
	a marshalled-OOP error because PyCallable_Check returned true
	for every PyObject, so pattern_subx took the CALLABLE branch
	and tried to call the str as a function."

	self assert: (re @env1:sub: 'a' _: 'X' _: 'banana') equals: 'bXnXnX'.
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSubMultiCharRepl
	"Multi-character replacement, still literal path."

	self assert: (re @env1:sub: 'a' _: 'XX' _: 'banana') equals: 'bXXnXXnXX'.
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSubEmptyRepl
	"Replace every match with the empty string — effectively a
	delete-matches operation."

	self assert: (re @env1:sub: 'a' _: '' _: 'banana') equals: 'bnn'.
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSubWithCount
	"sub(pat, repl, str, count=N) caps the substitution at N
	matches; the rest of the string is left intact."

	self assert: ((re @env1:compile: 'a') @env1:sub: 'X' _: 'aaaaa' _: 2)
		equals: 'XXaaa'.
%

category: 'Grail-Tests - Module-level helpers'
method: ReModuleTestCase
testSubn
	"subn returns (new_string, number_of_substitutions)."

	| result |
	result := re @env1:subn: 'a' _: 'X' _: 'banana'.
	self assert: (result @env0:at: 1) equals: 'bXnXnX'.
	self assert: (result @env0:at: 2) equals: 3.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubBackrefNumbered
	"`\1` references the first capture group.  The C-level template
	machinery is bypassed in favour of Grail-side expansion (see
	SrePattern >> sub:_:_: for why)."

	self assert: (re @env1:sub: '(\w+)' _: '<\1>' _: 'hello')
		equals: '<hello>'.
	self assert: (re @env1:sub: '(\w+)' _: '<\1>' _: 'hello world')
		equals: '<hello> <world>'.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubMultipleBackrefs
	"`\2-\1` swaps two capture groups in each match."

	self assert: (re @env1:sub: '(\d)(\w)' _: '\2-\1' _: 'a1b2c3')
		equals: 'ab-1c-23'.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubNamedBackref
	"`\g<name>` references a named capture group."

	self assert: (re @env1:sub: '(?P<word>\w+)' _: '[\g<word>]' _: 'hi there')
		equals: '[hi] [there]'.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubCallableRepl
	"Replacement can be any callable that takes a Match and returns
	a string.  Grail blocks (ExecBlock) and BoundMethods both qualify.
	Skipped under embedded: needs Python-to-Grail callback support."

	| result |
	CPythonShim isConfigured ifFalse: [^ self].
	result := re @env1:sub: '\d+'
		_: [:m | (m @env1:group: 0) , '!']
		_: 'a1 b22'.
	self assert: result equals: 'a1! b22!'.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubnBackref
	"subn with a backref template returns (str, count)."

	| result |
	result := re @env1:subn: '(\w+)' _: '<\1>' _: 'hello world'.
	self assert: (result @env0:at: 1) equals: '<hello> <world>'.
	self assert: (result @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - sub with templates'
method: ReModuleTestCase
testSubCountCapsBackref
	"With a count limit, only the first N matches are substituted;
	the tail is preserved untouched."

	| result |
	result := (re @env1:compile: '(\w+)') @env1:sub: '<\1>' _: 'a b c d' _: 2.
	self assert: result equals: '<a> <b> c d'.
%

category: 'Grail-Tests - Pattern attributes'
method: ReModuleTestCase
testPatternGroups
	"Pattern.groups is a Py_T_PYSSIZET struct member, exposed
	through tp_members.  Without that path through shimCallTyped
	the call returned 'Method not found: Pattern.groups'; without
	the ___pythonValueAttrs___ hook on SrePattern, the attribute
	access returned a BoundMethod wrapping the getter (which
	tripped Smalltalk arithmetic in re._parser.parse_template's
	`if index > pattern.groups:` check)."

	self assert: ((re @env1:compile: '(\w+)') @env1:groups) equals: 1.
	self assert: ((re @env1:compile: '(a)(b)(c)') @env1:groups) equals: 3.
	self assert: ((re @env1:compile: 'no-groups') @env1:groups) equals: 0.
%

category: 'Grail-Tests - Capture groups'
method: ReModuleTestCase
testGroupSpan
	"match.span(N) returns (start, end) for each group."

	| m s0 s1 |
	m := (re @env1:compile: 'h(.)llo') @env1:match: 'hello'.
	s0 := m @env1:span: 0.
	s1 := m @env1:span: 1.
	self assert: (s0 @env0:at: 1) equals: 0.
	self assert: (s0 @env0:at: 2) equals: 5.
	self assert: (s1 @env0:at: 1) equals: 1.
	self assert: (s1 @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - Non-ASCII subjects'
method: ReModuleTestCase
testNonAsciiSubjectSpansAreCodepoints
	"Regex spans on a non-ASCII subject are CODEPOINT indices.
	Regresses get_ucs4_for_string fetching raw GemStone bytes and
	decoding them as UTF-8: latin-1 '\xe4' (0xE4) is an invalid UTF-8
	lead that swallowed its neighbors, scrambling every span --
	textwrap's umlaut wraps split mid-word."

	| result |
	result := self eval: 'import re
text = "Die Empf\xe4nger-Auswahl"
m = re.search("Empf.nger", text)
parts = re.split(" ", text)
(m.start(), m.end(), len(parts), parts[0], len(parts[1]))'.
	self assert: (result @env1:__getitem__: 0) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 13.
	self assert: (result @env1:__getitem__: 2) equals: 2.
	self assert: (result @env1:__getitem__: 3) equals: 'Die'.
	self assert: (result @env1:__getitem__: 4) equals: 17
%

category: 'Grail-Tests - Substitution'
method: ReModuleTestCase
testSubUnmatchedGroupExpandsEmpty
	"An unmatched group in a sub template expands to the empty string
	(CPython 3.5+); Match.group answers the None SINGLETON for it, and
	comparing only against Smalltalk nil let None leak into the join."

	self assert: (self eval: 'import re
re.sub(r"(x)?y", r"[\1]", "y")') equals: '[]'
%

category: 'Grail-Tests - Match protocol'
method: ReModuleTestCase
testMatchItemAssignmentRaisesTypeError
	"m[0] = 1 on a Match raises catchable TypeError (missing __setitem__
	on a non-PythonInstance routes through the DNU protocol fallback)."

	self assert: (self eval: 'import re
m = re.match("a", "a")
try:
    m[0] = 1
    r = "no-error"
except TypeError:
    r = "type-error"
r') equals: 'type-error'
%

category: 'Grail-Tests - Templates'
method: ReModuleTestCase
testExpandViaCompileTemplate
	"Match.expand routes through the C shim's re._compile_template
	fetch (importGetAttr must lazy-wrap multi-arg defs as BoundMethods
	while leaving native value attrs like math.pi as plain values)."

	self assert: (self eval: 'import re
m = re.match(r"(\w+) (\w+)", "hello world")
m.expand(r"\2 \1")') equals: 'world hello'
%

category: 'Grail-Tests - Zero-width'
method: ReModuleTestCase
testSubZeroWidthGroupTerminatesAndExpands
	"sub over a zero-width-capable group pattern must use scanner
	(must_advance) semantics: a plain re-search after the (len,len)
	zero-width match re-returns it forever (the C engine clamps
	pos>len back to len), which used to spin until the shim wrapper
	machinery died with an OffsetError (test_zerowidth)."

	self assert: (self eval: 'import re
re.sub(r"(\b|:+)", r"[\1]", "a::bc")') equals: '[]a[][::][]bc[]'
%

category: 'Grail-Tests - Zero-width'
method: ReModuleTestCase
testFinditerZeroWidthKeepsSameStartMatch
	"After a zero-width match at p, the next search runs from p WITH
	must_advance -- skipping a character instead loses the non-empty
	match that starts at p ((0,0) must be followed by (0,1))."

	self assert: (self eval: 'import re
[[m.start(), m.end()] for m in re.finditer(r"\b|\w+", "a::bc")]
') @env1:__repr__ equals: '[[0, 0], [0, 1], [1, 1], [3, 3], [3, 5], [5, 5]]'
%

category: 'Grail-Tests - Match protocol'
method: ReModuleTestCase
testSpanAndGroupsAreRealTuples
	"C-API tuples (PyTuple_New) must surface as Grail tuples, not plain
	Arrays: list/tuple __eq__ is cross-kind-distinct, so an Array-kind
	span compared unequal to the (x, y) tuples CPython tests assert
	against."

	self assert: (self eval: 'import re
m = re.match(r"(\w+) (\w+)", "hello world")
[type(m.span()) is tuple, m.span() == (0, 11), m.groups() == ("hello", "world")]
') @env1:__repr__ equals: '[True, True, True]'
%
