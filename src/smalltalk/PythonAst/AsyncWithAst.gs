! ------------------- Superclass check
run
WithAst ifNil: [self error: 'WithAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncWithAst
! Inherits all fields + the standard ``printSmalltalkOn:`` codegen from
! WithAst, and overrides only WHICH HALF of the context-manager protocol it
! drives: __aenter__/__aexit__ rather than __enter__/__exit__.
!
! It used to emit a plain ``with'', which is why ``async with obj:'' on an
! object with only __aenter__/__aexit__ reported ``does not support the CONTEXT
! MANAGER protocol (missed __exit__ method)'' -- naming the wrong protocol and
! the wrong method -- and why a SYNC manager under ``async with'' succeeded
! silently instead of raising.
!
! The two calls are coroutines, so the shared emit drives them through
! ___grailAwait___: (CPython's ``await mgr.__aenter__()''); that helper passes a
! non-coroutine through unchanged, so the synchronous path is untouched.
expectvalue /Class
doit
WithAst subclass: 'AsyncWithAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncWithAst comment:
'https://docs.python.org/3/library/ast.html#ast.AsyncWith

An async with statement.

items is a list of WithItem nodes.
body is a list of nodes.
type_comment is an optional string with the type comment.

Example:
>>> print(ast.dump(ast.parse(''async with x:\\n    ...''), indent=4))
Module(
    body=[
        AsyncWith(
            items=[WithItem(context_expr=Name(id=''x'', ctx=Load()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AsyncWithAst(items body type_comment)
'
%

expectvalue /Class
doit
AsyncWithAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncWithAst
removeallmethods AsyncWithAst
removeallclassmethods AsyncWithAst
set compile_env: 0
! ------------------- Class methods for AsyncWithAst
! ------------------- Instance methods for AsyncWithAst

set compile_env: 0

category: 'Grail-code generation'
method: AsyncWithAst
___awaitPrefix___
	"``async with'' has to be able to SUSPEND in __aenter__ / __aexit__, so the
	call is driven through the AWAITING COROUTINE rather than through the
	class-side helper.

	This is the same two-emit rule AwaitAst applies, and for the same reason.
	The class-side ``PythonCoroutine ___grailAwait___:'' has no reference to the
	awaiter, so it can only send ``send: None'' ONCE and answer whatever comes
	back: if the coroutine RETURNS, that is StopIteration and the value is right,
	but if it SUSPENDS the helper answers nil and the statement carries on.  The
	instance-side form hands over ``___gen___'', so a yield from deep inside
	__aenter__ travels out through ___yieldFrom___: to whoever is driving.

	WHAT THAT COST BEFORE: ``async with lock:'' on a CONTENDED asyncio.Lock ran
	its body WITHOUT the lock -- __aenter__ parked on the acquire future, the
	helper answered nil, and the body proceeded -- and then __aexit__ raised
	``RuntimeError: Lock is not acquired''.  With no contention __aenter__ never
	suspends, which is why every existing test passed.  It took upstream's
	test_locks, where a Barrier makes contention the point, to show it: two of
	three tasks got None from ``async with barrier as i''.
	
	Outside a wrapped body there is no coroutine to suspend, so the inherited
	class-side form still applies -- ``async with'' outside an async def is a
	Python SyntaxError, but Grail has always compiled it."

	| fn |
	fn := CallAst functionBeingCompiled.
	(fn notNil
		and: [(fn respondsTo: #'___wrapsBody___') and: [fn ___wrapsBody___]])
		ifTrue: [^ '___gen___ @env1:___grailAwait___: '].
	^ super ___awaitPrefix___
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___emitProtocolPreflightOn___: aStream
	"See WithAst's hook comment and PythonCoroutine class >>
	___checkAsyncCM___: -- both protocol halves validated before either is
	called, missing __aexit__ named first."

	aStream nextPutAll: 'PythonCoroutine @env0:___checkAsyncCM___: ___cm___.'; lf
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___enterAwaitPrefix___
	"Inside a wrapped body, route through the async-with-specific await so a
	non-awaitable __aenter__ result is rejected with CPython's wording --
	``'async with' received an object from __aenter__ that does not implement
	__await__: int'' (test_with_6).  Outside one there is no ___gen___ to
	suspend, so the inherited class-side prefix applies, exactly as
	___awaitPrefix___ decides above."

	| fn |
	fn := CallAst functionBeingCompiled.
	(fn notNil
		and: [(fn respondsTo: #'___wrapsBody___') and: [fn ___wrapsBody___]])
		ifTrue: [^ '___gen___ @env1:___grailAwaitAenter___: '].
	^ super ___enterAwaitPrefix___
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___exitAwaitPrefix___
	"__aexit__'s twin of ___enterAwaitPrefix___ -- by this point the body has
	already run, which is why the message must name the method (test_with_8)."

	| fn |
	fn := CallAst functionBeingCompiled.
	(fn notNil
		and: [(fn respondsTo: #'___wrapsBody___') and: [fn ___wrapsBody___]])
		ifTrue: [^ '___gen___ @env1:___grailAwaitAexit___: '].
	^ super ___exitAwaitPrefix___
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___enterSelector___
	^ '__aenter__'
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___exitSelector___
	^ '__aexit__'
%
