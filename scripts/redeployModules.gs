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
! Only STALE modules are rebuilt; a current one is left alone. Where each one is
! rebuilt from is importlib ___redeployPlanFor___:grailDir:'s answer:
!   - one of Grail's own modules (shared base) recorded under ANOTHER checkout's
!     src/python/ is moved to this checkout's copy, and relocated as by
!     gemdb.modules.relocate when its source changed (``relocated'' line);
!   - any other module whose recorded file is gone is rebuilt from the file
!     found under its name when that file holds the same source (``moved'');
!   - otherwise from its recorded file, or, when that is gone, it is reported
!     and skipped: it stays stale, and rebuilds (or raises) on its next import,
!     as it would have anyway.
! A build failure is reported once, after the last pass, and only for a module no
! pass rebuilt: one that fails before a dependency and rebuilds after it is
! reported as rebuilt after a retry.  A failure that is a D10 refusal (a
! different file with different source under a deployed name, for the module or
! one it imports) is not retried: no pass can clear it.  It is reported with the
! refused module and the command for it.
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
apps do: [:app | | ns mods pass before failures foreign relocating announced relocate |
	ns := importlib ___grailUseApp___: app.
	"A FAILURE IS A MODULE'S LAST OUTCOME, NOT ITS FIRST.  A module rebuilt
	before a deployed module it imports fails in that pass -- its import of a
	stale app module off the install's sys.path is ``No module named ...'' --
	and rebuilds in the next, once the dependency has (GemDB 1.9.0's routes_api,
	before wire).  Reported as it happened, that read as a failure though the
	module was rebuilt, and a module failing every pass was reported once per
	pass (GemTalk/Grail#1884).  So a failure is held, module by module, until
	the passes settle: one that later rebuilds is reported as rebuilt after a
	retry, and only one still failing at the end counts as failed."
	failures := Dictionary new.
	mods := ns at: #'GrailCanonicalModules' otherwise: nil.
	"A REFUSAL IS FINAL FOR THE RUN.  A rebuild that fails on D10's refusal --
	the module's own import, or one of a module it imports, found a different
	file with different source under a deployed name (importlib
	___refuseForeignSourcePath___:for:, which records it) -- fails the same way
	in every later pass.  Retried, the ~100 modules that import a refused
	types.py were rebuilt and failed again on every pass until the session ran
	out of temporary object memory.  So such a module is held here, not
	retried, and reported once with the refused module."
	foreign := Dictionary new.
	announced := Set new.
	"GRAIL'S OWN MODULES WITH A CHANGED SOURCE are relocated to this checkout
	(#relocated).  A module rebuilt before one of them imports it from here
	before its own turn comes, so every rebuild runs with the relocate
	allowance (gemdb.modules.relocate's) for all of them."
	relocating := Set new.
	mods isNil ifFalse: [mods keysDo: [:nm |
		(importlib ___isCurrentModule___: nm) ifFalse: [
			(importlib ___redeployPlanFor___: nm) ifNotNil: [:plan |
				plan first == #relocated ifTrue: [relocating add: nm]]]]].
	relocate := [relocating do: [:r |
		[importlib ___grailRelocateModule___: r] on: Error do: [:e | e return: nil]]].
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
		((importlib ___isCurrentModule___: nm) or: [foreign includesKey: nm])
			ifFalse: [ | plan path deployed |
				(importlib @env1:lookupModule: nm) notNil ifTrue: [importlib removeModule: nm].
				"Where to rebuild it from (importlib ___redeployPlanFor___:grailDir:):
				a module deployed from a removed worktree is rebuilt from here
				rather than skipped on every install.  Announced once, on its first
				pass."
				plan := importlib ___redeployPlanFor___: nm.
				path := plan ifNotNil: [plan last].
				(plan notNil and: [plan first ~~ #recorded and: [(announced includes: nm) not]]) ifTrue: [
					announced add: nm.
					deployed := importlib ___deployedSourcePathOf___: nm.
					out nextPutAll: 'redeployModules: '
						, (plan first == #relocated ifTrue: ['relocated '] ifFalse: ['moved '])
						, (app ifNil: ['']) , ' ' , nm
						, (plan first == #relocated ifTrue: [' (Grail source changed): '] ifFalse: [' (same source): '])
						, deployed , ' -> ' , path; cr].
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
							SessionTemps current removeKey: #'GrailForeignSourceRefusal' ifAbsent: [].
							relocate value.
							(importlib @env1:lookupModule: nm) notNil ifTrue: [importlib removeModule: nm].
							[importlib ___allowBaseChanges___: allowed while: [importlib loadModuleFromPath: path name: nm].
							 System commitTransaction ifFalse: [
								out nextPutAll: 'redeployModules: COMMIT FAILED after ' , nm; cr.
								ExitClientError signal: 'redeployModules commit failed' status: 1].
							 rebuilt := rebuilt + 1.
							 (failures removeKey: nm ifAbsent: [nil]) ifNotNil: [:earlier |
								out nextPutAll: 'redeployModules: rebuilt ' , (app ifNil: ['']) , ' ' , nm
									, ' on pass ' , pass printString , ', after: ' , earlier; cr].
							 done := true]
								on: Error , (System myUserProfile symbolList objectNamed: #BaseException)
								do: [:e |
									err := e messageText ifNil: [e class name].
									System abortTransaction.
									"The abort takes the build's committed state back -- a
									deployed module's globals among it -- but not this
									session's memo of module-level defaults (module class >>
									___moduleDefaultsTable___), which then holds values the
									globals no longer do: dataclasses' field() kept the
									aborted build's MISSING against the committed one, and
									the retry raised ``cannot specify both default and
									default_factory'' (GemTalk/Grail#1884).  A cache, so
									dropped: the next call evaluates each default again."
									SessionTemps current removeKey: #'GrailModuleFunctionDefaults' ifAbsent: [nil].
									e return: nil].
							(done not and: [(SessionTemps current at: #'GrailForeignSourceRefusal' otherwise: nil) notNil])
								ifTrue: [
									foreign at: nm put: (SessionTemps current at: #'GrailForeignSourceRefusal').
									failures removeKey: nm ifAbsent: [].
									done := true].
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
											failures at: nm put: 'still refused after ' , attempt printString , ' rebuilds']]
									ifFalse: [
										failures at: nm put: err asString.
										attempt := 5]]]]
							value: Set new]]].
	 rebuilt > before and: [pass < 5]] whileTrue.
	(failures keys asSortedCollection: [:a :b | a <= b]) do: [:nm |
		failed := failed + 1.
		out nextPutAll: 'redeployModules: FAILED ' , (app ifNil: ['']) , ' ' , nm , ': '
			, (failures at: nm); cr].
	"Refusals: each module once, then each refused module once, with its fix."
	(foreign keys asSortedCollection: [:a :b | a <= b]) do: [:nm | | r |
		failed := failed + 1.
		r := foreign at: nm.
		out nextPutAll: 'redeployModules: FAILED ' , (app ifNil: ['']) , ' ' , nm , ': not retried, '
			, ((r at: 1) = nm ifTrue: ['its import'] ifFalse: ['its import of ' , (r at: 1)])
			, ' is refused (see REFUSED below)'; cr].
	((foreign values collect: [:r | r at: 1]) asSet asSortedCollection: [:a :b | a <= b]) do: [:dep | | r |
		r := foreign detect: [:each | (each at: 1) = dep].
		out nextPutAll: 'redeployModules: REFUSED ' , (app ifNil: ['']) , ' ' , dep , ': deployed from '
			, (r at: 2) , ', and this checkout has a different file with different source, ' , (r at: 3)
			, '. If it moved, run gemdb.modules.relocate(''' , dep
			, '''), import it and commit; if it is a different module, gemdb.modules.forget(''' , dep , ''')'; cr].
	"The allowances nothing used, so none outlives this namespace's passes."
	(SessionTemps current at: #'GrailModulePathChangeAllowed' otherwise: nil) ifNotNil: [:set |
		relocating do: [:r | set remove: r ifAbsent: []]].
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
