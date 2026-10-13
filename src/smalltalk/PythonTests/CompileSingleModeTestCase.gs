! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompileSingleModeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompileSingleModeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompileSingleModeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompileSingleModeTestCase
!
! compile(src, f, 'single') SHOWS EACH EXPRESSION STATEMENT'S VALUE, through
! sys.displayhook.  That is the interactive mode: the REPL compiles ``>>> 1 + 1''
! with it, and doctest compiles every example with it and compares what the
! displayhook wrote.
!
! Grail accepted the mode and ignored it, so every expression example in every
! doctest failed with ``Got nothing''.  Vendoring CPython's doctest (#1381) is
! what made that visible: nine scoreboard rows went red on it at once.
!
! TWO PARTS.  ModuleAst >> ___displayInteractiveExpressions___ rewrites each
! expression statement in the interactive statement -- including inside a
! top-level ``for'', excluding a def's or a class's body -- to call
! ``__import__('sys').displayhook(value)'', so neither emitter has to know the
! mode.  And sys >> displayhook: now does what CPython's does: repr, written
! through print() so a REDIRECTED sys.stdout gets it, and builtins._ set.  It
! used to write the Smalltalk printString to the gem's own stdout, which no
! captured_stdout() or doctest _SpoofOut could see.
!
! Fixture: tests/python/compile_single_mode.py (self-verifying under CPython
! 3.14.8 -- all 11 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompileSingleModeTestCase removeAllMethods.
CompileSingleModeTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: CompileSingleModeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #compile_single_mode ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/compile_single_mode.py')
		name: 'compile_single_mode'.
%

category: 'Grail-Private'
method: CompileSingleModeTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests'
method: CompileSingleModeTestCase
testAnExpressionShowsItsRepr
	"The headline: ``1 + 1'' shows 2 and a string shows its repr, while None
	shows nothing and a print() is not echoed a second time."

	self assertMatchesCPythonAt: 'an_expression_shows_its_repr'.
	self assertMatchesCPythonAt: 'none_shows_nothing'.
	self assertMatchesCPythonAt: 'print_is_not_doubled'.
	self assertMatchesCPythonAt: 'each_statement_on_a_line'.
%

category: 'Grail-Tests'
method: CompileSingleModeTestCase
testTheInteractiveStatementIsTheScope
	"A top-level ``for'' shows every value; a def's or a class's body shows
	nothing.  Both sides, because the walk that finds the statements is the
	part most easily got wrong in either direction."

	self assertMatchesCPythonAt: 'in_a_loop'.
	self assertMatchesCPythonAt: 'not_in_a_def'.
	self assertMatchesCPythonAt: 'not_in_a_class_body'.
%

category: 'Grail-Tests'
method: CompileSingleModeTestCase
testTheHookIsSysDisplayhook
	"The value goes through sys.displayhook AS IT IS AT RUN TIME -- doctest
	and the REPL both replace it -- and the default one sets builtins._ and
	writes to a redirected sys.stdout."

	self assertMatchesCPythonAt: 'the_hook_is_looked_up_at_run_time'.
	self assertMatchesCPythonAt: 'builtins_underscore_is_set'.
	self assertMatchesCPythonAt: 'displayhook_writes_to_sys_stdout'.
%

category: 'Grail-Tests - Controls'
method: CompileSingleModeTestCase
testExecModeStaysSilent
	"The rewrite is gated on the mode: the same source compiled for exec shows
	nothing, as it always did."

	self assertMatchesCPythonAt: 'exec_mode_shows_nothing'.
%

category: 'Grail-Tests - Controls'
method: CompileSingleModeTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '11 checks, 0 disagreeing [], keys match: True'
%
