! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileOptimizeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileOptimizeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileOptimizeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileOptimizeTestCase
!
! compile()'s ``optimize'' argument, and compiling an AST back to something
! runnable.
!
! THE LEVEL TRAVELS ON THE CODE OBJECT, and that is the part of the design worth
! keeping.  Grail compiles from TEXT at exec() time, so the level chosen when
! compile() ran and the codegen that has to obey it can be far apart, with
! ordinary parse and emit in between and no argument to thread it through.  It is
! recorded on the PyCode and installed around the evaluation -- the only
! arrangement where a compile() in one place and an exec() in another give the
! answer CPython gives.
!
! Three things change, and each is a decision a code GENERATOR makes:
!
!   * ``__debug__'' becomes a compile-time False at 1 and above.  Emitted as the
!     LITERAL rather than read from builtins, because the builtins value is
!     shared by every module and this level belongs to ONE compile.
!   * an ``assert'' statement is DROPPED at 1 and above -- nothing emitted, not a
!     guarded no-op, because its expression must not be evaluated either.
!   * a DOCSTRING is dropped at 2.
!
! -1 means ``whatever the interpreter is'', is the default, and is what every
! compile in the corpus has always got; the four controls say it did not move.
!
! AND AN AST COMPILES BACK.  ``compile(ast.parse(src), f, mode)'' has to answer
! something executable, and Grail has no AST-to-code path and no bytecode to
! build -- so the tree ast.parse returns carries the SOURCE it was parsed from,
! and compiling it compiles that text.  Exact rather than an approximation: the
! same text, not an unparse of the tree.  A tree the caller BUILT by hand still
! cannot be compiled, which is a narrower gap than the whole round trip being
! impossible, and it is not what users of ast.parse do.
!
! The root node follows the MODE, and compile() refuses a mismatch:
! ``compile(ast.parse(s), f, 'eval')'' is CPython's ``expected Expression node,
! got Module''.  Worth checking because the two trees are otherwise
! interchangeable -- accepting the wrong one runs a module body as an expression
! and answers something, which is a wrong answer rather than an error.
!
! Drives tests/python/compile_optimize.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_compile.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileOptimizeTestCase removeAllMethods.
CompileOptimizeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CompileOptimizeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'compile_optimize' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_optimize.py')
		name: 'compile_optimize'.
%

category: 'Grail-Private'
method: CompileOptimizeTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the four levels'
method: CompileOptimizeTestCase
testTheLevelsDifferAsCPythonsDo
	"One source, four levels, four different answers -- which is how
	test_compile distinguishes them.  Each answer carries all three effects at
	once: whether the assert fired, the docstring, and __debug__."

	self assertMatchesCPythonAt: 'level_default'.
	self assertMatchesCPythonAt: 'level_0'.
	self assertMatchesCPythonAt: 'level_1'.
	self assertMatchesCPythonAt: 'level_2'.
%

category: 'Grail-Tests - the four levels'
method: CompileOptimizeTestCase
testEachEffectOnItsOwn
	"The combined rows above would pass with two effects right and one wrong
	in a compensating way.  These separate them."

	self assertMatchesCPythonAt: 'assert_by_level'.
	self assertMatchesCPythonAt: 'debug_by_level'.
	self assertMatchesCPythonAt: 'docstring_by_level'.
%

category: 'Grail-Tests - through an AST'
method: CompileOptimizeTestCase
testTheSameFourThroughATree
	"``compile(ast.parse(src, optimize=n), f, mode, optimize=n)'' must answer
	what compiling the source directly answers -- test_compile runs both and
	compares.  The tree carries its source, which is what makes an AST
	compilable at all here."

	self assertMatchesCPythonAt: 'tree_default'.
	self assertMatchesCPythonAt: 'tree_0'.
	self assertMatchesCPythonAt: 'tree_1'.
	self assertMatchesCPythonAt: 'tree_2'.
	self assertMatchesCPythonAt: 'tree_compiles'.
%

category: 'Grail-Tests - through an AST'
method: CompileOptimizeTestCase
testAModeMismatchIsRefused
	"The two trees are otherwise interchangeable, so accepting the wrong one
	runs a module body as an expression and ANSWERS something."

	self assertMatchesCPythonAt: 'tree_eval'.
%

category: 'Grail-Tests - Controls'
method: CompileOptimizeTestCase
testTheDefaultDidNotMove
	"-1 is what every compile in the corpus has always got: asserts fire,
	__debug__ is True, docstrings survive, and an exec with no compile() at
	all is untouched."

	self assertMatchesCPythonAt: 'plain_assert_fires'.
	self assertMatchesCPythonAt: 'plain_debug'.
	self assertMatchesCPythonAt: 'plain_docstring'.
	self assertMatchesCPythonAt: 'module_level_assert'.
	self assertMatchesCPythonAt: 'exec_without_compile'.
%

category: 'Grail-Tests - Controls'
method: CompileOptimizeTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '18 checks, 0 disagreeing [], keys match: True'
%
