! ===============================================================================
! Rebuild every stale deployed Python module, and commit it -- run by install.sh
! after the Rowan load, so no application session has to.
! ===============================================================================
! An install moves GrailRuntimeGeneration, and every module deployed under the
! previous one is then stale (docs/Persistent_Modules_and_Classes.md D7): its next
! import rebuilds it into its committed instance and classes. Left to the
! application, that rebuild is a write in whichever session imports the module
! first -- a session that has not started a transaction is then dirty, and
! gemdb.transaction() refuses to begin -- and every non-committing session
! rebuilds it again.  Here it happens once, committed, in every namespace (the
! default one and each app's), so an application binds warm after an upgrade.
!
! Only STALE modules are rebuilt; a current one is left alone. A module whose
! source file is gone, or that fails to build, is reported and skipped: it stays
! stale, and rebuilds (or raises) on its next import, as it would have anyway.
! Idempotent: a second run finds nothing stale.
output pushnew redeployModules.out
iferr 1 where
iferr 2 output pop
iferr 3 exit 1
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
| out t0 apps rebuilt skipped failed |
out := GsFile stdout.
t0 := System _timeMs.
rebuilt := 0. skipped := 0. failed := 0.
apps := OrderedCollection with: nil.
importlib ___grailApps___ ifNotNil: [:reg | reg keysDo: [:k | apps add: k]].
apps do: [:app | | ns mods pass before |
	ns := importlib ___grailUseApp___: app.
	mods := ns at: #'GrailCanonicalModules' otherwise: nil.
	"PASSES until one rebuilds nothing.  A rebuild moves the module's generation,
	which makes a module already rebuilt that imports it stale again -- measured:
	codecs and pickle were left stale behind _codecs and _compat_pickle.  Bounded,
	so a cycle that never settles cannot hang an install."
	pass := 0.
	[pass := pass + 1.
	 before := rebuilt.
	 SessionTemps current removeKey: #'GrailModuleCurrency' ifAbsent: [].
	 (mods isNil ifTrue: [#()] ifFalse: [mods keys asSortedCollection: [:a :b | a <= b]]) do: [:nm |
		"Current: nothing to do -- an earlier module's rebuild may have rebuilt
		this one as a dependency.  Stale but already loaded this session: a later
		pass, after a dependency moved; evicted so the load rebuilds it."
		(importlib ___isCurrentModule___: nm)
			ifFalse: [ | path |
				(importlib @env1:lookupModule: nm) notNil ifTrue: [importlib removeModule: nm].
				path := importlib ___deployedSourcePathOf___: nm.
				(path isNil or: [(GsFile existsOnServer: path) ~~ true])
					ifTrue: [
						skipped := skipped + 1.
						out nextPutAll: 'redeployModules: skipped (no source) ' , (app ifNil: ['']) , ' ' , nm; cr]
					ifFalse: [
						"Committed one module at a time: a whole stdlib's rebuild in one
						transaction overflows the gem's temporary object space.

						A class whose bases changed is refused (importlib
						___canonicalSubclassOf:...), to keep its stored instances from
						being stranded on the old class.  Where nothing is stored against
						it -- no instance of it or of any class below it -- the refusal
						protects nothing, and this session, clean after the abort, can
						count: such a module is rebuilt again with the refusal lifted for
						exactly those classes.  Bounded, for a module whose classes keep
						turning up new ones.  A class with instances stays refused, with
						the advice to run gemdb.schema.rebase."
						[:allowed | | attempt done |
						 attempt := 0. done := false.
						 [done or: [attempt >= 5]] whileFalse: [ | refused err |
							attempt := attempt + 1.
							err := nil.
							SessionTemps current removeKey: #'GrailRefusedBaseChanges' ifAbsent: [].
							(importlib @env1:lookupModule: nm) notNil ifTrue: [importlib removeModule: nm].
							[importlib ___allowBaseChanges___: allowed while: [importlib loadModuleFromPath: path name: nm].
							 System commitTransaction ifFalse: [
								out nextPutAll: 'redeployModules: COMMIT FAILED after ' , nm; cr.
								ExitClientError signal: 'redeployModules commit failed' status: 1].
							 rebuilt := rebuilt + 1.
							 done := true]
								on: Error , (System myUserProfile symbolList objectNamed: #BaseException)
								do: [:e |
									err := e messageText ifNil: [e class name].
									System abortTransaction.
									e return: nil].
							done ifFalse: [
								refused := (SessionTemps current at: #'GrailRefusedBaseChanges' otherwise: #())
									reject: [:k | allowed includes: k].
								(refused notEmpty
									and: [(importlib ___grailUninhabitedBaseChanges___: refused) size = refused size])
									ifTrue: [
										refused do: [:k |
											out nextPutAll: 'redeployModules: ' , (app ifNil: ['']) , ' ' , nm
												, ': nothing is stored against ' , k
												, ', so it is rebuilt on its new bases'; cr].
										allowed addAll: refused.
										attempt >= 5 ifTrue: [
											failed := failed + 1.
											out nextPutAll: 'redeployModules: FAILED ' , (app ifNil: ['']) , ' ' , nm
												, ': still refused after ' , attempt printString , ' rebuilds'; cr]]
									ifFalse: [
										failed := failed + 1.
										out nextPutAll: 'redeployModules: FAILED ' , (app ifNil: ['']) , ' ' , nm , ': '
											, err asString; cr.
										attempt := 5]]]]
							value: Set new]]].
	 rebuilt > before and: [pass < 5]] whileTrue.
	System commitTransaction ifFalse: [
		out nextPutAll: 'redeployModules: COMMIT FAILED for ' , (app ifNil: ['the default namespace']); cr.
		ExitClientError signal: 'redeployModules commit failed' status: 1]].
importlib ___grailUseApp___: nil.
out nextPutAll: 'redeployModules: ' ; print: rebuilt; nextPutAll: ' rebuilt, ';
	print: skipped; nextPutAll: ' skipped, '; print: failed; nextPutAll: ' failed, in ';
	print: (System _timeMs - t0); nextPutAll: ' ms'; cr.
%
logout
exit 0
