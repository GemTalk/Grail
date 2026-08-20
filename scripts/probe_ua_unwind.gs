"probe_ua_unwind.gs

Standalone reproduction driver for GemStone_Feature_Requests 1.5 -- unwind across
a USER ACTION frame.  Errors 2758 (ERR_EXC_RETURN_DISALLOWED) / 2079
(RT_ERR_CANT_RETURN).

No Grail, no CPython, no numpy: the only C is src/c/ua_unwind_probe, three GCI
actions in ~100 lines.  Build it first:

    source ./.setenv && make -C src/c/ua_unwind_probe

Then:

    source ./.setenv && ./scripts/evaluate.sh < scripts/probe_ua_unwind.gs

THE QUESTION.  A Smalltalk handler installed OUTSIDE a user action wants to
recover -- ex return: -- from an exception raised INSIDE Smalltalk code that the
user action called back into with GciPerform.  That recovery has to unwind across
the C frame.  Each row below reports what actually happened, so the answer is
whatever the run prints rather than what anyone expected.

The three actions differ only in what the C code does after the callback raises,
because that is the variable this probe exists to pin down:

  uaPerformIgnore    ignore the trapped error, return normally
  uaPerformReraise   GciRaiseException with the trapped error
  uaPerformNested    raise two Smalltalk activations above the C frame

MEASURED 2026-08-20, GemStone 4.0.0, arm64 Darwin -- the refusal REPRODUCES, and
the two C behaviours fail differently:

  uaPerformIgnore   C sees GciErr number=2758.  Smalltalk gets nil: the handler
                    NEVER RAN and the exception vanished silently.  A caller that
                    wrote  [...] on: Error do: [:ex | ex return: #fallback]  gets
                    neither its fallback nor an error -- it gets nil, which is
                    indistinguishable from a successful empty answer.
  uaPerformReraise  Smalltalk gets UncontinuableError (2758), ``return from on:do:
                    block would cross frame of C primitive, user action, or FFI
                    call''.  The recoverable Error the callback signalled has been
                    replaced by a non-recoverable one -- the amplification 1.5 is
                    about.
  uaPerformNested   as uaPerformIgnore; distance from the C frame does not matter.

So the answer to the question below is: the unwind is REFUSED, and how the refusal
presents depends on what the C code does with GciErr -- silent nil if it ignores
it, exception-type substitution if it re-raises.  Neither is translatable by the
Smalltalk caller, which is what the ask asks for.
"
| dir subj r out actions |
out := GsFile stdout.
dir := (System performOnServer: 'pwd') trimSeparators.

"A throwaway subject class, so nothing is added to Object and nothing is
 committed.  Its methods are what the user action calls back into."
(UserGlobals includesKey: #UaProbeSubject)
	ifFalse: [
		Object subclass: 'UaProbeSubject'
			instVarNames: #()
			classVars: #()
			classInstVars: #()
			poolDictionaries: #()
			inDictionary: UserGlobals
			options: #()].
subj := UserGlobals at: #UaProbeSubject.
subj compileMethod: 'uaProbeRaise
	"Raised INSIDE the callback, one activation above the C frame."
	^ Error signal: ''raised inside a user action callback'''
	dictionaries: System myUserProfile symbolList
	category: 'probe'.
subj compileMethod: 'uaProbeRaiseNested
	"Two activations above the C frame."
	^ [self uaProbeRaise] value'
	dictionaries: System myUserProfile symbolList
	category: 'probe'.

out nextPutAll: 'loading '; nextPutAll: dir;
    nextPutAll: '/src/c/ua_unwind_probe/libua_unwind_probe.dylib'; lf.
[System loadUserActionLibrary:
	dir , '/src/c/ua_unwind_probe/libua_unwind_probe.dylib']
	on: Error do: [:ex |
		out nextPutAll: 'LOAD FAILED: '; nextPutAll: ex messageText; lf.
		out nextPutAll: 'Build it first:  make -C src/c/ua_unwind_probe'; lf].
out nextPutAll: 'user actions: ';
    nextPutAll: System userActionReport keys asSortedCollection asArray printString; lf; lf.

actions := #( #'uaPerformIgnore' #'uaPerformReraise' #'uaPerformNested' ).
actions do: [:sel |
	out nextPutAll: '--- '; nextPutAll: sel asString; lf.
	"THE SHAPE UNDER TEST: handler OUTSIDE the action, recovering with return:.
	 on: AbstractException, not on: Error, so a refusal that arrives as something
	 other than an Error is still reported rather than escaping the probe."
	r := [System userAction: sel with: subj new]
		on: AbstractException
		do: [:ex |
			ex return: 'RECOVERED via ' , ex class name asString
				, ' (' , (ex messageText ifNil: ['']) , ')'].
	out nextPutAll: '    '; nextPutAll: r printString; lf].

out nextPutAll: 'READING THE RESULT.'; lf.
out nextPutAll: '  RECOVERED ... Error         the unwind was PERMITTED for that shape.'; lf.
out nextPutAll: '  2758 / 2079 / CannotReturn  the refusal 1.5 is about.'; lf.
out nextPutAll: '  a plain value               the callback never raised, so the shape'; lf.
out nextPutAll: '                              did not exercise the boundary.'; lf.
'probe complete'
