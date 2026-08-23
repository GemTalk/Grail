output pushnew probe_ua_exception_obj.out
! file scripts/probe_ua_exception_obj.gs
!
! DOES GciErrSType CARRY THE SIGNALLED EXCEPTION?
!
! No Grail, no CPython, no numpy: the only C is src/c/ua_unwind_probe, whose
! uaExcObj action performs an arbitrary selector, reports every field of the
! trapped GciErrSType on stderr, and RETURNS err.exceptionObj so that
! Smalltalk -- not a C printf -- decides what came back.
!
! Each row raises a different way, and each is run TWICE: once with no
! Smalltalk handler outside the user action, and once with a handler that
! recovers with `ex return:` (the shape that produces 2758 in
! scripts/probe_ua_unwind.gs).  If exceptionObj survives the first column,
! GciErr does carry the exception and a user action can report it faithfully.
!
! BUILD: source ./.setenv && make -C src/c/ua_unwind_probe
! RUN:   source ./.setenv && topaz -l -I .topazini -S scripts/probe_ua_exception_obj.gs
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

login
level 0

run
| out cls subj lib describe raisers |
out := GsFile stdout.

"--- a throwaway subject class with one method per flavour of raise, plus a
     custom exception class so we can tell whether the CLASS survives. ---"
(UserGlobals includesKey: #UaExcProbeError) ifFalse: [
  UserGlobals at: #UaExcProbeError put:
    (Error subclass: 'UaExcProbeError'
      instVarNames: #() classVars: #() classInstVars: #()
      poolDictionaries: #() inDictionary: UserGlobals)].
(UserGlobals includesKey: #UaExcProbeSubject) ifFalse: [
  UserGlobals at: #UaExcProbeSubject put:
    (Object subclass: 'UaExcProbeSubject'
      instVarNames: #() classVars: #() classInstVars: #()
      poolDictionaries: #() inDictionary: UserGlobals)].
cls := UserGlobals at: #UaExcProbeSubject.
cls compileMethod: 'plainError  ^ self error: ''boom from plainError'''
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'customError  ^ UaExcProbeError new signal: ''boom from customError'''
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'zeroDivide  ^ 1 / 0'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'notUnderstood  ^ self glorpFrobnicate'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'keyNotFound  ^ Dictionary new removeKey: #absent'
    dictionaries: System myUserProfile symbolList category: 'probe'.
cls compileMethod: 'noRaise  ^ 42'
    dictionaries: System myUserProfile symbolList category: 'probe'.

lib := (System gemEnvironmentVariable: 'PWD') , '/src/c/ua_unwind_probe/libua_unwind_probe.dylib'.
out nextPutAll: 'loading ' , lib; lf.
System loadUserActionLibrary: lib.

"--- render whatever the action handed back ---"
describe := [:o |
  o isNil
    ifTrue: [ 'nil -- NO exceptionObj' ]
    ifFalse: [
      | k m |
      k := [o class name asString] on: Error do: [:e | e return: '<class unavailable>'].
      m := [o isKindOf: AbstractException]
             on: Error do: [:e | e return: false].
      m
        ifTrue: [ k , '   messageText: ' ,
                  ([o messageText printString] on: Error do: [:e | e return: '<unavailable>']) ]
        ifFalse: [ k , '   (not an exception!)  printString: ' ,
                   ([o printString] on: Error do: [:e | e return: '<unavailable>']) ] ] ].

raisers := #( #plainError #customError #zeroDivide #notUnderstood #keyNotFound #noRaise ).

SessionTemps current at: #UaExcCls put: cls.
SessionTemps current at: #UaExcDescribe put: describe.
out nextPutAll: '--- fixtures ready ---'; lf; flush.
%

! ==========================================================================
! COLUMN 1 -- genuinely NO handler anywhere outside the user action.
! Each flavour gets its OWN topaz block, so there is no enclosing on:do: at
! all (an on:do: is found by the handler search AT RAISE TIME, walking out
! across the user-action frame -- its mere presence is what produces 2758,
! which is why it cannot be used to guard these rows).
! ==========================================================================
run
GsFile stdout lf; nextPutAll: '========== COLUMN 1: no handler outside =========='; lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'plainError'.
GsFile stdout nextPutAll: '  plainError    -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'customError'.
GsFile stdout nextPutAll: '  customError   -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide'.
GsFile stdout nextPutAll: '  zeroDivide    -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'notUnderstood'.
GsFile stdout nextPutAll: '  notUnderstood -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'keyNotFound'.
GsFile stdout nextPutAll: '  keyNotFound   -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'noRaise'.
GsFile stdout nextPutAll: '  noRaise       -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%

! ==========================================================================
! COLUMN 2 -- a handler outside that recovers with `ex return:`.
! ==========================================================================
run
| out cls describe |
out := GsFile stdout.
cls := SessionTemps current at: #UaExcCls.
describe := SessionTemps current at: #UaExcDescribe.
out lf; nextPutAll: '===== COLUMN 2: handler outside, recovers with ex return: ====='; lf.
#( 'plainError' 'customError' 'zeroDivide' 'notUnderstood' 'keyNotFound' 'noRaise' ) do: [:sel |
  | r |
  r := [ System userAction: #uaExcObj with: cls new with: sel ]
         on: AbstractException
         do: [:ex | ex return: 'handler ran: ' , ex class name asString ,
                               ' (' , ex number printString , ')' ].
  out nextPutAll: '  '; nextPutAll: sel; nextPutAll: ' -> ';
      nextPutAll: (r isString ifTrue: [r] ifFalse: [describe value: r]); lf].
out flush.
%

! ==========================================================================
! COLUMN 3 -- WHICH handler action causes the substitution?
! Column 1 (no handler) keeps the exception; column 2 (`ex return:`) loses it.
! So it is the handler, not the raise.  Each row installs a handler outside
! the user action that does ONE thing, so we can see which are safe.  Own
! block each: some of these end the session.
! ==========================================================================
run
GsFile stdout lf; nextPutAll: '===== COLUMN 3: which handler action substitutes? ====='; lf; flush.
%
run
| r | r := [ System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide' ]
        on: AbstractException do: [:ex | ex return: nil].
GsFile stdout nextPutAll: '  ex return: nil        -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := [ System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide' ]
        on: AbstractException do: [:ex | ex resume: nil].
GsFile stdout nextPutAll: '  ex resume: nil        -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
| r | r := [ [ System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide' ]
              on: AbstractException do: [:ex | ex pass] ]
        on: AbstractException do: [:ex2 | ex2 return: 'outer saw ' , ex2 class name asString , ' (' , ex2 number printString , ')'].
GsFile stdout nextPutAll: '  ex pass (outer sees)  -> ', (r isString ifTrue: [r] ifFalse: [(SessionTemps current at: #UaExcDescribe) value: r]); lf; flush.
%
run
"An ensure: outside -- no handler, so nothing can try to unwind."
| r | r := [ System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide' ]
        ensure: [ nil ].
GsFile stdout nextPutAll: '  ensure: only          -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%
run
"A handler for a class the raise does NOT match: present, but not found."
| r | r := [ System userAction: #uaExcObj with: (SessionTemps current at: #UaExcCls) new with: 'zeroDivide' ]
        on: Notification do: [:ex | ex return: nil].
GsFile stdout nextPutAll: '  on: Notification      -> ', ((SessionTemps current at: #UaExcDescribe) value: r); lf; flush.
%

run
| out |
out := GsFile stdout.
out lf; nextPutAll: 'READING IT.'; lf;
  nextPutAll: '  <ExcClass> messageText: ''...''  exceptionObj carries the real'; lf;
  nextPutAll: '                                  exception: a user action CAN report it.'; lf;
  nextPutAll: '  nil -- NO exceptionObj          it does not, and 1.5 ask 1 stands.'; lf;
  nextPutAll: '  a DIFFERENT class               the exception was substituted.'; lf.
out flush.
%
logout
exit 0
