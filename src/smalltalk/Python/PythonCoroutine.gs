! ------------------- Superclass check
run
PythonGenerator ifNil: [self error: 'PythonGenerator is not defined. Check file ordering.'].
%

! ------- PyCoroutineWrapper class definition
!
! What ``coro.__await__()'' answers -- CPython's _PyCoroWrapper_Type, a thin
! delegate whose type name is ``coroutine_wrapper''.  It exists because the
! coroutine itself REFUSES the iterator protocol (__iter__/__next__ raise:
! a coroutine is not iterable), while PEP 492 defines ``await x'' for an
! x whose __await__ answers an ITERATOR.  The wrapper is that iterator:
! __iter__ answers self, __next__/send/throw/close forward to the coroutine,
! whose own semantics (reuse refusal, PEP 479, close-is-quiet) come through
! untouched.
!
! Without it, ``return coro.__await__()'' from a custom __await__ handed the
! COROUTINE to GET_AWAITABLE's result check, which rejects a coroutine result
! by name -- test_await_14 broke exactly so -- and run_async__await__'s
! ``next(coro.__await__())'' hit the not-an-iterator refusal (test_await_3,
! test_func_18).  test_func_11 pins the type name in the repr.
expectvalue /Class
doit
Object subclass: 'PyCoroutineWrapper'
  instVarNames: #( coro )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCoroutineWrapper category: 'Grail-Modules'
%

removeallmethods PyCoroutineWrapper
removeallclassmethods PyCoroutineWrapper

! ------- PythonCoroutine class definition
expectvalue /Class
doit
PythonGenerator subclass: 'PythonCoroutine'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonCoroutine comment:
'What calling an ``async def`` answers.

Calling a coroutine function must NOT run its body -- it answers an object that
runs when driven.  That is the same contract PythonGenerator already implements
(fork the body, park it, resume on send:), so this IS a PythonGenerator, with
Python''s coroutine names on top.  The one behavioural difference upstream --
send() on a coroutine that never suspends runs it to completion and raises
StopIteration carrying the return value -- is exactly what the generator
machinery already does when a body contains no yield.

Grail has NO EVENT LOOP, and this does not add one.  What it adds is the
OBJECT PROTOCOL: a call answers something with send / throw / close /
__await__ instead of the body''s value, so code that inspects or drives a
coroutine behaves as CPython''s does.  ``await'' drives it inline to completion
(AwaitAst); there is nothing to suspend ON, so a coroutine here always runs
straight through.

Consequences worth knowing, all of them CPython-faithful rather than
workarounds:
  * calling an async function and DISCARDING the result now runs none of the
    body, where before it ran all of it.  That is Python''s behaviour, and it is
    why frameworks warn about a never-awaited coroutine.
  * an ``async def`` containing ``yield`` is an ASYNC GENERATOR upstream, a
    distinct type Grail does not model.  It answers a coroutine here.'
%

expectvalue /Class
doit
PythonCoroutine category: 'Grail-Modules'
%

removeallmethods PythonCoroutine
removeallclassmethods PythonCoroutine

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyCoroutineWrapper
___on___: aCoroutine
	^ self @env0:new @env0:___setCoro___: aCoroutine
%

category: 'Grail-Private'
method: PyCoroutineWrapper
___setCoro___: aCoroutine
	coro := aCoroutine
%

set compile_env: 1

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
__iter__
	"The wrapper IS the iterator __await__ promised."

	^ self
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
__next__
	^ coro send: None
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
send: aValue
	^ coro send: aValue
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
throw: anException
	^ coro throw: anException
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
throw: aType _: aValue
	^ coro throw: aType _: aValue
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
throw: aType _: aValue _: aTb
	^ coro throw: aType _: aValue _: aTb
%

