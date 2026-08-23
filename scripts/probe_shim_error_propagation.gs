output pushnew probe_shim_error_propagation.out
! file scripts/probe_shim_error_propagation.gs
!
! What does a Smalltalk caller OBSERVE when a Python or Smalltalk exception
! is raised inside a callback that a C user action made back into Smalltalk?
!
! Each case drives one shape in src/c/shim/cpython.cc and reports what came
! back.  The interesting answer is never "did it work" but WHICH of these
! happened -- they are four different bugs and they need different fixes:
!
!   VALUE <x>     no exception: the caller got an ordinary answer, so the
!                 exception was LOST.  A nil here is the dangerous row of
!                 docs/GemStone_Feature_Requests.md 1.5 -- indistinguishable
!                 from a successful empty answer.
!   RAISED <cls>  reached the caller.  Compare <cls> to what was raised: a
!                 different class means the class was LOST even though the
!                 failure was reported.
!   2758          UncontinuableError: the unwind was refused at the user
!                 action frame and the recoverable exception was replaced by
!                 a non-recoverable one.
!   fatal         the case takes the session down (recursion to
!                 AlmostOutOfStack).  Each case runs in its OWN topaz block
!                 so one fatality does not hide the cases after it.
!
! READ THIS BEFORE TRUSTING A ROW.  These cases raise SMALLTALK exceptions in
! the callback (LookupError from `removeKey:`, plus the shim's own PyErr_
! machinery).  That is NOT the shape Grail's own code mostly takes, and the
! difference decides the result:
!
!   A GRAIL PYTHON exception raised in a callback crosses the user-action
!   frame CORRECTLY, and arrives with its class and messageText intact at
!   BOTH a Python `except` and a Smalltalk `on:do:` outside.  Measured with
!   heapq.heappush over a class whose __lt__ raises ValueError: both handlers
!   answer "ValueError: angry-lt", and check_gci_error is never even reached
!   (no SHIM-DIAG line) -- the exception simply propagates.
!
!   A PLAIN SMALLTALK exception raised in a callback does not.  The perform
!   traps it, and what the C side then sees depends on the enclosing handler
!   -- scripts/probe_ua_exception_obj.gs pins that down without Grail.
!
! So a bad row below is a real defect only for the Smalltalk-exception case.
! Do NOT read row D as "Python exceptions are laundered into RuntimeError in
! normal use": they are not.
!
! Run: topaz -lq -T 400000 -I .topazini -S scripts/probe_shim_error_propagation.gs
iferr 1 where
iferr 2 output pop
iferr 3 stack
iferr 4 continue

login
level 0

! --------------------------------------------------------------------------
run
"Shared fixtures, committed to SessionTemps so each block below can see them
 without re-deriving them (a block that dies must not take the rest with it)."
| evalPython shim |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
shim := CPythonShim current.
shim loadModule: '_shimtest'.
SessionTemps current at: #ProbeShim put: shim.
SessionTemps current at: #ProbeEmptyDict put: (evalPython value: '{}').
SessionTemps current at: #ProbeBoom put: (evalPython value: 'class Boom:
    def __index__(self):
        raise ValueError(''boom from __index__'')

Boom()').
SessionTemps current at: #ProbeCollide put: (evalPython value: 'class Colliding:
    def __hash__(self):
        return 1234
    def __eq__(self, other):
        raise ValueError(''angry-eq'')

d = {}
dict.__setitem__(d, Colliding(), 1)
[d, Colliding()]').
SessionTemps current at: #ProbeAngry put: (evalPython value: 'class Angry:
    def __getitem__(self, k):
        raise KeyError(''angry'')

Angry()').
"One probe runner, also in SessionTemps.  Catches Error and Grail's
 BaseException (siblings under Exception) but NOT Exception itself: a blanket
 handler would swallow the AlmostOutOfStack notification the VM uses to warn
 about stack depth, and the next overflow is a fatal Red Zone crash."
SessionTemps current at: #ProbeRun put: [:label :expected :blk |
  | r |
  r := [ 'VALUE ', blk value printString ]
        on: Error, (Python at: #BaseException)
        do: [:ex | 'RAISED ', ex class name, ' (', ex number printString, ') -- ',
                   (ex messageText ifNil: ['<nil messageText>'])].
  GsFile stdout
    nextPutAll: '  '; nextPutAll: label; cr;
    nextPutAll: '      want: '; nextPutAll: expected; cr;
    nextPutAll: '      got : '; nextPutAll: r; cr; cr].
GsFile stdout nextPutAll: '--- fixtures ready ---'; cr.
%

