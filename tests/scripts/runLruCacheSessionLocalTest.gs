output pushnew runLruCacheSessionLocalTest.out
! file tests/scripts/runLruCacheSessionLocalTest.gs
!
! An lru_cache in a DEPLOYED module is per-session, as CPython's is
! per-process (#1229).
!
! Why this lives outside the in-session SUnit suite: the wrapper under test has
! to be a COMMITTED object, and the suite must not commit.
!
! WHAT IT GUARDS.  LruCacheWrapper kept its cache in its own slots.  A
! module-level @lru_cache in a deployed module is a committed object, so every
! HIT wrote a shared object (two gems serving one Flask app conflicted over
! typing's _tp_cache) and every MISS left the caller's argument and result
! hanging off a committed object for the next commit to store -- a cache keyed
! by a student ID put the student ID in the repository.
!
! Session A deploys the fixture AFTER calling it once, so under the old layout
! that call's argument was committed with the wrapper.  Session B must start
! with an empty cache, cache a miss and a hit with nothing to commit, and find
! the wrapper's own cache slots untouched.  Session C is fresh again and must
! see an empty cache.  Session D cleans up and reports.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- call once, then deploy
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out mod |
out := GsFile stdout.
UserGlobals at: #'Grail_lru_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_lru_failures' put: 999.
mod := importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/lru_cache_session_local_fixture.py')
  name: 'lru_cache_session_local_fixture'.
mod @env1:call: 'A-900001'.
UserGlobals at: #'Grail_lru_module' put: mod.
System commit.
out cr; nextPutAll: 'sessionA: fixture called once, then deployed (committed)'; cr.
%
logout

! ===========================================================================
! Session B -- a fresh cache; a miss and a hit leave nothing to commit
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out mod failures check info wrapper slot |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
info := [((mod @env1:info) @env1:__repr__) asString].
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/lru_cache_session_local_fixture.py')
    name: 'lru_cache_session_local_fixture'.
  check value: 'B: warm-bound to the committed module'
        value: mod == (UserGlobals at: #'Grail_lru_module').
  System abort.

  check value: 'B: the cache starts empty in a new session' value: info value = '(0, 0, 0)'.

  check value: 'B: a miss answers the result' value: ((mod @env1:call: 'B-900002') = 'record-B-900002').
  check value: 'B: a miss left nothing to commit' value: System needsCommit not.

  check value: 'B: a hit answers the result' value: ((mod @env1:call: 'B-900002') = 'record-B-900002').
  check value: 'B: a hit left nothing to commit' value: System needsCommit not.
  check value: 'B: the counts are this session''s' value: info value = '(1, 1, 1)'.

  "The committed wrapper's own cache slots: nothing session A cached was
  stored with it."
  wrapper := mod @env1:___pyAttrLoad___: #'lookup'.
  slot := [:name | wrapper instVarAt: (wrapper class allInstVarNames indexOf: name)].
  check value: 'B: the committed wrapper holds no cached entries'
        value: ((slot value: #'cache') isNil and: [(slot value: #'order') isNil]).

  mod @env1:clear.
  check value: 'B: cache_clear empties this session''s cache' value: info value = '(0, 0, 0)'.
  check value: 'B: cache_clear left nothing to commit' value: System needsCommit not
] @env0:on: AbstractException do: [:ex |
  failures add: 'B: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
System abort.
UserGlobals at: #'Grail_lru_failuresB' put: failures asArray.
System commit.
failures do: [:f | out nextPutAll: 'FAIL '; nextPutAll: f; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- fresh again: an empty cache
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out mod failures |
out := GsFile stdout.
failures := (UserGlobals at: #'Grail_lru_failuresB' ifAbsent: [#()]) asOrderedCollection.
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/lru_cache_session_local_fixture.py')
    name: 'lru_cache_session_local_fixture'.
  (((mod @env1:info) @env1:__repr__) asString = '(0, 0, 0)')
    ifFalse: [failures add: 'C: the cache starts empty in a new session']
] @env0:on: AbstractException do: [:ex |
  failures add: 'C: raised ' , ex class name asString.
  ex @env0:return: nil].
System abort.
UserGlobals at: #'Grail_lru_failures' put: failures size.
failures do: [:f | out nextPutAll: 'FAIL '; nextPutAll: f; cr].
System commit.
out nextPutAll: 'sessionC: '; print: failures size; nextPutAll: ' failure(s) in total'; cr.
%
logout

! ===========================================================================
! Session D -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failCount |
out := GsFile stdout.
failCount := UserGlobals at: #'Grail_lru_failures' ifAbsent: [999].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_lru_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_lru_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_lru_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_lru_failures' ifAbsent: [].
UserGlobals removeKey: #'Grail_lru_failuresB' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.
failCount = 0
  ifTrue: [ExitClientError signal: 'lru_cache session-local: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'lru_cache session-local had '; print: failCount;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'lru_cache session-local FAILED!' status: 1].
%
logout
