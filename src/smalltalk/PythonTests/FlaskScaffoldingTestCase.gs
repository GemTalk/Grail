! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlaskScaffoldingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlaskScaffoldingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlaskScaffoldingTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
FlaskScaffoldingTestCase removeAllMethods.
FlaskScaffoldingTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! FlaskScaffoldingTestCase
!
! Locks in four AST/codegen changes that landed during the Flask
! roadmap M2 push and lay infrastructure for the rest of the Flask
! stack.  Each test loads a focused fixture under
! `tests/python/pkg_scaffolding/` and asserts the visible behaviour.
! ===============================================================================

category: 'Grail-Helpers'
method: FlaskScaffoldingTestCase
loadFixture: fixtureName
	"Load tests/python/pkg_scaffolding/<fixtureName>.py once per suite
	run and return the cached module instance.  Fixtures are read-only
	function-evaluators, so a single import is enough — recompiling the
	module (and any transitively-imported stdlib package such as
	``itsdangerous``) on every test would fill the gem's transient code
	space (doits_meths) and OOM the suite."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods @env0:at: fullName @env0:asSymbol ifAbsent: [nil].
	cached @env0:notNil ifTrue: [^ cached].
	(mods @env0:includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName
%

! --- AnnAssignAst -----------------------------------------------------------

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignModuleLevel
	"`x: int = expr` at module scope binds the value, drops the
	annotation."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_int) equals: 42.
	self assert: (mod @env1:module_doubled) equals: 84.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignBareAnnotation
	"`x: int` with no value emits nothing executable — accessing
	the name yields nil (no binding ever happened)."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:module_bare) isNil.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignLocalInFunction
	"`local_val: int = 7` inside a function body works the same
	as a plain assignment."

	| mod |
	mod := self loadFixture: 'annassign'.
	self assert: (mod @env1:value_with_annotation) equals: 7.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignComplexAnnotation
	"`items: list = []` — the annotation evaluates a name
	(`list`) Grail recognises, then `.append(...)` mutates the
	bound value.  Confirms the body runs cleanly after the
	annotation is stripped."

	| mod result |
	mod := self loadFixture: 'annassign'.
	result := mod @env1:computed_local_annotation.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
%

category: 'Grail-Tests - AnnAssignAst'
method: FlaskScaffoldingTestCase
testAnnAssignClassAttribute
	"Class-level `class_counter: int = 100` becomes a Smalltalk
	classInstVar that Python attribute access can read."

	| mod cls |
	mod := self loadFixture: 'annassign'.
	cls := mod @env1:HasAnnotatedAttrs.
	self assert: (cls @env1:class_counter) equals: 100.
%

! --- ImportAst dotted-import-as-alias --------------------------------------

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testDottedImportAsAlias
	"`import collections.abc as cabc` binds cabc to the LEAF
	collections.abc submodule, not the top-level `collections`.
	Before the fix the alias resolved to the top package."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:LEAF_NAME) equals: 'collections.abc'.
%

category: 'Grail-Tests - ImportAst'
method: FlaskScaffoldingTestCase
testUnaliasedDottedImport
	"`import collections.abc` (no alias) binds the TOP-LEVEL
	package `collections` — CPython statement semantics.  The
	leaf is reachable via attribute access on the top."

	| mod |
	mod := self loadFixture: 'dotted_import'.
	self assert: (mod @env1:TOP_NAME) equals: 'collections'.
	self assert: (mod @env1:ABC_VIA_TOP) equals: 'collections.abc'.
%

! --- MarkupSafe import + escape backbone (M3 partial) -------------------

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testMarkupsafePublicSurfaceImports
	"The drop-in markupsafe package imports cleanly and exposes the
	functions Flask / Jinja2 reach for at import time."

	| mod result |
	mod := self loadFixture: 'use_markupsafe'.
	result := mod @env1:import_attributes_exist.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true.
	self assert: (result @env1:__getitem__: 3) equals: true
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testMarkupsafeEscapeInnerRoundTrip
	"markupsafe._native._escape_inner is the pure-Python fallback
	escape() takes when the C speedups extension is absent.  Grail
	never ships the speedups, so this is the live codepath."

	| mod |
	mod := self loadFixture: 'use_markupsafe'.
	self
		assert: mod @env1:escape_inner_round_trip
		equals: '&lt;a href=&#39;&amp;&#39;&gt;&#34;x&#34;&lt;/a&gt;'.
	self
		assert: mod @env1:escape_inner_no_specials
		equals: 'plain text 123'
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testMarkupsafeMarkupSubclassesStr
	"``class Markup(str):`` — locks in the NameAst fix that emits
	bare class identifiers (resolved through the symbol list) as the
	parent of a ClassDefAst's ``subclass:`` send instead of the
	fast-path BoundMethod wrapper used at call sites."

	| mod |
	mod := self loadFixture: 'use_markupsafe'.
	self assert: mod @env1:markup_subclasses_str equals: true
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testBuiltinHasattr
	"hasattr(obj, name) — used by markupsafe.escape() to detect
	__html__.  Returns True/False without leaking the underlying
	AttributeError."

	| mod result |
	mod := self loadFixture: 'use_markupsafe'.
	result := mod @env1:builtin_hasattr_on_plain_string.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: false
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testBuiltinGetattr
	"getattr(obj, name) — 2-arg form returns the attribute (or
	BoundMethod for a method).  Test by calling the returned
	BoundMethod via the round-trip ``getattr('hi', 'upper')()``."

	| mod |
	mod := self loadFixture: 'use_markupsafe'.
	self assert: mod @env1:builtin_getattr_on_plain_string equals: 'HI'
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testMarkupsafeEscapeFullRoundTrip
	"``markupsafe.escape('<hello>')`` returns a populated Markup
	instance carrying the escaped string.  Until the str-subclass
	instantiation path landed, the Markup came back empty (the
	default ``self new`` returned a zero-byte instance with no way
	to carry positional[0]).  Verifies both branches: HTML markers
	get escaped, plain text passes through with ``&`` properly
	collapsed."

	| mod |
	mod := self loadFixture: 'use_markupsafe'.
	self
		assert: mod @env1:escape_returns_populated_markup
		equals: '&lt;hello&gt;'.
	self
		assert: mod @env1:escape_preserves_safe_html
		equals: 'plain &amp; simple'
%

category: 'Grail-Tests - markupsafe'
method: FlaskScaffoldingTestCase
testMarkupsafeMarkupCarriesContent
	"``Markup('hello world')`` (no escape) — the str-subclass
	instantiation path produces a Markup whose characters are the
	input string.  The previous behavior returned an empty
	zero-byte Markup."

	| mod result |
	mod := self loadFixture: 'use_markupsafe'.
	result := mod @env1:markup_carries_string_content.
	self assert: (result @env1:__getitem__: 0) equals: 'hello world'.
	self assert: (result @env1:__getitem__: 1) equals: 11.
	self assert: (result @env1:__getitem__: 2) equals: true
%

