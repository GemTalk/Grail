! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionDefaultsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionDefaultsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctionDefaultsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionDefaultsTestCase
!
! ``func.__defaults__'' -- the evaluated defaults of the TRAILING positional
! parameters, or None when the def declares none.
!
! It was an AttributeError for EVERY function, though it is an attribute every
! Python function has and one inspect and functools both read.
!
! WHY IT IS SYNTHESISED AND NOT FAKED.  Answering None unconditionally would
! have closed test_funcattrs' test_blank_func_defaults on the spot -- and made
! ``def f(a=1, b=2)'' report None as well, trading a visible failure for a quiet
! lie in the far more common case.  That shortcut was considered and rejected
! when the attribute first came up; what makes None honest for a def with no
! defaults is that the same walk finds the real values when there are some.
!
! THE VALUES ARE ALREADY COMPUTED.  Grail emits a def with defaults inside a
! wrapper block that evaluates each one ONCE at def time,
!
!     f := ([ | ___default_a___ |
!              ___default_a___ := 1.
!              [:pos :kw | ... ifFalse: [___default_a___] ] ] value)
!
! so the attribute only has to FIND the temp, using the offset encoding
! documented on GsNMethod>>_argsAndTempsOffsets -- the same walk the closure
! cells use, and the same one GsProcess>>_frameContentsAt: is the kernel's
! reader of.  Nothing is stored, and the def-time cost is unchanged.
!
! That it is the temp and not a re-evaluation is checked, not assumed:
! testAMutableDefaultIsTheSameObject asserts identity between what
! __defaults__ reports and what the call binds, which is the difference that
! matters for a mutable or side-effecting default.
!
! ASSIGNMENT WRITES THROUGH to those temps, so it changes what the next call
! binds.  The read and the write had to land TOGETHER: making the attribute
! merely readable would have turned a write-only attribute into a LYING one --
! the assignment landing in the side table, the read answering it, and the call
! going on binding the def-time value.  Reporting a default that is not in
! effect is worse than reporting none.
!
! ------------------------------------------------------------------------------
! TWO THINGS THIS DOES NOT DO, neither asserted by the fixture because CPython
! and Grail genuinely differ:
!
!   * ASSIGNING DEFAULTS TO A DEF THAT DECLARED NONE.  ``first_func.__defaults__
!     = (1, 2)'' is legal in CPython and makes ``first_func()'' work.  Each
!     Grail default is a temp the def-time wrapper evaluated, so there are
!     exactly as many slots as the def declared and none can be created; the
!     write falls through to the side table, where it reads back but does not
!     bind.  Making it bind means having every call consult a defaults table
!     rather than a temp -- a cost on every call in the corpus to serve an
!     attribute almost nothing writes.  This is the remaining half of
!     test_funcattrs' test_func_default_args.
!   * DELETING THEM does not stop the call binding them.  ``del f.__defaults__''
!     reports None afterwards, per CPython, because the delete stores None in
!     the side table and the read prefers it -- but the temps still hold their
!     values, so ``f()'' still succeeds where CPython raises TypeError.  Same
!     cause as above: there is no way to un-declare a default.
!
! Both are the same limit seen from two sides, and both are visible rather than
! silent: the reported value and the bound value agree in every case the fixture
! covers, and disagree only after an operation Grail cannot carry out.
! ------------------------------------------------------------------------------
!
! Drives tests/python/function_defaults.py, whose EXPECTED table was generated
! by RUNNING CPython 3.14.6 and self-verifies against it.  Closes
! test_funcattrs' test_blank_func_defaults.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionDefaultsTestCase removeAllMethods.
FunctionDefaultsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FunctionDefaultsTestCase
setUp
	"Reload tests/python/function_defaults.py fresh each test: several probes
	ASSIGN __defaults__, which now writes through to the def-time temps, so a
	shared instance would let one test bind what another test wrote."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_defaults.py')
		name: 'function_defaults'.
%

category: 'Grail-Private'
method: FunctionDefaultsTestCase
assertMatchesCPythonAt: key
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.
%

category: 'Grail-Tests - None Is The Honest Answer'
method: FunctionDefaultsTestCase
testADefWithNoDefaultsReportsNone
	"None rather than an empty tuple, and None for a def with parameters that
	simply have no defaults -- the two shapes a shortcut would have got right
	while getting everything else wrong."

	self assertMatchesCPythonAt: 'no_parameters_at_all'.
	self assertMatchesCPythonAt: 'parameters_but_no_defaults'.
%

category: 'Grail-Tests - Reading The Real Values'
method: FunctionDefaultsTestCase
testTheDefaultsThemselves
	"THE TEST THIS EXISTS FOR, and what makes the None above honest: when there
	ARE defaults, the same walk reports them."

	self assertMatchesCPythonAt: 'one_default'.
	self assertMatchesCPythonAt: 'two_defaults'.
%

category: 'Grail-Tests - Reading The Real Values'
method: FunctionDefaultsTestCase
testOnlyTheTrailingPositionalParameters
	"CPython pairs defaults with the LAST positional parameters, so three
	parameters and one default is a one-tuple.  Keyword-only defaults are not
	here at all -- they belong to __kwdefaults__ -- which the mixed def checks
	from both sides at once."

	self assertMatchesCPythonAt: 'only_the_trailing_parameters'.
	self assertMatchesCPythonAt: 'keyword_only_defaults_are_not_here'.
	self assertMatchesCPythonAt: 'positional_and_keyword_only_together'.
%

category: 'Grail-Tests - Reading The Real Values'
method: FunctionDefaultsTestCase
testAMutableDefaultIsTheSameObject
	"By IDENTITY: what __defaults__ reports is the object the call binds, not a
	re-evaluation of the default expression.  A default is evaluated once, at
	def time, and for a mutable or side-effecting one the difference between
	those two readings is the whole of Python's most famous gotcha."

	self assertMatchesCPythonAt: 'closes_over_a_mutable'.
%

category: 'Grail-Tests - Writing Them'
method: FunctionDefaultsTestCase
testAssignmentChangesWhatTheCallBinds
	"The half that makes the attribute worth having.  A default that reads back
	but does not take effect is worse than no attribute at all -- and that is
	exactly what a read-only implementation would have produced, since the
	write already had somewhere to land.  Checked at three arities so a write
	that clobbered the binding logic rather than the defaults would show."

	self assertMatchesCPythonAt: 'assignment_reads_back'.
	self assertMatchesCPythonAt: 'assignment_changes_what_the_call_binds'.
%

category: 'Grail-Tests - Writing Them'
method: FunctionDefaultsTestCase
testDeletingAndTypeChecking
	"``del f.__defaults__'' reports None afterwards, and a non-tuple is refused
	with CPython's message.  See this class's comment for what deleting does NOT
	do."

	self assertMatchesCPythonAt: 'deleting_clears_them'.
	self assertMatchesCPythonAt: 'a_non_tuple_is_refused'.
%
