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
		[aBlock @env0:value: (self @env1:__next__)] @env0:repeat
	] @env0:on: StopIteration do: [:___ex___ | ^ self]
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
			[[returnValue := block @env0:value: self]
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
					ex @env0:return: nil]
		] @env0:ensure: [
			done := true.
			consumerSem @env0:signal]
	] @env0:fork.
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

	^ self @env1:send: None
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
			TypeError @env1:___signal___:
				'can''t send non-None value to a just-started generator'
		].
		self @env0:_forkBody.
	] ifTrue: [
		done ifTrue: [StopIteration @env1:___signal___: returnValue].
		sentValue := aValue.
		injectedException := nil.
		producerSem @env0:signal.
	].
	consumerSem @env0:wait.
	done ifTrue: [
		escapedException @env0:== nil ifFalse: [
			| ex |
			ex := escapedException.
			escapedException := nil.
			^ ex @env0:signal].
		StopIteration @env1:___signal___: returnValue].
	^ value
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
		^ anException @env0:signal
	].
	done ifTrue: [^ anException @env0:signal].
	injectedException := anException.
	sentValue := nil.
	producerSem @env0:signal.
	consumerSem @env0:wait.
	done ifTrue: [
		"Body finished — normal completion raises StopIteration; an
		exception that bubbled out of the body (stowed by _forkBody)
		re-signals on THIS (consumer) process."
		escapedException @env0:== nil ifFalse: [
			| ex |
			ex := escapedException.
			escapedException := nil.
			^ ex @env0:signal].
		StopIteration @env1:___signal___: returnValue
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
		RuntimeError @env1:___signal___: 'generator ignored GeneratorExit'
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
		^ ex @env0:signal
	].
	sent := sentValue ifNil: [None].
	sentValue := nil.
	^ sent
%

set compile_env: 0