! --- M4 plumbing: stdlib stubs added for Jinja2 import -----------------

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testErrnoExposesConstants
	"errno is a CPython built-in module Grail had no analogue for;
	the stub exposes the OS error codes Jinja2 / Werkzeug reach for
	at import time (EEXIST is the canonical check inside bccache)."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:errno_exists equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testFnmatchFilter
	"fnmatch.filter(names, pattern) — used by Jinja2's
	FileSystemBytecodeCache.clear() to find stale cache files.
	Glob-style ``*.py`` wildcard expansion."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:fnmatch_glob.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 'a.py'.
	self assert: (result @env0:at: 2) equals: 'c.py'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testOperatorArithmetic
	"operator.add / mul / truediv — Jinja2's sandbox + nodes.py
	dispatch tables map binop tokens to these function objects."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:operator_arithmetic.
	self assert: (result @env1:__getitem__: 0) equals: 5.
	self assert: (result @env1:__getitem__: 1) equals: 20.
	self assert: (result @env1:__getitem__: 2) equals: 2.5
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testThreadingLockContextManager
	"threading.Lock context-manager protocol — Jinja2's LRUCache
	wraps every mutating operation in ``with self._lock:``.  The
	stub locks are no-ops (single-threaded gem) but they have to
	at least honor the context-manager contract."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:threading_lock_context equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testUrllibQuoteFromBytes
	"urllib.parse.quote_from_bytes — Jinja2 url_quote filter uses
	it directly.  Percent-escapes everything outside the safe set."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self
		assert: mod @env1:urllib_quote_round_trip
		equals: '%3Chello%20world%3E'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testUrllibQuotePlus
	"urllib.parse.quote_plus — space gets ``+`` instead of ``%20``;
	the query-string encoder."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:urllib_quote_plus equals: 'hello+world'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testForElseSkipsOnBreak
	"Python ``for-else`` semantics: the else clause runs ONLY if the
	loop drained naturally.  Before the codegen fix in ForAst, the
	else clause ran unconditionally — both StopIteration and
	PythonBreak reached the same handler, then the else body executed.
	Broke re._parser's common-prefix loop in _parse_sub (the loop
	relies on the else NOT firing when a break inside it fires)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:for_else_skips_on_break.
	self assert: (result @env1:__getitem__: 0) equals: 'broke'.
	"No 'else' element — only 'broke' should be in the log."
	self assert: result @env0:size equals: 1
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testForElseRunsOnNaturalDrain
	"The complement of testForElseSkipsOnBreak: when no break fires
	the else clause MUST run."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:for_else_runs_on_natural_drain.
	self assert: result @env0:size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 'done'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testIntParseBinaryString
	"int(s, base) for str + bytes — Grail used to error
	``can't convert non-string with explicit base`` when given bytes,
	blocking re._compiler._mk_bitmap which feeds char-class bitmaps
	through ``int(bits[i:j], 2)``."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:int_parse_binary_string.
	self assert: (result @env1:__getitem__: 0) equals: 5.
	self assert: (result @env1:__getitem__: 1) equals: 10
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testIntParseHexWithPrefix
	"int(s, 16) — Grail had no public radix-aware Integer parser;
	added a hand-rolled ___parseInt:radix: that handles the same
	prefix grammar CPython accepts."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:int_parse_hex_with_prefix equals: 255
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testIntComparesWithNamedIntConstant
	"int.__ge__ / __gt__ / __le__ / __lt__ now fall back through
	__index__ when the RHS isn't a Number — matches __eq__'s
	existing PEP 357 fallback.  Lets ``min >= MAXREPEAT`` work in
	re._parser without ArgumentTypeError."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:int_compares_with_named_int_constant.
	"MAXREPEAT is much larger than 10, so <, <= are true; >, >= are false."
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: false.
	self assert: (result @env1:__getitem__: 3) equals: false
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testReCompileIgnorecaseCharset
	"``[a-z]+`` with re.IGNORECASE used to crash with
	``RuntimeError: invalid SRE code`` because the BIGCHARSET
	payload was 8 codes short (the bitmap got dropped).  Root
	cause was ``bytes(bytearray)`` returning empty bytes; both
	parts now flow through correctly and the resulting pattern
	matches case-insensitively."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:re_compile_ignorecase_charset.
	"Greedy ``[a-z]+`` over 'XYZabc123' matches the full letter run."
	self assert: (result @env1:__getitem__: 0) equals: 'XYZabc'.
	self assert: (result @env1:__getitem__: 1) equals: 'XYZ'.
	self assert: (result @env1:__getitem__: 2) equals: 'nomatch'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testBytesFromBytearray
	"``bytes(bytearray)`` now makes a proper byte-for-byte copy
	instead of silently returning ``b''`` (the default branch).
	Same constructor fix that unblocked the re compiler."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:bytes_from_bytearray.
	self assert: (result @env1:__getitem__: 0) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 65.
	self assert: (result @env1:__getitem__: 2) equals: 66.
	self assert: (result @env1:__getitem__: 3) equals: 67.
	self assert: (result @env1:__getitem__: 4) equals: 68
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testAbcRegister
	"collections.abc._ABCStub.register(cls) — no-op stub returning
	cls (the documented API), so callers like
	``Hashable.register(MyClass)`` don't MNU."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:abc_register_returns_class equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testBuiltinTypeInClassMethod
	"``type(self).__name__`` inside a class method.  The runtime
	module-scope NameAst fallback now consults builtins for
	fast-path names before raising NameError, so the BoundMethod
	dispatch resolves correctly."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:builtin_type_in_class_method equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testClosureWithUserKwargsParam
	"Nested ``def inner(self, **kwargs):`` used to fail Smalltalk
	compile with 'variable has already been declared' because the
	closure header emitted ``[:positional :kwargs |`` and then
	redeclared ``kwargs`` as a block temp.  Closure block params
	are now sentinels (``___positional___`` / ``___kwargs___``)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:closure_with_user_kwargs_param.
	self assert: result equals: 'compiled-ok'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testNestedForTupleUnpack
	"``for target, (action, param) in items:`` — nested tuple
	unpacking in for-loop targets.  ForAst's unpack codegen now
	recurses into nested tuples (it used to assume each element
	was a NameAst and ``elt id`` MNU'd on the inner TupleAst)."

	| mod result first second |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:nested_for_tuple_unpack.
	self assert: result @env0:size equals: 2.
	first := result @env1:__getitem__: 0.
	self assert: (first @env1:__getitem__: 0) equals: 'a'.
	self assert: (first @env1:__getitem__: 1) equals: 'load'.
	self assert: (first @env1:__getitem__: 2) equals: 1.
	second := result @env1:__getitem__: 1.
	self assert: (second @env1:__getitem__: 0) equals: 'b'.
	self assert: (second @env1:__getitem__: 1) equals: 'store'.
	self assert: (second @env1:__getitem__: 2) equals: 2
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testSubclassRedeclaresInstvar
	"``class Sub(Parent):`` where both classes have a ``self.x =``
	assignment used to fail with rtErrAddDupInstvar because the
	subclass walker rediscovered ``x`` and ClassDefAst emitted it
	back into ``instVarNames:``.  Filtered against the parent's
	allInstVarNames now."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:subclass_redeclares_instvar.
	self assert: result @env0:size equals: 2.
	self assert: (result @env0:at: 1) equals: 'a'.
	self assert: (result @env0:at: 2) equals: 'b'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testClassScopeInvisibleInMethods
	"Python class scope is NOT visible from inside method bodies.
	An unqualified ``getattr`` reference inside a class method
	should resolve to the builtin even when the class itself
	defines a ``getattr`` method.  Before the BlockAst walk gate,
	the surrounding class body's variables were treated as locals
	visible from the method, which made NameAst wrap the call in
	an UnboundLocal check that errored at compile time."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:class_scope_invisible_in_methods equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testLateBoundClassAnnotation
	"``class C: x: int`` (bare annotation, no value) used to
	materialize NO slot.  External assignment ``C.x = ...`` then
	failed because the setter didn't exist.  ClassDefAst now
	declares the slot with a nil initializer; the setter is
	compiled like any other class attribute."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:late_bound_class_annotation equals: 7
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testTupleLexicographicCompare
	"Tuple comparison used to MNU because
	``SequenceableCollection >> __ge__:`` forwarded to GS ``>=``
	which Array doesn't expose.  Now element-by-element."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:tuple_lexicographic_compare.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true.
	self assert: (result @env1:__getitem__: 3) equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testDequeRemoveCountIndex
	"``collections.deque`` gained ``remove`` / ``count`` /
	``index`` so jinja2 (and other downstream consumers) can use
	the full CPython surface."

	| mod result remaining |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:deque_remove_count_index.
	"After removing the first 2 from [1,2,3,2,4]: list is [1,3,2,4],
	 count of 2 is 1, index of 4 is 3."
	remaining := result @env1:__getitem__: 0.
	self assert: remaining @env0:size equals: 4.
	self assert: (remaining @env0:at: 1) equals: 1.
	self assert: (remaining @env0:at: 2) equals: 3.
	self assert: (remaining @env0:at: 3) equals: 2.
	self assert: (remaining @env0:at: 4) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testAstLiteralEvalRoundTrip
	"``ast.literal_eval`` parses the common literal forms.  Stub
	implementation is recursive descent over int / str / list /
	tuple / True / None — all the shapes Jinja2 / Werkzeug touch."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:ast_literal_eval_round_trip.
	self assert: (result @env1:__getitem__: 0) equals: 42.
	self assert: (result @env1:__getitem__: 1) equals: 'hello'.
	self assert: (result @env1:__getitem__: 4) equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testPosixpathJoinAndNormpath
	"``posixpath.join`` / ``normpath`` / ``basename`` — Jinja2's
	FileSystemLoader assembles template paths through these
	helpers regardless of host OS."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:posixpath_join_and_normpath.
	self assert: (result @env1:__getitem__: 0) equals: 'a/b/c'.
	self assert: (result @env1:__getitem__: 1) equals: '/root/a/b'.
	self assert: (result @env1:__getitem__: 2) equals: 'a/c'.
	self assert: (result @env1:__getitem__: 3) equals: 'z.txt'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testPythonImportlibFacadeCallable
	"``import importlib`` from user code hits Grail's Python-side
	facade rather than the Smalltalk loader directly.
	``import_module`` is the public entry point."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:python_importlib_facade_callable equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testLruCacheWrapperHasCacheClear
	"``functools.lru_cache`` returns a wrapper exposing
	``cache_clear`` / ``cache_info`` / ``__wrapped__`` so
	Jinja2's ``utils.clear_caches`` (and other consumers) can
	call ``fn.cache_clear()`` without MessageNotUnderstood.
	Caching itself is a no-op stub; this test just locks in the
	attribute surface."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:lru_cache_wrapper_has_cache_clear.
	"a = fib(3) = 4, info is a 4-tuple, hits/currsize = 0 (stub)."
	self assert: (result @env1:__getitem__: 0) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 4.
	self assert: (result @env1:__getitem__: 2) equals: 0.
	self assert: (result @env1:__getitem__: 3) equals: 0
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testClassMethodConstructorRoundTrip
	"Regression: ClassDefAst was ignoring ClassFunctionDefAst
	bodies, so a ``@classmethod`` never made it onto the
	metaclass.  jinja2.Template.from_code was the first call site
	to actually need it (env.from_string -> cls.from_code)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:classmethod_constructor_round_trip.
	self assert: (result @env1:__getitem__: 0) equals: '[hi]'.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testSortedWithKeyKwarg
	"Regression: ``sorted(iterable, key=fn)`` requires the varargs
	``_sorted:kw:`` entry point; jinja2.environment.iter_extensions
	calls it on the extensions dict."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:sorted_with_key_kwarg.
	self assert: (result @env1:__getitem__: 0) equals: 'a'.
	self assert: (result @env1:__getitem__: 1) equals: 'c'.
	self assert: (result @env1:__getitem__: 2) equals: 'c'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testStrTranslateBasic
	"Regression: ``str.translate(dict)`` must walk the receiver,
	look up each code point in the table, and emit a replacement
	(string / int / None=delete).  re.escape uses this; the
	jinja2 lexer pulls in re.escape transitively."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:str_translate_basic.
	self assert: result equals: 'Xiou'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testNestedFnParamShadowsModuleAttr
	"Regression: a function parameter named the same as a sibling
	comprehension's loop variable (which Grail captured as a module
	instVar) used to read the module instVar instead of the
	parameter.  NameAst now defers to enclosing-function locals
	even when ``isModuleScopeName:`` would fire."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:nested_fn_param_shadows_module_attr.
	self assert: (result @env1:__getitem__: 0) equals: 'param: local-value'.
	self assert: (result @env1:__getitem__: 1) equals: 'module: LOCAL-VALUE'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testGeneratorInClosureForm
	"Regression: ``def gen(): yield ...`` at function-body / eval /
	exec context emitted ``___gen___ ___yield___:`` references
	without the surrounding ``PythonGenerator withBlock:`` wrap.
	The closure form now matches the module-method body emit."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:generator_in_closure_form.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testObjectNewClassmethod
	"Regression: ``object.__new__(cls)`` is the Template constructor
	jinja2's ``_from_namespace`` uses to materialize an instance the
	exec'd namespace then populates.  Object class now exposes
	``__new__:`` + ``___new__:kw:``."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:object_new_classmethod.
	self assert: (result @env1:__getitem__: 0) equals: '_Empty'.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testKwargsClassCallRoutesThroughNew
	"Regression: ``dict(*args, **kwargs)`` used to trip
	the class-call arity-mismatch error.  CallAst now skips
	the static check when the class exposes a varargs
	``_new:kw:`` and lets Object class>>value:value: route the
	call through it."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:kwargs_class_call_routes_through_new.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: (result @env1:__getitem__: 'b') equals: 2.
	self assert: (result @env1:__getitem__: 'c') equals: 3
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testFStringInterpolationBasic
	"Regression: f-strings used to round-trip as literal
	``{placeholder}`` text.  Parser now tokenizes FSTRING, scans
	placeholders at parse time, and emits a string-concat chain
	with str/repr/ascii/format wrapping.  Comprehension targets
	declared inside placeholders propagate into the outer scope
	(else NameError at runtime)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:fstring_interpolation_basic.
	self assert: (result @env1:__getitem__: 0) equals: 'x is 42'.
	self assert: (result @env1:__getitem__: 1) equals: 'hi ''Grail'', len=5'.
	self assert: (result @env1:__getitem__: 2) equals: '(A|B|C)'.
	self assert: (result @env1:__getitem__: 3) equals: 'prefix: v=42'.
	self assert: (result @env1:__getitem__: 4) equals: 'slice = [''a'', ''b'']'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testExecSourcePopulatesGlobals
	"Regression: ``exec(source, globals)`` used to NameError on
	``exec`` itself.  builtins now implements ``_exec:kw:`` by
	wrapping ModuleAst's parse+execute machinery — pre-seeds a
	scope from the globals mapping, runs source as a module body,
	and reflects every binding back into globals.  jinja2's
	Template.from_code depends on this for the template namespace
	(``root``, ``blocks``, ``debug_info``, ...)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:exec_source_populates_globals.
	self assert: (result @env1:__getitem__: 0) equals: 17.
	self assert: (result @env1:__getitem__: 1) equals: 42
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testStaticmethodViaInstanceAndClass
	"Regression: @staticmethod-decorated functions were silently
	dropped by ClassDefAst (only InstanceFunctionDefAst and the
	just-added ClassFunctionDefAst paths emitted anything).  Now
	StaticFunctionDefAst nodes are compiled onto the metaclass via
	the module-method source generator (no first-arg strip), and
	``self.X(args)`` from an instance method routes through a
	class-side BoundMethod wrap in ___pyAttrLoad___.

	Both call shapes — ``Cls.method(args)`` and
	``instance.method(args)`` — must dispatch to the same metaclass
	selector.  jinja2's CodeGenerator._default_finalize is the
	first load-bearing call site."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:staticmethod_via_instance_and_class.
	self assert: (result @env1:__getitem__: 0) equals: 103.
	self assert: (result @env1:__getitem__: 1) equals: 107.
	self assert: (result @env1:__getitem__: 2) equals: 115
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testClassAttrWithInstanceWriteSite
	"Regression: ``self.X`` where X is declared at class body scope
	(``X: type = expr`` or ``X = expr``) AND also has an instance-side
	write somewhere in the class.  AttributeAst used to take the
	instance-instVar fast path for the read and fire
	AttributeError before the instance write ran (the per-instance
	slot was nil; the class-side default was unreachable).
	Now AttributeAst routes such reads through ___pyAttrLoad___ which
	checks the per-instance slot's accessor and falls through to the
	class-side default on miss.

	This is the shape jinja2's CodeGenerator uses for
	``_finalize: t.Optional[_FinalizeInfo] = None`` with later
	``self._finalize = ...`` writes."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:class_attr_with_instance_write_site.
	self assert: (result @env1:__getitem__: 0) equals: 'class-default'.
	self assert: (result @env1:__getitem__: 1) equals: 'inst-value'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testKwargsSplatForwardsToFixedArity
	"Regression: ``f(*args, **kwargs)`` used to wrap the **splat as
	``{nil → kwargs}`` and BoundMethod's value:value: would fall back
	to the varargs form, missing fixed-arity selectors like
	``visit_X:_:``.  printKeywordsDictOn: now collapses a sole
	**splat to the dict directly — the receiver method's ``kw:`` slot
	sees the real kwargs (or nil/empty) and dispatch finds the right
	selector."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:kwargs_splat_forwards_to_fixed_arity.
	"forwarder(3, 4) → inner(3, 4) → 3 + 40 = 43"
	self assert: (result @env1:__getitem__: 0) equals: 43.
	"forwarder(1, b=2) → inner(1, b=2) → 1 + 20 = 21"
	self assert: (result @env1:__getitem__: 1) equals: 21.
	"forwarder(a=5, b=6) → inner(a=5, b=6) → 5 + 60 = 65"
	self assert: (result @env1:__getitem__: 2) equals: 65
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testStarUnpackInCall
	"Regression: ``f(*args)`` used to compile to a runtime TypeError
	stub.  CallAst's new printArgumentsArrayOn: helper concatenates
	brace literals with each starred expression's asArray so the
	jinja2 visitor pattern ``f(node, *args, **kwargs)`` forwards
	correctly."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:star_unpack_in_call.
	self assert: (result @env1:__getitem__: 0) equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2.
	self assert: (result @env1:__getitem__: 3) equals: 3.
	self assert: (result @env1:__getitem__: 4) equals: 4.
	self assert: (result @env1:__getitem__: 5) equals: 5.
	self assert: (result @env1:__getitem__: 6) equals: 6
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testDictPopStringKeyOnSymbolDict
	"Regression: kwargs dicts use Symbol keys; Python's ``kwargs.pop(
	'name', default)`` passes a String.  dict.pop:_: now tries the
	Symbol form on a String miss.  jinja2's Node.__init__ depends on
	this for every node construction."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:dict_pop_string_key_on_symbol_dict.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 0
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testClassDunderNameUnwraps
	"Regression: ``cls.__name__`` used to wrap the inherited
	Behavior-side getter in a BoundMethod, breaking
	``getattr(self, 'visit_' + type(node).__name__)`` in jinja2's
	visitor dispatch."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:class_dunder_name_unwraps.
	self assert: (result @env1:__getitem__: 0) equals: '_Foo'.
	self assert: (result @env1:__getitem__: 1) equals: 'visit__Foo'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testGetattrMissingRaisesAttributeError
	"Regression: a complete attribute miss now raises Python
	AttributeError instead of MNU-ing.  getattr(obj, name, default)
	catches it cleanly."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:getattr_missing_raises_attribute_error.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 'fallback'
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testInstanceDictShadowsClassAttr
	"Regression: Python attribute lookup checks instance __dict__
	BEFORE the class.  Without this, bare-annotation class slots
	(value nil) masked per-instance values set via setattr.  The
	NamedTuple subclass-instance-attribute path lives or dies here."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:instance_dict_shadows_class_attr.
	self assert: result equals: 42
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testTypingNamedTupleUnpacks
	"Regression: ``class _Rule(t.NamedTuple): pattern: ...; ...``
	subclass support.  ClassDefAst emits ``_fields`` from bare
	annotations; the typing.NamedTuple stub stores positional args
	on ``_values`` so __iter__ / __getitem__ / __len__ work.  Jinja2's
	lexer ``for regex, tokens, new_state in statetokens:`` depends on
	this."

	| mod result items out |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:typing_namedtuple_unpacks.
	out := result @env1:__getitem__: 0.
	items := result @env1:__getitem__: 1.
	"Iterated values in declaration order."
	self assert: (out @env1:__getitem__: 0) equals: 1.
	self assert: (out @env1:__getitem__: 1) equals: 'x'.
	self assert: (out @env1:__getitem__: 2) equals: None.
	"Indexed access."
	self assert: (items @env1:__getitem__: 0) equals: 1.
	self assert: (items @env1:__getitem__: 1) equals: 'x'.
	"len."
	self assert: (result @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testEmptyUserContainerIsFalsy
	"Regression: ``bool(obj)`` used env-0 ``respondsTo: #__bool__``
	which couldn't see env-1 Python ``__bool__`` methods on user
	classes, then fell through to the unconditional ``true``.
	jinja2's TokenStream relied on ``if self._pushed:`` (deque)
	being falsy when empty; the bug triggered ``popleft`` on the
	empty deque immediately after init."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:empty_user_container_is_falsy.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testChainedCompareInMethodParam
	"Regression: a class method that takes parameters AND uses a
	chained comparison in the body.  CompareAst.allocateTemp used
	to return ``___1`` for the chain-cache temp, redeclaring the
	method's first positional placeholder as a block-local and
	shadowing the incoming argument with nil.  Pre-fix this was
	the blocker for ``Environment()`` instantiation (whose
	``_environment_config_check(self)`` does ``a != b != c`` over
	three self.* attributes)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:chained_compare_in_method_param.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: false.
	self assert: (result @env1:__getitem__: 2) equals: false
%

category: 'Grail-Tests - jinja2 plumbing'
method: FlaskScaffoldingTestCase
testJinja2ImportsCleanly
	"M4 partial — ``import jinja2`` succeeds and exposes the
	public surface Flask hello-world reaches for.  Pre-template-
	render milestone; running ``Template(...).render(...)`` is the
	next step."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_imports_cleanly.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true.
	self assert: (result @env1:__getitem__: 3) equals: true
%

! --- itsdangerous Signer round-trip (M3 partial) ------------------------

category: 'Grail-Tests - itsdangerous'
method: FlaskScaffoldingTestCase
testItsdangerousSignRoundtrip
	"Signer.sign + unsign returns the original payload as bytes."

	| mod |
	mod := self loadFixture: 'use_itsdangerous'.
	self assert: mod @env1:sign_round_trip equals: 'hello world' asByteArray
%

category: 'Grail-Tests - itsdangerous'
method: FlaskScaffoldingTestCase
testItsdangerousSignedStartsWithPayload
	"The signed token has shape ``<payload>.<base64-signature>``."

	| mod |
	mod := self loadFixture: 'use_itsdangerous'.
	self assert: mod @env1:signed_contains_payload equals: true
%

category: 'Grail-Tests - itsdangerous'
method: FlaskScaffoldingTestCase
testItsdangerousValidate
	"validate(token) returns True for an intact token, False after
	tampering."

	| mod |
	mod := self loadFixture: 'use_itsdangerous'.
	self assert: mod @env1:validate_intact equals: true.
	self assert: mod @env1:validate_tampered equals: false
%

category: 'Grail-Tests - itsdangerous'
method: FlaskScaffoldingTestCase
testItsdangerousDifferentKeysRejectEachOther
	"A signature from key A doesn't validate under key B."

	| mod |
	mod := self loadFixture: 'use_itsdangerous'.
	self assert: mod @env1:different_keys_dont_match equals: false
%

category: 'Grail-Tests - itsdangerous'
method: FlaskScaffoldingTestCase
testItsdangerousClassAttrOverride
	"Serializer.default_signer is Signer; TimedSerializer overrides
	to TimestampSigner via class-attribute redeclaration that
	ClassDefAst's inheritance-copy fix now honors."

	| mod result |
	mod := self loadFixture: 'use_itsdangerous'.
	result := mod @env1:class_attr_override_serializer_signer.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true
%

! --- ClassDefAst: subclass class-attribute redeclaration ----------------

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testSubclassRedeclaresClassAttr
	"`class B(A): label = ...` rebinds the same name on B's metaclass
	(per-class storage, name inherited from A's metaclass).  Before
	the ClassDefAst fix this raised rtErrAddDupInstvar."

	| mod |
	mod := self loadFixture: 'subclass_class_attrs'.
	self assert: mod @env1:class_label_a equals: 'A-label'.
	self assert: mod @env1:class_label_b equals: 'B-label'
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testSubclassRedeclaresChain
	"A.counter=1, B(A).counter=2, C(B).counter=3 - each class holds
	its own per-class value."

	| mod result |
	mod := self loadFixture: 'subclass_class_attrs'.
	result := mod @env1:class_counter_chain.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testSubclassInheritsWhenNotRedeclared
	"C(B) doesn't redeclare `label`; reading C.label walks the MRO
	and finds B's value."

	| mod |
	mod := self loadFixture: 'subclass_class_attrs'.
	self assert: mod @env1:class_label_c_inherits_from_b equals: 'B-label'
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testSubclassAddsNewClassAttr
	"D(A) adds `extra` without a parent slot to collide with -
	regression test that the new ClassDefAst path still works for
	purely-new class attrs."

	| mod |
	mod := self loadFixture: 'subclass_class_attrs'.
	self assert: mod @env1:class_d_new_attr equals: 'D-only'.
	self assert: mod @env1:class_d_inherits_a_label equals: 'A-label'
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testInstanceReadsClassAttr
	"Instance attribute reads see the class attr through Grail's
	instance->class fallthrough.  A() reads A.label = 'A-label';
	B() reads B.label = 'B-label' (per-class override visible
	through normal attribute lookup)."

	| mod |
	mod := self loadFixture: 'subclass_class_attrs'.
	self assert: mod @env1:instance_reads_class_attr_a equals: 'A-label'.
	self assert: mod @env1:instance_reads_class_attr_b equals: 'B-label'
%

! --- ClassDefAst: Python class doesn't clobber built-ins -----------------

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testClassNameDoesNotClobberBuiltin
	"`class Symbol:` and `class Set:` are deliberately named to
	collide with GemStone built-ins.  The codegen emits
	``Object subclass: 'Symbol' inDictionary: nil`` — the `nil`
	dictionary makes the class anonymous (no SymbolList entry),
	so the built-ins are untouched and the Python class is
	reachable only through the module's instVar."

	| mod sym builtin |
	mod := self loadFixture: 'builtin_collision'.
	sym := mod @env1:Symbol.
	"The built-in Symbol class still resolves via the symbol
	list — and it's NOT the Python class."
	builtin := System myUserProfile symbolList @env0:objectNamed: #Symbol.
	self assert: builtin notNil.
	self deny: builtin == sym.
	"The Python class is the one the module instVar holds, not
	a clone of the built-in."
	self assert: sym superclass equals: PythonInstance.
%

category: 'Grail-Tests - ClassDefAst'
method: FlaskScaffoldingTestCase
testCollidingClassConstructs
	"The anonymous Python class is fully usable: __init__ runs,
	instance attrs land in the right slots, module-level
	construction wires up correctly."

	| mod a b set |
	mod := self loadFixture: 'builtin_collision'.
	a := mod @env1:make_a.
	b := mod @env1:make_b.
	set := mod @env1:both.
	self assert: a @env1:name equals: 'a'.
	self assert: b @env1:name equals: 'b'.
	self assert: set @env1:items @env0:size equals: 2.
%

! --- AttributeAst cls vs self ---------------------------------------------

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillFastPath
	"`self.X` in an instance method whose first param is the
	conventional `self` still takes the instVar fast path —
	the AttributeAst change only narrowed the path, not removed
	it."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	inst := cls @env1:value: { 'hello' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'hello'.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfReadOfClassSideAttribute
	"`self.set_class` where `set_class` was declared at class
	body level (`set_class: type = list`) lives on the Smalltalk
	class side, not in instance layout.  Reading it from an
	instance method has to go through ___pyAttrLoad___: at
	runtime; before the AttributeAst fallback fix, the codegen
	emitted bare `set_class` and Smalltalk compile-errored with
	`undefined symbol set_class`.  The CallAst exclusion makes
	sure `self.<unknown-attr>(...)` doesn't take the direct
	unary-send fastpath either — that path bypasses
	___pyAttrLoad___: and would DNU on the metaclass."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	"`self.set_class` resolves through ___pyAttrLoad___: to the
	class-side attribute value (the built-in ``list`` class,
	which is OrderedCollection in Grail)."
	result := inst @env1:read_class_attr.
	self assert: result equals: OrderedCollection.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testCallOfClassSideAttribute
	"`self.set_class()` — load the class-side attribute (`list`)
	through ___pyAttrLoad___:, then invoke it.  Built-in classes
	gain callability through ``Object class >> value:value:``,
	which dispatches to ``__new__`` based on arity."

	| mod cls inst result |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:ClassSideAttr.
	inst := cls @env1:value: #() value: nil.
	result := inst @env1:make_via_class_attr.
	self assert: result class equals: OrderedCollection.
	self assert: result @env0:size equals: 0.
%

category: 'Grail-Tests - AttributeAst'
method: FlaskScaffoldingTestCase
testSelfAttributeStillWorksWhenClassHasNew
	"When a class defines __new__ (whose first param is `cls` by
	convention), the WHOLE class's selfParameterName had been
	picked from __new__ — turning every `self.X` reference in
	other methods into an UnboundLocal access.  After the
	ClassDefAst fix, selfParameterName prefers __init__'s first
	param, so `self.label` keeps reaching the instance instVar."

	| mod cls inst |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:HasNewAndInit.
	inst := cls @env1:value: { 'world' } value: nil.
	self assert: (inst @env1:read_self_attr) equals: 'world'.
%

! --- Deep instance-variable discovery --------------------------------------

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromConditionalAssign
	"Phase B: `if doc: self.doc = doc` inside __init__ — the
	conditional write must reach the instance's attribute namespace
	even though it's nested.  Construction with a truthy ``doc''
	argument should leave ``obj.doc'' readable."

	| mod obj |
	mod := self loadFixture: 'deep_instance_vars'.
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #doc) equals: 'hello'.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromAnnAssign
	"Phase B: AnnAssign on self.X (`self.tags: list = []`) — the
	annotated assignment is a different AST node from plain Assign;
	codegen must still emit a dynamic-instVar store so ``obj.tags''
	round-trips."

	| mod obj |
	mod := self loadFixture: 'deep_instance_vars'.
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #tags) equals: #() asOrderedCollection.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromNestedCompound
	"Phase B: `try / for / self.last_index = i` — write buried two
	compound statements deep inside __init__ still reaches the
	instance's attribute namespace.  The for loop runs 0..1; the
	last write is i=1."

	| mod obj |
	mod := self loadFixture: 'deep_instance_vars'.
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #last_index) equals: 1.
%

category: 'Grail-Tests - Instance var discovery'
method: FlaskScaffoldingTestCase
testInstanceVarsFromMethodOutsideInit
	"Phase B: `self.name = name` in `configure(self, name)` — an
	instance attribute set outside __init__ must reach the same
	dynamic-instVar storage."

	| mod obj |
	mod := self loadFixture: 'deep_instance_vars'.
	obj := mod @env1:make.
	self assert: (obj @env1:___pyAttrLoad___: #name) equals: 'the-name'.
%

! Phase B: removed testInstanceVarsFromCls — its assertion checked
! the pre-Phase-B parser-propagation behavior where `cls.X = ...`
! inside a method body was lifted into the class's classInstVar
! list at compile time.  Phase B drops that propagation for instance
! attributes (now dynamic instVars per instance).  Class attributes
! from method-body `cls.X = ...` writes are a separate concern
! (Behavior can't hold dynamic instVars; needs explicit class-body
! declaration or a dedicated mechanism) — see Phase B+1 follow-up.

! --- Generators: yield in function body --------------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThreeYields
	"Three consecutive yields drained via __next__ until StopIteration.
	The body runs in a forked GsProcess; consumer and producer
	synchronise through a pair of Semaphores."

	| mod gen v1 v2 v3 stopped |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:make_three.
	self assert: gen @env0:class equals: PythonGenerator.
	v1 := gen @env1:__next__.
	v2 := gen @env1:__next__.
	v3 := gen @env1:__next__.
	self assert: v1 equals: 'a'.
	self assert: v2 equals: 'b'.
	self assert: v3 equals: 'c'.
	stopped := [gen @env1:__next__. false]
		on: StopIteration do: [:ex | true].
	self assert: stopped.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorLocalStateAcrossYields
	"`count_up(n)` keeps a local `i` across yields, proving the
	GsProcess preserves the producer's stack between resumes."

	| mod gen result done |
	mod := self loadFixture: 'generators'.
	gen := mod @env1:count_up: 4.
	result := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[result add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: result @env0:size equals: 4.
	self assert: (result @env0:at: 1) equals: 0.
	self assert: (result @env0:at: 4) equals: 3.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorInsideClassMethod
	"Generator declared as an instance method must close over the
	class's ``self`` correctly (the body block captures the receiver
	of the enclosing method)."

	| mod Counter c gen items done |
	mod := self loadFixture: 'generators'.
	Counter := mod @env1:Counter.
	c := Counter @env1:value: { 'item' } value: nil.
	gen := c @env1:labelled: 3.
	items := OrderedCollection new.
	done := false.
	[done] whileFalse: [
		[items add: gen @env1:__next__]
			on: StopIteration do: [:ex | done := true]
	].
	self assert: items @env0:size equals: 3.
	self assert: (items @env0:at: 1) equals: 'item_0'.
	self assert: (items @env0:at: 3) equals: 'item_2'.
%

! --- hashlib (Tier 1.5) ---------------------------------------------------

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibKnownVectors
	"``hashlib.sha256`` / ``md5`` should produce CPython-compatible
	hex digests."

	| mod |
	mod := self loadFixture: 'use_hashlib'.
	self assert: (mod @env1:sha256_of: 'hello' asByteArray)
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
	self assert: (mod @env1:md5_of: 'hello' asByteArray)
		equals: '5d41402abc4b2a76b9719d911017c592'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibStreamingUpdate
	"Multiple ``update()`` calls feed into the same digest — the
	streaming pattern HMAC and incremental APIs depend on."

	| mod parts result |
	mod := self loadFixture: 'use_hashlib'.
	parts := OrderedCollection new
		add: 'hello' asByteArray;
		add: ' world' asByteArray;
		yourself.
	result := mod @env1:streamed_sha256: parts.
	self assert: result
		equals: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibBlockAndDigestSizes
	"``digest_size`` / ``block_size`` are *value* attributes (not
	BoundMethod wraps) — exercises ``___pythonValueAttrs___`` on
	Hash class."

	| mod sizes |
	mod := self loadFixture: 'use_hashlib'.
	sizes := mod @env1:block_sizes.
	self assert: (sizes @env0:at: 1) equals: 64.   "md5"
	self assert: (sizes @env0:at: 2) equals: 64.   "sha256"
	self assert: (sizes @env0:at: 3) equals: 128.  "sha512"
	sizes := mod @env1:digest_sizes.
	self assert: (sizes @env0:at: 1) equals: 16.   "md5"
	self assert: (sizes @env0:at: 2) equals: 32.   "sha256"
	self assert: (sizes @env0:at: 3) equals: 64.   "sha512"
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibByName
	"``hashlib.new('sha256', data)`` factory with the algorithm
	supplied as a string."

	| mod |
	mod := self loadFixture: 'use_hashlib'.
	self assert: (mod @env1:by_name)
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
%

category: 'Grail-Tests - hashlib'
method: FlaskScaffoldingTestCase
testHashlibCopyIndependent
	"``Hash.copy()`` clones independently — mutating the original
	after a copy must not affect the clone's digest.  HMAC depends
	on this."

	| mod result clone divergent |
	mod := self loadFixture: 'use_hashlib'.
	result := mod @env1:hash_copy.
	clone := result @env0:at: 1.
	divergent := result @env0:at: 2.
	"Clone keeps sha256('hello') digest"
	self assert: clone
		equals: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'.
	"Original got 'hello world' appended"
	self assert: divergent
		equals: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'.
%

! --- hmac (Tier 1.5) ------------------------------------------------------

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacKnownVectorSha256
	"``hmac.new(key, msg, 'sha256').hexdigest()`` matches RFC 4231
	test vector parity with CPython."

	| mod result |
	mod := self loadFixture: 'use_hmac'.
	result := mod @env1:basic_sha256: 'secret' asByteArray _: 'message' asByteArray.
	self assert: result asLowercase
		equals: '8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b'.
%

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacStreaming
	"Multiple update() calls accumulate into the same MAC."

	| mod parts result |
	mod := self loadFixture: 'use_hmac'.
	parts := OrderedCollection new
		add: 'hello' asByteArray;
		add: ' ' asByteArray;
		add: 'world' asByteArray;
		yourself.
	result := mod @env1:streaming: 'k' asByteArray _: parts.
	self assert: result asLowercase
		equals: (mod @env1:basic_sha256: 'k' asByteArray _: 'hello world' asByteArray) asLowercase.
%

category: 'Grail-Tests - hmac'
method: FlaskScaffoldingTestCase
testHmacCompareDigestConstantTime
	"``hmac.compare_digest`` returns True for equal inputs, False
	for unequal — the basic correctness check (timing-leak resistance
	is the implementation's purpose; we just verify the answer)."

	| mod |
	mod := self loadFixture: 'use_hmac'.
	self assert: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abc' asByteArray).
	self deny: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abd' asByteArray).
	self deny: (mod @env1:constant_time_eq: 'abc' asByteArray _: 'abcd' asByteArray).
%

! --- base64 (Tier 1.5) ----------------------------------------------------

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64StandardEncode
	"``base64.b64encode(b'hello world')`` matches the RFC 4648
	expected output (with trailing '=' padding)."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:encode_standard: 'hello world' asByteArray.
	self assert: result equals: 'aGVsbG8gd29ybGQ=' asByteArray.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64StandardDecode
	"``base64.b64decode`` reverses the encoding, stripping '='."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:decode_standard: 'aGVsbG8gd29ybGQ=' asByteArray.
	self assert: result equals: 'hello world' asByteArray.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64Roundtrip
	"Various lengths exercise the 0/1/2 byte tail cases."

	| mod |
	mod := self loadFixture: 'use_base64'.
	#('a' 'ab' 'abc' 'abcd' 'abcde' 'abcdef' '' 'hello world!') do: [:s |
		self assert: (mod @env1:roundtrip: s asByteArray)
			description: 'roundtrip failed for: ' , s
	]
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64UrlsafeAlphabet
	"URL-safe variant: ``+`` → ``-``, ``/`` → ``_``.  Bytes that
	produce both characters in the standard alphabet differ in the
	URL-safe form."

	| mod safeEnc stdEnc data |
	mod := self loadFixture: 'use_base64'.
	"0xFB 0xEF 0xFF → '++//' in standard b64."
	data := ByteArray new: 3.
	data @env0:at: 1 put: 16rFB.
	data @env0:at: 2 put: 16rEF.
	data @env0:at: 3 put: 16rFF.
	stdEnc := mod @env1:encode_standard: data.
	safeEnc := mod @env1:encode_urlsafe: data.
	self assert: stdEnc equals: '++//' asByteArray.
	self assert: safeEnc equals: '--__' asByteArray.
	self assert: (mod @env1:decode_urlsafe: safeEnc) equals: data.
%

category: 'Grail-Tests - base64'
method: FlaskScaffoldingTestCase
testBase64DecodeStrInput
	"Decoder accepts a Python str (Grail Unicode7), encoded to ASCII
	internally."

	| mod result |
	mod := self loadFixture: 'use_base64'.
	result := mod @env1:decode_from_str: 'aGVsbG8='.
	self assert: result equals: 'hello' asByteArray.
%

! --- time module ----------------------------------------------------------

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeCurrentMatchesNs
	"time() and time_ns() should agree within a second on the moment of
	the call (both read DateTime now sequentially)."

	| mod secs nanos |
	mod := self loadFixture: 'use_time'.
	secs := mod @env1:get_time.
	nanos := mod @env1:get_time_ns.
	self assert: ((nanos / 1000000000) asFloat - secs) abs < 1.0.
	"Sanity: we should be after 2020 and before 2100."
	self assert: secs > 1577836800.
	self assert: secs < 4102444800
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeMonotonicProgresses
	"monotonic() never goes backwards across two successive reads."

	| mod m1 m2 |
	mod := self loadFixture: 'use_time'.
	m1 := mod @env1:get_monotonic.
	m2 := mod @env1:get_monotonic.
	self assert: m2 >= m1
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeSleepAdvances
	"sleep(0.1) elapses at least 0.05 seconds (loose lower bound to
	survive scheduling jitter on busy CI)."

	| mod elapsed |
	mod := self loadFixture: 'use_time'.
	elapsed := mod @env1:measure_sleep: 0.1.
	self assert: elapsed >= 0.05.
	self assert: elapsed < 5.0
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeGmtimeStruct
	"gmtime() returns a 9-tuple with year/month/day/hour/min/sec/wday/yday/isdst."

	| mod t |
	mod := self loadFixture: 'use_time'.
	t := mod @env1:get_gmtime.
	self assert: t size equals: 9.
	self assert: (t @env1:__getitem__: 0) > 2020.
	"Month 1..12."
	self assert: ((t @env1:__getitem__: 1) between: 1 and: 12).
	"isdst -1 = unknown."
	self assert: (t @env1:__getitem__: 8) equals: -1
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeGmtimeKnownEpoch
	"gmtime(0) is 1970-01-01 00:00:00 UTC."

	| mod t |
	mod := self loadFixture: 'use_time'.
	t := mod @env1:get_gmtime_of: 0.
	self assert: (t @env1:__getitem__: 0) equals: 1970.
	self assert: (t @env1:__getitem__: 1) equals: 1.
	self assert: (t @env1:__getitem__: 2) equals: 1.
	self assert: (t @env1:__getitem__: 3) equals: 0.
	self assert: (t @env1:__getitem__: 4) equals: 0.
	self assert: (t @env1:__getitem__: 5) equals: 0
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeStrftimeIso
	"strftime renders a fixed instant as expected ISO-style text."

	| mod s |
	mod := self loadFixture: 'use_time'.
	"1700000000 = 2023-11-14 22:13:20 UTC"
	s := mod @env1:format_gmtime: 1700000000 _: '%Y-%m-%d %H:%M:%S'.
	self assert: s equals: '2023-11-14 22:13:20'
