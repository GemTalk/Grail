! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileTopLevelAwaitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileTopLevelAwaitTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileTopLevelAwaitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileTopLevelAwaitTestCase
!
! ``compile(src, f, mode, flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)'' -- a module
! body that awaits.
!
! The flag does two things and they are separable.  It RELAXES the parse, since
! ``await'' outside a function is otherwise a SyntaxError and the source would
! never get as far as being compiled; and it marks the result CO_COROUTINE, which
! is an instruction to the caller: this code object must be AWAITED, through
! ``eval(co, g)'' or a FunctionType built from it, never exec()ed.
!
! GRAIL HAS NO COROUTINE MODULE BODY, so the source is wrapped in an ``async
! def'' and the wrapper text is carried on the code object.  That is the whole
! mechanism, and it is what gives the awaits a scope to be in.  The cost is that
! the body's assignments become the WRAPPER's locals rather than the namespace's,
! so the wrapper ends with a copy-back into the mapping it is handed -- which is
! also why the wrapper takes that mapping as a parameter instead of declaring
! ``global''.  A ``global'' write from an exec'd def does not reach the exec's
! globals in Grail (a separate gap, not fixed here), and going through the
! parameter sidesteps it rather than depending on it.
!
! THE RELAXATION IS SCOPED TO THE MODULE BODY, not to the source.  A plain ``def''
! inside it is still a synchronous scope, so ``def f(): await g()'' is a
! SyntaxError with the flag exactly as without it -- three of the checks are that,
! and they are what tells a relaxation from a hole.
!
! AN ASYNC COMPREHENSION HAS NO AsyncForAst.  ``[x async for x in ait]'' records
! its async-ness as is_async on the comprehension CLAUSE, so the walk that decides
! the bit had to learn that spelling; without it the three comprehension shapes
! compiled with the bit clear and the caller was told to exec code that has to be
! awaited.
!
! A LATENT PyDict DEFECT CAME OUT OF THIS.  eval() removes the wrapper name it
! exec'd into the caller's globals, and ``removeKey:otherwise:'' was the one
! removal spelling PyDict did not override -- so the key left the dictionary and
! stayed in ``___order___'', and the next walk of those globals reported
! ``dictionary changed size during iteration'' about a change nobody made.  Fixed
! at PyDict, not worked around here, because any caller could have tripped it.
!
! Drives tests/python/compile_top_level_await.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_compile_top_level_await, test_compile_top_level_await_no_coro
! and test_compile_top_level_await_invalid_cases.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileTopLevelAwaitTestCase removeAllMethods.
CompileTopLevelAwaitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompileTopLevelAwaitTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_top_level_await' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_top_level_await.py')
		name: 'compile_top_level_await'.
%

category: 'Grail-Private'
method: CompileTopLevelAwaitTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the coroutine bit'
method: CompileTopLevelAwaitTestCase
testEveryAwaitingShapeSetsTheBit
	"An await, an async for, an async with, and the three comprehension
	spellings -- the comprehensions being the ones that carry their async-ness
	as a flag rather than as a node kind."

	self assertMatchesCPythonAt: 'await_sets_bit'.
	self assertMatchesCPythonAt: 'async_for_sets_bit'.
	self assertMatchesCPythonAt: 'async_with_sets_bit'.
	self assertMatchesCPythonAt: 'async_listcomp_sets_bit'.
	self assertMatchesCPythonAt: 'async_setcomp_sets_bit'.
	self assertMatchesCPythonAt: 'async_dictcomp_sets_bit'.
	self assertMatchesCPythonAt: 'nested_async_comp_sets_bit'.
	self assertMatchesCPythonAt: 'single_mode_sets_bit'.
%

category: 'Grail-Tests - the coroutine bit'
method: CompileTopLevelAwaitTestCase
testNothingElseSetsTheBit
	"The careful half.  An ``async def'' whose awaits are all inside it is an
	ordinary module, and a plain comprehension contains nothing async -- five
	shapes that each look async-ish and must compile with the bit clear, or
	the caller is told to await something that cannot be awaited."

	self assertMatchesCPythonAt: 'plain_def_clear'.
	self assertMatchesCPythonAt: 'async_def_clear'.
	self assertMatchesCPythonAt: 'listcomp_clear'.
	self assertMatchesCPythonAt: 'setcomp_clear'.
	self assertMatchesCPythonAt: 'genexp_clear'.
	self assertMatchesCPythonAt: 'dictcomp_clear'.
%

category: 'Grail-Tests - the gate'
method: CompileTopLevelAwaitTestCase
testTheRelaxationIsScopedToTheModuleBody
	"Without the flag the source is refused; WITH it, a plain def inside the
	source is still a synchronous scope and awaiting in one is still a
	SyntaxError.  The second pair is what tells a scoped relaxation from a
	hole in the parser."

	self assertMatchesCPythonAt: 'refused_without_flag'.
	self assertMatchesCPythonAt: 'async_for_refused_without_flag'.
	self assertMatchesCPythonAt: 'await_in_def_still_refused'.
	self assertMatchesCPythonAt: 'async_for_in_def_still_refused'.
	self assertMatchesCPythonAt: 'async_comp_in_def_still_refused'.
%

category: 'Grail-Tests - running the result'
method: CompileTopLevelAwaitTestCase
testEvalAnswersACoroutineThatBindsIntoTheGlobals
	"``eval(co, g)'' answers a coroutine -- not the body's value, and not
	None -- and driving it to completion leaves the body's assignments in g.
	The optimized-assert row is gh-121637: under -OO the await is optimized
	away and the bit must still be set."

	self assertMatchesCPythonAt: 'eval_answers_coroutine'.
	self assertMatchesCPythonAt: 'eval_binds_await'.
	self assertMatchesCPythonAt: 'eval_binds_async_for'.
	self assertMatchesCPythonAt: 'eval_binds_async_with'.
	self assertMatchesCPythonAt: 'eval_binds_async_comp'.
	self assertMatchesCPythonAt: 'eval_binds_awaiting_comp'.
	self assertMatchesCPythonAt: 'eval_binds_single_mode'.
	self assertMatchesCPythonAt: 'eval_binds_optimized_assert'.
	self assertMatchesCPythonAt: 'optimized_assert_keeps_bit'.
%

category: 'Grail-Tests - running the result'
method: CompileTopLevelAwaitTestCase
testFunctionTypeIsConstructibleFromTheCodeObject
	"The other documented way to run it: FunctionType(co, g) answers a
	callable, and calling it answers the coroutine.  Its refusals are
	CPython's -- fewer than two arguments, and a first argument that is not a
	code object."

	self assertMatchesCPythonAt: 'functiontype_binds_await'.
	self assertMatchesCPythonAt: 'functiontype_binds_async_with'.
	self assertMatchesCPythonAt: 'functiontype_needs_two_args'.
	self assertMatchesCPythonAt: 'functiontype_needs_code'.
%

category: 'Grail-Tests - Controls'
method: CompileTopLevelAwaitTestCase
testEvalLeavesNoWrapperBehind
	"The wrapper is an implementation detail and must not appear in the
	caller's globals -- and removing it must leave those globals ITERABLE,
	which is the PyDict defect this found."

	| b r g |
	self assertMatchesCPythonAt: 'eval_leaves_no_wrapper'.
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	g := r @env1:__getitem__: 'eval_leaves_no_wrapper'.
	self assert: (b @env1:repr: g) asString equals: '[]'.
%

category: 'Grail-Tests - Controls'
method: CompileTopLevelAwaitTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '33 checks, 0 disagreeing [], keys match: True'
%
