! ------------------- Superclass check
run
ArithmeticError ifNil: [self error: 'ArithmeticError is not defined. Check file ordering.'].
%

! ------- ZeroDivisionError
expectvalue /Class
doit
ArithmeticError subclass: 'ZeroDivisionError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ZeroDivisionError category: 'Grail-Exceptions'
%
set compile_env: 0

category: 'Grail-Division Guards'
classmethod: ZeroDivisionError
___isZeroDivisor___: divisor
	"Whether dividing BY ``divisor'' is division by zero, for every Python
	numeric type that can appear as one.

	Written as one test rather than repeated at each call site because the call
	sites got it wrong in three different ways, and each way was invisible from
	the others:

	A Python ``bool'' is an int -- ``False'' IS zero -- but Grail represents it
	as the Smalltalk ``false'', whose class is Boolean, NOT a Number.  Every
	guard of the form ``(other isKindOf: Number) and: [other = 0]'' therefore
	short-circuited on the FIRST clause and never looked at the value, even
	though the second clause would have answered true (``false = 0'' is true in
	GemStone).  So ``1 // False'' reached the kernel and raised ZeroDivide --
	error 2026, not a Python exception, and so uncatchable from Python at all.

	A complex zero is a zero in both parts.  ``(1+2j) / 0'' quietly produced
	``(nan-nanj)'' because nothing checked, and the naive quotient of a
	zero denominator is IEEE NaN rather than an error.

	A float zero needs no special case here -- ``0.0 = 0'' is true -- but the
	float DIVISION methods had no guard at all, which is why ``1.0 / 0''
	answered ``inf'' and ``1.0 % 0'' answered ``nan''.  IEEE says that is the
	right answer for the hardware; Python overrides it and raises.

	Deliberately answers false for anything that is not one of these, including
	an object that merely compares equal to zero: a user class defining __eq__
	is entitled to say it equals 0 without becoming a zero DIVISOR, and its
	__rtruediv__ has to keep getting the chance to run."

	(divisor isKindOf: Boolean) ifTrue: [^ divisor @env0:not].
	(divisor isKindOf: Number) ifTrue: [^ divisor @env0:= 0].
	(divisor @env0:class) == complex ifTrue: [
		"real / imag are env-1 accessors, and this method is env 0."
		^ ((divisor @env1:real) @env0:= 0) and: [(divisor @env1:imag) @env0:= 0]].
	^ false
%

! There is deliberately NO ___checkDivisor___: that both tests and raises, even
! though it would read better at the seventeen call sites.  Wrapping the raise in
! another method puts one more frame on the stack UNDERNEATH ___signal___:, and
! that frame persists for as long as the exception is being handled -- a Smalltalk
! handler block runs on top of the signalling stack.  For the classic runaway
!
! 	def f():
! 	    try: 1/0
! 	    except ZeroDivisionError: f()
!
! that is one extra frame per level of recursion, and it moved where the gem runs
! out of stack: instead of AlmostOutOfStack arriving at the division, it arrived
! inside PyLazyExceptSelector>>handles: while the handler search was deciding
! whether ``except ZeroDivisionError'' matched.  ___recursionGuard___ cannot
! convert that as cleanly, and TracebackTestCase>>testRecursionContextChain went
! from passing to erroring with ``RecursionError: maximum recursion depth
! exceeded'' escaping the test.
!
! So the call sites test with ___isZeroDivisor___: -- whose frame is popped before
! anything is signalled -- and then send ___signal___: themselves, from the
! operator's own frame, exactly as they did before this guard existed.  The message
! literal is repeated as a result.  That is the intended trade: what the bugs were
! actually about was the TEST, and this keeps that in one place.