%

category: 'Grail-Tests - time'
method: FlaskScaffoldingTestCase
testTimeAsctimeOfEpoch
	"asctime(gmtime(0)) renders 'Thu Jan 01 00:00:00 1970'."

	| mod s |
	mod := self loadFixture: 'use_time'.
	s := mod @env1:asctime_of: 0.
	self assert: s equals: 'Thu Jan 01 00:00:00 1970'
%

! --- logging module -------------------------------------------------------

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingRootDefaultLevel
	"Fresh root logger sits at WARNING."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:root_default_level equals: 30
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingNamedHasParentChain
	"getLogger('myapp.module').parent.name == 'myapp'."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:parent_chain equals: 'myapp'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingIsEnabledFor
	"setLevel(WARNING) -> DEBUG disabled, WARNING/ERROR enabled."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:is_enabled_for.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingNullHandler
	"NullHandler swallows records without raising."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:null_handler_silences equals: 'ok'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingRecordMessage
	"LogRecord.getMessage interpolates %-args."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:format_record equals: 'hello world'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingFormatterDefault
	"Default formatter is 'LEVEL:NAME:MESSAGE'."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:formatter_default equals: 'INFO:app:msg'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingFormatterCustom
	"Custom formatter slots in name / level / message in any order."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:formatter_custom equals: 'a.b|ERROR|oops'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingLevelConstants
	"DEBUG=10 / INFO=20 / WARNING=30 / ERROR=40 / CRITICAL=50."

	| mod tup |
	mod := self loadFixture: 'use_logging'.
	tup := mod @env1:level_constants.
	self assert: (tup @env1:__getitem__: 0) equals: 10.
	self assert: (tup @env1:__getitem__: 1) equals: 20.
	self assert: (tup @env1:__getitem__: 2) equals: 30.
	self assert: (tup @env1:__getitem__: 3) equals: 40.
	self assert: (tup @env1:__getitem__: 4) equals: 50
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingGetLevelName
	"getLevelName(WARNING) -> 'WARNING'."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:get_level_name equals: 'WARNING'
