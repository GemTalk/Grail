! file scripts/deployGemdb.gs
!
! Deploy the gemdb package (docs/Persistent_Modules_and_Classes.md par.4.1
! deploy action): ONE session cold-imports gemdb and its submodules with
! canonical modules enabled and commits, so every later flag-on session
! warm-binds the committed instances.
!
! For gemdb the point is not speed but its clean-session contract
! (docs/GemDB_Module.md, session hygiene): a fresh session's
! ``import gemdb`` must leave NOTHING to commit, or the transaction()
! entry check blames the user for gemdb's own plumbing.  The module warms
! its function-attribute caches during the cold import, and this script's
! commit is what makes those caches -- and the module -- committed state.
!
! IDEMPOTENT, like deployFrameworks.gs: an already-deployed module
! (source hash matching) warm-binds in milliseconds and the commit is a
! no-op.  A gemdb source edit changes the hash; the next run rebuilds and
! re-commits it.
!
! deployFrameworks.gs also deploys gemdb (with the heavy frameworks, for
! Grail's own test runs).  This script is the SMALL one: it deploys gemdb
! alone, for installers that want the clean-session contract without
! adding megabytes of frameworks to the image -- GemDB's
! resources/install-grail.sh runs it as its final step, which is how both
! the shipped extent and a fallback file-in get a deployed gemdb.
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
"Force-create every canonical registry BEFORE the deploy commit, so the
committed image carries them all (the concurrent-import test preps the
same way).  A registry left uncreated here would be materialised lazily
by some later session's read -- a write on that session's transaction,
which is exactly the dirt this deploy exists to prevent."
importlib ___canonicalClassRegistry___.
importlib ___canonicalModules___.
importlib ___canonicalModuleHashes___.
importlib ___canonicalMetaclasses___.
(UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil) isNil
  ifTrue: [UserGlobals at: #'GrailCanonicalClassSet' put: RcIdentityBag new].
"gemdb's __init__ imports the submodules, so loading 'gemdb' pulls them
in; they are also loaded by name, like deployFrameworks does for
werkzeug's submodules, so each has its own registry and hash entry."
names := #('gemdb' 'gemdb.admin' 'gemdb.sessions').
loaded := 0.
names do: [:nm | | path |
  path := importlib @env1:___moduleNameToPath___: nm.
  path isNil
    ifTrue: [out nextPutAll: 'deployGemdb: skipped (no path): ' , nm; cr]
    ifFalse: [
      importlib loadModuleFromPath: path name: nm.
      loaded := loaded + 1]].
System commitTransaction ifFalse: [
  out nextPutAll: 'deployGemdb: COMMIT FAILED'; cr.
  ExitClientError signal: 'deployGemdb commit failed' status: 1].
out nextPutAll: 'deployGemdb: '; print: loaded;
    nextPutAll: ' modules bound/built + committed in ';
    print: (System _timeMs - t0); nextPutAll: ' ms'; cr.
%
logout
exit 0
