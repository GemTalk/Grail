Extension { #name : 'PythonCoroutine' }

{ #category : 'Grail-Finalization' }
PythonCoroutine class >> ___closeCapture___: aMark [
	"A warnings capture is closing (CatchWarnings >> __exit__): deliver the
	never-awaited warning for a coroutine made inside it and dropped there
	undriven, BEFORE it stops recording.

	Why it is needed at all: CPython destroys a dropped coroutine at the drop,
	by reference counting, so its warning lands in whatever capture was open
	-- ``with assertWarns(RuntimeWarning): frame = f().cr_frame'' holds on that
	alone (test_bpo_45813_1).  Grail's destructor runs at a collection, and
	only a full mark-sweep mourns an ephemeron (measured: a scavenge does not),
	so without this the warning arrives after the capture that should see it.

	What it costs, by case (measured, per capture):
	  * no coroutine made inside -- nothing to look at;
	  * coroutines made and started (awaited, closed) -- a look at each of
	    THOSE, and only those: not the session's whole backlog of pending
	    watches, which a first version scanned and which grows between
	    collections;
	  * one still undriven -- a full collection (gc.collect()), which is what
	    finds out whether it was dropped.  A coroutine the program merely KEEPS
	    unstarted across the capture pays that and warns about nothing; that
	    is the trade, recorded in docs/Issues.md.

	The list is dropped when the outermost capture closes, and bounded in case
	a capture is abandoned without closing."

	| temps recent depth found |
	temps := SessionTemps @env0:current.
	recent := temps @env0:at: #'GrailCaptureCoroutines' otherwise: nil.
	recent == nil ifTrue: [^ self].
	found := false.
	(aMark @env0:+ 1) @env0:to: recent @env0:size do: [:i |
		found ifFalse: [
			((recent @env0:at: i) @env0:referent ___isUndrivenCoroutine___)
				ifTrue: [found := true]]].
	depth := (temps @env0:at: #'GrailCaptureDepth' otherwise: 1) @env0:- 1.
	temps @env0:at: #'GrailCaptureDepth' put: depth.
	depth @env0:<= 0 ifTrue: [temps @env0:removeKey: #'GrailCaptureCoroutines' ifAbsent: []].
	found ifTrue: [WeakReference @env1:_collect]

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine class >> ___grailAiter___: anObject [
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

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine class >> ___grailAnext___: anIterator [
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

]

{ #category : 'Grail-Docstrings' }
PythonCoroutine class >> ___methodDocTable___ [
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

]

{ #category : 'Grail-Finalization' }
PythonCoroutine class >> ___noteCreatedInCapture___: aWatch [
	"Record a new coroutine's watch while a warnings capture is open.  Outside
	one, this is a single SessionTemps read."

	| recent |
	aWatch == nil ifTrue: [^ self].
	recent := SessionTemps @env0:current @env0:at: #'GrailCaptureCoroutines' otherwise: nil.
	recent == nil ifTrue: [^ self].
	recent @env0:size @env0:>= 100000 ifTrue: [recent @env0:removeAll: recent @env0:copy].
	recent @env0:addLast: aWatch

]

{ #category : 'Grail-Finalization' }
PythonCoroutine class >> ___openCapture___ [
	"A warnings capture is opening (CatchWarnings >> __enter__).  While any is
	open, withBlock: records each new coroutine's WATCH -- the ephemeron, never
	the coroutine, which must stay free to die -- so the capture can ask, as it
	closes, about exactly the coroutines made inside it.  Answers the mark
	that capture hands back to ___closeCapture___:."

	| temps recent |
	temps := SessionTemps @env0:current.
	recent := temps @env0:at: #'GrailCaptureCoroutines' otherwise: nil.
	recent == nil ifTrue: [
		recent := OrderedCollection @env0:new.
		temps @env0:at: #'GrailCaptureCoroutines' put: recent].
	temps @env0:at: #'GrailCaptureDepth'
		put: (temps @env0:at: #'GrailCaptureDepth' otherwise: 0) @env0:+ 1.
	^ recent @env0:size

]

{ #category : 'Grail-Origin Tracking' }
PythonCoroutine class >> ___originOfDepth___: depth [
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

]

{ #category : 'Grail-Origin Tracking' }
PythonCoroutine class >> ___originTrackingDepth___ [
	"sys.get_coroutine_origin_tracking_depth().  Per session -- CPython keeps it
	per thread, and a session is Grail's thread of control."

	^ SessionTemps @env0:current @env0:at: #'GrailCoroutineOriginDepth' otherwise: 0

]

{ #category : 'Grail-Origin Tracking' }
PythonCoroutine class >> ___originTrackingDepth___: anInteger [

	SessionTemps @env0:current @env0:at: #'GrailCoroutineOriginDepth' put: anInteger

]

{ #category : 'Grail-Instance Creation' }
PythonCoroutine class >> withBlock: aBlock [
	"A coroutine, watched for dying undriven -- see the section comment.  The
	action is a clean block: the coroutine travels in the ephemeron's key slot."

	| coro depth |
	coro := super withBlock: aBlock.
	self ___noteCreatedInCapture___:
		(FinalizerEphemeron @env0:on: coro
			do: [:aCoro :unused | aCoro ___finalizeUnawaited___]
			with: nil).
	depth := self ___originTrackingDepth___.
	depth @env0:> 0 ifTrue: [
		coro @env0:dynamicInstVarAt: #'cr_origin' put: (self ___originOfDepth___: depth)].
	^ coro

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___finalizeFromFrameClear___ [
	"frame.clear() finalizes the coroutine on the spot, and an unstarted one
	warns that it was never awaited then and there -- test_bpo_45813_2.

	CPython 3.14's _PyGen_Finalize ONLY warns for an unstarted coroutine; it
	does not close it.  So, measured, the coroutine stays unstarted, cr_frame
	is still a frame, and it warns a second time when it is finally destroyed
	unless something closes it first.  Kept exactly, rather than marking it
	finished as the destructor path does."

	(started == true or: [done == true]) ifTrue: [^ self].
	self ___warnNeverAwaited___

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___finalizeUnawaited___ [
	"The coroutine's destructor, CPython's _PyGen_Finalize for a coroutine: one
	that dies never having been started warns that it was never awaited.  A
	started, finished or closed one is quiet.  Marked finished first, so a
	coroutine the warning resurrects (``source=coro'') cannot warn twice."

	(started == true or: [done == true]) ifTrue: [^ self].
	done := true.
	self ___warnNeverAwaited___

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> ___isMidAwait___ [
	"Parked at a suspension point with a driver mid-flight: started, not
	finished, not currently executing.  What makes ``await c'' on such a c
	CPython's 'coroutine is being awaited already' (test_await_15) -- the
	suspended frame belongs to the FIRST awaiter.  Running is excluded so
	that case keeps its own message ('coroutine already executing')."

	^ started == true and: [done ~~ true and: [running ~~ true]]

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___isUndrivenCoroutine___ [
	"Neither started nor finished: a coroutine that would warn if it died."

	^ started ~~ true and: [done ~~ true]

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___passStackWarning___: anException [
	"The VM's stack warning must reach whoever can act on it -- never swallow
	it in a destructor's guard."

	((anException @env0:isKindOf: AlmostOutOfStack)
		or: [anException @env0:isKindOf: AlmostOutOfStackError])
			ifTrue: [anException @env0:pass]

]

{ #category : 'Grail-Private' }
PythonCoroutine >> ___pyKindWords___ [
	"CPython's runtime messages say 'coroutine' for this kind: 'coroutine
	already executing', 'coroutine raised StopIteration', 'can''t send
	non-None value to a just-started coroutine' (measured, 3.14)."

	^ 'coroutine'

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___qualnameForWarning___ [

	| q |
	q := self @env0:dynamicInstVarAt: #'__qualname__'.
	(q @env0:isKindOf: CharacterCollection) ifFalse: [^ '?'].
	^ q @env0:asString

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___reportUnraisableFinalization___: anException [
	"PyErr_FormatUnraisable(``Exception ignored while finalizing coroutine
	%R''): the message in err_msg, ``object'' None."

	(sys instance)
		@env1:___callUnraisableHook___: (BaseException @env0:___payloadOf___: anException)
		object: nil
		errMsg: ('Exception ignored while finalizing coroutine '
			@env0:, (self ___safeReprOf___: self))

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> ___resumeFinishedWith___: anExceptionOrNil [
	"CPython issue 25887: a coroutine is awaited ONCE.  Resuming a finished
	one -- by send, next, or throw alike -- is the same RuntimeError, where
	the inherited generator answer would quietly re-report StopIteration and
	let a double-await truncate its caller's result.  The first completion
	still delivered the value as StopIteration; only REUSE is refused.
	close() never reaches this and stays quiet (test_func_17 closes twice)."

	^ RuntimeError ___signal___: 'cannot reuse already awaited coroutine'

]

{ #category : 'Grail-Finalization' }
PythonCoroutine >> ___warnNeverAwaited___ [
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

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> __await__ [
	"``await x'' consults x.__await__(), which answers an ITERATOR that the
	driver steps.  CPython answers a coroutine_wrapper here, NOT the coroutine
	-- the distinction became load-bearing the moment the coroutine started
	refusing __iter__/__next__ (a coroutine is not iterable) and the await
	protocol started validating __await__ results (a coroutine result is
	rejected by name).  The wrapper carries the iterator protocol; every
	semantic -- reuse refusal, PEP 479, quiet close -- is the coroutine's own,
	forwarded."

	^ PyCoroutineWrapper @env0:___on___: self

]

{ #category : 'Grail-Protocol Refusal' }
PythonCoroutine >> __iter__ [
	<grailProtocolRefusal>
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

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> __name__ [
	"The coroutine's own __name__ (a per-object value, set at call time and
	reassignable), CPython's getset on the coroutine type.  Defined HERE,
	rather than only inherited, so ``types.CoroutineType.__dict__'' holds a
	``__name__'' entry carrying CPython's doc (``name of the coroutine'',
	___methodDocTable___) -- test_corotype_1 reads it.  The CLASS's own name
	is unaffected: ``types.CoroutineType.__name__'' resolves through the
	metaclass chain, which does not pass through this instance side."

	^ (self @env0:dynamicInstVarAt: #'__name__') @env0:ifNil: [super __name__]

]

{ #category : 'Grail-Protocol Refusal' }
PythonCoroutine >> __next__ [
	<grailProtocolRefusal>
	"next(coro) -- CPython's spelling of the same refusal, measured:
	``TypeError: 'coroutine' object is not an iterator''.  do: no longer
	routes through __next__ (it drives send: directly), so this only fires
	on genuine Python-protocol iteration."

	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object is not an iterator')

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> __qualname__ [
	"As __name__, for the qualified name (``qualified name of the
	coroutine'')."

	^ (self @env0:dynamicInstVarAt: #'__qualname__') @env0:ifNil: [super __qualname__]

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_await [
	"Python's ``coro.cr_await'' -- what this coroutine is suspended on: the
	delegation target while PARKED mid-await, None while the body executes
	(test_cr_await asserts the None from inside the innermost frame and the
	full chain -- coro_b.cr_await.cr_await.gi_code.co_name -- once the
	suspension has propagated out)."

	^ self ___delegationTargetWhenParked___

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_code [
	"Python's ``coro.cr_code'' -- the coroutine spelling of gi_code.  CPython's
	test_func_1 masks CO_COROUTINE off its co_flags directly, which works here
	because the call site's thunk builds the same code expression the def-time
	stamp put on the function."

	^ self ___codeObjectOrSignal___: 'cr_code'

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_frame [
	"Python's ``coro.cr_frame'' -- the coroutine spelling of gi_frame: a frame
	until the body finishes, None afterwards.  test_cr_frame_after_close pins
	exactly that flip."

	^ self gi_frame

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_origin [
	"Where this coroutine was created, or None when origin tracking was off
	(sys.set_coroutine_origin_tracking_depth) at the time."

	^ (self @env0:dynamicInstVarAt: #'cr_origin') @env0:ifNil: [None]

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_running [
	"Python's ``coro.cr_running'' -- the coroutine spelling of gi_running."

	^ self gi_running

]

{ #category : 'Grail-Coroutine Protocol' }
PythonCoroutine >> cr_suspended [
	"Python's ``coro.cr_suspended'' (3.12+), the state inspect.getcoroutinestate
	reads first.  For a Grail coroutine True is reachable only through a body
	that yields into a @types.coroutine delegate; a plain async def runs
	straight through on its first send, CREATED -> CLOSED, never suspended --
	the no-event-loop semantics, not an accident."

	^ self gi_suspended

]
