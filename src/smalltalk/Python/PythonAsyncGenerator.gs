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
  instVarNames: #( ait defaultValue inner )
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
	ait := anAsyncIterator.
	defaultValue := aDefault
%

set compile_env: 1

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
___inner___
	"The awaitable ait.__anext__() answered, resolved to something drivable:
	the generator family directly, an __await__-bearing object through its
	iterator.  Computed on the FIRST drive -- anext() itself advances
	nothing."

	inner @env0:ifNil: [ | aw |
		aw := ait @env1:__anext__.
		inner := (aw @env0:isKindOf: PythonGenerator)
			ifTrue: [aw]
			ifFalse: [
				(aw ___respondsTo___: #'__await__')
					ifTrue: [aw @env1:__await__]
					ifFalse: [aw]]].
	^ inner
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
		do: [:e | StopIteration ___signalReturn___: defaultValue]
%

category: 'Grail-Awaitable Protocol'
method: PyAnextAwaitable
throw: anException
	| in |
	in := self ___inner___.
	^ [in @env1:throw: anException]
		@env0:on: StopAsyncIteration
		do: [:e | StopIteration ___signalReturn___: defaultValue]
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
	pending await -- so forward it there.  This is how a cancellation reaches an
	async generator that is parked awaiting something."

	^ [agen @env1:throw: anException]
		@env0:on: StopIteration
		do: [:ex | ex @env0:return: (StopAsyncIteration @env1:___signal___: None)]
%

category: 'Grail-Awaitable Protocol'
method: PyAsyncGenASend
close
	"The consumer abandoned this step.  Nothing to release: this object owns no
	process, and the GENERATOR's lifetime is not ours to end -- aclose() is how
	a caller says that."

	^ None
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
	finished @env0:ifTrue: [
		^ StopAsyncIteration @env1:___signal___: None].
	out := [started
			@env0:ifTrue: [agen @env1:send: aValue]
			ifFalse: [
				started := true.
				kind == #'close'
					ifTrue: [agen @env1:close. #'___grailAgenClosed___']
					ifFalse: [kind == #'throw'
						ifTrue: [agen @env1:throw: arg]
						ifFalse: [agen @env1:send: arg]]]]
		@env0:on: StopIteration
		do: [:ex | ex @env0:return: #'___grailAgenReturned___'].
	out == #'___grailAgenClosed___' @env0:ifTrue: [
		"aclose(): the body is shut down and its ``finally'' has run.  The
		awaitable simply completes -- there is no item and no error."
		finished := true.
		^ StopIteration @env1:___signalReturn___: None].
	out == #'___grailAgenReturned___' @env0:ifTrue: [
		finished := true.
		^ StopAsyncIteration @env1:___signal___: None].
	(out @env0:isKindOf: PyAsyncYield) @env0:ifTrue: [
		finished := true.
		^ StopIteration @env1:___signalReturn___: (out @env0:___value___)].
	^ out
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
  instVarNames: #()
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
	"Python's ``agen.ag_running'' -- the async-generator spelling of
	gi_running."

	^ self gi_running
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
	"Python's ``agen.ag_await'' -- what the body is awaiting RIGHT NOW, which
	is None except while suspended inside an await.  A Grail async generator
	only ever suspends at its yields (awaits run straight through, there being
	no event loop), so None is the honest constant, exactly as cr_await is for
	the coroutine."

	^ None
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
