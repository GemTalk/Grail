! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalDunderClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalDunderClassTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalDunderClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalDunderClassTestCase
!
! ``nonlocal __class__'' IN A CLASS BODY REBINDS THE CLASS CELL.
!
! ``__class__'' is not an ordinary name.  CPython's compiler gives every method
! an implicit closure over ONE cell holding the class, and that cell is what
! ``__class__'' and zero-argument ``super()'' read.  A nested class body may
! declare it ``nonlocal'' and write it:
!
!     class Host:
!         def m(self):
!             class X:
!                 nonlocal __class__
!                 __class__ = 42
!
! and from then on EVERY method of Host reads 42.  The cell is shared, so this
! is not a local rebinding of one name in one frame.  Grail dropped the write
! entirely and reported nothing -- the last failing assertion of test_super's
! test_various___class___pathologies, which now passes (test_super 5 -> 4).
!
! WHY IT WAS DROPPED RATHER THAN EMITTED.  Grail resolves ``__class__''
! LEXICALLY: it compiles to the class expression itself, not to a cell read, so
! there is no assignable temp behind the name and ``__class__ := 42'' is a
! CompileError 1001 that takes the whole enclosing METHOD down.  That is what
! ___nonlocalTargetIsAssignableHere___ was built to refuse, and refusing was
! right until there was somewhere else to put the write.  There is now: the cell
! the class already carries (added with ``m.__closure__''), written through
! ___grailSetClassCell___ against the ENCLOSING class -- which the class-body
! emit can name, because printEnclosingClassOn: already exists for ``__class__''
! read in a class body.
!
! THE READS ARE THE EXPENSIVE HALF.  Making every ``__class__'' read consult the
! cell would tax the hottest path Grail generates -- every zero-argument
! ``super()'' in the corpus -- to confirm a thing that is almost never true.  So
! the reads are switched on PER CLASS by a subtree walk
! (ClassDefAst >> ___classCellIsRebindable___) run before any method source is
! generated.  It has to be a pre-pass: a class's method sources are all produced
! in one loop, so a fact learned while generating the third method cannot change
! how the first was written.  The walk over-approximates deliberately -- a false
! positive costs one send and changes no answer, a false negative would silently
! drop a binding again.  No module outside test_super contains the construct, so
! the corpus-wide cost is nil.
!
! THE TEST THAT SEPARATES A CELL FROM A CONVENIENT LOCAL is
! testASiblingMethodSeesTheWrite.  A per-frame rebinding would be invisible to
! the class's OTHER methods; CPython's is not, and neither is this.  Getting
! that for free is the payoff for writing the real cell rather than
! special-casing the enclosing method.
!
! Fixture: tests/python/nonlocal_dunder_class.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalDunderClassTestCase
setUp
	probe := self ___loadProbe___: 'nonlocal_dunder_class'.
%

