! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DatetimeLocalTimeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DatetimeLocalTimeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DatetimeLocalTimeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DatetimeLocalTimeTestCase — naive datetimes are HOST-LOCAL, utc* is UTC.
!
! Grail answered UTC for everything except ``date.today()'', which reads the
! SESSION's TimeZone -- and GemStone defaults that to PST regardless of the host
! the gem runs on.  The two therefore disagreed by a day whenever the
! session-zone date differed from the UTC date: for the PST default, exactly when
! the UTC hour is 00:00-06:59.  test_datetime's TestDate.test_today failed inside
! that 7-hour window and passed outside it, so it read as intermittent when it
! was deterministic -- which is why it had been recorded as passing.
!
! The UTC-everywhere design was itself a workaround: now:'s original comment said
! it pulled GMT components ``so the wall clock is unaffected by the gem's local
! timezone''.  Reasonable while the gem's local zone was untrustworthy.  Aligning
! the session zone with the OS removes the reason for it.
!
! Changes pinned here:
!   * ___ensureSessionTimeZone___ aligns the SESSION zone with the OS, once per
!     session.  Session-local on purpose -- TimeZone class >> installOsTimeZone
!     would become: the repository-wide default AND commit.
!   * now / today / fromtimestamp read local fields; utcnow / utcfromtimestamp
!     read GMT fields.  They used to be literally the same methods.
!   * timestamp reads naive fields as LOCAL (CPython), via GemStone's local
!     DateTime constructor so DST is handled by the zone rather than by hand.
!   * __add__ / __sub__ stay purely CIVIL for naive operands, so spans across a
!     DST change neither gain nor lose an hour.
!
! EVERY assertion holds at ANY host offset, including zero: a UTC CI runner makes
! the local and utc* families coincide, so anything hardcoding an offset would
! pass on a developer machine and fail in CI.  The invariants are relationships.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DatetimeLocalTimeTestCase removeAllMethods.
DatetimeLocalTimeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
loadFixture
	"Load tests/python/datetime_localtime.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'datetime_localtime' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/datetime_localtime.py')
		name: 'datetime_localtime'
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testTodayMatchesFromtimestamp
	"THE original failure.  date.today() read the session zone while
	date.fromtimestamp(time.time()) read GMT, so they differed by a day for
	7 hours out of every 24."

	self assert: self loadFixture @env1:today_matches_fromtimestamp
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testNowTimestampRoundtrips
	"now().timestamp() must agree with time.time().  This is what broke when
	now() became local while timestamp() still read naive fields as UTC."

	self assert: self loadFixture @env1:now_timestamp_roundtrips equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testFromtimestampRoundtrips

	self assert: self loadFixture @env1:fromtimestamp_roundtrips equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testUtcFromtimestampIsRealUtc
	"Pins the utc* family against time.gmtime -- an independent witness that
	does not depend on the host offset."

	self assert: self loadFixture @env1:utcfromtimestamp_matches_gmtime
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testUtcAndLocalDescribeOneInstant
	"The two families are the same instant an offset apart, whatever that
	offset is (including zero)."

	self assert: self loadFixture @env1:utc_and_local_are_the_same_instant
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testUtcnowIsNoLongerNow
	"utcnow() and now() were literally the same method.  On a UTC host they
	legitimately agree, so the fixture reports 'utc-host' there and the
	offset-bearing case asserts they differ by the offset."

	| r |
	r := (self loadFixture @env1:utcnow_is_not_local_when_offset_nonzero)
		@env0:asString.
	self assert: (#('differ' 'utc-host') includes: r)
		description: 'utcnow/now relationship was: ' , r
%

! --- naive arithmetic stays civil -------------------------------------------

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testNaiveAdditionIsCivil
	"datetime + timedelta is calendar arithmetic.  Once naive fromtimestamp
	became local, routing __add__ through it dropped the offset on every
	addition: 2024-01-01 + 10d5h answered 2024-01-11 00:00, not 05:00."

	self assert: self loadFixture @env1:naive_addition_is_civil equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testNaiveAdditionAcrossDst

	self assert: self loadFixture @env1:naive_addition_across_dst equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testNaiveSubtractionAcrossDst
	"Naive subtraction must not apply the host offset at each end: that
	loses the DST hour (2588400 instead of 2592000 seconds)."

	self assert: self loadFixture @env1:naive_subtraction_across_dst
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testConstructedNaiveTimestampRoundtrips
	"Ordering trap: this path reaches local time WITHOUT constructing
	anything from the clock, so the epoch helper has to align the session
	zone itself rather than rely on an earlier now()/today() call.  Without
	that, datetime(2024,1,1).timestamp() was converted under GemStone's PST
	default even on an EDT host."

	self assert: self loadFixture @env1:naive_timestamp_roundtrips_through_local
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testAwareTimestampUnchanged
	"Guard: an AWARE datetime still subtracts its own utcoffset and is
	unaffected by the naive/local change (test_issue23600's invariant)."

	self assert: self loadFixture @env1:aware_timestamp_unchanged equals: true
%

! --- the time module has to agree with datetime ------------------------------

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testMktimeLocaltimeRoundtrips
	"mktime is localtime's inverse.  While localtime WAS gmtime, mktime was
	a UTC inverse -- consistent with itself but not with a local
	datetime.fromtimestamp."

	self assert: self loadFixture @env1:mktime_localtime_roundtrips
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testFromtimestampOfMktimeKeepsTheDate
	"CPython's TestDate.test_fromtimestamp in miniature: build an epoch from
	a local civil date with mktime, read it back with date.fromtimestamp.
	A UTC mktime feeding a local fromtimestamp slipped a whole day
	(``18 != 19'')."

	self assert: self loadFixture @env1:fromtimestamp_of_mktime_is_that_date
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testTimeOffsetMatchesDatetimeOffset
	"time.timezone/altzone must describe the SAME offset datetime uses --
	the invariant whose absence caused the original bug.  Derived from
	datetime and checked against whichever applies per tm_isdst, so it holds
	at any offset including zero."

	self assert: self loadFixture @env1:time_offset_matches_datetime_offset
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testLocaltimeAndGmtimeDifferByTheOffset

	self assert: self loadFixture @env1:localtime_and_gmtime_differ_by_the_offset
		equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testGmtimeIsStillUtc
	"Guard: converting localtime to real local time must not move gmtime."

	self assert: self loadFixture @env1:gmtime_is_still_utc equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testTznameIsAPairOfNames
	"tzname was the fixed ('UTC','UTC') stand-in; it now comes from the
	zone's standard/DST print strings."

	self assert: self loadFixture @env1:tzname_is_a_pair_of_names equals: true
%

category: 'Grail-Tests-DatetimeLocalTime'
method: DatetimeLocalTimeTestCase
testDaylightFlagIsConsistent
	"daylight is 1 exactly when the standard and DST offsets differ."

	self assert: self loadFixture @env1:daylight_flag_is_consistent equals: true
%
