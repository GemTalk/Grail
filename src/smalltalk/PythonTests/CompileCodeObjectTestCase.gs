! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileCodeObjectTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileCodeObjectTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileCodeObjectTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileCodeObjectTestCase
!
! compile() answers a CODE OBJECT, not the source string.
!
! Grail answered the source itself and kept the mode and filename in two
! identity-keyed side tables.  That RAN correctly -- exec()/eval() on a string
! already go through the AST loader -- and it meant a compile() result had no
! co_filename, no co_name and no co_flags: anything that introspected it saw a
! str.  jinja2 still carries a ``hasattr(code, 'co_filename')'' fallback written
! for exactly that.  The code object carries its source, so exec()/eval() read it
! back out and run the text as before; what is new is that it can be ASKED
! things.
!
! CO_COROUTINE IS THE ONE THAT MATTERS.  CPython sets it on a module compiled
! with PyCF_ALLOW_TOP_LEVEL_AWAIT whose body awaits AT MODULE SCOPE, and that bit
! is how a caller knows to run the result with ``await'' rather than exec().
! Setting it where CPython would not is a wrong INSTRUCTION, not a cosmetic
! difference -- so the careful half is what it must not match.  An ``async def''
! whose awaits are all inside it is an ordinary module; so is a comprehension
! with no async in it.  AbstractNode >> ___hasModuleScopeAwait___ walks for an
! await / async-for / async-with and stops at a def, a lambda and a class body;
! a comprehension is SEARCHED, because ``[x async for x in a]'' at module level
! really does await.
!
! THE ONE LIMIT THIS RECORDED HAS BEEN CLOSED.  Grail's parser used to refuse a
! genuine top-level ``await'' whatever flags compile() was given, so the flag was
! honoured for co_flags and not for parsing; that was an XFAIL here, pinned by a
! test written to go RED when the parser learned it.  It did go red, which is how
! the retirement happened -- see CompileTopLevelAwaitTestCase.  The row stays, as
! an ordinary check now, because it is the cheapest statement of the feature and
! it has to stay consistent with the no_coro rows beside it.
!
! Drives tests/python/compile_code_object.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6.
!
! test_builtin's test_compile_async_generator,
! test_compile_top_level_await_no_coro and
! test_compile_top_level_await_invalid_cases.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileCodeObjectTestCase removeAllMethods.
CompileCodeObjectTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompileCodeObjectTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_code_object' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_code_object.py')
		name: 'compile_code_object'.
%

category: 'Grail-Private'
method: CompileCodeObjectTestCase
___reprOf___: key
	| b r |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	^ (b @env1:repr: (r @env1:__getitem__: key)) asString
%

category: 'Grail-Private'
method: CompileCodeObjectTestCase
assertMatchesCPythonAt: key
	| b expected |
	b := builtins @env1:instance.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (self ___reprOf___: key)
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the code object'
method: CompileCodeObjectTestCase
testACompileResultCarriesItsFields
	"It was a str, so every one of these was an AttributeError."

	self assertMatchesCPythonAt: 'co_filename'.
	self assertMatchesCPythonAt: 'co_name'.
	self assertMatchesCPythonAt: 'co_firstlineno'.
	self assertMatchesCPythonAt: 'co_flags_plain'.
%

category: 'Grail-Tests - the code object'
method: CompileCodeObjectTestCase
testACodeObjectStillRuns
	"The source it carries is what exec()/eval() run, so the round trip every
	caller in the corpus uses is unchanged -- including the mode distinction,
	which is why eval() of an ``exec''-mode object answers None rather than
	applying the single-expression rule."

	self assertMatchesCPythonAt: 'exec_a_code_object'.
	self assertMatchesCPythonAt: 'eval_a_code_object'.
	self assertMatchesCPythonAt: 'exec_mode_under_eval'.
	self assertMatchesCPythonAt: 'compile_then_exec_roundtrip'.
%

category: 'Grail-Tests - CO_COROUTINE'
method: CompileCodeObjectTestCase
testNothingThatMerelyLooksAsyncSetsTheBit
	"Ten compiles -- five shapes in two modes -- and an ``async def'', which
	is the sharpest case: it CONTAINS an await, and the module defining it is
	not a coroutine.  The bit tells a caller to run the result with ``await'',
	so a false positive is a wrong instruction."

	self assertMatchesCPythonAt: 'no_coro_offenders'.
	self assertMatchesCPythonAt: 'async_def_is_not_a_coroutine'.
	self assertMatchesCPythonAt: 'async_generator_runs'.
%

category: 'Grail-Tests - CO_COROUTINE'
method: CompileCodeObjectTestCase
testTheCompilerFlagsHaveCPythonsValues
	"They are the ``flags'' argument of compile(), which validates against
	them -- so a wrong value is refused rather than ignored."

	self assertMatchesCPythonAt: 'only_ast_value'.
	self assertMatchesCPythonAt: 'top_level_await_value'.
	self assertMatchesCPythonAt: 'type_comments_value'.
	self assertMatchesCPythonAt: 'optimized_ast_value'.
%

category: 'Grail-Tests - CO_COROUTINE'
method: CompileCodeObjectTestCase
testAGenuineTopLevelAwaitCompilesAndIsMarked
	"What used to be this file's XFAIL.  A real module-level await now
	compiles under the flag and carries CO_COROUTINE, so the row is asserted
	the same way as every other -- against CPython's own answer."

	self assertMatchesCPythonAt: 'top_level_await_parses'.
%

category: 'Grail-Tests - Controls'
method: CompileCodeObjectTestCase
testTheOrdinaryShapesAreUnchanged
	"A str source through exec and eval, a bad mode, and a source that does
	not parse -- compile() answering a different KIND of object must not move
	any of them."

	self assertMatchesCPythonAt: 'string_eval_unaffected'.
	self assertMatchesCPythonAt: 'string_exec_unaffected'.
	self assertMatchesCPythonAt: 'bad_mode_still_refused'.
	self assertMatchesCPythonAt: 'syntax_error_still_raised'.
%

category: 'Grail-Tests - Controls'
method: CompileCodeObjectTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up, which counts
	the XFAIL separately."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 xfail, 0 disagreeing [], keys match: True'
%
