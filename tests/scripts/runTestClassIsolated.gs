! file tests/scripts/runTestClassIsolated.gs
!
! Run ONE PythonTestCase class, named by GRAIL_TEST_CLASS, in this session
! and nothing else.  scripts/run_isolated_classes.sh starts a new linked topaz
! -- a new gem process and a new session -- for every class, so no class can
! pass on the strength of what an earlier class left behind: SessionTemps,
! sys.modules, transient session methods, the CPython shim's process state.
! That is the order dependence the gate's shards hide, because a shard runs
! many classes in one session (#1937: NumbersTestCase passed only when an
! earlier class had imported ``numbers'').
!
! Emits, for run_isolated_classes.sh to read:
!   GRAIL_CLASS_FRESH|class=<C>|sessionTemps=<n>   SessionTemps' size at login,
!       before anything ran: every class must report the SAME number, which is
!       what shows the session really was new (sys.modules lives there).
!   GRAIL_CLASS_RESULT|class=<C>|ms=<ms>|tests=<n>|<GrailTestResult printString>
!   GRAIL_DEFECT|...   the defect report, one tagged line each.
! and exits 0 iff the class ran and passed.  A class that is unknown, or has
! no tests on this gem, exits 1 with no RESULT line: the runner counts it as
! not run, never as a pass.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1
iferr_clear
login
run
| out name |
out := GsFile stdout.
name := System gemEnvironmentVariable: 'GRAIL_TEST_CLASS'.
"Measured FIRST, before importlib is touched: the size a brand-new session has."
out nextPutAll: 'GRAIL_CLASS_FRESH|class='; nextPutAll: (name ifNil: ['']);
  nextPutAll: '|sessionTemps='; nextPutAll: SessionTemps current size printString; lf.
%
run
| dir |
"As runTestsShard.gs: export the checkout root the Python half reads."
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]].
%
level 1
run
| out name cls suite leaves result t0 |
out := GsFile stdout.
name := System gemEnvironmentVariable: 'GRAIL_TEST_CLASS'.
(name isNil or: [name isEmpty]) ifTrue: [
  out nextPutAll: 'GRAIL_CLASS_ERROR|GRAIL_TEST_CLASS is not set'; lf.
  ExitClientError signal: 'no class' status: 1].
cls := PythonTestCase allSubclasses detect: [:c | c name asString = name] ifNone: [nil].
(cls isNil or: [cls isAbstract]) ifTrue: [
  out nextPutAll: 'GRAIL_CLASS_ERROR|class='; nextPutAll: name;
    nextPutAll: '|no concrete PythonTestCase subclass of that name'; lf.
  ExitClientError signal: 'unknown class' status: 1].
"Only the class's OWN tests: a class's suite can include its subclasses', and
those are run in sessions of their own."
leaves := (GrailShardPlan leavesOf: cls suite) select: [:t | t class == cls].
leaves isEmpty ifTrue: [
  out nextPutAll: 'GRAIL_CLASS_ERROR|class='; nextPutAll: name;
    nextPutAll: '|no tests on this gem (all skipped?)'; lf.
  ExitClientError signal: 'no tests' status: 1].
suite := TestSuite new.
leaves do: [:t | suite addTest: t].
result := GrailTestResult new.
t0 := System _timeMs.
[suite run: result] ensure: [TestResource resetResources: suite resources].
out nextPutAll: 'GRAIL_CLASS_RESULT|class='; nextPutAll: name;
  nextPutAll: '|ms='; nextPutAll: (System _timeMs - t0) printString;
  nextPutAll: '|tests='; nextPutAll: leaves size printString;
  nextPutAll: '|'; nextPutAll: result printString; lf.
result hasPassed
  ifTrue: [ExitClientError signal: 'class passed' status: 0]
  ifFalse: [
    result reportOn: out prefix: 'GRAIL_DEFECT|'.
    result details size < (result failureCount + result errorCount) ifTrue: [
      (result failures asArray, result errors asArray) do: [:each |
        out nextPutAll: 'GRAIL_DEFECT|[UNRECORDED] '; nextPutAll: each printString; lf]].
    ExitClientError signal: 'class failed' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
