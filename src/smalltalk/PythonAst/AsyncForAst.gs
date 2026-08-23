! ------------------- Superclass check
run
ForAst ifNil: [self error: 'ForAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncForAst
! Inherits all fields + the loop machinery of ``printSmalltalkOn:`` from
! ForAst, and overrides the three hooks that are the entire difference:
! __aiter__ rather than __iter__, an AWAITED __anext__ rather than __next__,
! and StopAsyncIteration rather than StopIteration.  Break, continue,
! for-else, tuple unpacking and the PEP 657 position stores are shared.
!
! It used to emit a plain synchronous ``for``, on the reasoning that Grail had
! no async iteration -- which was true, and meant ``async for`` over a real
! async iterator raised ``TypeError: object is not iterable'' because
! __aiter__/__anext__ were never consulted.  That is six tests of CPython's
! test_coroutines, and it is what starlette and anyio iterate request bodies
! and task groups with.
expectvalue /Class
doit
ForAst subclass: 'AsyncForAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncForAst comment: 
'AsyncFor(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)'
%

expectvalue /Class
doit
AsyncForAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncForAst
removeallmethods AsyncForAst
removeallclassmethods AsyncForAst
set compile_env: 0
! ------------------- Class methods for AsyncForAst
! ------------------- Instance methods for AsyncForAst

category: 'Grail-code generation'
method: AsyncForAst
___emitIteratorFrom___: iterNode on: aStream
	"``async for'' asks the iterable for an ASYNC iterator.  CPython's GET_AITER
	sends __aiter__, which -- unlike __anext__ -- is an ordinary method
	answering the iterator directly, NOT a coroutine, so there is nothing to
	await here.

	Routed through a runtime helper rather than sending __aiter__ inline,
	because a MISSING __aiter__ has to be a catchable Python TypeError instead
	of the uncatchable MessageNotUnderstood a bare send produces -- ``async for
	v in [1, 2]'' is an ordinary mistake.  See PythonCoroutine class >>
	___grailAiter___:, which also makes CPython's second check, on the object
	__aiter__ returned."

	aStream nextPutAll: 'PythonCoroutine @env1:___grailAiter___: ('.
	iterNode printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ')'
%

category: 'Grail-code generation'
method: AsyncForAst
___nextExpressionFor___: iterTemp
	"``async for'' AWAITS each step: __anext__ answers an awaitable (normally a
	coroutine, since it is written ``async def __anext__''), and the value the
	loop binds is what awaiting it produces.

	Emitted through ``___gen___'', the enclosing coroutine, exactly as AwaitAst
	does inside a wrapped body -- so a suspension inside __anext__ suspends the
	whole loop and reaches the driver, which is the point of async iteration
	rather than a detail of it.  ``async for'' is only legal inside an ``async
	def'', and an async def always wraps its body (FunctionDefAst
	___wrapsBody___), so ___gen___ is always bound where this can appear.

	___grailAwaitAnext___: rather than ___grailAwait___:, and the difference
	matters here in a way it does not anywhere else.  The general await passes a
	NON-awaitable through unchanged, deliberately, because shipped library code
	awaits values Grail resolves synchronously.  In a loop whose only exit is
	StopAsyncIteration, an __anext__ answering something inert then spins
	FOREVER -- test_coroutines' test_for_4 (``def __anext__: return ()'') took
	the module from failing to CRASHING on exhausted VM memory.  The strict
	variant raises CPython's TypeError instead."

	^ '(___gen___ @env1:___grailAwaitAnext___: (' , iterTemp , ' __anext__))'
%

category: 'Grail-code generation'
method: AsyncForAst
___exhaustedExceptionName___
	"An async iterator signals exhaustion with StopAsyncIteration, which is NOT
	a StopIteration subclass -- it descends from Exception -- so the inherited
	handler would never have caught it even once __anext__ was being awaited.

	It also passes cleanly through the await delegation on its way here:
	___yieldFrom___: watches for StopIteration to detect a finished
	sub-iterator, and StopAsyncIteration is deliberately outside that
	hierarchy, so it propagates to this loop's handler rather than being
	mistaken for the coroutine returning."

	^ 'StopAsyncIteration'
%
