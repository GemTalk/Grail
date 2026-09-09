! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyDefAsPlainFunctionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDefAsPlainFunctionTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDefAsPlainFunctionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDefAsPlainFunctionTestCase
!
! A ``def'' IN A CLASS BODY IS A PLAIN FUNCTION, AND ITS FIRST ARGUMENT IS NOT
! TYPE-CHECKED.
!
! CPython's class body is an ordinary namespace, so ``def f(x)'' in one is a
! function like any other and ``f(2)'' binds x = 2.  Grail compiles it to a
! Smalltalk METHOD whose first Python parameter IS the receiver, and a plain call
! goes through UnboundMethod, which substitutes the first argument as that
! receiver and runs the method non-virtually.  Same semantics, different
! mechanism -- and the mechanism leaked in two places, both of them reachable
! only when that argument was a GemStone ``special'': a SmallInteger, a Boolean,
! a SmallDouble, a Character, nil.
!
! 1. ``performMethod:'' REFUSES A SPECIAL RECEIVER for a method compiled against
!    a non-special class -- GemStone error 2156, whose text says exactly what to
!    do about it: ``Self is not a ram oop, METHOD NEEDS RECOMPILE''.  Measured:
!    a method compiled in an ordinary class dies on ``3 performMethod:'' the
!    moment its body sends anything at all to self (``self * 10'' survives --
!    arithmetic on a special is a special-send bytecode -- while ``self class''
!    does not), and the same SOURCE compiled against SmallInteger runs.  So the
!    fix is the recompile the error asks for, cached per (method, receiver
!    class), and ``_compileMethod:symbolList:environmentId:'' ANSWERS the method
!    without installing it, so no class's method dictionary changes -- which
!    matters on a stone several users share.
!
!    It is GATED, because CPython has two answers here and only one of them is
!    this one.  A method of a BUILTIN type is a descriptor that DOES check its
!    first argument, so ``bytes.hex(1)'' raises ``descriptor 'hex' for 'bytes'
!    objects doesn't apply to a 'int' object'' and must keep doing so.  The gate
!    is ``___pyDefinedClass___'' on the class that IMPLEMENTS the resolved
!    selector -- the marker ClassDefAst emits into every class it compiles and
!    into nothing else.
!
! 2. A COMPREHENSION WHOSE TARGET SHADOWS THAT FIRST PARAMETER did not compile
!    at all.  PEP 709 inlines the comprehension into the enclosing scope, so the
!    target is an ordinary local -- but for the receiver parameter ``ordinary
!    local'' resolved to Smalltalk ``self'', and the generated store read
!    ``self := ...'', which is not Smalltalk.  The whole method failed to
!    compile, ___compileMethod:category: installed its NameError stub in place
!    of the body, and calling the def answered ``Grail could not compile this
!    method (codegen gap)'' -- a message about a codegen gap standing in for a
!    codegen bug.  NameAst's receiver branch now stands down for a name an
!    enclosing comprehension binds, which is the same shape as its existing
!    stand-down for a name a nested function binds.
!
! Together they are test_listcomps' test_inner_cell_shadows_outer_no_store in
! class scope, which needed both: the def could not compile, and the call could
! not have run it if it had.
!
! The fixture is tests/python/class_body_def_as_plain_function.py, which
! self-verifies under CPython.
! ===============================================================================

removeallmethods ClassBodyDefAsPlainFunctionTestCase
removeallclassmethods ClassBodyDefAsPlainFunctionTestCase

set compile_env: 0

category: 'Grail-Running'
method: ClassBodyDefAsPlainFunctionTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_def_as_plain_function' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/class_body_def_as_plain_function.py')
		name: 'class_body_def_as_plain_function'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: ClassBodyDefAsPlainFunctionTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: ClassBodyDefAsPlainFunctionTestCase
