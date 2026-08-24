output pushnew probe_handler_recursion.out
! file scripts/probe_handler_recursion.gs
!
! WHY A REFUSED UNWIND BECOMES AlmostOutOfStack.
!
! No Grail, no CPython: the uaExcObj action in src/c/ua_unwind_probe performs a
! selector that raises, while a handler installed OUTSIDE the user action tries
! to recover.  That unwind must cross the user action's C frame, and the VM
! refuses it with 2758 (ERR_EXC_RETURN_DISALLOWED).
!
! THE HYPOTHESIS UNDER TEST: the overflow is not the refusal.  It is that the
! refusal is itself an Error, so a handler written `on: Error do: [:ex | ex
! return: ...]' CATCHES ITS OWN REFUSAL and tries to return again -- once per
! turn, a few frames deeper each time, until the stack is gone.
!
! MEASURED ANSWER: YES, BUT ONLY WITH AN `ensure:' IN BETWEEN, and that one
! word is the whole finding.
!
!   * With NO ensure: between the handler and the user action (cases 1-4), the
!     handler runs EXACTLY ONCE, whatever its class or body.  The refused
!     return answers 2758, ``return from on:do: block would cross frame of C
!     primitive...'', and the VM does NOT re-enter the handler with it.
!
!   * Put ONE `ensure: [nil]' between them (case 5) and the same code loops.
!     The refusal is a DIFFERENT error -- 6011, ``execution of ensure blocks
!     would cross frame of C primitive...'' -- and this one IS delivered back
!     to the same handler, which terminates again, is refused again, a few
!     frames deeper each turn, until the stack is gone.
!
! So the recursion needs three things at once, and Grail has all three:
!   1. an exception raised inside a callback (user-action C frame still live);
!   2. an `ensure:' between the handler and that frame -- Grail has three, e.g.
!      CPythonShim>>___shimUserAction:withArgs:'s
!      `ensure: [callDepth := callDepth - 1]'; and
!   3. a handler broad enough to catch UncontinuableError, which `on: Error do:'
!      is, because UncontinuableError is an Error.
! Remove any ONE of the three and the failure is a single reported error.
!
! A NAME COLLISION FOUND ON THE WAY, worth knowing before writing any probe in
! an installed session: a bare `LookupError' in Smalltalk source does NOT
! resolve to the kernel class.  Grail's Python dictionary is ahead of Globals in
! the symbol list, so it resolves to Python's LookupError -- a BaseException,
! NOT a kind of Error -- while `Dictionary>>removeKey:' raises the KERNEL
! LookupError (ImproperOperation -> Error).  The first version of this probe
! narrowed on the wrong one and caught nothing.  Case 2 now names the kernel
! class explicitly as `Globals at: #LookupError'.
!
! Each case counts how many times its handler runs, and each has an escape
! hatch: past 20 turns it stops returning and does `ex pass' instead, which
! re-signals OUTWARD without unwinding -- so a confirmed loop is reported
! rather than taking the session down.  (Letting it run to the real overflow
! would also have a broad on:do: swallow the VM's AlmostOutOfStack warning,
! and the next overflow after a swallowed warning is a fatal Red Zone crash.)
!
! Each case runs in its own topaz block, and the counts live in SessionTemps so
! a block that dies still reports its number from the block after it.
!
! BUILD: source ./.setenv && make -C src/c/ua_unwind_probe
! RUN:   source ./.setenv && topaz -lq -T 400000 -I .topazini -S scripts/probe_handler_recursion.gs
iferr 1 where
iferr 2 output pop
iferr 3 stack
iferr 4 continue

login
level 0

! --------------------------------------------------------------------------
run
"Fixtures.  raiseLookup raises a LookupError, which is a KIND of Error -- so a
 broad handler matches it, and so does the UncontinuableError the refusal
 produces.  That double match is the whole point."
| cls |
cls := Object subclass: 'UaRecurSubject'
  instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: UserGlobals.
cls compileMethod: 'raiseLookup  ^ Dictionary new removeKey: #nope'
    dictionaries: System myUserProfile symbolList category: 'probe'.
SessionTemps current at: #RecurSubj put: cls new.
SessionTemps current at: #RecurLog put: Dictionary new.
%

