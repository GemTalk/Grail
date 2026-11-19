! file tests/scripts/runTestsShard.gs
!
! Sharded runner for the main PythonTestCase suite.  Reads two env vars:
!   GRAIL_TEST_WORKERS  total number of shards N (default 1)
!   GRAIL_TEST_SHARD    this worker's index, 0..N-1 (default 0)
!
! Builds the full PythonTestCase suite, then runs only the test classes
! GrailShardPlan places on this shard -- a deterministic assignment by measured
! class time (tests/scripts/shard_timings.txt), so every worker computes the
! identical partition and no test is run twice or skipped across workers.  scripts/run_tests.sh
! launches N of these concurrently (a genuine multi-session concurrency
! exercise, since GemStone runs them against one stone) and aggregates.
!
! The suite must not commit, so concurrent shards share the committed Grail
! image read-only and compile their imports transiently -- no cross-shard
! interference.  Emits one machine-readable GRAIL_SHARD_RESULT line and exits
! 0 iff this shard passed.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
iferr_clear 
login
run
| dir |
"Ask importlib for the checkout root instead of guessing one: grailDir honours
an explicit ``grailDir:'' and otherwise resolves lazily, preferring a candidate
that really holds src/python/stdlib.  Export the resolved value to GRAIL_DIR --
the Python half reads os.environ there -- only when it is unset or disagrees."
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]].
"Nothing to configure here any more: canonical modules are unconditional, so
the framework deployment (scripts/deployFrameworks.gs, run first by
run_tests.sh) warm-BINDS the committed flask/werkzeug/jinja2/twilio closure
instead of recompiling it per shard -- measured full gate 194s -> 104s.
Coherent for the suite: fixtures are never deployed, so their per-test
re-imports stay fully cold (CPython semantics); only the committed framework
closures bind, and they pass identically (3014/3014 warm).  What is warm and
what is cold is decided ENTIRELY by what has been committed (``isCommitted''),
which is why GRAIL_TEST_COLD=1 still works as the everything-recompiled
escape hatch: it simply skips the deploy."
%
level 1
run
| out numWorkers idx full shard result leaves plan
  groups order shardT0 shardOf codeIndex codeKB codePeakKB codeCapKB
  liveKB memBeforeKB memFlag |
out := GsFile stdout.
out nextPutAll:'topaz -l  processId = ' , System gemProcessId asString ; lf .
numWorkers := (System gemEnvironmentVariable: 'GRAIL_TEST_WORKERS') ifNil: ['1'].
out nextPutAll:'GRAIL_TEST_WORKERS = ', numWorkers asString; lf .
numWorkers := (numWorkers isEmpty ifTrue: [1] ifFalse: [numWorkers asNumber]).
(numWorkers isNil or: [numWorkers < 1]) ifTrue: [numWorkers := 1].
out nextPutAll:'numWorkers = ', numWorkers asString; lf .
idx := System gemEnvironmentVariable: 'GRAIL_TEST_SHARD' .
out nextPutAll:'GRAIL_TEST_SHARD = ', idx asString; lf .
idx ifNil:[ idx := '0' ].
idx := (idx isEmpty ifTrue: [0] ifFalse: [idx asNumber]).
idx isNil ifTrue: [idx := 0].
out nextPutAll:'   idx = ', idx asString; lf .
"PythonTestCase suite is a suite of PER-CLASS sub-suites; flatten to leaf
TestCase instances in ORIGINAL suite order (pre-order DFS).  Order matters:
some tests incidentally rely on a module imported by an earlier test in the
same session (e.g. numbers.Integral registration) -- preserving order keeps
WORKERS=1 identical to runTests.gs.  (True cross-test dependencies that span
shards are surfaced by WORKERS>1 and fixed at the test level.)"
full := PythonTestCase suite.
leaves := GrailShardPlan leavesOf: full.
"Partition by CLASS (not per test): all of a class's tests go to the same
shard.  This (a) preserves within-class order + any within-class state
dependencies, and (b) keeps each framework's tests on a single shard so
werkzeug / flask / django compile ONCE (on their owner shard) rather than
once per shard.

