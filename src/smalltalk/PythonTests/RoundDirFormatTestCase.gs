! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RoundDirFormatTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RoundDirFormatTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RoundDirFormatTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RoundDirFormatTestCase
!
! Three builtins whose RESULTS Grail did not check.
!
! round().  Python rounds TIES TO EVEN; GemStone's ``rounded'' is
! half-away-from-zero, so every path that reached it was a half-unit out on
! exactly the inputs a rounding test checks -- round(0.5) answering 1 where
! CPython answers 0, round(25, -1) answering 30 where CPython answers 20 -- and
! out in the direction that makes a long series of roundings DRIFT UPWARD
! instead of cancelling, which is the whole reason Python picked ties-to-even.
!
! float>>__round__: (the ndigits form) was already right, by its own
! exact-rational route.  So round(2.5) answered 3 while round(2.5, 0) answered
! 2.0: one function with two tie rules, decided by whether a second argument
! was passed.  object>>___roundHalfToEven___ is now the single rule, and its
! tie test is ``2 * diff = 1'' rather than ``diff = 0.5'' so it stays exact for
! the Fraction the int path produces.
!
! Three more gaps in round(), each a wrong answer rather than an error:
! ``number='' was not accepted as a keyword although ``ndigits'' was, so
! round(number=-8.0, ndigits=-1) reported the argument MISSING; extra
! positionals were silently dropped, so round(1, 2, 3) answered 1; and a
! receiver whose TYPE defines no __round__ fell into the kernel arithmetic and
! raised an uncatchable ``does not understand #'*'''.  That last one is what
! test_round's final two lines are about -- an INSTANCE attribute named
! __round__ must not be honoured, and the refusal has to be a TypeError.
!
! dir().  The result of __dir__ is not the result of dir(): CPython converts
! what the hook returns to a LIST and SORTS it.  Grail handed the hook's value
! straight back, so a __dir__ returning a tuple gave a tuple, a set gave a set,
! and one returning 7 gave 7 -- from a function documented to answer a sorted
! list, so every caller that indexed or sorted the result failed far from the
! class that caused it.
!
! dir(cls) also leaked GemStone's class-side protocol.  The metaclass walk ran
! the WHOLE chain, so __mro__ / mro / __bases__ / __base__ / __subclasses__
! (defined on Behavior) and __name__ / __qualname__ (on Object class) appeared
! on every built-in type.  It cannot simply be dropped -- a class body's data
! attributes live on the metaclass, which is what the union was added for --
! but those live on the metaclasses of PYTHON classes, all of which sit BELOW
! ``Object class''.  Stopping there keeps what the union was for and drops what
! it never meant to include, and dir(str) went from 16 names CPython does not
! have to 6.  The three class-attribute rows are the control for that.
!
! format().  __format__ is required to answer a str.  Grail returned whatever
! it got, so format(x) could answer an int -- and the f-string codegen calls
! straight through format(), so ``f'{x}''' would then try to concatenate one.
!
! Drives tests/python/round_dir_format.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_round, test_bug_27936 and test_format.  test_dir drives
! several of these too but asserts more besides -- an object whose __class__
! lookup deliberately fails, among others -- and is NOT green.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RoundDirFormatTestCase removeAllMethods.
RoundDirFormatTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: RoundDirFormatTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'round_dir_format' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/round_dir_format.py')
		name: 'round_dir_format'.
%

category: 'Grail-Private'
method: RoundDirFormatTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - round'
method: RoundDirFormatTestCase
testRoundBreaksTiesToEven
	"Both signs and both sides of each tie: half-away-from-zero and
	ties-to-even agree on EVERYTHING except an exact .5, so a test that only
	checked non-ties would have passed throughout."

	self assertMatchesCPythonAt: 'round_ties'.
	self assertMatchesCPythonAt: 'round_non_ties'.
	self assertMatchesCPythonAt: 'round_int_ndigits_ties'.
	self assertMatchesCPythonAt: 'round_int_ndigits_wide'.
%

category: 'Grail-Tests - round'
method: RoundDirFormatTestCase
testTheNdigitsFormStillAgrees
	"It was already correct, by its own exact-rational route -- which is
	exactly why the disagreement was hard to see: round(2.5) and round(2.5, 0)
	are the same question and gave different answers.  Here so the fix joins
	them rather than swapping which one is wrong."

	self assertMatchesCPythonAt: 'round_ndigits_ties'.
	self assertMatchesCPythonAt: 'round_result_types'.
%

