! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CalendarTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CalendarTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CalendarTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
CalendarTestCase removeAllMethods: 0.
CalendarTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testIsleap
	| result |
	result := self eval: 'import calendar
(calendar.isleap(2024) and not calendar.isleap(2025)
 and calendar.isleap(2000) and not calendar.isleap(1900))'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testLeapdays
	| result |
	result := self eval: 'import calendar
calendar.leapdays(2000, 2025) == 7 and calendar.leapdays(1900, 1904) == 0'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testWeekday
	"2026-06-12 is a Friday (4); 1970-01-01 was a Thursday (3);
	2000-01-01 was a Saturday (5)."

	| result |
	result := self eval: 'import calendar
(calendar.weekday(2026, 6, 12) == 4
 and calendar.weekday(1970, 1, 1) == 3
 and calendar.weekday(2000, 1, 1) == 5)'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testMonthrange
	"June 2026 starts on a Monday (0) and has 30 days; February 2024
	(leap) has 29."

	| result |
	result := self eval: 'import calendar
(calendar.monthrange(2026, 6) == (0, 30)
 and calendar.monthrange(2024, 2) == (3, 29))'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testMonthrangeBadMonthRaises
	self
		should: [self eval: 'import calendar
calendar.monthrange(2026, 13)']
		raise: ValueError
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testMonthcalendar
	"June 2026: first week is complete (starts Monday the 1st); the
	last week holds the 29th and 30th."

	| result |
	result := self eval: 'import calendar
m = calendar.monthcalendar(2026, 6)
(m[0] == [1, 2, 3, 4, 5, 6, 7]
 and m[-1] == [29, 30, 0, 0, 0, 0, 0]
 and len(m) == 5)'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testTimegm
	"Inverse of time.gmtime: a known epoch value, and a round-trip."

	| result |
	result := self eval: 'import calendar
import time
known = calendar.timegm((2026, 6, 12, 0, 0, 0, 0, 0, 0)) == 1781222400
rt = calendar.timegm(time.gmtime(86400 * 1000 + 3661))
known and rt == 86400 * 1000 + 3661'.
	self assert: result
%

category: 'Grail-Tests - calendar'
method: CalendarTestCase
testNameTables
	| result |
	result := self eval: 'import calendar
(calendar.day_name[0] == "Monday" and calendar.day_abbr[6] == "Sun"
 and calendar.month_name[6] == "June" and calendar.month_abbr[12] == "Dec")'.
	self assert: result
%