! --------------------------------------------------------------------------
run
| out lib |
out := GsFile stdout.
lib := (System gemEnvironmentVariable: 'PWD') , '/src/c/ua_unwind_probe/libua_unwind_probe.dylib'.
System loadUserActionLibrary: lib.
out lf; nextPutAll: '=== fixtures ready ==='; lf;
  nextPutAll: '  LookupError inheritsFrom Error         : ',
              (LookupError inheritsFrom: Error) printString; lf;
  nextPutAll: '  UncontinuableError inheritsFrom Error  : ',
              (UncontinuableError inheritsFrom: Error) printString,
              '   <-- so on: Error do: matches the REFUSAL too'; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"CONTROL: the same handler shape with NO user action.  The unwind is legal, so
 the handler runs ONCE and recovers.  Whatever the cases below show, it is not
 a property of on: Error do: [:ex | ex return: ...] by itself."
| out n r |
out := GsFile stdout.
n := 0.
r := [ (SessionTemps current at: #RecurSubj) raiseLookup ]
      on: Error
      do: [:ex |
        n := n + 1.
        n > 20 ifTrue: [ex pass].
        ex return: 'recovered'].
(SessionTemps current at: #RecurLog) at: #control put: n.
out lf; nextPutAll: '=== CONTROL: no user action, unwind is legal ==='; lf;
  nextPutAll: '  handler entered : ', n printString; lf;
  nextPutAll: '  answered        : ', r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"CASE 1: BROAD handler across a user action.  on: Error do: matches both the
 LookupError the callback raised AND the UncontinuableError its own refused
 return produces."
| out n r |
out := GsFile stdout.
out lf; nextPutAll: '=== CASE 1: on: Error do: [ex return:] across a UA ==='; lf.
n := 0.
r := [ System userAction: #uaExcObj
              with: (SessionTemps current at: #RecurSubj) with: 'raiseLookup' ]
      on: Error
      do: [:ex |
        n := n + 1.
        n <= 3 ifTrue: [
          GsFile stdout nextPutAll: '  turn ', n printString, ': ',
            ex class name, ' (', ex number printString, ')'; lf; flush].
        n > 20 ifTrue: [
          GsFile stdout nextPutAll: '  ... still going at turn 21: LOOP CONFIRMED,'
            , ' escaping with ex pass'; lf; flush.
          ex pass].
        ex return: 'recovered'].
(SessionTemps current at: #RecurLog) at: #broad put: n.
out nextPutAll: '  handler entered : ', n printString; lf;
  nextPutAll: '  answered        : ', r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"CASE 2: the same case with a handler too NARROW to match its own refusal.
 The KERNEL LookupError (Globals at: #LookupError -- see the header on the name
 collision) still catches what the callback raised, but an UncontinuableError is
 not a LookupError, so the refusal goes OUTWARD.  Case 1 already showed the
 broad handler does not loop either, so this is now a control rather than the
 discriminator it was meant to be: it shows where the refusal SURFACES."
| out n r |
out := GsFile stdout.
out lf; nextPutAll: '=== CASE 2: narrow handler (kernel LookupError) across a UA ==='; lf.
n := 0.
r := [[ System userAction: #uaExcObj
               with: (SessionTemps current at: #RecurSubj) with: 'raiseLookup' ]
       on: (Globals at: #'LookupError')
       do: [:ex |
         n := n + 1.
         n <= 3 ifTrue: [
           GsFile stdout nextPutAll: '  turn ', n printString, ': ',
             ex class name, ' (', ex number printString, ')'; lf; flush].
         n > 20 ifTrue: [ex pass].
         ex return: 'recovered']]
     on: UncontinuableError
     do: [:ex | 'refusal escaped to the OUTER handler: ', ex class name,
                ' (', ex number printString, ')'].
(SessionTemps current at: #RecurLog) at: #narrow put: n.
out nextPutAll: '  handler entered : ', n printString; lf;
  nextPutAll: '  answered        : ', r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"CASE 3: broad handler whose BODY RUNS REAL CODE -- ex class name, ex number,
 ex messageText -- which is what every handler in Grail actually does, and what
 a trivial `ex return: #x' does not.  Reading an exception can run arbitrary
 Smalltalk (and, for a Grail Python exception, Python), all of it on top of the
 live user-action frame."
| out n r |
out := GsFile stdout.
out lf; nextPutAll: '=== CASE 3: broad handler, body reads the exception ==='; lf.
n := 0.
r := [ System userAction: #uaExcObj
              with: (SessionTemps current at: #RecurSubj) with: 'raiseLookup' ]
      on: Error
      do: [:ex |
        | described |
        n := n + 1.
        described := ex class name , ' (' , ex number printString , ') -- ' ,
                     (ex messageText ifNil: ['<nil>']).
        n <= 3 ifTrue: [
          GsFile stdout nextPutAll: '  turn ' , n printString , ': ' , described; lf; flush].
        n > 20 ifTrue: [ex pass].
        ex return: 'recovered'].
(SessionTemps current at: #RecurLog) at: #describing put: n.
out nextPutAll: '  handler entered : ' , n printString; lf;
  nextPutAll: '  answered        : ' , r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"CASE 4: the exact handler shape the Grail probes use --
 on: Error, (Python at: #BaseException) do: [...] -- an ExceptionSet spanning
 BOTH sides of the Error/BaseException split.  This is the harness that reported
 AlmostOutOfStack through the shim, so if the width of the handler is what does
 it, it shows up here."
| out n r baseExc |
out := GsFile stdout.
out lf; nextPutAll: '=== CASE 4: ExceptionSet Error, BaseException ==='; lf.
baseExc := Python at: #'BaseException' otherwise: nil.
baseExc isNil
  ifTrue: [out nextPutAll: '  SKIPPED: no Grail BaseException in this session'; lf]
  ifFalse: [
    n := 0.
    r := [ System userAction: #uaExcObj
                  with: (SessionTemps current at: #RecurSubj) with: 'raiseLookup' ]
          on: Error, baseExc
          do: [:ex |
            n := n + 1.
            n <= 3 ifTrue: [
              GsFile stdout nextPutAll: '  turn ' , n printString , ': ' , ex class name; lf; flush].
            n > 20 ifTrue: [ex pass].
            ex return: 'recovered'].
    (SessionTemps current at: #RecurLog) at: #excSet put: n.
    out nextPutAll: '  handler entered : ' , n printString; lf;
      nextPutAll: '  answered        : ' , r printString; lf].
out flush.
%

! --------------------------------------------------------------------------
run
"CASE 5: THE DISCRIMINATOR.  Identical to case 1 except for one `ensure: [nil]'
 between the handler and the user action -- the shape
 CPythonShim>>___shimUserAction:withArgs: has, where the caller's handler is
 outside its `ensure: [callDepth := callDepth - 1]'.

 Case 1 answered ONE 2758.  This answers a repeating 6011 until the cap, and
 without the cap it runs to AlmostOutOfStack -- which is where the shim's
 `RuntimeError: AlmostOutOfStack ... overflow during execution' comes from."
| out n turns r |
out := GsFile stdout.
out lf; nextPutAll: '=== CASE 5: the same, with ONE ensure: in between ==='; lf.
n := 0.
turns := OrderedCollection new.
r := [[ System userAction: #uaExcObj
               with: (SessionTemps current at: #RecurSubj) with: 'raiseLookup' ]
        ensure: [ nil ]]
      on: Error
      do: [:ex |
        n := n + 1.
        turns size < 5 ifTrue: [
          turns add: ex class name , '(' , ex number printString , ')'].
        n > 20 ifTrue: [
          GsFile stdout nextPutAll: '  ... still going at turn 21: LOOP CONFIRMED,'
            , ' escaping with ex pass'; lf; flush.
          ex pass].
        ex return: 'recovered'].
(SessionTemps current at: #RecurLog) at: #withEnsure put: n.
out nextPutAll: '  handler entered : ' , n printString; lf;
  nextPutAll: '  first turns     : ' , turns printString; lf;
  nextPutAll: '  answered        : ' , r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
| out log |
out := GsFile stdout.
log := SessionTemps current at: #RecurLog.
out lf; nextPutAll: '=== counts (survive a block that died) ==='; lf.
#(#control #broad #narrow #describing #excSet #withEnsure) do: [:k |
  out nextPutAll: '  ', k asString, ': ',
    (log at: k ifAbsent: ['<block did not finish>']) printString; lf].
out flush.
%

logout
exit 0
