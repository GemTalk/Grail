Class {
	#name : 'ContextVarsPep567TestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ContextVarsPep567TestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ContextVarsPep567TestCase >> setUp [
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

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testACallbackSeesItsSchedulersContext [
	"Handle captures the context at call_soon time, not at run time.  At run
	time a callback would see whatever happened to be current several loop
	turns later, which is the opposite of what PEP 567 promises callbacks."

	self assert: (self at: 'a_callback_sees_its_schedulers_context') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testAConstructorDefaultIsReturnedWhenUnset [
	self assert: (self at: 'a_constructor_default_is_returned_when_unset') equals: true

]

{ #category : 'Grail-Tests - Context.run' }
ContextVarsPep567TestCase >> testAContextCannotBeEnteredTwice [
	"Context.run saves the previous context IN the Context, so a re-entry
	would overwrite that save and the inner exit would restore the WRONG
	one.  That corruption surfaces arbitrarily far from the offending call,
	so it is refused at it."

	self assert: (self at: 'a_context_cannot_be_entered_twice') equals: true

]

{ #category : 'Grail-Tests - Context as a Mapping' }
ContextVarsPep567TestCase >> testAContextGetitemOfAnAbsentVarRaisesKeyerror [
	self assert: (self at: 'a_context_getitem_of_an_absent_var_raises_keyerror') equals: true

]

{ #category : 'Grail-Tests - Context as a Mapping' }
ContextVarsPep567TestCase >> testAContextGetOfAnAbsentVarIsNone [
	"test_taskgroup_task_context''s first assertion is exactly this."

	self assert: (self at: 'a_context_get_of_an_absent_var_is_none') equals: true

]

{ #category : 'Grail-Tests - Context.run' }
ContextVarsPep567TestCase >> testAContextIsReusableAfterItExits [
	"Refusing re-ENTRY must not become refusing a second SEQUENTIAL entry --
	that is the ordinary case, and it is how a Context accumulates."

	self assert: (self at: 'a_context_is_reusable_after_it_exits') equals: true

]

{ #category : 'Grail-Tests - Context as a Mapping' }
ContextVarsPep567TestCase >> testAContextReportsWhatWasSetInIt [
	self assert: (self at: 'a_context_reports_what_was_set_in_it') equals: true

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testAContextSurvivesASuspensionMidTask [
	"A task enters its context per STEP, so a write made before an await must
	still be there after it: the context is re-entered, not rebuilt."

	self assert: (self at: 'a_context_survives_a_suspension_mid_task') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testAnArgumentDefaultBeatsTheConstructorDefault [
	self assert: (self at: 'an_argument_default_beats_the_constructor_default') equals: true

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testAnExplicitContextCollectsWritesFromSeveralTasks [
	"test_taskgroup_task_context, reduced.  Two tasks write into one
	caller-supplied context across two awaits, and the caller reads both
	values back out from OUTSIDE the tasks."

	self assert: (self at: 'an_explicit_context_collects_writes_from_several_tasks') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testAnUnsetVarWithNoDefaultRaisesLookuperror [
	self assert: (self at: 'an_unset_var_with_no_default_raises_lookuperror') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testASetValueBeatsEveryDefault [
	self assert: (self at: 'a_set_value_beats_every_default') equals: true

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testATaskCanReadWhatItsCreatorSet [
	self assert: (self at: 'a_task_can_read_what_its_creator_set') equals: true

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testATaskGetsACopyNotTheOriginal [
	"The stub''s actual failure: a task''s writes came back to its creator,
	because there was only ever one place to write."

	self assert: (self at: 'a_task_gets_a_copy_not_the_original') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testATokenBelongsToOneContext [
	self assert: (self at: 'a_token_belongs_to_one_context') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testATokenBelongsToOneVar [
	self assert: (self at: 'a_token_belongs_to_one_var') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testATokenIsSingleUse [
	self assert: (self at: 'a_token_is_single_use') equals: true

]

{ #category : 'Grail-Tests - Context.run' }
ContextVarsPep567TestCase >> testCopyContextSnapshotsValuesAndThenDiverges [
	self assert: (self at: 'copy_context_snapshots_values_and_then_diverges') equals: true

]

{ #category : 'Grail-Tests - With asyncio' }
ContextVarsPep567TestCase >> testGetContextAnswersTheTasksOwnContext [
	self assert: (self at: 'get_context_answers_the_tasks_own_context') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testNoneIsARealValueNotAnAbsence [
	"The ''unset'' sentinel has to be distinct from None, which is a
	perfectly good stored value."

	self assert: (self at: 'none_is_a_real_value_not_an_absence') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testResetOfAFirstSetRemovesTheVariable [
	"Token.MISSING is why reset can REMOVE a variable rather than only
	overwrite it: a first set had no previous value to restore."

	self assert: (self at: 'reset_of_a_first_set_removes_the_variable') equals: true

]

{ #category : 'Grail-Tests - Get / Set / Reset' }
ContextVarsPep567TestCase >> testResetRestoresThePreviousValue [
	self assert: (self at: 'reset_restores_the_previous_value') equals: true

]

{ #category : 'Grail-Tests - Context.run' }
ContextVarsPep567TestCase >> testRunMakesTheContextCurrentAndThenRestoresIt [
	self assert: (self at: 'run_makes_the_context_current_and_then_restores_it') equals: true

]

{ #category : 'Grail-Tests - Context.run' }
ContextVarsPep567TestCase >> testRunRestoresTheContextEvenWhenTheCallableRaises [
	"The restore is in an ensure/finally.  Without it, one raising callable
	leaves the wrong context current for everything after it."

	self assert: (self at: 'run_restores_the_context_even_when_the_callable_raises') equals: true

]
