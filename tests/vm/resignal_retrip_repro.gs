! resignalAs: from an AlmostOutOfStackError handler can re-trip the stack limit
! =============================================================================
!
! Plain GemStone Smalltalk, environment 0, no application code.  Needs only a
! stone and a login that may create a class in UserGlobals (nothing is
! committed).  Run it with
!
!     topaz -lq -S resignal_retrip_repro.gs < /dev/null
!
! optionally with -C "GEM_MAX_SMALLTALK_STACK_DEPTH=...;" and/or
! -C "GEM_NATIVE_CODE_ENABLED=...;" to vary the configuration.
!
! THE PATTERN.  A handler converts stack exhaustion into an ordinary error with
! resignalAs:, so that a handler for that error BELOW the converting handler --
! nearer the overflow -- can catch it.  resignalAs: restarts the handler search
! from the original signal point, which is what makes this work:
!
!     [ [ runaway recursion ]
!         on: ZeroDivide do: [:e | 'caught' ]          <- expected to catch
!     ] on: AlmostOutOfStackError do: [:ex |
!         ex resignalAs: ZeroDivide new ]
!
! EXPECTED.  Every row 'caught', with the converting handler entered once.
!
! OBSERVED (4.0.0.a2, Darwin arm64, interpreted).  For some starting stack
! depths the converting handler is entered TWICE, and the inner handler does not
! catch the ZeroDivide -- it escapes to an outer handler instead.  Frames at the
! second entry show it signalled from inside the FIRST replacement's dispatch:
!
!     AlmostOutOfStackError (AbstractException) >> _signalFromPrimitive @1
!     ZeroDivide (AbstractException) >> _executeHandler: @1
!     ZeroDivide (AbstractException) >> _signalFromPrimitive @1
!     StackRepro >> b2: @1                         <- where the first trip landed
!
! So the second AlmostOutOfStackError is raised while the inner on:do: is
! already committed to the first ZeroDivide, and the second ZeroDivide passes it
! by.  Whether it happens depends only on where the first trip lands:
!
!   * trip in the PROLOGUE (@1) of the recursing method  -> re-trips, escapes;
!   * trip inside a helper method the recursion calls    -> caught, one entry.
!
! The recursion must pass through a short helper call chain (two frames or more)
! on each level; with none, or one, every trip is caught.  The start-offset
! sweep below is what makes this deterministic: the failing offsets repeat once
! per recursion level.  GEM_SMALLTALK_STACK_ERROR_PERCENT (10/25/50/100) does
! not change the result, so this is not exhaustion of the yellow zone.
!
! WHERE WE THINK IT COMES FROM (reading src/, not verified in a debugger).
! IntSwiExcResignal (intswitch.c) trims the stack back to the original signal
! frame and calls checkYellowProtection(newSP) (om_inline.hf), which re-protects
! the yellow guard page whenever newSP is above the boundary -- with no margin.
! A trip in a prologue leaves the signal frame just above the boundary, so the
! page is re-armed underneath the replacement exception's own dispatch.
! Interpreter entry already avoids exactly this with a margin ("don't reset from
! red back to yellow unless we have some margin", fix 51168, intloopsup.c).
!
! AlmostOutOfStackError disable does not help: stackLimitYellowError() only
! chooses the class, so the re-trip arrives as AlmostOutOfStack instead.
! Unhandled, that stops execution; handled, it answers isResumable false
! (although AlmostOutOfStack>>initialize sets gsResumable := true), so the
! converting handler cannot resume past it either.
!
! OUTPUT.  One line per configuration fact, one SWEEP line per helper-chain
! length (. caught, X escaped), a VERDICT line, then the frames of both trips for
! the first escape found at the canonical chain length.

login
run
Object subclass: 'StackRepro' instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: UserGlobals.
AlmostOutOfStackError enable.
true
%

! --- helper chains: incK: is K+1 frames deep ------------------------------------
method: StackRepro
inc0: n
  ^ n + 1
%
method: StackRepro
inc1: n
  ^ self inc0: n
%
method: StackRepro
inc2: n
  ^ self inc1: n
%
method: StackRepro
inc3: n
  ^ self inc2: n
%
method: StackRepro
inc4: n
  ^ self inc3: n
%

! --- mutual recursion through a chain: aK: -> incK: ... -> bK: -> incK: ... -> aK:
method: StackRepro
none_a: n
  ^ self none_b: n + 1
%
method: StackRepro
none_b: n
  ^ self none_a: n + 1
%
method: StackRepro
a0: n
  ^ self b0: (self inc0: n)
%
method: StackRepro
b0: n
  ^ self a0: (self inc0: n)
%
method: StackRepro
a1: n
  ^ self b1: (self inc1: n)
%
method: StackRepro
b1: n
  ^ self a1: (self inc1: n)
%
method: StackRepro
a2: n
  ^ self b2: (self inc2: n)
%
method: StackRepro
b2: n
  ^ self a2: (self inc2: n)
%
method: StackRepro
a3: n
  ^ self b3: (self inc3: n)
%
method: StackRepro
b3: n
  ^ self a3: (self inc3: n)
%
method: StackRepro
a4: n
  ^ self b4: (self inc4: n)
%
method: StackRepro
b4: n
  ^ self a4: (self inc4: n)
%

method: StackRepro
pad: k then: aBlock
  "Start the recursion k frames deeper, to move where the stack limit trips."
  ^ k = 0 ifTrue: [aBlock value] ifFalse: [self pad: k - 1 then: aBlock]
%

method: StackRepro
runPad: pad selector: sel
  "Answer { result. trips } for one start offset."
  | trips result |
  trips := 0.
  result := [
    [
      [self pad: pad then: [self perform: sel with: 0]. 'no error']
        on: ZeroDivide do: [:e | 'caught']
    ] on: AlmostOutOfStackError do: [:ex |
        trips := trips + 1.
        ex resignalAs: ZeroDivide new]
  ] on: ZeroDivide do: [:e | 'ESCAPED'].
  ^ { result. trips }
%

method: StackRepro
framesPad: pad selector: sel
  "As runPad:selector:, also capturing the stack at every entry to the
   converting handler.  Answer { result. reports }."
  | reports result |
  reports := OrderedCollection new.
  result := [
    [
      [self pad: pad then: [self perform: sel with: 0]. 'no error']
        on: ZeroDivide do: [:e | 'caught']
    ] on: AlmostOutOfStackError do: [:ex |
        reports add: (GsProcess stackReportToLevel: 8).
        ex resignalAs: ZeroDivide new]
  ] on: ZeroDivide do: [:e | 'ESCAPED'].
  ^ { result. reports }
%

run
| out r v c pads chains totalEsc badInvariant |
out := GsFile stdout.
r := StackRepro new.
v := System gemVersionReport.
c := System gemConfigurationReport.
out nextPutAll: 'CONFIG|gsVersion=' , (v at: 'gsVersion') asString
  , '|build=' , (v at: 'gsBuildDate') asString
  , '|os=' , (v at: 'osName') asString , '|cpu=' , (v at: 'cpuArchitecture') asString; lf.
out nextPutAll: 'CONFIG|GEM_MAX_SMALLTALK_STACK_DEPTH=' , (c at: #'GEM_MAX_SMALLTALK_STACK_DEPTH') printString
  , '|GEM_SMALLTALK_STACK_ERROR_PERCENT=' , (c at: #'GEM_SMALLTALK_STACK_ERROR_PERCENT') printString
  , '|GEM_NATIVE_CODE_ENABLED=' , (c at: #'GEM_NATIVE_CODE_ENABLED') printString
  , '|GemNativeCodeEnabled=' , (c at: #'GemNativeCodeEnabled') printString; lf.
pads := 0 to: 40.
chains := { 'none' -> #none_a:. '1' -> #a0:. '2' -> #a1:. '3' -> #a2:. '4' -> #a3:. '5' -> #a4: }.
totalEsc := 0. badInvariant := 0.
chains do: [:assoc | | line esc |
  line := WriteStream on: String new. esc := 0.
  pads do: [:pad | | res |
    res := r runPad: pad selector: assoc value.
    (res at: 1) = 'caught'
      ifTrue: [line nextPut: $. . (res at: 2) = 1 ifFalse: [badInvariant := badInvariant + 1]]
      ifFalse: [
        line nextPut: $X. esc := esc + 1.
        ((res at: 1) = 'ESCAPED' and: [(res at: 2) = 2]) ifFalse: [badInvariant := badInvariant + 1]]].
  totalEsc := totalEsc + esc.
  out nextPutAll: 'SWEEP|helper frames=' , assoc key , '|escaped ' , esc printString , '/' , pads size printString , '|' , line contents; lf].
out nextPutAll: 'VERDICT|' , (totalEsc > 0 ifTrue: ['REPRODUCED'] ifFalse: ['NOT REPRODUCED'])
  , '|escapes=' , totalEsc printString
  , '|rows breaking caught=1-trip / escaped=2-trips=' , badInvariant printString; lf.

"Frames for the first escape at the canonical chain (3 helper frames).  The
 capture itself runs inside the handler, above the trip, so it does not move the
 trip point -- but look at every offset in case it does."
(pads detect: [:pad | | res |
    res := r framesPad: pad selector: #a2:.
    (res at: 1) = 'ESCAPED'
      ifTrue: [
        out nextPutAll: 'FRAMES|helper frames=3|pad=' , pad printString , '|handler entries=' , (res at: 2) size printString; lf.
        (res at: 2) doWithIndex: [:rep :i |
          out nextPutAll: '--- entry ' , i printString , ' to the converting handler'; lf; nextPutAll: rep].
        true]
      ifFalse: [false]]
  ifNone: [nil]) isNil
    ifTrue: [out nextPutAll: 'FRAMES|none: no escape at helper frames=3 while capturing'; lf].
true
%
logout
exit
