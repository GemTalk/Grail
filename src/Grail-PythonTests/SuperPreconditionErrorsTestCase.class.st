Class {
	#name : 'SuperPreconditionErrorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperPreconditionErrorsTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
SuperPreconditionErrorsTestCase >> at: aKey [
	^ (probe @env1:__getitem__: aKey) @env0:asString

]

{ #category : 'Grail-Setup' }
SuperPreconditionErrorsTestCase >> setUp [
	probe := self ___loadProbe___: 'super_precondition_errors'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testADefWithNoPositionalParameterSaysNoArguments [
	"Precondition 1, the one message Grail already had -- kept as a test because
	the emit moved from the runtime Super class to a compile-time decision, and
	a ladder that reordered its arms would break this one silently."

	self assert: (self at: 'no_args_plain_function')
		equals: 'RuntimeError: super(): no arguments'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testADeletedFirstArgumentOutranksTheMissingCell [
	"Precondition 2, AND the order.  ``def f(x): del x; super()'' has neither a
	live argument nor a class, so both checks would fire -- CPython reports the
	deletion because the argument checks run first.  Grail said ``no arguments'',
	which is a third answer and matches neither."

	self assert: (self at: 'arg0_deleted')
		equals: 'RuntimeError: super(): arg[0] deleted'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testAnArgumentWithoutAClassNamesTheCell [
	"Precondition 3.  ``def h(x): super()'' HAS an argument; what it lacks is a
	class.  ``no arguments'' pointed the reader at the parameter list, which is
	the one part of that def that is fine."

	self assert: (self at: 'arg_present_no_cell')
		equals: 'RuntimeError: super(): __class__ cell not found'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testANestedDefReadsItsOwnParameterList [
	"Falls out of asking the INNERMOST def rather than the method: ``def inner():
	super()'' inside a method has no positional parameter of its own, and CPython
	reads inner's frame, not the method's.  Grail used to bind such a call to the
	outer receiver and hand back a proxy."

	self assert: (self at: 'nested_def_zero_params')
		equals: 'RuntimeError: super(): no arguments'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testAPatchedSuperTakesTheCallAnyway [
	"GUARD.  ``super'' replaced on the module AFTER its body compiled
	(test_shadowed_dynamic) is entitled to the call even where the builtin would
	have refused it -- so all four emits sit INSIDE the shadow probe.  Raising
	past it would leave patching working only for the calls that were going to
	succeed anyway, which is the half nobody patches for."

	self assert: (self at: 'shadowed_super_wins') equals: 'NO RAISE: ''MySuper'''.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testAZeroParameterMethodCapturingSelfIsStillRefused [
	"THE DELIBERATE EXCLUSION, and the reason the receiverless set is a compiled
	TABLE rather than an argcount test at the call site.

	A method-local class can close over the ENCLOSING method's ``self'', and
	Grail compiles a captured receiver to the bare Smalltalk receiver rather than
	to a closure cell (ReservedNameLocalClassTestCase >>
	testACapturedSelfIsStillTheReceiver).  Running such a def against a
	substitute receiver would read the SUBSTITUTE's attributes and answer
	something plausible.  CPython answers 'host' here; Grail refuses the call,
	which is what it did before.  Loud and wrong beats quiet and wrong, and the
	fixture records the difference as an XFAIL rather than hiding it."

	self assert: (self at: 'zero_param_capturing_self')
		equals: 'TypeError: unbound method ''peek'' must be called with an '
			, 'instance as the first argument'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testAZeroParameterMethodIsCallableThroughItsClass [
	"The layer BELOW the preconditions, and what kept the last of them out of
	reach.  Python 3 dropped unbound methods -- ``C.f'' is the plain function --
	so ``C.f()'' for a ``def f():'' is an ordinary call.  Grail still enforced
	the Python-2 rule and refused it, so test_obscure_super_errors never got to
	see the ``no arguments'' the def would have raised: it died one layer early,
	on a TypeError that ``assertRaisesRegex(RuntimeError, ...)'' does not catch."

	self assert: (self at: 'receiverless_call') equals: 'NO RAISE: ''no-receiver'''.
	self assert: (self at: 'no_args_zero_param_method')
		equals: 'RuntimeError: super(): no arguments'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testDeletingTheClassCellEmptiesItForSuper [
	"Precondition 4, which Grail could not reach at all: ``nonlocal __class__;
	del __class__'' compiled to a fresh local temp, nilled, that nothing read --
	the statement was a no-op and this super() returned a working proxy."

	self assert: (self at: 'empty_class_cell')
		equals: 'RuntimeError: super(): empty __class__ cell'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testStarArgsIsNotAPositionalParameter [
	"``def f(*args): super()'' is precondition 1, not 2.  CPython's check is on
	co_argcount, which counts positionals only, so a def that will certainly
	RECEIVE arguments still has none to offer super().  Grail asks
	FunctionDefAst >> ___receiverParamName___, which answers nil for this shape
	for the same reason."

	self assert: (self at: 'star_args_only')
		equals: 'RuntimeError: super(): no arguments'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testSuperInsideAComprehensionStillWorks [
	"GUARD, and a live one.  A comprehension inlines into its enclosing function
	in 3.12+, so this ``super()'' is served by the METHOD's frame and must keep
	working.  A precondition check that consulted the comprehension's own scope
	would find no positional parameter and reject a call CPython accepts."

	self assert: (self at: 'comprehension_still_works') equals: 'NO RAISE: ''ok'''.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testTheCellIsSharedByEveryMethodOfTheClass [
	"THE PROPERTY A PER-FRAME READING WOULD MISS.  The delete happens in
	``wipe''; these read from OTHER methods and on a LATER call.  CPython's
	``__class__'' is one cell per class, not per frame, so emptying it is
	visible to all of them -- and the bare read gives NameError's FREE-variable
	wording, not the UnboundLocalError a deleted local would get.  Both halves
	are checked because the fix routes them to two different accessors over the
	same cell state."

	self assert: (self at: 'bare_read_after_del')
		equals: 'NameError: cannot access free variable ''__class__'' where it '
			, 'is not associated with a value in enclosing scope'.
	self assert: (self at: 'empty_cell_again')
		equals: 'RuntimeError: super(): empty __class__ cell'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testTheCellReadsTheClassBeforeAnyDelete [
	"The control.  Without it the two tests above could pass on a class whose
	cell never held anything, which is a different bug wearing the same
	messages."

	self assert: (self at: 'cell_before_delete') equals: 'NO RAISE: True'.

]

{ #category : 'Grail-Tests' }
SuperPreconditionErrorsTestCase >> testTheSameFourHoldForDefsNestedInAMethod [
	"THE SHAPE THAT ACTUALLY MATTERS, and the one the module-level spellings
	above do not cover.  test_super's whole test body is ONE METHOD, so every def
	and class in it is method-local and there IS an enclosing class in scope.

	That changes the answer for the deleted argument.  CPython reads the
	INNERMOST frame, so ``def g(x): del x; super()'' written inside a method
	reports the deletion even though the method around it has a perfectly good
	receiver -- while a check that fired only where no class was in scope would
	skip it and hand back a proxy bound to the outer receiver.  This test class
	passed with that hole in it and the CPython suite still failed; the fixture
	is where the two spellings are kept side by side so the next reader sees the
	distinction rather than rediscovering it."

	self assert: (self at: 'nested_no_args')
		equals: 'RuntimeError: super(): no arguments'.
	self assert: (self at: 'nested_zero_param_method')
		equals: 'RuntimeError: super(): no arguments'.
	self assert: (self at: 'nested_arg0_deleted')
		equals: 'RuntimeError: super(): arg[0] deleted'.
	self assert: (self at: 'nested_empty_cell')
		equals: 'RuntimeError: super(): empty __class__ cell'.

]
