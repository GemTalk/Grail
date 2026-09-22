! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassTypeParamsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassTypeParamsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassTypeParamsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassTypeParamsTestCase
!
! PEP 695 type parameters on a CLASS: ``class A[T]'' must answer ``(T,)'' from
! __type_params__, where T is a typing.TypeVar.
!
! Grail's class parser called skipTypeParams -- which already ANSWERS the names,
! because the def parser has stored them since f.__type_params__ became
! observable -- and threw the answer away, setting an empty array.  So the names
! were gone before codegen could record them, and the attribute did not exist.
!
! THE TYPEVARS ARE BUILT ON FIRST READ, and that laziness is the design rather
! than an optimisation.  Materialising one means importing typing, and typing
! defines its OWN generic classes (``SupportsAbs[T]'', ``SupportsRound[T]''), so
! doing it while a class is being defined re-enters typing's own import and
! breaks ForwardRef -- deterministically, and far from here.  An earlier attempt
! did it eagerly, at every class definition in the corpus, and had to be reverted
! for exactly that.  Only the NAMES are stored at class creation, under a
! Grail-internal key that __dict__ already excludes.
!
! The ``typing_still_works'' row is the control for that history: it asks the
! very thing the eager version broke.
!
! An ASSIGNED value wins, and a DELETE is refused.  ``A.__type_params__ =
! whatever'' is legal -- and lands in the class-attribute OVERLAY rather than
! the holder once the class is canonical, which is why the read consults both.
! ``del A.__type_params__'' is a TypeError, not the AttributeError a missing
! attribute gets, because the slot is part of the TYPE rather than an entry in
! its namespace: it always reads, as an empty tuple for a class that declares
! none, so there is nothing for a delete to remove.
!
! COMPARED BY NAME, NOT BY REPR.  Grail's TypeVar repr carries the old variance
! prefix (``~T'') that CPython dropped in 3.12; that is a TypeVar.__repr__
! divergence and not about type parameters, so pinning it here would hide what
! this case is for.
!
! Drives tests/python/class_type_params.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's TestType.test_type_typeparams.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassTypeParamsTestCase removeAllMethods.
ClassTypeParamsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassTypeParamsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_type_params' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_type_params.py')
		name: 'class_type_params'.
%

category: 'Grail-Private'
method: ClassTypeParamsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the parameters exist'
method: ClassTypeParamsTestCase
testAClassReportsItsTypeParameters
	"The names were discarded by the parser, so there was nothing to report."

	self assertMatchesCPythonAt: 'names'.
	self assertMatchesCPythonAt: 'count'.
	self assertMatchesCPythonAt: 'is_typevar'.
	self assertMatchesCPythonAt: 'two_parameters'.
	self assertMatchesCPythonAt: 'is_a_tuple'.
%

category: 'Grail-Tests - the parameters exist'
method: ClassTypeParamsTestCase
testAnOrdinaryClassAnswersAnEmptyTuple
	"Not AttributeError: the slot is part of the type, which is also why it
	cannot be deleted."

	self assertMatchesCPythonAt: 'plain_class'.
	self assertMatchesCPythonAt: 'dynamic_class'.
%

category: 'Grail-Tests - assignment and deletion'
method: ClassTypeParamsTestCase
testAnAssignmentWinsAndSurvivesARefusedDelete
	"Three facts in one row, in the order test_type_typeparams asserts them:
	the assignment takes, the delete raises TypeError, and the assigned value
	is still there afterwards.  The assignment lands in the class-attribute
	OVERLAY once the class is canonical, not in the holder, which is why the
	read consults both."

	self assertMatchesCPythonAt: 'assign_then_delete'.
%

category: 'Grail-Tests - Controls'
method: ClassTypeParamsTestCase
testTypingIsUndisturbed
	"THE CONTROL FOR THE HISTORY.  An earlier cut materialised the TypeVars at
	class-definition time, which imports typing WHILE typing is defining its
	own generic classes; ForwardRef broke deterministically and the whole cut
	was reverted.  Building them on first READ is what avoids it, and this row
	asks the very thing that broke."

	self assertMatchesCPythonAt: 'typing_still_works'.
	self assertMatchesCPythonAt: 'typevar_usable'.
%

category: 'Grail-Tests - Controls'
method: ClassTypeParamsTestCase
testTheStoredNamesStayInternal
	"They live under a Grail-internal key, so they must not surface as a class
	attribute -- and __type_params__ itself is not a __dict__ entry either, in
	CPython or here."

	self assertMatchesCPythonAt: 'not_in_dict'.
	self assertMatchesCPythonAt: 'type_params_not_in_dict'.
	self assertMatchesCPythonAt: 'class_still_usable'.
	self assertMatchesCPythonAt: 'subclass_of_generic'.
%

category: 'Grail-Tests - Controls'
method: ClassTypeParamsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'
%
