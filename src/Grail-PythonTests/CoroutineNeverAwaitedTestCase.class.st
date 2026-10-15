Class {
	#name : 'CoroutineNeverAwaitedTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
CoroutineNeverAwaitedTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
CoroutineNeverAwaitedTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
CoroutineNeverAwaitedTestCase >> setUp [

	importlib @env1:modules removeKey: #'coroutine_never_awaited' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_never_awaited.py')
		name: 'coroutine_never_awaited'

]

{ #category : 'Grail-Tests - The warning' }
CoroutineNeverAwaitedTestCase >> testACaptureSeesACoroutineDroppedInsideIt [
	"No collection in either check.  CPython warns at the drop; Grail warns as
	the capture closes (PythonCoroutine class >> ___closeCapture___:),
	and a coroutine merely KEPT unstarted across the capture is reported by
	neither -- test_bpo_45813_1 depends on the first."

	self assertAll: #('a_capture_sees_a_coroutine_dropped_inside_it'
		'a_coroutine_kept_across_a_capture_is_not_reported')

]

{ #category : 'Grail-Tests - Cost' }
CoroutineNeverAwaitedTestCase >> testACollectionReleasesEveryWatch [
	"A watch per coroutine CALL is the cost docs/Issues.md weighed, and the
	watches must not leak.  Between collections they accumulate -- measured:
	20,000 coroutines driven to completion left all 20,000 pending, because a
	young-generation scavenge does not mourn ephemerons and only a mark-sweep
	does -- so the property worth pinning is that a collection releases them:
	every one of those coroutines finished, so none of them warns and none of
	their watches outlives gc.collect()."

	| before after |
	self eval: 'from test.support import gc_collect
gc_collect()
None'.
	before := FinalizerEphemeron _pendingCount.
	self eval: 'from test.support import gc_collect
async def leaf():
    return 1
def drive(n):
    for _ in range(n):
        c = leaf()
        try:
            c.send(None)
        except StopIteration:
            pass
drive(5000)
gc_collect()
None'.
	after := FinalizerEphemeron _pendingCount.
	self assert: after - before < 100
		description: 'watches left after a collection: ' , (after - before) printString

]

{ #category : 'Grail-Tests - The warning' }
CoroutineNeverAwaitedTestCase >> testADroppedCoroutineWarnsAndADrivenOneDoesNot [

	self assertAll: #('a_dropped_coroutine_warns_when_collected'
		'a_closed_awaited_or_thrown_coroutine_is_quiet')

]

{ #category : 'Grail-Tests - frame.clear' }
CoroutineNeverAwaitedTestCase >> testFrameClearFinalizesAsCPythonDoes [

	self assertAll: #('clearing_an_unstarted_coroutines_frame_warns_on_the_spot'
		'a_suspended_generators_frame_refuses_to_clear')

]

{ #category : 'Grail-Tests - Neighbours' }
CoroutineNeverAwaitedTestCase >> testGetframeinfoAndTheCoroutineTypeDocs [

	self assertAll: #('getframeinfo_names_the_frame'
		'the_coroutine_type_documents_itself_as_a_coroutine')

]

{ #category : 'Grail-Tests - Origin tracking' }
CoroutineNeverAwaitedTestCase >> testOriginTracking [

	self assertAll: #('cr_origin_is_none_without_tracking'
		'cr_origin_records_the_creating_frames_innermost_first'
		'a_negative_depth_is_refused_and_leaves_it_unchanged')

]

{ #category : 'Grail-Tests - The warning' }
CoroutineNeverAwaitedTestCase >> testWhatEscapesTheDestructorIsReportedAsUnraisable [

	self assertAll: #('an_error_filter_reports_the_warning_as_unraisable'
		'a_broken_hook_is_reported_and_the_plain_warning_still_issued')

]
