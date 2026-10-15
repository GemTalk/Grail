Extension { #name : 'PyAsyncGenASend' }

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___claimAgen___ [
	"One step object owns the generator from first drive to step
	completion.  Driving a DIFFERENT one inside that window is CPython's
	per-kind running error -- and the refused object is CLOSED by the
	refusal (measured: its next send answers the reuse error)."

	| owner word |
	owner := agen ___asendOwner___.
	(owner @env0:notNil @env0:and: [owner @env0:~~ self]) ifTrue: [
		finished := true.
		word := kind == #'close'
			ifTrue: ['aclose']
			ifFalse: [kind == #'throw' ifTrue: ['athrow'] ifFalse: ['anext']].
		^ RuntimeError @env1:___signal___:
			(word @env0:, '(): asynchronous generator is already running')].
	agen ___setAsendOwner___: self

]

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___classifyOutcome___: out [
	"The three terminal outcomes release the generator and finish this
	object; a suspension passes through with the claim HELD -- that is the
	window ___claimAgen___ guards."

	out == #'___grailAgenClosed___' @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		^ StopIteration @env1:___signalReturn___: None].
	out == #'___grailAgenReturned___' @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		"A body that swallowed the GeneratorExit and RETURNED still closed
		cleanly (PEP 342 semantics for the close kind); everywhere else a
		return is exhaustion -- and the StopAsyncIteration is raised BARE,
		args (), as CPython raises it (test_async_gen_iteration_02 asserts
		assertFalse(ex.args); the old ``___signal___: None'' put a None in
		them)."
		kind == #'close' ifTrue: [^ StopIteration @env1:___signalReturn___: None].
		^ BaseException @env1:___pyRaise___: StopAsyncIteration].
	(out @env0:isKindOf: PyAsyncYield) @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		"A YIELD reaching a CLOSE step means the body yielded while being
		shut down -- CPython's RuntimeError, not a delivery."
		kind == #'close' ifTrue: [
			^ RuntimeError @env1:___signal___: 'async generator ignored GeneratorExit'].
		^ StopIteration @env1:___signalReturn___: (out @env0:___value___)].
	^ out

]

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___reuseError___ [
	"Issue 25887's asyncgen spelling, per entry point (measured): a finished
	-- or closed, or refused-while-running -- step object never drives the
	generator again."

	^ RuntimeError @env1:___signal___:
		((kind == #'close' @env0:or: [kind == #'throw'])
			ifTrue: ['cannot reuse already awaited aclose()/athrow()']
			ifFalse: ['cannot reuse already awaited __anext__()/asend()'])

]

{ #category : 'Grail-Private' }
PyAsyncGenASend >> ___step___: aValue [
	"ONE STEP, and the three outcomes that matter.

	  a PyAsyncYield  the body reached a ``yield''.  This await is DONE, and the
	                  unwrapped value is its result -- delivered the way any
	                  iterator delivers a return value to ___yieldFrom___:, as
	                  StopIteration's value.
	  anything else   an ``await'' suspension passing through.  Answer it, and
	                  ___yieldFrom___: hands it further out -- to the event loop.
	  StopIteration   the body RETURNED.  The async iteration is over, which is
	                  StopAsyncIteration, not StopIteration: letting the latter
	                  escape would be read by the delegation as this awaitable
	                  finishing normally, silently answering None as if it were
	                  an item."

	| out |
	finished @env0:ifTrue: [^ self ___reuseError___].
	"CPython: a non-None value cannot be sent into a step whose generator has
	never run -- there is no suspended yield for it to become the value OF
	(test_async_gen_exception_10; message verbatim)."
	(aValue ~~ None @env0:and: [agen ___pyHasStarted___ @env0:not]) ifTrue: [
		^ TypeError @env1:___signal___:
			'can''t send non-None value to a just-started async generator'].
	agen ___fireFirstiterIfNeeded___.
	self ___claimAgen___.
	out := [[[started
			@env0:ifTrue: [agen @env1:send: aValue]
			ifFalse: [
				started := true.
				"A value sent into this step's FIRST drive reaches the
				generator's suspended yield when the generator is already
				started -- ``it.__anext__().send(10)'' delivers 10, CPython's
				test_async_gen_asyncio_anext_05.  (An UNSTARTED generator was
				refused above.)  Only the send kind: throw and close carry
				their own payloads."
				(kind == #'send' @env0:and: [aValue ~~ None])
					ifTrue: [arg := aValue].
				kind == #'close'
					ifTrue: [
						"NOT ``agen close'': that drives the shutdown
						synchronously to completion, so a ``finally'' that
						AWAITS reads as the body ignoring the exit
						(test_async_gen_asyncio_aclose_07/08/12).  Throwing
						GeneratorExit through the ordinary step machinery
						lets the finally's suspensions PASS THROUGH to
						whoever drives this awaitable -- the event loop --
						and the classification below decides how the story
						ends: the exit escaping or the body returning is a
						clean close, a yield is 'ignored GeneratorExit'."
						agen @env1:throw: (GeneratorExit @env0:new)]
					ifFalse: [kind == #'throw'
						ifTrue: [agen @env1:throw: arg]
						ifFalse: [agen @env1:send: arg]]]]
		@env0:on: StopIteration
		do: [:ex | ex @env0:return: #'___grailAgenReturned___']]
		@env0:on: GeneratorExit
		do: [:ex |
			"For a CLOSE step the exit coming back out is the clean ending;
			any other kind lets it travel to the catch-all below."
			kind == #'close'
				ifTrue: [ex @env0:return: #'___grailAgenClosed___']
				ifFalse: [ex @env0:pass]]]
		@env0:on: AbstractException
		do: [:ex |
			"An exception out of the body ends this step: release the
			generator, close this object (its next send is the reuse
			error), and let the exception travel."
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	^ self ___classifyOutcome___: out

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> __await__ [
	"``await'' consults __await__ and expects an ITERATOR back.  This object is
	its own iterator, as a generator is."

	^ self

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> __iter__ [
	"___yieldFrom___: asks its sub-iterator for __iter__ first."

	^ self

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> __next__ [
	"Advance one step with nothing sent in."

	^ self ___step___: None

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> close [
	"The consumer abandoned this step.  An undriven or finished one just goes
	inert -- a later send answers the reuse error, which is CPython's
	contract for send-after-close.  A step MID-FLIGHT is a suspended
	coroutine being discarded: GeneratorExit goes to the suspension point,
	and a body that catches it and suspends AGAIN has ignored it --
	``RuntimeError: coroutine ignored GeneratorExit'' (the COROUTINE
	spelling: the close is on this asend object, not on the generator;
	test_async_gen_asend_close_runtime_error).  A body that lets it out, or
	returns, closed cleanly."

	| out |
	finished @env0:ifTrue: [^ None].
	started @env0:ifFalse: [finished := true. ^ None].
	out := [[[[agen @env1:throw: (GeneratorExit @env0:new)]
			@env0:on: GeneratorExit
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
			@env0:on: StopIteration
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
			@env0:on: StopAsyncIteration
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
		@env0:on: AbstractException
		do: [:ex |
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	agen ___setAsendOwner___: nil.
	finished := true.
	out == #'___grailExitTookHold___' @env0:ifTrue: [^ None].
	^ RuntimeError @env1:___signal___: 'coroutine ignored GeneratorExit'

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> send: aValue [
	"Advance one step, forwarding aValue into whatever the body is parked on --
	which, after the first step, is an ``await'' inside the body."

	^ self ___step___: aValue

]

{ #category : 'Grail-Awaitable Protocol' }
PyAsyncGenASend >> throw: anException [
	"The consumer threw at OUR suspension point, which is inside the body's
	pending await -- so forward it there.  This is how a cancellation reaches
	an async generator parked awaiting something.

	Guarded exactly as ___step___: is -- a finished object refuses reuse, a
	step someone ELSE has in flight refuses by kind (both measured against
	CPython 3.14, test_async_gen_asend_throw_concurrent_with_throw) -- and
	with the same bookkeeping, including unwrapping a PyAsyncYield when the
	body catches the thrown exception and yields the next item instead."

	| out ___exc___ |
	finished @env0:ifTrue: [^ self ___reuseError___].
	___exc___ := agen ___coercedThrowArg___: anException.
	agen ___fireFirstiterIfNeeded___.
	self ___claimAgen___.
	"throw(GeneratorExit) into an UNSTARTED aclose step performs the close --
	the generator shuts down (its body never ran, nothing to unwind) and the
	step completes as StopIteration, exactly as driving it would have
	(test_async_gen_throw_same_aclose_coro_twice expects StopIteration, then
	the reuse error)."
	(started @env0:not
		@env0:and: [kind == #'close'
		@env0:and: [___exc___ @env0:isKindOf: GeneratorExit]]) ifTrue: [
			started := true.
			agen @env1:close.
			agen ___setAsendOwner___: nil.
			finished := true.
			^ StopIteration @env1:___signalReturn___: None].
	started := true.
	out := [[[agen @env1:throw: ___exc___]
			@env0:on: StopIteration
			do: [:ex | ex @env0:return: #'___grailAgenReturned___']]
		@env0:on: GeneratorExit
		do: [:ex |
			kind == #'close'
				ifTrue: [ex @env0:return: #'___grailAgenClosed___']
				ifFalse: [ex @env0:pass]]]
		@env0:on: AbstractException
		do: [:ex |
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	^ self ___classifyOutcome___: out

]