category: 'Grail-Coroutine Protocol'
method: PyCoroutineWrapper
close
	^ coro close
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__await__
	"``await x'' consults x.__await__(), which answers an ITERATOR that the
	driver steps.  CPython answers a coroutine_wrapper here, NOT the coroutine
	-- the distinction became load-bearing the moment the coroutine started
	refusing __iter__/__next__ (a coroutine is not iterable) and the await
	protocol started validating __await__ results (a coroutine result is
	rejected by name).  The wrapper carries the iterator protocol; every
	semantic -- reuse refusal, PEP 479, quiet close -- is the coroutine's own,
	forwarded."

	^ PyCoroutineWrapper @env0:___on___: self
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_running
	"Python's ``coro.cr_running'' -- the coroutine spelling of gi_running."

	^ self gi_running
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_await
	"Python's ``coro.cr_await'' -- what this coroutine is currently suspended
	on.  Always None: with no event loop there is nothing to suspend on, so a
	coroutine here runs straight through whenever it is driven."

	^ None
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
___resumeFinishedWith___: anExceptionOrNil
	"CPython issue 25887: a coroutine is awaited ONCE.  Resuming a finished
	one -- by send, next, or throw alike -- is the same RuntimeError, where
	the inherited generator answer would quietly re-report StopIteration and
	let a double-await truncate its caller's result.  The first completion
	still delivered the value as StopIteration; only REUSE is refused.
	close() never reaches this and stays quiet (test_func_17 closes twice)."

	^ RuntimeError ___signal___: 'cannot reuse already awaited coroutine'
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
___isMidAwait___
	"Parked at a suspension point with a driver mid-flight: started, not
	finished, not currently executing.  What makes ``await c'' on such a c
	CPython's 'coroutine is being awaited already' (test_await_15) -- the
	suspended frame belongs to the FIRST awaiter.  Running is excluded so
	that case keeps its own message ('coroutine already executing')."

	^ started == true and: [done ~~ true and: [running ~~ true]]
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_code
	"Python's ``coro.cr_code'' -- the coroutine spelling of gi_code.  CPython's
	test_func_1 masks CO_COROUTINE off its co_flags directly, which works here
	because the call site's thunk builds the same code expression the def-time
	stamp put on the function."

	^ self ___codeObjectOrSignal___: 'cr_code'
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_frame
	"Python's ``coro.cr_frame'' -- the coroutine spelling of gi_frame: a frame
	until the body finishes, None afterwards.  test_cr_frame_after_close pins
	exactly that flip."

	^ self gi_frame
%

