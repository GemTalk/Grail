Class {
	#name : 'TzsetPinningTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TzsetPinningTestCase >> assertGlobals: aSelector equal: anArray [
	"(timezone, altzone, daylight, tzname) for one pinned zone.  CPython's
	sign convention is seconds WEST of UTC."

	| got |
	got := (testModule @env1:perform: aSelector env: 1) asArray.
	self assert: (got at: 1) equals: (anArray at: 1).
	self assert: (got at: 2) equals: (anArray at: 2).
	self assert: (got at: 3) equals: (anArray at: 3).
	self assert: (got at: 4) asArray equals: (anArray at: 4).

]

{ #category : 'Grail-Setup' }
TzsetPinningTestCase >> setUp [
	"Reload tests/python/tzset_pinning.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'tzset_pinning' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tzset_pinning.py')
		name: 'tzset_pinning'.

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testOlsonName [

	self assertGlobals: #olson_name equal: { 0. 0. 0. #( 'UTC' 'UTC' ) }.

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testOlsonNameWithHalfHourDst [
	"Lord Howe: +10:30 standard and a THIRTY-minute DST step, which a
	fixed-offset approximation could not represent."

	self assertGlobals: #olson_name_with_half_hour_dst
		equal: { -37800. -39600. 1. #( '+1030' '+11' ) }.

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testPosixSpecFixedOffsetEast [
	"POSIX counts WEST as positive, so ``MSK-03'' is UTC+3."

	self assertGlobals: #posix_spec_fixed_east
		equal: { -10800. -10800. 0. #( '+03' '+03' ) }.

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testPosixSpecFixedOffsetWest [

	self assertGlobals: #posix_spec_fixed_west
		equal: { 14400. 14400. 0. #( '-04' '-04' ) }.

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testPosixSpecWithADstRule [
	"``EST+05EDT,M3.2.0,M11.1.0'' resolves through the zone name EST5EDT, so
	it carries the REAL DST rule -- which is the point, since the tests
	spelled this way are the ones about fold and the transitions."

	self assertGlobals: #posix_spec_with_dst
		equal: { 18000. 14400. 1. #( 'EST' 'EDT' ) }.

]

{ #category : 'Grail-Tests - run_with_tz' }
TzsetPinningTestCase >> testRunWithTzPinsTheZone [

	| got |
	got := testModule @env1:run_with_tz_pins_the_zone asArray.
	self assert: (got at: 1) equals: 18000.
	self assert: (got at: 2) asArray equals: #( 'EST' 'EDT' ).

]

{ #category : 'Grail-Tests - run_with_tz' }
TzsetPinningTestCase >> testRunWithTzRestoresAfterTheCall [

	self assert: testModule @env1:run_with_tz_restores_after_the_call
		equals: true.

]

{ #category : 'Grail-Tests - Protocol' }
TzsetPinningTestCase >> testTzsetReadsAsACallable [
	"A unary method on a module is treated as a value attribute, so the
	attribute load INVOKED tzset and answered its return -- ``time.tzset''
	was None and calling it failed with ``'NoneType' object is not callable''.
	hasattr said True throughout, because the probing call succeeded."

	self assert: testModule @env1:tzset_reads_as_a_callable asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - Spec forms' }
TzsetPinningTestCase >> testUnresolvableSpecRaises [
	"Grail diverges from CPython on purpose: an unresolvable TZ raises rather
	than silently leaving the old zone in place.  Silent is how the whole
	problem stayed invisible."

	self assert: testModule @env1:unresolvable_spec_raises equals: 'ValueError'.

]

{ #category : 'Grail-Tests - Protocol' }
TzsetPinningTestCase >> testUnsettingTzRestoresTheHostZone [
	"The zone is SESSION state in the gem, so a pin that leaked would
	silently re-time every later test in the run.  Asserted as a round trip
	rather than against a fixed zone, so it holds on any host."

	self assert: (testModule @env1:restores_the_previous_zone asArray at: 1)
		equals: true.

]
