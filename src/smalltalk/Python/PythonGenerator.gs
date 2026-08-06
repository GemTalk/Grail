! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PythonGenerator class definition
expectvalue /Class
doit
PythonInstance subclass: 'PythonGenerator'
  instVarNames: #( block proc consumerSem producerSem value done returnValue started sentValue injectedException escapedException )
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
                         ``___yield___:``.'
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

	[
		[aBlock value: (self @env1:__next__)] repeat
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
%

category: 'Grail-Private'
method: PythonGenerator
_forkBody
	"Start the producer process.  GeneratorExit is caught at the top
	level so close() can shut down silently without leaving an
	unhandled exception in the forked process."

	started := true.
	proc := [
		[
			[[returnValue := block value: self]
				on: GeneratorExit
				do: [:ex | nil]]
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
					ex return: nil]
		] ensure: [
			done := true.
			consumerSem signal]
	] fork.
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

category: 'Grail-Iterator Protocol'
method: PythonGenerator
__iter__
	"Generators are their own iterators."

	^ self
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

	started ifFalse: [
		aValue == None ifFalse: [
			TypeError ___signal___:
				'can''t send non-None value to a just-started generator'
		].
		self @env0:_forkBody.
	] ifTrue: [
		done ifTrue: [StopIteration ___signal___: returnValue].
		sentValue := aValue.
		injectedException := nil.
		producerSem @env0:signal.
	].
	consumerSem @env0:wait.
	done ifTrue: [
		escapedException == nil ifFalse: [^ self _signalEscapedException].
		StopIteration ___signal___: returnValue].
	^ value
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
	signal that themselves with ``StopIteration ___signal___: returnValue'' when
	no exception escaped.  Nor does a StopIteration that the body CATCHES, or the
	one ``yield from'' consumes to end a delegation -- neither escapes the body."

	| ex err msg |
	ex := escapedException.
	escapedException := nil.
	(ex @env0:isKindOf: StopIteration) ifFalse: [^ (self _resignalable: ex) @env0:signal].
	msg := 'generator raised StopIteration'.
	err := RuntimeError ___new___.
	err ___args___: { msg }.
	err ___setCause___: ex context: ex.
	^ err ___signal___: msg
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
throw: anException
	"Inject anException at the suspended yield point.  If the
	generator''s body catches it and yields again, return that
	value; if the exception bubbles out, propagate it; if the
	body completes normally, raise StopIteration."

	started ifFalse: [
		"Throwing on a not-yet-started generator just raises in the
		caller — the body hasn''t reached a yield point to inject at."
		done := true.
		^ (self _resignalable: anException) @env0:signal
	].
	done ifTrue: [^ (self _resignalable: anException) @env0:signal].
	injectedException := anException.
	sentValue := nil.
	producerSem @env0:signal.
	consumerSem @env0:wait.
	done ifTrue: [
		"Body finished — normal completion raises StopIteration; an
		exception that bubbled out of the body (stowed by _forkBody)
		re-signals on THIS (consumer) process, PEP 479 applied."
		escapedException == nil ifFalse: [^ self _signalEscapedException].
		StopIteration ___signal___: returnValue
	].
	^ value
%

category: 'Grail-Generator Protocol'
method: PythonGenerator
close
	"Politely shut the generator down by injecting GeneratorExit
	at the suspended yield point.  No-op if not started or already
	finished.  Raises RuntimeError if the body catches GeneratorExit
	and yields again — per Python."

	started ifFalse: [
		done := true.
		^ None
	].
	done ifTrue: [^ None].
	injectedException := GeneratorExit @env0:new.
	sentValue := nil.
	producerSem @env0:signal.
	consumerSem @env0:wait.
	done ifFalse: [
		RuntimeError ___signal___: 'generator ignored GeneratorExit'
	].
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

	| sent |
	value := aValue.
	consumerSem @env0:signal.
	producerSem @env0:wait.
	injectedException ifNotNil: [
		| ex |
		ex := injectedException.
		injectedException := nil.
		sentValue := nil.
		^ (self _resignalable: ex) @env0:signal
	].
	sent := sentValue ifNil: [None].
	sentValue := nil.
	^ sent
%

set compile_env: 0
