! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DunderClassInjectedCellTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DunderClassInjectedCellTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DunderClassInjectedCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DunderClassInjectedCellTestCase
!
! ``__class__'' WHEN THE METACLASS DID NOT RETURN A CLASS.
!
! A method's ``__class__'' is a CELL, not a name.  The compiler injects
! ``__classcell__'' into the class namespace and type.__new__ fills it with the
! class it builds, so a method reads whatever ended up in THAT CELL -- which need
! not be whatever the class NAME ended up bound to.  A metaclass is entitled to
! make the two disagree:
!
!     class Meta(type):
!         def __new__(cls, name, bases, ns):
!             return None            (so ``A is None'' afterwards)
!
!     class A(metaclass=Meta):
!         @staticmethod
!         def f(): return __class__
!
!     B = type('B', (), ns)          (fills the SAME cell with B)
!     B.f() is B                     (CPython says True)
!
! ``A is None'' is correct -- the metaclass said so.  The cell is a different
! thing: it was still empty when Meta declined to build anything, and the
! three-argument type() that later consumed the namespace filled it with B.  That
! is test_super's test___class___delayed, now passing; test_super 2 -> 1.
!
! GRAIL HELD BOTH CELLS AND READ THE WRONG ONE.  ``___cell_<Name>___'' holds the
! name BINDING -- a zero-argument block closing over the Smalltalk temp, so a
! value bound after the classdef is visible -- while ``___grailClassCell___'' is
! the injected ``__classcell__''.  For an ordinary class the two agree and
! reading the cheaper one is right, which is why they were ever conflated.
!
! TWO THINGS HAD TO CHANGE, and each alone was insufficient.
!
!   * WHICH CELL IS READ.  ___dunderClassCell___ falls back to the injected cell
!     only when the name binding turned out NOT to be a class.  For an ordinary
!     class that never happens, so nothing is added to the path every
!     ``__class__'' and zero-argument ``super()'' in the corpus takes.
!
!   * WHETHER IT CAN BE REACHED.  The injected cell was recorded only in a
!     session table that ___grailDropPendingClassCell___ clears when the class
!     statement ends, and the store that normally leaves it ON the class
!     (___grailBindClassCell___) is guarded on the metaclass having answered a
!     CLASS.  When it answers None, nothing binds it -- so a method running later
!     had no route to the cell at all.  ___grailInjectClassCell___ now makes that
!     store itself, which is a no-op for every other class because
!     ___grailApplyClassCell___ makes the same store of the same cell a moment
!     later.
!
! A SEPARATE ENTRY POINT, not a change to ___classCell___.  That method also
! serves CAPTURED LOCALS (``___cell_x___'' for an enclosing def's x), whose values
! are routinely not classes -- an int, a string, None.  Recovering a "class" for
! those would be wrong rather than merely wasteful, so only the emit sites that
! mean ``__class__'' come through the new one.  That is a test below, not a
! remark.
!
! Fixture: tests/python/dunder_class_injected_cell.py (self-verifying under
! CPython 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: DunderClassInjectedCellTestCase
setUp
	probe := self ___loadProbe___: 'dunder_class_injected_cell'.
%

category: 'Grail-Private'
method: DunderClassInjectedCellTestCase
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
method: DunderClassInjectedCellTestCase
listAt: aKey
	"The fixture's entries are Python lists; compare them as Smalltalk Arrays so
	a failure prints both sides."

	| v out |
	v := probe @env1:__getitem__: aKey.
	out := OrderedCollection new.
	1 to: (v @env1:__len__) do: [:i | out add: (v @env1:__getitem__: i - 1)].
	^ out asArray
%

category: 'Grail-Tests'
method: DunderClassInjectedCellTestCase
testADelayedClassReadsTheCellNotTheNameBinding
	"THE HEADLINE.  ``A is None'' is the metaclass's answer and must stand; the
	cell is a different thing and holds B.  All three are asserted together
	because the first two are what make the third meaningful -- a run where the
	metaclass silently built a class after all would pass the third alone."

	self assert: (self listAt: 'delayed_class') equals: #( true true true ).
%

category: 'Grail-Tests'
method: DunderClassInjectedCellTestCase
testTheInjectedCellIsEmptyUntilTypeFillsIt
	"The mechanism, checked rather than assumed.  CPython distinguishes an EMPTY
	cell from one holding None -- ``cell_contents'' on an unset cell raises
	ValueError -- and the metaclass here never called type.__new__, so the cell it
	was handed is still empty when it returns.  The three-argument type() is what
	fills it."

	self assert: (self listAt: 'cell_is_empty_until_type_fills_it')
		equals: (Array with: 'ValueError' with: true).
%

category: 'Grail-Tests'
method: DunderClassInjectedCellTestCase
testAnOrdinaryClassStillAnswersItself
	"THE CONTROL, and the reason the fallback is conditional.  A metaclass that
	DOES build its class, a class with no metaclass, and an inherited method on a
	SUBCLASS instance -- the last because ``__class__'' is the class the method
	was DEFINED in, not type(self), and a fallback that reached for type(self)
	would pass the other two and fail this one."

	self assert: (self listAt: 'ordinary_class_is_unaffected')
		equals: #( true true true ).
%

category: 'Grail-Tests'
method: DunderClassInjectedCellTestCase
testACapturedLocalIsNotAClassAndMustNotBeTreatedAsOne
	"THE GUARD on keeping this a separate entry point.  A method reading an
	enclosing function's local goes through the same closure-cell lookup, and such
	a value is routinely not a class -- an int, a string, None.  Folding the
	recovery into ___classCell___ would have consulted a class cell for every one
	of them, which is wrong rather than merely wasteful, and ``None'' is the value
	that would have hidden it: indistinguishable from the failure the recovery
	exists to repair."

	| vals |
	vals := self listAt: 'captured_local'.
	self assert: vals size equals: 3.
	self assert: (vals at: 1) equals: 42.
	self assert: (vals at: 2) @env0:asString equals: 'text'.
	"Python ``None'', which is a real object here and NOT Smalltalk nil -- the
	distinction is the whole point of this test."
	self assert: (vals at: 3) @env1:__repr__ @env0:asString equals: 'None'.
%

category: 'Grail-Tests'
method: DunderClassInjectedCellTestCase
testZeroArgSuperStillReadsTheSameCell
	"``super()'' reaches the cell through its own entry point
	(___classCellForSuper___), which now shares the recovery, so a cooperative
	chain has to keep working."

	self assert: (probe @env1:__getitem__: 'zero_arg_super_still_works') @env0:asString
		equals: 'Derived+Base'.
%
