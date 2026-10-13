! file scripts/deployUnicodedata.gs
!
! Deploy unicodedata with its databases BUILT (#1508).  The first call that
! needs the Unicode Character Database (normalize, category, combining, ...)
! parses the generated tables into an _ucd.Database: about 0.55s for the
! current version and 0.42s more for ucd_3_2_0, which stringprep and the
! IDNA codec use.  The result is cached in the module global
! _ucd._databases, so without this step EVERY session pays it again -- and
! the cold imports of _ucd and its table modules leave that session with
! something to commit.
!
! This session builds both and commits, so the cache is committed state: a
! later session warm-binds _ucd with both Databases already in
! _databases, its first normalize costs a few milliseconds, and nothing is
! written.  Measured on Darwin arm64: 550ms -> 4ms (current), 424ms -> 2ms
! (3.2.0), 22 written objects -> 0.
!
! Both versions, not just the current one: a 3.2.0 build in a later session
! would store into the committed _databases dict, which is the write this
! step exists to prevent.
!
! IDEMPOTENT: when the modules are already deployed with both databases
! built, this binds them, builds nothing and commits nothing.  ./install.sh
! runs it after deployGemdb.gs, for the same reason (the runtime generation
! bump in install.gs discards any deployment made before it), and
! tests/scripts/run_unicodedata_deploy_test.sh runs it before checking a
! fresh session.
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
| out t0 ud fresh |
out := GsFile stdout.
t0 := System _timeMs.
"Every canonical registry exists before the commit, as in deployGemdb.gs: one
left uncreated would be materialised by a later session's read -- a write."
importlib ___canonicalClassRegistry___.
importlib ___canonicalModules___.
importlib ___canonicalModuleHashes___.
importlib ___canonicalMetaclasses___.
(UserGlobals at: #'GrailCanonicalClassSet' otherwise: nil) isNil
  ifTrue: [UserGlobals at: #'GrailCanonicalClassSet' put: RcIdentityBag new].
"One call into each version builds its Database (Database._build) and
caches it in _ucd._databases, importing _ucd, _ucd_current and _ucd_3_2_0
on the way."
ud := importlib @env1:___runtimeModule___: 'unicodedata'.
ud @env1:normalize: 'NFC' _: 'a'.
(ud @env1:___moduleAttrLoad___: #ucd_3_2_0) @env1:normalize: 'NFC' _: 'a'.
fresh := System needsCommit.
System commitTransaction ifFalse: [
  out nextPutAll: 'deployUnicodedata: COMMIT FAILED'; cr.
  ExitClientError signal: 'deployUnicodedata commit failed' status: 1].
out nextPutAll: 'deployUnicodedata: both databases built';
    nextPutAll: (fresh ifTrue: [' + committed'] ifFalse: [' (already deployed, nothing to commit)']);
    nextPutAll: ' in '; print: (System _timeMs - t0); nextPutAll: ' ms'; cr.
%
logout
exit 0
