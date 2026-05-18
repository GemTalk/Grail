! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PythonGenerator class definition
expectvalue /Class
doit
PythonInstance subclass: 'PythonGenerator'
  instVarNames: #( block proc consumerSem producerSem value done returnValue started exception )
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
synchronises the consumer (``__next__``) with the producer (``yield``).

State:
  * block         — a 1-arg Block ``[:gen | ... gen ___yield___: v ...]``.
                    Receives the generator instance so the body can
                    yield values through it; closes over the outer
                    method''s self/locals.
  * proc          — the forked GsProcess running ``block``, or nil
                    before the first ``__next__``.
  * consumerSem   — signalled by the producer when a new ``value`` is
                    available (or when ``done`` flips to true).
  * producerSem   — signalled by the consumer to wake the producer
                    after each value is read.
  * value         — the most recently yielded value.
  * done          — true once the body has finished (StopIteration
                    on the next ``__next__``).
  * returnValue   — the body''s implicit return value (Python None
                    unless a ``return v`` in the generator gave one;
                    PEP 380 — attached to the StopIteration).
  * started       — false until the first ``__next__``; the producer
                    is forked there, not at construction.

This is a true Python generator: control returns to the producer
between yields, so the body sees its locals across resume points.
``send()`` / ``throw()`` / ``close()`` aren''t implemented yet —
expand on demand.'
%

expectvalue /Class
doit
PythonGenerator category: 'Grail-Modules'
%

removeallmethods PythonGenerator
removeallclassmethods PythonGenerator

set compile_env: 0

category: 'Grail-Private'
method: PythonGenerator
_initWithBlock: aBlock
	"aBlock is a 1-arg Block ``[:gen | ...generator body...]``.
	Construction is lazy: the body doesn''t run until __next__."

	block := aBlock.
	consumerSem := Semaphore new.
	producerSem := Semaphore new.
	value := nil.
	done := false.
	returnValue := None.
	started := false.
	exception := nil.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: PythonGenerator
withBlock: aBlock
	"Wrap aBlock as a fresh generator.  No work happens until the
	first ``__next__`` — Python semantics."

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
	"Resume the generator until the next ``yield`` or completion.
	Raises StopIteration when the body has finished."

	started ifFalse: [
		"First call: fork the body.  The forked block runs until it
		hits ``___yield___:`` (which signals consumerSem and waits)
		or returns.  We then wait on consumerSem to receive the
		first value (or the done-flag flip).  The block's return
		value (Python ``return v`` after PythonReturn unwinds, or
		None for an implicit fall-off) becomes ``returnValue`` —
		attached to the StopIteration the next ``__next__`` raises
		(PEP 380)."
		started := true.
		proc := [
			[returnValue := block @env0:value: self] @env0:ensure: [
				done := true.
				consumerSem @env0:signal]
		] @env0:fork.
	] ifTrue: [
		done ifTrue: [
				StopIteration @env1:___signal___: returnValue
		].
		"Subsequent call: tell the producer to keep going."
		producerSem @env0:signal.
	].
	consumerSem @env0:wait.
	done ifTrue: [
		StopIteration @env1:___signal___: returnValue
	].
	^ value
%

category: 'Grail-Yield Protocol'
method: PythonGenerator
___yield___: aValue
	"Called from the generator body for ``yield aValue``.  Hands
	control back to the consumer and blocks until the next
	__next__ resumes us."

	value := aValue.
	consumerSem @env0:signal.
	producerSem @env0:wait.
	^ None
%

set compile_env: 0
