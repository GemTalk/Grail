! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CoroutineObjectsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CoroutineObjectsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CoroutineObjectsTestCase
!
! Calling an ``async def'' answers a COROUTINE; it does not run the body.
!
! Grail compiled ``async def'' as a plain ``def'', so a call ran the body to
! completion and answered its value, and ``await'' was the identity.  That was
! enough to IMPORT jinja2 / asgiref / flask, whose async paths sit behind
! ``is_async'' guards that never fire -- but no coroutine object existed, so
! anything DRIVING one (``coro.send(None)'') got the value, or None, instead.
!
! THERE IS STILL NO EVENT LOOP, and this does not add one.  What it adds is the
! object protocol: a call answers something with send / throw / close /
! __await__, and ``await'' drives it inline.  Nothing suspends, so a coroutine
! here always runs straight through -- which is exactly CPython's behaviour for a
! coroutine that never awaits anything blocking.
!
! HOW IT IS BUILT.  PythonCoroutine IS a PythonGenerator.  ``do not run the body
! at the call; run it when driven'' is the contract the generator machinery
! already implements, and a body with no ``yield'' runs straight through on the
! first send and reports its return value as StopIteration's value -- which is
! precisely a non-suspending coroutine.  So the change is a wrapper choice, not
! a new runtime: FunctionDefAst ___wrapsBody___ asks ``is the body a block
! rather than a method body'', which is what the old isGenerator test was really
! asking, and ___lazyWrapperClass___ picks which wrapper.
!
! THE MARKER IS A FLAG, not the node's class.  A def inside a class body is
! re-classed to Instance/Static/ClassFunctionDefAst, and overwriting that with
! AsyncFunctionDefAst is what silently discarded every async method
! (AsyncDefInClassBodyTestCase).  ``was it async'' and ``what kind of member is
! it'' are independent facts and need independent storage.
!
! WHAT CHANGES OBSERVABLY, and it is the point rather than a side effect: calling
! an async function and DISCARDING the result now runs NONE of the body, where
! before it ran ALL of it.  That is Python's behaviour, and it is why frameworks
! warn about a never-awaited coroutine.  Measured across the corpus, no module
! regressed: 60 shipped stdlib files contain ``async def''.
!
! ``await'' on a NON-coroutine passes through unchanged.  Not legal Python, but
! it is what Grail did for every await before this, and shipped library code
! awaits values Grail resolves synchronously; a TypeError there would break
! working paths to enforce a rule nothing here benefits from.
!
! Drives tests/python/coroutine_objects.py.  test_with FailureTestCase.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CoroutineObjectsTestCase removeAllMethods.
CoroutineObjectsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CoroutineObjectsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_objects' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_objects.py')
		name: 'coroutine_objects'.
%

category: 'Grail-Private'
method: CoroutineObjectsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The object'
method: CoroutineObjectsTestCase
testACallAnswersACoroutine
	self assert: (self resultAt: 'has_coroutine_protocol') asString
		equals: '[True, True, True, True]'.
%

category: 'Grail-Tests - The object'
method: CoroutineObjectsTestCase
testTheBodyDoesNotRunUntilDriven
	"The behavioural change, and the whole reason the object is needed: a call
	used to run the body to completion.  A coroutine that is never driven runs
	nothing -- which is why CPython warns about one that is never awaited."

	self assert: (self resultAt: 'body_does_not_run_until_driven') asString
		equals: '[]'.
%

category: 'Grail-Tests - Driving it'
method: CoroutineObjectsTestCase
testSendReportsTheReturnValue
	"send(None) runs a non-suspending coroutine straight through and reports its
	return value as StopIteration's value -- the generator machinery's existing
	behaviour for a body with no yield, which is what makes PythonCoroutine a
	PythonGenerator rather than a new runtime."

	self assert: (self resultAt: 'send_reports_return_value') asString equals: '''v'''.
%

category: 'Grail-Tests - Driving it'
method: CoroutineObjectsTestCase
testAnExceptionInTheBodyPropagatesOutOfSend
	self assert: (self resultAt: 'exception_propagates') asString equals: '''inside'''.
%

category: 'Grail-Tests - Driving it'
method: CoroutineObjectsTestCase
testAwaitDrivesItInline
	"``await'' can no longer be the identity now that a call answers a coroutine
	-- it has to run the thing.  With nothing to suspend on, that means running
	straight through and taking the value."

	self assert: (self resultAt: 'await_yields_the_value') asString equals: '''v'''.
%

category: 'Grail-Tests - Driving it'
method: CoroutineObjectsTestCase
testCloseOnAnUndrivenCoroutineIsQuiet
	self assert: (self resultAt: 'close_is_quiet') asString equals: 'ok'.
%

category: 'Grail-Tests - Class members'
method: CoroutineObjectsTestCase
testAnAsyncMethodIsACoroutineToo
	"The flag rather than the node class is what makes this work: a class-body
	async def is an InstanceFunctionDefAst AND async."

	self assert: (self resultAt: 'async_method_is_a_coroutine') asString equals: 'True'.
%

category: 'Grail-Tests - Known gaps'
method: CoroutineObjectsTestCase
testDroppingAnUnawaitedCoroutineIsSilent
	"A PLATFORM GAP, decided and documented -- pinned so a green run is not
	read as more than it is.  CPython's ``RuntimeWarning: coroutine ... was
	never awaited'' fires from the coroutine's DESTRUCTOR at collection
	time, and GemStone gives transient session objects no destruction hook
	to attach that check to; every route that fakes one (a sweep at
	commit/abort, a warn-on-reuse hook, a weakref registry) answers later
	and worse than absence.  PyPy's GC gives the same non-promise, and its
	docs tell users not to rely on the warning.  See docs/Issues.md,
	'PLATFORM GAP (decided): no unawaited-coroutine warning'.

	If this test ever FAILS, someone has built the warning -- move the seven
	pinned test.test_coroutines scoreboard entries and delete the Issues.md
	section along with it."

	| r |
	r := self eval: 'import warnings
async def orphan():
    return 1
with warnings.catch_warnings():
    warnings.simplefilter(''error'')
    orphan()
    out = ''silent''
out'.
	self assert: r asString equals: 'silent'.
%

category: 'Grail-Tests - Identity'
method: CoroutineObjectsTestCase
testTheTypeNameIsCoroutine
	"Formerly the known-gap pin ('PythonCoroutine', with the note that
	whatever fixed the generator spelling should fix both).  The type-name
	remap in Object.gs >> ___pythonBuiltinTypeName___ fixed all three lazy
	call kinds at once -- generator, coroutine, async_generator -- so the pin
	now asserts CPython's answer."

	self assert: (self resultAt: 'coroutine_type_name') asString
		equals: '''coroutine'''.
%
