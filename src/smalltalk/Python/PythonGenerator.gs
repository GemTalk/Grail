! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PythonGenerator class definition
expectvalue /Class
doit
PythonInstance subclass: 'PythonGenerator'
  instVarNames: #( block proc consumerSem producerSem value done returnValue started sentValue injectedException escapedException running consumerProcess codeThunk codeObject frameObject )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonGenerator comment:
'Runtime representation of a Python generator function''s call result.

A function containing ``yield`` (or ``yield from``) doesn''t run its
body when called — it returns a generator object that lazily produces
values on each ``next()``.  Grail implements this via a coroutine: the
function body runs in a forked GsProcess, and a pair of Semaphores
synchronises the consumer (``__next__``/``send``/``throw``/``close``)
with the producer (``___yield___:``).

State:
  * block              — a 1-arg Block ``[:gen | ... gen ___yield___: v ...]``.
                         Receives the generator instance so the body
                         can yield through it; closes over the outer
                         method''s self/locals.
  * proc               — the forked GsProcess running ``block``,
                         or nil before the first advance.
  * consumerSem        — signalled by the producer when a new value
                         is available (or when ``done`` flips true).
  * producerSem        — signalled by the consumer to wake the
                         producer after each value is read.
  * value              — the most recently yielded value.
  * done               — true once the body has finished.
  * returnValue        — the body''s implicit return value (PEP 380).
  * started            — false until the first advance.
  * sentValue          — the value to inject into the producer''s
                         yield expression on the next resume; set by
                         ``send:``, consumed by ``___yield___:``.
  * injectedException  — an exception to raise inside the producer
                         at the suspended yield point; set by
                         ``throw:`` / ``close``, raised by
                         ``___yield___:``.
  * running            — true while the body is executing, i.e. between
                         a consumer resuming it and the producer
                         yielding back.  Python''s ``gi_running``, and
                         the guard that makes re-entering a generator a
                         ValueError instead of a deadlock.
  * consumerProcess    — the GsProcess that last resumed this generator,
                         and so the one blocked on ``consumerSem`` while
                         the body runs.  Nothing in the generator
                         protocol needs it; a live STACK WALK does.  The
                         body''s own capture ends at the fork, so this
                         is the only link from a running generator back
                         to the frames waiting on it — see
                         BaseException class>>___liveFrameSections___:.
  * codeThunk          — a niladic block building this generator''s code
                         object (gi_code / cr_code / ag_code), emitted at
                         the call site from what the compiler knew about
                         the def.  nil for a generator no def produced
                         (generator expressions, Smalltalk-built helpers).
  * codeObject         — the PyCode codeThunk built, memoized on the
                         first gi_code read.
  * frameObject        — the PyFrame gi_frame answers while the body has
                         not finished; dropped when it does, because
                         CPython''s gi_frame is None after completion.

__name__ / __qualname__ are DYNAMIC instVars, stamped at creation by
withBlock:name:qualname:code: and freely reassignable afterwards — which
is CPython''s contract for them (test_async_gen_api_01 reassigns both).'
%

expectvalue /Class
doit
PythonGenerator category: 'Grail-Modules'
%

removeallmethods PythonGenerator
removeallclassmethods PythonGenerator

set compile_env: 0

category: 'Grail-Iterator Protocol'
method: PythonGenerator
do: aBlock
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
%

category: 'Grail-Private'
method: PythonGenerator
_initWithBlock: aBlock
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
%

category: 'Grail-Private'
method: PythonGenerator
_forkBody
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
					BaseException ___stashGeneratorStack___: ex.
					ex return: nil]
		] ensure: [
			done := true.
			consumerSem signal]
	] fork.
%

category: 'Grail-Private'
method: PythonGenerator
___consumerProcess___
	"The GsProcess blocked on consumerSem waiting for this generator, or nil
	before the first resume.

	Read only by the live stack walk (BaseException
	class>>___liveFrameSections___:), which needs somewhere to continue when a
	generator body's own capture runs out at the fork.  Compiled env 0: its one
	caller is Smalltalk, and it is deliberately NOT a Python attribute -- a
	GsProcess is not something Python code should be handed."

	^ consumerProcess
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: PythonGenerator
withBlock: aBlock
	"Wrap aBlock as a fresh generator.  No work happens until the
	first advance — Python semantics."

	| gen |
	gen := self @env0:new.
	gen @env0:_initWithBlock: aBlock.
	^ gen
%

