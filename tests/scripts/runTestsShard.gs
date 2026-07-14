! file tests/scripts/runTestsShard.gs
!
! Sharded runner for the main PythonTestCase suite.  Reads two env vars:
!   GRAIL_TEST_WORKERS  total number of shards N (default 1)
!   GRAIL_TEST_SHARD    this worker's index, 0..N-1 (default 0)
!
! Builds the full PythonTestCase suite, then runs only the test instances
! whose (className>>selector) falls in this shard, selected by a STABLE hash
! (character sum mod N) so every worker computes the identical partition --
! no test is run twice or skipped across workers.  scripts/run_tests.sh
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
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 1
run
| out n idx full shard result leaves flatten |
out := GsFile stdout.
n := (System gemEnvironmentVariable: 'GRAIL_TEST_WORKERS') ifNil: ['1'].
n := (n isEmpty ifTrue: [1] ifFalse: [n asNumber]).
(n isNil or: [n < 1]) ifTrue: [n := 1].
idx := (System gemEnvironmentVariable: 'GRAIL_TEST_SHARD') ifNil: ['0'].
idx := (idx isEmpty ifTrue: [0] ifFalse: [idx asNumber]).
idx isNil ifTrue: [idx := 0].
"PythonTestCase suite is a suite of PER-CLASS sub-suites; flatten to leaf
TestCase instances in ORIGINAL suite order (pre-order DFS).  Order matters:
some tests incidentally rely on a module imported by an earlier test in the
same session (e.g. numbers.Integral registration) -- preserving order keeps
WORKERS=1 identical to runTests.gs.  (True cross-test dependencies that span
shards are surfaced by WORKERS>1 and fixed at the test level.)"
full := PythonTestCase suite.
leaves := OrderedCollection new.
flatten := nil.
flatten := [:node |
  (node isKindOf: TestSuite)
    ifTrue: [node tests do: [:c | flatten value: c]]
    ifFalse: [leaves add: node]].
flatten value: full.
"Partition by CLASS (not per test): all of a class's tests go to the same
shard.  This (a) preserves within-class order + any within-class state
dependencies, and (b) keeps each framework's tests on a single shard so
werkzeug / flask / django compile ONCE (on their owner shard) rather than
once per shard -- the import-compile is the dominant cost, so avoiding its
duplication is what makes parallelism pay (class-level ~2.6x vs test-level
~1.35x measured).  Stable char-sum hash so every worker agrees on the
partition."
shard := TestSuite new.
leaves do: [:t | | key h |
  key := t class name asString.
  h := 0.
  key do: [:ch | h := h + ch asInteger].
  ((h \\ n) = idx) ifTrue: [shard addTest: t]].
result := shard run.
out nextPutAll: 'GRAIL_SHARD_RESULT|idx='; nextPutAll: idx printString;
  nextPutAll: '|workers='; nextPutAll: n printString;
  nextPutAll: '|'; nextPutAll: result printString; cr.
result hasPassed
  ifTrue: [ExitClientError signal: 'shard passed' status: 0]
  ifFalse: [
    out nextPutAll: 'SHARD '; nextPutAll: idx printString; nextPutAll: ' failures:'; cr.
    result failures do: [:each | out nextPutAll: '    '; nextPutAll: each printString; cr].
    out nextPutAll: 'SHARD '; nextPutAll: idx printString; nextPutAll: ' errors:'; cr.
    result errors do: [:each | out nextPutAll: '    '; nextPutAll: each printString; cr].
    ExitClientError signal: 'shard failed' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
