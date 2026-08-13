! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TzFileHistoryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TzFileHistoryTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TzFileHistoryTestCase - the session zone reads the tz database, so historical
! offsets (including sub-minute ones) are exact.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TzFileHistoryTestCase removeAllMethods.
TzFileHistoryTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - timezone'
method: TzFileHistoryTestCase
testTzFileHistory
	"Local time is derived from the tz DATABASE, not from a rule pair.

	GemStone's TimeZone models one std/dst rule, which describes a zone as
	it stands today but not its history: it was out by 2h across a 1918 DST
	boundary, and cannot represent a pre-1946 offset that is not a whole
	number of minutes at all -- Asia/Tehran ran +3:25:44, which is why
	datetimetester's IranTest was out by exactly 4m16s.

	localtime, mktime, datetime's local conversions, the fold probe and the
	module globals now all read the SAME transition table, so they agree
	with one another and with CPython.  That mutual agreement is the point:
	when only localtime used the table, every round trip was off by the
	difference, and when only the value (not the fold probe) used it, an
	unambiguous 1935 instant came back flagged fold=1.

	Covers a sub-minute historical offset, a historical DST boundary, a
	modern gap (both folds, and that astimezone agrees with timestamp), a
	modern fold, the daylight/tzname globals for a DST and a DST-LESS zone,
	that a POSIX TZ spec with no zone file still works through the
	rule-based path, and that gmtime is untouched."

	| mod results |
	importlib @env1:modules removeKey: #'tzfile_history' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/tzfile_history.py')
		name: 'tzfile_history'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('tehran_lmt_wall_clock' 'tehran_lmt_isdst' 'tehran_roundtrip'
	  'tehran_datetime_agrees' 'tehran_datetime_roundtrip'
	  'tehran_no_spurious_fold'
	  'ny_1918_wall_clock'
	  'gap_fold0_timestamp' 'gap_fold1_timestamp'
	  'gap_astimezone_matches_timestamp'
	  'fold_detected' 'pre_fold_not_flagged'
	  'ny_has_daylight' 'ny_tznames_differ'
	  'utc_no_daylight' 'utc_isdst_flags'
	  'posix_spec_still_works' 'gmtime_still_utc') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
