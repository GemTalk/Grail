! file tests/scripts/concurrentImportVerify.gs
!
! Verifier + cleanup for run_concurrent_import_test.sh.  A fresh session
! must see BOTH workers' commits merged in the reduced-conflict registries
! (disjoint keys, overlapping transactions), and a warm import must BIND
! worker A's committed module instance.  Always cleans the registries, the
! test module classes, and commits, leaving the repository pristine.
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
| out sync failures check reg modA |
out := GsFile stdout.
sync := System gemEnvironmentVariable: 'GRAIL_CC_SYNC'.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].

[
  importlib ___canonicalClassesEnabled___: true.
  reg := importlib ___canonicalModules___.
  check value: 'registry holds worker A''s module'
    value: ((reg at: 'grail_ccmod_a' otherwise: nil) notNil).
  check value: 'registry holds worker B''s module (MERGED, not conflicted)'
    value: ((reg at: 'grail_ccmod_b' otherwise: nil) notNil).
  check value: 'A''s instance is committed'
    value: (((reg at: 'grail_ccmod_a' otherwise: nil) ifNil: [false] ifNotNil: [:m | m isCommitted])).
  check value: 'B''s instance is committed'
    value: (((reg at: 'grail_ccmod_b' otherwise: nil) ifNil: [false] ifNotNil: [:m | m isCommitted])).

  "A fresh session warm-BINDS worker A's committed instance."
  modA := importlib
    loadModuleFromPath: sync , '/grail_ccmod_a.py'
    name: 'grail_ccmod_a'.
  check value: 'fresh session warm-binds A''s committed instance (identity)'
    value: (modA == (reg at: 'grail_ccmod_a' otherwise: nil)).
  check value: 'bound module answers its global'
    value: ((modA @env1:value) = 41).
] ensure: [
  "Surgical cleanup: restore to the prep snapshot (removes both workers'
  modules), leaving any standing framework deployment intact."
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_cc_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  UserGlobals removeKey: #'Grail_cc_snap' ifAbsent: [].
  System commitTransaction
].

failures isEmpty
  ifTrue: [
    out nextPutAll: 'Concurrent-import regressions: all checks passed.'; cr.
    ExitClientError signal: 'Concurrent-import test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Concurrent-import regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Concurrent-import test failed!' status: 1].
%
logout
exit 1
