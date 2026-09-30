output pushnew runClassAttrSessionLocalTest.out
! file tests/scripts/runClassAttrSessionLocalTest.gs
!
! A runtime store on a DEPLOYED (canonical) class must be SESSION-LOCAL,
! whichever name it uses -- docs/Persistent_Modules_and_Classes.md D3.
!
! Why this lives outside the in-session SUnit suite: "session-local" can only be
! observed across a commit + logout + login boundary, and the suite must not
! commit.
!
! WHAT IT GUARDS.  Every name a class body declares leaves behind a
! 'Grail-Class Attrs' getter/setter pair.  object >> __setattr__:_: dispatched
! to that setter BEFORE consulting the canonical overlay, so `Mark.retracts = v'
! -- a name the body declared -- wrote the COMMITTED holder, while
! `Mark.brand_new = v' -- a name it did not -- had no accessor pair, fell
! through to ___pyAttrStore___, and was session-local all along.  So the rule
! looked like it was about NEW names when it was really about which store path
! the name happened to take (#1240).
!
! The consequences were not cosmetic: two gems configuring the same framework
! class (`Request.max_content_length = n') conflicted Write-Write on commit, the
! winner's value became the class's value for every session, and every stored
! instance that had never set the attribute read it too -- which is exactly the
! class-level default that Schema_Evolution.md S3.1 tells an added attribute to
! rely on.
!
! Session A deploys.  Session B stores through all four spellings and must see
! them with NOTHING to commit.  Session C is fresh and must see the body's own
! defaults, with the new names absent.  Session D cleans up and reports.
!
! WithMeta is the case the repair must not break: a real metaclass @property is
! a data descriptor whose setter has to run rather than being diverted into the
! overlay.  Its setter doubles its argument, so `config' reading 10 after a
! store of 5 is what says the setter ran.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- deploy the fixture
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
UserGlobals at: #'Grail_cattr_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_cattr_failures' put: 999.
mod := importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_session_local_fixture.py')
  name: 'class_attr_session_local_fixture'.
UserGlobals at: #'Grail_cattr_mark' put: (mod @env1:Mark).
System commit.
out cr; nextPutAll: 'sessionA: fixture deployed (committed)'; cr.
%
logout

! ===========================================================================
! Session B -- store through every spelling; session-local and nothing to commit
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
| out mod failures check reads |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_session_local_fixture.py')
    name: 'class_attr_session_local_fixture'.
  check value: 'B: warm-bound to the committed class'
        value: ((mod @env1:Mark) == (UserGlobals at: #'Grail_cattr_mark')).
  System abort.

  "Python's repr, not Smalltalk's printString -- an empty tuple prints as
  ``atuple( )'' and every expectation here is a Python value."
  reads := [:name | ((mod @env1:read: name) @env1:__repr__) asString].

  mod @env1:store_body_name.
  check value: 'B: Mark.retracts = v is visible here' value: ((reads value: 'retracts') = '''changed''').
  check value: 'B: Mark.retracts = v left nothing to commit' value: System needsCommit not.

  mod @env1:setattr_body_name.
  check value: 'B: setattr(Mark, tags) left nothing to commit' value: System needsCommit not.

  mod @env1:store_new_name.
  mod @env1:setattr_new_name.
  check value: 'B: a new name is still visible' value: ((reads value: 'brand_new') = '1').
  check value: 'B: new names left nothing to commit' value: System needsCommit not.

  "The guard: a real metaclass @property must reach its SETTER, which doubles."
  mod @env1:store_through_metaclass_property.
  check value: 'B: a metaclass @property setter still runs'
        value: (((mod @env1:read_config) @env1:__repr__) asString = '10').

  System commit.
  check value: 'B: the commit wrote nothing' value: System needsCommit not
] @env0:on: AbstractException do: [:ex |
  failures add: 'B: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
UserGlobals at: #'Grail_cattr_failuresB' put: failures asArray.
System commit.
failures do: [:f | out nextPutAll: 'FAIL '; nextPutAll: f; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- fresh: the body's own defaults, and no trace of session B
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
| out mod failures check reads |
out := GsFile stdout.
failures := (UserGlobals at: #'Grail_cattr_failuresB' ifAbsent: [#()]) asOrderedCollection.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_session_local_fixture.py')
    name: 'class_attr_session_local_fixture'.
  "Python's repr, not Smalltalk's printString -- an empty tuple prints as
  ``atuple( )'' and every expectation here is a Python value."
  reads := [:name | ((mod @env1:read: name) @env1:__repr__) asString].
  check value: 'C: retracts is the body default again' value: ((reads value: 'retracts') = 'None').
  check value: 'C: tags is the body default again' value: ((reads value: 'tags') = '()').
  check value: 'C: brand_new is absent' value: ((reads value: 'brand_new') = '''<absent>''').
  check value: 'C: brand_new2 is absent' value: ((reads value: 'brand_new2') = '''<absent>''').
  check value: 'C: the metaclass property is its default again'
        value: (((mod @env1:read_config) @env1:__repr__) asString = '0')
] @env0:on: AbstractException do: [:ex |
  failures add: 'C: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
UserGlobals at: #'Grail_cattr_failures' put: failures size.
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
failCount := UserGlobals at: #'Grail_cattr_failures' ifAbsent: [999].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_cattr_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_cattr_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_cattr_mark' ifAbsent: [].
UserGlobals removeKey: #'Grail_cattr_failures' ifAbsent: [].
UserGlobals removeKey: #'Grail_cattr_failuresB' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.
failCount = 0
  ifTrue: [ExitClientError signal: 'class-attr session-local: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'class-attr session-local had '; print: failCount;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'class-attr session-local FAILED!' status: 1].
%
logout
