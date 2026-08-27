! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ContextVarsPep567TestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ContextVarsPep567TestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ContextVarsPep567TestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ContextVarsPep567TestCase
!
! contextvars (PEP 567) -- real Contexts, not one global slot.  Drives
! tests/python/contextvars_pep567.py, whose twenty-four checks pass identically
! under CPython 3.14.6 (self-running, so scripts/check_python_fixtures.sh runs
! them there on every gate).  ContextVarsTestCase covers the older
! get/set/reset fixture and stays as it was; this class covers what the stub
! could not express at all.
!
! WHAT WAS THERE BEFORE stored ONE value per ContextVar, on the ContextVar
! itself, and had a Context class whose ``run'' simply called its argument.
! That was written for werkzeug.local -- which uses ContextVar purely as
! proxy-storage indirection in a single-gem process -- and it stayed correct
! for exactly as long as nothing needed two contexts at once.
!
! ASYNCIO NEEDS TWO.  ``loop.create_task(coro, context=ctx)'' exists so that a
! task runs its steps inside a caller-supplied Context and its ContextVar
! writes land THERE: that is how unittest shares one context across
! setUp/test/tearDown, and how a server keeps one request's state out of
! another's.  Under the stub every write went to the same slot, so ``context=''
! had nothing to select between and asyncio did not plumb it at ALL -- not
! through Task, not through create_task, not through call_soon, and
! Runner.run's docstring described the argument as accepted-and-ignored.
!
! THE MODEL, worth knowing before changing any of this: there is a CURRENT
! context; a Context is a mapping of ContextVar -> value; ContextVar.get/set
! read and write the current one; Context.run makes a context current for one
! SYNCHRONOUS call and restores the previous one afterwards.  A task's step is
! such a call, so a task enters its context on every step and leaves it at
! every suspension -- which is how a Context accumulates writes across awaits
! while never being current when the task is parked.
!
! That also bounds it: ``run'' takes a synchronous callable, as upstream does.
! Suspending inside one would leave the wrong context current for whoever
! resumed, because a Grail generator body is a separate call stack while the
! current context is shared.  CPython forbids the same thing for its own
! reasons.
!
! CLOSED test.test_asyncio.test_taskgroups: with the twelve refcount-dependent
! tests skipped explicitly, test_taskgroup_task_context was the last remaining
! failure in that module, which now scores OK.
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: ContextVarsPep567TestCase
setUp
	"Reload the fixture fresh each test.  Its module body RUNS the checks, and
	most drive a real event loop through asyncio.run, so a shared instance would
	let one test observe another's loop and context state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'contextvars_pep567' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/contextvars_pep567.py')
		name: 'contextvars_pep567'.
	probe := testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: ContextVarsPep567TestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! ------------------- Get / Set / Reset
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testAnUnsetVarWithNoDefaultRaisesLookuperror
	self assert: (self at: 'an_unset_var_with_no_default_raises_lookuperror') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testAConstructorDefaultIsReturnedWhenUnset
	self assert: (self at: 'a_constructor_default_is_returned_when_unset') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testAnArgumentDefaultBeatsTheConstructorDefault
	self assert: (self at: 'an_argument_default_beats_the_constructor_default') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testASetValueBeatsEveryDefault
	self assert: (self at: 'a_set_value_beats_every_default') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testNoneIsARealValueNotAnAbsence
	"The ''unset'' sentinel has to be distinct from None, which is a
	perfectly good stored value."

	self assert: (self at: 'none_is_a_real_value_not_an_absence') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testResetRestoresThePreviousValue
	self assert: (self at: 'reset_restores_the_previous_value') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testResetOfAFirstSetRemovesTheVariable
	"Token.MISSING is why reset can REMOVE a variable rather than only
	overwrite it: a first set had no previous value to restore."

	self assert: (self at: 'reset_of_a_first_set_removes_the_variable') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testATokenIsSingleUse
	self assert: (self at: 'a_token_is_single_use') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testATokenBelongsToOneVar
	self assert: (self at: 'a_token_belongs_to_one_var') equals: true
