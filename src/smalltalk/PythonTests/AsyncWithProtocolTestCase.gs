! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncWithProtocolTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncWithProtocolTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncWithProtocolTestCase
!
! ``async with'' drives __aenter__/__aexit__, not __enter__/__exit__.
!
! AsyncWithAst inherited WithAst's codegen wholesale and overrode NOTHING, so
! ``async with'' emitted a plain ``with''.  Two consequences, both silent:
!
!   * an object implementing only __aenter__/__aexit__ was reported as ``does
!     not support the CONTEXT MANAGER protocol (missed __exit__ method)'' --
!     naming the wrong protocol AND the wrong method.
!   * a SYNCHRONOUS manager under ``async with'' quietly SUCCEEDED, running
!     __enter__/__exit__, where CPython raises TypeError.  Silently doing the
!     wrong thing is the worse of the two.
!
! THE SHAPE IS SHARED.  ``async with'' is the same statement over the
! ``a''-prefixed pair, so WithAst's emit is parameterised by two hooks
! (___enterSelector___ / ___exitSelector___) that AsyncWithAst overrides; the
! body, the target binding, the control-flow-signal filter and the payload
! unwrapping are all common.
!
! THE TWO HALVES ARE COROUTINES, so the emit DRIVES them through
! ___grailAwait___: -- which is what CPython's ``await mgr.__aenter__()'' means.
! That helper passes a non-coroutine through unchanged, so the synchronous path
! is untouched by the wrapping.  This only became possible once calling an
! ``async def'' answered a coroutine (CoroutineObjectsTestCase); before that
! __aenter__ ran at the call and there was nothing to await.
!
! ___asyncContextManagerProtocolError___: mirrors the synchronous message,
! including the cross-protocol hint in the other direction (``Did you mean to
! use 'with'?''), and reports a missing __aexit__ BEFORE a missing __aenter__ --
! the same order CPython uses on the synchronous side.
!
! Drives tests/python/async_with_protocol.py.  test_with FailureTestCase
! testAsyncEnterAttributeError / testAsyncExitAttributeError /
! testAsyncWithForSyncManager (test_with 6 -> 3).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AsyncWithProtocolTestCase removeAllMethods.
AsyncWithProtocolTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncWithProtocolTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_with_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_with_protocol.py')
		name: 'async_with_protocol'.
%

category: 'Grail-Private'
method: AsyncWithProtocolTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The protocol runs'
method: AsyncWithProtocolTestCase
testAenterAndAexitRunInOrder
	"__aenter__ is awaited, its value binds the ``as'' target, and __aexit__ is
	awaited with a clean (None, None, None) when the body completes."

	self assert: (self resultAt: 'ok_result') asString equals: 'None'.
	self assert: (self resultAt: 'ok_order') asString
		equals: '[''enter'', ''body:resource'', ''exit:None'']'.
%

category: 'Grail-Tests - The protocol runs'
method: AsyncWithProtocolTestCase
testAnExceptionReachesAexitAndPropagates
	self assert: (self resultAt: 'exception_propagates') asString
		equals: '''ValueError: x'''.
	self assert: (self resultAt: 'exception_order') asString
		equals: '[''enter'', ''exit:ValueError'']'.
%

category: 'Grail-Tests - The protocol runs'
method: AsyncWithProtocolTestCase
testAexitCanSuppressTheException
	"A truthy __aexit__ swallows the exception and execution continues after the
	block -- awaited, so a coroutine __aexit__ returning True is recognised as
	True rather than as a coroutine object."

	self assert: (self resultAt: 'aexit_can_suppress') asString equals: '''continued'''.
%

category: 'Grail-Tests - Protocol errors'
method: AsyncWithProtocolTestCase
testASyncManagerSuggestsPlainWith
	"The mirror of the hint added for the synchronous direction, and the case
	that was WRONG rather than merely misworded: this used to run __enter__ /
	__exit__ and succeed."

	self assert: (self resultAt: 'sync_manager_msg') asString
		equals: 'TypeError: ''SyncManager'' object does not support the asynchronous context manager protocol (missed __aexit__ method) but it supports the context manager protocol. Did you mean to use ''with''?'.
%

category: 'Grail-Tests - Protocol errors'
method: AsyncWithProtocolTestCase
testAMissingHalfNamesTheAsynchronousProtocol
	"Each names the ASYNCHRONOUS protocol and the ``a''-prefixed method.  Note
	``Neither'' reports __aexit__, not __aenter__: a missing exit is reported
	first, the same order CPython uses synchronously."

	self assert: (self resultAt: 'lacks_aenter_msg') asString
		equals: 'TypeError: ''LacksAEnter'' object does not support the asynchronous context manager protocol (missed __aenter__ method)'.
	self assert: (self resultAt: 'lacks_aexit_msg') asString
		equals: 'TypeError: ''LacksAExit'' object does not support the asynchronous context manager protocol (missed __aexit__ method)'.
	self assert: (self resultAt: 'neither_msg') asString
		equals: 'TypeError: ''Neither'' object does not support the asynchronous context manager protocol (missed __aexit__ method)'.
%