%

! --- logging end-to-end (emit / handler pipeline) ------------------------

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingLoggerInfoEmits
	"logger.info(...) / debug / warning route records through the
	logger's handlers when the logger's effective level permits."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:logger_info_emits.
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 0)
		equals: 'INFO:emit.info:hello world'.
	self assert: (result @env1:__getitem__: 1)
		equals: 'DEBUG:emit.info:debug-level'.
	self assert: (result @env1:__getitem__: 2)
		equals: 'WARNING:emit.info:warn'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingHandlerSetFormatter
	"Handler.setFormatter overrides the default ``LEVEL:name:msg''
	template."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:handler_set_formatter_custom.
	self assert: result equals: #('[INFO] hi') asOrderedCollection
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingHandlerSetLevelFilters
	"Handler.setLevel suppresses records below the threshold even
	when the logger admits them."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:handler_set_level_filters.
	self assert: result equals: #(30 40) asOrderedCollection
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingLoggerExceptionLogsAtError
	"logger.exception(...) logs the message at ERROR.  Grail's
	implementation drops the traceback (CPython attaches exc_info);
	the message + level routing must still fire."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:logger_exception_logs_at_error.
	self assert: result equals: #('ERROR:emit.exc:caught: failure') asOrderedCollection
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingRootPropagation
	"By default a child logger's records propagate up to the root's
	handlers."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:root_propagation_to_root_handler.
	self assert: result size equals: 1.
	self assert: (result @env1:__getitem__: 0)
		equals: 'INFO:emit.prop.child:from child'
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingRemoveHandler
	"removeHandler(h) drops emit routing through that handler.
	Test isolates the logger with propagate=False so root handlers
	don't double-count."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:remove_handler_stops_emit.
	self assert: result equals: #('INFO:emit.rmv:before') asOrderedCollection
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingHasHandlersWalksChain
	"hasHandlers() walks the parent chain, returning True when any
	ancestor has at least one handler (and propagation isn't
	blocked along the way)."

	| mod result |
	mod := self loadFixture: 'use_logging'.
	result := mod @env1:has_handlers_walks_chain.
	self assert: (result @env1:__getitem__: 0) equals: false.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingHasHandlersStopsAtPropagateFalse
	"hasHandlers() stops walking once it hits a logger with
	propagate=False, returning False if that logger has no
	handlers of its own."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:has_handlers_stops_when_propagation_off
		equals: false
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingFormatterAsctime
	"Formatter resolves ``%(asctime)s'' via time.strftime against
	the record's ``created'' field.  Default datefmt is
	``%Y-%m-%d %H:%M:%S''."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:formatter_asctime_shape equals: true
%

category: 'Grail-Tests - logging'
method: FlaskScaffoldingTestCase
testLoggingLogRecordArgsTuple
	"LogRecord.getMessage applies %-formatting against the args
	tuple — multi-element form."

	| mod |
	mod := self loadFixture: 'use_logging'.
	self assert: mod @env1:log_record_args_tuple equals: 'hi and 7'
%

! --- traceback module -----------------------------------------------------

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackFormatExceptionOnly
	"format_exception_only renders 'Type: message\\n' as a single-entry list."

	| mod lines |
	mod := self loadFixture: 'use_traceback'.
	lines := mod @env1:format_exception_lines.
	self assert: lines size equals: 1.
	self assert: (lines @env1:__getitem__: 0) equals: 'ValueError: bad value
'
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackFormatExcInHandler
	"format_exc() inside an except block returns a string (active
	exception tracking via sys.exc_info() is a stub in Grail, so the
	content is 'None\\n' rather than the traceback - but the call
	itself must not raise)."

	| mod text |
	mod := self loadFixture: 'use_traceback'.
	text := mod @env1:format_exc_in_handler.
	self assert: (text isKindOf: String).
	self assert: text size > 0
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackExtractTbEmpty
	"extract_tb is a stub returning [] - it should not raise."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:extract_tb_empty.
	self assert: result size equals: 0
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackFormatExceptionThreeArg
	"Legacy 3-arg form: format_exception(type, value, tb) emits
	the ``Traceback (most recent call last):'' header plus the
	exception class + message lines."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:format_exception_three_arg.
	self assert: result size equals: 2.
	self assert: (result @env1:__getitem__: 0)
		equals: 'Traceback (most recent call last):
'.
	self assert: (result @env1:__getitem__: 1)
		equals: 'RuntimeError: legacy
'
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackFormatExceptionSingleArg
	"3.10+ single-exception form: format_exception(exc) infers the
	type from the instance and produces the same output as the
	legacy 3-arg form."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:format_exception_single_arg.
	self assert: (result @env1:__getitem__: 0)
		equals: 'Traceback (most recent call last):
'.
	self assert: (result @env1:__getitem__: 1)
		equals: 'ValueError: modern
'
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackFormatList
	"format_list indents each entry with two spaces and appends a
	newline."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:format_list_renders.
	self assert: (result @env1:__getitem__: 0) equals: '  frame-one
'.
	self assert: (result @env1:__getitem__: 1) equals: '  frame-two
'
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackWalkTbReturnsIterator
	"walk_tb returns an iterator (empty in Grail — no real frames)."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:walk_tb_returns_iterator.
	self assert: result size equals: 0
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackExceptionFromException
	"TracebackException.from_exception(e) captures the type/value
	for deferred rendering; format() emits the same lines as
	format_exception."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:tracebackexception_from_exception.
	self assert: (result @env1:__getitem__: 0)
		equals: 'Traceback (most recent call last):
'.
	self assert: (result @env1:__getitem__: 1)
		equals: 'TypeError: captured
'
%

category: 'Grail-Tests - traceback'
method: FlaskScaffoldingTestCase
testTracebackExceptionFormatExceptionOnly
	"format_exception_only returns just the ``Type: message'' line
	(no Traceback header)."

	| mod result |
	mod := self loadFixture: 'use_traceback'.
	result := mod @env1:tracebackexception_format_only.
	self assert: result size equals: 1.
	self assert: (result @env1:__getitem__: 0)
		equals: 'KeyError: x
'
%

! --- dataclasses module --------------------------------------------------

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesIsDataclassRecognises
	"is_dataclass(decorated_class) is True; is_dataclass(instance)
	is also True (CPython surface)."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:is_dataclass_recognises_class equals: true.
	self assert: mod @env1:is_dataclass_recognises_instance equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesIsDataclassRejects
	"is_dataclass returns False for plain ints / undecorated
	classes — doesn't raise."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:is_dataclass_rejects_plain_int equals: false.
	self assert: mod @env1:is_dataclass_rejects_plain_class equals: false
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesFields
	"fields(cls) enumerates Field descriptors in declaration order."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:fields_returns_descriptor_objects.
	self assert: result equals: #('x' 'y') asOrderedCollection.
	self assert: mod @env1:fields_each_is_a_Field_instance equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesAsdict
	"asdict reads each field via getattr — depends on the user's
	__init__ having stored the attribute."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:asdict_returns_field_value_dict.
	self assert: (result @env1:__getitem__: 'x') equals: 7.
	self assert: (result @env1:__getitem__: 'y') equals: 8
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesAstuple
	"astuple returns a tuple in field declaration order."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:astuple_returns_field_value_tuple.
	self assert: (result @env1:__getitem__: 0) equals: 7.
	self assert: (result @env1:__getitem__: 1) equals: 8
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesReplaceOverrides
	"replace(p, y=99) returns a fresh instance with y overridden
	and the unchanged fields copied.  Uses positional dispatch
	(field declaration order) rather than kwargs so the user's
	__init__ doesn't need a varargs kwarg signature."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:replace_overrides_one_field.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 99
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesReplaceNoChanges
	"replace(p) with no kwargs returns a fresh instance with the
	same field values."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:replace_preserves_unchanged_fields.
	self assert: (result @env1:__getitem__: 0) equals: 5.
	self assert: (result @env1:__getitem__: 1) equals: 6
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesFieldFactory
	"field(default=...) builds a Field descriptor with the
	supplied defaults; init / repr default to True."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:field_factory_defaults.
	self assert: (result @env1:__getitem__: 0) equals: 42.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesFieldRejectsBothDefaults
	"field(default=X, default_factory=Y) is a ValueError per
	CPython."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:field_factory_rejects_both_defaults
		equals: 'caught'
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesMissingSentinel
	"MISSING is a typed singleton — distinguishes ``no default''
	from ``default of None''."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:missing_sentinel_singleton.
	self assert: (result @env1:__getitem__: 0) equals: 'MISSING'.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesMakeDataclassStub
	"make_dataclass raises NotImplementedError — Grail doesn't
	expose 3-arg type(name, bases, ns) class creation."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:make_dataclass_is_stub equals: 'caught'
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesFrozenError
	"FrozenInstanceError subclasses AttributeError per CPython."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:frozen_error_is_attribute_error equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesDecoratorKwargsForm
	"@dataclass(frozen=True) — the decorator-with-arguments
	branch (the inner ``wrap'' returned when _cls is None)."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:decorator_kwargs_form equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesParamsCaptured
	"__dataclass_params__ records the decorator kwargs for
	introspection."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:dataclass_params_captured.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: true
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesSynthInitPositional
	"Synthesized __init__ binds positional args in declaration order."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:synth_init_positional.
	self assert: (result @env1:__getitem__: 0) equals: 7.
	self assert: (result @env1:__getitem__: 1) equals: 8
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesSynthInitKeyword
	"Synthesized __init__ accepts keyword args by field name."

	| mod result |
	mod := self loadFixture: 'use_dataclasses'.
	result := mod @env1:synth_init_keyword.
	self assert: (result @env1:__getitem__: 0) equals: 10.
	self assert: (result @env1:__getitem__: 1) equals: 20
%

category: 'Grail-Tests - dataclasses'
method: FlaskScaffoldingTestCase
testDataclassesSynthInitMissingRequired
	"Synthesized __init__ raises TypeError for missing required
	fields (no default / no default_factory)."

	| mod |
	mod := self loadFixture: 'use_dataclasses'.
	self assert: mod @env1:synth_init_missing_required equals: 'caught'
%

! --- collections module ---------------------------------------------------

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsOrderedDictKeepsOrder
	"OrderedDict preserves insertion order on .keys()."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:ordered_dict_keeps_order.
	self assert: (result @env1:__getitem__: 0) equals: 'c'.
	self assert: (result @env1:__getitem__: 1) equals: 'a'.
	self assert: (result @env1:__getitem__: 2) equals: 'b'
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsOrderedDictMoveToEnd
	"move_to_end(k) reseats k as the last key."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:ordered_dict_move_to_end.
	self assert: (result @env1:__getitem__: 0) equals: 'b'.
	self assert: (result @env1:__getitem__: 1) equals: 'c'.
	self assert: (result @env1:__getitem__: 2) equals: 'a'
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequeBasic
	"appendleft seeds the front; iteration walks left-to-right."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_basic_ops.
	self assert: (result @env1:__getitem__: 0) equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequePop
	"popleft drains the front, pop the back."

	| mod result tail |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_pop_both_ends.
	self assert: (result @env1:__getitem__: 0) equals: 10.
	self assert: (result @env1:__getitem__: 1) equals: 50.
	tail := result @env1:__getitem__: 2.
	self assert: (tail @env1:__getitem__: 0) equals: 20.
	self assert: (tail @env1:__getitem__: 1) equals: 30.
	self assert: (tail @env1:__getitem__: 2) equals: 40
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequeMaxlen
	"maxlen=N drops the leftmost when appending past capacity."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_maxlen.
	self assert: result size equals: 3.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 4.
	self assert: (result @env1:__getitem__: 2) equals: 5
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequeRotate
	"rotate(2) moves the last 2 elements to the front."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_rotate.
	self assert: (result @env1:__getitem__: 0) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 5.
	self assert: (result @env1:__getitem__: 2) equals: 1.
	self assert: (result @env1:__getitem__: 3) equals: 2.
	self assert: (result @env1:__getitem__: 4) equals: 3
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsNamedtupleBasic
	"Point(3, 4) supports indexed access + _fields / len()."

	| mod result fields |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:namedtuple_basic.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 4.
	fields := result @env1:__getitem__: 2.
	self assert: (fields @env1:__getitem__: 0) equals: 'x'.
	self assert: (fields @env1:__getitem__: 1) equals: 'y'.
	self assert: (result @env1:__getitem__: 3) equals: 2
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsNamedtupleFromString
	"namedtuple accepts space-separated field names as a string."

	| mod result fields |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:namedtuple_from_string.
	self assert: (result @env1:__getitem__: 0) equals: 'a'.
	self assert: (result @env1:__getitem__: 1) equals: 'b'.
	fields := result @env1:__getitem__: 2.
	self assert: (fields @env1:__getitem__: 0) equals: 'first'.
	self assert: (fields @env1:__getitem__: 1) equals: 'second'
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterCount
	"Counter from a string counts each char; missing key returns 0."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_count_iterable.
	self assert: (result @env1:__getitem__: 0) equals: 5.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 2.
	self assert: (result @env1:__getitem__: 3) equals: 0
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterMostCommon
	"most_common(n) returns the top n (key, count) pairs."

	| mod result first |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_most_common.
	self assert: result size equals: 2.
	first := result @env1:__getitem__: 0.
	self assert: (first @env1:__getitem__: 0) equals: 'a'.
	self assert: (first @env1:__getitem__: 1) equals: 3
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterTotal
	"total() sums all counts."

	| mod |
	mod := self loadFixture: 'use_collections'.
	self assert: mod @env1:counter_total equals: 6
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapLookup
	"First map wins on conflicting keys; later maps fill misses."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_lookup.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 20
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapWrite
	"Writes target the first map only."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_write_goes_first.
	self assert: (result @env1:__getitem__: 0) equals: 99.
	self assert: (result @env1:__getitem__: 1) equals: true.
	self assert: (result @env1:__getitem__: 2) equals: false
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDefaultdictStillWorks
	"The pre-existing defaultdict keeps working alongside the new types."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:defaultdict_still_works.
	self assert: ((result @env1:__getitem__: 0) size) equals: 2.
	self assert: ((result @env1:__getitem__: 1) size) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2
%