category: 'Grail-Tests - round'
method: RoundDirFormatTestCase
testRoundArgumentHandling
	"Every row here was a WRONG ANSWER rather than an error: a keyword
	reported as a missing argument, extra positionals dropped so round(1, 2,
	3) answered 1."

	self assertMatchesCPythonAt: 'round_kw_both'.
	self assertMatchesCPythonAt: 'round_kw_ndigits'.
	self assertMatchesCPythonAt: 'round_no_args'.
	self assertMatchesCPythonAt: 'round_too_many'.
%

category: 'Grail-Tests - round'
method: RoundDirFormatTestCase
testNdigitsNoneMeansTheArgumentWasNotSupplied
	"Four types, four different __round__ implementations -- and only the INT
	leg failed, because int tested Smalltalk nil where Python None is a
	distinct OBJECT.  float's __round__: documents that exact trap and checks
	for both; int did not.  Testing all four is what tells a type-specific
	slip from a general one."

	#('int' 'float' 'decimal' 'fraction') do: [:k |
		self assertMatchesCPythonAt: 'round_none_ndigits_' , k.
		self assertMatchesCPythonAt: 'round_none_type_' , k].
%

category: 'Grail-Tests - round'
method: RoundDirFormatTestCase
testRoundLooksUpTheDunderOnTheType
	"An INSTANCE attribute named __round__ must not be honoured.  Grail's
	lookup was already on the type, correctly -- but a receiver that failed it
	fell into the kernel arithmetic and died with an UNCATCHABLE ``does not
	understand #'*''', so the right rule produced the wrong exception."

	self assertMatchesCPythonAt: 'round_delegates'.
	self assertMatchesCPythonAt: 'round_no_dunder'.
	self assertMatchesCPythonAt: 'round_instance_dunder'.
	self assertMatchesCPythonAt: 'round_instance_dunder_ndigits'.
%

category: 'Grail-Tests - dir'
method: RoundDirFormatTestCase
testDirAnswersASortedListWhateverTheHookReturned
	"dir() is documented to answer a sorted list; Grail answered whatever
	__dir__ did.  The non-iterable row is the one that matters -- it is the
	difference between an error at the dir() call and an error much later,
	wherever the caller tried to use 7 as a list."

	self assertMatchesCPythonAt: 'dir_tuple_value'.
	self assertMatchesCPythonAt: 'dir_tuple_type'.
	self assertMatchesCPythonAt: 'dir_set_value'.
	self assertMatchesCPythonAt: 'dir_set_type'.
	self assertMatchesCPythonAt: 'dir_not_iterable'.
	self assertMatchesCPythonAt: 'dir_module_bad_dict'.
%

category: 'Grail-Tests - dir'
method: RoundDirFormatTestCase
testDirOfAClassDoesNotLeakTheKernelMetaclass
	"Seven names from Behavior and Object class appeared on every built-in
	type.  Asked as MEMBERSHIP rather than as the whole list: dir(str) still
	differs from CPython's in other ways (Grail's object carries __enter__ /
	__aenter__ and friends), and pinning the list whole would make this fail
	for reasons it is not about."

	self assertMatchesCPythonAt: 'dir_str_no_metaclass_names'.
	self assertMatchesCPythonAt: 'dir_str_keeps_real_methods'.
%

category: 'Grail-Tests - dir'
method: RoundDirFormatTestCase
testClassAttributesSurviveTheNarrowedWalk
	"THE CONTROL for the change above.  The metaclass union exists because a
	class body's data attributes live there -- ``data = 42'' compiles to an
	accessor pair on C class -- so narrowing the walk could have dropped them.
	A SUBCLASS is included because its inherited attributes live on its BASE's
	metaclass, one step further up the chain that was narrowed."

	self assertMatchesCPythonAt: 'dir_class_attr'.
	self assertMatchesCPythonAt: 'dir_subclass_attr'.
	self assertMatchesCPythonAt: 'dir_instance_attr'.
%

category: 'Grail-Tests - format'
method: RoundDirFormatTestCase
testFormatRequiresAStrResult
	"Checked for BOTH call shapes, because format(x) used to reach
	__format__ directly rather than through format(x, '') -- so a check added
	only to the two-argument form would have left the common spelling
	unguarded."

	self assertMatchesCPythonAt: 'format_bad_result'.
	self assertMatchesCPythonAt: 'format_bad_result_with_spec'.
	self assertMatchesCPythonAt: 'format_good_result'.
	self assertMatchesCPythonAt: 'format_default_spec'.
%

category: 'Grail-Tests - Controls'
method: RoundDirFormatTestCase
testOrdinaryFormattingIsUnaffected
	"The control: a result check must not refuse what already worked."

	self assertMatchesCPythonAt: 'format_plain'.
	self assertMatchesCPythonAt: 'format_bad_spec_type'.
%

category: 'Grail-Tests - Controls'
method: RoundDirFormatTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '39 checks, 0 disagreeing [], keys match: True'
%