category: 'Grail-Private'
method: NonlocalDunderClassTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: NonlocalDunderClassTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testTheWriteChangesWhatTheEnclosingMethodReads
	"The headline case.  Before the nested class body runs, ``__class__'' in the
	method is the class; after it, it is 42.  Grail answered the class both
	times and reported nothing."

	self assert: (self at: 'read_before_the_write_is_the_class') equals: true.
	self assert: (self at: 'read_after_the_write_is_the_new_value') equals: 42.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testASiblingMethodSeesTheWrite
	"THE CHECK THAT SEPARATES A CELL FROM A CONVENIENT LOCAL.  A different
	method of the same class -- compiled before the write was even parsed --
	reads the new value, because the cell is shared by every method of the
	class.  An implementation that rebound something per frame, or per method,
	would pass every other test here and fail this one."

	self assert: (self at: 'sibling_method_sees_the_write') equals: 99.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testTheNameStillNamesTheClass
	"The write goes to the CELL, not to the class binding: the class namespace
	gains no '__class__' entry.  CPython checks this explicitly, and it is the
	half PR #495 already got right by dropping the write -- so it has to keep
	holding now that the write is emitted."

	self assert: (self at: 'not_a_class_attribute') equals: true.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testAMethodDeclaringItWritesTheSameSharedCell
	"THE METHOD-LEVEL FORM, which was dropped while the class-body form above
	worked.

	``def damage(self): nonlocal __class__; __class__ = MB'' emitted a store
	against the temp popScope keeps for the declared name, so the write landed
	in a local nobody reads and the cell kept its old value.  Nothing in the
	corpus could see it: test_super's tearDown exists to repair the damage
	test_various___class___pathologies does, and a repair that is a no-op
	against damage that never landed costs that module no assertion.

	``method_nonlocal_super_after'' is the one that separates the cell from a
	frame-local: g() declares nothing, was compiled before damage() was parsed,
	and its zero-argument super() must resolve against MB afterwards -- finding
	MA.f, not MB.f."

	self assert: (self at: 'method_nonlocal_super_before') equals: 'B'.
	self assert: (self at: 'method_nonlocal_peek_before') equals: 'MC'.
	self assert: (self at: 'method_nonlocal_read_after_write') equals: 'MB'.
	self assert: (self at: 'method_nonlocal_super_after') equals: 'A'.
	self assert: (self at: 'method_nonlocal_sibling_sees_it') equals: 'MB'.
	self assert: (self at: 'method_nonlocal_not_a_class_attribute').
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testTheWriteTargetsTheContainerNotTheContents
	"THE RECEIVER OF THE CELL WRITE IS THE CLASS, not what the cell currently
	reads out to.

	Once anything has put a NON-CLASS in the cell -- test_super's
	test_various___class___pathologies puts 42 there -- an emit that reached
	the class through the rebindable-cell READ sends the setter to that value
	instead: ``a SmallInteger class does not understand
	#'___grailSetClassCell___:'''.  ``del __class__'' had already made the same
	distinction (DeleteAst goes through ___printClassObjectOn___:); the write
	has to make it too.

	Caught by the CPython conformance gate rather than by this fixture, which
	is why the shape is now here: test.test_super went 0 -> 1 fail+err on a
	change every other gate passed."

	self assert: (self at: 'junk_cell_peek_before').
	self assert: (self at: 'junk_cell_holds_non_class') equals: 42.
	self assert: (self at: 'junk_cell_restored').
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testDeletingItEmptiesTheSharedCell
	"``nonlocal __class__; del __class__'' EMPTIES the cell every method of the
	class shares.

	The failure mode is a silent no-op, not an error: before the IR path could
	spell this, the emit nilled the temp popScope keeps for the declared name
	and a later zero-argument super() went on working against a cell that
	should have been empty -- g() kept answering 'A'.

	Asserts that the delete HAS AN EFFECT rather than which exception follows.
	Grail raises RuntimeError('super(): empty __class__ cell') where CPython
	3.14 raises NameError on the free variable; that divergence is on both the
	text and IR paths, predates this cut, and is recorded in docs/Issues.md."

	self assert: (self at: 'del_cell_super_before') equals: 'A'.
	self assert: (self at: 'del_cell_super_after') equals: 'raised'.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testTheReadInTheDeclaringFrameIsTheCellNotATemp
	"Read and write are ONE change, not two.  Route the store to the cell while
	the read still reads the temp and the declared name is never bound, so a
	read in the same frame raises UnboundLocalError instead of answering --
	which is what happened when this cut was first built with only the store
	branch in place."

	self assert: (self at: 'method_nonlocal_read_after_write') equals: 'MB'.
	self assert: (self at: 'method_nonlocal_peek_before') equals: 'MC'.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testAnOrdinaryClassIsUnaffected
	"The control, and the one that guards the per-class gate.  A class nobody
	rebinds reads its own class exactly as before -- no cell consulted, the same
	code emitted.  Without this the suite would pass for an implementation that
	broke ``__class__'' generally while fixing the pathology."

	self assert: (self at: 'an_ordinary_class_is_unaffected') equals: true.
%

category: 'Grail-Tests'
method: NonlocalDunderClassTestCase
testZeroArgSuperStillWorks
	"Zero-arg ``super()'' reads the same cell but is emitted by a DIFFERENT
	method than the bare name, so the two could drift.  They share one wrapper
	(CallAst >> ___printClassCellReadOn___:around:) precisely so they cannot,
	and this is the check that the shared path did not disturb the common case."

	self assert: (self at: 'zero_arg_super_still_works') equals: true.
%
