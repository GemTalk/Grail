! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DatetimeIsADateTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DatetimeIsADateTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DatetimeIsADateTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DatetimeIsADateTestCase
!
! datetime.datetime is a subclass of datetime.date (#1446).  It was a separate
! class, so isinstance(dt, date) was False: Werkzeug's http_date took the
! seconds branch for a datetime, and a permanent Flask session answered 500
! setting its cookie.  Being a subclass must not make the two compare equal:
! date's comparisons and subtraction answer NotImplemented for a datetime, as
! in CPython (PyDate >> ___isDateOperand___:).
!
! Driven by tests/python/datetime_is_a_date.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DatetimeIsADateTestCase removeAllMethods.
DatetimeIsADateTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DatetimeIsADateTestCase
setUp
	(importlib @env1:modules) removeKey: #'datetime_is_a_date' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'datetime_is_a_date'.
%

category: 'Grail-Setup'
method: DatetimeIsADateTestCase
tearDown
	(importlib @env1:modules) removeKey: #'datetime_is_a_date' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: DatetimeIsADateTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/datetime_is_a_date.py'
%

category: 'Grail-Private'
method: DatetimeIsADateTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: DatetimeIsADateTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 47.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

