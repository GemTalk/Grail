Class {
	#name : 'NonlocalDunderClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NonlocalDunderClassTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
NonlocalDunderClassTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
NonlocalDunderClassTestCase >> setUp [
	probe := self ___loadProbe___: 'nonlocal_dunder_class'.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testAMethodDeclaringItWritesTheSameSharedCell [
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

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testAnOrdinaryClassIsUnaffected [
	"The control, and the one that guards the per-class gate.  A class nobody
	rebinds reads its own class exactly as before -- no cell consulted, the same
	code emitted.  Without this the suite would pass for an implementation that
	broke ``__class__'' generally while fixing the pathology."

	self assert: (self at: 'an_ordinary_class_is_unaffected') equals: true.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testASiblingMethodSeesTheWrite [
	"THE CHECK THAT SEPARATES A CELL FROM A CONVENIENT LOCAL.  A different
	method of the same class -- compiled before the write was even parsed --
	reads the new value, because the cell is shared by every method of the
	class.  An implementation that rebound something per frame, or per method,
	would pass every other test here and fail this one."

	self assert: (self at: 'sibling_method_sees_the_write') equals: 99.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testDeletingItEmptiesTheSharedCell [
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

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testTheNameStillNamesTheClass [
	"The write goes to the CELL, not to the class binding: the class namespace
	gains no '__class__' entry.  CPython checks this explicitly, and it is the
	half PR #495 already got right by dropping the write -- so it has to keep
	holding now that the write is emitted."

	self assert: (self at: 'not_a_class_attribute') equals: true.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testTheReadInTheDeclaringFrameIsTheCellNotATemp [
	"Read and write are ONE change, not two.  Route the store to the cell while
	the read still reads the temp and the declared name is never bound, so a
	read in the same frame raises UnboundLocalError instead of answering --
	which is what happened when this cut was first built with only the store
	branch in place."

	self assert: (self at: 'method_nonlocal_read_after_write') equals: 'MB'.
	self assert: (self at: 'method_nonlocal_peek_before') equals: 'MC'.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testTheWriteChangesWhatTheEnclosingMethodReads [
	"The headline case.  Before the nested class body runs, ``__class__'' in the
	method is the class; after it, it is 42.  Grail answered the class both
	times and reported nothing."

	self assert: (self at: 'read_before_the_write_is_the_class') equals: true.
	self assert: (self at: 'read_after_the_write_is_the_new_value') equals: 42.

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testTheWriteTargetsTheContainerNotTheContents [
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

]

{ #category : 'Grail-Tests' }
NonlocalDunderClassTestCase >> testZeroArgSuperStillWorks [
	"Zero-arg ``super()'' reads the same cell but is emitted by a DIFFERENT
	method than the bare name, so the two could drift.  They share one wrapper
	(CallAst >> ___printClassCellReadOn___:around:) precisely so they cannot,
	and this is the check that the shared path did not disturb the common case."

	self assert: (self at: 'zero_arg_super_still_works') equals: true.

]
