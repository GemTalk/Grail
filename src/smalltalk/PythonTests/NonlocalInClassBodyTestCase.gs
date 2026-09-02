! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalInClassBodyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalInClassBodyTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalInClassBodyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalInClassBodyTestCase
!
! ``nonlocal'' IN A CLASS BODY WRITES THE ENCLOSING BINDING.
!
! A class body is a scope, and ``nonlocal x'' in one means what it means
! anywhere else: the assignment binds the ENCLOSING function's variable and
! declares nothing locally.  CPython also keeps the name out of the class
! __dict__ -- it was never a class attribute.
!
! Grail did NEITHER.  The write was silently dropped and the name was bound as a
! class attribute instead, so the statement was wrong in both directions at once
! and nothing reported it:
!
!     def outer():
!         marker = 1
!         class X:
!             nonlocal marker
!             marker = 42
!         return marker          # Grail: 1.  CPython: 42.
!
! THE MACHINERY WAS ALREADY THERE.  The emit pass, the exclusion from
! classBodyAttributes, the parser recording nonlocalNames on the class body --
! all present and correct.  What stopped it was the gate in front:
! ___nonlocalTargetIsAssignableHere___: asked "is this name an assignable
! Smalltalk temp here" by RENDERING THE NAME AS A READ and requiring the bare
! identifier back.  Reading a plain local emits its unbound-local guard --
!
!     (marker ifNil: [UnboundLocalError ___signalUnbound___: #marker])
!
! -- which is not the bare identifier, so the test rejected precisely the temps
! it existed to accept.  Asking in a STORE context renders the assignment
! TARGET, which is what the question is actually about.
!
! The store render alone is not sufficient, and the second half is what keeps
! the original bug fixed rather than traded for a worse one: ``__class__'' also
! renders bare in a store context -- deliberately, so ``__class__ = v'' inside a
! method stays well-formed -- while Grail has NO temp for it, popScope keeping
! that one name local to the class body.  Emitting ``__class__ := 42'' is
! CompileError 1001, which replaces the whole enclosing method with a raising
! stub; that is how this gate came to exist.  So the test also asks whether an
! enclosing FUNCTION binds the name at all, and that is the half which separates
! the two cases.
!
! WHY NO SUITE TEST MOVES.  test_scope's testNonLocalClass already passed: its
! outer variable renders WITHOUT the unbound guard, so it took the accepting
! path.  The gate only rejected the guarded spelling, which is why the bug
! survived a test written for exactly this feature.
!
! TWO DIVERGENCES REMAIN, asserted below at Grail's CURRENT values so they are
! visible rather than merely absent:
!
!   * a read EARLIER in the same class body still sees the pre-write value --
!     the write is emitted after the body's other statements rather than at its
!     source position.  Only the in-body read is affected.
!   * ``nonlocal __class__'' is still dropped, for the reason above.  This is
!     the last failing assertion of test_super's
!     test_various___class___pathologies.
!
! Measured: SUnit 4804/4804, full CPython suite 0 regressions and 0 improvements
! -- this fixes a silently wrong answer, not a counted test.  Every expectation
! is CPython 3.14.6's own output for tests/python/nonlocal_in_class_body.py,
! including the two the divergence notes point at.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NonlocalInClassBodyTestCase removeAllMethods.
NonlocalInClassBodyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalInClassBodyTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'nonlocal_in_class_body' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/nonlocal_in_class_body.py')
		name: 'nonlocal_in_class_body'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: NonlocalInClassBodyTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: NonlocalInClassBodyTestCase
at: aKey item: anIndex
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testAPlainAssignmentReachesTheEnclosingLocal
	"The shape the whole change is about.  Answered 1 before -- the write was
	dropped and nothing said so."

	self assert: (self at: 'plain' item: 0) equals: 42.
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testTheNameIsNotAlsoAClassAttribute
	"The other half of the old bug, and the reason it was wrong in BOTH
	directions: the name was bound as a class attribute as well, so the class
	carried an attribute CPython never gives it."

	self assert: (self at: 'plain' item: 1) equals: false.
	self assert: (self at: 'augmented' item: 1) equals: false.
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testAnAugmentedAssignmentReachesItToo
	"``x += 1'' is the spelling test_scope's testNonLocalClass uses -- and it
	already worked, because its outer variable renders without the unbound
	guard.  Asserted so the two spellings are held together."

	self assert: (self at: 'augmented' item: 0) equals: 15.
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testItWorksFromAMethodAndThroughANestedFunction
	"The enclosing scope can be a method's body or a function nested inside
	another -- both resolve the target the same way, and neither was reached
	before."

	self assert: (self at: 'method') equals: 42.
	self assert: (self at: 'nested' item: 0) equals: 9.
	self assert: (self at: 'nested' item: 1) equals: 9.
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testAGlobalDeclarationInAClassBodyIsUndisturbed
	"``global'' in a class body is the same rule one scope further out and
	already worked.  The guard on this change: the nonlocal path must not
	disturb it."

	self assert: (self at: 'global_sibling' item: 0) equals: 13.
	self assert: (self at: 'global_sibling' item: 1) equals: false.
%

! --- the two remaining divergences, pinned at Grail's CURRENT behaviour ---

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testAReadLaterInTheSameBodySeesTheWrite
	"WAS A PINNED DIVERGENCE, now fixed -- kept as a test rather than deleted,
	because it is the shape that motivated the fix.

	The nonlocal write used to be emitted in a trailing pass, after the class
	body's other statements, so a read at a LATER source position still saw the
	pre-write value: CPython answered 'after' and Grail answered 'before'.  The
	writes are now flushed at their own source position, interleaved with the
	class attributes exactly as the global-write flush already was -- see
	ClassDefAst >> ___classBodyOrderedRuntimeStatements___.

	The ENCLOSING scope saw the write either way, which is why this was only ever
	an in-body divergence; it is asserted here beside the in-body read."

	self assert: (self at: 'read_inside_body' item: 0) @env0:asString
		equals: 'after'.
	self assert: ((self at: 'read_inside_body' item: 1) @env1:__getitem__: 0)
		@env0:asString equals: 'after'.
%

category: 'Grail-Tests'
method: NonlocalInClassBodyTestCase
testNonlocalDunderClassRebindsTheClassCell
	"WAS A PINNED DIVERGENCE, now fixed -- kept as a test rather than deleted,
	because it is the shape that motivated the fix.

	CPython gives every class body an implicit ``__class__'' cell, so
	``nonlocal __class__; __class__ = 42'' rebinds it and the enclosing method
	then reads 42.  Grail resolves ``__class__'' lexically and has no assignable
	temp for it, so the write used to be dropped; it now goes to the cell the
	class carries, and the reads in that class are compiled to consult it.  See
	NonlocalDunderClassTestCase for the full behaviour, including the sibling
	method that must see the write too."

	self assert: (self at: 'dunder_class') equals: 42.
%
