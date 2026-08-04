! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TzsetPinningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TzsetPinningTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TzsetPinningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TzsetPinningTestCase
!
! time.tzset(), and the TZ pinning that test.support.run_with_tz needs.
!
! run_with_tz was a no-op passthrough, so eleven CPython test methods that pin
! the timezone around themselves ran in whatever zone the machine was in.  That
! is not a skipped check -- it silently changes what the test MEASURES:
! test_timestamp_naive asserts 18000.0 for the epoch, true in US/Eastern and
! nowhere else, so the same build passed or failed according to where it ran,
! and the scoreboard moved when a laptop changed zones.
!
! GemStone ignores the TZ environment variable entirely (it reads the OS zone),
! so pinning needs a real tzset: resolve the spec to a zone, install it in the
! session, and re-publish the module's cached timezone globals.
!
! Every assertion below sets TZ explicitly, so the expected values hold
! wherever this suite runs -- which is the property the change exists to
! restore.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TzsetPinningTestCase removeAllMethods.
TzsetPinningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TzsetPinningTestCase
setUp
	"Reload tests/python/tzset_pinning.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'tzset_pinning' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tzset_pinning.py')
		name: 'tzset_pinning'.
%

category: 'Grail-Private'
method: TzsetPinningTestCase
assertGlobals: aSelector equal: anArray
	"(timezone, altzone, daylight, tzname) for one pinned zone.  CPython's
	sign convention is seconds WEST of UTC."

	| got |
	got := (testModule @env1:perform: aSelector env: 1) asArray.
	self assert: (got at: 1) equals: (anArray at: 1).
	self assert: (got at: 2) equals: (anArray at: 2).
	self assert: (got at: 3) equals: (anArray at: 3).
	self assert: (got at: 4) asArray equals: (anArray at: 4).
%

! --- Spec resolution ---

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testPosixSpecWithADstRule
	"``EST+05EDT,M3.2.0,M11.1.0'' resolves through the zone name EST5EDT, so
	it carries the REAL DST rule -- which is the point, since the tests
	spelled this way are the ones about fold and the transitions."

	self assertGlobals: #posix_spec_with_dst
		equal: { 18000. 14400. 1. #( 'EST' 'EDT' ) }.
%

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testPosixSpecFixedOffsetWest

	self assertGlobals: #posix_spec_fixed_west
		equal: { 14400. 14400. 0. #( '-04' '-04' ) }.
%

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testPosixSpecFixedOffsetEast
	"POSIX counts WEST as positive, so ``MSK-03'' is UTC+3."

	self assertGlobals: #posix_spec_fixed_east
		equal: { -10800. -10800. 0. #( '+03' '+03' ) }.
%

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testOlsonName

	self assertGlobals: #olson_name equal: { 0. 0. 0. #( 'UTC' 'UTC' ) }.
%

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testOlsonNameWithHalfHourDst
	"Lord Howe: +10:30 standard and a THIRTY-minute DST step, which a
	fixed-offset approximation could not represent."

	self assertGlobals: #olson_name_with_half_hour_dst
		equal: { -37800. -39600. 1. #( '+1030' '+11' ) }.
%

category: 'Grail-Tests - Spec forms'
method: TzsetPinningTestCase
testUnresolvableSpecRaises
	"Grail diverges from CPython on purpose: an unresolvable TZ raises rather
	than silently leaving the old zone in place.  Silent is how the whole
	problem stayed invisible."

	self assert: testModule @env1:unresolvable_spec_raises equals: 'ValueError'.
%

! --- Protocol and session hygiene ---

category: 'Grail-Tests - Protocol'
method: TzsetPinningTestCase
testTzsetReadsAsACallable
	"A unary method on a module is treated as a value attribute, so the
	attribute load INVOKED tzset and answered its return -- ``time.tzset''
	was None and calling it failed with ``'NoneType' object is not callable''.
	hasattr said True throughout, because the probing call succeeded."

	self assert: testModule @env1:tzset_reads_as_a_callable asArray
		equals: #( true true ).
%

category: 'Grail-Tests - Protocol'
method: TzsetPinningTestCase
testUnsettingTzRestoresTheHostZone
	"The zone is SESSION state in the gem, so a pin that leaked would
	silently re-time every later test in the run.  Asserted as a round trip
	rather than against a fixed zone, so it holds on any host."

	self assert: (testModule @env1:restores_the_previous_zone asArray at: 1)
		equals: true.
%

! --- The decorator the vendored tests actually use ---

category: 'Grail-Tests - run_with_tz'
method: TzsetPinningTestCase
testRunWithTzPinsTheZone

	| got |
	got := testModule @env1:run_with_tz_pins_the_zone asArray.
	self assert: (got at: 1) equals: 18000.
	self assert: (got at: 2) asArray equals: #( 'EST' 'EDT' ).
%

category: 'Grail-Tests - run_with_tz'
method: TzsetPinningTestCase
testRunWithTzRestoresAfterTheCall

	self assert: testModule @env1:run_with_tz_restores_after_the_call
		equals: true.
%
