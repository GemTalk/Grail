! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncDefInClassBodyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncDefInClassBodyTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncDefInClassBodyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncDefInClassBodyTestCase
!
! An ``async def'' inside a CLASS BODY was SILENTLY DISCARDED -- the method
! simply did not exist.
!
!     class C:
!         async def m(self): ...
!     hasattr(C, 'm')        "False in Grail; True in CPython"
!
! Nothing was reported, at parse time or after: no syntax error, no warning, no
! placeholder.  The method was absent from getattr, from dir(), and from
! __dict__ alike.
!
! WHY.  PythonParser gives a class-body def one of Instance / Static /
! ClassFunctionDefAst (parseFunctionDefWithDecorators:, on classNesting > 0).
! Both ``async def'' parse paths then re-classed the node to AsyncFunctionDefAst
! UNCONDITIONALLY, overwriting that classification.  ClassDefAst collects a
! class's methods by SELECTING InstanceFunctionDefAst nodes, so an async def
! matched nothing and was never emitted.
!
! ``async def'' at MODULE scope was never affected -- the node is a plain
! FunctionDefAst there, so re-classing it costs nothing -- which is why a whole
! class of missing methods went unnoticed.
!
! THE FIX is to decline the marker rather than to re-order the re-classing.
! AsyncFunctionDefAst is a PURE MARKER: it adds no methods and overrides no
! codegen, because Grail emits ``async def'' as a regular def (see its class
! comment and AwaitAst).  So not applying it inside a class body loses nothing
! that generates code, while applying it lost the method entirely.  Should async
! ever need per-kind marking, the fix is async variants of the three class-body
! subclasses -- not re-instating the clobber.
!
! WHAT IT FIXED IN test_with.  ``with obj:'' on an object defining
! __aenter__/__aexit__ must add "but it supports the asynchronous context
! manager protocol. Did you mean to use 'async with'?".  That check was ALREADY
! WRITTEN and correct (object >> ___contextManagerProtocolError___:); it could
! never fire because the async defs it looks for did not exist.  A reminder that
! a silent drop shows up somewhere far from its cause.
!
! WHAT THIS DOES NOT CLOSE, both PRE-DATING this fix and unchanged by it --
! listing the methods is what makes them observable at all:
!
!   * Grail runs an async body SYNCHRONOUSLY and returns its value where CPython
!     returns a coroutine.  There is no event loop, which is why the three
!     sibling test_with cases that actually drive a coroutine still fail.
!   * a staticmethod and a classmethod are both stored as an UnboundMethod, so
!     the class dict cannot tell the three kinds apart -- the same gap
!     DirOfAClassTestCase records.
!
! Drives tests/python/async_def_in_class_body.py.  test_with
! FailureTestCase.testWithForAsyncManager.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AsyncDefInClassBodyTestCase removeAllMethods.
AsyncDefInClassBodyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncDefInClassBodyTestCase
setUp
	"Reload tests/python/async_def_in_class_body.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_def_in_class_body' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/async_def_in_class_body.py')
		name: 'async_def_in_class_body'.
%

category: 'Grail-Private'
method: AsyncDefInClassBodyTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The methods exist'
method: AsyncDefInClassBodyTestCase
testAnAsyncDefInAClassBodyIsAMethod
	"The whole defect in one assertion: all three forms -- plain, @staticmethod
	and @classmethod -- were absent from the class entirely."

	self assert: (self resultAt: 'methods_exist') asString
		equals: '[True, True, True]'.
%

category: 'Grail-Tests - The methods exist'
method: AsyncDefInClassBodyTestCase
testTheyAreVisibleToIntrospection
	"Present by every route that should see them, not just getattr: a method
	that answers hasattr but is missing from dir() or __dict__ would still be
	invisible to inspect, pydoc and unittest discovery."

	self assert: (self resultAt: 'methods_in_dir') asString
		equals: '[True, True, True]'.
	self assert: (self resultAt: 'methods_in_class_dict') asString
		equals: '[''c'', ''m'', ''s'']'.
%

category: 'Grail-Tests - The methods exist'
method: AsyncDefInClassBodyTestCase
testModuleLevelAsyncDefStillWorks
	"REGRESSION GUARD.  Module scope was never broken -- the node is a plain
	FunctionDefAst there, so AsyncFunctionDefAst applies harmlessly -- and the
	fix must not take that away, since that is the case the parser test pins."

	self assert: (self resultAt: 'module_level_async_def') asString equals: 'True'.
%

category: 'Grail-Tests - with protocol'
method: AsyncDefInClassBodyTestCase
testAnAsyncManagerSuggestsAsyncWith
	"The visible consequence in test_with, and the reason a silent drop is the
	worst failure mode: this hint was already written and correct, and simply
	had nothing to find.  CPython added it because the mistake is common."

	self assert: (self resultAt: 'async_manager_msg') asString
		equals: '''AsyncManager'' object does not support the context manager protocol (missed __exit__ method) but it supports the asynchronous context manager protocol. Did you mean to use ''async with''?'.
%

category: 'Grail-Tests - with protocol'
method: AsyncDefInClassBodyTestCase
testThePlainProtocolMessagesAreUnchanged
	"REGRESSION GUARD for the three messages that were already right.  The hint
	is appended only when BOTH async halves are present, so making them visible
	must not start decorating an ordinary non-manager.  Note CPython reports a
	missing __exit__ before a missing __enter__ -- its SETUP_WITH looks __exit__
	up first -- which is why ``Neither'' names __exit__."

	self assert: (self resultAt: 'lacks_exit_msg') asString
		equals: '''LacksExit'' object does not support the context manager protocol (missed __exit__ method)'.
	self assert: (self resultAt: 'lacks_enter_msg') asString
		equals: '''LacksEnter'' object does not support the context manager protocol (missed __enter__ method)'.
	self assert: (self resultAt: 'neither_msg') asString
		equals: '''Neither'' object does not support the context manager protocol (missed __exit__ method)'.
%

category: 'Grail-Tests - Known gaps'
method: AsyncDefInClassBodyTestCase
testAnAsyncBodyRunsSynchronouslyWhichIsAKnownGap
	"Recorded, NOT endorsed, and PRE-DATING this fix -- Grail has no event loop,
	so an async body runs to completion and answers its value where CPython
	answers a coroutine.  This is why the three sibling test_with cases that
	actually drive a coroutine (testAsyncEnterAttributeError,
	testAsyncExitAttributeError, testAsyncWithForSyncManager) still fail:
	they need ``async with'', not merely the methods to exist."

	self assert: (self resultAt: 'async_call_runs_synchronously_is_a_known_gap') asString
		equals: '[''m'', ''s'', ''c'']'.
%

category: 'Grail-Tests - Known gaps'
method: AsyncDefInClassBodyTestCase
testAsyncKindsAreIndistinguishableWhichIsAKnownGap
	"Recorded, NOT endorsed, and PRE-DATING this fix.  All three store as an
	UnboundMethod, so the class dict cannot tell a plain async def from an async
	@staticmethod or @classmethod -- the same gap DirOfAClassTestCase records
	for their synchronous counterparts.  Listing the methods is what makes it
	observable here; it is not new."

	self assert: (self resultAt: 'async_kinds_indistinguishable_is_a_known_gap') asString
		equals: '[''UnboundMethod'', ''UnboundMethod'', ''UnboundMethod'']'.
%