! --- ChainMap extras ------------------------------------------------------

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapParents
	"ChainMap.parents() drops the first / writable map.  CPython's
	property form isn't yet supported on Grail nested-class
	accessors so it's exposed as a plain method."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_parents.
	self assert: result size equals: 1.
	self assert: ((result @env1:__getitem__: 0) @env1:__getitem__: 'y') equals: 2
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapPop
	"pop only consults the first map; KeyError if absent (or
	optional default suppresses)."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_pop.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: false.
	self assert: (result @env1:__getitem__: 2) equals: 2
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapPopitem
	"popitem also targets only the first map."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_popitem.
	self assert: (result @env1:__getitem__: 0) equals: 'x'.
	self assert: (result @env1:__getitem__: 1) equals: 1
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsChainMapClear
	"clear empties only the first map; later maps in the chain
	remain visible."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:chainmap_clear.
	self assert: (result @env1:__getitem__: 0) size equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: true
%

! --- Counter extras (kwargs constructor + arithmetic) --------------------

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterKwargsInit
	"Counter(a=4, b=2, ...) — kwargs initialiser sets counts
	directly (no iteration)."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_kwargs_init.
	self assert: (result @env1:__getitem__: 0) equals: 4.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 0.
	self assert: (result @env1:__getitem__: 3) equals: -2
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterSubtract
	"Counter.subtract(other) subtracts counts in-place — zero /
	negative values are preserved (unlike __sub__ which drops them)."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_subtract.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 0.
	self assert: (result @env1:__getitem__: 2) equals: -3.
	self assert: (result @env1:__getitem__: 3) equals: -6
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterAddOp
	"Counter + Counter — element-wise add, drop zero/negative
	in the result."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_add_op.
	self assert: (result @env1:__getitem__: 'a') equals: 4.
	self assert: (result @env1:__getitem__: 'b') equals: 3
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterSubOp
	"Counter - Counter — element-wise subtract, drop zero/negative."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:counter_sub_op.
	self assert: result size equals: 1.
	self assert: (result @env1:__getitem__: 'a') equals: 3
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsCounterAndOrOp
	"Counter & Counter is element-wise min (intersection); | is max
	(union); both drop zero/negative."

	| mod andResult orResult |
	mod := self loadFixture: 'use_collections'.
	andResult := mod @env1:counter_and_op.
	orResult := mod @env1:counter_or_op.
	self assert: (andResult @env1:__getitem__: 'b') equals: 2.
	self assert: (andResult @env1:__getitem__: 'c') equals: 1.
	self assert: (orResult @env1:__getitem__: 'a') equals: 1.
	self assert: (orResult @env1:__getitem__: 'd') equals: 5
%

! --- deque extras (reversed + negative rotate) ---------------------------

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequeReversed
	"reversed(deque) — routes through deque.__reversed__ (a Python-
	level method on the Deque class).  builtins.reversed: now
	checks for __reversed__ on the receiver's class before falling
	back to env-0 reverseDo:."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_reversed_builtin.
	self assert: result equals: #(5 4 3 2 1) asOrderedCollection
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsDequeRotateNegative
	"rotate(-N) shifts left by N."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:deque_rotate_negative.
	self assert: result equals: #(3 4 5 1 2) asOrderedCollection
%

! --- namedtuple + OrderedDict extras -------------------------------------

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsNamedtupleMakeClassmethod
	"NT._make(iterable) builds an instance from any iterable of the
	right length.  Implementation goes through cls(*values) rather
	than cls.__new__(cls) to avoid the unbound-descriptor read path
	for Python user classes."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:namedtuple_make_classmethod.
	self assert: (result @env1:__getitem__: 0) equals: 10.
	self assert: (result @env1:__getitem__: 1) equals: 20
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsNamedtupleReplaceKwargs
	"p._replace(field=value) returns a fresh instance with the named
	field overridden."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:namedtuple_replace_kwargs.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 99
%

category: 'Grail-Tests - collections'
method: FlaskScaffoldingTestCase
testCollectionsOrderedDictPopitemFirst
	"popitem(last=False) pops from the front (FIFO order)."

	| mod result |
	mod := self loadFixture: 'use_collections'.
	result := mod @env1:ordered_dict_popitem_first.
	self assert: (result @env1:__getitem__: 0) equals: 'a'.
	self assert: (result @env1:__getitem__: 1) equals: 1
%

! --- io module ------------------------------------------------------------

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIORoundtrip
	"StringIO write + seek(0) + read returns the same text."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: (mod @env1:stringio_roundtrip: 'hello world') equals: 'hello world'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOInitial
	"StringIO(initial).read() returns the initial seed."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: (mod @env1:stringio_initial: 'seed') equals: 'seed'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOTellSeek
	"tell() after a write equals the byte count; seek(0) resets."

	| mod result |
	mod := self loadFixture: 'use_io'.
	result := mod @env1:stringio_tell_seek.
	self assert: (result @env1:__getitem__: 0) equals: 5.
	self assert: (result @env1:__getitem__: 1) equals: 0
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOOverwrite
	"Writing at a seek point overwrites the existing bytes in place."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: mod @env1:stringio_getvalue_after_seek equals: 'HEllo'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOIteration
	"Iterating a StringIO yields one line at a time, \\n included."

	| mod lines |
	mod := self loadFixture: 'use_io'.
	lines := mod @env1:stringio_readline_iter.
	self assert: lines size equals: 3.
	self assert: (lines @env1:__getitem__: 0) equals: 'a
'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOWritelines
	"writelines concatenates each iterable element."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: mod @env1:stringio_writelines equals: 'abc'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIORoundtrip
	"BytesIO write + seek + read."

	| mod data |
	mod := self loadFixture: 'use_io'.
	data := #[1 2 3 4 5] asByteArray.
	self assert: (mod @env1:bytesio_roundtrip: data) equals: data
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOPartialRead
	"read(n) returns at most n bytes."

	| mod data |
	mod := self loadFixture: 'use_io'.
	data := #[10 20 30 40 50] asByteArray.
	self assert: (mod @env1:bytesio_partial_read: data _: 3) equals: #[10 20 30] asByteArray
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOReadline
	"readline splits at \\n bytes, includes the delimiter."

	| mod lines |
	mod := self loadFixture: 'use_io'.
	lines := mod @env1:bytesio_readline.
	self assert: (lines @env1:__getitem__: 0) equals: 'line1
' asByteArray.
	self assert: (lines @env1:__getitem__: 1) equals: 'line2
' asByteArray.
	self assert: (lines @env1:__getitem__: 2) equals: 'line3' asByteArray.
	self assert: (lines @env1:__getitem__: 3) equals: #[] asByteArray
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOWithBlock
	"with io.BytesIO(...) as buf: ... auto-closes on exit."

	| mod result |
	mod := self loadFixture: 'use_io'.
	result := mod @env1:bytesio_with_block: 'abcd' asByteArray.
	self assert: (result @env1:__getitem__: 0) equals: 'ab' asByteArray.
	self assert: (result @env1:__getitem__: 1) equals: true
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOTruncate
	"truncate() drops bytes past the current position."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: mod @env1:bytesio_seek_end_then_truncate equals: 'abc' asByteArray
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testIoSeekConstants
	"io.SEEK_SET / SEEK_CUR / SEEK_END expose 0 / 1 / 2 — module-
	level constants Werkzeug uses for relative seeks against
	request.stream."

	| mod result |
	mod := self loadFixture: 'use_io'.
	result := mod @env1:io_seek_constants.
	self assert: (result @env1:__getitem__: 0) equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 2
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOSeekEndRelative
	"buf.seek(-2, io.SEEK_END) → read trailing 2 bytes.  Exercises
	the seek(offset, whence) two-positional form and the SEEK_END
	constant together."

	| mod result |
	mod := self loadFixture: 'use_io'.
	result := mod @env1:bytesio_seek_end_relative.
	self assert: (result @env1:__getitem__: 0) equals: 6.
	self assert: (result @env1:__getitem__: 1) equals: 'ef' asByteArray
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testStringIOCloseThenRead
	"Reading from a closed buffer raises ValueError (CPython's
	``I/O operation on closed file'' shape).  Werkzeug relies on
	this for request-lifecycle assertions."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: mod @env1:stringio_close_then_read equals: 'caught'
%

category: 'Grail-Tests - io'
method: FlaskScaffoldingTestCase
testBytesIOGetbuffer
	"buf.getbuffer() returns a memoryview-equivalent that round-trips
	through bytes().  Grail's getbuffer returns a bytes copy (no
	memoryview yet); functionally identical for the common
	``bytes(buf.getbuffer())'' idiom."

	| mod |
	mod := self loadFixture: 'use_io'.
	self assert: mod @env1:bytesio_getbuffer equals: 'hello' asByteArray
%

! --- json module ----------------------------------------------------------

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsList
	"dumps emits JSON for a list of primitives."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_list equals: '[1, 2, 3, "x"]'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsSorted
	"sort_keys=True returns keys in sorted order."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_sorted equals: '{"a": 1, "b": 2, "c": 3}'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsIndent
	"indent=2 inserts newlines and per-depth spaces."

	| mod expected |
	mod := self loadFixture: 'use_json'.
	expected := '{
  "a": 1,
  "b": 2
}'.
	self assert: mod @env1:dumps_indent equals: expected
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsUnicodeEscape
	"ensure_ascii=True (default) escapes non-ASCII to \\uXXXX."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_unicode_escape equals: '"\u00e9"'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsSimple
	"loads parses primitives and dict membership."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_simple.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: (result @env1:__getitem__: 'b') equals: 'two'.
	self assert: (result @env1:__getitem__: 'c') equals: None.
	self assert: (result @env1:__getitem__: 'd') equals: true
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsList
	"loads parses array with mixed primitives."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_list.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.5.
	self assert: (result @env1:__getitem__: 2) equals: -3.
	self assert: (result @env1:__getitem__: 3) equals: 'x'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsNested
	"loads handles nested arrays inside objects."

	| mod result inner middle |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_nested.
	inner := result @env1:__getitem__: 'a'.
	self assert: (inner @env1:__getitem__: 0) equals: 1.
	self assert: (inner @env1:__getitem__: 1) equals: 2.
	middle := inner @env1:__getitem__: 2.
	self assert: (middle @env1:__getitem__: 'b') equals: 'c'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsStringEscapes
	"loads expands JSON escape sequences."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_string_escapes.
	self assert: result equals: ('hello' , (String with: Character lf) , (String with: Character tab) , 'world' , (String with: (Character codePoint: 16rE9)))
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsWhitespace
	"loads tolerates arbitrary whitespace between tokens."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_with_whitespace.
	self assert: (result @env1:__getitem__: 'a') equals: 1.
	self assert: ((result @env1:__getitem__: 'b') @env1:__getitem__: 0) equals: 2.
	self assert: ((result @env1:__getitem__: 'b') @env1:__getitem__: 1) equals: 3
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonRoundtripPrimitives
	"loads(dumps(x)) preserves primitive values."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:roundtrip: 42.
	self assert: result equals: 42.
	result := mod @env1:roundtrip: 'hello'.
	self assert: result equals: 'hello'.
	result := mod @env1:roundtrip: true.
	self assert: result equals: true
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonRejectsExtra
	"loads raises ValueError for trailing data."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:reject_extra equals: 'caught'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsDefault
	"dumps(obj, default=fn) calls fn for unknown types."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_with_default equals: '{"thing": 42}'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsBytesInput
	"json.loads accepts bytes (UTF-8 decoded) per CPython 3.6+.
	itsdangerous _CompactJSON.loads relies on this."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_bytes_input.
	self assert: (result @env1:__getitem__: 'x') equals: 1.
	self assert: (result @env1:__getitem__: 'y') equals: 'hi'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadsBytearrayInput
	"json.loads also accepts bytearray."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:loads_bytearray_input.
	self assert: (result @env1:__getitem__: 0) equals: 1.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 3
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsSeparatorsCompact
	"Explicit ``separators=(',', ':')'' tuple strips all whitespace."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_separators_compact
		equals: '{"a":1,"b":2}'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsUnicodePassthrough
	"ensure_ascii=False emits the raw character instead of \\uXXXX."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_unicode_passthrough
		equals: '"é"'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsFloatInfinity
	"CPython emits ``Infinity'' / ``-Infinity'' / ``NaN'' for non-
	finite floats (not strict JSON, but the default behavior).
	GemStone Float lacks the standard isInfinite / isNaN predicates;
	encode-float now uses the private _isNaN + printString tags
	(``PlusInfinity'' / ``MinusInfinity'') to detect non-finite
	values instead."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_float_inf equals: 'Infinity'.
	self assert: mod @env1:dumps_negative_zero equals: '-0.0'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpsLargeInt
	"Arbitrary-precision ints round-trip as decimal digits."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dumps_large_int
		equals: '100000000000000000000000000000000000000000000000000'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonDumpToStream
	"json.dump(obj, fp) writes via fp.write(...)."

	| mod |
	mod := self loadFixture: 'use_json'.
	self assert: mod @env1:dump_to_stringio equals: '{"x": 1}'
%

category: 'Grail-Tests - json'
method: FlaskScaffoldingTestCase
testJsonLoadFromStream
	"json.load(fp) reads via fp.read() and parses."

	| mod result |
	mod := self loadFixture: 'use_json'.
	result := mod @env1:load_from_stringio.
	self assert: (result @env1:__getitem__: 'x') equals: 1.
	self assert: ((result @env1:__getitem__: 'y') @env1:__getitem__: 0) equals: 2.
	self assert: ((result @env1:__getitem__: 'y') @env1:__getitem__: 1) equals: 3
%

! --- datetime module ------------------------------------------------------

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeConstructor
	"datetime(year, month, day, hour, minute, second) builds a value
	with the expected fields."

	| mod dt fields |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:make_datetime.
	fields := mod @env1:datetime_fields: dt.
	self assert: (fields @env1:__getitem__: 0) equals: 2024.
	self assert: (fields @env1:__getitem__: 1) equals: 5.
	self assert: (fields @env1:__getitem__: 2) equals: 18.
	self assert: (fields @env1:__getitem__: 3) equals: 13.
	self assert: (fields @env1:__getitem__: 4) equals: 45.
	self assert: (fields @env1:__getitem__: 5) equals: 30
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeIsoformat
	"datetime.isoformat() emits YYYY-MM-DDTHH:MM:SS."

	| mod dt |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:make_datetime.
	self assert: (mod @env1:isoformat_of: dt) equals: '2024-05-18T13:45:30'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeFromIsoRoundtrip
	"fromisoformat parses what isoformat emits."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: mod @env1:round_trip_iso equals: '2024-05-18T13:45:30'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeNow
	"datetime.now() returns a current-year value."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: mod @env1:now_is_recent equals: true
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeTimestampRoundtrip
	"fromtimestamp(ts).timestamp() ~ ts."

	| mod ts result |
	mod := self loadFixture: 'use_datetime'.
	ts := 1700000000.0.
	result := mod @env1:timestamp_roundtrip: ts.
	self assert: (result - ts) abs < 1.0
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimedeltaConstructor
	"timedelta(days=2, hours=3, minutes=15) totals to 2.135... days."

	| mod td total |
	mod := self loadFixture: 'use_datetime'.
	td := mod @env1:make_timedelta.
	total := mod @env1:timedelta_total_seconds: td.
	self assert: total equals: ((2 * 86400) + (3 * 3600) + (15 * 60))
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimePlusTimedelta
	"datetime + timedelta returns a new datetime offset by the delta."

	| mod dt fields |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:add_timedelta.
	fields := mod @env1:datetime_fields: dt.
	self assert: (fields @env1:__getitem__: 0) equals: 2024.
	self assert: (fields @env1:__getitem__: 1) equals: 1.
	self assert: (fields @env1:__getitem__: 2) equals: 11.
	self assert: (fields @env1:__getitem__: 3) equals: 5
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeSubtraction
	"datetime - datetime returns a timedelta in seconds."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:subtract_datetimes.
	self assert: result equals: 10 * 86400 + (5 * 3600)
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimezoneUtc
	"datetime.timezone.utc is a singleton."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:utc_timezone.
	self assert: tz equals: mod @env1:utc_timezone.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeWithTz
	"datetime(..., tzinfo=timezone.utc) stores the tz and includes
	the offset in isoformat."

	| mod dt iso |
	mod := self loadFixture: 'use_datetime'.
	dt := mod @env1:datetime_with_tz.
	iso := dt @env1:isoformat.
	self assert: iso equals: '2024-05-18T12:00:00+00:00'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testDatetimeNowWithUtc
	"datetime.now(timezone.utc) attaches the supplied tz."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:datetime_now_utc.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testIsoformatParsesTz
	"fromisoformat extracts +00:00 and Z as UTC, fixed offsets as
	timezone(timedelta(...))."

	| mod tz |
	mod := self loadFixture: 'use_datetime'.
	tz := mod @env1:iso_with_tz: '2024-05-18T12:00:00Z'.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'.
	tz := mod @env1:iso_with_tz: '2024-05-18T12:00:00+00:00'.
	self assert: (tz @env1:tzname: nil) equals: 'UTC'