category: 'Grail-Private'
classmethod: PythonGenerator
withBlock: aBlock name: aName qualname: aQualname code: aCodeThunk
	"withBlock:, carrying the identity CPython stamps on the object at call
	time: the def's name and qualified name (stored as the dynamic instVars
	__name__ / __qualname__, so they read AND reassign through the ordinary
	attribute path), and a niladic block that builds the code object on the
	first gi_code read -- a thunk because most generators are never asked for
	their code, so the per-call cost stays three pointer stores.

	aCodeThunk may be nil (generator expressions, Smalltalk-built helpers):
	those have no def to describe, and gi_code answers the honest
	AttributeError rather than inventing a code object."

	| gen |
	gen := self withBlock: aBlock.
	aName @env0:ifNotNil: [gen @env0:dynamicInstVarAt: #'__name__' put: aName].
	aQualname @env0:ifNotNil: [gen @env0:dynamicInstVarAt: #'__qualname__' put: aQualname].
	gen ___setCodeThunk___: aCodeThunk.
	^ gen
%

category: 'Grail-Private'
method: PythonGenerator
___setCodeThunk___: aBlockOrNil
	codeThunk := aBlockOrNil
%

category: 'Grail-Iterator Protocol'
method: PythonGenerator
__iter__
	"Generators are their own iterators."

	^ self
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
gi_running
	"Python's ``gen.gi_running'' — True while this generator's body is
	executing.  A debugger reads it, and so does test_yield_from's
	test_delegating_generators_claim_to_be_running_with_close, which checks it
	from inside a sub-iterator's close() while the delegator is mid-resume."

	^ running @env0:ifTrue: [True] ifFalse: [False]
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
gi_suspended
	"Python's ``gen.gi_suspended'' (3.12+) — True when the body has started,
	is not currently executing, and has not finished: parked at a yield.
	inspect.getgeneratorstate consults this BEFORE gi_frame, which is what
	lets the four states come out right without a real interpreter frame."

	^ (started == true and: [running ~~ true and: [done ~~ true]])
		@env0:ifTrue: [True] ifFalse: [False]
%

category: 'Grail-Private'
method: PythonGenerator
___pyKindWords___
	"How CPython's runtime messages name this kind of object: 'generator',
	'coroutine', 'async generator' — the SPACED spelling; the underscored
	``async_generator'' is the type name, this is the prose.  Measured against
	CPython 3.14 for all four families this feeds: the just-started send
	TypeError, 'already executing', 'ignored GeneratorExit', and PEP 479's
	'raised StopIteration'."

	^ 'generator'
%

category: 'Grail-Private'
method: PythonGenerator
___codeObjectOrSignal___: anAttrName
	"The code object the call site described, built on first read and then
	memoized — CPython's gi_code is one object for the generator's lifetime,
	and inspect masks flags off it repeatedly.  With no thunk there is no def
	to describe, so the read raises the same AttributeError an object without
	the attribute would, named for the SPELLING the caller used (gi_code /
	cr_code / ag_code)."

	codeObject @env0:ifNil: [
		codeThunk @env0:ifNil: [
			^ AttributeError ___signal___:
				('''' @env0:, (bytes ___pyTypeNameOf___: self)
					@env0:, ''' object has no attribute '''
					@env0:, anAttrName @env0:, '''')].
		codeObject := codeThunk @env0:value].
	^ codeObject
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
__reduce_ex__: aProtocol
	"copy.copy, copy.deepcopy and pickle all funnel through
	``x.__reduce_ex__(protocol)'', and CPython refuses the whole lazy-call
	family with ``TypeError: cannot pickle 'coroutine' object'' (measured;
	generator / async_generator / coroutine_wrapper spell their own names).
	A generator IS its suspended state -- a forked GsProcess here -- and no
	reduction can be honest about that, so the refusal is the contract
	(test_coroutines' test_copy).  Inherited by the coroutine and
	async-generator subclasses; the type name makes each message right."

	^ TypeError ___signal___:
		('cannot pickle ''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object')
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
gi_code
	"Python's ``gen.gi_code'' — the code object of the def whose call made
	this generator."

	^ self ___codeObjectOrSignal___: 'gi_code'
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
gi_frame
	"Python's ``gen.gi_frame'' — None once the body has finished, a frame
	object until then.  CPython's tests lean on exactly that None-flip
	(test_cr_frame_after_close), and inspect's state functions read only the
	None-ness, never the contents.

	The frame is Grail's lightweight PyFrame carrier: f_code the real code
	object, f_lineno the def's first line, f_back None — which is also what
	CPython answers for a SUSPENDED frame, whose back-pointer exists only
	while the frame is on a stack.  What it does not carry is a locals
	mapping or the advancing line of the parked body; that is live-frame
	work (BaseException's stack machinery) and belongs with it."

	done @env0:ifTrue: [frameObject := nil. ^ None].
	frameObject @env0:ifNil: [ | code lineno |
		code := codeThunk @env0:ifNil: [None] ifNotNil: [self gi_code].
		lineno := code == None
			ifTrue: [0]
			ifFalse: [(code @env0:dynamicInstVarAt: #'co_firstlineno')
				@env0:ifNil: [0]].
		frameObject := PyFrame @env0:code: code lineno: lineno back: None globals: None].
	^ frameObject
%

category: 'Grail-Iterator Protocol'
method: PythonGenerator
__next__
	"Advance to the next yield, equivalent to ``send(None)``."

	^ self send: None
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
send: aValue
	"Resume the generator.  The yielded expression in the suspended
	body evaluates to ``aValue`` (so Python ``x = yield`` receives
	the sent value).  Raises StopIteration when the body finishes.

	Python rule: sending a non-None value to a just-started generator
	is a TypeError — the first ``yield`` has nothing to return into."

	| ___savedState___ |
	self ___checkNotRunning___.
	___savedState___ := self ___captureConsumerState___.
	"Recorded on EVERY resume, because the resumer can differ from one to the
	next, and recorded HERE rather than after the fork: from this point on this
	process does not yield until it blocks on consumerSem, so the body can never
	observe a stale value."
	consumerProcess := GsProcess @env0:current.
	started ifFalse: [
		aValue == None ifFalse: [
			TypeError ___signal___:
				('can''t send non-None value to a just-started '
					@env0:, self ___pyKindWords___)
		].
		running := true.
		self @env0:_forkBody.
	] ifTrue: [
		done ifTrue: [^ self ___resumeFinishedWith___: nil].
		sentValue := aValue.
		injectedException := nil.
		running := true.
		producerSem @env0:signal.
	].
	[consumerSem @env0:wait] @env0:ensure: [running := false. self ___restoreConsumerState___: ___savedState___].
	done ifTrue: [
		escapedException == nil ifFalse: [^ self _signalEscapedException].
		^ self ___signalExhausted___].
	^ value
%

category: 'Grail-Private'
method: PythonGenerator
___resumeFinishedWith___: anExceptionOrNil
	"A consumer resuming a body that has ALREADY finished -- send/next with
	nil, throw with the exception it wanted injected.  Generators answer the
	iterator protocol: a bare StopIteration for a send (value None -- the
	return value was delivered by the FIRST completion only, see
	___signalExhausted___), the thrown exception for a throw.

	PythonCoroutine overrides BOTH answers into one RuntimeError -- CPython
	issue 25887's 'cannot reuse already awaited coroutine' -- because a
	coroutine is awaited once, and silently re-answering StopIteration is
	exactly how a double-await bug turns into a truncated result instead of
	an error.  close() does not come through here; closing a finished body
	stays quiet for every kind."

	anExceptionOrNil @env0:ifNil: [^ StopIteration ___signalReturn___: returnValue].
	^ self _raiseThrown: anExceptionOrNil
%

category: 'Grail-Private'
method: PythonGenerator
___signalExhausted___
	"Raise the StopIteration that reports the body has finished, carrying its
	return value -- ONCE.

	CPython delivers a generator's return value with the first StopIteration
	only; the generator is exhausted afterwards, so every later next() raises a
	bare ``StopIteration()'' whose value is None.  Grail kept answering the
	stored returnValue forever, so a second next() on a finished generator
	re-reported the value -- which is what
	TestInterestingEdgeCases.assert_stop_iteration checks after each close /
	throw (``self.assertIsNone(caught.exception.value)'')."

	| rv |
	rv := returnValue.
	returnValue := None.
	^ StopIteration ___signalReturn___: rv
%

category: 'Grail-Private'
method: PythonGenerator
_signalEscapedException
	"Re-signal, on the CONSUMER process, the exception that escaped the generator
	body (stowed by _forkBody, which runs on the forked producer) -- applying
	PEP 479.

	A StopIteration that escapes a generator BODY is a bug: it is
	indistinguishable from the generator's own ``I am exhausted'' signal, so it
	would silently truncate the consumer's loop instead of surfacing.  PEP 479
	replaces it with RuntimeError('generator raised StopIteration'), chained onto
	the StopIteration as both __cause__ and __context__ with
	__suppress_context__ set -- exactly ``raise RuntimeError(...) from ex''
	(test_generator_stop TestPEP479).

	The generator's NORMAL termination does NOT come through here: send: / throw:
	signal that themselves with ``StopIteration ___signalReturn___: returnValue'' when
	no exception escaped.  Nor does a StopIteration that the body CATCHES, or the
	one ``yield from'' consumes to end a delegation -- neither escapes the body."

	| ex err msg |
	"UNWRAP FIRST.  What escaped may be a CARRIER -- the throwaway
	___signalCarrying___: raises when the payload cannot be signalled directly,
	which is exactly the case here: gen.throw(value) is normally called while
	value is IN FLIGHT (contextlib's __exit__ runs inside the with-statement's
	own handler), so the payload has live frames and travels wrapped.
	Both uses below need the payload, and the __cause__ one is load-bearing:

	    except RuntimeError as exc:
	        if isinstance(value, StopIteration) and exc.__cause__ is value:
	            return False

	is how _GeneratorContextManager.__exit__ recognises the PEP 479 wrapper
	around the very StopIteration it threw in, and declines to swallow it.
	Chaining the carrier made that test False, so __exit__ re-raised the
	RuntimeError and ``with cm(): raise StopIteration('x')'' surfaced
	``generator raised StopIteration'' instead of the StopIteration.
	The isKindOf: test needs it too -- a carrier for a StopIteration payload is
	itself a StopIteration, but relying on that would be relying on an
	implementation detail of how carriers pick their class."
	ex := BaseException @env0:___payloadOf___: escapedException.
	escapedException := nil.
	(ex @env0:isKindOf: StopIteration) ifFalse: [^ self _raiseThrown: ex].
	msg := self ___pyKindWords___ @env0:, ' raised StopIteration'.
	err := RuntimeError ___new___.
	err ___args___: { msg }.
	err ___setCause___: ex context: ex.
	^ err ___signal___: msg
%

category: 'Grail-Private'
method: PythonGenerator
_raiseThrown: ex
	"Raise ex on THIS process -- the consumer -- keeping the object Python holds.

	Every generator path that has to surface an exception the consumer will see
	comes through here: one thrown in with gen.throw(), one that escaped the
	body, and one re-raised at a suspension point.

	This used to be ``(self _resignalable: ex) signal'', which COPIED an
	exception that still carried live handler frames, because the VM refuses to
	signal one that does (6011).  The copy signalled cleanly and matched the same
	``except'', so it looked right -- and silently broke object identity, which
	CPython requires and which contextlib depends on:
	_GeneratorContextManager.__exit__ is ``if exc is not value: raise'', so a
	copy made every @contextmanager decide the exception was a NEW one and
	re-raise it. That is test_with's ExceptionalTestCase cluster, and it reached
	every ``with'' over a @contextmanager that sees an exception.

	A CARRIER settles it: the payload is never signalled, so it never acquires
	frames and identity is free.  ___payloadOf___: keeps a re-raise of an
	already-carried exception flat instead of nesting carriers.

	It also removes the cross-PROCESS half of the problem.  #pass -- the other
	identity-preserving option -- is an operation on the current process's
	handler chain, and a generator body runs on a forked producer, so there was
	nothing in flight on the consumer to continue.  A carrier is an ordinary
	#signal here, so the process boundary stops being special.

	A CLASS is signalled directly: ``gen.throw(ValueError)'' passes a class, and
	a class has no identity to preserve and cannot carry a payload."

	(ex @env0:isKindOf: Behavior) ifTrue: [^ ex @env0:signal].
	^ BaseException @env0:___signalCarrying___: (BaseException @env0:___payloadOf___: ex)
%

category: 'Grail-Private'
method: PythonGenerator
_resignalable: ex
	"``ex'' if it can be signaled again, else a clean copy of it.

	An exception instance carries its live handler frames in INDEXED slots
	appended to its named ones, and the VM refuses -- uncontinuably, error
	6011 ``Exception has already been signaled'' -- to signal one that still
	has them.  Catching an exception and returning normally pops them, so the
	usual stow-then-re-signal works on the same object.  But an exception that
	was PASSED on its way out (``[...] on: X do: [:e | e pass]'') keeps one
	frame's worth, and Grail emits exactly that: RaiseAst compiles a bare
	Python ``raise'' inside an ``except'' to ``___ex pass'', and
	ComprehensionAst re-passes anything that is not StopIteration.  So

	    def g():
	        try:    raise ValueError('boom')
	        except ValueError:  raise
	        yield 1

	stowed a passed ValueError, and re-signaling it on the consumer replaced
	the user's catchable ValueError with an UncontinuableError that no Python
	``except'' -- and no SUnit test -- could handle.

	``copy'' answers an instance of the same class with the named AND dynamic
	instance variables (messageText, args, __cause__, __context__, ...) but
	none of the stale frames, so it signals cleanly and still matches the same
	``except'' clauses.  It is a last resort, not the default: Python
	propagates the identical object, and every path that can keep it does.

	The isKindOf: guard keeps this to exception INSTANCES: throw: also accepts
	an exception CLASS (Python's ``gen.throw(ValueError)''), and a class must
	never be copied."

	^ ((ex @env0:isKindOf: AbstractException)
		@env0:and: [ex @env0:_basicSize @env0:> 0])
			ifTrue: [ex @env0:copy]
			ifFalse: [ex]
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
throw: aType _: aValue
	"The deprecated multi-arg signature -- see ___throwLegacy___:value:."

	^ self ___throwLegacy___: aType value: aValue
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
throw: aType _: aValue _: aTb
	"The deprecated three-arg signature.  The traceback argument is accepted
	and ignored -- CPython attaches it to the raised exception, but the
	exception's own travel through the generator machinery rebuilds the
	traceback either way."

	^ self ___throwLegacy___: aType value: aValue
%

category: 'Grail-Private'
method: PythonGenerator
___throwLegacy___: aType value: aValue
	"``gen.throw(type, value, tb)'' -- the pre-3.12 spelling, still honoured
	by CPython with a DeprecationWarning (measured, 3.14: 'the (type, exc,
	tb) signature of throw() is deprecated, use the single-arg signature
	instead.').  Normalisation is CPython's: value None means construct the
	type bare; an exception INSTANCE is thrown as-is; anything else becomes
	the type's argument.

	The warning goes through the vendored warnings machinery UNGUARDED, so
	assertWarns sees it (test_func_10) and -- just as important -- a
	``simplefilter('error')'' promotion RAISES it out of throw() exactly as
	CPython's does.  A blanket rescue here would silently swallow that
	promotion.  Only the module lookup is defensive, for the bootstrap
	window before warnings exists."

	self ___warnLegacySignatureOf___: 'throw'.
	^ self throw: (self ___normalizedLegacyExc___: aType value: aValue)
%

category: 'Grail-Private'
method: PythonGenerator
___coercedThrowArg___: anException
	"The single-arg throw form accepts an exception CLASS as well as an
	instance -- ``gen.throw(SyntaxError)'' instantiates it bare,
	un-deprecated and used by test_asyncgen's anext crosstests.  Anything
	that is neither is CPython's TypeError.  Shared with PyAsyncGenASend,
	whose own guards must see the coerced form (its unstarted-aclose special
	case tests isKindOf: GeneratorExit, which a CLASS argument would dodge)."

	(anException @env0:isKindOf: BaseException) ifTrue: [^ anException].
	((anException @env0:isKindOf: Behavior)
		@env0:and: [anException @env0:inheritsFrom: BaseException])
		ifTrue: [^ anException @env1:___pyCallValue___: { } kw: nil].
	^ TypeError @env1:___signal___:
		('exceptions must be classes or instances deriving from BaseException, not '
			@env0:, (bytes ___pyTypeNameOf___: anException))
%

category: 'Grail-Private'
method: PythonGenerator
___warnLegacySignatureOf___: aMethodName
	"CPython 3.14's wording, parameterised only by the method name --
	athrow's is identical text with 'athrow' in it (measured)."

	(Python @env0:at: #warnings otherwise: nil) @env0:ifNotNil: [:wm |
		wm @env1:instance
			___warn___: ('the (type, exc, tb) signature of ' @env0:, aMethodName
				@env0:, '() is deprecated, use the single-arg signature instead.')
			category: (Python @env0:at: #DeprecationWarning otherwise: nil)
			stacklevel: 1]
%

category: 'Grail-Private'
method: PythonGenerator
___normalizedLegacyExc___: aType value: aValue
	"CPython's normalisation for the deprecated multi-arg signatures: value
	None constructs the type bare, an exception INSTANCE travels as-is,
	anything else becomes the type's argument."

	^ aValue == None
		ifTrue: [aType @env1:___pyCallValue___: { } kw: nil]
		ifFalse: [
			(aValue @env0:isKindOf: BaseException)
				ifTrue: [aValue]
				ifFalse: [aType @env1:___pyCallValue___: { aValue } kw: nil]]
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
___pyHasStarted___
	"Whether the BODY has ever been resumed -- PyAsyncGenASend's just-started
	guard reads this on its generator."

	^ started == true
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
throw: anException
	"Inject anException at the suspended yield point.  If the
	generator''s body catches it and yields again, return that
	value; if the exception bubbles out, propagate it; if the
	body completes normally, raise StopIteration."

	| ___savedState___ ___exc___ |
	___exc___ := self ___coercedThrowArg___: anException.
	self ___checkNotRunning___.
	started ifFalse: [
		"Throwing on a not-yet-started generator just raises in the
		caller — the body hasn''t reached a yield point to inject at."
		done := true.
		^ self _raiseThrown: ___exc___
	].
	done ifTrue: [^ self ___resumeFinishedWith___: ___exc___].
	___savedState___ := self ___captureConsumerState___.
	consumerProcess := GsProcess @env0:current.
	injectedException := ___exc___.
	sentValue := nil.
	running := true.
	producerSem @env0:signal.
	[consumerSem @env0:wait] @env0:ensure: [running := false. self ___restoreConsumerState___: ___savedState___].
	done ifTrue: [
		"Body finished — normal completion raises StopIteration; an
		exception that bubbled out of the body (stowed by _forkBody)
		re-signals on THIS (consumer) process, PEP 479 applied."
		escapedException == nil ifFalse: [^ self _signalEscapedException].
		"A GeneratorExit that was THROWN and that the body then swallowed by
		returning still propagates: PEP 342 suppresses the StopIteration, not
		the GeneratorExit.  ``inner'' catching the exit and returning a value
		must therefore surface as the thrown GeneratorExit, not as
		StopIteration(returned) -- test_close_and_throw_return's ``throw
		GeneratorExit'' subtest.  The return value is discarded with it, so a
		later next() reports a plain exhausted generator."
		(___exc___ @env0:isKindOf: GeneratorExit) ifTrue: [
			returnValue := None.
			^ self _raiseThrown: ___exc___].
		^ self ___signalExhausted___
	].
	^ value
%

category: 'Grail-Private'
method: PythonGenerator
___captureConsumerState___
	"The consumer's exception bookkeeping, saved across a resume of the generator
	body: its ``currently-handled exception'' (CPython sys.exc_info()) AND the
	handler depth / try-token stack.

	All of it lives in SESSION-wide SessionTemps slots, but all of it is really a
	property of one thread of execution, and a generator is a second one: the body
	runs on a forked process and can SUSPEND while an exception of its own is
	being handled -- inside an ``except'', or inside a ``finally'' that yields.
	Whatever it left in those slots then belongs to the generator, not to the
	consumer that just got control back.

	Without the save/restore pair the leak is visible in both halves:

	  * the CURRENT EXCEPTION -- a body that yields from inside its ``finally''
	    during close() leaves the GeneratorExit installed, so the ``generator
	    ignored GeneratorExit'' RuntimeError that close() then raises picks it up
	    as __context__, where CPython chains nothing at all (PEP 342,
	    test_close_and_throw_yield);

	  * the HANDLER STACK -- two coroutines both parked inside
	    ``except BlockingIOError: await ...'' (the canonical asyncio retry idiom,
	    and the shape of every socket coroutine in the event loop) unwind each
	    other's bookkeeping.  One is then left with its own try token still on the
	    stack, so every later clause of that try is shielded from then on and the
	    next exception escapes UNCAUGHT -- ``except BaseException'' included.  See
	    BaseException >> ___captureHandlerState___.

	___yield___: does the mirror-image save/restore for the body, so each side
	keeps its own."

	^ { BaseException @env0:___currentException___ .
		BaseException @env0:___captureHandlerState___ }
%

category: 'Grail-Private'
method: PythonGenerator
___restoreConsumerState___: anArray
	"Reinstate the consumer's exception bookkeeping after the generator body has
	yielded control back.  See ___captureConsumerState___."

	BaseException @env0:___setCurrentException___: (anArray @env0:at: 1).
	BaseException @env0:___restoreHandlerState___: (anArray @env0:at: 2)
%

category: 'Grail-Private'
method: PythonGenerator
___probeDelegationAttr___: anIterator named: aName
	"Look aName up on a sub-iterator through the PYTHON attribute protocol,
	purely for its side effects.

	PEP 380's expansion writes ``_m = _i.throw'' / ``_i.send'' -- a genuine
	getattr -- and the distinction from a Smalltalk method-dictionary probe
	matters for an object with a __getattr__ hook: the hook RUNS, and an
	exception it raises propagates instead of being read as ``no such
	attribute''.  test_broken_getattr_handling's sub-iterator raises
	ZeroDivisionError from __getattr__ and expects to see it.

	___respondsTo___ cannot see any of that, so callers use it as the fast path
	and fall back here when it misses.  A genuine absence is swallowed: the
	caller already knows what to do about it, and the two cases differ (a
	missing ``send'' is an AttributeError, a missing ``throw'' re-raises in the
	delegator)."

	^ [anIterator @env1:___pyAttrLoad___: aName @env0:asSymbol]
		@env0:on: AttributeError
		do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Private'
method: PythonGenerator
___closeDelegate___: anIterator
	"Close the sub-iterator of a delegation that is being shut down -- CPython's
	gen_close_iter.

	PEP 380 writes the close half as ``try: _c = _i.close / except
	AttributeError: pass / else: _c()'', so a sub-iterator without a close is
	simply skipped.  What the PEP does not say, and CPython's implementation
	does, is what happens when that ATTRIBUTE LOOKUP raises something other than
	AttributeError -- an object with a __getattr__ hook that fails.

	It cannot propagate.  We are here because a GeneratorExit is already
	unwinding the delegating generator, and that GeneratorExit has to carry on
	out of this body for close() to answer None; replacing it would turn
	``gen.close()'' into a raise.  Nor can the exception simply be dropped:
	silence is what test_yield_from's test_broken_getattr_handling saw, and it
	is a failure the user has no way to learn about.

	So CPython calls PyErr_FormatUnraisable, and so does this: the exception goes
	to sys.unraisablehook -- reported by default, observable by a test that
	installs its own hook -- and the close is skipped.

	The FORMAT variant, not the plain one, is what 3.14 uses here, and the two
	fill the hook's argument differently: PyErr_FormatUnraisable puts the message
	in ``err_msg'' and leaves ``object'' None, where PyErr_WriteUnraisable does
	the reverse.  A hook that prints ``args.object'' would print None either way
	if this got it backwards, so the message carries the sub-iterator's repr."

	| closer |
	"Fast path: a sub-iterator with a real Smalltalk-visible close, which is
	every generator and every Grail-compiled Python class defining one."
	(anIterator ___respondsTo___: #'close') ifTrue: [^ anIterator @env1:close].
	closer := [self ___probeDelegationAttr___: anIterator named: 'close']
		@env0:on: AbstractException
		do: [:ex |
			(sys instance)
				@env1:___callUnraisableHook___: (BaseException @env0:___payloadOf___: ex)
				object: nil
				errMsg: ('Exception ignored while closing generator '
					@env0:, (self ___safeReprOf___: anIterator)).
			ex @env0:return: nil].
	closer @env0:isNil ifTrue: [^ nil].
	^ closer @env1:value: #() value: nil
%

category: 'Grail-Private'
method: PythonGenerator
___safeReprOf___: anObject
	"repr(anObject) for a message that is being built DURING an unwind.

	Guarded because the object we are describing is one whose attribute access
	has already failed once: __repr__ is found on the type rather than through
	__getattr__, so it normally still works, but a class that breaks it too must
	not turn a report into a second exception."

	^ [(((Python @env0:at: #builtins) instance) @env1:repr: anObject) @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: '<unprintable object>']
%

category: 'Grail-Private'
method: PythonGenerator
___checkNotRunning___
	"Guard every consumer entry point against re-entering a generator that is
	already executing -- Python's ``ValueError: generator already executing''.

	Without it the re-entry DEADLOCKED rather than raising: the consumer
	signalled producerSem and then waited on consumerSem, but the ``producer''
	it was waiting for is the very process doing the waiting, so nothing could
	ever signal back and the scheduler reported the whole session deadlocked.
	``yield from gi'' inside gi is the direct case (test_attempted_yield_from_loop),
	and delegation makes it easy to reach indirectly: one() delegates to two(),
	which delegates back to one() (test_delegating_generators_claim_to_be_running)."

	running @env0:ifTrue: [
		^ ValueError ___signal___:
			(self ___pyKindWords___ @env0:, ' already executing')]
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
close
	"Politely shut the generator down by injecting GeneratorExit
	at the suspended yield point.  No-op if not started or already
	finished.  Raises RuntimeError if the body catches GeneratorExit
	and yields again — per Python."

	| ___savedState___ |
	started ifFalse: [
		done := true.
		^ None
	].
	done ifTrue: [^ None].
	self ___checkNotRunning___.
	___savedState___ := self ___captureConsumerState___.
	consumerProcess := GsProcess @env0:current.
	injectedException := GeneratorExit @env0:new.
	sentValue := nil.
	running := true.
	producerSem @env0:signal.
	[consumerSem @env0:wait] @env0:ensure: [running := false. self ___restoreConsumerState___: ___savedState___].
	done ifFalse: [
		RuntimeError ___signal___:
			(self ___pyKindWords___ @env0:, ' ignored GeneratorExit')
	].
	"PEP 342: close() SUPPRESSES a StopIteration, so a body that caught the
	GeneratorExit and returned a value leaves an exhausted generator, not one
	holding that value.  Dropping it here makes the later next() report
	``StopIteration'' with value None, as CPython does
	(test_close_and_throw_return)."
	returnValue := None.
	"The body is now finished.  Absorb the GeneratorExit this method itself
	injected -- close() answers None rather than re-raising what it asked for --
	but let any OTHER exception the body raised on its way out propagate, which
	is what CPython's gen.close() does (test_close_and_throw_raise_exception
	throws from a ``finally'' during the close and expects to see it).
	_forkBody no longer discriminates, so the choice is made here."
	escapedException @env0:isNil ifFalse: [
		(escapedException @env0:isKindOf: GeneratorExit)
			ifTrue: [escapedException := nil]
			ifFalse: [^ self _signalEscapedException]].
	^ None
%

category: 'Grail-Yield Protocol'
method: PythonGenerator
___yield___: aValue
	"Called from the generator body for ``yield aValue``.  Hands
	control back to the consumer and blocks until the next resume.

	Resume semantics:
	  * ``injectedException`` set (by throw / close) → re-raise here
	    so the yield-expression call site sees the exception.
	  * ``sentValue`` set (by send: with a non-None value) → return
	    it as the yield-expression value.
	  * otherwise → return None (the implicit value for plain next)."

	| sent bodyExc bodyHandlers |
	value := aValue.
	"The body's own exception bookkeeping, kept across the suspension -- the
	mirror of ___captureConsumerState___.  A generator may yield from inside an
	``except'' or a ``finally'', and the consumer that runs meanwhile will install
	(and restore) its own; without this the body would resume seeing the
	consumer's.

	Both halves matter, and the handler stack is the half that bites hardest,
	because a coroutine IS a generator: ``except BlockingIOError: await ...'' is
	an ordinary suspension inside a handler, so two coroutines doing it at once
	unwind each other's token stacks and one of them ends up permanently shielded
	against its own later clauses.  See BaseException >> ___captureHandlerState___.

	Captured BEFORE the signal and restored immediately after the wait, so the
	window in which the other side is running is exactly the window in which its
	own state is installed."
	bodyExc := BaseException @env0:___currentException___.
	bodyHandlers := BaseException @env0:___captureHandlerState___.
	consumerSem @env0:signal.
	producerSem @env0:wait.
	BaseException @env0:___setCurrentException___: bodyExc.
	BaseException @env0:___restoreHandlerState___: bodyHandlers.
	injectedException ifNotNil: [
		| ex |
		ex := injectedException.
		injectedException := nil.
		sentValue := nil.
		^ self _raiseThrown: ex
	].
	sent := sentValue ifNil: [None].
	sentValue := nil.
	^ sent
%

category: 'Grail-Yield Protocol'
method: PythonGenerator
___subIterAdvance___: it
	"One next() on a delegation sub-iterator.  For the generator family this
	is ``send: None'' directly -- __next__ IS send(None) for a generator, and
	the coroutine/async-generator subclasses REFUSE __next__ (Python-protocol
	iteration), while delegation must still drive them.  Everything else gets
	the ordinary protocol send."

	^ (it @env0:isKindOf: PythonGenerator)
		ifTrue: [it @env1:send: None]
		ifFalse: [it @env1:__next__]
%

category: 'Grail-Yield Protocol'
method: PythonGenerator
___yieldFrom___: anIterable
	"Called from the generator body for ``yield from anIterable'' -- PEP 380
	delegation.  Answers the sub-iterator's return value, which is what the
	``yield from'' EXPRESSION evaluates to.

	This is PEP 380's own formal expansion, transcribed.  ``self'' is the
	DELEGATING generator, so ``self ___yield___: y'' is the expansion's
	``yield _y'': it suspends this generator and hands y straight to the
	consumer.  Everything the consumer then does at that suspension point --
	send, throw, close -- arrives back here as the value or the exception of
	that same ___yield___:, and is forwarded to the sub-iterator.  That
	forwarding is the whole point of delegation, and is what makes the
	delegating generator TRANSPARENT.

	What it replaces: YieldFromAst used to open-code ``for x in it: yield x''.
	That forwards values outward and nothing inward, so the four ways a
	delegation is observable all failed --

	  * send()  resumed the DELEGATOR and dropped the value; the sub-generator
	    saw None (test_delegation_of_send).
	  * throw() raised in the delegator instead of at the sub-generator's
	    suspension point (test_delegating_throw).
	  * close() closed the delegator without closing the sub-generator, so its
	    ``finally'' never ran (test_delegating_close).
	  * the expression's value was hardcoded None instead of the
	    sub-generator's return (test_generator_return_value).

	Sub-iterators need not be generators: ``yield from [1, 2]'' is legal, so
	send/throw/close are forwarded only when the sub-iterator actually has
	them.  Per PEP 380 a missing ``close'' is ignored, while a missing
	``throw'' re-raises in the delegator, and a non-None send() to something
	with no ``send'' raises AttributeError -- which is precisely
	test_attempting_to_send_to_non_generator's contract."

	| it y result finished sent raised |
	"TWO REFUSALS AT THE DELEGATION BOUNDARY, both measured against CPython
	3.14 and both keyed on WHO is delegating:

	  * ``yield from <coroutine>'' inside a generator that is neither a
	    coroutine nor @types.coroutine-marked is CPython's
	    'cannot ''yield from'' a coroutine object in a non-coroutine
	    generator' (test_func_7).  The marked case is legal -- it is how
	    await is built -- and Grail reads the mark the decorator's wrapper
	    stamps on each result generator (types.py).  await itself arrives
	    here with SELF the awaiting coroutine, so it passes untouched.
	  * an ASYNC GENERATOR operand is not sync-iterable at all --
	    ''async_generator'' object is not iterable -- for every delegator;
	    the family-direct fast path below would otherwise bypass the
	    __iter__ refusal and hand out PyAsyncYield carriers."
	(anIterable @env0:isKindOf: PythonAsyncGenerator) ifTrue: [
		^ TypeError @env1:___signal___:
			'''async_generator'' object is not iterable'].
	(anIterable @env0:isKindOf: PythonCoroutine) ifTrue: [
		"The allowed delegators: a coroutine (await is BUILT on this path), an
		ASYNC GENERATOR (its body's own awaits arrive here with self the
		asyncgen), and a @types.coroutine-marked generator.  Only a plain
		unmarked generator is refused, which is exactly CPython's flag test."
		((self @env0:isKindOf: PythonCoroutine)
			@env0:or: [(self @env0:isKindOf: PythonAsyncGenerator)
			@env0:or: [(self @env0:dynamicInstVarAt: #'_grail_iterable_coroutine') == True]])
			ifFalse: [
				^ TypeError @env1:___signal___:
					'cannot ''yield from'' a coroutine object in a non-coroutine generator']].
	"A generator-family operand IS its own sub-iterator, taken directly --
	NOT through __iter__.  This mirrors CPython, where GET_AWAITABLE never
	calls iter() on a coroutine and iter(gen) is gen: PythonCoroutine and
	PythonAsyncGenerator refuse Python-protocol __iter__/__next__ (a
	coroutine is not iterable), and this delegation path must keep working
	underneath that refusal -- it is what ``await'' and the @types.coroutine
	``yield from coro'' pattern run on.  ___subIterAdvance___: makes the same
	distinction for each advance."
	it := (anIterable @env0:isKindOf: PythonGenerator)
		ifTrue: [anIterable]
		ifFalse: [anIterable @env1:__iter__].
	result := None.
	finished := false.
	"The priming advance.  An already-empty sub-iterator finishes the
	delegation before this generator ever suspends -- ``yield from ()'' must
	not yield."
	[y := self ___subIterAdvance___: it]
		@env0:on: StopIteration
		do: [:ex | finished := true. result := ex @env1:value. ex @env0:return: nil].
	[finished] @env0:whileFalse: [
		raised := nil.
		sent := nil.
		"Suspend.  Returns the sent value, or raises what the consumer threw."
		[sent := self ___yield___: y]
			@env0:on: AbstractException
			do: [:ex | raised := ex. ex @env0:return: nil].
		raised @env0:isNil ifTrue: [
			"Resumed normally: advance the sub-iterator, forwarding the sent
			value.  next() and send(None) are distinct in CPython only in that
			send(None) requires a send method; PEP 380 uses next() for None."
			[sent == None
				ifTrue: [y := self ___subIterAdvance___: it]
				ifFalse: [
					"PEP 380 forwards a non-None send() with _i.send(_s), so a
					sub-iterator without one raises AttributeError naming
					``send'' -- ``yield from range(3)'' then gi.send(42) is
					test_attempting_to_send_to_non_generator.  Raised
					explicitly, because the bare env-1 send would otherwise
					surface as an uncatchable MessageNotUnderstood."
					(it ___respondsTo___: #'send:') @env0:ifFalse: [
						self ___probeDelegationAttr___: it named: 'send'.
						^ AttributeError ___signal___: '''' @env0:,
							(bytes ___pyTypeNameOf___: it) @env0:,
							''' object has no attribute ''send'''].
					y := it @env1:send: sent]]
				@env0:on: StopIteration
				do: [:ex |
					finished := true.
					result := ex @env1:value.
					ex @env0:return: nil]
		] ifFalse: [
			(raised @env0:isKindOf: GeneratorExit) ifTrue: [
				"close(): shut the sub-iterator down first (running its
				``finally''), then let GeneratorExit carry on out of this body so
				_forkBody can retire the delegator."
				self ___closeDelegate___: it.
				^ (self _resignalable: raised) @env0:signal].
			"throw(): re-raise at the SUB-generator's suspension point.  If it
			catches and yields again, that value becomes the next value we
			yield; if it returns, the delegation ends with its return value; if
			it does not catch, the exception propagates out of here."
			(it ___respondsTo___: #'throw:') ifFalse: [
				"PEP 380 looks ``throw'' up as an ATTRIBUTE and re-raises in the
				delegator only when that lookup says AttributeError.  Consulting
				the attribute protocol (rather than stopping at the Smalltalk
				probe above) is what lets a __getattr__ hook run and its own
				exception propagate -- test_broken_getattr_handling."
				self ___probeDelegationAttr___: it named: 'throw'.
				^ (self _resignalable: raised) @env0:signal].
			[y := it @env1:throw: raised]
				@env0:on: StopIteration
				do: [:ex |
					finished := true.
					result := ex @env1:value.
					ex @env0:return: nil]]].
	^ result
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___grailAwait___: anObject
	"``await anObject'' from inside a coroutine body.  CPython's GET_AWAITABLE
	followed by its send/yield loop -- which is PEP 492's own definition of
	await: it REUSES yield-from's delegation machinery rather than having any of
	its own.  So this is a two-line method over ___yieldFrom___:, and that is
	the point.

	WHAT IT FIXES, and it is the difference between having an event loop and not
	being able to have one.  ``await'' used to be driven by the CLASS-side
	PythonCoroutine >> ___grailAwait___:, which had no reference to the awaiting
	coroutine and so could only run the awaited thing INLINE to completion.  It
	also drove only objects that were already generator-shaped and passed
	everything else through untouched, so a custom awaitable never had its
	__await__ consulted at all:

	    class Sleeper:
	        def __await__(self):
	            yield ''suspend-me''      # how a loop parks a task
	            return ''resumed''

	    async def f():
	        return await Sleeper()      # evaluated to the Sleeper OBJECT

	``self'' here is the AWAITING coroutine -- AwaitAst passes ``___gen___'',
	the same wrapper parameter ``yield'' uses -- so delegating makes a
	suspension inside anObject suspend THIS coroutine too, handing the yielded
	value out to whoever is driving.  That is the whole mechanism an event loop
	runs on: asyncio.Future.__await__ is ``yield self'', the loop receives the
	future at its own send() and resumes the coroutine when it resolves.  A
	runtime that cannot propagate that yield out through nested awaits cannot
	host a loop no matter how much of asyncio sits on top, which is why nothing
	suspended before this and why vendoring asyncio would not have helped.

	Delegation also gets send / throw / close forwarding for free, and those are
	not optional decoration: cancellation is throw() arriving at the innermost
	suspension point, and a loop shutting down is close() running each
	coroutine''s ``finally''.  ___yieldFrom___: already implements all of it,
	faithfully, and reusing it is what keeps await and yield-from from drifting
	apart.

	A COROUTINE IS ITS OWN AWAITABLE -- PythonCoroutine >> __await__ answers
	self, as a generator''s __iter__ does -- so the first branch could route
	through __await__ too.  It is kept separate because it is the hot path (an
	ordinary ``await other_coro()'') and because it must not depend on a
	subclass leaving __await__ alone.

	ANYTHING ELSE IS NOW CPython's TypeError -- ``'X' object can't be
	awaited''.  The pass-through this replaces was deliberate and RECORDED:
	shipped library code (jinja2, asgiref, flask) awaited values Grail
	resolved synchronously, back when the inspect predicates were stubs and
	the libraries' own isawaitable guards took the wrong branches.  The
	predicates are honest now (PR #661), the guards work, and the canaries --
	Flask / asgi SUnit suites, the full curated corpus -- run clean with the
	strict clause.  Same lesson as the predicates themselves: the leniency
	outlived its reason.

	The one leniency KEPT, deliberately: a plain generator is accepted where
	CPython wants CO_ITERABLE_COROUTINE.  Grail's types.coroutine is an
	identity decorator (see its docstring), so a decorated and an undecorated
	generator are indistinguishable here, and rejecting both would break
	every legitimate @types.coroutine user in the corpus.

	The __await__ RESULT is validated on the way through -- CPython's two
	messages, coroutine first, because a Grail coroutine IS iterator-shaped
	and the non-iterator test alone would let it through."

	(anObject @env0:isKindOf: PythonGenerator) ifTrue: [
		"An async generator is not awaitable -- CPython:
		''async_generator'' object can't be awaited -- and must be told apart
		HERE, before the family branch delegates: ___yieldFrom___: would
		refuse it too, but with iteration's wording, and await's is the one
		this expression earns."
		(anObject @env0:isKindOf: PythonAsyncGenerator) ifTrue: [
			^ TypeError @env1:___signal___:
				'''async_generator'' object can''t be awaited'].
		((anObject @env0:isKindOf: PythonCoroutine)
			and: [anObject ___isMidAwait___])
			ifTrue: [
				"issue 25887's OTHER half: a coroutine parked at a suspension
				point belongs to whoever is driving it, so a second await must
				refuse rather than steal the resume (test_await_15).  A
				RUNNING one falls through -- send: answers CPython's
				'coroutine already executing' for that."
				^ RuntimeError ___signal___: 'coroutine is being awaited already'].
		^ self ___yieldFrom___: anObject].
	(anObject ___respondsTo___: #'__await__') ifTrue: [
		^ self ___yieldFrom___:
			(self ___checkedAwaitIterator___: (anObject @env1:__await__))].
	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: anObject)
			@env0:, ''' object can''t be awaited')
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___checkedAwaitIterator___: anIterator
	"What __await__ answered, validated as CPython's GET_AWAITABLE validates
	it: a coroutine is rejected by name (its own message, and checked FIRST,
	because a Grail coroutine responds to __next__ and would slip past the
	iterator test), then anything that is not an iterator is rejected naming
	its type.  Both messages verbatim from CPython 3.14."

	(anIterator @env0:isKindOf: PythonCoroutine) ifTrue: [
		^ TypeError ___signal___: '__await__() returned a coroutine'].
	(self ___isRealIterator___: anIterator) ifFalse: [
		^ TypeError ___signal___:
			('__await__() returned non-iterator of type '''
				@env0:, (bytes ___pyTypeNameOf___: anIterator) @env0:, '''')].
	^ anIterator
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___isRealIterator___: anObject
	"CPython's PyIter_Check is a TYPE-SLOT test, and ___respondsTo___: cannot
	stand in for it here: PythonInstance defines a FALLBACK __next__/__iter__
	pair that every user-class instance inherits, so the presence probe
	answers true about EVERYTHING -- which is how test_await_13's
	self-returning awaitable (a class defining only __await__) slipped past
	the non-iterator check and failed later with the wrong message.  Real
	means the class chain defines __next__ BELOW the PythonInstance fallback,
	or a class attribute supplies one (the _operator_fallbacks idiom).

	Known edge, accepted: a user class defining __next__ but not __iter__
	passes here (as in CPython, which needs only tp_iternext of an __await__
	result), but the delegation's PEP 380 iter() step will still ask it for
	__iter__.  No corpus code and no CPython test exercises that shape."

	| defining |
	defining := anObject @env0:class
		@env0:whichClassIncludesSelector: #'__next__' environmentId: 1.
	defining @env0:isNil ifTrue: [^ false].
	(defining @env0:name @env0:asString @env0:= 'PythonInstance') ifTrue: [
		^ (anObject ___classAttrDunder___: #'__next__') @env0:notNil].
	^ true
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___grailAwaitAwith___: anObject from: aMethodName
	"``async with'' awaiting what __aenter__ / __aexit__ answered.  The same
	acceptance as ___grailAwait___: -- a coroutine or generator-shaped result
	delegates, an __await__-bearing one is validated and driven -- but the
	rejection is CPython's async-with wording, naming the METHOD whose result
	was not awaitable, because by the __aexit__ case the body has already run
	and ``'int' object can't be awaited'' would point at nothing the reader
	can see.  AsyncWithAst emits the two spellings below; message verbatim
	from CPython 3.14 (test_with_6 / test_with_8)."

	(anObject @env0:isKindOf: PythonGenerator) ifTrue: [
		^ self ___yieldFrom___: anObject].
	(anObject ___respondsTo___: #'__await__') ifTrue: [
		^ self ___yieldFrom___:
			(self ___checkedAwaitIterator___: (anObject @env1:__await__))].
	^ TypeError ___signal___:
		('''async with'' received an object from ' @env0:, aMethodName
			@env0:, ' that does not implement __await__: '
			@env0:, (bytes ___pyTypeNameOf___: anObject))
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___grailAwaitAenter___: anObject
	^ self ___grailAwaitAwith___: anObject from: '__aenter__'
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___grailAwaitAexit___: anObject
	^ self ___grailAwaitAwith___: anObject from: '__aexit__'
%

category: 'Grail-Coroutine Protocol'
method: PythonGenerator
___grailAwaitAnext___: anObject
	"Await what __anext__ answered, inside an ``async for''.  AsyncForAst emits
	this rather than ___grailAwait___:, and the ONLY difference is that this one
	REFUSES a non-awaitable instead of passing it through.

	WHY THE PERMISSIVENESS HAS TO STOP HERE, and it is not a matter of taste.
	___grailAwait___: answers a non-awaitable unchanged, deliberately: shipped
	library code awaits values Grail resolves synchronously, and a TypeError
	there would break working paths.  In an ``async for'' the same leniency is
	fatal, because the loop's only exit is StopAsyncIteration -- so an
	__anext__ that answers something inert makes the loop spin forever,
	allocating every turn:

	    class I:
	        def __aiter__(self): return self
	        def __anext__(self): return ()     # not an awaitable

	CPython raises TypeError.  Grail bound ``()'' as the item and went round
	again, and test_coroutines' test_for_4 took the whole module from FAILING to
	CRASHING -- ``VM temporary object memory is full, too many markSweeps since
	last successful scavenge'', 0 tests reported.  A quiet wrong value is a bug;
	an unbounded loop is a different kind of thing, and it is worth one extra
	check on the iteration path to make it impossible.

	Message is CPython's verbatim."

	(anObject @env0:isKindOf: PythonGenerator) ifTrue: [
		^ self ___yieldFrom___: anObject].
	(anObject ___respondsTo___: #'__await__') ifTrue: [ | it |
		"An __await__ that RAISES makes the __anext__ result just as invalid
		as one that is missing, and CPython says so with the same TypeError,
		chaining what actually went wrong as __cause__ -- test_for_11 divides
		by zero inside __await__ and asserts both the wording and the cause."
		it := [anObject @env1:__await__]
			@env0:on: AbstractException
			do: [:ex | | payload terr msg |
				payload := BaseException @env0:___payloadOf___: ex.
				msg := '''async for'' received an invalid object from __anext__: '
					@env0:, (bytes ___pyTypeNameOf___: anObject).
				terr := TypeError ___new___.
				terr ___args___: { msg }.
				terr ___setCause___: payload context: payload.
				terr ___signal___: msg].
		^ self ___yieldFrom___: (self ___checkedAwaitIterator___: it)].
	^ TypeError ___signal___:
		('''async for'' received an invalid object from __anext__: '
			@env0:, (bytes ___pyTypeNameOf___: anObject))
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PythonGenerator
___pythonValueAttrs___
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
		yourself
%

set compile_env: 1

category: 'Grail-String Representation'
method: PythonGenerator
__repr__
	"CPython: ``<generator object f at 0x...>'' — the TYPE name (so the
	coroutine and async-generator subclasses read right through the type-name
	remap), the QUALIFIED name, and id() in hex.  The qualname — not __name__:
	reassigning __name__ alone leaves the repr unchanged, measured on CPython
	3.14 — is read from the same dynamic instVar assignment writes, so
	``g.__qualname__ = 'x''' shows up here, as upstream.  A generator with no
	stamped identity (a Smalltalk-built helper) omits the name part; the
	``<generator object at 0x...>'' that leaves still satisfies every shape
	CPython's tests match reprs with."

	| stream q |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: (bytes ___pyTypeNameOf___: self).
	stream @env0:nextPutAll: ' object'.
	q := self @env0:dynamicInstVarAt: #'__qualname__'.
	(q @env0:isKindOf: CharacterCollection) @env0:ifTrue: [
		stream @env0:nextPutAll: ' '.
		stream @env0:nextPutAll: q @env0:asString].
	stream @env0:nextPutAll: ' at 0x'.
	stream @env0:nextPutAll:
		(self @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
