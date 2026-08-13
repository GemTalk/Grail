! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyNonlocalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyNonlocalTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyNonlocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyNonlocalTestCase
!
! ``nonlocal'' inside a CLASS BODY.  Such an assignment binds the ENCLOSING
! FUNCTION's variable, so it must not become a class attribute, and the
! enclosing scope must see the new value.
!
! Grail got both halves wrong, in opposite ways, and silently:
!
!   * ``nonlocal x; x += 1'' produced NO CODE AT ALL.  An AugAssignAst
!     implements neither ___boundTargetNames___ nor classBodyAttributePairs, so
!     it is invisible to every class-body scan and the structural compile simply
!     had nothing to emit for it.  The outer x was never incremented and nothing
!     reported a problem (test_scope testNonLocalClass).
!   * ``nonlocal z; z = 42'' was worse than invisible: AssignAst DOES yield a
!     class-attribute pair, so z became a class attribute of the same name while
!     the enclosing z stayed untouched -- a wrong answer in both directions.
!
! The parser already stripped nonlocal names from the scope's variables and
! writes so no shadowing temp is declared, which is precisely what made them
! indistinguishable afterwards from a name the body never mentioned.  popScope
! now returns the set and BlockAst records it as ``nonlocalNames''.  ClassDefAst
! then excludes those names from classBodyAttributes and emits each such
! statement through its own printSmalltalkOn: in the ENCLOSING scope, where the
! name is a real Smalltalk temp -- the same third-pass trick already used for
! class-body try/for/while/with and for ``NestedClass.attr = value''.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_nonlocal.py under it directly.
!
! NOT FIXED HERE, and a separate defect: a PLAIN augmented assignment in a class
! body (``class C: x = 1; x += 1'') is still dropped, so C.x stays 1 where
! CPython says 2.  That needs AugAssignAst to yield a class-attribute pair,
! which is a different mechanism from the enclosing-scope write this file is
! about.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyNonlocalTestCase removeAllMethods.
ClassBodyNonlocalTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyNonlocalTestCase
setUp
	"Reload tests/python/class_body_nonlocal.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_nonlocal' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_nonlocal.py')
		name: 'class_body_nonlocal'.
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testAugmentedAssignmentReachesEnclosing
	"test_scope's testNonLocalClass shape: ``nonlocal x; x += 1'' must increment
	the enclosing function's x and bind no class attribute.  The statement used
	to compile to nothing whatsoever, so the method read 0."

	self assert: testModule @env1:augmented_assignment_reaches_enclosing asArray
		equals: { 1. false }.
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testPlainAssignmentReachesEnclosing
	"``nonlocal z; z = 42'' binds the OUTER z.  This is the case that was wrong
	in both directions -- the enclosing z kept its old value AND a class
	attribute ``z'' appeared, which CPython does not create."

	self assert: testModule @env1:plain_assignment_reaches_enclosing asArray
		equals: { 42. false }.
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testEnclosingFunctionSeesTheWrite
	"The write is visible to the enclosing function directly, after the class
	statement -- not only through a method closing over the name."

	self assert: testModule @env1:enclosing_function_sees_the_write equals: 15.
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testSeveralNonlocalNames
	"``nonlocal a, b'' with both written, one augmented and one plain."

	self assert: testModule @env1:several_nonlocal_names asArray
		equals: #( 2 6 ).
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testSameNameElsewhereStillBindsAClassAttribute
	"The exclusion is scoped to the body that DECLARED the name nonlocal.  A
	different class body binding the same name still gets its class attribute,
	so the fix cannot be suppressing attributes by name globally."

	self assert: testModule @env1:same_name_elsewhere_still_binds_a_class_attribute asArray
		equals: { 1. 99. false. true }.
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testMethodReadsTheBindingNotACopy
	"A method closing over the nonlocal name reads the BINDING, so a write made
	after the class statement is visible to it -- the class-body write must not
	snapshot the value."

	self assert: testModule @env1:nonlocal_value_is_readable_by_a_method_after_later_writes asArray
		equals: #( 1 101 ).
%

category: 'Grail-Tests'
method: ClassBodyNonlocalTestCase
testUnassignableNonlocalTargetStillCompiles
	"REGRESSION GUARD.  A ``nonlocal'' declaration says the name is not local to
	the class body; it does NOT promise Grail has a Smalltalk temp for it.
	``__class__'' is the case that bites -- CPython supplies it as an implicit
	method closure cell, so ``nonlocal __class__; __class__ = 42'' is legal
	there, and emitting the write unconditionally is CompileError 1001 in Grail,
	which the class-body compile turns into a raise-on-call stub for the whole
	enclosing method.  That is what it did to test_super's
	test_various___class___pathologies, turning a plain assertion failure into a
	codegen gap -- a change the scoreboard gate did not flag, because the
	module's fail+error TOTAL was unchanged.

	___nonlocalTargetIsAssignableHere___: now skips the write for such a name.
	Asserted here is the part Grail and CPython agree on: the module compiles,
	the method runs, and ``__class__'' is not a class attribute."

	self deny: testModule @env1:unassignable_nonlocal_target_still_compiles.
%
