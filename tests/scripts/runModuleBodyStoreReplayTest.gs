output pushnew runModuleBodyStoreReplayTest.out
! file tests/scripts/runModuleBodyStoreReplayTest.gs
!
! A module-level store to the module's own class survives deployment (#1242).
!
! Why a script: the stores must be seen by a session that WARM-BINDS the
! committed module without running its body, which needs a commit, and the
! suite must not commit.
!
! WHAT IT GUARDS.  ``A.later = v'' after ``class A:'' is a store to an
! already-registered class, so it is a runtime store, and a fresh session that
! warm-binds the deployed module never runs it.  Jinja2's
! ``Environment.template_class = Template'' was lost that way, so every
! render_template_string failed outside the deploying gem, and ipaddress's
! ``IPv4Address._constants = _IPv4Constants'' made is_private raise.  Those
! stores are now recorded for replay on warm-bind; this script is what stops
! that from regressing.  Covered: a name the body did not define, one it did,
! and a store through setattr().
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
UserGlobals at: #'Grail_mbs_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_mbs_failures' put: 999.
mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/module_body_store_replay_fixture.py')
    name: 'module_body_store_replay_fixture'.
UserGlobals at: #'Grail_mbs_module' put: mod.
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
    loadModuleFromPath: (importlib grailDir , '/tests/python/module_body_store_replay_fixture.py')
    name: 'module_body_store_replay_fixture'.
  check value: 'B: warm-bound to the committed module'
        value: mod == (UserGlobals at: #'Grail_mbs_module').
  check value: 'B: every module-body store took in the fresh session'
        value: (((mod @env1:values) @env1:__repr__) asString
          = '(''module-level'', ''reassigned at module level'', 1)').
] @env0:on: AbstractException do: [:ex |
  failures add: 'B: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
System abort.
UserGlobals at: #'Grail_mbs_failures' put: failures size.
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
failCount := UserGlobals at: #'Grail_mbs_failures' ifAbsent: [999].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_mbs_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_mbs_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_mbs_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_mbs_failures' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.
failCount = 0
  ifTrue: [ExitClientError signal: 'module-body store replay: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'module-body store replay had '; print: failCount;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'module-body store replay FAILED!' status: 1].
%
logout
