Class {
	#name : 'AsyncioEagerTaskTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncioEagerTaskTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
AsyncioEagerTaskTestCase >> setUp [
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

]

{ #category : 'Grail-Tests - Eagerness' }
AsyncioEagerTaskTestCase >> testALazyTaskHasNotStartedWhenCreated [
	"The contrast, so the check above measures eagerness rather than luck."

	self assert: (self at: 'a_lazy_task_has_not_started_when_created')
		equals: true

]

{ #category : 'Grail-Tests - Eagerness' }
AsyncioEagerTaskTestCase >> testAnEagerBodyRunsBeforeCreateTaskReturns [
	"The defining behaviour: no loop turn between creation and first suspend."

	self assert: (self at: 'eager_body_runs_before_create_task_returns')
		equals: true

]

{ #category : 'Grail-Tests - Current Task' }
AsyncioEagerTaskTestCase >> testAnEagerTaskSeesItselfAsCurrent [
	self assert: (self at: 'an_eager_task_sees_itself_as_current') equals: true

]

{ #category : 'Grail-Tests - Eagerness' }
AsyncioEagerTaskTestCase >> testAnEagerTaskThatNeverSuspendsIsAlreadyDone [
	self assert: (self at: 'an_eager_task_that_never_suspends_is_already_done')
		equals: true

]

{ #category : 'Grail-Tests - The Task Factory' }
AsyncioEagerTaskTestCase >> testCreateEagerTaskFactoryAcceptsASubclass [
	self assert: (self at: 'create_eager_task_factory_accepts_a_subclass')
		equals: true

]

{ #category : 'Grail-Tests - Current Task' }
AsyncioEagerTaskTestCase >> testEagerStartLeavesTheCreatorAsCurrentTask [
	"The nesting check.  _step deletes the current-task slot on the way out,
	which orphans the CREATOR when the step was nested inside its body."

	self assert: (self at: 'eager_start_leaves_the_creator_as_current_task')
		equals: true

]

{ #category : 'Grail-Tests - Current Task' }
AsyncioEagerTaskTestCase >> testEagerTasksKeepTheirName [
	"name reaches the CONSTRUCTOR: a set_name afterwards would arrive too late
	for a body that already ran and read its own task's name."

	self assert: (self at: 'eager_tasks_keep_their_name') equals: true

]

{ #category : 'Grail-Tests - The Task Factory' }
AsyncioEagerTaskTestCase >> testModuleLevelCreateTaskUsesTheFactoryToo [
	"asyncio.create_task built a Task directly, going around the loop and so
	around its factory."

	self assert: (self at: 'module_level_create_task_uses_the_factory_too')
		equals: true

]

{ #category : 'Grail-Tests - TaskGroup' }
AsyncioEagerTaskTestCase >> testTaskGroupChildrenAreEagerToo [
	"TaskGroup.create_task goes through loop.create_task, so it inherits the
	factory -- which is what TestEagerTaskTaskGroup relies on."

	self assert: (self at: 'taskgroup_children_are_eager_too') equals: true

]

{ #category : 'Grail-Tests - The Task Factory' }
AsyncioEagerTaskTestCase >> testTheFactoryIsActuallyConsulted [
	"set_task_factory stored the factory and nothing read it, so this failed
	silently rather than loudly."

	self assert: (self at: 'the_factory_is_actually_consulted') equals: true

]

{ #category : 'Grail-Tests - The Task Factory' }
AsyncioEagerTaskTestCase >> testThePublicNamesAreExported [
	self assert: (self at: 'the_public_names_are_exported') equals: true

]