%

category: 'Grail-Tests - datetime'
method: FlaskScaffoldingTestCase
testTimedeltaArithmetic
	"timedelta + timedelta / timedelta - timedelta."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:timedelta_arithmetic.
	self assert: (result @env1:__getitem__: 0) equals: 45.0.
	self assert: (result @env1:__getitem__: 1) equals: 15.0
%

! --- datetime.date class -------------------------------------------------

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateConstructor
	"datetime.date(2024, 5, 18) — three-positional constructor."

	| mod result fields |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:make_date.
	fields := mod @env1:date_fields: result.
	self assert: (fields @env1:__getitem__: 0) equals: 2024.
	self assert: (fields @env1:__getitem__: 1) equals: 5.
	self assert: (fields @env1:__getitem__: 2) equals: 18
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateIsoformat
	"date.isoformat() → 'YYYY-MM-DD' zero-padded."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_isoformat: (mod @env1:make_date).
	self assert: result equals: '2024-05-18'
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateToday
	"datetime.date.today() returns a date in the current era."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_today_is_recent.
	self assert: result equals: true
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateFromIso
	"date.fromisoformat parses 'YYYY-MM-DD'."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_iso_roundtrip.
	self assert: result equals: '2024-05-18'
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateWeekday
	"date.weekday() — Monday=0..Sunday=6.  2024-05-18 was Saturday."

	| mod d |
	mod := self loadFixture: 'use_datetime'.
	d := mod @env1:make_date.
	self assert: (mod @env1:date_weekday: d) equals: 5.
	self assert: (mod @env1:date_isoweekday: d) equals: 6
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateToordinal
	"Proleptic Gregorian ordinal: 0001-01-01 = 1.  Round-trips via
	fromordinal."

	| mod d |
	mod := self loadFixture: 'use_datetime'.
	d := mod @env1:make_date.
	self assert: (mod @env1:date_toordinal: d) equals: 739024.
	self assert: (mod @env1:date_fromordinal_roundtrip: d)
		equals: '2024-05-18'
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDatePlusTimedelta
	"date + timedelta(days=N) → date."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_plus_timedelta.
	self assert: result equals: '2024-01-11'
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateMinusDate
	"date - date → timedelta whose ``days'' is the integer
	difference."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_minus_date.
	self assert: result equals: 10
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateEquality
	"==, <, > on dates use ordinal comparison."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_equality.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: false.
	self assert: (result @env1:__getitem__: 2) equals: true.
	self assert: (result @env1:__getitem__: 3) equals: true
%

category: 'Grail-Tests - datetime date'
method: FlaskScaffoldingTestCase
testDateReplace
	"date.replace(year=...) returns a fresh date with the override."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:date_replace.
	self assert: result equals: '2025-05-18'
%

! --- datetime.time class -------------------------------------------------

category: 'Grail-Tests - datetime time'
method: FlaskScaffoldingTestCase
testTimeConstructor
	"datetime.time(12, 30, 45) — accessors return the components."

	| mod t fields |
	mod := self loadFixture: 'use_datetime'.
	t := mod @env1:make_time.
	fields := mod @env1:time_fields: t.
	self assert: (fields @env1:__getitem__: 0) equals: 12.
	self assert: (fields @env1:__getitem__: 1) equals: 30.
	self assert: (fields @env1:__getitem__: 2) equals: 45.
	self assert: (fields @env1:__getitem__: 3) equals: 0
%

category: 'Grail-Tests - datetime time'
method: FlaskScaffoldingTestCase
testTimeIsoformat
	"time.isoformat() → 'HH:MM:SS', adds '.ffffff' when microseconds
	are non-zero."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: (mod @env1:time_isoformat: (mod @env1:make_time))
		equals: '12:30:45'.
	self assert: mod @env1:time_with_micros
		equals: '12:30:45.123456'
%

category: 'Grail-Tests - datetime time'
method: FlaskScaffoldingTestCase
testTimeFromIso
	"time.fromisoformat parses 'HH:MM', 'HH:MM:SS', and the
	fractional-seconds form."

	| mod |
	mod := self loadFixture: 'use_datetime'.
	self assert: (mod @env1:time_from_iso: '12:30') equals: '12:30:00'.
	self assert: (mod @env1:time_from_iso: '12:30:45')
		equals: '12:30:45'.
	self assert: (mod @env1:time_from_iso: '12:30:45.123456')
		equals: '12:30:45.123456'
%

category: 'Grail-Tests - datetime time'
method: FlaskScaffoldingTestCase
testTimeEquality
	"time == time compares all four components; cross-type
	comparisons return false."

	| mod result |
	mod := self loadFixture: 'use_datetime'.
	result := mod @env1:time_equality.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: false.
	self assert: (result @env1:__getitem__: 2) equals: false
%

! --- ipaddress module -----------------------------------------------------

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressParseAndPrint
	"Round-trip a dotted-quad through ip_address(str(...))."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:parse_ipv4: '192.168.1.1') equals: '192.168.1.1'.
	self assert: (mod @env1:parse_ipv4: '0.0.0.0') equals: '0.0.0.0'.
	self assert: (mod @env1:parse_ipv4: '255.255.255.255') equals: '255.255.255.255'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressPackedInt
	"int(IPv4Address) returns the 32-bit packed value."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:packed_int: '0.0.0.1') equals: 1.
	self assert: (mod @env1:packed_int: '1.0.0.0') equals: 16r01000000.
	self assert: (mod @env1:packed_int: '192.168.1.1') equals: 16rC0A80101
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressLoopback
	"127.x.x.x is loopback."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_loopback: '127.0.0.1') equals: true.
	self assert: (mod @env1:is_loopback: '127.255.255.255') equals: true.
	self assert: (mod @env1:is_loopback: '128.0.0.0') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressPrivate
	"RFC 1918 ranges (+ loopback / link-local) are private."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_private: '10.0.0.1') equals: true.
	self assert: (mod @env1:is_private: '172.16.0.1') equals: true.
	self assert: (mod @env1:is_private: '172.31.255.255') equals: true.
	self assert: (mod @env1:is_private: '172.32.0.1') equals: false.
	self assert: (mod @env1:is_private: '192.168.1.1') equals: true.
	self assert: (mod @env1:is_private: '8.8.8.8') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressGlobal
	"Public addresses are global; private/multicast/reserved aren't."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_global: '8.8.8.8') equals: true.
	self assert: (mod @env1:is_global: '192.168.1.1') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressLinkLocalAndMulticast
	"169.254/16 is link-local; 224/4 is multicast."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:is_link_local: '169.254.1.1') equals: true.
	self assert: (mod @env1:is_link_local: '10.0.0.1') equals: false.
	self assert: (mod @env1:is_multicast: '224.0.0.1') equals: true.
	self assert: (mod @env1:is_multicast: '192.168.1.1') equals: false
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressNetworkString
	"ip_network round-trips through str()."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_str: '192.168.1.0/24') equals: '192.168.1.0/24'.
	self assert: (mod @env1:network_str: '10.0.0.0/8') equals: '10.0.0.0/8'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressNetworkContains
	"addr in network for matching / non-matching addresses."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_contains: '192.168.1.0/24' _: '192.168.1.50') equals: true.
	self assert: (mod @env1:network_contains: '192.168.1.0/24' _: '192.168.2.1') equals: false.
	self assert: (mod @env1:network_contains: '10.0.0.0/8' _: '10.99.0.1') equals: true
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressBroadcastAddress
	"Network broadcast is the last address in the block."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: (mod @env1:network_broadcast: '192.168.1.0/24') equals: '192.168.1.255'.
	self assert: (mod @env1:network_broadcast: '10.0.0.0/8') equals: '10.255.255.255'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressRejectsIPv6
	"IPv6 is not supported yet; ip_address raises ValueError."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: mod @env1:reject_ipv6 equals: 'rejected'
%

category: 'Grail-Tests - ipaddress'
method: FlaskScaffoldingTestCase
testIpaddressRejectsBadOctet
	"Out-of-range octet raises ValueError."

	| mod |
	mod := self loadFixture: 'use_ipaddress'.
	self assert: mod @env1:reject_bad_octet equals: 'rejected'
%

