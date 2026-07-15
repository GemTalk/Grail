! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeployCheckTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DeployCheckTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DeployCheckTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DeployCheckTestCase -- gemstone.deploy_check(module), the pre-deploy audit
! (docs/Persistent_Modules_and_Classes.md par.10.4).  Imports two fixtures --
! one holding session-bound resources in module globals (an open socket + a
! threading.Lock over a Semaphore), one fully commit-clean -- and asserts the
! audit flags exactly the session-bound values on the dirty one and nothing on
! the clean one.  The suite never commits, so this exercises the walk itself,
! not the commit path.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DeployCheckTestCase removeAllMethods.
DeployCheckTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
checkModule: shortName
	"Load tests/python/<shortName>.py fresh and return the
	gemstone.deploy_check(...) result (a Python list of findings)."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: shortName @env0:asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/' @env0:, shortName @env0:, '.py')
		name: shortName.
	^ (gemstone @env1:instance) @env1:deploy_check: shortName
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
findings: shortName includeSubstring: sub
	"True when any deploy_check finding for the module contains sub."

	| r found |
	r := self checkModule: shortName.
	found := false.
	1 @env0:to: (r @env1:__len__) do: [:i |
		((r @env1:__getitem__: i @env0:- 1) @env0:includesString: sub) ifTrue: [found := true]].
	^ found
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testCleanModuleReportsNothing
	"A module whose globals are all committable (ints, lists, dicts,
	functions) audits clean."

	self assert: (self checkModule: 'grail_deploy_clean') @env1:__len__ equals: 0
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testDirtyModuleFlagsSocket
	"An open socket in a module global is flagged (dead after
	commit/logout)."

	self assert: (self findings: 'grail_deploy_dirty' includeSubstring: 'GsSocket')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testDirtyModuleFlagsSemaphore
	"A threading.Lock's Semaphore is flagged (non-persistable -- commit
	would fail 2407)."

	self assert: (self findings: 'grail_deploy_dirty' includeSubstring: 'Semaphore')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testFindingsCarryClassPath
	"Each finding names the reference path from the module down to the
	session-bound object (module class first)."

	self assert: (self findings: 'grail_deploy_dirty'
		includeSubstring: 'Grail_deploy_dirty.')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testUnimportedModuleReported
	"Auditing a module that was never imported returns a single
	explanatory finding rather than raising."

	| r |
	importlib @env1:modules @env0:removeKey: #'no_such_deploy_mod' ifAbsent: [].
	r := (gemstone @env1:instance) @env1:deploy_check: 'no_such_deploy_mod'.
	self assert: r @env1:__len__ equals: 1.
	self assert: ((r @env1:__getitem__: 0) @env0:includesString: 'not imported')
%

category: 'Grail-Tests-deploy'
method: DeployCheckTestCase
testStaleGenerationDiscardsCanonicalRegistries
	"RUNTIME-GENERATION GUARD: install.gs bumps GrailRuntimeGeneration
	because an install recreates the Python runtime classes -- canonical
	modules deployed under the previous runtime hold compiled references
	to the OLD exception classes and raise uncatchably when warm-bound.
	importlib ___canonicalGenerationCheck___ must discard the stale
	registries on first touch and stamp the deploy generation current.

	The test simulates the post-install state (registry populated under a
	back-dated deploy generation), clears the per-session memo to force a
	re-check, touches an accessor, and asserts the registry was reset.
	Every mutated global is restored afterwards -- the suite must not
	disturb a standing deployment."

	| ug st savedMemo savedDeployGen savedMods savedHashes savedClasses savedSet marker |
	ug := UserGlobals.
	st := SessionTemps current.
	savedMemo := st at: #'GrailCanonicalGenChecked' otherwise: nil.
	savedDeployGen := ug at: #'GrailCanonicalDeployGeneration' otherwise: nil.
	savedMods := ug at: #'GrailCanonicalModules' otherwise: nil.
	savedHashes := ug at: #'GrailCanonicalModuleHashes' otherwise: nil.
	savedClasses := ug at: #'GrailCanonicalClasses' otherwise: nil.
	savedSet := ug at: #'GrailCanonicalClassSet' otherwise: nil.
	[
		"Simulate: a populated registry deployed under an OLDER generation."
		marker := RcKeyValueDictionary new.
		marker at: 'stale_marker_module' put: 42.
		ug at: #'GrailCanonicalModules' put: marker.
		ug at: #'GrailCanonicalDeployGeneration'
			put: (ug at: #'GrailRuntimeGeneration' otherwise: 0) - 1.
		st removeKey: #'GrailCanonicalGenChecked' ifAbsent: [].
		"First touch must discard the stale registry and stamp current."
		self deny: (importlib ___canonicalModules___ includesKey: 'stale_marker_module').
		self assert: (ug at: #'GrailCanonicalDeployGeneration' otherwise: nil)
			equals: (ug at: #'GrailRuntimeGeneration' otherwise: 0).
		"Memoised: a second stale-marking within the session is NOT re-checked."
		ug at: #'GrailCanonicalModules' put: marker.
		self assert: (importlib ___canonicalModules___ includesKey: 'stale_marker_module')
	] ensure: [
		st removeKey: #'GrailCanonicalGenChecked' ifAbsent: [].
		savedMemo isNil ifFalse: [st at: #'GrailCanonicalGenChecked' put: savedMemo].
		savedDeployGen isNil
			ifTrue: [ug removeKey: #'GrailCanonicalDeployGeneration' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalDeployGeneration' put: savedDeployGen].
		savedMods isNil
			ifTrue: [ug removeKey: #'GrailCanonicalModules' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalModules' put: savedMods].
		savedHashes isNil
			ifTrue: [ug removeKey: #'GrailCanonicalModuleHashes' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalModuleHashes' put: savedHashes].
		savedClasses isNil
			ifTrue: [ug removeKey: #'GrailCanonicalClasses' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalClasses' put: savedClasses].
		savedSet isNil
			ifTrue: [ug removeKey: #'GrailCanonicalClassSet' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalClassSet' put: savedSet]]
%
