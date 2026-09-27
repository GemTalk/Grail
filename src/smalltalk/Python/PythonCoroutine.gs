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
method: PyCoroutineWrapper
__reduce_ex__: aProtocol
	"Same refusal as the family it fronts -- ``cannot pickle
	'coroutine_wrapper' object'' (test_copy checks the wrapper too)."

	^ TypeError ___signal___:
		('cannot pickle ''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object')
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
	"Python's ``coro.cr_await'' -- what this coroutine is suspended on: the
	delegation target while PARKED mid-await, None while the body executes
	(test_cr_await asserts the None from inside the innermost frame and the
	full chain -- coro_b.cr_await.cr_await.gi_code.co_name -- once the
	suspension has propagated out)."

	^ self ___delegationTargetWhenParked___
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

category: 'Grail-Coroutine Protocol'
classmethod: PythonCoroutine
___checkAsyncCM___: aManager
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
%

category: 'Grail-Coroutine Protocol'
classmethod: PythonCoroutine
___unpackNormalize___: anObject
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
		add: #'cr_origin';
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

category: 'Grail-Coroutine Protocol'
classmethod: PythonCoroutine
___grailAnext___: anIterator
	"One step of an ``async for'' or an async comprehension: the ``it.__anext__()''
	the loop awaits in the same expression.  AsyncForAst and ComprehensionAst
	emit this, not a bare __anext__ send, for one reason: the step of a real
	async generator can be made WITHOUT the never-awaited watch
	(PyAsyncGenASend class >> ___unwatchedOn___:kind:arg:).  The loop awaits
	it on the spot, so it can never go undriven, and the watch cost ~10% of a
	tight ``async for'' (measured: 2879 vs 3140-3178 ms per 100k steps).
	Anything else gets its own __anext__, exactly as before."

	anIterator @env0:class == PythonAsyncGenerator ifTrue: [
		^ PyAsyncGenASend @env0:___unwatchedOn___: anIterator kind: #'send' arg: None].
	^ anIterator __anext__
%

! ===============================================================================
! The never-awaited warning, and origin tracking
! ===============================================================================
!
! CPython warns when a coroutine is destroyed without ever having been started:
! ``RuntimeWarning: coroutine 'f' was never awaited'' (_PyGen_Finalize, through
! warnings._warn_unawaited_coroutine).  Here the destructor is a
! FinalizerEphemeron, registered by withBlock: -- the one door every coroutine
! comes through -- and run at the next safe point after the coroutine dies:
! gc.collect(), or the next registration.  docs/Issues.md records why this was
! once left out (a watch per coroutine CALL), and the cost it measured at.
!
! With sys.set_coroutine_origin_tracking_depth(n) set, creation also records
! cr_origin: the n innermost (filename, lineno, function) of the creating stack,
! which _warn_unawaited_coroutine renders into the warning.

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: PythonCoroutine
withBlock: aBlock
	"A coroutine, watched for dying undriven -- see the section comment.  The
	action is a clean block: the coroutine travels in the ephemeron's key slot."

	| coro depth |
	coro := super withBlock: aBlock.
	FinalizerEphemeron @env0:on: coro
		do: [:aCoro :unused | aCoro ___finalizeUnawaited___]
		with: nil.
	depth := self ___originTrackingDepth___.
	depth @env0:> 0 ifTrue: [
		coro @env0:dynamicInstVarAt: #'cr_origin' put: (self ___originOfDepth___: depth)].
	^ coro
%

category: 'Grail-Origin Tracking'
classmethod: PythonCoroutine
___originTrackingDepth___
	"sys.get_coroutine_origin_tracking_depth().  Per session -- CPython keeps it
	per thread, and a session is Grail's thread of control."

	^ SessionTemps @env0:current @env0:at: #'GrailCoroutineOriginDepth' otherwise: 0
%

category: 'Grail-Origin Tracking'
classmethod: PythonCoroutine
___originTrackingDepth___: anInteger

	SessionTemps @env0:current @env0:at: #'GrailCoroutineOriginDepth' put: anInteger
%

category: 'Grail-Origin Tracking'
classmethod: PythonCoroutine
___originOfDepth___: depth
	"cr_origin: a tuple of (filename, lineno, function) for the ``depth''
	innermost frames of the stack that is creating the coroutine, innermost
	first, as CPython's compute_cr_origin builds it.

	The live chain's innermost Python frame is the coroutine FUNCTION's own
	method -- in Grail it runs, and answers this object -- where CPython has
	not pushed that frame yet, so it is dropped: the record starts at the
	caller, the line that called the async def."

	| frame out |
	frame := BaseException @env0:___liveFrameChain___.
	(frame @env0:~~ nil and: [frame @env0:~~ None])
		ifTrue: [frame := frame @env0:dynamicInstVarAt: #'f_back'].
	out := OrderedCollection @env0:new.
	[(frame @env0:~~ nil and: [frame @env0:~~ None]) and: [out @env0:size @env0:< depth]]
		whileTrue: [ | code |
			code := frame @env0:dynamicInstVarAt: #'f_code'.
			out @env0:add: (tuple @env0:withAll: {
				code @env0:dynamicInstVarAt: #'co_filename'.
				frame @env0:dynamicInstVarAt: #'f_lineno'.
				code @env0:dynamicInstVarAt: #'co_name' }).
			frame := frame @env0:dynamicInstVarAt: #'f_back'].
	^ tuple @env0:withAll: out
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__name__
	"The coroutine's own __name__ (a per-object value, set at call time and
	reassignable), CPython's getset on the coroutine type.  Defined HERE,
	rather than only inherited, so ``types.CoroutineType.__dict__'' holds a
	``__name__'' entry carrying CPython's doc (``name of the coroutine'',
	___methodDocTable___) -- test_corotype_1 reads it.  The CLASS's own name
	is unaffected: ``types.CoroutineType.__name__'' resolves through the
	metaclass chain, which does not pass through this instance side."

	^ (self @env0:dynamicInstVarAt: #'__name__') @env0:ifNil: [super __name__]
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
__qualname__
	"As __name__, for the qualified name (``qualified name of the
	coroutine'')."

	^ (self @env0:dynamicInstVarAt: #'__qualname__') @env0:ifNil: [super __qualname__]
%

category: 'Grail-Coroutine Protocol'
method: PythonCoroutine
cr_origin
	"Where this coroutine was created, or None when origin tracking was off
	(sys.set_coroutine_origin_tracking_depth) at the time."

	^ (self @env0:dynamicInstVarAt: #'cr_origin') @env0:ifNil: [None]
%

category: 'Grail-Finalization'
method: PythonCoroutine
___finalizeUnawaited___
	"The coroutine's destructor, CPython's _PyGen_Finalize for a coroutine: one
	that dies never having been started warns that it was never awaited.  A
	started, finished or closed one is quiet.  Marked finished first, so a
	coroutine the warning resurrects (``source=coro'') cannot warn twice."

	(started == true or: [done == true]) ifTrue: [^ self].
	done := true.
	self ___warnNeverAwaited___
%

category: 'Grail-Finalization'
method: PythonCoroutine
___finalizeFromFrameClear___
	"frame.clear() finalizes the coroutine on the spot, and an unstarted one
	warns that it was never awaited then and there -- test_bpo_45813_2.

	CPython 3.14's _PyGen_Finalize ONLY warns for an unstarted coroutine; it
	does not close it.  So, measured, the coroutine stays unstarted, cr_frame
	is still a frame, and it warns a second time when it is finally destroyed
	unless something closes it first.  Kept exactly, rather than marking it
	finished as the destructor path does."

	(started == true or: [done == true]) ifTrue: [^ self].
	self ___warnNeverAwaited___
%

category: 'Grail-Finalization'
method: PythonCoroutine
___warnNeverAwaited___
	"CPython's _PyErr_WarnUnawaitedCoroutine, step for step.

	The report goes first through warnings._warn_unawaited_coroutine, read off
	the module NOW, so a program that replaces it is honoured.  It counts as
	having warned if it returns, or if it raised the RuntimeWarning itself (an
	``error'' filter).  Anything it raised cannot propagate out of a destructor,
	so it goes to sys.unraisablehook.  And if it did NOT warn -- it is gone, or
	it raised something else -- the plain warning is issued directly, so a
	broken hook still leaves the user a warning
	(test_unawaited_warning_when_module_broken)."

	| wmClass wm fn warned |
	wmClass := Python @env0:at: #warnings otherwise: nil.
	wmClass == nil ifTrue: [^ self].
	wm := wmClass instance.
	warned := false.
	fn := [wm ___pyAttrLoad___: #'_warn_unawaited_coroutine']
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	fn == nil ifFalse: [
		[fn @env1:value: { self } value: nil.
		 warned := true]
			@env0:on: AbstractException
			do: [:ex |
				self ___passStackWarning___: ex.
				((BaseException @env0:___payloadOf___: ex) @env0:isKindOf: RuntimeWarning)
					ifTrue: [warned := true].
				self ___reportUnraisableFinalization___: ex.
				ex @env0:return: nil]].
	warned ifTrue: [^ self].
	[wm ___warn___: 'coroutine ''' @env0:, self ___qualnameForWarning___
			@env0:, ''' was never awaited'
		category: RuntimeWarning
		stacklevel: 1]
		@env0:on: AbstractException
		do: [:ex |
			self ___passStackWarning___: ex.
			self ___reportUnraisableFinalization___: ex.
			ex @env0:return: nil]
%

category: 'Grail-Finalization'
method: PythonCoroutine
___passStackWarning___: anException
	"The VM's stack warning must reach whoever can act on it -- never swallow
	it in a destructor's guard."

	((anException @env0:isKindOf: AlmostOutOfStack)
		or: [anException @env0:isKindOf: AlmostOutOfStackError])
			ifTrue: [anException @env0:pass]
%

category: 'Grail-Finalization'
method: PythonCoroutine
___reportUnraisableFinalization___: anException
	"PyErr_FormatUnraisable(``Exception ignored while finalizing coroutine
	%R''): the message in err_msg, ``object'' None."

	(sys instance)
		@env1:___callUnraisableHook___: (BaseException @env0:___payloadOf___: anException)
		object: nil
		errMsg: ('Exception ignored while finalizing coroutine '
			@env0:, (self ___safeReprOf___: self))
%

category: 'Grail-Finalization'
method: PythonCoroutine
___qualnameForWarning___

	| q |
	q := self @env0:dynamicInstVarAt: #'__qualname__'.
	(q @env0:isKindOf: CharacterCollection) ifFalse: [^ '?'].
	^ q @env0:asString
%

category: 'Grail-Docstrings'
classmethod: PythonCoroutine
___methodDocTable___
	"CPython 3.14's __doc__ for the coroutine type's methods and name
	descriptors, transcribed from the running interpreter: test_corotype_1
	asserts them (``into coroutine'', ``of the coroutine'').  Read by
	UnboundMethod / BoundMethod >> __doc__ through the class walk, so these win
	over PythonGenerator's generator wording for a coroutine."

	^ (KeyValueDictionary @env0:new)
		@env0:at: 'send' put: 'send(arg) -> send ''arg'' into coroutine,
return next iterated value or raise StopIteration.';
		@env0:at: 'throw' put: 'throw(value)
throw(type[,value[,traceback]])

Raise exception in coroutine, return next iterated value or raise
StopIteration.
the (type, val, tb) signature is deprecated, 
and may be removed in a future version of Python.';
		@env0:at: 'close' put: 'close() -> raise GeneratorExit inside coroutine.';
		@env0:at: '__name__' put: 'name of the coroutine';
		@env0:at: '__qualname__' put: 'qualified name of the coroutine';
		yourself
%

! Leave the compile environment where the rest of the install expects it.  A
! trailing ``set compile_env: 1' leaks into the NEXT file install.gs inputs,
! whose class-definition doit then runs in env 1 and fails with ``Object class
! does not understand #subclass:instVarNames:...'.
set compile_env: 0
