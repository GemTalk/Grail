! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncioEagerTaskTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioEagerTaskTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncioEagerTaskTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncioEagerTaskTestCase
!
! Eager task start -- ``loop.set_task_factory(asyncio.eager_task_factory)'' --
! which runs each task's body IMMEDIATELY, up to its first suspension, rather
! than queueing the first step for the loop's next turn.  Drives
! tests/python/asyncio_eager_tasks.py, whose eleven checks agree with CPython
! 3.14.6.
!
! THREE THINGS HAD TO BE TRUE and only the first is about eagerness:
!
!   * Task takes ``eager_start`` and drives the first step inline.
!   * ``loop.create_task`` CONSULTS ``_task_factory``.  Grail stored the factory
!     and never read it, so ``set_task_factory`` was a silent no-op -- the worst
!     shape of bug for a test suite, because nothing raises and every eager
!     assertion quietly measures lazy tasks instead.
!   * the module-level ``asyncio.create_task`` goes THROUGH the loop instead of
!     constructing a Task, or the factory governs some spellings and not others.
!
! THE CURRENT-TASK CHECK IS THE ONE THAT FAILS ON A PLAUSIBLE IMPLEMENTATION.
! Eager start runs inside the CREATOR's step, so the slot naming the running
! task is already occupied.  ``_step'' sets that slot to itself and DELETES it
! in its ``finally'' -- correct when the loop drove the step and nothing was
! running underneath, wrong when nested, because it leaves the creator with no
! current task for the rest of its own body.  ``current_task()'' then answers
! nil inside an entirely ordinary coroutine.  So ``_eager_start'' saves and
! restores instead of letting the delete stand.
!
! WHAT THIS DOES NOT UNBLOCK, stated because the obvious next number does not
! move: test.test_asyncio.test_taskgroups' TestEagerTaskTaskGroup, all 48 of
! whose tests still fail.  They no longer fail on the missing factory -- they
! fail because that class spells its loop factory as a ``@staticmethod'' that
! shadows the ``loop_factory = None'' it inherits, and in Grail accessing a
! shadowing staticmethod INVOKES it rather than answering the function:
!
!     Shadow().mk  ->  int   (CPython: function)
!     Shadow.mk    ->  int   (CPython: function)
!
! That is an attribute-path bug with nothing to do with asyncio, and it is
! tracked separately.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: AsyncioEagerTaskTestCase
setUp
	"Reload the fixture fresh each test.  Its module body RUNS the checks and
	each drives its own event loop through asyncio.run, so a shared instance
	would let one test observe another's loop -- and these tests INSTALL a task
	factory on that loop, which is exactly the state worth not sharing."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_eager_tasks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asyncio_eager_tasks.py')
		name: 'asyncio_eager_tasks'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: AsyncioEagerTaskTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- Eagerness itself

category: 'Grail-Tests - Eagerness'
method: AsyncioEagerTaskTestCase
testAnEagerBodyRunsBeforeCreateTaskReturns
	"The defining behaviour: no loop turn between creation and first suspend."

	self assert: (self at: 'eager_body_runs_before_create_task_returns')
		equals: true
%

category: 'Grail-Tests - Eagerness'
method: AsyncioEagerTaskTestCase
testALazyTaskHasNotStartedWhenCreated
	"The contrast, so the check above measures eagerness rather than luck."

	self assert: (self at: 'a_lazy_task_has_not_started_when_created')
		equals: true
%

category: 'Grail-Tests - Eagerness'
method: AsyncioEagerTaskTestCase
testAnEagerTaskThatNeverSuspendsIsAlreadyDone
	self assert: (self at: 'an_eager_task_that_never_suspends_is_already_done')
		equals: true
%

! ------------------- The factory that was never consulted

category: 'Grail-Tests - The Task Factory'
method: AsyncioEagerTaskTestCase
testTheFactoryIsActuallyConsulted
	"set_task_factory stored the factory and nothing read it, so this failed
	silently rather than loudly."

	self assert: (self at: 'the_factory_is_actually_consulted') equals: true
%

category: 'Grail-Tests - The Task Factory'
method: AsyncioEagerTaskTestCase
testModuleLevelCreateTaskUsesTheFactoryToo
	"asyncio.create_task built a Task directly, going around the loop and so
	around its factory."

	self assert: (self at: 'module_level_create_task_uses_the_factory_too')
		equals: true
%

category: 'Grail-Tests - The Task Factory'
method: AsyncioEagerTaskTestCase
testCreateEagerTaskFactoryAcceptsASubclass
	self assert: (self at: 'create_eager_task_factory_accepts_a_subclass')
		equals: true
%

category: 'Grail-Tests - The Task Factory'
method: AsyncioEagerTaskTestCase
testThePublicNamesAreExported
	self assert: (self at: 'the_public_names_are_exported') equals: true
%

! ------------------- Current-task nesting, the subtle half

category: 'Grail-Tests - Current Task'
method: AsyncioEagerTaskTestCase
testEagerStartLeavesTheCreatorAsCurrentTask
	"The nesting check.  _step deletes the current-task slot on the way out,
	which orphans the CREATOR when the step was nested inside its body."

	self assert: (self at: 'eager_start_leaves_the_creator_as_current_task')
		equals: true
%

category: 'Grail-Tests - Current Task'
method: AsyncioEagerTaskTestCase
testAnEagerTaskSeesItselfAsCurrent
	self assert: (self at: 'an_eager_task_sees_itself_as_current') equals: true
%

category: 'Grail-Tests - Current Task'
method: AsyncioEagerTaskTestCase
testEagerTasksKeepTheirName
	"name reaches the CONSTRUCTOR: a set_name afterwards would arrive too late
	for a body that already ran and read its own task's name."

	self assert: (self at: 'eager_tasks_keep_their_name') equals: true
%

! ------------------- What test_taskgroups is actually exercising

category: 'Grail-Tests - TaskGroup'
method: AsyncioEagerTaskTestCase
testTaskGroupChildrenAreEagerToo
	"TaskGroup.create_task goes through loop.create_task, so it inherits the
	factory -- which is what TestEagerTaskTaskGroup relies on."

	self assert: (self at: 'taskgroup_children_are_eager_too') equals: true
%