%
category: 'Grail-Tests - Get / Set / Reset'
method: ContextVarsPep567TestCase
testATokenBelongsToOneContext
	self assert: (self at: 'a_token_belongs_to_one_context') equals: true
%

! ------------------- Context as a Mapping
category: 'Grail-Tests - Context as a Mapping'
method: ContextVarsPep567TestCase
testAContextReportsWhatWasSetInIt
	self assert: (self at: 'a_context_reports_what_was_set_in_it') equals: true
%
category: 'Grail-Tests - Context as a Mapping'
method: ContextVarsPep567TestCase
testAContextGetOfAnAbsentVarIsNone
	"test_taskgroup_task_context''s first assertion is exactly this."

	self assert: (self at: 'a_context_get_of_an_absent_var_is_none') equals: true
%
category: 'Grail-Tests - Context as a Mapping'
method: ContextVarsPep567TestCase
testAContextGetitemOfAnAbsentVarRaisesKeyerror
	self assert: (self at: 'a_context_getitem_of_an_absent_var_raises_keyerror') equals: true
%

! ------------------- Context.run
category: 'Grail-Tests - Context.run'
method: ContextVarsPep567TestCase
testRunMakesTheContextCurrentAndThenRestoresIt
	self assert: (self at: 'run_makes_the_context_current_and_then_restores_it') equals: true
%
category: 'Grail-Tests - Context.run'
method: ContextVarsPep567TestCase
testAContextCannotBeEnteredTwice
	"Context.run saves the previous context IN the Context, so a re-entry
	would overwrite that save and the inner exit would restore the WRONG
	one.  That corruption surfaces arbitrarily far from the offending call,
	so it is refused at it."

	self assert: (self at: 'a_context_cannot_be_entered_twice') equals: true
%
category: 'Grail-Tests - Context.run'
method: ContextVarsPep567TestCase
testAContextIsReusableAfterItExits
	"Refusing re-ENTRY must not become refusing a second SEQUENTIAL entry --
	that is the ordinary case, and it is how a Context accumulates."

	self assert: (self at: 'a_context_is_reusable_after_it_exits') equals: true
%
category: 'Grail-Tests - Context.run'
method: ContextVarsPep567TestCase
testRunRestoresTheContextEvenWhenTheCallableRaises
	"The restore is in an ensure/finally.  Without it, one raising callable
	leaves the wrong context current for everything after it."

	self assert: (self at: 'run_restores_the_context_even_when_the_callable_raises') equals: true
%
category: 'Grail-Tests - Context.run'
method: ContextVarsPep567TestCase
testCopyContextSnapshotsValuesAndThenDiverges
	self assert: (self at: 'copy_context_snapshots_values_and_then_diverges') equals: true
%

! ------------------- With asyncio
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testATaskGetsACopyNotTheOriginal
	"The stub''s actual failure: a task''s writes came back to its creator,
	because there was only ever one place to write."

	self assert: (self at: 'a_task_gets_a_copy_not_the_original') equals: true
%
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testATaskCanReadWhatItsCreatorSet
	self assert: (self at: 'a_task_can_read_what_its_creator_set') equals: true
%
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testAnExplicitContextCollectsWritesFromSeveralTasks
	"test_taskgroup_task_context, reduced.  Two tasks write into one
	caller-supplied context across two awaits, and the caller reads both
	values back out from OUTSIDE the tasks."

	self assert: (self at: 'an_explicit_context_collects_writes_from_several_tasks') equals: true
%
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testAContextSurvivesASuspensionMidTask
	"A task enters its context per STEP, so a write made before an await must
	still be there after it: the context is re-entered, not rebuilt."

	self assert: (self at: 'a_context_survives_a_suspension_mid_task') equals: true
%
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testACallbackSeesItsSchedulersContext
	"Handle captures the context at call_soon time, not at run time.  At run
	time a callback would see whatever happened to be current several loop
	turns later, which is the opposite of what PEP 567 promises callbacks."

	self assert: (self at: 'a_callback_sees_its_schedulers_context') equals: true
%
category: 'Grail-Tests - With asyncio'
method: ContextVarsPep567TestCase
testGetContextAnswersTheTasksOwnContext
	self assert: (self at: 'get_context_answers_the_tasks_own_context') equals: true
%