WHICH shard is GrailShardPlan's call: a longest-processing-time assignment by
the measured per-class times in tests/scripts/shard_timings.txt -- and by the
per-class memory there too, when the file has it -- with classes
the file does not know costed by their test count (see the class comment, and
scripts/refresh_shard_timings.sh to re-measure).  Every worker builds the same
plan from the same suite, file and GRAIL_TEST_SHARD0_RESERVE_S, so they agree
without communicating; the GRAIL_SHARD_PLAN line's digest lets run_tests.sh
check that they did, and its suiteTests that the shards ran the whole suite."
plan := GrailShardPlan
  workers: numWorkers
  leaves: leaves
  timings: (GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath)
  memory: (GrailShardPlan readMemory: GrailShardPlan defaultTimingsPath)
  reserveMs: GrailShardPlan reserveMsFromEnvironment.
out nextPutAll: 'GRAIL_SHARD_PLAN|idx='; nextPutAll: idx printString;
  nextPutAll: '|digest='; nextPutAll: plan digest printString;
  nextPutAll: '|timed='; nextPutAll: plan isTimed printString;
  nextPutAll: '|classes='; nextPutAll: (plan classesOn: idx) size printString;
  nextPutAll: '|tests='; nextPutAll: (plan testCountOn: idx) printString;
  nextPutAll: '|plannedMs='; nextPutAll: (plan plannedMsOn: idx) printString;
  nextPutAll: '|plannedKB='; nextPutAll: (plan plannedKBOn: idx) printString;
  nextPutAll: '|suiteTests='; nextPutAll: plan suiteSize printString; lf.
