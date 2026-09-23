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
"Ask importlib for the checkout root instead of guessing one: grailDir honours
an explicit ``grailDir:'' and otherwise resolves lazily, preferring a candidate
that really holds src/python/stdlib.  Export the resolved value to GRAIL_DIR --
the Python half reads os.environ there -- only when it is unset or disagrees."
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out t0 names loaded |
out := GsFile stdout.
t0 := System _timeMs.
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
in.  Listing them by name as well guards against that changing: a name
the closure already loaded is skipped, not rebuilt (see the loop)."
names := #('gemdb' 'gemdb.admin' 'gemdb.schema' 'gemdb.sessions').
loaded := 0.
names do: [:nm | | path |
  path := importlib @env1:___moduleNameToPath___: nm.
  path isNil
    ifTrue: [out nextPutAll: 'deployGemdb: skipped (no path): ' , nm; cr]
    ifFalse: [
      "BUILT ONCE.  A name an earlier one's closure already imported this
      session is skipped: it is registered, hashed and recorded already, and
      a second loadModuleFromPath: would re-execute it into a NEW instance
      (nothing is committed yet, so there is no committed one to rebuild
      into).  Whatever the first build handed out keeps the first instance
      alive -- measured: a BoundMethod captured from werkzeug.local held it,
      so after the commit werkzeug.http/.local/.wsgi/.exceptions/.utils each
      had two committed instances, and calls through the capture ran
      against globals the registry no longer named."
      (importlib @env1:lookupModule: nm) isNil
        ifTrue: [importlib loadModuleFromPath: path name: nm].
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
