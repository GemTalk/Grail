"Runtime representation of a Python generator function's call result.

A function containing ``yield`` (or ``yield from``) doesn't run its
body when called — it returns a generator object that lazily produces
values on each ``next()``.  Grail implements this via a coroutine: the
function body runs in a forked GsProcess, and a pair of Semaphores
synchronises the consumer (``__next__``/``send``/``throw``/``close``)
with the producer (``___yield___:``).

State:
  * block              — a 1-arg Block ``[:gen | ... gen ___yield___: v ...]``.
                         Receives the generator instance so the body
                         can yield through it; closes over the outer
                         method's self/locals.
  * proc               — the forked GsProcess running ``block``,
                         or nil before the first advance.
  * consumerSem        — signalled by the producer when a new value
                         is available (or when ``done`` flips true).
  * producerSem        — signalled by the consumer to wake the
                         producer after each value is read.
  * value              — the most recently yielded value.
  * done               — true once the body has finished.
  * returnValue        — the body's implicit return value (PEP 380).
  * started            — false until the first advance.
  * sentValue          — the value to inject into the producer's
                         yield expression on the next resume; set by
                         ``send:``, consumed by ``___yield___:``.
  * injectedException  — an exception to raise inside the producer
                         at the suspended yield point; set by
                         ``throw:`` / ``close``, raised by
                         ``___yield___:``.
  * running            — true while the body is executing, i.e. between
                         a consumer resuming it and the producer
                         yielding back.  Python's ``gi_running``, and
                         the guard that makes re-entering a generator a
                         ValueError instead of a deadlock.
  * consumerProcess    — the GsProcess that last resumed this generator,
                         and so the one blocked on ``consumerSem`` while
                         the body runs.  Nothing in the generator
                         protocol needs it; a live STACK WALK does.  The
                         body's own capture ends at the fork, so this
                         is the only link from a running generator back
                         to the frames waiting on it — see
                         BaseException class>>___liveFrameSections___:.
  * codeThunk          — a niladic block building this generator's code
                         object (gi_code / cr_code / ag_code), emitted at
                         the call site from what the compiler knew about
                         the def.  nil for a generator no def produced
                         (generator expressions, Smalltalk-built helpers).
  * codeObject         — the PyCode codeThunk built, memoized on the
                         first gi_code read.
  * frameObject        — the PyFrame gi_frame answers while the body has
                         not finished; dropped when it does, because
                         CPython's gi_frame is None after completion.

