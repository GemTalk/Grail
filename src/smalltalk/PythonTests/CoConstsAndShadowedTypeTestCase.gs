! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CoConstsAndShadowedTypeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CoConstsAndShadowedTypeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CoConstsAndShadowedTypeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CoConstsAndShadowedTypeTestCase
!
! Two things test_builtin's test_all_any_tuple_optimization checks, and Grail got
! both wrong in opposite directions.
!
! co_consts HELD NOTHING.  CPython puts one code object in a function's
! co_consts for each nested scope that gets one, and code COUNTS them: the test
! asserts a genexp leaves EXACTLY ONE, as its way of checking the comprehension
! was not duplicated.  Grail keeps no constant pool at all -- it compiles Python
! to Smalltalk methods -- so co_consts was empty and the count was always zero.
!
! WHICH SCOPES GET ONE CHANGED IN 3.12, and getting that wrong would be worse
! than the zero.  List, set and dict comprehensions were INLINED and no longer
! appear, so counting every comprehension would answer three where CPython
! answers none -- a confident wrong number rather than an obvious missing one.  A
! GENERATOR expression still gets one, and so does a nested def or lambda.  The
! eight rows measure all of them on 3.14.6 rather than reasoning about the rule.
!
! A SHADOWED BUILT-IN TYPE WAS NOT SHADOWED.  CPython's LOAD_GLOBAL reads the
! module's own globals before builtins, so ``tuple = lambda x: 'tuple''' at
! module level shadows the type for every call in that module.  Grail's
! fixed-arity and varargs builtin call paths already probe the module globals
! for exactly that (___moduleGlobalShadowName___); the CLASS-call fast path did
! not.  So of ``all(...)'', ``any(...)'' and ``tuple(...)'' the first two
! honoured the shadow and the third quietly built a real tuple.
!
! THAT IS ONLY VISIBLE BECAUSE THE TEST OVERRIDES ALL THREE TOGETHER.  Each call
! on its own looks reasonable -- a tuple is what tuple() should answer -- and it
! is the comparison of three answers that shows the odd one out.  The fixture
! keeps the three together for the same reason.
!
! Drives tests/python/co_consts_and_shadowed_type.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's test_all_any_tuple_optimization.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CoConstsAndShadowedTypeTestCase removeAllMethods.
CoConstsAndShadowedTypeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CoConstsAndShadowedTypeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'co_consts_and_shadowed_type' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/co_consts_and_shadowed_type.py')
		name: 'co_consts_and_shadowed_type'.
%

category: 'Grail-Private'
method: CoConstsAndShadowedTypeTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - co_consts'
method: CoConstsAndShadowedTypeTestCase
testOnlyTheScopesCPythonGivesOneGetOne
	"The rule changed in 3.12 and counting every comprehension would answer
	three where CPython answers none -- a confident wrong number rather than
	an obvious missing one.  All eight shapes are measured, not reasoned
	about."

	self assertMatchesCPythonAt: 'genexp'.
	self assertMatchesCPythonAt: 'listcomp'.
	self assertMatchesCPythonAt: 'setcomp'.
	self assertMatchesCPythonAt: 'dictcomp'.
	self assertMatchesCPythonAt: 'two_genexps'.
	self assertMatchesCPythonAt: 'nested_def'.
	self assertMatchesCPythonAt: 'lambda'.
	self assertMatchesCPythonAt: 'nothing'.
%

category: 'Grail-Tests - co_consts'
method: CoConstsAndShadowedTypeTestCase
testTheCodeObjectsAreNamedAndTupled
	"co_consts is a TUPLE, and each entry carries the co_name CPython gives
	it: ``<genexpr>'', ``<lambda>'', or the def's own name."

	self assertMatchesCPythonAt: 'consts_is_a_tuple'.
	self assertMatchesCPythonAt: 'genexp_name'.
	self assertMatchesCPythonAt: 'nested_def_name'.
	self assertMatchesCPythonAt: 'lambda_name'.
%

category: 'Grail-Tests - a shadowed type'
method: CoConstsAndShadowedTypeTestCase
testAShadowedBuiltinTypeIsShadowed
	"THE THREE TOGETHER, deliberately.  Each call on its own looks
	reasonable -- a tuple is what tuple() should answer -- and it is the
	comparison of three answers that shows the class-call fast path was the
	one not probing the module globals."

	self assertMatchesCPythonAt: 'module_shadow'.
	self assertMatchesCPythonAt: 'builtins_shadow'.
%

category: 'Grail-Tests - Controls'
method: CoConstsAndShadowedTypeTestCase
testAnUnshadowedCallIsUndisturbed
	"The probe is emitted only inside a user module and only for a name that
	could be shadowed; every ordinary class call must behave exactly as
	before, and the restored builtins must be the real ones."

	self assertMatchesCPythonAt: 'unshadowed_tuple'.
	self assertMatchesCPythonAt: 'unshadowed_all'.
	self assertMatchesCPythonAt: 'tuple_is_a_type'.
	self assertMatchesCPythonAt: 'str_call'.
	self assertMatchesCPythonAt: 'int_call'.
	self assertMatchesCPythonAt: 'genexp_still_runs'.
%

category: 'Grail-Tests - Controls'
method: CoConstsAndShadowedTypeTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '20 checks, 0 disagreeing [], keys match: True'
%
