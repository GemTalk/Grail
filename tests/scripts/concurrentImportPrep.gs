! file tests/scripts/concurrentImportPrep.gs
!
! Prep for run_concurrent_import_test.sh: start from clean registries, then
! PRE-CREATE them (committed) so the two concurrent workers ADD ENTRIES to
! existing reduced-conflict collections rather than racing to lazily create
! the registries themselves (two sessions both doing ``UserGlobals at:
! #GrailCanonicalClasses put: ...`` is a genuine write-write conflict on
! UserGlobals -- a deployment's first flag-on commit should precede
! concurrent importers, which this models).
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
"Snapshot first (so the verifier restores exactly what this test adds --
a standing framework deployment survives), then ENSURE the registries
exist committed: the workers must ADD to existing reduced-conflict
collections rather than race to lazily create them."
UserGlobals at: #'Grail_cc_snap' put: importlib ___canonicalRegistrySnapshot___.
importlib ___canonicalClassRegistry___.
importlib ___canonicalModules___.
importlib ___canonicalModuleHashes___.
(UserGlobals at: #'GrailCanonicalClassSet' ifAbsent: [nil]) isNil
  ifTrue: [UserGlobals at: #'GrailCanonicalClassSet' put: RcIdentityBag new].
System commitTransaction
  ifFalse: [^ self error: 'prep commit failed'].
GsFile stdout nextPutAll: 'prep: registries ensured + snapshot committed'; cr.
%
logout
exit 0