! --- mimetypes module -----------------------------------------------------

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessHtml
	"index.html resolves to text/html with no encoding."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_html.
	self assert: (result @env1:__getitem__: 0) equals: 'text/html'.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessPng
	"img/header.png walks into the directory and finds image/png."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_png.
	self assert: (result @env1:__getitem__: 0) equals: 'image/png'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesWithEncoding
	"archive.tar.gz -> (application/x-tar, gzip).  The encoding map
	strips .gz to expose the underlying type."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_with_encoding.
	self assert: (result @env1:__getitem__: 0) equals: 'application/x-tar'.
	self assert: (result @env1:__getitem__: 1) equals: 'gzip'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesUnknown
	"Unknown extensions return (None, None)."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_unknown.
	self assert: (result @env1:__getitem__: 0) equals: None.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesExtensionless
	"Files with no extension return (None, None)."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_extensionless.
	self assert: (result @env1:__getitem__: 0) equals: None.
	self assert: (result @env1:__getitem__: 1) equals: None
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesStripsQuery
	"Query-string suffixes do not block extension detection."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_through_query.
	self assert: (result @env1:__getitem__: 0) equals: 'text/css'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesGuessExtension
	"image/jpeg reverse-resolves to one of the known extensions."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:guess_ext_of_jpeg.
	self assert: (#('.jpeg' '.jpg') includes: result)
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesAddType
	"add_type extends the runtime map."

	| mod result |
	mod := self loadFixture: 'use_mimetypes'.
	result := mod @env1:add_custom_then_guess.
	self assert: (result @env1:__getitem__: 0) equals: 'application/x-grail'
%

category: 'Grail-Tests - mimetypes'
method: FlaskScaffoldingTestCase
testMimetypesInited
	"mimetypes.inited is True after the module loads."

	| mod |
	mod := self loadFixture: 'use_mimetypes'.
	self assert: mod @env1:inited_after_import equals: true
%

! --- struct module --------------------------------------------------------

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructCalcsizeBasic
	"calcsize reports format-string byte counts."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: (mod @env1:calc_size: '!Q') equals: 8.
	self assert: (mod @env1:calc_size: '<H') equals: 2.
	self assert: (mod @env1:calc_size: '>IHB') equals: 7.
	self assert: (mod @env1:calc_size: '5s') equals: 5.
	self assert: (mod @env1:calc_size: '>BxH') equals: 4
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPackUnsignedQ
	"!Q (big-endian unsigned 8-byte) round-trip."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_be_q: 16r12345678AABBCCDD.
	self assert: packed equals: #[16r12 16r34 16r56 16r78 16rAA 16rBB 16rCC 16rDD] asByteArray.
	self assert: (mod @env1:unpack_be_q: packed) equals: 16r12345678AABBCCDD
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPackLittleEndianH
	"<H (little-endian unsigned 2-byte) writes low byte first."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_le_h: 16rCAFE.
	self assert: packed equals: #[16rFE 16rCA] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructSignedByteRoundtrip
	"b (signed char): -1 packs to 0xFF and unpacks back to -1."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_signed_byte: -1.
	self assert: packed equals: #[16rFF] asByteArray.
	self assert: (mod @env1:unpack_signed_byte: packed) equals: -1
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructUnsignedByteHigh
	"B with a positive value above 127."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: (mod @env1:pack_unsigned_byte: 255) equals: #[16rFF] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructString
	"5s packs exactly 5 bytes (zero-pads short input, no terminator)."

	| mod packed |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_string: 'abc' asByteArray.
	self assert: packed equals: #[97 98 99 0 0] asByteArray.
	self assert: (mod @env1:unpack_string: 'hello' asByteArray) equals: 'hello' asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructDoubleRoundtrip
	">d round-trips IEEE 754 double exactly for representable values."

	| mod packed unpacked |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_double: 3.14.
	self assert: packed size equals: 8.
	unpacked := mod @env1:unpack_double: packed.
	self assert: (unpacked - 3.14) abs < 1.0e-12
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructMixedFormat
	">IHB packs a mixed-width tuple in declaration order."

	| mod packed unpacked |
	mod := self loadFixture: 'use_struct'.
	packed := mod @env1:pack_mixed: 16rDEADBEEF _: 16rABCD _: 16r42.
	self assert: packed size equals: 7.
	self assert: packed equals: #[16rDE 16rAD 16rBE 16rEF 16rAB 16rCD 16r42] asByteArray.
	unpacked := mod @env1:unpack_mixed: packed.
	self assert: (unpacked @env1:__getitem__: 0) equals: 16rDEADBEEF.
	self assert: (unpacked @env1:__getitem__: 1) equals: 16rABCD.
	self assert: (unpacked @env1:__getitem__: 2) equals: 16r42
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructPaddingByte
	"`x` inserts a single zero byte and consumes no value."

	| mod |
	mod := self loadFixture: 'use_struct'.
	self assert: mod @env1:pack_with_padding equals: #[1 0 16rCA 16rFE] asByteArray
%

category: 'Grail-Tests - struct'
method: FlaskScaffoldingTestCase
testStructTimestampRoundtrip
	"itsdangerous-style: pack a Unix epoch into a big-endian Q,
	round-trip back."

	| mod ts |
	mod := self loadFixture: 'use_struct'.
	ts := 1700000000.
	self assert: (mod @env1:roundtrip_timestamp: ts) equals: ts
%

! --- warnings module ------------------------------------------------------

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsWarnDefault
	"warn() with default UserWarning category prints to Transcript and
	returns normally."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_default equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsWarnCategory
	"warn(message, DeprecationWarning) accepts an explicit category."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_with_category equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsIgnore
	"simplefilter('ignore') silently drops warnings."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_ignored equals: 'ok'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsErrorFilter
	"simplefilter('error') turns warnings into exceptions."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:warn_as_error equals: 'caught'
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsCatchRestoresFilters
	"catch_warnings() restores the filter list on __exit__."

	| mod result |
	mod := self loadFixture: 'use_warnings'.
	result := mod @env1:warn_catch_restores.
	self assert: (result @env1:__getitem__: 0) equals: 0.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 0
%

category: 'Grail-Tests - warnings'
method: FlaskScaffoldingTestCase
testWarningsFormatwarning
	"formatwarning() produces the CPython-style text."

	| mod |
	mod := self loadFixture: 'use_warnings'.
	self assert: mod @env1:format_a_warning equals: 'file.py:42: UserWarning: msg'
%

! --- secrets module -------------------------------------------------------

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenBytesDefault
	"token_bytes() returns 32 bytes by default."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_default.
	self assert: (result isKindOf: ByteArray).
	self assert: result size equals: 32
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenBytesNbytes
	"token_bytes(n) returns exactly n bytes."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_bytes_n: 8.
	self assert: result size equals: 8
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenHexLength
	"token_hex(n) returns a 2*n-character lowercase hex string."

	| mod result n |
	mod := self loadFixture: 'use_secrets'.
	n := 16.
	result := mod @env1:token_hex_n: n.
	self assert: result size equals: n * 2.
	"All chars in [0-9a-f]"
	result do: [:c |
		self assert: ((c >= $0 and: [c <= $9]) or: [c >= $a and: [c <= $f]])
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokenUrlsafeAlphabet
	"token_urlsafe(n) returns base64-urlsafe chars only ([A-Za-z0-9-_])."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:token_urlsafe_n: 12.
	"Length: ceil(n*4/3) without padding = 16 for n=12"
	self assert: result size equals: 16.
	result do: [:c |
		self assert:
			((c >= $A and: [c <= $Z])
				or: [(c >= $a and: [c <= $z])
				or: [(c >= $0 and: [c <= $9])
				or: [c = $- or: [c = $_]]]])
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsTokensAreRandom
	"Two consecutive token_bytes calls should produce different
	results (overwhelmingly likely - 1 in 2^128)."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: mod @env1:two_tokens_differ equals: true
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsChoice
	"choice returns a member of the input sequence."

	| mod result seq |
	mod := self loadFixture: 'use_secrets'.
	seq := list @env1:value: { #( 'a' 'b' 'c' 'd' 'e' ) @env0:asOrderedCollection } value: nil.
	result := mod @env1:choice_from: seq.
	self assert: (#('a' 'b' 'c' 'd' 'e') includes: result)
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsRandbelow
	"randbelow(n) returns an integer in [0, n)."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	1 to: 20 do: [:i |
		result := mod @env1:randbelow_n: 10.
		self assert: result >= 0.
		self assert: result < 10
	]
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsRandbits
	"randbits(k) returns a non-negative int < 2^k."

	| mod result |
	mod := self loadFixture: 'use_secrets'.
	result := mod @env1:randbits_k: 8.
	self assert: result >= 0.
	self assert: result < 256
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsCompareDigestEqual
	"compare_digest returns true for equal inputs."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: (mod @env1:compare_equal: 'hello' _: 'hello') equals: true.
	self assert: (mod @env1:compare_equal: 'hello' asByteArray _: 'hello' asByteArray) equals: true
%

category: 'Grail-Tests - secrets'
method: FlaskScaffoldingTestCase
testSecretsCompareDigestDiffers
	"compare_digest returns false for different inputs."

	| mod |
	mod := self loadFixture: 'use_secrets'.
	self assert: (mod @env1:compare_equal: 'hello' _: 'world') equals: false.
	self assert: (mod @env1:compare_equal: 'hello' _: 'helloo') equals: false
%

! --- contextlib + with-statement ------------------------------------------

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithClosing
	"`with closing(t) as obj:` calls __enter__ (returns wrapped object),
	runs body, then __exit__ which closes t."

	| mod result |
	mod := self loadFixture: 'use_contextlib'.
	result := mod @env1:closing_works.
	self assert: (result @env1:__getitem__: 0) equals: true.
	self assert: (result @env1:__getitem__: 1) equals: 7
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithSuppressCatches
	"`with suppress(ValueError):` swallows the matching exception so
	control resumes after the with-block."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:suppress_catches equals: true
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithSuppressLetsOtherThrough
	"suppress(ValueError) re-raises TypeError so the enclosing
	try/except sees it."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:suppress_lets_other_through equals: 'caught'
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testWithNullcontextYieldsValue
	"`with nullcontext(42) as v:` binds v to the enter result."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:nullcontext_yields equals: 42
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testExitStackOrders
	"ExitStack runs callbacks in LIFO order on exit."

	| mod order |
	mod := self loadFixture: 'use_contextlib'.
	order := mod @env1:exitstack_orders.
	self assert: order size equals: 3.
	self assert: (order @env1:__getitem__: 0) equals: 'c'.
	self assert: (order @env1:__getitem__: 1) equals: 'b'.
	self assert: (order @env1:__getitem__: 2) equals: 'a'
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testContextmanagerYieldsValue
	"@contextmanager turns `yield value` into __enter__'s return."

	| mod |
	mod := self loadFixture: 'use_contextlib'.
	self assert: mod @env1:contextmanager_yields equals: 99
%

category: 'Grail-Tests - contextlib'
method: FlaskScaffoldingTestCase
testContextmanagerRunsCleanup
	"@contextmanager's finally-after-yield runs on exit."

	| mod log |
	mod := self loadFixture: 'use_contextlib'.
	log := mod @env1:contextmanager_runs_cleanup.
	self assert: log size equals: 3.
	self assert: (log @env1:__getitem__: 0) equals: 'enter'.
	self assert: (log @env1:__getitem__: 1) equals: 'body'.
	self assert: (log @env1:__getitem__: 2) equals: 'exit'
%

! --- Blinker end-to-end (Tier 1) ------------------------------------------

category: 'Grail-Tests - Blinker'
method: FlaskScaffoldingTestCase
testBlinkerNamedSignal
	"``blinker.NamedSignal(name, doc)`` constructs through Signal's
	super-routed __init__ — exercises the Super-via-varargs
	dispatch (``___init__:kw:`` parent + ``with:with:performMethod:``
	bypass) and the metaclass-chain walk for ``self.set_class`` from
	a subclass instance (class-side instVars are per-class)."

	| blinker NS ns |
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/blinker/__init__.py') name: 'blinker'.
	blinker := (importlib @env1:modules) @env0:at: 'blinker' @env0:asSymbol.
	NS := blinker @env1:NamedSignal.
	ns := NS @env1:value: { 'my_event'. 'docstring' } value: nil.
	self assert: (ns @env1:name) equals: 'my_event'.
%

category: 'Grail-Tests - Blinker'
method: FlaskScaffoldingTestCase
testBlinkerNamespaceSignalFactory
	"``Namespace().signal(name)`` round-trips: Namespace subclasses
	dict[str, NamedSignal] (subscripted base via dict.__getitem__),
	signal() looks up or creates a NamedSignal under that name."

	| blinker Namespace space sig |
	importlib loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/blinker/__init__.py') name: 'blinker'.
	blinker := (importlib @env1:modules) @env0:at: 'blinker' @env0:asSymbol.
	Namespace := blinker @env1:Namespace.
	space := Namespace @env1:value: #() value: nil.
	sig := space @env1:signal: 'foo'.
	self assert: (sig @env1:name) equals: 'foo'.
	"Repeat lookup returns the SAME signal."
	self assert: (space @env1:signal: 'foo') == sig.
%

! --- Unified attribute-call protocol --------------------------------------

category: 'Grail-Tests - AttrCall'
method: FlaskScaffoldingTestCase
testAttrCallInvokesClassValue
	"``obj.X()`` where X resolves to a class (class-side attribute
	holding a class) must invoke ``__new__`` to construct, not just
	read the class.  The unified call protocol routes 0-arg
	attribute calls through ___pyAttrLoad___ + ``value:value:`` —
	classes respond to ``value:value:`` via ``object class``."

	| mod h inst Inner |
	mod := self loadFixture: 'attr_call_protocol'.
	h := mod @env1:make.
	inst := h @env1:make_inner.
	Inner := mod @env1:Inner.
	self assert: inst class equals: Inner.
	self assert: (inst @env1:label) equals: 'inner-built'.
%

! --- Generator protocol: send / throw / close ------------------------------

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorSend
	"``gen.send(value)`` resumes the generator with ``value`` as the
	yield expression's value.  Adder generator accumulates sent
	values; first ``next()`` reaches the initial yield (total=0),
	subsequent ``send(x)`` updates total and yields the new total."

	| mod g first second third |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:adder.
	first := g @env1:__next__.
	second := g @env1:send: 10.
	third := g @env1:send: 5.
	self assert: first equals: 0.
	self assert: second equals: 10.
	self assert: third equals: 15.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorThrowCaught
	"``gen.throw(ex)`` injects ``ex`` at the suspended yield point.
	Generators that wrap a yield in try/except can catch the thrown
	exception and continue yielding past it."

	| mod g first afterCatch tail |
	mod := self loadFixture: 'generator_protocol'.
	g := mod @env1:catches_throw.
	first := g @env1:__next__.
	afterCatch := g @env1:throw: (ValueError @env0:new).
	tail := g @env1:__next__.
	self assert: first equals: 'before'.
	self assert: afterCatch equals: 'caught'.
	self assert: tail equals: 'after'.
%

category: 'Grail-Tests - Generators'
method: FlaskScaffoldingTestCase
testGeneratorClose
	"``gen.close()`` injects GeneratorExit at the suspended yield
	point.  Body ``finally`` clauses fire as the exception unwinds,
	so cleanup runs even though the consumer never drains the
	generator to StopIteration."

	| mod holder g closeResult |
	mod := self loadFixture: 'generator_protocol'.
	holder := OrderedCollection new add: 'open'; yourself.
	g := mod @env1:cleanup_marker: holder.
	g @env1:__next__.
	g @env1:__next__.
	closeResult := g @env1:close.
	self assert: closeResult equals: None.
	self assert: (holder @env0:at: 1) equals: 'closed'.
%

! --- FunctionDefAst: varargs method prologue (kwargs fallback, *args, **kwargs) ---

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwargFallbackForNamedParam
	"A named parameter (with default) is satisfied by a keyword
	argument when not passed positionally.  Before the fix, the
	varargs prologue ignored kwargs for named params and the
	default fired even when the caller had supplied the keyword."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Pass `a` positionally, `b` and `c` as kwargs."
	result := obj
		@env1:_by_default: { 1 }
		kw: (KeyValueDictionary new
			at: 'b' put: 20;
			at: 'c' put: 300;
			yourself).
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 20.
	self assert: (result @env0:at: 3) equals: 300.
	"Defaults still fire when no kwargs supplied."
	result := obj @env1:_by_default: { 1 } kw: nil.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
	self assert: (result @env0:at: 3) equals: 3.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testStarArgsAndStarStarKwargs
	"*args collects leftover positionals as a tuple; **kwargs
	collects unused keyword args into a dict.  Both bindings were
	missing from the class-method varargs path before the codegen
	parity fix.

	Updated post-commit a9e96e5: the user-visible kwargs dict is
	now String-keyed (Python ``str'' per CPython spec) — the
	codegen converts Symbol→String at the **kwargs binding
	boundary.  Test lookup matches with String key 'extra'."

	| mod cls obj result tail kw |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	result := obj
		@env1:_collect_extra: { 'h'. 'a'. 'b' }
		kw: (KeyValueDictionary new
			at: 'extra' put: 99;
			yourself).
	self assert: (result @env0:at: 1) equals: 'h'.
	tail := result @env0:at: 2.
	self assert: tail @env0:size equals: 2.
	self assert: (tail @env0:at: 1) equals: 'a'.
	self assert: (tail @env0:at: 2) equals: 'b'.
	kw := result @env0:at: 3.
	self assert: (kw @env0:at: 'extra') equals: 99.
%

category: 'Grail-Tests - Varargs'
method: FlaskScaffoldingTestCase
testKwonlyArgs
	"Keyword-only arguments must come from kwargs (no positional
	fallback); missing required kwonly raises TypeError."

	| mod cls obj result |
	mod := self loadFixture: 'varargs_unpack'.
	cls := mod @env1:Sigs.
	obj := cls @env1:value: #() value: nil.
	"Supply both."
	result := obj
		@env1:_kwonly: #()
		kw: (KeyValueDictionary new
			at: 'x' put: 10;
			at: 'y' put: 200;
			yourself).
	self assert: (result @env0:at: 1) equals: 10.
	self assert: (result @env0:at: 2) equals: 200.
	"y has a default."
	result := obj
		@env1:_kwonly: #()
		kw: (KeyValueDictionary new at: 'x' put: 11; yourself).
	self assert: (result @env0:at: 1) equals: 11.
	self assert: (result @env0:at: 2) equals: 20.
%

! --- Class/instance introspection: __name__ and __dict__ -------------------

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testBuiltinClassName
	"``cls.__name__`` works on built-in Python types via the
	``object class >> __name__`` (env-1) fallback inherited
	through the metaclass chain."

	self assert: (OrderedCollection @env1:__name__) equals: 'OrderedCollection'.
	self assert: (KeyValueDictionary @env1:__name__) equals: 'KeyValueDictionary'.
	self assert: (ExecBlock @env1:__name__) equals: 'ExecBlock'.
	self assert: (BoundMethod @env1:__name__) equals: 'BoundMethod'.
%

category: 'Grail-Tests - Introspection'
method: FlaskScaffoldingTestCase
testInstanceDict
	"`obj.__dict__` returns a LIVE view of the instance's attributes.
	Phase B: all attributes (both __init__-discovered ones and
	runtime-added ones) live in dynamic-instVar storage and surface
	through __dict__ uniformly.  Used by blinker's cached-property
	idiom ``if 'X' in self.__dict__:'' and jinja2's
	``rv.__dict__.update(self.__dict__)'' copy idiom.

	Updated from the snapshot-only KeyValueDictionary return to a
	live PyInstanceDict proxy that propagates writes back into the
	instance — the previous snapshot silently dropped
	``rv.__dict__.update(self.__dict__)'' writes, which broke jinja2
	Frame.copy() and the ``{% if %}'' compile path."

	| mod cls obj d |
	mod := self loadFixture: 'cls_self'.
	cls := mod @env1:FirstParamSelf.
	obj := cls @env1:value: { 'label-value' } value: nil.
	d := obj @env1:__dict__.
	self assert: (d @env0:isKindOf: PyInstanceDict).
	"Phase B: ``label'' set in __init__ also shows up here (the old
	``Smalltalk instVar vs ___dict___'' split is gone — everything
	lives in dynamic-instVar storage)."
	self assert: (d @env0:at: #label) equals: 'label-value'.
	"Runtime attribute through the DNU setter path also lands here."
	obj @env1:dynamicAttr: 42.
	d := obj @env1:__dict__.
	self assert: (d @env0:at: #dynamicAttr) equals: 42.
%

! --- CallAst: bare zero-arg super() ---------------------------------------

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperOneArgInit
	"`super().__init__(x)` from a subclass — codegen rewrites the
	bare ``super()`` to a Super proxy bound to (lexical class, self),
	and the direct unary send ``__init__: x`` routes through Super''s
	DNU which dispatches via ``with:performMethod:`` to the parent
	class's compiled ``__init__:`` with `obj` substituted as receiver
	(bypassing the override that triggered the super call)."

	| mod Derived inst |
	mod := self loadFixture: 'super_calls'.
	Derived := mod @env1:Derived.
	inst := Derived @env1:value: { 10. 20 } value: nil.
	self assert: (inst @env1:x) equals: 10.
	self assert: (inst @env1:y) equals: 20.
%

category: 'Grail-Tests - SuperCall'
method: FlaskScaffoldingTestCase
testSuperZeroArgInit
	"`super().__init__()` with no args — Super DNU dispatches via
	``performMethod:`` (the 0-arg primitive form) to the parent
	class's ``__init__``.  Used by collections.defaultdict.__init__
	to invoke object.__init__."

	| mod ZeroArg inst |
	mod := self loadFixture: 'super_calls'.
	ZeroArg := mod @env1:ZeroArgSuper.
	inst := ZeroArg @env1:value: #() value: nil.
	self assert: (inst @env1:flag) equals: true.
%

! --- SubscriptAst: class-subscript as base ---------------------------------

category: 'Grail-Tests - SubscriptAst'
method: FlaskScaffoldingTestCase
testSubscriptedBuiltinAsBaseClass
	"`class X(dict[K, V]):` evaluates ``dict[K, V]`` at runtime as
	part of the base-class list.  Grail's dict class-side
	__getitem__: stub returns the class itself so the parameterized
	base resolves to the origin class (KeyValueDictionary).  Without
	the stub, class-statement execution DNUs on the metaclass."

	| mod cls inst |
	mod := self loadFixture: 'subscripted_base'.
	cls := mod @env1:StringKeyedDict.
	"The class inherits from KeyValueDictionary (Grail's dict)."
	self assert: cls superclass equals: KeyValueDictionary.
	inst := mod @env1:make.
	self assert: (inst @env0:at: 'k') equals: 1.
	self assert: (inst @env1:label) equals: 'string-keyed'.
%

! --- jinja2 trivial template render (M4) -----------------------------------

category: 'Grail-Tests - jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderTrivialTemplate
	"M4 milestone: ``env.from_string('Hello world').render()`` returns
	the rendered string.  Establishes the end-to-end path through
	the compiler, exec'd code, generator iteration, and ``''.join``
	on the PythonGenerator."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:jinja2_render_trivial equals: 'Hello world'
%

! --- ClassMethod param shadowing (FunctionDefAst fix) ---------------------

category: 'Grail-Tests - Parameter shadowing'
method: FlaskScaffoldingTestCase
testParamNameShadowsInstVar
	"A class method parameter whose name matches a class instVar
	must shadow the instVar — Python parameters are always locals.
	Hits FunctionDefAst generateMethodSourceOn:'s temp-list
	build and AssignAst/AttributeAst's accessor-routing for self.X
	reads + writes."

	| mod tup |
	mod := self loadFixture: 'use_jinja2_partial'.
	tup := mod @env1:param_name_shadows_instvar.
	self assert: (tup @env1:__getitem__: 0) equals: 99.
	self assert: (tup @env1:__getitem__: 1) equals: 7
%

! --- Default capture for X=X (FunctionDefAst closure-form fix) ------------

category: 'Grail-Tests - Default captures'
method: FlaskScaffoldingTestCase
testDefaultCapturesOuterSameName
	"``def inner(x=outer):`` captures ``outer`` at def-time; later
	mutations of ``outer`` don't affect the default.  Closure-form
	FunctionDefAst now pre-evaluates defaults in the enclosing
	scope so a ``X=X`` default (jinja2's ``missing=missing``) sees
	the outer binding rather than the unbound inner local."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:default_captures_outer_same_name equals: 42
%

! --- try/except passes PythonReturn (TryAst fix) --------------------------

category: 'Grail-Tests - Control-flow signals'
method: FlaskScaffoldingTestCase
testTryExceptDoesNotSwallowReturn
	"Grail's PythonReturn / PythonBreak / PythonContinue are Exception
	subclasses; without an explicit re-raise in TryAst handlers, a
	Python ``try: return X; except Exception: …`` would trap the
	return and run the handler.  jinja2's render() wraps its
	body in exactly this shape."

	| mod |
	mod := self loadFixture: 'use_jinja2_partial'.
	self assert: mod @env1:try_except_does_not_swallow_return equals: 'from-try'
%

! --- jinja2 lexer end-to-end on a variable template (M4 follow-up) -------

category: 'Grail-Tests - jinja2 lexer'
method: FlaskScaffoldingTestCase
testJinja2LexVariableTemplate
	"M4 follow-up: ``env.lex('Hello {{ name }}!')`` produces the full
	7-token stream (data, variable_begin, whitespace, name,
	whitespace, variable_end, data).  Past the trivial-render
	milestone — exercises the OptionalLStrip factory rewrite,
	ClassDefAst firstBaseIsTuple, the PyDict_Next plumbing
	(``Match.groupdict()`` works again), and the explicit-loop
	rewrite of the lstrip-rule scan that the tokeniter generator
	used to perform via ``next(genexp)``."

	| mod toks |
	mod := self loadFixture: 'use_jinja2_partial'.
	toks := mod @env1:jinja2_lex_variable_template.
	self assert: toks size equals: 7.
	self assert: ((toks @env1:__getitem__: 0) @env1:__getitem__: 0) equals: 'data'.
	self assert: ((toks @env1:__getitem__: 0) @env1:__getitem__: 1) equals: 'Hello '.
	self assert: ((toks @env1:__getitem__: 1) @env1:__getitem__: 0) equals: 'variable_begin'.
	self assert: ((toks @env1:__getitem__: 3) @env1:__getitem__: 0) equals: 'name'.
	self assert: ((toks @env1:__getitem__: 3) @env1:__getitem__: 1) equals: 'name'.
	self assert: ((toks @env1:__getitem__: 5) @env1:__getitem__: 0) equals: 'variable_end'.
	self assert: ((toks @env1:__getitem__: 6) @env1:__getitem__: 1) equals: '!'
%

! --- Jinja2 render with interpolation -----------------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderInterpolatedTemplate
	"``env.from_string('Hello {{ name }}!').render(name='World')''
	returns ``'Hello World!'''.  Was blocked behind the module-
	singleton duplicate-class bug: jinja2's ``Node.iter_child_nodes''
	compared an externally-accessible ``Node'' against the singleton's
	``Node'' and yielded nothing, so the compiler's
	``FrameSymbolVisitor'' never visited the ``Name'' node and
	``Symbols.refs'' was empty when ``ref('name')'' fired.

	Fix landed in importlib's ``loadModuleFromPath:'' (calls
	``moduleClass ___adoptInstance___: moduleInstance'' before
	running initialize).  Paired with PythonGenerator >> do: so the
	``yield from'' codegen path (which uses ``@env0:do:'') works
	for inner-generator delegation."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_interpolated.
	self assert: result equals: 'Hello World!'
%

! --- Jinja2 for-loop render -----------------------------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderForLoopTemplate
	"``{% for x in items %}[{{ x }}]{% endfor %}'' with items=[1,2,3]
	→ '[1][2][3]'.  Pre-fix the rendered template emitted
	``[][][]'' because jinja2's idtracking forwarded
	``store_as_param=True'' through ``f(*args, **kwargs)'' and the
	Symbol-keyed kwargs missed the String-keyed extraction in the
	callee.  Loop variable registered as VAR_LOAD_UNDEFINED and the
	compiled template clobbered each iteration with ``l_1_x = missing''."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_for_loop.
	self assert: result equals: '[1][2][3]'
%

! --- Jinja2 filter render ------------------------------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderFilterUpper
	"``{{ name|upper }}'' with name='hello' renders 'HELLO'.  Required
	two fixes: (1) Filter class __name__ correctly resolves to 'Filter'
	(not '_FilterTestCommon' inherited via kernel-metaclass-slot leak);
	(2) jinja2.compiler's _filter_test_common @contextmanager method
	split into explicit pre/post helpers (ClassDefAst doesn't honor
	arbitrary class-method decorators yet)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_filter_upper.
	self assert: result equals: 'HELLO'
%

! --- Jinja2 render of a template containing a string literal ------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderTemplateWithStringLiteral
	"A template containing a Jinja2 string literal renders.  Lexing the
	embedded string token routes through jinja2's
	.encode(''ascii'', ''backslashreplace'').decode(''unicode-escape'')
	normalization.  Pre-fix, bytes (ByteArray) had no unicode-escape
	codec; the resulting LookupError tunneled out of the lexer''s
	PythonGenerator fork as a TemplateSyntaxError that no on:do: could
	trap from the caller''s stack.  Fix: ByteArray>>decode: now
	dispatches the unicode-escape codec to ___decodeUnicodeEscape___."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_template_with_string_literal.
	self assert: result equals: 'hi!'
%

! --- Jinja2 binop render (factory-assigned visit method) -----------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderBinopAdd
	"Pre-fix, every BinOp/UnaryOp visitor was assigned at class scope
	via ``visit_Add = _make_binop(''+'')''.  Grail does not apply the
	descriptor protocol when an ExecBlock is stored as a class
	attribute, so ``self.visit_Add(node, frame)'' invoked the inner
	closure with ``(node, frame)'' — losing the bound ``self'' and
	raising TypeError(''missing required argument: frame'').  Fixed
	by expanding each binding to an explicit method body in
	jinja2/compiler.py that delegates to a shared helper."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_binop_add.
	self assert: result equals: '6'
%

! --- Jinja2 trim filter (str.strip(chars)) -------------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderTrimFilter
	"|trim filter routes through soft_str(value).strip(chars) with
	chars=None.  CharacterCollection had only the no-arg ``strip'';
	the one-arg form ``strip:'' was missing.  Added ``strip: chars''
	(env-1) that delegates to ___lstripChars___/___rstripChars___
	helpers (env-0) for non-None chars; None falls back to trimBoth."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_trim_filter.
	self assert: result equals: 'hello'
%

! --- Jinja2 |list filter (async-variant unwrap) --------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderListFilter
	"|list filter was bound to the async coroutine wrapper rather
	than ``sync_do_list'' because @async_variant is a module-level
	decorator that Grail drops on the floor.  The async wrapper
	tunneled through ``auto_to_list'' / ``_IteratorToAsyncIterator''
	and crashed inside async scaffolding.  Fix: dispatch table now
	points at sync_do_X directly for the dozen @async_variant pairs."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_list_filter.
	self assert: result equals: '[10, 20, 30]'
%

! --- Jinja2 __debug__ builtin ---------------------------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderUsesDebugBuiltin
	"jinja2.runtime.Context.call opens with ``if __debug__:'' so any
	attribute-call routed through Context.call raised NameError(name
	''__debug__'' is not defined).  Fixed by binding __debug__ to
	True in Grail's builtin globals (install.gs)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_debug_builtin.
	self assert: result equals: 'HELLO'
%

! --- Jinja2 @pass_X-decorated filters (module-level decorator support) ---

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderFirstFilter
	"|first calls sync_do_first, which is @pass_environment-decorated.
	Grail used to drop module-level decorators, so jinja2's
	Context.call didn''t inject the environment argument and the
	function received only ``seq'' (raising MNU _sync_do_first:kw:
	or TypeError missing argument).  Fix: FunctionDefAst applies a
	narrow whitelist of attribute-only decorators (pass_environment,
	pass_eval_context, pass_context) at module body time, calling
	the decorator on the BoundMethod so f.jinja_pass_arg is set."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_first_filter.
	self assert: result equals: '10'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderJoinFilter
	"|join exercises @pass_eval_context — same fix as |first."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_join_filter.
	self assert: result equals: '10-20-30'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderSortFilter
	"|sort exercises @pass_environment — same fix as |first."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_sort_filter.
	self assert: result equals: '[10, 20, 30]'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderSumFilter
	"|sum builtin needs ``sum(iterable, start=0)'' two-positional /
	kwarg form so the @pass_environment dispatch can pass through."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_sum_filter.
	self assert: result equals: '60'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderMinFilter
	"|min needs (a) varargs ``_min:kw:'' builtin and (b) ExecBlock
	___pyCallValue___:kw: so jinja2's make_attrgetter closure is
	callable from _min_or_max."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_min_filter.
	self assert: result equals: '10'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderMaxFilter
	"|max — symmetric to |min."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_max_filter.
	self assert: result equals: '30'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderMapFilter
	"|map needs StarredAst inside ListAst:
	``args = [value, *(args if args is not None else ())]''.  Pre-
	fix, ListAst.printSmalltalkOn: didn''t recognise StarredAst
	elements and the codegen fell through to the runtime stub
	(TypeError ``*-unpack in call sites is not yet supported'')."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_map_filter.
	self assert: result equals: '[''10'', ''20'', ''30'']'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderRejectFilter
	"|reject exercises the same ListAst-with-Starred splat path."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_reject_filter.
	self assert: result equals: '[10, 20, 30]'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderRoundFilter
	"|round on a Float must yield a Float — Grail used to render
	``1.234|round(2)'' as the Fraction ''123/100'' because the 2-arg
	round divided two Integers.  Fixed by coercing the multiplier to
	Float when the input is a Float."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_round_filter.
	self assert: result equals: '1.23'
%

! --- Jinja2 macros (PythonInstance __call__ dispatch fix) -----------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderMacroBasic
	"{% macro %} renders by allocating a jinja2.runtime.Macro
	instance and dispatching via Context.call → PythonInstance>>
	value:value:.  Pre-fix, value:value: looked up the varargs
	selector as ``___call___:kw:'' (3 trailing underscores) but the
	BoundMethod convention emits ``___call__:kw:'' (2 trailing
	underscores: ``_'' prefix + ``__call__'' itself), so the
	lookup missed and the call fell through to a bare ``__call__''
	unary that DNU'd."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_macro_basic.
	self assert: result equals: 'hi world'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderMacroInLoop
	"Invoking a macro from inside a {% for %} loop — exercises the
	__call__ dispatch on every iteration."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_macro_in_loop.
	self assert: result equals: 'hi a;hi b;hi c;'
%

! --- Jinja2 {% block %} (CallAst.func paren-wrap for SubscriptAst) -------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderBlockBasic
	"{% block %} compiles to ``yield from
	context.blocks['hdr'][0](context)'' — a SubscriptAst-of-
	SubscriptAst applied as a function.  Pre-fix CallAst only
	parenthesised AttributeAst functions, so the trailing
	``value:value:'' fused with the inner ``__getitem__:'' into
	one 3-keyword selector ``__getitem__:value:value:'', which
	OrderedCollection didn't understand → MNU nil."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_block_basic.
	self assert: result equals: 'body'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderTwoBlocks
	"Two adjacent blocks — same SubscriptAst-call path twice."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_two_blocks.
	self assert: result equals: 'A|B'
%

! --- Jinja2 |groupby + unbound-class-method (Cls.method(self)) -----------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderGroupbyFilter
	"|groupby was blocked behind the Python ``tuple.__repr__(self)''
	descriptor-read idiom inside jinja2's _GroupTuple.__repr__.
	Unblocked by (1) Object>>___pyAttrLoad___ recognising
	unbound-class-method reads (return a closure that dispatches the
	EXACT method compiled on the class via performMethod:); (2)
	rewriting _GroupTuple.__repr__ in filters.py to build the tuple
	repr explicitly instead of routing through tuple.__repr__'s env-1
	do:separatedBy:."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_groupby_filter.
	self assert: result equals:
		'[(25, [{''name'': ''Carol'', ''age'': 25}]), (30, [{''name'': ''Bob'', ''age'': 30}, {''name'': ''Alice'', ''age'': 30}])]'
%

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testUnboundClassMethodBypassesMRO
	"Direct test of the unbound-class-method descriptor read:
	``A.name(b)'' must call A's name, not B's, even though b is
	a B (and B overrides name).  Without performMethod: bypass,
	the BoundMethod dispatch path would re-enter the subclass
	override and recurse infinitely (or just return the wrong
	value)."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:unbound_class_method_basic.
	self assert: (result @env1:__getitem__: 0) equals: 'B'.
	self assert: (result @env1:__getitem__: 1) equals: 'A'
%

! --- Jinja2 if-block render (current blocker) -----------------------------

category: 'Grail-Tests - Jinja2 render'
method: FlaskScaffoldingTestCase
testJinja2RenderIfTruthyTemplate
	"``{% if x %}YES{% endif %}'' with x=True → 'YES'.  Current
	blocker after for-loop interpolation landed in 46d394f — at
	compile time hits ``a BoundMethod does not understand #'new'''."

	| mod result |
	mod := self loadFixture: 'use_jinja2_partial'.
	result := mod @env1:jinja2_render_if_truthy.
	self assert: result equals: 'YES'
%

! --- re Match.groupdict round-trip (CPythonShim PyDict_Next) -------------

category: 'Grail-Tests - re groupdict'
method: FlaskScaffoldingTestCase
testReMatchGroupdictNamedCaptures
	"``CPythonShim >> PyDict_Next:pos:`` makes Match.groupdict()
	work by giving the C-side ``PyDict_Next`` something to delegate
	to.  Previously every named-capture groupdict raised an
	InternalError (``no Symbol with the specified value``) coming
	out of the unimplemented dispatch."

	| mod gd |
	mod := self loadFixture: 'use_jinja2_partial'.
	gd := mod @env1:jinja2_match_groupdict_named_capture.
	self assert: (gd @env1:__getitem__: 'foo') equals: 'x'.
	self assert: (gd @env1:__getitem__: 'bar') equals: 'y'
%

! --- Module-singleton duplicate-class bug (xfail regression) -------------

category: 'Grail-Tests - Module singleton'
method: FlaskScaffoldingTestCase
testModuleSingletonReturnsSameClass
	"A class referenced from inside its OWN method body resolves
	through ``(modCls ___instance___) @env1:ClassName'' — and must
	land on the SAME class object external callers see.

	Fixed by ``importlib >> loadModuleFromPath:'' calling
	``moduleClass ___adoptInstance___: moduleInstance'' before
	running initialize.  Without it, any compiled body code that
	resolved a module-scope name would trigger the lazy ``instance''
	mint path, run initialize a second time on a fresh instance,
	and produce a parallel copy of every class the module defines.

	Was the M4 jinja2 blocker — ``Node.iter_child_nodes'' compared
	an externally-accessible ``Node`` against the singleton's
	``Node`` and returned False on every child."

	| mod tup same |
	mod := self loadFixture: 'use_jinja2_partial'.
	tup := mod @env1:module_singleton_returns_same_class.
	same := tup @env1:__getitem__: 2.
	self assert: same equals: true
%

! --- Werkzeug staging (M6) ------------------------------------------------
!
! Step 1: ``werkzeug._internal'' + WSGI encoding-dance helpers.
! Step 2: ``werkzeug.datastructures'' (``mixins'' + ``structures'' so
! far; the rest of the upstream re-exports arrive as Steps 3-9 land
! their respective submodules — http, wsgi, exceptions, ...).

category: 'Grail-Tests - werkzeug'
method: FlaskScaffoldingTestCase
testWerkzeugInternalImports
	"werkzeug._internal — the smallest Werkzeug submodule.  Probes
	the import path and the WSGI encoding-dance helpers."

	| mod |
	mod := self loadFixture: 'use_werkzeug_internal'.
	self assert: mod @env1:import_succeeded equals: true.
	self assert: mod @env1:missing_repr equals: 'no value'.
	self assert: mod @env1:wsgi_encoding_dance equals: 'hello'.
	self assert: mod @env1:wsgi_decoding_dance equals: 'hello'
%

category: 'Grail-Tests - werkzeug'
method: FlaskScaffoldingTestCase
testWerkzeugDatastructuresImports
	"werkzeug.datastructures — re-exports MultiDict, ImmutableDict,
	iter_multi_items and the mixin types via the thinned __init__.
	Known gaps (super() through dict-subclass constructor;
	isinstance against the cabc stubs) are documented in the fixture."

	| mod |
	mod := self loadFixture: 'use_werkzeug_datastructures'.
	self assert: mod @env1:import_succeeded equals: true.
	self assert: mod @env1:multidict_class_resolves equals: true.
	self assert: mod @env1:immutable_dict_rejects_set equals: 'caught'.
	self assert: mod @env1:iter_multi_items_runs equals: true
%