! --------------------------------------------------------------------------
run
GsFile stdout cr; nextPutAll: '=== controls: paths that must keep working ==='; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_long64(21)'
  value: 'VALUE 42'
  value: [(SessionTemps current at: #ProbeShim)
            callModule: '_shimtest' method: 'test_long64' with: 21].
%

! --------------------------------------------------------------------------
run
GsFile stdout cr;
  nextPutAll: '=== D. LAUNDERED: a CHECKED perform (check_gci_error) ==='; cr;
  nextPutAll: '    __getitem__ raises KeyError.  check_gci_error consumes the GciErr'; cr;
  nextPutAll: '    and rewrites it as a Python RuntimeError, discarding exceptionObj,'; cr;
  nextPutAll: '    so the class is gone -- but consuming it is ALSO why this path does'; cr;
  nextPutAll: '    not hit 2758: the boundary signals fresh rather than unwinding.'; cr; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_obj_getitem(Angry(), 1)'
  value: 'RAISED KeyError'
  value: [(SessionTemps current at: #ProbeShim)
            callModule: '_shimtest' method: 'test_obj_getitem'
            with: (SessionTemps current at: #ProbeAngry) with: 1].
%

! --------------------------------------------------------------------------
run
GsFile stdout cr;
  nextPutAll: '=== C. CASCADE: failing perform followed by a FAILING call ==='; cr;
  nextPutAll: '    oopToLongWithIndex sends __index__ (raises ValueError), does not'; cr;
  nextPutAll: '    check, then calls GciOopToI64(nil) -- which fails and REPLACES the'; cr;
  nextPutAll: '    pending error.  The caller is told about the victim, not the cause.'; cr; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_long64(Boom())'
  value: 'RAISED ValueError'
  value: [(SessionTemps current at: #ProbeShim)
            callModule: '_shimtest' method: 'test_long64'
            with: (SessionTemps current at: #ProbeBoom)].
%

! --------------------------------------------------------------------------
run
GsFile stdout cr;
  nextPutAll: '=== B. ERASED: failing perform followed by a SUCCESSFUL call ==='; cr;
  nextPutAll: '    test_erased_raise: PyDict_DelItem raises LookupError (result'; cr;
  nextPutAll: '    discarded), then PyLong_FromSsize_t(42) succeeds.  If a successful'; cr;
  nextPutAll: '    GCI call resets the error state, NO check at the boundary can see'; cr;
  nextPutAll: '    the failure -- only stopping at the FIRST error preserves it.'; cr; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_erased_raise({}, ''missing'')'
  value: 'RAISED LookupError'
  value: [(SessionTemps current at: #ProbeShim)
            callModule: '_shimtest' method: 'test_erased_raise'
            with: (SessionTemps current at: #ProbeEmptyDict) with: 'missing'].
%

! --------------------------------------------------------------------------
run
GsFile stdout cr;
  nextPutAll: '=== E. UNCHECKED: a perform with NO check at all ==='; cr;
  nextPutAll: '    test_unchecked_raise uses PyDict_GetItem, which CPython specifies'; cr;
  nextPutAll: '    as error-suppressing so the shim deliberately does not check it --'; cr;
  nextPutAll: '    the same shape as the 44 performs in cpython.cc that are not'; cr;
  nextPutAll: '    instrumented yet.  The key COLLIDES with an entry, so the lookup'; cr;
  nextPutAll: '    must call __eq__, which raises ValueError.  Nothing consumes it, so'; cr;
  nextPutAll: '    the failing perform answers nil and the NEXT GCI conversion fails on'; cr;
  nextPutAll: '    that nil and REPLACES the error: the caller is told about the victim'; cr;
  nextPutAll: '    (ArgumentError 2163) and never hears about __eq__.  This is why'; cr;
  nextPutAll: '    checking at the FIRST error is what matters, not checking harder'; cr;
  nextPutAll: '    at the boundary.'; cr; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_unchecked_raise(d, Colliding())'
  value: 'RAISED ValueError'
  value: [ | pair |
    pair := SessionTemps current at: #ProbeCollide.
    (SessionTemps current at: #ProbeShim)
      callModule: '_shimtest' method: 'test_unchecked_raise'
      with: (pair at: 1) with: (pair at: 2)].
%

! --------------------------------------------------------------------------
run
GsFile stdout cr;
  nextPutAll: '=== A. UNWIND REFUSED: failing perform is the LAST GCI call ==='; cr;
  nextPutAll: '    test_silent_raise: PyDict_DelItem raises LookupError and nothing'; cr;
  nextPutAll: '    afterwards touches GCI, so the error IS still pending at the'; cr;
  nextPutAll: '    boundary.  Re-raising the original struct there preserves the class'; cr;
  nextPutAll: '    but is a cross-frame unwind, which the VM refuses (2758); through'; cr;
  nextPutAll: '    ___shimUserAction: that refusal is re-signalled and recurses.'; cr;
  nextPutAll: '    RUNS LAST: this case can take the session down.'; cr; cr.
(SessionTemps current at: #ProbeRun)
  value: 'test_silent_raise({}, ''missing'')'
  value: 'RAISED LookupError'
  value: [(SessionTemps current at: #ProbeShim)
            callModule: '_shimtest' method: 'test_silent_raise'
            with: (SessionTemps current at: #ProbeEmptyDict) with: 'missing'].
%

logout
exit 0
