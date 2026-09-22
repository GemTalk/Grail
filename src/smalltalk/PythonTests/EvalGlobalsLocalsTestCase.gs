! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EvalGlobalsLocalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvalGlobalsLocalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EvalGlobalsLocalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EvalGlobalsLocalsTestCase
!
! ``globals()'' inside eval()/exec() must answer the GLOBALS mapping, not the
! merged lookup scope.
!
! Grail built ONE dictionary for a doit -- the locals laid over the globals --
! and parked it under ___pyGlobals___, which is where the generated code reads
! globals() from.  That is exactly right for resolving a NAME, since a local
! does shadow a global, and exactly wrong for globals(), which is defined to
! answer the globals mapping ALONE.  So a binding supplied as a LOCAL was
! visible through globals():
!
!     data = {'A_GLOBAL_VALUE': 456}
!     eval("globals()['A_GLOBAL_VALUE']", locals=data)
!
! answered 456 where CPython answers the caller's 123 -- the local was never
! part of globals.  The reverse held too: the caller's own globals were
! reachable through globals() from a call that had replaced them.
!
! The two questions are now answered by two objects.  The merged scope stays
! the LOOKUP order, and when the two mappings differ a globals-only view is
! built and parked under ___pyGlobals___ for globals() to find.  When they are
! the same object -- every call that passes one mapping or none, which is very
! nearly every call -- the view IS the merged scope and nothing changes, which
! is what the controls below assert.
!
! The other half of the pair is in ModuleAst>>ensureModuleScope:, which used to
! overwrite ___pyGlobals___ unconditionally.  A module scope is its own
! globals, so storing it is right for a module and wrong for a doit that has
! already been given a separate view; it now stores only ifAbsent:.
!
! Drives tests/python/eval_globals_locals.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6.
!
! test_builtin's test_eval_kwargs.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EvalGlobalsLocalsTestCase removeAllMethods.
EvalGlobalsLocalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EvalGlobalsLocalsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_globals_locals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_globals_locals.py')
		name: 'eval_globals_locals'.
%

category: 'Grail-Private'
method: EvalGlobalsLocalsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - globals() sees only the globals'
method: EvalGlobalsLocalsTestCase
testGlobalsIgnoresASuppliedLocalsMapping
	"The failing row.  A name handed in as the LOCALS must not be reachable
	through globals(), which answers the caller's own value instead."

	self assertMatchesCPythonAt: 'locals_kwarg'.
	self assertMatchesCPythonAt: 'positional_both'.
%

category: 'Grail-Tests - globals() sees only the globals'
method: EvalGlobalsLocalsTestCase
testGlobalsAnswersASuppliedGlobalsMapping
	"The other direction, and the one that already worked -- kept because the
	fix must not close the first row by breaking this one."

	self assertMatchesCPythonAt: 'globals_kwarg'.
	self assertMatchesCPythonAt: 'positional_globals'.
%

category: 'Grail-Tests - globals() sees only the globals'
method: EvalGlobalsLocalsTestCase
testExecTakesTheSameSplit
	"exec() builds its scope through the same helper, so the split has to hold
	there too rather than only where the test suite happened to look."

	self assertMatchesCPythonAt: 'exec_globals'.
	self assertMatchesCPythonAt: 'exec_locals'.
%

category: 'Grail-Tests - Controls'
method: EvalGlobalsLocalsTestCase
testANameStillResolvesLocalsOverGlobals
	"THE DISCRIMINATING CONTROL for the split: the merged scope is still the
	lookup ORDER, so a bare name takes the local even though globals() cannot
	see it.  A fix that simply stopped merging would pass the tests above and
	fail here."

	self assertMatchesCPythonAt: 'name_prefers_locals'.
	self assertMatchesCPythonAt: 'name_from_globals'.
	self assertMatchesCPythonAt: 'name_with_no_args'.
%

category: 'Grail-Tests - Controls'
method: EvalGlobalsLocalsTestCase
testTheCommonShapesAreUntouched
	"The split is reached only when the two mappings DIFFER.  One mapping, the
	same mapping twice, or none at all must behave exactly as before -- this is
	what makes the change safe for the corpus, where nearly every eval() passes
	at most one."

	self assertMatchesCPythonAt: 'same_mapping_twice'.
	self assertMatchesCPythonAt: 'globals_is_a_dict'.
	self assertMatchesCPythonAt: 'globals_has_the_key'.
	self assertMatchesCPythonAt: 'assignment_goes_to_locals'.
%

category: 'Grail-Tests - Controls'
method: EvalGlobalsLocalsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '13 checks, 0 disagreeing [], keys match: True'
%
