! Reproducible case: the ip captured in an exception's _gsStack maps to a
! DIFFERENT source position depending on GEM_NATIVE_CODE_ENABLED.
!
! Run in plain topaz on Linux x86_64 (3.7.5) twice: once as-is (native code
! enabled -- the default), once with GEM_NATIVE_CODE_ENABLED = 0 in the gem
! config.  No Grail, no Python: kernel API only.
!
! MEASURED, GemStone 3.7.5, Linux x86_64 (in the ci-base container), 2026-08-29.
! The raise is on source line 5 (``self error: 'boom'.''):
!
!                        native ON (default)   native OFF
!   raw ip (_gsStack)          251                112
!   _lineNumberForIp:            6  <- WRONG        5  <- right
!   _sourceAtIp: caret      line 7  <- WRONG   line 6  <- right (just after it)
!   _stepPointForIp:             8                  6
!   _lineNumberForStep:          1  <- WRONG        6
!
! The same method, the same logical execution point, and the SAME lookup: only
! GEM_NATIVE_CODE_ENABLED differs.  _sourceAtIp: itself is not mode-sensitive --
! asked for a fixed ip it answers identically in both modes -- so what changes
! is the ip that reaches it from the captured stack, and every consumer that
! reconstructs a source position from a native frame inherits the error rather
! than being told the position is unavailable.
!
! Why Grail cares: it derives a Python line by finding this caret in generated
! Smalltalk and taking the last position marker at or above it.  A caret one
! statement low silently yields the NEXT Python line -- CPython's test_iter
! test_exception_locations reports 1161 where 1160 is correct, on Linux only.

login

run
| cls |
(UserGlobals includesKey: #NativeIpProbe) ifFalse: [
	cls := Object subclass: 'NativeIpProbe'
	  instVarNames: #() classVars: #() classInstVars: #()
	  poolDictionaries: #() inDictionary: UserGlobals.
	"Five statements, each on its own line.  The raise is deliberately in the
	 MIDDLE, so an off-by-one in either direction lands on a line we can name."
	cls class compileMethod: 'raiseInTheMiddle
	| a |
	a := 1.
	a := a + 1.
	self error: ''boom''.
	a := a + 1.
	^ a'
	  dictionaries: System myUserProfile symbolList
	  category: 'probe'.
	System commit].
^ 'probe ready'
%

run
| stack meth ip src lines caretLine out lf |
lf := String with: Character lf.
out := WriteStream on: String new.
out nextPutAll: 'nativeCodeEnabled = ',
	(System configurationAt: #GemNativeCodeEnabled) printString, lf.

"Primitive 2022 fills _gsStack only when this gem config is on."
System configurationAt: #GemExceptionSignalCapturesStack put: true.

[ NativeIpProbe raiseInTheMiddle ] on: Error do: [:ex | stack := ex _gsStack ].

"_gsStack: a SmallInteger followed by (method, ip, receiver) triples,
 innermost first.  Find the probe's own frame."
2 to: stack size - 1 by: 3 do: [:i |
	(meth isNil and: [ (stack at: i) isKindOf: GsNMethod ]) ifTrue: [
		((stack at: i) printString includesString: 'raiseInTheMiddle')
			ifTrue: [ meth := stack at: i. ip := stack at: i + 1 ]]].
meth isNil ifTrue: [ ^ out contents , 'PROBE FRAME NOT FOUND' ].

out nextPutAll: 'method             = ', meth printString, lf.
out nextPutAll: 'raw ip (_gsStack)  = ', ip printString, lf.
out nextPutAll: '_lineNumberForIp:  = ',
	([ meth _lineNumberForIp: ip ] on: Error do: [:e | e return: 'ERR: ', e messageText ]) printString, lf.
out nextPutAll: '_stepPointForIp:   = ',
	([ meth _stepPointForIp: ip level: 1 useNext: false ] on: Error do: [:e | e return: 'ERR: ', e messageText ]) printString, lf.
out nextPutAll: '_lineNumberForStep:= ',
	([ meth _lineNumberForStep: (meth _stepPointForIp: ip level: 1 useNext: false) ]
		on: Error do: [:e | e return: 'ERR: ', e messageText ]) printString, lf.

src := [ meth _sourceAtIp: ip ] on: Error do: [:e | e return: nil ].
src isNil
	ifTrue: [ out nextPutAll: '_sourceAtIp: FAILED', lf ]
	ifFalse: [
		lines := src subStrings: lf.
		caretLine := 0.
		1 to: lines size do: [:i |
			(caretLine = 0
				and: [ ((lines at: i) includesString: '*')
				and: [ (lines at: i) includesString: '^' ]])
					ifTrue: [ caretLine := i ]].
		out nextPutAll: '_sourceAtIp: caret on line ', caretLine printString, lf.
		1 to: lines size do: [:i |
			out nextPutAll: (i = caretLine ifTrue: ['  >> '] ifFalse: ['     ']),
				i printString, ': ', (lines at: i), lf]].

out nextPutAll: 'EXPECTED in BOTH modes: the caret identifies "self error: ''boom''."', lf.
^ out contents
%

logout
