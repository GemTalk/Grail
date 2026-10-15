Class {
	#name : 'AsyncioTimeoutTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncioTimeoutTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
AsyncioTimeoutTestCase >> setUp [
	"Reload the fixture fresh each test.  Its module body RUNS the checks, and
	most of them drive a real event loop through asyncio.run, so a shared
	instance would let one test observe another's loop state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_timeout' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asyncio_timeout.py')
		name: 'asyncio_timeout'.
	probe := testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Tests - The Budget' }
AsyncioTimeoutTestCase >> testANegativeDelayExpiresAtTheFirstSuspension [
	"test_taskgroups uses ``asyncio.timeout(-1)'' specifically: an already-past
	deadline must fire rather than never fire."

	self assert: (self at: 'a_negative_delay_expires_immediately') equals: true

]

{ #category : 'Grail-Tests - Cancellation' }
AsyncioTimeoutTestCase >> testAnOuterCancellationIsNotConvertedToTimeout [
	"Somebody else cancels the task while a LIVE timeout is in scope.  That is
	a CancelledError and must stay one; reporting TimeoutError would tell the
	caller a deadline passed when none did.  This is the check that fails on a
	build with a boolean _cancel_requested rather than a count."

	self assert: (self at: 'an_outer_cancellation_is_not_converted') equals: true

]

{ #category : 'Grail-Tests - Introspection' }
AsyncioTimeoutTestCase >> testExpiredFlipsOnlyAfterExpiry [
	self assert: (self at: 'expired_reports_true_after_expiry') equals: true

]

{ #category : 'Grail-Tests - The Budget' }
AsyncioTimeoutTestCase >> testExpiryRaisesTimeoutErrorNotCancelledError [
	"The conversion is the whole feature.  A CancelledError escaping here
	would be the cancel arriving without being translated."

	self assert: (self at: 'expiry_raises_timeout_error') equals: true

]

{ #category : 'Grail-Tests - The Budget' }
AsyncioTimeoutTestCase >> testNoneMeansNoDeadline [
	self assert: (self at: 'none_means_no_deadline') equals: true

]

{ #category : 'Grail-Tests - Introspection' }
AsyncioTimeoutTestCase >> testRescheduleExtendsTheBudget [
	self assert: (self at: 'reschedule_extends_the_budget') equals: true

]

{ #category : 'Grail-Tests - Exports' }
AsyncioTimeoutTestCase >> testThePublicNamesAreExported [
	"asyncio.timeout / timeout_at / Timeout, each identical to the submodule's."

	self assert: (self at: 'the_public_names_are_exported') equals: true

]

{ #category : 'Grail-Tests - Cancellation' }
AsyncioTimeoutTestCase >> testTheTimeoutErrorIsChainedFromTheCancellation [
	self assert: (self at: 'the_error_is_chained_from_cancellation') equals: true

]

{ #category : 'Grail-Tests - Introspection' }
AsyncioTimeoutTestCase >> testTimeoutAtTakesAnAbsoluteDeadline [
	self assert: (self at: 'timeout_at_takes_an_absolute_deadline') equals: true

]

{ #category : 'Grail-Tests - The Budget' }
AsyncioTimeoutTestCase >> testWorkInsideTheBudgetIsUneventful [
	self assert: (self at: 'completes_inside_the_budget') equals: true

]
