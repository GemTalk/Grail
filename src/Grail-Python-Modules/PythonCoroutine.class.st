"What calling an ``async def`` answers.

Calling a coroutine function must NOT run its body -- it answers an object that
runs when driven.  That is the same contract the generator machinery already
implements (fork the body, park it, resume on send:), so this shares it: it is a
PyGeneratorBase, a SIBLING of PythonGenerator as CPython's coroutine is of its
generator, with Python's coroutine names on top.  The one behavioural difference upstream --
send() on a coroutine that never suspends runs it to completion and raises
StopIteration carrying the return value -- is exactly what the generator
machinery already does when a body contains no yield.

Grail has NO EVENT LOOP, and this does not add one.  What it adds is the
OBJECT PROTOCOL: a call answers something with send / throw / close /
__await__ instead of the body's value, so code that inspects or drives a
coroutine behaves as CPython's does.  ``await' drives it inline to completion
(AwaitAst); there is nothing to suspend ON, so a coroutine here always runs
straight through.

Consequences worth knowing, all of them CPython-faithful rather than
workarounds:
  * calling an async function and DISCARDING the result now runs none of the
    body, where before it ran all of it.  That is Python's behaviour, and it is
    why frameworks warn about a never-awaited coroutine.
  * an ``async def`` containing ``yield`` is an ASYNC GENERATOR upstream, a
    distinct type Grail does not model.  It answers a coroutine here."
Class {
	#name : 'PythonCoroutine',
	#superclass : 'PyGeneratorBase',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine class >> ___checkAsyncCM___: aManager [
	"CPython's BEFORE_ASYNC_WITH loads BOTH halves of the asynchronous
	context-manager protocol before calling either, reporting a missing
	__aexit__ FIRST -- so ``async with'' on a manager whose __aenter__ exists
	but whose __aexit__ does not must refuse before __aenter__ runs, let
	alone the body (test_with_2 pins body_executed is False).  Grail
	discovered the gap lazily, at whichever call fell through to the raising
	object default, which for that shape surfaced only AFTER the body.

	AsyncWithAst emits this as the with-block's first statement.  The
	presence test is ___definesProtocolMethod___:selectors:, the same probe
	the default fallbacks' message builder uses -- it sees through both
	compilation shapes (a real Smalltalk method of any arity, and the
	dynamic-class-attr store an ``async def'' or a runtime assignment lands
	in) and refuses to count object's own raising defaults."

	((aManager @env1:___definesProtocolMethod___: '__aexit__'
			selectors: #( #'__aexit__:_:_:' #'___aexit__:kw:' #'__aexit__:kw:' #'__aexit__:' ))
		@env0:not)
		ifTrue: [
			^ TypeError @env1:___signal___:
				(aManager @env1:___asyncContextManagerProtocolError___: '__aexit__')].
	((aManager @env1:___definesProtocolMethod___: '__aenter__'
			selectors: #( #'__aenter__' #'___aenter__:kw:' #'__aenter__:kw:' ))
		@env0:not)
		ifTrue: [
			^ TypeError @env1:___signal___:
				(aManager @env1:___asyncContextManagerProtocolError___: '__aenter__')].
	^ aManager

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine class >> ___grailAwait___: anObject [
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

	(anObject @env0:isKindOf: PyGeneratorBase) @env0:ifFalse: [^ anObject].
	^ [anObject @env1:___send___: None. None]
		@env0:on: StopIteration
		do: [:e | e @env0:return: (e @env1:value)]

]

{ #category : 'Grail-Python Attribute Hook' }
PythonCoroutine class >> ___pythonValueAttrs___ [
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
		add: #'cr_origin';
		yourself

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine class >> ___unpackNormalize___: anObject [
	"A tuple-target's unpack source, made safe for the per-element
	__getitem__: reads the unpack emitters produce (ForAst >>
	emitUnpackOn:..., ComprehensionAst >> ___emitUnpack___:...).

	CPython's UNPACK_SEQUENCE is defined by ITERATION.  Grail unpacks by
	subscript for speed, which agrees for the sequences that actually occur
	-- except when the item is not a sequence at all.  Then the honest move
	is to materialise it through the iterator protocol ONCE and unpack the
	result: the VALUES come out in iteration order (a dict item unpacks to
	its KEYS, as upstream, where subscripting did two key lookups), and the
	ERRORS come from the item's own protocol -- ``async for i, j in
	badpairs()'' must surface the StopAsyncIteration(42) its item's __iter__
	raises, not a 'not subscriptable' complaint about the fallback
	(test_coroutines' test_for_assign_raising_stop_async_iteration_2).

	list __new__: follows __iter__ with the legacy __getitem__ walk as its
	own fallback, so every unpackable shape lands in one branch or the
	other.  Emitted with @env0: -- this is a codegen runtime helper, like
	___grailAiter___: beside it."

	(anObject @env0:isKindOf: SequenceableCollection) ifTrue: [^ anObject].
	^ list @env1:__new__: anObject

]
