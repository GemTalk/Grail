! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TimeClockTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TimeClockTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
TimeClockTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TimeClockTestCase - time.monotonic / perf_counter / process_time
!
! These four used to alias the WALL clock (time.monotonic was literally
! ``^ self time''), which cost them the one property their names promise:
! they moved when the system clock moved, and their resolution was the wall
! clock's milliseconds.  They now read System class >> timeNs (CLOCK_MONOTONIC,
! nanoseconds, epoch explicitly uncorrelated with time of day) and
! System class >> readClockNano (this process's CPU time).
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
TimeClockTestCase removeAllMethods: 0.
TimeClockTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Monotonic'
method: TimeClockTestCase
testMonotonicAdvancesAcrossASleep
	"A 60ms sleep must show up as at least ~50ms of monotonic time (slack
	for the ms truncation in time.sleep and scheduler latency)."

	self assert: (self eval: 'import time
t0 = time.monotonic_ns()
time.sleep(0.06)
(time.monotonic_ns() - t0) >= 50_000_000') equals: true
%

category: 'Grail-Tests - Monotonic'
method: TimeClockTestCase
testMonotonicNeverGoesBackwards
	"The defining property, and the one the wall-clock aliasing could not
	promise: repeated reads are non-decreasing."

	self assert: (self eval: 'import time
xs = [time.monotonic_ns() for _ in range(50)]
all(b >= a for a, b in zip(xs, xs[1:]))') equals: true
%

category: 'Grail-Tests - Monotonic'
method: TimeClockTestCase
testMonotonicIsNotTheWallClock
	"REGRESSION: monotonic() was ``^ self time''.  Its epoch is documented
	as arbitrary, so it must NOT read as a Unix timestamp -- the old
	implementation did, which is how the aliasing hid for so long."

	self assert: (self eval: 'import time
abs(time.monotonic() - time.time()) > 1000') equals: true
%

category: 'Grail-Tests - Monotonic'
method: TimeClockTestCase
testMonotonicFloatAgreesWithNs
	"monotonic() is monotonic_ns() in seconds; they must not drift apart."

	self assert: (self eval: 'import time
ns = time.monotonic_ns()
s = time.monotonic()
abs(s - ns / 1_000_000_000) < 0.5') equals: true
%

category: 'Grail-Tests - Monotonic'
method: TimeClockTestCase
testPerfCounterAdvancesAndIsMonotonic
	self assert: (self eval: 'import time
t0 = time.perf_counter()
time.sleep(0.03)
t1 = time.perf_counter()
t1 > t0 and (t1 - t0) < 60') equals: true
%

category: 'Grail-Tests - Process time'
method: TimeClockTestCase
testProcessTimeExcludesSleep
	"REGRESSION: process_time() mirrored monotonic(), i.e. reported ELAPSED
	time, so any caller measuring CPU cost counted every sleep and I/O wait.
	CPU time must barely move across a sleep, while monotonic does."

	self assert: (self eval: 'import time
c0 = time.process_time()
m0 = time.monotonic()
time.sleep(0.20)
cpu = time.process_time() - c0
wall = time.monotonic() - m0
wall >= 0.15 and cpu < 0.10') equals: true
%

category: 'Grail-Tests - Process time'
method: TimeClockTestCase
testProcessTimeRisesWithWork
	"The other half: real CPU work must move it."

	self assert: (self eval: 'import time
c0 = time.process_time_ns()
total = 0
for i in range(20000):
    total += i
time.process_time_ns() > c0') equals: true
%

category: 'Grail-Tests - Process time'
method: TimeClockTestCase
testProcessTimeFloatAgreesWithNs
	self assert: (self eval: 'import time
ns = time.process_time_ns()
s = time.process_time()
isinstance(ns, int) and abs(s - ns / 1_000_000_000) < 0.5') equals: true
%
