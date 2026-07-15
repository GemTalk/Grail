! file scripts/deployFrameworks.gs
!
! Deploy the heavy framework closures (docs/Persistent_Modules_and_Classes.md
! par.4.1 deploy action): ONE session cold-imports them with canonical modules
! enabled and commits, so every later flag-on session -- notably the parallel
! test shards -- warm-BINDS the committed module instances instead of
! re-parsing and re-compiling them (the profiled dominant cost of the suite:
! flask/werkzeug ~110s, re ~20s, twilio ~20s per run).
!
! IDEMPOTENT: an already-deployed module (source hash matching) warm-binds in
! milliseconds and the commit is a no-op, so running this before every test
! run costs seconds once the first deploy has happened.  A framework source
! edit changes the hash; the next run here rebuilds and re-commits it.
!
! DELIBERATELY NOT deployed: modules the SUnit tests reset (via
! ``sys.modules removeKey:`` or ``importlib removeModule:``) and re-import
! expecting re-execution -- dataclasses, threading, itertools, and re
! (ReModuleTestCase / ImportlibUnloadTestCase unload it) -- the par.10.5
! guard would (correctly) refuse the re-import of a deployed module.
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
| out t0 names loaded |
out := GsFile stdout.
t0 := System _timeMs.
importlib ___canonicalClassesEnabled___: true.
names := #('flask' 'werkzeug.test' 'werkzeug.wrappers' 'werkzeug.routing'
           'werkzeug.datastructures' 'werkzeug.http' 'werkzeug.local'
           'werkzeug.utils' 'werkzeug.wsgi' 'werkzeug.urls'
           'werkzeug.exceptions' 'jinja2' 'twilio').
loaded := 0.
names do: [:nm | | path |
  path := importlib @env1:___moduleNameToPath___: nm.
  path isNil
    ifTrue: [out nextPutAll: 'deploy: skipped (no path): ' , nm; cr]
    ifFalse: [
      importlib loadModuleFromPath: path name: nm.
      loaded := loaded + 1]].
"UNREGISTER the modules the SUnit suite resets and re-imports expecting
full re-execution (DataclassesTestCase, ReModuleTestCase,
ImportlibUnloadTestCase, the itertools debug-files test).  Exclusion by
omission is impossible -- the closure pulls them in TRANSITIVELY
(werkzeug/jinja2 import dataclasses, re, itertools).  Removing their
module-instance and hash entries (including submodules: removeModule:
're' unloads the whole subtree) makes them invisible to the import
machinery: later sessions cold-import them exactly as before deployment;
the par.10.5 guard and the warm-bind both key on these entries."
#('dataclasses' 'threading' 'itertools' 're') do: [:nm | | mods hashes prefix |
  mods := importlib ___canonicalModules___.
  hashes := importlib ___canonicalModuleHashes___.
  prefix := nm , '.'.
  mods keys do: [:k | | ks |
    ks := k asString.
    ((ks = nm) or: [(ks size > prefix size)
        and: [(ks copyFrom: 1 to: prefix size) = prefix]])
      ifTrue: [
        mods removeKey: k ifAbsent: [].
        hashes removeKey: k ifAbsent: []]]].
System commitTransaction
  ifFalse: [^ self error: 'deploy commit failed (conflict?) -- abort and retry'].
out nextPutAll: 'deployFrameworks: '; print: loaded;
  nextPutAll: ' modules bound/built + committed in ';
  print: (System _timeMs - t0); nextPutAll: ' ms'; cr.
%
logout
exit 0
