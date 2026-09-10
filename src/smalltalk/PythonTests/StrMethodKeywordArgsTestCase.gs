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
! THE FIX.  ``_replace:'' now checks the size of its positional array before
! reading from it.  Fewer than two positionals with keywords present is
! ``TypeError: str.replace() takes no keyword arguments'', which is CPython''s
! message; fewer than two with nothing else is a TypeError naming the arity.
! ``old'' and ``new'' are still positional-only, so nothing that worked before
! changes, and ``count'' keeps its keyword spelling.
!
! ``testTheFormerlyFatalKeywordCallsAreTypeErrors'' is the regression test.  It
! could not exist before the fix: invoking one of those calls would have ended
! the run rather than failed a case.
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

Fixed by bounds-checking the positional array and raising CPython''s
TypeError.  ``old''/``new'' stay positional-only and ``count'' keeps its
keyword spelling, so nothing that worked before changes.

See tests/python/str_method_keyword_args.py.'
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

category: 'Grail-Helpers'
method: StrMethodKeywordArgsTestCase
assertTypeErrorAt: aKey
	"The fixture records a raise as the triple ('raised', ExcName, message)."

	| v |
	v := self resultAt: aKey.
	self assert: (v @env1:__getitem__: 0) = 'raised'
		description: aKey , ' did not raise: ' , v printString.
	self assert: (v @env1:__getitem__: 1) = 'TypeError'
		description: aKey , ' raised the wrong type: ' , v printString
%

category: 'Grail-Tests - The regression'
method: StrMethodKeywordArgsTestCase
testTheFormerlyFatalKeywordCallsAreTypeErrors
	"The regression test for this fix, and the reason the whole case exists.

	Each of these three ENDED THE SESSION before ``_replace:'' bounds-checked
	its positional array -- not failed, ended, with error 2003
	objErrBadOffsetIncomplete and no traceback.  Running one of them here would
	have aborted the entire suite rather than reporting a failure, which is why
	this method used to be named ``probeTheFatalKeywordCalls'' and was
	deliberately not collected by SUnit.

	It is collected now.  If ``_replace:'' loses its bounds check, this test
	does not go red -- it takes the run down, and that is itself the signal.

	The third is jinja2/debug.py:122 exactly: a keyword-only ``replace'' on
	what jinja2 believes is a code object and Grail answers as source text."

	self assertTypeErrorAt: 'all_keywords'.        "was max:0 actual:1"
	self assertTypeErrorAt: 'partial_keyword'.     "was max:1 actual:2"
	self assertTypeErrorAt: 'as_jinja2_calls_it'   "was jinja2/debug.py:122"
%