"Collect this shard's tests twice over: once into the shard suite (whose
`resources' the reset contract below needs), and once into a per-CLASS suite
kept in first-appearance order, so each class can be timed separately.  Running
the per-class suites in that order visits exactly the tests the shard suite
holds, in exactly the same order."
shardOf := [:key | plan shardOf: key].
shard := TestSuite new.
groups := Dictionary new.
order := OrderedCollection new.
leaves do: [:t | | key |
  key := t class name asString.
  ((shardOf value: key) = idx) ifTrue: [
    shard addTest: t.
    (groups includesKey: key) ifFalse: [
      order add: key.
      groups at: key put: TestSuite new].
    (groups at: key) addTest: t]].
"GrailTestResult, not the stock TestResult that TestSuite>>run would build, so
that a defect reports its MESSAGE and (for errors) a stack.  Stock SUnit keeps
only the TestCase, which is why a red CI shard used to say no more than
``FooTestCase debug: #testBar'' and diagnosing it meant reproducing the whole
run by hand.  See src/smalltalk/PythonTests/GrailTestResult.gs.

Inlined rather than sent as GrailTestResult class>>run:, because the loop times
each class; the TestResource reset is part of that method's contract, so it is
reproduced here rather than dropped."
"SKIPPED TESTS ARE REPORTED, NOT JUST ABSENT.  PythonTestCase class>>
allTestSelectors leaves out whatever a class's #skippedTests names on this gem
(GemStone's SUnit has no skip of its own), so the suite above never held them.
Name each one, with its reason, from the shard that OWNS the class -- the same
partition as the tests -- so every skip is printed exactly once per run and
scripts/run_tests.sh can list them under the summary.  A class whose tests are
ALL skipped has no leaves, which is why this walks the classes, not the leaves."
(PythonTestCase allSubclasses asSortedCollection: [:a :b | a name <= b name]) do: [:cls |
  (cls isAbstract not and: [(shardOf value: cls name asString) = idx]) ifTrue: [
    (cls skippedTests keys asSortedCollection: [:a :b | a <= b]) do: [:sel |
      out nextPutAll: 'GRAIL_SKIP|'; nextPutAll: cls name; nextPutAll: '>>';
        nextPutAll: sel; nextPutAll: '|'; nextPutAll: (cls skippedTests at: sel); lf]]].
"One GRAIL_CLASS_TIME|<shard>|<class>|<ms>|<tests> line per class, always:
it is what scripts/refresh_shard_timings.sh reads, from CI's uploaded logs, to
rewrite tests/scripts/shard_timings.txt."
"The code region is capped apart from the object memory GRAIL_SHARD_MEM
measures (GEM_TEMPOBJ_CODE_SIZE, set beside GEM_TEMPOBJ_CACHE_SIZE): it holds
the code of every doit the shard compiles and, on Linux x86_64 only, their
native code.  A CI text-arm shard died of it on 2026-11-07 (run 42327784296,
`native code space full' at its 149th class of 161) while the same shard
passed on a Mac, which generates no native code.  The gem's own statistic is
sampled after each class, because code is collected as it goes and the peak,
not the end, is what meets the cap."
codeIndex := System cacheStatisticsDescriptionForGem indexOf: 'CodeCacheSizeKBytes'.
codeKB := [(System gemCacheStatisticsForSessionId: System session) at: codeIndex].
codeCapKB := (System gemConfigurationAt: #GEM_TEMPOBJ_CODE_SIZE) // 1024.
codePeakKB := 0.
result := GrailTestResult new.
"GRAIL_CLASS_MEM|<shard>|<class>|<KB>|<liveKB>: what each class added to the
memory this session holds LIVE -- the KB in use after a mark sweep, less the
same figure before the class.  scripts/refresh_shard_timings.py reads it into
the third column of tests/scripts/shard_timings.txt, and GrailShardPlan
balances it, because a shard is one session with a capped temporary object
memory: the gem's AlmostOutOfMemory notification fires at the end of a mark
sweep that leaves more than 85% of it in use, and the kernel's
GsTestCase>>runCase reports it as an error in whichever test was running.  A
time-only plan put enough on shard 6 to fail six merge-queue runs that way.

Measured HERE, in the shard, and not by running each class alone: a class's
figure alone counts in full the imports it shares with the other classes of
its shard, and summed over a shard those figures came to about twice what the
shards held, with the heaviest shard ranked mid-table.  Within one session the
figures add up to what the shard holds.

ONLY WHEN GRAIL_SHARD_CLASS_MEM is set (to anything but 0): a sweep per class
cost 37-65 s a shard on a Mac -- about 6% of the shard, against no gap at all
without it -- which is too much for every merge-queue run.  ci.yml sets it on
the scheduled nightly (and a manual dispatch), which is where the refresh
script reads memory from.

The sweep is between classes, outside every test.  An AlmostOutOfMemory it
raises there is logged as GRAIL_SHARD_MEM_WARNING and re-armed -- the gem
signals it once and then stays silent until told otherwise -- so a test that
crosses the threshold later still fails, as it did before the sweep existed.
The time a class reports does not include its sweep.

AND THE SWEEP'S FINALIZERS RUN HERE TOO.  A sweep collects what the class left
for dead -- a coroutine never awaited, say -- and Grail runs the Python hooks
for those (FinalizerEphemeron: the ``never awaited'' RuntimeWarning, a
generator's close) only at its next safe point.  Left alone, that was inside
the NEXT class's test: on CI, ExcepthookPrintsTracebackTestCase redirects
sys.stderr to read a traceback back, and got five ``coroutine ... was never
awaited'' warnings from an earlier asyncio class in front of it.
Reproduced in the grailci container (native code), and gone with the drain."
liveKB := [
  [System _vmMarkSweep.
   FinalizerEphemeron _runPending.
   System _tempObjSpaceUsed // 1024]
    on: AlmostOutOfMemory
    do: [:ex |
      out nextPutAll: 'GRAIL_SHARD_MEM_WARNING|idx='; nextPutAll: idx printString;
        nextPutAll: '|pct='; nextPutAll: System _tempObjSpacePercentUsed printString; lf.
      System signalAlmostOutOfMemoryThreshold: 0.
      ex resume]].
memFlag := ((System gemEnvironmentVariable: 'GRAIL_SHARD_CLASS_MEM') ifNil: ['']) trimSeparators.
(memFlag isEmpty or: [memFlag = '0']) ifTrue: [liveKB := nil].
memBeforeKB := liveKB ifNotNil: [liveKB value].
shardT0 := System _timeMs.
[order do: [:key | | t0 ms afterKB |
  t0 := System _timeMs.
  (groups at: key) run: result.
  ms := System _timeMs - t0.
  out nextPutAll: 'GRAIL_CLASS_TIME|'; nextPutAll: idx printString;
    nextPutAll: '|'; nextPutAll: key;
    nextPutAll: '|'; nextPutAll: ms printString;
    nextPutAll: '|'; nextPutAll: (groups at: key) tests size printString; cr.
  codePeakKB := codePeakKB max: codeKB value.
  liveKB ifNotNil: [
    afterKB := liveKB value.
    out nextPutAll: 'GRAIL_CLASS_MEM|'; nextPutAll: idx printString;
      nextPutAll: '|'; nextPutAll: key;
      nextPutAll: '|'; nextPutAll: (afterKB - memBeforeKB) printString;
      nextPutAll: '|'; nextPutAll: afterKB printString; cr.
    memBeforeKB := afterKB]]]
  ensure: [TestResource resetResources: shard resources].
"ms= is UNCONDITIONAL.  Without it the gate reports only its slowest JOB, and a
job is two shards run concurrently -- so a skew shows up as a number nothing in
the log can attribute to a shard, which is exactly how the previous skew went
unnoticed until someone timed the two jobs by eye."
"How much of the session's temporary object memory this shard consumed.
Diagnostic, and not idle: a shard that ends near 100% fails LATER, as an
AlmostOutOfMemory (notification 6013) reported against whichever test the
session happened to be running -- a different, innocent test every time, and
only under whatever load tips it over.  That took a while to recognise
precisely because nothing reported the number.  Now it is in the uploaded log."
out nextPutAll: 'GRAIL_SHARD_MEM|idx='; nextPutAll: idx printString;
  nextPutAll: '|usedMB='; nextPutAll: ((System _tempObjSpaceUsed / 1048576) rounded) printString;
  nextPutAll: '|pct='; nextPutAll: (System _tempObjSpacePercentUsed) printString; lf.
out nextPutAll: 'GRAIL_SHARD_CODE|idx='; nextPutAll: idx printString;
  nextPutAll: '|peakKB='; nextPutAll: codePeakKB printString;
  nextPutAll: '|endKB='; nextPutAll: codeKB value printString;
  nextPutAll: '|capKB='; nextPutAll: codeCapKB printString;
  nextPutAll: '|pct='; nextPutAll: (codePeakKB * 100 // codeCapKB) printString; lf.
"IR fallbacks across the WHOLE shard (P1.4).  In strict mode (GRAIL_IR_STRICT,
which run_tests.sh turns on for the IR arm) a fallback raises in the test that
met it, so this is the backstop for one a test caught and swallowed -- an
``except Exception'' around an import, say.  The session tallies, not
#fallbacks, which many IR tests reset to measure one import of their own.
run_tests.sh fails a strict run whose shards report any."
[| st |
  st := importlib ___irStats___.
  out nextPutAll: 'GRAIL_SHARD_IR|idx='; nextPutAll: idx printString;
    nextPutAll: '|strict='; nextPutAll: (st at: #strict) printString;
    nextPutAll: '|fallbacks='; nextPutAll: (st at: #sessionFallbacks) printString;
    nextPutAll: '|invariants='; nextPutAll: (st at: #sessionInvariants) printString;
    nextPutAll: '|lastError='; nextPutAll: (((st at: #lastError) ifNil: ['']) asString
      collect: [:c | (c == Character lf or: [c == Character cr]) ifTrue: [$ ] ifFalse: [c]]); lf]
  on: Error do: [:e | out nextPutAll: 'GRAIL_SHARD_IR|idx='; nextPutAll: idx printString;
    nextPutAll: '|unreadable='; nextPutAll: e messageText asString; lf].
out nextPutAll: 'GRAIL_SHARD_RESULT|idx='; nextPutAll: idx printString;
  nextPutAll: '|workers='; nextPutAll: numWorkers printString;
  nextPutAll: '|ms='; nextPutAll: (System _timeMs - shardT0) printString;
  nextPutAll: '|'; nextPutAll: result printString; cr.
result hasPassed
  ifTrue: [ExitClientError signal: 'shard passed' status: 0]
  ifFalse: [
    "EVERY line of the report is tagged, messages and stacks included, so
    run_tests.sh recovers the whole thing with one line-oriented grep."
    result reportOn: out prefix: 'GRAIL_DEFECT|'.
    "Belt and braces: if a defect somehow reached the collections without being
    recorded (an exception outside runCase:), still name it."
    result details size < (result failureCount + result errorCount) ifTrue: [
      out nextPutAll: 'GRAIL_DEFECT|[UNRECORDED] '; nextPutAll: result printString;
        nextPutAll: ' -- '; nextPutAll: result details size printString;
        nextPutAll: ' detail(s) captured'; cr.
      (result failures asArray, result errors asArray) do: [:each |
        out nextPutAll: 'GRAIL_DEFECT|    '; nextPutAll: each printString; cr]].
    ExitClientError signal: 'shard failed' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
