output pushnew probe_python_finally_boundary.out
! file scripts/probe_python_finally_boundary.gs
!
! WHO CAN STILL TRIGGER THE 6011 LOOP, now that Grail's own `ensure:'s are gone?
!
! scripts/probe_handler_recursion.gs established the mechanism with no Grail in
! sight: a refused unwind across a user-action frame is reported ONCE as 2758,
! unless an `ensure:' sits between the handler and that frame -- and then the
! refusal becomes a repeating 6011 that re-enters the handler until the stack is
! gone.  Three ingredients, and removing any one is enough:
!
!   1. an exception raised in a callback (user-action C frame still live);
!   2. an `ensure:' between the handler and that frame;
!   3. a handler that TERMINATES and is broad enough to match UncontinuableError.
!
! Grail supplied (2) itself, three times, as `ensure: [callDepth := callDepth -
! 1]'.  Those are gone -- the sweep guard now repairs a leaked counter instead
! (CPythonShim>>___betweenShimCalls).  This script asks what is LEFT, and the
! answer splits cleanly by WHO WROTE THE HANDLER:
!
!   * PYTHON code is safe.  A Python `except' compiles to a handler on Grail's
!     BaseException-side classes, which cannot match the kernel exception the
!     callback raised NOR the UncontinuableError of a refusal -- so (3) is
!     absent.  Cases 1 and 2 answer a catchable LookupError, `finally' or not.
!
!   * A Python `finally' AROUND a call, with a broad TERMINATING SMALLTALK
!     handler outside it, still loops -- case 3.  `finally' compiles to
!     `ensure:' (PythonAst/TryAst.gs), so user code re-supplies ingredient (2)
!     and Grail cannot take it away.  That case is ask 1 of
!     docs/GemStone_Feature_Requests.md 1.5 and nothing else.
!
! Reaching the boundary from PYTHON at all needs _shimtest.test_silent_raise,
! which is why _shimtest class>>callTestSilentRaise:key: exists: every other
! route into that module raises a PYTHON exception, which travels by the shim's
! own error indicator and never exercises the user-action boundary.
!
! Handlers here are capped and escape with `ex pass' past the cap -- `pass' does
! not unwind, so it cannot be refused -- rather than running to a real overflow.
! A broad on:do: that ran on would SWALLOW the VM's AlmostOutOfStack warning,
! and the next overflow after a swallowed warning is a fatal Red Zone crash.
!
! RUN: source ./.setenv && topaz -lq -T 400000 -I .topazini -S scripts/probe_python_finally_boundary.gs
iferr 1 where
iferr 2 output pop
iferr 3 stack
iferr 4 continue

login
level 0

! --------------------------------------------------------------------------
run
| evalPython |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
SessionTemps current at: #'PfEv' put: evalPython.
CPythonShim current loadModule: '_shimtest'.
GsFile stdout lf; nextPutAll: '--- fixtures ready ---'; lf; flush.
%

! --------------------------------------------------------------------------
run
"1. Plain Python try/except.  The handler is Python's, so it never matches a
 kernel Smalltalk exception -- nothing runs on the live frame, the default
 action lets GciPerform trap it, and the boundary reports the real class."
| r |
r := (SessionTemps current at: #'PfEv') value: 'import _shimtest
d = {}
try:
    _shimtest.test_silent_raise(d, "missing")
    r = "NO ERROR -- the exception was lost"
except BaseException as e:
    r = type(e).__name__ + ": " + str(e)
r'.
GsFile stdout
  nextPutAll: '=== 1. Python try/except ==='; lf;
  nextPutAll: '    want: a catchable LookupError'; lf;
  nextPutAll: '    got : ', r printString; lf; flush.
%

! --------------------------------------------------------------------------
run
"2. Python try/FINALLY with the except outside it.  finally compiles to
 ensure:, so ingredient (2) is present -- and it still does not loop, because
 the only handler is Python's and ingredient (3) is absent."
| r |
r := (SessionTemps current at: #'PfEv') value: 'import _shimtest
d = {}
try:
    try:
        _shimtest.test_silent_raise(d, "missing")
        r = "NO ERROR -- the exception was lost"
    finally:
        pass
except BaseException as e:
    r = type(e).__name__ + ": " + str(e)
r'.
GsFile stdout
  nextPutAll: '=== 2. Python try/finally, Python except outside ==='; lf;
  nextPutAll: '    want: the same catchable LookupError'; lf;
  nextPutAll: '    got : ', r printString; lf; flush.
%

! --------------------------------------------------------------------------
run
"3. A broad TERMINATING SMALLTALK handler outside a Python `finally'.  All
 three ingredients, and the ensure: is the one Python emitted, which Grail
 cannot remove.  RUNS LAST: this is the case that can end the session."
| out n turns r |
out := GsFile stdout.
out nextPutAll: '=== 3. Python finally + broad terminating Smalltalk handler ==='; lf; flush.
n := 0.
turns := OrderedCollection new.
r := [ (SessionTemps current at: #'PfEv') value: 'import _shimtest
d = {}
try:
    _shimtest.test_silent_raise(d, "missing")
finally:
    pass
"reached the end"' ]
  on: Error, (Python at: #'BaseException')
  do: [:ex |
    n := n + 1.
    turns size < 5 ifTrue: [
      turns add: ex class name , '(' , ex number printString , ')'].
    n > 20 ifTrue: [
      out nextPutAll: '    turn 21: LOOP CONFIRMED, escaping with ex pass'; lf; flush.
      ex pass].
    'RAISED ' , ex class name].
out nextPutAll: '    handler entered : ', n printString; lf;
  nextPutAll: '    first turns     : ', turns printString; lf;
  nextPutAll: '    answered        : ', r printString; lf; flush.
%

logout
exit 0
