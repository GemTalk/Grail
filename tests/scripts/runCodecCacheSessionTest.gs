output pushnew runCodecCacheSessionTest.out
! file tests/scripts/runCodecCacheSessionTest.gs
!
! A codec lookup's cache entry is never committed (#1731).
!
! encodings._cache and _codecs' registry cache are plain dicts in CPython,
! process memory.  On a deployed module the dict is MUTATED, not rebound, so a
! session that looked a codec up and then committed stored the entry: a
! CodecInfo whose functions belong to the codec module.  Once that module's
! deployment was taken back -- as every regression script's cleanup takes back
! what it deployed -- nothing deployed it any more, but the committed entry
! still reached its classes.  Every later session's first use of the codec
! re-ran its body and rebuilt them in place: after a full run_tests.sh, a
! Flask request on a deployed app wrote 72 committed objects, and kept doing
! so until the next install.
!
! Session A: deploy encodings, look up idna and utf-8, commit, then take back
!   the deployments the lookup made and commit again.
! Session B: fresh.  Both caches start empty, and the idna codec it finds is
!   this session's, not one a commit left behind.
! Session C: cleanup, report the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- deploy encodings, look the codecs up, take back their deployment
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
| out failures beforeLookup |
out := GsFile stdout.
failures := OrderedCollection new.
UserGlobals at: #'Grail_codecCache_snap' put: importlib ___canonicalRegistrySnapshot___.
(PythonTestCase new) eval: 'import codecs, encodings'.
System commit.
beforeLookup := importlib ___canonicalRegistrySnapshot___.
(((PythonTestCase new) eval: 'import codecs
codecs.lookup("idna")
codecs.lookup("utf-8")
"localhost".encode("idna") == b"localhost"') == true)
  ifFalse: [failures add: 'A: the lookups answer'].
System commit.
importlib ___canonicalRegistryRestore___: beforeLookup.
UserGlobals at: #'Grail_codecCache_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: looked up idna and utf-8, committed, took the lookup''s deployments back'; cr.
%
logout

! ===========================================================================
! Session B -- a fresh session starts with empty codec caches
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
| out failures check |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_codecCache_failures').
check := [:label :condition | condition ifFalse: [failures add: label]].
[
  check value: 'B: a fresh session starts with nothing to commit' value: System needsCommit not.
  check value: 'B: encodings._cache starts empty'
    value: ((PythonTestCase new) eval: 'import encodings
len(encodings._cache)') = 0.
  check value: 'B: the codec registry cache starts empty'
    value: ((PythonTestCase new) eval: 'import _codecs
len(_codecs._registry_cache)') = 0.
  check value: 'B: the idna codec found is this session''s, not a committed one'
    value: ((PythonTestCase new) eval: 'import codecs
codecs.lookup("idna")') isCommitted not.
  check value: 'B: an idna encode answers'
    value: ((PythonTestCase new) eval: '"localhost".encode("idna") == b"localhost"') == true.
] on: AbstractException do: [:exception |
  failures add: 'B: raised ' , exception class name asString , ': ' ,
    ((exception messageText ifNil: ['']) asString copyFrom: 1
      to: (((exception messageText ifNil: ['']) asString size) min: 100)).
  exception return: nil].
System abort.
UserGlobals at: #'Grail_codecCache_failures' put: failures asArray.
System commit.
failures do: [:each | out nextPutAll: 'FAIL '; nextPutAll: each; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failures |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_codecCache_failures' ifAbsent: [#('C: no verdict recorded')].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_codecCache_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
#(#'Grail_codecCache_snap' #'Grail_codecCache_failures') do: [:key |
  UserGlobals removeKey: key ifAbsent: []].
System commit.
failures isEmpty
  ifTrue: [ExitClientError signal: 'codec cache session: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'codec cache session had '; print: failures size;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'codec cache session FAILED!' status: 1].
%
logout
