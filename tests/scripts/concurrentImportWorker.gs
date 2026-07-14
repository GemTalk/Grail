! file tests/scripts/concurrentImportWorker.gs
!
! One arm of the interleaved-commit concurrency test (docs/
! Persistent_Modules_and_Classes.md par.10.7 phase 8).  Two of these run as
! CONCURRENT topaz processes against one stone (the same infrastructure the
! parallel test shards use), synchronised through marker files so both
! sessions hold UNCOMMITTED canonical-registry writes at the same time:
!
!   both import their (disjoint) module  ->  both touch <role>.imported
!   both wait for the other's marker     ->  overlapping transactions
!   A commits, touches a.committed       ->  B waits, then commits
!
! B's commit is the assertion: with the phase-8 reduced-conflict
! registries, two sessions adding DISJOINT module keys MERGE at commit
! instead of conflicting.
!
! Env: GRAIL_CC_ROLE = 'a' | 'b'; GRAIL_CC_SYNC = sync directory holding
! grail_ccmod_<role>.py (written by run_concurrent_import_test.sh).
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
level 0
run
| out role sync modName mod other touch waitFor deadline ok |
out := GsFile stdout.
role := System gemEnvironmentVariable: 'GRAIL_CC_ROLE'.
sync := System gemEnvironmentVariable: 'GRAIL_CC_SYNC'.
(role isNil or: [sync isNil]) ifTrue: [^ self error: 'GRAIL_CC_ROLE / GRAIL_CC_SYNC not set'].
other := (role = 'a') ifTrue: ['b'] ifFalse: ['a'].

touch := [:name | | f |
  f := GsFile openWriteOnServer: sync , '/' , name.
  f nextPutAll: 'x'; close].
waitFor := [:name |
  deadline := System _timeMs + 30000.
  [GsFile existsOnServer: sync , '/' , name] whileFalse: [
    System _timeMs > deadline ifTrue: [
      touch value: role , '.fail'.
      ^ self error: 'timed out waiting for ' , name].
    System _sleepMs: 100]].

importlib ___canonicalClassesEnabled___: true.
modName := 'grail_ccmod_' , role.
mod := importlib
  loadModuleFromPath: sync , '/' , modName , '.py'
  name: modName.
((mod @env1:value) = 41)
  ifFalse: [touch value: role , '.fail'. ^ self error: 'fixture value wrong'].
touch value: role , '.imported'.

"Both transactions now hold uncommitted registry writes."
waitFor value: other , '.imported'.

(role = 'b') ifTrue: [waitFor value: 'a.committed'].
ok := System commitTransaction.
out cr; nextPutAll: 'worker '; nextPutAll: role;
  nextPutAll: ' commit -> '; print: ok; cr.
ok ifFalse: [
  "FIRST COMMIT WINS; the loser follows GemStone's standard protocol:
  abort (refreshing the view past the winner's commit), re-do the work,
  re-commit -- now with no concurrent writer.  The reduced-conflict
  registries keep DISJOINT-KEY registry adds mergeable; the residual
  conflicts a concurrent COLD import hits are (a) CallAst class-side
  compile-state instVars (a committed class dirtied by ANY python
  compile -- the deferred session-state item; see the doc) and (b)
  PythonModules (a plain SymbolDictionary both workers add module
  classes to).  Warm binds -- the common concurrent-runtime case --
  write neither and cannot conflict."
  | conf |
  conf := System transactionConflicts.
  out nextPutAll: 'conflicts (informational):'; cr.
  conf keysAndValuesDo: [:k :v |
    out nextPutAll: '  '; print: k; nextPutAll: ' -> '.
    (v isKindOf: Collection)
      ifTrue: [v do: [:o | out print: o class name; nextPutAll: ' ']]
      ifFalse: [out print: v].
    out cr].
  System abortTransaction.
  mod := importlib
    loadModuleFromPath: sync , '/' , modName , '.py'
    name: modName.
  ok := System commitTransaction.
  out nextPutAll: 'worker '; nextPutAll: role;
    nextPutAll: ' RETRY commit -> '; print: ok; cr].
ok ifFalse: [
  touch value: role , '.fail'.
  ExitClientError signal: 'worker ' , role , ' commit failed even after retry' status: 1].
touch value: role , '.committed'.
ExitClientError signal: 'worker ' , role , ' done' status: 0.
%
logout
! Reachable only when the run aborted before its status report.
exit 1
