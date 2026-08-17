! ------------------- Superclass check
run
PythonGenerator ifNil: [self error: 'PythonGenerator is not defined. Check file ordering.'].
%

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

set compile_env: 1

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__await__
	"``await x'' consults x.__await__(), which answers an ITERATOR that the
	driver steps.  A coroutine is its own iterator, exactly as a generator is."

	^ self
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
