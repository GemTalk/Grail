! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyAugAssignTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyAugAssignTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyAugAssignTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyAugAssignTestCase
!
! Augmented assignment at CLASS-BODY level: ``class C: x = 1; x += 1''.
!
! A class body executes sequentially, so the statement rebinds the class
! attribute and CPython leaves C.x == 2.  Grail emitted NOTHING for it.  An
! AugAssignAst carries no classBodyAttributePairs, so the structural class-body
! compile had nothing to emit and dropped the statement whole -- C.x stayed 1,
! with no error anywhere.  (The same blind spot hid the ``nonlocal x; x += 1''
! case fixed alongside it; see ClassBodyNonlocalTestCase.)
!
! ClassDefAst now treats a bare-name augmented assignment as a class-body
! RUNTIME statement, like ``try'' / ``for'' / ``while'' / ``with'', and
! AugAssignAst turns it into a read-modify-write against the class:
! ``___pyAttrLoad___'' for the read, ``___classBodyDefinitionalStore___:put:''
! for the store.  Going through that store rather than an accessor is what makes
! the binding visible to the class-body NAMESPACE (PEP 3115 __prepare__), so an
! augmented assignment is recorded there like any other.
!
! A target the body declared ``nonlocal'' is excluded, since that one binds the
! enclosing function's variable and already has its own enclosing-scope emit.
! Without the exclusion both passes would claim the statement and the increment
! would be applied TWICE -- testNonlocalAugAssignIsAppliedOnce pins that.
!
! KNOWN GAP, deliberately not asserted.  Class-body statements are emitted in two
! phases -- attribute initialisers first, then these runtime statements -- rather
! than in source order, so a LATER attribute that reads the augmented name still
! sees the pre-update value:
!
!     class D:
!         s = "a"
!         s += "b"
!         n = len(s)      # CPython: 2.  Grail: 1.
!
! D.s itself is now correct (testAugmentedValueIsStored), which it was not
! before; only the cross-statement read lags.  This is the same two-phase
! ordering that already affects class-body try/for/while/with, and closing it
! means executing a class body in source order against its namespace -- the
! direction the __prepare__ work is already going, rather than something this
! change should bolt on.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_augassign.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyAugAssignTestCase removeAllMethods.
ClassBodyAugAssignTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyAugAssignTestCase
setUp
	"Reload tests/python/class_body_augassign.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_augassign' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_augassign.py')
		name: 'class_body_augassign'.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testChainedOps
	"THE BUG.  Two augmented assignments after the initial binding: 1, then
	+1, then *5.  Both used to be dropped, so the class kept the initial 1."

	self assert: testModule @env1:chained_ops equals: 10.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testAugmentedValueIsStored
	"The attribute itself ends up with the augmented value: a body binding s to
	'a' and then doing ``s +='' leaves C.s == 'ab' rather than 'a'."

	self assert: testModule @env1:augmented_value_is_stored equals: 'ab'.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testListInPlaceExtend
	"``+='' on a list goes through __iadd__, which extends in place."

	self assert: testModule @env1:list_in_place_extend asArray
		equals: #( 1 2 3 ).
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testInPlaceKeepsIdentity
	"__iadd__ mutates rather than rebinding, so an alias taken BEFORE the
	augmented assignment sees the change.  The read-modify-write must hand the
	real object to the operator, not a copy."

	self assert: testModule @env1:in_place_keeps_identity asArray last
		equals: true.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testInsideAForLoop
	"Inside a class-body ``for'', which the same runtime pass emits.  This one
	worked before only because nothing read ``t'' afterwards."

	self assert: testModule @env1:inside_a_for_loop equals: 6.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testInsideAnIf
	"Class-body ``if'' has its own emit (emitClassBodyIf:on:); the augmented
	assignment inside it must still reach the class attribute."

	self assert: testModule @env1:inside_an_if equals: 7.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testMethodLocalIsUnaffected
	"A method body is a FUNCTION scope, so ``k += 41'' there is an ordinary
	local.  The class-body branch keys off ___inClassBodyRuntimeScope___, which
	walks out to the first FunctionDefAst and answers false -- getting that
	wrong would route every method-local augmented assignment at a class
	attribute."

	self assert: testModule @env1:method_local_is_unaffected asArray
		equals: #( 42 100 ).
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testClassAttributeFromAMethod
	"``G.c += 1'' inside a method is an ATTRIBUTE augmented assignment, a
	separate path that must keep working."

	self assert: testModule @env1:class_attribute_from_a_method equals: 6.
%

category: 'Grail-Tests'
method: ClassBodyAugAssignTestCase
testNonlocalAugAssignIsAppliedOnce
	"A nonlocal target belongs to the enclosing-scope pass, not the class
	attribute pass.  Both passes scan the same statement list, so without the
	exclusion between them the increment would be applied TWICE and the answer
	would be 2."

	self assert: testModule @env1:nonlocal_augassign_is_applied_once equals: 1.
%
