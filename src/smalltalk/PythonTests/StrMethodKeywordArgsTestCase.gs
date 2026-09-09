! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrMethodKeywordArgsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrMethodKeywordArgsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrMethodKeywordArgsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrMethodKeywordArgsTestCase
!
! A BUILTIN str method called with its arguments by keyword.
!
! CPython refuses the whole family -- str.replace is positional-only, so
! ``'ab'.replace(old='a', new='b')'' is a TypeError ("str.replace() takes no
! keyword arguments") and the caller can catch it.  Grail's varargs entry
! ``CharacterCollection >> _replace: positional kw: kwargs'' (src/smalltalk/
! Python/str.gs) opens with
!
!     old := positional @env0:at: 1.
!     new := positional @env0:at: 2.
!
! and never checks the size or consults ``kwargs'' for those two names.  A
! keyword-only call leaves ``positional'' EMPTY, so ``at: 1'' indexes past the
! end and the gem dies with
!
!     a OffsetError occurred (error 2003), reason:objErrBadOffsetIncomplete,
!     max:0 actual:1
!
! That is a raw Smalltalk error, not a Python exception: no traceback, no line
! number, ``except BaseException'' cannot see it, and the SESSION ENDS.  The
! reported offset tracks how many positionals were supplied -- no positionals
! gives max:0 actual:1, one positional gives max:1 actual:2 -- which is what
! identifies the two unguarded reads as the fault rather than anything in the
! caller.
!
! ``count'' is unaffected because it IS read out of kwargs by name.  That is
! the proof the kwargs dict is reachable here: ``old''/``new'' failing to
! consult it is an oversight, not a limitation of the call shape.  (It also
! makes Grail accept ``replace(a, b, count=1)'', which CPython rejects; that
! divergence is recorded in the fixture rather than endorsed.)
!
! HOW REAL CODE REACHES IT.  Grail's compile() answers SOURCE TEXT rather than
! a code object -- deliberate, and documented on builtins.gs's ``_compile:'',
! which names jinja2 as the load-bearing caller.  jinja2/debug.py's
! fake_traceback() then holds a str where it expects a CodeType.  Every
! code-object attribute is missing, but ``replace'' is present, because str has
! one too; so
!
!     code = code.replace(co_name=location)        jinja2/debug.py:122
!
! is a keyword-only call to str.replace, and the gem dies there.  Grail's
! MEASURED chain, smallest first:
!
!     'abc'.replace(old='a', new='b')                       <- the defect
!     compile('pass','<f>','exec').replace(co_name='x')     <- what jinja2 does
!     jinja2.Environment().from_string('{{ x|nosuchfilter }}')
!
! The last one is the whole bug as a user meets it: naming a filter the
! environment does not have is supposed to raise TemplateAssertionError, and
! Environment.compile catches it and routes it to handle_exception() ->
! rewrite_traceback_stack() -> fake_traceback(), so the ERROR-REPORTING path
! is what kills the session.  A wrong answer would be recoverable; this is not.
!
! In Flask it is reached without any mistake by the user at all.  ``jinja_env''
! is a @cached_property, and ClassDefAst realises cached_property WITHOUT
! caching (the getter recomputes -- see its comment in ClassDefAst.gs), so
! every read of ``app.jinja_env'' builds a FRESH Environment.  A filter
! registered by ``app.jinja_env.filters['shout'] = fn'' is written to an
! environment that is then discarded, ``render_template_string'' compiles
! against a new one that has never heard of it, and a correctly registered
! filter takes the unknown-filter path above.  ``app.jinja_env.globals[...]''
! is lost the same way, which is why it appears to be silently ignored.  Those
! are separate defects and are not asserted here; this case covers the one that
! is fatal.
!
! WHAT IS NOT ASSERTED, AND WHY.  The three fatal spellings live in the fixture
! as ``fatal_all_keywords'', ``fatal_partial_keyword'' and
! ``fatal_as_jinja2_calls_it'', and NOTHING CALLS THEM -- not the fixture at
! import, not a test here.  A test that invoked one would not fail, it would
! end the run, taking every later test case with it.  This follows the KNOWN
! GAP convention used elsewhere in this directory: record the shape, assert
! what can be asserted, and leave the fatal call one edit away.  When
! ``_replace:'' learns to bounds-check and to raise TypeError, promote
! ``probeTheFatalKeywordCalls'' below to a ``test...'' method and it becomes
! the regression test.
!
! The six facts that CAN be asserted are pinned instead: the positional forms
! still work, and compile() still answers a str that has ``replace'' and lacks
! ``co_name''.  Those three are the misrouting itself -- if compile() ever
! answers a real code object, they break here rather than quietly changing
! which method jinja2 calls.
!
! Distinct from UnexpectedKeywordMessageTestCase, which covers the same
! complaint for USER-DEFINED functions via FunctionDefAst's call-validation
! guard.  Builtin methods do not go through that guard, and this is the gap.
!
! Drives tests/python/str_method_keyword_args.py.
! ===============================================================================

expectvalue /Class
doit
StrMethodKeywordArgsTestCase comment:
'A builtin str method called with its arguments by keyword.

``''ab''.replace(old=''a'', new=''b'')'' should be a TypeError, as it is in
CPython.  In Grail ``_replace: positional kw:'' reads ``old'' and ``new'' from
the positional array with no bounds check and no kwargs fallback, so the call
indexes past the end and the SESSION DIES with an uncatchable OffsetError
(2003, objErrBadOffsetIncomplete).

jinja2 reaches it because compile() answers source text, not a code object:
``code.replace(co_name=...)'' in fake_traceback() lands on str.replace.  That
puts the crash on jinja2''s ERROR-REPORTING path, so a template naming an
unknown filter kills the gem instead of raising TemplateAssertionError.

The fatal spellings are deliberately NOT invoked -- see the file header.

See tests/python/str_method_keyword_args.py (6 assertable facts).'
%

set compile_env: 0

expectvalue /Metaclass3
doit
StrMethodKeywordArgsTestCase removeAllMethods: 0.
StrMethodKeywordArgsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrMethodKeywordArgsTestCase
setUp
	"Reload tests/python/str_method_keyword_args.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_method_keyword_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_method_keyword_args.py')
		name: 'str_method_keyword_args'.
%

category: 'Grail-Helpers'
method: StrMethodKeywordArgsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StrMethodKeywordArgsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - What still works'
method: StrMethodKeywordArgsTestCase
testThePositionalFormsAreUnaffected
	"The two- and three-argument positional calls are the ones the defect must
	not disturb; a bounds check in ``_replace:'' has to leave these alone."

	self assertAll: #('replace_two_positional' 'replace_three_positional')
%

category: 'Grail-Tests - What still works'
method: StrMethodKeywordArgsTestCase
testCountIsReadFromKwargs
	"``count'' survives a keyword call because ``_replace:'' looks it up in
	kwargs by name.  That is the evidence the kwargs dict is reachable at this
	call site, so ``old''/``new'' ignoring it is an oversight rather than a
	limitation.  CPython refuses this spelling; the divergence is recorded in
	the fixture, not endorsed here."

	self assertAll: #('replace_count_keyword')
%

category: 'Grail-Tests - Why jinja2 reaches it'
method: StrMethodKeywordArgsTestCase
testCompileAnswersAStrThatShadowsCodeReplace
	"The misrouting, pinned as three facts.  compile() answers source text, so
	the result has no ``co_name'' but DOES have ``replace'' -- str''s.  That
	collision is what turns jinja2''s ``code.replace(co_name=location)'' into a
	keyword-only call on a string.

	If compile() ever answers a real code object these break HERE, which is the
	point: the change would otherwise silently move jinja2 onto a different
	method and this whole case would stop testing what it says it tests."

	self assertAll: #('compile_answers_a_str' 'compiled_has_no_co_name'
		'compiled_has_replace')
%

category: 'Grail-Tests - The fatal calls, not run'
method: StrMethodKeywordArgsTestCase
probeTheFatalKeywordCalls
	"NOT a test method, deliberately -- SUnit collects ``test*'' and this must
	not be collected.  Each of these ENDS THE SESSION today; running one here
	would abort the whole suite rather than report a failure.

	Once ``_replace:'' bounds-checks its positional array and raises TypeError,
	rename this to ``testTheFatalKeywordCallsAreTypeErrors'', assert the three
	results are ('raised', 'TypeError', ...), and it becomes the regression
	test.  Kept as a method so the fix has an obvious landing site.

	Verified against Grail c875e56 with the demo CLI: each line below ended the
	gem with error 2003, objErrBadOffsetIncomplete."

	testModule @env1:___pyAttrLoad___: #fatal_all_keywords.        "max:0 actual:1"
	testModule @env1:___pyAttrLoad___: #fatal_partial_keyword.     "max:1 actual:2"
	testModule @env1:___pyAttrLoad___: #fatal_as_jinja2_calls_it.  "jinja2/debug.py:122"
%
