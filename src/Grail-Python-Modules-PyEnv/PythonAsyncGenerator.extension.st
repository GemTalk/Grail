Extension { #name : 'PythonAsyncGenerator' }

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___asendOwner___ [
	"The PyAsyncGenASend currently mid-step on this generator, nil when no
	step is in flight.  CPython's ag_running_async: one asend/athrow/aclose
	owns the generator from its first send until its step completes, and a
	DIFFERENT one driven in that window is 'anext(): asynchronous generator
	is already running' (per-kind spelling).  Suspension hands the value out
	to the event loop WITHOUT clearing the owner -- that is the window the
	guard exists for."

	^ asendOwner

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ___asyncYield___: aValue [
	"``yield aValue'' inside an async generator body.  YieldAst emits this
	instead of ___yield___: when the enclosing function is an async generator.

	Tags the value so the step driver can tell it from an ``await'' suspension
	arriving by the same route, then parks exactly as an ordinary yield does.
	Answers what the consumer sent -- so ``x = yield v'' binds the value passed
	to asend(), and None for a plain __anext__()."

	^ self ___yield___: (PyAsyncYield @env0:___value___: aValue)

]

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___fireFirstiterIfNeeded___ [
	"The asyncgen half of sys.set_asyncgen_hooks, both hooks captured at the
	generator's first drive, as CPython's async_gen_init_hooks captures them.

	The FINALIZER is bound first: it is what runs if this generator is
	collected unfinished (___runFinalizer___:), so the hook in force NOW is the
	one it gets, whatever is installed by the time it dies.  Then FIRSTITER
	fires, handing the loop the reference it will close in
	shutdown_asyncgens() if the generator is still alive then.  Gated by a
	dynamic instVar so the per-step cost after the first is one probe; a hook
	error must not break iteration, so the call is guarded -- CPython logs and
	continues too."

	(self @env0:dynamicInstVarAt: #'___firstIterFired___') @env0:isNil ifTrue: [
		self @env0:dynamicInstVarAt: #'___firstIterFired___' put: true.
		(SessionTemps @env0:current @env0:at: #'GrailAsyncgenFinalizer' otherwise: nil)
			@env0:ifNotNil: [:fin |
				FinalizerEphemeron
					@env0:on: self
					do: [:anAgen :aHook | anAgen ___runFinalizer___: aHook]
					with: fin].
		(SessionTemps @env0:current @env0:at: #'GrailAsyncgenFirstiter' otherwise: nil)
			@env0:ifNotNil: [:hook |
				[hook @env1:___pyCallValue___: { self } kw: nil]
					@env0:on: AbstractException
					do: [:ex | ex @env0:return: nil]]]

]

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___pyKindWords___ [
	"CPython's runtime messages use the SPACED spelling for this kind: 'async
	generator raised StopIteration', 'can''t send non-None value to a
	just-started async generator' (measured, 3.14).  The underscored
	``async_generator'' is the type name, not the prose."

	^ 'async generator'

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ___readOnlyGetsetNames___ [
	"See PythonGenerator >> ___refuseReadOnlyAttr___:."

	^ #('ag_await' 'ag_code' 'ag_frame' 'ag_suspended')

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ___readOnlyMemberNames___ [
	^ #('ag_running')

]

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___runFinalizer___: aHook [
	"This generator was collected -- its FinalizerEphemeron mourned it and
	queued this, which keeps it alive until now, a safe point -- and PEP 525
	hands it to the finalizer hook bound at its first drive.  asyncio's hook schedules
	aclose() as a task, so the body's ``finally'' runs on the loop, with the
	loop's exception handler catching what it raises
	(test_async_gen_asyncio_gc_aclose_09, shutdown_exception_02).  The hook
	keeps the generator reachable for as long as it needs it.

	A generator that already FINISHED has nothing left to close, and CPython
	skips the hook for it (ag_closed)."

	done ifTrue: [^ None].
	^ aHook ___pyCallValue___: { self } kw: nil

]

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___setAsendOwner___: anASendOrNil [
	asendOwner := anASendOrNil

]

{ #category : 'Grail-Private' }
PythonAsyncGenerator >> ___signalEscapedException___ [
	"PEP 479's ASYNC twin, which the inherited path cannot express:
	StopAsyncIteration is deliberately OUTSIDE the StopIteration hierarchy,
	so the generator machinery lets it escape raw -- but one escaping an
	async generator BODY is exactly as ambiguous as StopIteration escaping a
	sync one (it is indistinguishable from the generator's own exhaustion
	signal), and CPython converts it the same way:

	    RuntimeError: async generator raised StopAsyncIteration

	with the escaped exception as __cause__ and __context__.  Measured
	against 3.14: ``(0 async for tgt[0] in source())'' whose target store
	raises StopAsyncIteration(42) surfaces that RuntimeError from the
	awaited asend, cause args intact
	(test_for_assign_raising_stop_async_iteration's run_gen).  Everything
	else defers to the inherited implementation, including the sync PEP 479
	conversion, which ___pyKindWords___ already words for this class."

	| ex err msg |
	ex := BaseException @env0:___payloadOf___: escapedException.
	(ex @env0:isKindOf: StopAsyncIteration) ifTrue: [
		escapedException := nil.
		msg := 'async generator raised StopAsyncIteration'.
		err := RuntimeError ___new___.
		err ___args___: { msg }.
		err ___setCause___: ex context: ex.
		^ err ___signal___: msg].
	^ super ___signalEscapedException___

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> __aiter__ [
	"An async generator is its own async iterator, exactly as a generator is its
	own iterator."

	^ self

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> __anext__ [
	"Answer an AWAITABLE that advances this generator to its next ``yield''.
	asend(None), spelled the way ``async for'' asks for it."

	^ PyAsyncGenASend @env0:___on___: self kind: #'send' arg: None

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> aclose [
	"``agen.aclose()'' -- shut the body down, running its ``finally'' blocks.

	An awaitable rather than a plain call, because closing can legitimately
	await: a ``finally'' in an async generator may contain one.  Delegates to
	the inherited close, which throws GeneratorExit at the suspension point and
	absorbs it, so a body that catches GeneratorExit and returns is fine."

	^ PyAsyncGenASend @env0:___on___: self kind: #'close' arg: None

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ag_await [
	"Python's ``agen.ag_await'' -- what the body is awaiting RIGHT NOW: the
	delegation target for the whole asend-in-flight window (running
	included, measured), None otherwise."

	^ self ___delegationTargetWhileAlive___

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ag_code [
	"Python's ``agen.ag_code'' -- the async-generator spelling of gi_code."

	^ self ___codeObjectOrSignal___: 'ag_code'

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ag_frame [
	"Python's ``agen.ag_frame'' -- the async-generator spelling of gi_frame."

	^ self ___genFrame___

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ag_running [
	"Python's ``agen.ag_running'' -- CPython's ag_running_async window, wider
	than gi_running: true from an asend/athrow/aclose step's first drive
	until the step completes, suspensions included (measured: mid-await the
	state is AGEN_RUNNING).  asendOwner is exactly that window's marker."

	^ ((running == true) @env0:or: [asendOwner ~~ nil])
		@env0:ifTrue: [True] ifFalse: [False]

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> ag_suspended [
	"Python's ``agen.ag_suspended'' (3.12+) -- parked at a yield, which unlike
	a plain coroutine an async generator genuinely reaches here: asend drives
	the body one yield at a time."

	^ self ___genSuspended___

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> asend: aValue [
	"``agen.asend(v)'' -- advance to the next yield, with v as the value of the
	``yield'' expression the body is parked on."

	^ PyAsyncGenASend @env0:___on___: self kind: #'send' arg: aValue

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> athrow: anException [
	"``agen.athrow(exc)'' -- raise exc AT the point the body is parked on, and
	answer an awaitable for whatever happens next: another yield, the exception
	propagating out, or StopAsyncIteration if the body finishes."

	^ PyAsyncGenASend @env0:___on___: self kind: #'throw' arg: anException

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> athrow: aType _: aValue [
	"The deprecated multi-arg signature -- throw:'s athrow twin, sharing its
	normalisation and warning machinery (test_async_gen_3_arg_deprecation
	_warning asserts the DeprecationWarning)."

	self ___warnLegacySignatureOf___: 'athrow'.
	^ self athrow: (self ___normalizedLegacyExc___: aType value: aValue)

]

{ #category : 'Grail-Async Generator Protocol' }
PythonAsyncGenerator >> athrow: aType _: aValue _: aTb [
	self ___warnLegacySignatureOf___: 'athrow'.
	^ self athrow: (self ___normalizedLegacyExc___: aType value: aValue tb: aTb)

]