at: aKey item: anIndex
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testAClassBodyCallsItsOwnDefWithAnInt
	"The shape the whole change is about.  ``helper(3)'' in the class body used
	to raise the descriptor TypeError, because 3 is a special oop and
	performMethod: would not take it as a receiver."

	self assert: (self at: 'in_body' item: 0) equals: 30.
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testTheOtherSpecialsWorkToo
	"SmallInteger is not the only special: a Boolean and a SmallDouble reach the
	same primitive the same way, and True is an int in Python (10, not an
	error)."

	self assert: (self at: 'in_body' item: 1) equals: 10.
	self assert: (self at: 'in_body' item: 2) equals: 15.0.
	"``None'' and not ``nil'': Python's None is Grail's None singleton, and
	asserting nil here is what made this test fail on its first run."
	self assert: (self at: 'outside_none' item: 0) equals: None.
	self assert: (self at: 'outside_char' item: 0) equals: 'c'.
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testTheSameCallFromOutsideTheClass
	"``Cls.method(2, ...)'' is the same substitution reached from outside the
	body, over every fixed arity Grail resolves a selector for: nothing, one,
	two and three arguments after self."

	self assert: (self at: 'outside' item: 0) equals: 6.
	self assert: ((self at: 'outside' item: 1) @env1:__getitem__: 1) equals: 'x'.
	self assert: ((self at: 'outside' item: 2) @env1:__getitem__: 2) equals: 'y'.
	self assert: ((self at: 'outside' item: 3) @env1:__getitem__: 3) equals: 'z'.
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testACompTargetShadowingTheReceiverParameter
	"The second half, and the one that produced no answer at all rather than a
	wrong one: the def's own body would not compile, so calling it raised
	``Grail could not compile this method (codegen gap)''.

	Both readings are asserted together because the fix has to keep them apart.
	CPython restores the parameter after an inlined comprehension, so the
	trailing read answers the ARGUMENT (2) while the lambdas closing over the
	comprehension's target answer its last value (1) -- and the first clause's
	iterable, ``range(x)'', is evaluated in the enclosing scope, which is what
	makes the loop run twice at all."

	self assert: (self at: 'shadowing_comprehension' item: 1) equals: 2.
	self
		assert: ((self at: 'shadowing_comprehension' item: 0) @env1:__getitem__: 0)
		equals: 1.
	self
		assert: ((self at: 'shadowing_comprehension' item: 0) @env1:__getitem__: 1)
		equals: 1.
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testABuiltinTypesMethodStillRefuses
	"The gate, and the reason the recompile is not applied to every special
	receiver.  ``bytes.hex(1)'' is a DESCRIPTOR call in CPython and raises
	TypeError; making it run would trade one divergence for another, in a place
	test_bytes checks."

	| refusals |
	refusals := self at: 'builtin_descriptor_still_refuses'.
	1 to: 3 do: [:i |
		self assert: (refusals @env1:__getitem__: i - 1) equals: 'TypeError'].
%

category: 'Grail-Tests'
method: ClassBodyDefAsPlainFunctionTestCase
testTheBodysOwnErrorsAreStillItsOwn
	"A substituted receiver the BODY cannot use must raise the body's error, not
	the dispatcher's: ``self + 1'' on None is a TypeError about ``+'', which
	only happens if the method actually ran."

	self assert: (self at: 'body_errors_are_the_body_s') equals: 'TypeError'.
%

! ------------------- Known divergences

category: 'Grail-Known divergences'
method: ClassBodyDefAsPlainFunctionTestCase
testOverThreeArgumentsStillRefuses
	"NOT FIXED, and recorded so the boundary is explicit rather than discovered.

	Above three arguments after self -- or with keywords --
	_resolveMethodNargs:kwOk:from: builds no fixed-arity selector, so the packed
	``_name:kw:'' wrapper is what resolves.  That wrapper does not hold the
	body: it checks the signature and re-dispatches with ``^ self name: a _: b
	...'', an ordinary VIRTUAL send, which for a substituted special receiver
	finds nothing in SmallInteger.  Recompiling the wrapper cannot fix that --
	the whole chain would have to be recompiled -- so this arity keeps the
	TypeError it had before.

	CPython answers (1, 2, 3, 4, 5)."

	self assert: (self at: 'wide_signature') equals: 'TypeError'.
%

