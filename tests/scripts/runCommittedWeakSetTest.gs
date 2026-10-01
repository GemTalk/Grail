output pushnew runCommittedWeakSetTest.out
! file tests/scripts/runCommittedWeakSetTest.gs
!
! A WeakSet that has been COMMITTED does not grow with dead references (#1229).
!
! Why a script: a committed weak reference only reads back dead in a LATER
! session -- its holder is dbTransient (src/weakref/WeakReference.gs), so the
! session that committed it still holds the live ephemeron -- and the suite
! must not commit.
!
! WHAT IT GUARDS.  In that later session every member of a committed WeakSet
! reads as dead and no callback runs to remove it.  WeakSet.add only skipped a
! LIVE duplicate and never dropped a dead entry, so it kept every one and
! appended a fresh reference besides: Mapping._abc_cache grew from 4 entries
! to 76 over 200 committed requests, and every isinstance(x, Mapping) scanned
! them all.
!
! Session A deploys a module whose WeakSet holds three members.  Session B
! adds a fresh member twice and requires the set to hold exactly one
! reference per live member.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- deploy
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
UserGlobals at: #'Grail_cws_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_cws_failures' put: 999.
mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/committed_weakset_fixture.py')
    name: 'committed_weakset_fixture'.
UserGlobals at: #'Grail_cws_module' put: mod.
System commit.
out cr; nextPutAll: 'sessionA: fixture deployed (committed)'; cr.
%
logout

! ===========================================================================
! Session B -- a fresh session, warm-bound
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
| out mod failures check |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/committed_weakset_fixture.py')
    name: 'committed_weakset_fixture'.
  check value: 'B: warm-bound to the committed module'
        value: mod == (UserGlobals at: #'Grail_cws_module').
  System abort.
  check value: 'B: the committed set reads back holding its three references'
        value: (mod @env1:references_held) = 3.
  check value: 'B: adding a member drops the dead references (members = references held)'
        value: (((mod @env1:add_and_count: (mod @env1:fresh)) @env1:__repr__) asString = '(1, 1)').
  check value: 'B: re-adding a live member adds no reference'
        value: [| newcomer first |
          newcomer := mod @env1:fresh.
          first := ((mod @env1:add_and_count: newcomer) @env1:__repr__) asString.
          first = ((mod @env1:add_and_count: newcomer) @env1:__repr__) asString] value.
] @env0:on: AbstractException do: [:ex |
  failures add: 'B: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
System abort.
UserGlobals at: #'Grail_cws_failures' put: failures size.
failures do: [:f | out nextPutAll: 'FAIL '; nextPutAll: f; cr].
System commit.
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failCount |
out := GsFile stdout.
failCount := UserGlobals at: #'Grail_cws_failures' ifAbsent: [999].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_cws_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_cws_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_cws_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_cws_failures' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.
failCount = 0
  ifTrue: [ExitClientError signal: 'committed WeakSet: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'committed WeakSet had '; print: failCount;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'committed WeakSet FAILED!' status: 1].
%
logout