category: 'Grail-Private'
method: PythonCoroutine
___pyKindWords___
	"CPython's runtime messages say 'coroutine' for this kind: 'coroutine
	already executing', 'coroutine raised StopIteration', 'can''t send
	non-None value to a just-started coroutine' (measured, 3.14)."

	^ 'coroutine'
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_suspended
	"Python's ``coro.cr_suspended'' (3.12+), the state inspect.getcoroutinestate
	reads first.  For a Grail coroutine True is reachable only through a body
	that yields into a @types.coroutine delegate; a plain async def runs
	straight through on its first send, CREATED -> CLOSED, never suspended --
	the no-event-loop semantics, not an accident."

	^ self gi_suspended
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__iter__
	"CPython: a coroutine is NOT iterable -- iter(), for, list(), sum(), a
	comprehension all refuse before running any of the body.  Grail inherited
	the generator's ``^ self'' here, so ``list(coro)'' DROVE the coroutine:
	its body ran, its StopIteration was PEP-479'd into 'coroutine raised
	StopIteration', and test_func_4 saw a RuntimeError where CPython promises
	a TypeError and an untouched body.

	The refusal lives at the PYTHON protocol boundary only: the internal
	delegation paths (await's ___yieldFrom___:, do:, send:) never consult
	__iter__, so awaiting -- and the @types.coroutine ``yield from coro''
	pattern -- are untouched."

	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object is not iterable')
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__next__
	"next(coro) -- CPython's spelling of the same refusal, measured:
	``TypeError: 'coroutine' object is not an iterator''.  do: no longer
	routes through __next__ (it drives send: directly), so this only fires
	on genuine Python-protocol iteration."

	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object is not an iterator')
%


set compile_env: 0

category: 'Grail-Coroutine Protocol'
classmethod: PythonCoroutine
___grailAwait___: anObject
	"``await anObject'' -- drive it and answer its result.  AwaitAst emits this.

	A COROUTINE (or any generator-shaped object) is driven with send(None).  With
	no event loop nothing suspends, so it runs straight through and reports its
	return value as StopIteration''s value, which is what await evaluates to.  An
	exception raised inside the body propagates out of the send, which is also
	what await does.

	ANYTHING ELSE passes through unchanged.  ``await 3'' is not legal Python, but
	it is what Grail did for every await before coroutines existed, and shipped
	library code (jinja2, asgiref, flask) awaits values Grail resolves
	synchronously.  Turning those into a TypeError would break working paths to
	enforce a rule nothing here can benefit from."

	(anObject @env0:isKindOf: PythonGenerator) @env0:ifFalse: [^ anObject].
	^ [anObject @env1:send: None. None]
		@env0:on: StopIteration
		do: [:e | e @env0:return: (e @env1:value)]
%

category: 'Grail-Python Attribute Hook'
classmethod: PythonCoroutine
___pythonValueAttrs___
	"The coroutine spellings, on top of the inherited generator ones.

	cr_running and cr_await PREDATE this hook entry, which means every read of
	them through ___pyAttrLoad___ answered a BoundMethod -- an object that is
	always truthy, so ``coro.cr_running'' claimed running about every coroutine
	it was asked about.  Listing them is what makes the values real."

	^ super ___pythonValueAttrs___
		add: #'cr_running';
		add: #'cr_await';
		add: #'cr_suspended';
		add: #'cr_code';
		add: #'cr_frame';
		yourself
%

! ___grailAiter___: probes with ``___respondsTo___:'', which is an ENV-1
! selector (Object.gs), so this must be compiled in env 1 -- in env 0 the probe
! itself raises MessageNotUnderstood on the very object it is inspecting.
set compile_env: 1

category: 'Grail-Coroutine Protocol'
classmethod: PythonCoroutine
___grailAiter___: anObject
	"``async for x in anObject'' -- CPython's GET_AITER plus the check that
	immediately follows it.  Answers the async ITERATOR the loop will step.
	AsyncForAst emits this once, at loop setup.

	Why a runtime helper rather than a bare ``anObject __aiter__'' send: a
	missing __aiter__ surfaced as an uncatchable Smalltalk
	MessageNotUnderstood -- ``a OrderedCollection class does not understand
	#__aiter__'' -- which aborts the whole evaluation instead of raising
	something Python code can catch.  ``async for v in [1, 2]'' is an ordinary
	programming mistake and has to be an ordinary TypeError.

	BOTH CPython checks live here, because CPython makes both at this point and
	the second is easy to overlook: it validates __anext__ on whatever
	__aiter__ RETURNED, not on the original object.  So an __aiter__ that
	answers the wrong thing (``return 42'') is caught at the loop head, with the
	type of the RETURNED object named, rather than failing per-iteration with a
	confusing message.  Both messages are CPython's verbatim."

	| it |
	(anObject ___respondsTo___: #'__aiter__') @env0:ifFalse: [
		^ TypeError ___signal___:
			('''async for'' requires an object with __aiter__ method, got '
				@env0:, (bytes ___pyTypeNameOf___: anObject))].
	it := anObject @env1:__aiter__.
	(it ___respondsTo___: #'__anext__') @env0:ifFalse: [
		^ TypeError ___signal___:
			('''async for'' received an object from __aiter__ that does not implement __anext__: '
				@env0:, (bytes ___pyTypeNameOf___: it))].
	^ it
%

! Leave the compile environment where the rest of the install expects it.  A
! trailing ``set compile_env: 1' leaks into the NEXT file install.gs inputs,
! whose class-definition doit then runs in env 1 and fails with ``Object class
! does not understand #subclass:instVarNames:...'.
set compile_env: 0
