! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WithExitRaisesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WithExitRaisesTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WithExitRaisesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WithExitRaisesTestCase
!
! A ``with'' whose __exit__ RAISES must call __exit__ exactly once.
!
! Grail emitted the clean-path ``mgr.__exit__(None, None, None)'' as the last
! expression INSIDE the try whose ``except BaseException'' handler calls
! __exit__ again with the exception details.  So a manager whose __exit__ raised
! had __exit__ invoked a SECOND time, handed its own exception as the excinfo
! triple.  CPython puts that call in the ``else'' of the try, which no
! ``except'' covers -- which is the shape WithAst's own docstring had described
! all along, while the code did something else.
!
! HOW IT WAS FOUND is the part worth keeping.  Vendoring asyncio.TaskGroup,
! whose __aexit__ raises BaseExceptionGroup on the NORMAL path: it re-entered
! itself, and by then its own ``finally'' had cleared _parent_task, so the
! report was ``'NoneType' object has no attribute 'uncancel''' -- which points
! nowhere near a with-statement.  Three synthetic reconstructions passed before
! instrumenting the real _aexit showed it being entered twice.
!
! Nothing about it was async: plain ``with'' had it identically, which is why
! tests/python/with_exit_raises.py checks both.
!
! The rest of the checks are the paths the FIX could plausibly have broken, and
! they are the reason this class is not three tests: a truthy __exit__
! suppressing the body's exception must not then also get a clean call, and
! return / break / continue out of the body must still get one.  Measured with
! the fix reverted, exactly three of the eleven flip -- so the fixture
! discriminates rather than passing vacuously.
! ===============================================================================

! ------------------- Remove existing behavior from WithExitRaisesTestCase
removeallmethods WithExitRaisesTestCase
removeallclassmethods WithExitRaisesTestCase
set compile_env: 0
! ------------------- Instance methods for WithExitRaisesTestCase

category: 'Grail-Setup'
method: WithExitRaisesTestCase
setUp
	"Reload the fixture fresh each test: its module body runs every check at
	import, and two of them drive an event loop through asyncio.run, so a
	shared instance would let one test observe another's loop state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_exit_raises' ifAbsent: [].
	probe := (importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/with_exit_raises.py')
		name: 'with_exit_raises') @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: WithExitRaisesTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- the bug

category: 'Grail-Tests - A raising exit'
method: WithExitRaisesTestCase
testARaisingExitIsCalledOnce
	"Both flavours, because the emit is shared: AsyncWithAst overrides only how
	the call is DRIVEN (___awaitPrefix___), not where it sits."

	self assert: (self at: 'a_raising_exit_is_called_once') equals: true.
	self assert: (self at: 'a_raising_aexit_is_called_once') equals: true.
%

category: 'Grail-Tests - A raising exit'
method: WithExitRaisesTestCase
testTheRaiseFromExitPropagates
	"Moving the call out of the protected block is only correct if what it
	raises actually leaves the statement -- the with must not quietly become a
	handler for its own manager."

	self assert: (self at: 'the_raise_from_exit_propagates') equals: true.
%

category: 'Grail-Tests - A raising exit'
method: WithExitRaisesTestCase
testAnInnerRaisingExitReachesTheOuterManager
	"``with A, B:'' where B's clean __exit__ raises.  That raise is now outside
	B's protection, so A sees it as a body exception and gets
	__exit__(RuntimeError, ...) -- which is what CPython does and what the
	nesting has to preserve, since the inner statement IS the outer one's body."

	self
		assert: (self at: 'an_inner_raising_exit_reaches_the_outer_manager')
		equals: true.
%

! ------------------- what the fix must not have broken

category: 'Grail-Tests - Unchanged paths'
method: WithExitRaisesTestCase
testASuppressingExitIsNotCalledAgain
	"The path the guard exists for.  A truthy __exit__ swallows the body's
	exception, and the handler then falls off its end -- so the on:do: answers
	the handler's value rather than the ``true'' the protected block would have
	answered, and no clean call follows.  Get this wrong and every suppressing
	manager sees a spurious __exit__(None, None, None)."

	self assert: (self at: 'a_suppressing_exit_is_not_called_again') equals: true.
%

category: 'Grail-Tests - Unchanged paths'
method: WithExitRaisesTestCase
testTheOrdinaryPathsStillCallExitExactlyOnce
	"A clean body, a body that raises, and nested managers."

	self assert: (self at: 'a_clean_body_gets_the_none_triple') equals: true.
	self assert: (self at: 'a_body_exception_still_reaches_exit') equals: true.
	self assert: (self at: 'nested_managers_each_get_one_call') equals: true.
%

category: 'Grail-Tests - Unchanged paths'
method: WithExitRaisesTestCase
testControlFlowOutOfTheBodyStillGetsTheCleanCall
	"return / break / continue are GemStone signals under BaseException, so
	they land in the same handler an exception does -- and the with-statement
	contract says the manager sees a CLEAN triple and the signal continues to
	its real target.  The handler still makes that call itself, so these
	deliberately exercise the branch the fix did NOT move."

	self
		assert: (self at: 'a_return_out_of_the_body_gets_the_none_triple')
		equals: true.
	self
		assert: (self at: 'a_break_out_of_the_body_gets_the_none_triple')
		equals: true.
	self
		assert: (self at: 'a_continue_out_of_the_body_gets_the_none_triple')
		equals: true.
%

set compile_env: 0
