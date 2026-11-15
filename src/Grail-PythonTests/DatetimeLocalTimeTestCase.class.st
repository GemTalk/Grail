Class {
	#name : 'DatetimeLocalTimeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> loadFixture [
	"Load tests/python/datetime_localtime.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'datetime_localtime' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/datetime_localtime.py')
		name: 'datetime_localtime'

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testAwareTimestampUnchanged [
	"Guard: an AWARE datetime still subtracts its own utcoffset and is
	unaffected by the naive/local change (test_issue23600's invariant)."

	self assert: self loadFixture @env1:aware_timestamp_unchanged equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testConstructedNaiveTimestampRoundtrips [
	"Ordering trap: this path reaches local time WITHOUT constructing
	anything from the clock, so the epoch helper has to align the session
	zone itself rather than rely on an earlier now()/today() call.  Without
	that, datetime(2024,1,1).timestamp() was converted under GemStone's PST
	default even on an EDT host."

	self assert: self loadFixture @env1:naive_timestamp_roundtrips_through_local
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testDaylightFlagIsConsistent [
	"daylight is 1 exactly when the standard and DST offsets differ."

	self assert: self loadFixture @env1:daylight_flag_is_consistent equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testFromtimestampOfMktimeKeepsTheDate [
	"CPython's TestDate.test_fromtimestamp in miniature: build an epoch from
	a local civil date with mktime, read it back with date.fromtimestamp.
	A UTC mktime feeding a local fromtimestamp slipped a whole day
	(``18 != 19'')."

	self assert: self loadFixture @env1:fromtimestamp_of_mktime_is_that_date
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testFromtimestampRoundtrips [

	self assert: self loadFixture @env1:fromtimestamp_roundtrips equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testGmtimeIsStillUtc [
	"Guard: converting localtime to real local time must not move gmtime."

	self assert: self loadFixture @env1:gmtime_is_still_utc equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testIsdstTracksTheZone [
	"tm_isdst must reflect the zone on a DST-LESS zone as well as a DST one.

	Checks two instants six months apart under zones the fixture PINS with
	TZ -- DST in each hemisphere, and three without -- so it is independent
	of the host: with no DST rule both must be 0, with a DST rule they must
	differ.  It used to read the host zone and branch on time.daylight, and
	failed on a host in America/Vancouver after November 2026 (daylight 0,
	yet July 2026 was PDT) with no bug present.
	The first implementation reported 1 for EVERY instant on a DST-less zone
	(equal standard and DST offsets made the deciding comparison trivially
	true), and nothing caught it -- on such a zone timezone == altzone, so
	the offset assertions agree whichever branch they take.  A green CI run
	would not have found this; it took auditing for the same shape of
	assumption after the tzname empty-name bug."

	self assert: (self loadFixture @env1:isdst_tracks_the_zone) @env0:asString
		equals: 'ok'

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testLocaltimeAndGmtimeDifferByTheOffset [

	self assert: self loadFixture @env1:localtime_and_gmtime_differ_by_the_offset
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testMktimeLocaltimeRoundtrips [
	"mktime is localtime's inverse.  While localtime WAS gmtime, mktime was
	a UTC inverse -- consistent with itself but not with a local
	datetime.fromtimestamp."

	self assert: self loadFixture @env1:mktime_localtime_roundtrips
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testNaiveAdditionAcrossDst [

	self assert: self loadFixture @env1:naive_addition_across_dst equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testNaiveAdditionIsCivil [
	"datetime + timedelta is calendar arithmetic.  Once naive fromtimestamp
	became local, routing __add__ through it dropped the offset on every
	addition: 2024-01-01 + 10d5h answered 2024-01-11 00:00, not 05:00."

	self assert: self loadFixture @env1:naive_addition_is_civil equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testNaiveSubtractionAcrossDst [
	"Naive subtraction must not apply the host offset at each end: that
	loses the DST hour (2588400 instead of 2592000 seconds)."

	self assert: self loadFixture @env1:naive_subtraction_across_dst
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testNowTimestampRoundtrips [
	"now().timestamp() must agree with time.time().  This is what broke when
	now() became local while timestamp() still read naive fields as UTC."

	self assert: self loadFixture @env1:now_timestamp_roundtrips equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testSessionStartHonoursTz [
	"A gem started with TZ set runs datetime in that zone from its first call,
	as a CPython process started with TZ does -- without anyone calling
	tzset().  The session's zone used to come from TimeZone class >> fromOS,
	which reads /etc/localtime and nothing else, so datetime ran in the
	machine's zone while the time module, which reads TZ, ran in TZ's.

	Simulated in-session: set TZ WITHOUT tzset, put the session back in the
	state a fresh gem starts in -- no zone aligned yet
	(PyDateTime class >> ___ensureSessionTimeZone___'s memo) and no zone
	table read yet (the time module's GrailTzTable) -- and ask for
	date.today(), which reads the session zone through GemStone's Date
	today.  Do that under Pacific/Kiritimati (+14) and Pacific/Pago_Pago
	(-11): 25 hours apart, so their dates differ by one or two days at
	every instant, while with the old fromOS both answered the host's date.

	It has to be today().  now(), fromtimestamp(), a naive timestamp() and
	the time module's globals all reach the zone through the time module,
	which reads TZ itself; versions of this test built on now() and on
	fromtimestamp() both passed with the fix reverted."

	| temps prior todayIn east west |
	temps := SessionTemps current.
	prior := self eval: 'import os
os.environ.get(''TZ'', ''<unset>'')'.
	todayIn := [:zoneName |
		self eval: 'import os
os.environ[''TZ''] = zone' with: {#zone -> zoneName}.
		temps
			at: #'GrailSessionTimeZoneSet' put: false;
			at: #'GrailTzTableSet' put: false;
			at: #'GrailTzTable' put: nil.
		self eval: 'import datetime
datetime.date.today().toordinal()'].
	[east := todayIn value: 'Pacific/Kiritimati'.
	 west := todayIn value: 'Pacific/Pago_Pago'.
	 self assert: ((east - west) between: 1 and: 2)]
		ensure: [
			"tzset installs the restored zone as the session's, and sets the memo."
			self eval: 'import os, time
if prior == ''<unset>'':
    os.environ.pop(''TZ'', None)
else:
    os.environ[''TZ''] = prior
time.tzset()' with: {#prior -> prior}]

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testTimeOffsetMatchesDatetimeOffset [
	"time.timezone/altzone must describe the SAME offset datetime uses --
	the invariant whose absence caused the original bug.  Derived from
	datetime and checked against whichever applies per tm_isdst, so it holds
	at any offset including zero."

	self assert: self loadFixture @env1:time_offset_matches_datetime_offset
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testTodayMatchesFromtimestamp [
	"THE original failure.  date.today() read the session zone while
	date.fromtimestamp(time.time()) read GMT, so they differed by a day for
	7 hours out of every 24."

	self assert: self loadFixture @env1:today_matches_fromtimestamp
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testTznameIsAPairOfNames [
	"tzname was the fixed ('UTC','UTC') stand-in; it now comes from the
	zone's standard/DST print strings."

	self assert: self loadFixture @env1:tzname_is_a_pair_of_names equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testUtcAndLocalDescribeOneInstant [
	"The two families are the same instant an offset apart, whatever that
	offset is (including zero)."

	self assert: self loadFixture @env1:utc_and_local_are_the_same_instant
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testUtcFromtimestampIsRealUtc [
	"Pins the utc* family against time.gmtime -- an independent witness that
	does not depend on the host offset."

	self assert: self loadFixture @env1:utcfromtimestamp_matches_gmtime
		equals: true

]

{ #category : 'Grail-Tests-DatetimeLocalTime' }
DatetimeLocalTimeTestCase >> testUtcnowAndNowAreTheOffsetApart [
	"utcnow() and now() were literally the same method.  They are the zone's
	CURRENT offset apart, checked in the host's zone and in every zone the
	fixture pins -- so a UTC host, where the two legitimately agree, still
	exercises the offset-bearing cases.

	This replaced testUtcnowIsNoLongerNow, whose fixture compared the offset
	at a fixed July instant with the offset now: in any DST zone that is a
	different offset for half the year, so it failed in America/Los_Angeles
	from November and in Australia/Sydney from April, under CPython too."

	self assert: self loadFixture @env1:utcnow_and_now_are_the_offset_apart
		equals: true

]
