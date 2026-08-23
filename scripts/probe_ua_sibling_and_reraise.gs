output pushnew probe_ua_sibling_and_reraise.out
! file scripts/probe_ua_sibling_and_reraise.gs
!
! TWO REVIEW QUESTIONS, MEASURED, with no Grail and no CPython.
!
!   1. _gsStack HAS A PREREQUISITE.  It is only POPULATED when the per-session
!      GEM configuration #GemExceptionSignalCapturesStack was armed BEFORE the
!      raise.  A bare session does not have it, so the `_gsReturnToC' marker
!      recipe in docs/GemStone_Feature_Requests.md 1.5 must say so; this script
!      measures both states rather than asserting it.
!
!   2. DOES A SIBLING OF Error ESCAPE AN INTERVENING `on: Error do:'?  Grail's
!      ___shimUserAction: wraps every shim call in one, which launders whatever
!      the callback raised.  An exception that is NOT a kind of Error cannot be
!      matched by it -- and the question is whether that survives the
!      user-action boundary in each of the two directions out of a user action:
!
!        a. the callback's exception PROPAGATES, because a matching handler
!           exists outside, so the VM runs that handler on top of the C frame,
!           which is still LIVE; or
!        b. C traps it and re-raises with GciRaiseException, which UNWINDS the
!           C frame first (action uaReraiseExcObj, added for this).
!
!      Route (b) decides the design: if GciRaiseException signals the ORIGINAL
!      object (err.exceptionObj) rather than a generic error of err.number, then
!      class-based dispatch works across the boundary AND `ex return:' is legal,
!      because no user-action frame is left in between.
!
! Each case runs in its OWN topaz block: route (a) ends in 2758 by
! construction, and must not hide the cases after it.
!
! BUILD: source ./.setenv && make -C src/c/ua_unwind_probe
! RUN:   source ./.setenv && topaz -lq -I .topazini -S scripts/probe_ua_sibling_and_reraise.gs
iferr 1 where
iferr 2 output pop
iferr 3 stack
iferr 4 continue

login
level 0

! --------------------------------------------------------------------------
run
"Fixtures, part 1: the classes.  UaSibling is a direct subclass of Exception --
 a SIBLING of Error, exactly where Grail's Python BaseException already sits.
 It needs a block of its own: a reference to the new global in the SAME block
 would not resolve at compile time."
| cls |
Exception subclass: 'UaSibling'
  instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: UserGlobals.
cls := Object subclass: 'UaSandwichSubject'
  instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: UserGlobals.
cls compileMethod: 'raiseError  ^ self error: ''plain Error from callback'''
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'raiseSibling  ^ UaSibling new signal: ''sibling of Error from callback'''
    dictionaries: System myUserProfile symbolList category: 'probe'.
SessionTemps current at: #UaSubj put: cls new.
%

! --------------------------------------------------------------------------
run
"Fixtures, part 2: load the user-action library, report the placement."
| out lib |
out := GsFile stdout.
lib := (System gemEnvironmentVariable: 'PWD') , '/src/c/ua_unwind_probe/libua_unwind_probe.dylib'.
System loadUserActionLibrary: lib.
out lf; nextPutAll: '=== fixtures ready ==='; lf;
  nextPutAll: '  UaSibling superclass        : ', UaSibling superclass name; lf;
  nextPutAll: '  UaSibling inheritsFrom Error: ', (UaSibling inheritsFrom: Error) printString,
              '   <-- an on: Error do: cannot match it'; lf;
  nextPutAll: '  Error superclass            : ', Error superclass name; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"1. THE _gsStack PREREQUISITE, with no user action in sight."
| out flag look |
out := GsFile stdout.
flag := System gemConfigurationAt: #'GemExceptionSignalCapturesStack'.
look := [ [Error signal: 'for the capture'] on: Error do: [:ex | ex _gsStack] ].
out lf; nextPutAll: '=== 1. is _gsStack populated? ==='; lf.
out nextPutAll: '  flag as found at login    : ', flag printString; lf.
out nextPutAll: '  _gsStack as found         : ',
  (look value ifNil: ['nil'] ifNotNil: [:s | 'Array(' , s size printString , ')']); lf.
System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: false.
out nextPutAll: '  _gsStack with flag false  : ',
  (look value ifNil: ['nil   <-- the marker recipe finds NOTHING to walk']
             ifNotNil: [:s | 'Array(' , s size printString , ')']); lf.
System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: true.
out nextPutAll: '  _gsStack with flag true   : ',
  (look value ifNil: ['nil'] ifNotNil: [:s | 'Array(' , s size printString , ')']); lf.
System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: flag.
out nextPutAll: '  restored to               : ',
  (System gemConfigurationAt: #'GemExceptionSignalCapturesStack') printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"2b. THE DECISIVE CASE, run BEFORE the one that dies: C traps the callback's
 exception and re-raises it with GciRaiseException, which unwinds the C frame.
 Does the ORIGINAL class arrive?  Does the intervening on: Error do: stay
 unmatched?  Is ex return: legal?"
| out r inner |
out := GsFile stdout.
out lf; nextPutAll: '=== 2b. GciRaiseException route (C frame UNWOUND first) ==='; lf.
inner := 'never ran'.
r := [
      [System userAction: #uaReraiseExcObj
              with: (SessionTemps current at: #UaSubj) with: 'raiseSibling']
        on: Error
        do: [:ex | inner := 'MATCHED: ' , ex class name , ' (' , ex number printString , ')'.
                   ex return: 'laundered by the wrapper-shaped handler']]
    on: UaSibling
    do: [:ex | ex return: 'CLASS PRESERVED: ' , ex class name , ' -- ' ,
                          (ex messageText ifNil: ['<nil messageText>'])].
out nextPutAll: '  intervening on: Error do: : ' , inner; lf.
out nextPutAll: '  outer on: UaSibling do:   : ' , r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"2b-control.  The same route with a PLAIN Error: the wrapper-shaped handler
 DOES match that one, so the difference above is the class, not the route."
| out r inner |
out := GsFile stdout.
out lf; nextPutAll: '=== 2b-control. same route, plain Error ==='; lf.
inner := 'never ran'.
r := [
      [System userAction: #uaReraiseExcObj
              with: (SessionTemps current at: #UaSubj) with: 'raiseError']
        on: Error
        do: [:ex | inner := 'MATCHED: ' , ex class name , ' (' , ex number printString , ') -- ' ,
                            (ex messageText ifNil: ['<nil messageText>']).
                   ex return: 'laundered']]
    on: UaSibling
    do: [:ex | ex return: 'outer saw UaSibling?!'].
out nextPutAll: '  intervening on: Error do: : ' , inner; lf.
out nextPutAll: '  block answered            : ' , r printString; lf.
out flush.
%

! --------------------------------------------------------------------------
run
"2a. THE PROPAGATING ROUTE, LAST because it can end the block: no
 GciRaiseException, so the user-action C frame is still live when the handler
 runs.  Expect the right class and a REFUSED ex return: (2758) -- the sibling
 trick fixes laundering, not unwinding.  The handler reads _gsStack for the
 marker first, with the capture armed as section 1 showed is required."
| out r inner |
out := GsFile stdout.
out lf; nextPutAll: '=== 2a. propagating route (C frame still LIVE) ==='; lf.
System gemConfigurationAt: #'GemExceptionSignalCapturesStack' put: true.
inner := 'never ran'.
r := [
      [System userAction: #uaExcObj
              with: (SessionTemps current at: #UaSubj) with: 'raiseSibling']
        on: Error
        do: [:ex | inner := 'MATCHED: ' , ex class name.
                   ex return: 'laundered']]
    on: UaSibling
    do: [:ex |
        | st live |
        st := ex _gsStack.
        live := false.
        st ifNotNil: [1 to: st size do: [:i |
            | v | v := st at: i.
            ((v isKindOf: GsNMethod) and: [v selector == #'_gsReturnToC'])
              ifTrue: [live := true]]].
        out nextPutAll: '  class at handler          : ' , ex class name; lf.
        out nextPutAll: '  marker check              : _gsStack ' ,
          (st ifNil: ['nil'] ifNotNil: [:s | 'Array(' , s size printString , ')']) ,
          ', _gsReturnToC present: ' , live printString; lf.
        out flush.
        ex return: 'handler tried to unwind'].
out nextPutAll: '  intervening on: Error do: : ' , inner; lf.
out nextPutAll: '  outer answered            : ' , r printString; lf.
out flush.
%

logout
exit 0
