! ------------------- Superclass check
run
PythonGenerator ifNil: [self error: 'PythonGenerator is not defined. Check file ordering.'].
%

! ------- PyAnextAwaitable class definition
!
! What two-argument ``anext(ait, default)'' answers -- CPython's
! anext_awaitable: an awaitable that delegates to ait.__anext__() and, when
! THAT raises StopAsyncIteration, reports StopIteration carrying the default
! instead, so ``await anext(ait, d)'' evaluates to d at exhaustion.  Nothing
! advances until the caller actually drives it; in particular close() before
! any drive is a quiet no-op (contextlib.closing over an undriven one, which
! is exactly test_await_17's shape).
expectvalue /Class
doit
Object subclass: 'PyAnextAwaitable'
  instVarNames: #( ait defaultValue inner anextResult bareGenOk )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyAnextAwaitable category: 'Grail-Modules'
%

removeallmethods PyAnextAwaitable
removeallclassmethods PyAnextAwaitable

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyAnextAwaitable
___on___: anAsyncIterator default: aDefault
	| inst |
	inst := self new.
	inst ___setAit___: anAsyncIterator default: aDefault.
	^ inst
%

category: 'Grail-Private'
method: PyAnextAwaitable
___setAit___: anAsyncIterator default: aDefault
	"__anext__ is called EAGERLY, at anext() time -- CPython does, and
	test_sync_anext_raises_exception depends on it: an __anext__ that raises
	SYNCHRONOUSLY (StopAsyncIteration included) must surface from the
	anext(ait, default) CALL, not from a later drive.  Only the CALL is
	eager; nothing drives the result until the caller does."

	ait := anAsyncIterator.
	defaultValue := aDefault.
	"CPython tells a @types.coroutine __anext__ from a bare generator one by
	the CO_ITERABLE_COROUTINE flag; Grail's decorator marks EACH RESULT
	GENERATOR through a wrapper (types.py explains why the function-object
	stamp alone was identity-fragile: for a class defined inside a METHOD,
	the object the decorator stamps is not the object a later attribute read
	retrieves -- measured), so the mark is read off the result: a dynamic
	instVar, immune to how the method was retrieved."
	"THROUGH THE ATTRIBUTE PATH, not a bare ``@env1:__anext__'' send: a
	decorated __anext__'s wrapper lives in the class dict, and the direct
	selector send dispatches to the compiled RAW method underneath it -- the
	same bypass DecoratedMethodSelfCallTestCase records for self-sends.
	Here it silently stripped @types.coroutine's result mark, so the
	acceptance test rejected exactly the shape it exists to accept."
	anextResult := (ait @env1:___pyAttrLoad___: #'__anext__')
		@env1:___pyCallValue___: { } kw: nil.
	bareGenOk := [(anextResult @env0:dynamicInstVarAt: #'_grail_iterable_coroutine') == True]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]
%

set compile_env: 1

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
___inner___
	"The awaitable ait.__anext__() answered, resolved to something drivable:
	the generator family directly, an __await__-bearing object through its
	iterator.  Computed on the FIRST drive -- anext() itself advances
	nothing."

	inner @env0:ifNil: [ | aw it |
		aw := anextResult.
		inner := ((aw @env0:isKindOf: PythonCoroutine)
			@env0:or: [bareGenOk == true
				@env0:and: [aw @env0:isKindOf: PythonGenerator]])
			ifTrue: [aw]
			ifFalse: [
				(aw ___respondsTo___: #'__await__')
					ifTrue: [
						"Mirror of PythonGenerator >> ___checkedAwaitIterator___
						and ___isRealIterator___: -- this object is not a
						generator, so it cannot inherit them.  An __await__
						answering 42 must be CPython's non-iterator TypeError
						(test_anext_bad_await greps __await__.*iterator), not
						an uncatchable MNU when the drive sends it send:."
						it := aw @env1:__await__.
						(it @env0:isKindOf: PythonCoroutine) ifTrue: [
							^ TypeError @env1:___signal___:
								'__await__() returned a coroutine'].
						(self ___isRealIterator___: it) ifFalse: [
							^ TypeError @env1:___signal___:
								('__await__() returned non-iterator of type '''
									@env0:, (bytes ___pyTypeNameOf___: it)
									@env0:, '''')].
						it]
					ifFalse: [
						"GET_AWAITABLE clause three
						(test_anext_return_iterator)."
						^ TypeError @env1:___signal___:
							('''' @env0:, (bytes ___pyTypeNameOf___: aw)
								@env0:, ''' object can''t be awaited')]]].
	^ inner
%

category: 'Grail-Private'
method: PyAnextAwaitable
___isRealIterator___: anObject
	"Verbatim twin of PythonGenerator >> ___isRealIterator___: (see there for
	the PythonInstance-fallback story); duplicated only because this class is
	not a generator."

	| defining |
	defining := anObject @env0:class
		@env0:whichClassIncludesSelector: #'__next__' environmentId: 1.
	defining @env0:isNil ifTrue: [^ false].
	(defining @env0:name @env0:asString @env0:= 'PythonInstance') ifTrue: [
		^ (anObject ___classAttrDunder___: #'__next__') @env0:notNil].
	^ true
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
__await__
	^ self
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
__iter__
	^ self
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
__next__
	^ self send: None
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
send: aValue
	"Drive the underlying __anext__ awaitable; exhaustion becomes
	StopIteration carrying the default -- the whole reason the two-argument
	form exists."

	| in |
	in := self ___inner___.
	^ [(in @env0:isKindOf: PythonGenerator)
			ifTrue: [in send: aValue]
			ifFalse: [aValue == None
				ifTrue: [in @env1:__next__]
				ifFalse: [in @env1:send: aValue]]]
		@env0:on: StopAsyncIteration
		do: [:e |
			"No default (the one-arg form, Smalltalk-nil sentinel): exhaustion
			is the caller's to see, as StopAsyncIteration."
			defaultValue @env0:isNil
				ifTrue: [e @env0:pass]
				ifFalse: [StopIteration ___signalReturn___: defaultValue]]
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
throw: anException
	| in |
	in := self ___inner___.
	^ [in @env1:throw: anException]
		@env0:on: StopAsyncIteration
		do: [:e |
			defaultValue @env0:isNil
				ifTrue: [e @env0:pass]
				ifFalse: [StopIteration ___signalReturn___: defaultValue]]
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
close
	"Niladic, so close(1) is the arity TypeError test_await_17 asserts.
	Undriven means nothing to shut down."

	inner @env0:ifNil: [^ None].
	^ inner @env1:close
%

set compile_env: 0

! ===============================================================================
! PyAsyncYield -- the tag that tells a YIELD apart from an AWAIT.
!
! This tiny class is the whole trick, so it is worth stating plainly why it has
! to exist.
!
! An async generator body suspends for TWO completely different reasons:
!
!     yield v      hand v to whoever is doing ``async for'' -- this ENDS the
!                  current __anext__, and v is what awaiting it produces
!     await x      park until x resolves -- this must travel PAST __anext__ and
!                  out to the event loop, because __anext__ has produced nothing
!
! Both reach the consumer through the same door: PythonGenerator >> ___yield___:
! parks the forked body on a semaphore and hands one value over, and an
! ``await'' inside the body gets there too, because ___grailAwait___: delegates
! through ___yieldFrom___: which suspends with ___yield___:.  So the value
! arriving at the consumer is ambiguous, and treating an await's suspension as a
! yielded item would make ``async for'' produce the loop's own plumbing as data.
!
! So the REAL yield is wrapped and the suspension is not.  Tagging the yield
! rather than the suspension is deliberate: yields are the ones this file emits
! (___asyncYield___: below is the only thing that constructs a PyAsyncYield), so
! the tag can never be forged by accident -- whereas a suspension value comes
! from arbitrary user __await__ code and could imitate anything, if the tag were
! a tuple or a symbol rather than an instance of a class nothing else makes.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyAsyncYield'
  instVarNames: #( value )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyAsyncYield comment:
'Internal marker: wraps a value an async generator body handed over with
``yield'', so the __anext__ driver can tell it from an ``await'' suspension
travelling through on its way to the event loop.

Never visible to Python code -- the driver unwraps it and answers the value.
'
%

expectvalue /Class
doit
PyAsyncYield category: 'Grail-Modules'
%

removeallmethods PyAsyncYield
removeallclassmethods PyAsyncYield

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyAsyncYield
___value___: aValue
	"Wrap a yielded value.  The only constructor, and the only place a
	PyAsyncYield is ever made -- which is what makes the tag unforgeable."

	^ self new ___setValue___: aValue
%

category: 'Grail-Private'
method: PyAsyncYield
___setValue___: aValue
	value := aValue.
	^ self
%

category: 'Grail-Accessing'
method: PyAsyncYield
___value___
	"The value the body yielded."

	^ value
%

! ===============================================================================
! PyAsyncGenASend -- the awaitable one step of an async generator answers.
!
! CPython's ``async_generator_asend''.  What __anext__ / asend / athrow / aclose
! each return: an object that, when awaited, advances the generator once.
!
! IT IS A STATE MACHINE, NOT A GENERATOR, and that is the entire point of the
! class.  The first version of this file built the awaitable with
! ``PythonGenerator withBlock:'' -- which reads beautifully, because ___yield___:
! is already exactly "park and hand this outward" -- and it FORKED A GsPROCESS
! PER ITERATION STEP.  Each fork costs a process plus two semaphores, on the
! hot path of every ``async for'', and test_coroutines died with
!
!     GemStone: Error Fatal: VM temporary object memory is full,
!     almost out of memory, too many markSweeps since last successful scavenge
!
! at test_for_4, having reported 0 tests -- a CRASH where the module had been
! merely failing.  So the shape that made the code shortest made it unusable,
! and the measurement is what said so.
!
! Nothing here needs a stack of its own: one step is a single decision about
! what came back from the body, and the delegation machinery already provides
! the suspension.  ___yieldFrom___: drives its sub-iterator through __iter__ /
! __next__ / send: / throw: / close and reads the return value off
! StopIteration -- a contract any object can satisfy, generator or not.  So this
! implements those five selectors directly and allocates one small instance per
! step instead of a process.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'PyAsyncGenASend'
  instVarNames: #( agen kind arg started finished )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyAsyncGenASend comment:
'The awaitable that advances an async generator by one step -- CPython''s
async_generator_asend.  Returned by __anext__ / asend / athrow / aclose.

A STATE MACHINE rather than a generator: one step is a single decision about
what the body handed back, and ___yieldFrom___: (which is what ``await''
delegates through) drives any object offering __iter__ / __next__ / send: /
throw: / close.  Building it as a generator instead forked a GsProcess per
iteration step and exhausted VM temporary memory.
'
%

expectvalue /Class
doit
PyAsyncGenASend category: 'Grail-Modules'
%

removeallmethods PyAsyncGenASend
removeallclassmethods PyAsyncGenASend

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyAsyncGenASend
___on___: anAsyncGen kind: aKind arg: anArg
	"aKind is #send, #throw or #close -- HOW the body is first resumed.  Every
	step after the first is a plain send, which is why one class covers all
	four entry points."

	^ self new ___setAgen___: anAsyncGen kind: aKind arg: anArg
%

category: 'Grail-Private'
method: PyAsyncGenASend
___setAgen___: anAsyncGen kind: aKind arg: anArg
	agen := anAsyncGen.
	kind := aKind.
	arg := anArg.
	started := false.
	finished := false.
	^ self
%

set compile_env: 1

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
__await__
	"``await'' consults __await__ and expects an ITERATOR back.  This object is
	its own iterator, as a generator is."

	^ self
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
__iter__
	"___yieldFrom___: asks its sub-iterator for __iter__ first."

	^ self
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
__next__
	"Advance one step with nothing sent in."

	^ self ___step___: None
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
send: aValue
	"Advance one step, forwarding aValue into whatever the body is parked on --
	which, after the first step, is an ``await'' inside the body."

	^ self ___step___: aValue
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
throw: anException
	"The consumer threw at OUR suspension point, which is inside the body's
	pending await -- so forward it there.  This is how a cancellation reaches
	an async generator parked awaiting something.

	Guarded exactly as ___step___: is -- a finished object refuses reuse, a
	step someone ELSE has in flight refuses by kind (both measured against
	CPython 3.14, test_async_gen_asend_throw_concurrent_with_throw) -- and
	with the same bookkeeping, including unwrapping a PyAsyncYield when the
	body catches the thrown exception and yields the next item instead."

	| out ___exc___ |
	finished @env0:ifTrue: [^ self ___reuseError___].
	___exc___ := agen ___coercedThrowArg___: anException.
	agen ___fireFirstiterIfNeeded___.
	self ___claimAgen___.
	"throw(GeneratorExit) into an UNSTARTED aclose step performs the close --
	the generator shuts down (its body never ran, nothing to unwind) and the
	step completes as StopIteration, exactly as driving it would have
	(test_async_gen_throw_same_aclose_coro_twice expects StopIteration, then
	the reuse error)."
	(started @env0:not
		@env0:and: [kind == #'close'
		@env0:and: [___exc___ @env0:isKindOf: GeneratorExit]]) ifTrue: [
			started := true.
			agen @env1:close.
			agen ___setAsendOwner___: nil.
			finished := true.
			^ StopIteration @env1:___signalReturn___: None].
	started := true.
	out := [[[agen @env1:throw: ___exc___]
			@env0:on: StopIteration
			do: [:ex | ex @env0:return: #'___grailAgenReturned___']]
		@env0:on: GeneratorExit
		do: [:ex |
			kind == #'close'
				ifTrue: [ex @env0:return: #'___grailAgenClosed___']
				ifFalse: [ex @env0:pass]]]
		@env0:on: AbstractException
		do: [:ex |
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	^ self ___classifyOutcome___: out
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
close
	"The consumer abandoned this step.  An undriven or finished one just goes
	inert -- a later send answers the reuse error, which is CPython's
	contract for send-after-close.  A step MID-FLIGHT is a suspended
	coroutine being discarded: GeneratorExit goes to the suspension point,
	and a body that catches it and suspends AGAIN has ignored it --
	``RuntimeError: coroutine ignored GeneratorExit'' (the COROUTINE
	spelling: the close is on this asend object, not on the generator;
	test_async_gen_asend_close_runtime_error).  A body that lets it out, or
	returns, closed cleanly."

	| out |
	finished @env0:ifTrue: [^ None].
	started @env0:ifFalse: [finished := true. ^ None].
	out := [[[[agen @env1:throw: (GeneratorExit @env0:new)]
			@env0:on: GeneratorExit
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
			@env0:on: StopIteration
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
			@env0:on: StopAsyncIteration
			do: [:ex | ex @env0:return: #'___grailExitTookHold___']]
		@env0:on: AbstractException
		do: [:ex |
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	agen ___setAsendOwner___: nil.
	finished := true.
	out == #'___grailExitTookHold___' @env0:ifTrue: [^ None].
	^ RuntimeError @env1:___signal___: 'coroutine ignored GeneratorExit'
%

category: 'Grail-Private'
method: PyAsyncGenASend
___reuseError___
	"Issue 25887's asyncgen spelling, per entry point (measured): a finished
	-- or closed, or refused-while-running -- step object never drives the
	generator again."

	^ RuntimeError @env1:___signal___:
		((kind == #'close' @env0:or: [kind == #'throw'])
			ifTrue: ['cannot reuse already awaited aclose()/athrow()']
			ifFalse: ['cannot reuse already awaited __anext__()/asend()'])
%

category: 'Grail-Private'
method: PyAsyncGenASend
___claimAgen___
	"One step object owns the generator from first drive to step
	completion.  Driving a DIFFERENT one inside that window is CPython's
	per-kind running error -- and the refused object is CLOSED by the
	refusal (measured: its next send answers the reuse error)."

	| owner word |
	owner := agen ___asendOwner___.
	(owner @env0:notNil @env0:and: [owner @env0:~~ self]) ifTrue: [
		finished := true.
		word := kind == #'close'
			ifTrue: ['aclose']
			ifFalse: [kind == #'throw' ifTrue: ['athrow'] ifFalse: ['anext']].
		^ RuntimeError @env1:___signal___:
			(word @env0:, '(): asynchronous generator is already running')].
	agen ___setAsendOwner___: self
%

category: 'Grail-Private'
method: PyAsyncGenASend
___classifyOutcome___: out
	"The three terminal outcomes release the generator and finish this
	object; a suspension passes through with the claim HELD -- that is the
	window ___claimAgen___ guards."

	out == #'___grailAgenClosed___' @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		^ StopIteration @env1:___signalReturn___: None].
	out == #'___grailAgenReturned___' @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		"A body that swallowed the GeneratorExit and RETURNED still closed
		cleanly (PEP 342 semantics for the close kind); everywhere else a
		return is exhaustion -- and the StopAsyncIteration is raised BARE,
		args (), as CPython raises it (test_async_gen_iteration_02 asserts
		assertFalse(ex.args); the old ``___signal___: None'' put a None in
		them)."
		kind == #'close' ifTrue: [^ StopIteration @env1:___signalReturn___: None].
		^ BaseException @env1:___pyRaise___: StopAsyncIteration].
	(out @env0:isKindOf: PyAsyncYield) @env0:ifTrue: [
		agen ___setAsendOwner___: nil.
		finished := true.
		"A YIELD reaching a CLOSE step means the body yielded while being
		shut down -- CPython's RuntimeError, not a delivery."
		kind == #'close' ifTrue: [
			^ RuntimeError @env1:___signal___: 'async generator ignored GeneratorExit'].
		^ StopIteration @env1:___signalReturn___: (out @env0:___value___)].
	^ out
%

category: 'Grail-Private'
method: PyAsyncGenASend
___step___: aValue
	"ONE STEP, and the three outcomes that matter.

	  a PyAsyncYield  the body reached a ``yield''.  This await is DONE, and the
	                  unwrapped value is its result -- delivered the way any
	                  iterator delivers a return value to ___yieldFrom___:, as
	                  StopIteration's value.
	  anything else   an ``await'' suspension passing through.  Answer it, and
	                  ___yieldFrom___: hands it further out -- to the event loop.
	  StopIteration   the body RETURNED.  The async iteration is over, which is
	                  StopAsyncIteration, not StopIteration: letting the latter
	                  escape would be read by the delegation as this awaitable
	                  finishing normally, silently answering None as if it were
	                  an item."

	| out |
	finished @env0:ifTrue: [^ self ___reuseError___].
	"CPython: a non-None value cannot be sent into a step whose generator has
	never run -- there is no suspended yield for it to become the value OF
	(test_async_gen_exception_10; message verbatim)."
	(aValue ~~ None @env0:and: [agen ___pyHasStarted___ @env0:not]) ifTrue: [
		^ TypeError @env1:___signal___:
			'can''t send non-None value to a just-started async generator'].
	agen ___fireFirstiterIfNeeded___.
	self ___claimAgen___.
	out := [[[started
			@env0:ifTrue: [agen @env1:send: aValue]
			ifFalse: [
				started := true.
				"A value sent into this step's FIRST drive reaches the
				generator's suspended yield when the generator is already
				started -- ``it.__anext__().send(10)'' delivers 10, CPython's
				test_async_gen_asyncio_anext_05.  (An UNSTARTED generator was
				refused above.)  Only the send kind: throw and close carry
				their own payloads."
				(kind == #'send' @env0:and: [aValue ~~ None])
					ifTrue: [arg := aValue].
				kind == #'close'
					ifTrue: [
						"NOT ``agen close'': that drives the shutdown
						synchronously to completion, so a ``finally'' that
						AWAITS reads as the body ignoring the exit
						(test_async_gen_asyncio_aclose_07/08/12).  Throwing
						GeneratorExit through the ordinary step machinery
						lets the finally's suspensions PASS THROUGH to
						whoever drives this awaitable -- the event loop --
						and the classification below decides how the story
						ends: the exit escaping or the body returning is a
						clean close, a yield is 'ignored GeneratorExit'."
						agen @env1:throw: (GeneratorExit @env0:new)]
					ifFalse: [kind == #'throw'
						ifTrue: [agen @env1:throw: arg]
						ifFalse: [agen @env1:send: arg]]]]
		@env0:on: StopIteration
		do: [:ex | ex @env0:return: #'___grailAgenReturned___']]
		@env0:on: GeneratorExit
		do: [:ex |
			"For a CLOSE step the exit coming back out is the clean ending;
			any other kind lets it travel to the catch-all below."
			kind == #'close'
				ifTrue: [ex @env0:return: #'___grailAgenClosed___']
				ifFalse: [ex @env0:pass]]]
		@env0:on: AbstractException
		do: [:ex |
			"An exception out of the body ends this step: release the
			generator, close this object (its next send is the reuse
			error), and let the exception travel."
			agen ___setAsendOwner___: nil.
			finished := true.
			ex @env0:pass].
	^ self ___classifyOutcome___: out
%

set compile_env: 0

! ===============================================================================
! PythonAsyncGenerator -- what calling an ``async def'' containing ``yield''
! answers.
!
! Upstream this is a distinct type with its own protocol -- __aiter__,
! __anext__, asend, athrow, aclose -- and Grail answered a plain PythonCoroutine
! for it (FunctionDefAst ___lazyWrapperClass___ said as much).  A coroutine has
! no __aiter__, so ``async for v in agen()'' raised ``TypeError: 'async for'
! requires an object with __aiter__ method, got PythonCoroutine'', and the
! two-thirds of the surface that is not iteration did not exist at all.
!
! IT IS A PythonGenerator, for the same reason PythonCoroutine is: "do not run
! the body at the call, run it when driven" is exactly what the generator
! machinery already implements -- fork the body, park it on a semaphore, resume
! it on send.  What this class adds is the ASYNC protocol on top, and the
! yield/await disambiguation PyAsyncYield exists for.
!
! ALL FOUR ENTRY POINTS ARE ONE OBJECT (PyAsyncGenASend), because they differ
! only in HOW the body is first resumed -- send None, send a value, throw, or
! close -- and every step after the first is a plain send.  Writing the step
! once is what keeps a suspension inside an athrow()'n body behaving like one
! inside an ordinary step.
! ===============================================================================

expectvalue /Class
doit
PythonGenerator subclass: 'PythonAsyncGenerator'
  instVarNames: #( asendOwner )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonAsyncGenerator comment:
'What calling an ``async def`` containing ``yield`` answers -- Python''s async
generator.

IS a PythonGenerator: "do not run the body at the call, run it when driven" is
the contract the generator machinery already implements.  What this adds is the
async protocol (__aiter__ / __anext__ / asend / athrow / aclose) and the
disambiguation between a ``yield`` (which ends the current __anext__) and an
``await`` (which suspends past it, out to the event loop).  See PyAsyncYield and
PyAsyncGenASend.
'
%

expectvalue /Class
doit
PythonAsyncGenerator category: 'Grail-Modules'
%

removeallmethods PythonAsyncGenerator
removeallclassmethods PythonAsyncGenerator

set compile_env: 1

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
___asyncYield___: aValue
	"``yield aValue'' inside an async generator body.  YieldAst emits this
	instead of ___yield___: when the enclosing function is an async generator.

	Tags the value so the step driver can tell it from an ``await'' suspension
	arriving by the same route, then parks exactly as an ordinary yield does.
	Answers what the consumer sent -- so ``x = yield v'' binds the value passed
	to asend(), and None for a plain __anext__()."

	^ self ___yield___: (PyAsyncYield @env0:___value___: aValue)
%

category: 'Grail-Private'
method: PythonAsyncGenerator
_signalEscapedException
	"PEP 479's ASYNC twin, which the inherited path cannot express:
	StopAsyncIteration is deliberately OUTSIDE the StopIteration hierarchy,
	so the generator machinery lets it escape raw -- but one escaping an
	async generator BODY is exactly as ambiguous as StopIteration escaping a
	sync one (it is indistinguishable from the generator's own exhaustion
	signal), and CPython converts it the same way:

	    RuntimeError: async generator raised StopAsyncIteration

	with the escaped exception as __cause__ and __context__.  Measured
	against 3.14: ``(0 async for tgt[0] in source())'' whose target store
	raises StopAsyncIteration(42) surfaces that RuntimeError from the
	awaited asend, cause args intact
	(test_for_assign_raising_stop_async_iteration's run_gen).  Everything
	else defers to the inherited implementation, including the sync PEP 479
	conversion, which ___pyKindWords___ already words for this class."

	| ex err msg |
	ex := BaseException @env0:___payloadOf___: escapedException.
	(ex @env0:isKindOf: StopAsyncIteration) ifTrue: [
		escapedException := nil.
		msg := 'async generator raised StopAsyncIteration'.
		err := RuntimeError ___new___.
		err ___args___: { msg }.
		err ___setCause___: ex context: ex.
		^ err ___signal___: msg].
	^ super _signalEscapedException
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
__aiter__
	"An async generator is its own async iterator, exactly as a generator is its
	own iterator."

	^ self
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
__anext__
	"Answer an AWAITABLE that advances this generator to its next ``yield''.
	asend(None), spelled the way ``async for'' asks for it."

	^ PyAsyncGenASend @env0:___on___: self kind: #'send' arg: None
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
asend: aValue
	"``agen.asend(v)'' -- advance to the next yield, with v as the value of the
	``yield'' expression the body is parked on."

	^ PyAsyncGenASend @env0:___on___: self kind: #'send' arg: aValue
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
athrow: anException
	"``agen.athrow(exc)'' -- raise exc AT the point the body is parked on, and
	answer an awaitable for whatever happens next: another yield, the exception
	propagating out, or StopAsyncIteration if the body finishes."

	^ PyAsyncGenASend @env0:___on___: self kind: #'throw' arg: anException
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
athrow: aType _: aValue
	"The deprecated multi-arg signature -- throw:'s athrow twin, sharing its
	normalisation and warning machinery (test_async_gen_3_arg_deprecation
	_warning asserts the DeprecationWarning)."

	self ___warnLegacySignatureOf___: 'athrow'.
	^ self athrow: (self ___normalizedLegacyExc___: aType value: aValue)
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
athrow: aType _: aValue _: aTb
	self ___warnLegacySignatureOf___: 'athrow'.
	^ self athrow: (self ___normalizedLegacyExc___: aType value: aValue)
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
aclose
	"``agen.aclose()'' -- shut the body down, running its ``finally'' blocks.

	An awaitable rather than a plain call, because closing can legitimately
	await: a ``finally'' in an async generator may contain one.  Delegates to
	the inherited close, which throws GeneratorExit at the suspension point and
	absorbs it, so a body that catches GeneratorExit and returns is fine."

	^ PyAsyncGenASend @env0:___on___: self kind: #'close' arg: None
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
ag_running
	"Python's ``agen.ag_running'' -- CPython's ag_running_async window, wider
	than gi_running: true from an asend/athrow/aclose step's first drive
	until the step completes, suspensions included (measured: mid-await the
	state is AGEN_RUNNING).  asendOwner is exactly that window's marker."

	^ ((running == true) @env0:or: [asendOwner ~~ nil])
		@env0:ifTrue: [True] ifFalse: [False]
%

category: 'Grail-Private'
method: PythonAsyncGenerator
___fireFirstiterIfNeeded___
	"The asyncgen half of sys.set_asyncgen_hooks: the FIRSTITER hook fires
	once, at the generator's first drive, handing the loop the reference it
	will close in shutdown_asyncgens().  Gated by a dynamic instVar so the
	per-step cost after the first is one probe; a hook error must not break
	iteration, so the call is guarded -- CPython logs and continues too."

	(self @env0:dynamicInstVarAt: #'___firstIterFired___') @env0:isNil ifTrue: [
		self @env0:dynamicInstVarAt: #'___firstIterFired___' put: true.
		(SessionTemps @env0:current @env0:at: #'GrailAsyncgenFirstiter' otherwise: nil)
			@env0:ifNotNil: [:hook |
				[hook @env1:___pyCallValue___: { self } kw: nil]
					@env0:on: AbstractException
					do: [:ex | ex @env0:return: nil]]]
%

category: 'Grail-Private'
method: PythonAsyncGenerator
___asendOwner___
	"The PyAsyncGenASend currently mid-step on this generator, nil when no
	step is in flight.  CPython's ag_running_async: one asend/athrow/aclose
	owns the generator from its first send until its step completes, and a
	DIFFERENT one driven in that window is 'anext(): asynchronous generator
	is already running' (per-kind spelling).  Suspension hands the value out
	to the event loop WITHOUT clearing the owner -- that is the window the
	guard exists for."

	^ asendOwner
%

category: 'Grail-Private'
method: PythonAsyncGenerator
___setAsendOwner___: anASendOrNil
	asendOwner := anASendOrNil
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
ag_suspended
	"Python's ``agen.ag_suspended'' (3.12+) -- parked at a yield, which unlike
	a plain coroutine an async generator genuinely reaches here: asend drives
	the body one yield at a time."

	^ self gi_suspended
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
ag_code
	"Python's ``agen.ag_code'' -- the async-generator spelling of gi_code."

	^ self ___codeObjectOrSignal___: 'ag_code'
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
ag_frame
	"Python's ``agen.ag_frame'' -- the async-generator spelling of gi_frame."

	^ self gi_frame
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
ag_await
	"Python's ``agen.ag_await'' -- what the body is awaiting RIGHT NOW: the
	delegation target for the whole asend-in-flight window (running
	included, measured), None otherwise."

	^ self ___delegationTargetWhileAlive___
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
__iter__
	"CPython: an async generator is not SYNC-iterable -- ``async for'' is its
	loop, __aiter__ its protocol.  The inherited generator ``^ self'' was the
	dangerous kind of wrong (isgenerator's docstring already called it that):
	an async generator answers send() happily, so ``for v in agen()'' iterated
	without complaint, binding the internal PyAsyncYield carrier objects as if
	they were items.  Message measured from CPython 3.14:
	``'async_generator' object is not iterable''."

	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object is not iterable')
%

category: 'Grail-Async Generator Protocol'
method: PythonAsyncGenerator
__next__
	"next(agen) -- ``TypeError: 'async_generator' object is not an iterator''
	(measured).  anext() is the async spelling and goes through __anext__."

	^ TypeError ___signal___:
		('''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object is not an iterator')
%

category: 'Grail-Private'
method: PythonAsyncGenerator
___pyKindWords___
	"CPython's runtime messages use the SPACED spelling for this kind: 'async
	generator raised StopIteration', 'can''t send non-None value to a
	just-started async generator' (measured, 3.14).  The underscored
	``async_generator'' is the type name, not the prose."

	^ 'async generator'
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PythonAsyncGenerator
___pythonValueAttrs___
	"The async-generator spellings, on top of the inherited generator ones --
	same reasoning as the coroutine override: each of these is a VALUE, and an
	unlisted accessor reaches Python as an always-truthy BoundMethod."

	^ super ___pythonValueAttrs___
		add: #'ag_running';
		add: #'ag_suspended';
		add: #'ag_await';
		add: #'ag_code';
		add: #'ag_frame';
		yourself
%
