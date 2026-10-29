! file tests/scripts/listIsolatedClasses.gs
!
! The classes one partition of the isolated-class run owns, for
! scripts/run_isolated_classes.sh.  Reads
!   GRAIL_ISOLATED_PARTITIONS  how many partitions (CI runners) share the run
!   GRAIL_ISOLATED_PARTITION   this one's index, 0..N-1
! and places the PythonTestCase classes with GrailShardPlan, the same
! measured-time partition the gate's shards use (tests/scripts/shard_timings.txt),
! so each runner gets about the same class time.  Emits
!   GRAIL_ISOLATED_PLAN|partition=<i>|partitions=<n>|digest=<d>|classes=<c>|tests=<t>|plannedMs=<ms>|suiteClasses=<C>|suiteTests=<T>
!   GRAIL_ISOLATED_CLASS|<ClassName>|<tests>     one per class, longest planned first
! The digest and the suite totals let the summary job check that the
! partitions together ran every class exactly once.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
iferr_clear
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]].
%
level 1
run
| out n idx leaves timings plan mine counts suiteClasses |
out := GsFile stdout.
n := (System gemEnvironmentVariable: 'GRAIL_ISOLATED_PARTITIONS') ifNil: ['1'].
n := [n asNumber] on: Error do: [:ex | ex return: 1].
(n isNil or: [n < 1]) ifTrue: [n := 1].
idx := (System gemEnvironmentVariable: 'GRAIL_ISOLATED_PARTITION') ifNil: ['0'].
idx := [idx asNumber] on: Error do: [:ex | ex return: 0].
idx isNil ifTrue: [idx := 0].
leaves := GrailShardPlan leavesOf: PythonTestCase suite.
timings := GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath.
plan := GrailShardPlan workers: n leaves: leaves timings: timings reserveMs: 0.
counts := Dictionary new.
leaves do: [:t | | k | k := t class name asString.
  counts at: k put: (counts at: k ifAbsent: [0]) + 1].
suiteClasses := counts size.
"Longest first, so a partition's slowest classes start while the others queue
behind them, rather than one starting last and setting the wall clock."
mine := (plan classesOn: idx) asSortedCollection: [:a :b | | ta tb |
  ta := timings at: a ifAbsent: [0]. tb := timings at: b ifAbsent: [0].
  ta > tb or: [ta = tb and: [a <= b]]].
out nextPutAll: 'GRAIL_ISOLATED_PLAN|partition='; nextPutAll: idx printString;
  nextPutAll: '|partitions='; nextPutAll: n printString;
  nextPutAll: '|digest='; nextPutAll: plan digest printString;
  nextPutAll: '|classes='; nextPutAll: mine size printString;
  nextPutAll: '|tests='; nextPutAll: (plan testCountOn: idx) printString;
  nextPutAll: '|plannedMs='; nextPutAll: (plan plannedMsOn: idx) printString;
  nextPutAll: '|suiteClasses='; nextPutAll: suiteClasses printString;
  nextPutAll: '|suiteTests='; nextPutAll: plan suiteSize printString; lf.
mine do: [:each |
  out nextPutAll: 'GRAIL_ISOLATED_CLASS|'; nextPutAll: each;
    nextPutAll: '|'; nextPutAll: (counts at: each) printString; lf].
%
logout