__name__ / __qualname__ are DYNAMIC instVars, stamped at creation by
withBlock:name:qualname:code: and freely reassignable afterwards — which
is CPython's contract for them (test_async_gen_api_01 reassigns both)."
Class {
	#name : 'PythonGenerator',
	#superclass : 'PythonInstance',
	#instVars : [
		'block',
		'proc',
		'consumerSem',
		'producerSem',
		'value',
		'done',
		'returnValue',
		'started',
		'sentValue',
		'injectedException',
		'escapedException',
		'running',
		'consumerProcess',
		'codeThunk',
		'codeObject',
		'frameObject',
		'delegationTarget'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PythonGenerator class >> ___pythonValueAttrs___ [
	"``g.gi_running'' is a bool, not a callable, so ___pyAttrLoad___ performs
	the accessor rather than answering a BoundMethod (which would test truthy
	whatever the generator was doing).  The rest of the introspection surface
	is listed for the same reason — every one is a VALUE (a bool, a code
	object, a frame or None), and an unlisted accessor reaches Python as a
	BoundMethod that is always truthy, which is exactly the bug cr_running
	had before the coroutine override listed it."

	^ IdentitySet new
		add: #'gi_running';
		add: #'gi_suspended';
		add: #'gi_code';
		add: #'gi_frame';
		add: #'gi_yieldfrom';
		yourself

]

{ #category : 'Grail-Private' }
PythonGenerator >> ___consumerProcess___ [
	"The GsProcess blocked on consumerSem waiting for this generator, or nil
	before the first resume.

	Read only by the live stack walk (BaseException
	class>>___liveFrameSections___:), which needs somewhere to continue when a
	generator body's own capture runs out at the fork.  Compiled env 0: its one
	caller is Smalltalk, and it is deliberately NOT a Python attribute -- a
	GsProcess is not something Python code should be handed."

	^ consumerProcess

]

{ #category : 'Grail-Private' }
PythonGenerator >> ___unrootParkedProducer___ [
	"Let a SUSPENDED generator be garbage like any other object.  Sent by the
	consumer each time it gets control back from the body.

	A body parked at a yield is its producer process blocked in ``producerSem
	wait'', and Semaphore>>wait files the waiter in the scheduler's waitingSet
	(ProcessorScheduler>>_waitOnSema:).  That set is a GC ROOT, and the parked
	stack holds the generator -- it is the receiver of the ___yield___: frame
	-- so every generator ever suspended stayed alive for the rest of the
	session, whoever still referred to it.  Measured: 2000 ``for x in gen():
	return x'' calls left 2000 live GsProcesses after a full mark-sweep.  That
	is a leak in its own right, and it is also why CPython's destruction-time
	hooks had nothing to fire on: an abandoned async generator was never
	collected at all (test_asyncgen's gc_aclose_09).

	The semaphore still records the waiter, so dropping the scheduler's entry
	leaves generator -> producerSem -> process -> stack -> generator: a cycle
	that is collected when nothing outside it refers to the generator, and
	that resumes normally when something does -- Semaphore>>signal reaches
	_scheduleProcess:, which files a process whose onQueue is nil straight on
	the ready queue.

	THE INVARIANT this relies on: nothing terminates, suspends or resumes a
	parked producer.  _resumeProcess: and _resumeForTermination: expect a
	semaphore waiter to be in waitingSet and raise ('bad waiting state')
	when it is not.  Grail only ever SIGNALS producerSem, and a finished body
	returns off the end of its block; a future close-by-terminate would have
	to re-file the process first.  Only a waiter on OUR semaphore is touched:
	a body blocked on anything else (a lock, a socket, a Delay) is a running
	body in the middle of its own business, and stays where the kernel put
	it."

	| q |
	done ifTrue: [^ self].
	proc == nil ifTrue: [^ self].
	proc waitingOn == producerSem ifFalse: [^ self].
	proc _isSuspended ifTrue: [^ self].
	(q := proc onQueue) == nil ifTrue: [^ self].
	ProcessorScheduler scheduler _remove: proc fromSet: q.
	proc _onQueue: nil

]

{ #category : 'Grail-Private' }
PythonGenerator >> _forkBody [
	"Start the producer process.  Every exception that leaves the body --
	GeneratorExit included -- is stowed for the consumer rather than handled
	here.

	GeneratorExit used to be swallowed at this level, on the reasoning that
	close() shuts down silently.  That is true of close(), but it is the
	CONSUMER's distinction to make, not the body's: ``gen.throw(GeneratorExit())''
	must PROPAGATE the GeneratorExit out of throw(), while ``gen.close()''
	absorbs it and answers None.  Swallowing it here erased the difference, so
	throw(GeneratorExit()) reported the generator's exhaustion (StopIteration)
	instead of the exception the caller threw -- test_close_and_throw_work's
	``throw GeneratorExit'' subtest, and four of its neighbours.  close() now
	absorbs it explicitly, which is the only place that knows it asked."

	started := true.
	proc := [
		"Which generator this process is the body of, so a lookup can find the
		Python THREAD it runs for: the process blocked resuming it, and that
		one's, and so on (importlib class >> ___pythonThreadOf___:).  A
		generator's body is not a thread of its own in Python."
		GsProcess @env0:current @env0:environmentAt: #'GrailPyGenerator' put: self.
		[
			[returnValue := block value: self]
				on: AbstractException
				do: [:ex |
					"An exception raised INSIDE the generator body runs
					on the FORKED process -- letting it escape here kills
					the whole session instead of reaching the consumer.
					Stow it; send:/throw: re-signal it on the CONSUMER
					process (CPython: the exception propagates out of
					next()).  test_heapq's
					test_merge_does_not_suppress_index_error is exactly
					this contract."
					escapedException := ex.
					"Take the frames captured HERE, on the forked process: they
					are the only record of where inside the generator the raise
					happened, and re-signalling on the consumer would otherwise
					keep them and lose the consumer's half instead (§9.12)."
					"The PAYLOAD's, when ex is a carrier: that is the object
					the consumer will catch and walk, so a stash keyed by the
					carrier was never read -- a bare ``raise'' out of the body's
					own except clause escapes as one, and so does an exception
					thrown in with throw()/athrow() that the body lets pass.

					Then the carrier's own capture goes too.  It is the
					generator side's, and ___payloadOf___: hands a carrier's
					capture to a payload that has none -- which, just stashed,
					this payload has not.  The consumer's re-signal unwraps the
					carrier on its way out, so leaving it would give the payload
					THIS side's frames a second time in place of the consumer's:
					``[f@yield, body@raise]'' where CPython reports
					``[body@raise]''."
					BaseException ___stashGeneratorStack___:
						(BaseException ___payloadOf___: ex).
					ex _gsStack: nil.
					ex return: nil]
		] ensure: [
			done := true.
			consumerSem signal]
	] fork.

]

{ #category : 'Grail-Private' }
PythonGenerator >> _initWithBlock: aBlock [
	"aBlock is a 1-arg Block ``[:gen | ...generator body...]``.
	Construction is lazy: the body doesn''t run until the first advance."

	block := aBlock.
	consumerSem := Semaphore new.
	producerSem := Semaphore new.
	value := nil.
	done := false.
	returnValue := None.
	started := false.
	sentValue := nil.
	injectedException := nil.
	running := false.

]

{ #category : 'Grail-Iterator Protocol' }
PythonGenerator >> do: aBlock [
	"Smalltalk iteration protocol — walk the generator via send: until
	StopIteration, calling aBlock with each yielded value.  Used by
	YieldFromAst's ``yield from'' codegen, which emits
	``<iter> @env0:do: [:each | ___gen___ ___yield___: each]'' so
	any Smalltalk-side iterable (Array, OrderedCollection, ...) and
	any Python-side iterator (PythonGenerator) both flow through the
	same call shape.  Compiled env-0 to match the codegen's
	``@env0:do:'' send."

	"``send: None'' rather than ``__next__'': behaviourally identical for a
	generator (__next__ IS send(None)), but this is the INTERNAL delegation
	path -- ``yield from'' and the Smalltalk-side enumerators come through
	here -- and PythonCoroutine / PythonAsyncGenerator override __next__ to
	refuse Python-protocol iteration (CPython: a coroutine is not an
	iterator).  Routing through send: keeps the refusal at the protocol
	boundary without severing the delegation underneath it, which the
	@types.coroutine ``yield from coro'' pattern still needs."
	[
		[aBlock value: (self @env1:send: None)] repeat
	] on: StopIteration do: [:___ex___ | ^ self]

]
