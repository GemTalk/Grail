! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TotalOrderingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TotalOrderingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TotalOrderingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TotalOrderingTestCase
!
! functools.total_ordering, and the class-ATTRIBUTE comparison dunder it is
! built on.
!
! total_ordering used to pass the class straight through, on the theory that
! Grail's pairwise fallback (``a <= b'' reflects to ``b.__ge__(a)'') already
! covered it.  It does not: a class defining only __lt__ has no __ge__ to
! reflect INTO, so ``a <= b'' raised ``'<=' not supported between instances of
! 'A' and 'A''' -- and the whole point of the decorator is that the other five
! operators start working.
!
! The decorator installs each synthesised operator as a class attribute, which
! exposed a second gap: object's __lt__: / __le__: / __gt__: / __ge__: consulted
! that store only for the REFLECTED operator on the OTHER operand.  A forward
! ``a < 5'' therefore raised TypeError, since a plain int carries no mirror
! operator to reflect onto.  Both directions now read the same store.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TotalOrderingTestCase removeAllMethods.
TotalOrderingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TotalOrderingTestCase
setUp
	"Reload tests/python/total_ordering.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'total_ordering' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/total_ordering.py')
		name: 'total_ordering'.
%

category: 'Grail-Private'
method: TotalOrderingTestCase
assertAllTrue: aCollection
	"Every element of a Python list of bools is True."

	aCollection asArray doWithIndex: [:each :i |
		self assert: each == true
			description: 'element ' , i printString , ' is ' , each printString].
%

! --- The six operators, from each of the four possible roots ---

category: 'Grail-Tests - Synthesis'
method: TotalOrderingTestCase
testAllSixOperatorsFromEveryRoot
	"Whichever single ordering method the class defines, all six comparisons
	must answer -- that is the decorator's entire contract.  Ten assertions
	per root: the six operators plus the four negative cases that catch a
	derived operator computed with the wrong sign."

	| results |
	results := testModule @env1:all_roots.
	#( 'FromLt' 'FromLe' 'FromGt' 'FromGe' ) do: [:name |
		self assertAllTrue: (results @env1:__getitem__: name)].
%

category: 'Grail-Tests - Synthesis'
method: TotalOrderingTestCase
testNoOrderingOperationIsAValueError
	"CPython raises rather than silently decorating a class it cannot help:
	``must define at least one ordering operation: < > <= >=''."

	self assert: testModule @env1:no_operations_defined equals: 'ValueError'.
%

category: 'Grail-Tests - Synthesis'
method: TotalOrderingTestCase
testExistingOperatorsAreNotOverwritten
	"``class A(int)'' inherits all four ordering methods, so nothing is
	synthesised and int's own comparisons keep answering."

	self assertAllTrue: testModule @env1:no_overwrite.
%

category: 'Grail-Tests - Synthesis'
method: TotalOrderingTestCase
testDerivedOperatorIsNamedForTheOperatorItImplements
	"CPython sets ``opfunc.__name__ = opname'' before installing it."

	self assert: testModule @env1:derived_name equals: '__ge__'.
%

category: 'Grail-Tests - Synthesis'
method: TotalOrderingTestCase
testDerivedOperatorBindsSelf
	"A synthesised operator stands in for the plain function CPython puts in
	the class dict, so reading it through an INSTANCE has to bind self.  Left
	unbound, ``a.__le__(b)'' would run with b as the receiver and no operand."

	self assert: testModule @env1:derived_binds_self equals: true.
%

! --- NotImplemented has to survive the derivation ---

category: 'Grail-Tests - NotImplemented'
method: TotalOrderingTestCase
testDerivedOperatorPuntsWhenTheRootPunts
	"``if op_result is NotImplemented: return op_result''.  Without it a root
	that punted on a foreign type would be read as falsy and the derived
	operator would answer a confident, wrong bool."

	self assertAllTrue: testModule @env1:notimplemented_propagates.
%

category: 'Grail-Tests - NotImplemented'
method: TotalOrderingTestCase
testPuntedComparisonRaisesTypeError
	"As an OPERATOR the punt has to surface as the catchable Python TypeError
	-- CPython bug 10042 is that this pair must not recurse instead."

	self assert: testModule @env1:type_error_when_not_implemented asArray
		equals: #( 'lt:TypeError' 'le:TypeError' 'gt:TypeError' 'ge:TypeError' ).
%

! --- A comparison dunder that is a class attribute, not a compiled def ---

category: 'Grail-Tests - Class-attribute dunder'
method: TotalOrderingTestCase
testClassAttributeDunderAnswersBetweenTwoInstances
	"``__lt__ = _less'' in the class body.  This direction worked before the
	forward probe existed, by reflecting onto the other operand -- keep it
	green so the new forward path cannot regress it."

	self assert: testModule @env1:attr_dunder_forward equals: true.
%

category: 'Grail-Tests - Class-attribute dunder'
method: TotalOrderingTestCase
testClassAttributeDunderAnswersAgainstAForeignOperand
	"``a < 5'' -- a plain int carries no mirror operator, so reflection has
	nothing to reach and the forward class-attribute lookup is the only way
	to answer.  This used to raise TypeError."

	self assert: testModule @env1:attr_dunder_against_foreign equals: true.
%
