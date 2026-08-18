! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperForeignReceiverTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperForeignReceiverTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperForeignReceiverTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperForeignReceiverTestCase
!
! A METHOD REACHED THROUGH ITS CLASS AND CALLED WITH A FOREIGN OBJECT.
!
! ``X.meth(obj)'' is ordinary Python.  ``__class__'' inside it is still X -- the
! compiler closed the FUNCTION over a cell holding X, and that cell has nothing
! to do with the object the call supplies.  A zero-argument ``super()'' then
! applies CPython's "supercheck" and raises TypeError at CONSTRUCTION when the
! object is not an instance of X.
!
! Grail reaches a method's class through the RECEIVER: the class carries the
! cell and the method reads it back through the receiver's class chain.  A
! foreign receiver found nothing and raised
!
!     NameError: free variable 'X' referenced before assignment in enclosing scope
!
! which is neither the right exception nor the right diagnosis -- the name is
! not unbound, the receiver is simply not an X.  That is test_super's
! test_cell_as_self, now passing; test_super 4 -> 3, and the module has no
! ERRORS left at all (ERROR -> FAIL).
!
! HOW THE CLASS IS RECOVERED, since it is not obvious that it can be.  GemStone
! has no ``thisContext'' in environment 1, so a compiled method cannot ask which
! class it belongs to -- which is why this was previously written off as needing
! an architectural change.  It does not: Grail's TRACEBACK machinery already
! solved the same problem for sys._getframe.  The VM's raise-time capture
! (#GemExceptionSignalCapturesStack) fills _gsStack with (GsNMethod, ip,
! receiver) triples, and a GsNMethod knows its ``inClass''.  So the defining
! class comes off the live call stack.
!
! IT RUNS ONLY ON THE MISS, and that is the whole of why it is affordable.
! Measured at ~250 ns against ~0 ns for the ordinary lexical read, because it
! costs a raise.  The cell lookup succeeds for every ordinary call; this runs
! only where the alternative was raising anyway.  It is also NAME-MATCHED
! against the cell key, so it fires for the class's OWN cell and never for an
! enclosing function's captured local -- for those a miss really is an unbound
! name, and inventing a class would be wrong.
!
! THE SECOND HALF is the supercheck, which #488 left off this path on hot-path
! grounds.  COST WAS NEVER THE OBJECTION: measured here, a zero-arg super() call
! costs ~10.9 us marginal and checking every one moved it to ~11.0 us, about
! 1.4%.  CORRECTNESS was.  Grail can hold two DISTINCT class objects for one
! Python class across a metaclass dispatch, and an unconditional check rejected
! super() inside a metaclass __new__ against its own class -- ``obj (type
! IDEnumMeta) is not an instance or subtype of type (IDEnumMeta)'', same name,
! different object, six InheritedMetaclassDispatchTestCase errors that the whole
! CPython corpus does not reach.  That identity quirk is a separate bug.
!
! So the check rides with the MISS instead: a bare ``__class__'' read goes to
! ___classCell___ and never checks, a zero-arg super() goes to
! ___classCellForSuper___, and that one checks only when the ordinary lookup
! already failed -- which is precisely the condition the supercheck exists to
! report.  Calls like the IDEnumMeta one find their cell and never reach it.
!
! THE TWO GUARDS BELOW ARE NOT DECORATION.  The check accepts the MRO *or* the
! inheritance chain *or* a RECORDED METACLASS, and both added disjuncts are
! load-bearing -- removing the metaclass one fails four of the tests in this
! very class:
!
!   * an MRO-only check rejects a cooperative mixin, which is what cost four
!     Django failures and kept the check off this path for so long;
!   * Grail RECORDS a class's metaclass rather than making the class an instance
!     of it, so ``isinstance(A, M)'' is true in CPython and structurally false
!     here.  A metaclass method invoked as ``A.describe()'' has a receiver whose
!     chain carries no cell of M's, so it takes the frame fallback AND then the
!     check -- the two halves of this change meeting in one call.
!
! Fixture: tests/python/super_foreign_receiver.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: SuperForeignReceiverTestCase
setUp
	probe := self ___loadProbe___: 'super_foreign_receiver'.
%

category: 'Grail-Private'
method: SuperForeignReceiverTestCase
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
method: SuperForeignReceiverTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: SuperForeignReceiverTestCase
testAForeignReceiverRaisesTheSuperCheckTypeError
	"The headline case, with CPython's exact wording -- the message is the part
	that says WHICH reading failed, and Grail used to answer a NameError about
	an unbound free variable instead."

	self assert: (self at: 'cell_as_self') @env0:asString
		equals: 'TypeError: super(type, obj): obj (instance of cell) is not an '
			, 'instance or subtype of type (X).'.
%

category: 'Grail-Tests'
method: SuperForeignReceiverTestCase
testABareDunderClassReadStillAnswersTheClass
	"THE HALF THAT MUST NOT RAISE.  ``__class__'' is closed over by the
	function, so a foreign receiver changes nothing -- CPython answers X.  Only
	``super()'' checks the object.  An implementation that turned the recovered
	class into an error would pass the test above and fail this one."

	self assert: (self at: 'dunder_class_with_foreign_receiver') equals: true.
%

category: 'Grail-Tests'
method: SuperForeignReceiverTestCase
testACooperativeMixinChainStillWorks
	"GUARD.  A mixin is reached through the C3 linearization, not as a Smalltalk
	superclass, so an MRO-only supercheck rejects it.  That is exactly what cost
	four Django failures and kept this check off the compiled path; it is why
	the check consults the MRO *and* the chain."

	self assert: (self at: 'cooperative_chain') @env0:asString
		equals: 'Derived+Mixin+Base'.
%

category: 'Grail-Tests'
method: SuperForeignReceiverTestCase
testZeroArgSuperInsideAMetaclassMethodIsAccepted
	"GUARD, and the one the CPython corpus could not reach.  Grail RECORDS a
	class's metaclass rather than making the class an instance of it, so a
	metaclass method invoked with the using class as receiver has a receiver
	that is on neither the metaclass's MRO nor its chain -- while CPython's
	``isinstance(A, M)'' is plainly true.  This call exercises BOTH halves of the
	change at once -- the receiver cannot see M's cell, so the class comes off
	the stack, and the check then has to accept A against M.  Removing the
	metaclass disjunct fails four tests in this class, this one included."

	self assert: (self at: 'metaclass_super') @env0:asString equals: 'M:A'.
%
