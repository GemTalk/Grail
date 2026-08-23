output pushnew probe_ua_process_and_stack.out
! file scripts/probe_ua_process_and_stack.gs
!
! IS A USER-ACTION CALLBACK THE SAME GREEN THREAD, AND ONE STACK OR TWO?
!
! No Grail, no CPython.  Uses the uaExcObj action in src/c/ua_unwind_probe,
! which performs an arbitrary selector and returns its result, so Smalltalk
! can compare what it sees inside a callback with what it sees outside.
!
! Three questions, three answers, all measured:
!
!   1. SAME PROCESS.  Processor activeProcess inside the callback is the
!      IDENTICAL object (==, same oop) the caller sees.  Not a new process,
!      so there is nothing to pass in -- a user action can obtain it itself.
!
!   2. ONE CONTINUOUS STACK, with the user action IN THE MIDDLE.  A stack
!      report taken inside the callback shows the callback frame on top, then
!      `<Reenter marker>` entries for the C boundary, then
!      `System class >> userAction:...`, then the CALLER's frames below.  It
!      is not a fresh stack with the user action at the bottom.
!
!   3. THE MARKER IS VISIBLE TO A HANDLER, which matters: a handler running
!      outside the user action can ask, BEFORE attempting an unwind, whether
!      a user-action frame lies between it and its on:do: -- and therefore
!      whether `ex return:` is going to be refused with 2758.  No new GCI
!      call is needed for that.
!
! It also kills a theory: System stackLimit is 1000 and the depth inside a
! callback is 8, i.e. ~992 frames of headroom.  The user-action call costs
! four frames.  Any "we ran out of stack inside the user action" explanation
! has to answer to that number.
!
! BUILD: source ./.setenv && make -C src/c/ua_unwind_probe
! RUN:   source ./.setenv && topaz -l -I .topazini -S scripts/probe_ua_process_and_stack.gs
iferr 1 where
iferr 2 output pop
iferr 3 stack
iferr 4 continue

login
level 0

run
| out cls lib p0 d0 lim pIn dIn sIn r |
out := GsFile stdout.
cls := Object subclass: 'UaStackSubject' instVarNames: #() classVars: #()
        classInstVars: #() poolDictionaries: #() inDictionary: UserGlobals.
cls compileMethod: 'currentProcess  ^ Processor activeProcess'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'depthNow  ^ System stackDepth'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'stackHere  ^ GsProcess stackReportToLevel: 40'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'raiseIt  ^ self error: ''boom from callback'''
    dictionaries: System myUserProfile symbolList category: 'probe'.
lib := (System gemEnvironmentVariable: 'PWD') , '/src/c/ua_unwind_probe/libua_unwind_probe.dylib'.
System loadUserActionLibrary: lib.

p0 := Processor activeProcess.  d0 := System stackDepth.  lim := System stackLimit.
pIn := System userAction: #uaExcObj with: cls new with: 'currentProcess'.
dIn := System userAction: #uaExcObj with: cls new with: 'depthNow'.
sIn := System userAction: #uaExcObj with: cls new with: 'stackHere'.

out lf; nextPutAll: '=== 1. same process, or a new one? ==='; lf.
out nextPutAll: '  identical (==)      : ', (pIn == p0) printString; lf.
out nextPutAll: '  same oop            : ', (pIn asOop = p0 asOop) printString; lf.

out lf; nextPutAll: '=== stack depth: continues, or restarts? ==='; lf.
out nextPutAll: '  System stackLimit   : ', lim printString; lf.
out nextPutAll: '  depth outside       : ', d0 printString; lf.
out nextPutAll: '  depth in callback   : ', dIn printString; lf.
out nextPutAll: '  headroom in callback: ', (lim - dIn) printString; lf.

out lf; nextPutAll: '=== 2. stack report taken INSIDE the callback ==='; lf.
out nextPutAll: sIn; lf.

out lf; nextPutAll: '=== 3. can a HANDLER outside detect the live UA frame? ==='; lf.
r := [System userAction: #uaExcObj with: cls new with: 'raiseIt']
   on: Error
   do: [:ex |
      | rep live |
      rep := GsProcess stackReportToLevel: 60.
      live := rep includesString: 'Reenter marker'.
      out nextPutAll: '  UA frame live? ', live printString,
          '   (so the handler knows ex return: will be refused)'; lf.
      out nextPutAll: '  --- stack as the HANDLER sees it ---'; lf; nextPutAll: rep; lf.
      ex return: 'handler chose to report instead of unwinding'].
out nextPutAll: '  on:do: answered: ', r printString; lf.
out flush.
%
logout
exit 0
