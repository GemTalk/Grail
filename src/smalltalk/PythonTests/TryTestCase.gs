! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TryTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TryTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TryTestCase - Tests for Python try/except/else/finally statements
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TryTestCase removeAllMethods.
TryTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests'
method: TryTestCase
testTryExceptCaught
	"Test that a matching except clause catches the exception."

	self assert: (self eval: 'try:
    raise ValueError("oops")
except ValueError:
    x = 42
x') equals: 42.
%

category: 'Grail-Tests'
method: TryTestCase
testTryExceptNotRaised
	"Test try body runs normally when no exception is raised."

	self assert: (self eval: 'try:
    x = 10
except ValueError:
    x = 99
x') equals: 10.
%

category: 'Grail-Tests'
method: TryTestCase
testTryExceptAs
	"Test except with as clause binds the exception."

	self assert: (self eval: 'try:
    raise ValueError("hello")
except ValueError as e:
    x = str(e)
x') equals: 'hello'.
%

category: 'Grail-Tests'
method: TryTestCase
testTryExceptNoMatch
	"Test that an unmatched exception propagates."

	self should: [self eval: 'try:
    raise TypeError("wrong")
except ValueError:
    x = 42'] raise: TypeError.
%

category: 'Grail-Tests'
method: TryTestCase
testTryExceptBare
	"Test bare except catches any exception."

	self assert: (self eval: 'try:
    raise TypeError("anything")
except:
    x = 1
x') equals: 1.
%

category: 'Grail-Tests'
method: TryTestCase
testTryFinally
	"Test finally clause always runs."

	self assert: (self eval: 'x = 0
try:
    x = 1
finally:
    x = x + 10
x') equals: 11.
%

category: 'Grail-Tests'
method: TryTestCase
testTryFinallyWithException
	"Test finally runs even when exception is raised."

	self assert: (self eval: 'x = 0
try:
    try:
        raise ValueError("err")
    finally:
        x = 99
except ValueError:
    pass
x') equals: 99.
%

category: 'Grail-Tests'
method: TryTestCase
testTryElse
	"Test else clause runs when no exception is raised."

	self assert: (self eval: 'try:
    x = 1
except ValueError:
    x = 2
else:
    x = 3
x') equals: 3.
%

category: 'Grail-Tests'
method: TryTestCase
testTryElseSkippedOnException
	"Test else clause is skipped when exception is raised."

	self assert: (self eval: 'try:
    raise ValueError("err")
except ValueError:
    x = 2
else:
    x = 3
x') equals: 2.
%

category: 'Grail-Tests'
method: TryTestCase
testTryMultipleExcepts
	"Test multiple except clauses."

	self assert: (self eval: 'try:
    raise TypeError("t")
except ValueError:
    x = 1
except TypeError:
    x = 2
x') equals: 2.
%

category: 'Grail-Tests'
method: TryTestCase
testExceptExpressionNotEvaluatedWhenBodySucceeds
	"Python evaluates an ``except <expr>:'' clause only when an exception
	reaches it.  Smalltalk's on:do: evaluates its on: argument when the
	handler is INSTALLED, so a direct translation ran the expression even
	on the success path -- and any unresolvable name there (a missing
	attribute, a missing submodule) then failed a try block that raised
	nothing at all.  PyLazyExceptSelector defers it."

	"An attribute that does not exist: fine, because it is never reached."
	self assert: (self eval: 'class _H: pass
_h = _H()
try:
    x = 1
except _h.missing:
    x = 2
x') equals: 1.

	"(A bare undefined NAME cannot be asserted through ``self eval:'' --
	that path resolves symbols at Smalltalk compile time, so it is a
	CompileError in the harness rather than the lazy runtime lookup a
	.py file gets.  The attribute case above covers the same ground.)"

	"And the expression must not run -- prove it via a side effect."
	self assert: (self eval: 'calls = []
def _t():
    calls.append(1)
    return ValueError
try:
    x = 1
except _t():
    x = 2
len(calls)') equals: 0.
%

category: 'Grail-Tests'
method: TryTestCase
testExceptExpressionEvaluatedWhenRaised
	"The flip side: once something IS raised the clause is evaluated, in
	handler order, stopping at the first match."

	"Evaluated exactly once when the body raises."
	self assert: (self eval: 'calls = []
def _t():
    calls.append(1)
    return ValueError
try:
    raise ValueError("v")
except _t():
    pass
len(calls)') equals: 1.

	"Earlier non-matching clauses are evaluated; later ones are not."
	self assert: (self eval: 'order = []
def _mk(exc, tag):
    def _f():
        order.append(tag)
        return exc
    return _f
try:
    raise KeyError("k")
except _mk(IndexError, "first")():
    pass
except _mk(KeyError, "second")():
    pass
except _mk(TypeError, "third")():
    pass
",".join(order)') equals: 'first,second'.
%

category: 'Grail-Tests'
method: TryTestCase
testInvalidExceptTargetOnlyRaisesWhenReached
	"``except 42:'' is a TypeError in CPython -- but only if an exception
	actually reaches the clause.  With no raise, CPython is silent."

	self assert: (self eval: 'try:
    x = 1
except 42:
    x = 2
x') equals: 1.

	self assert: (self eval: 'try:
    try:
        raise ValueError("v")
    except 42:
        msg = "no error"
except TypeError as e:
    msg = str(e)
msg') equals: 'catching classes that do not inherit from BaseException is not allowed'.
%

category: 'Grail-Tests'
method: TryTestCase
testExceptTargetNamedUnderscore
	"``except E as _'' failed to COMPILE: a bare ``_'' is not an identifier
	in GemStone Smalltalk -- it lexes as the legacy assignment operator
	(``x _ 5'' assigns) -- so the emitted temporaries read
	``| ___curPos___ _ e |'' and the whole enclosing function was rejected,
	surfacing as ``NameError: Grail could not compile this method''.  The
	parser renames it to ___unused___, as the import-alias and assignment
	sites already did.  test.test_traceback uses this shape throughout
	(``except ZeroDivisionError as _: e = _'')."

	self assert: (self eval: 'def f():
    try:
        1/0
    except ZeroDivisionError as _:
        e = _
    return type(e).__name__
f()') equals: 'ZeroDivisionError'.

	"Rebindable, like any other handler name."
	self assert: (self eval: 'def g():
    try:
        raise KeyError("k")
    except KeyError as _:
        first = str(_)
    try:
        raise IndexError("i")
    except IndexError as _:
        second = str(_)
    return first + "," + second
g()') equals: 'k,i'.
%
