Class {
	#name : 'DeployCheckTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> checkModule: shortName [
	"Load tests/python/<shortName>.py fresh and return the
	gemstone.deploy_check(...) result (a Python list of findings)."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: shortName asSymbol ifAbsent: [].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , shortName , '.py')
		name: shortName.
	^ (gemstone @env1:instance) @env1:deploy_check: shortName

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> findings: shortName includeSubstring: sub [
	"True when any deploy_check finding for the module contains sub."

	| r found |
	r := self checkModule: shortName.
	found := false.
	1 to: (r @env1:__len__) do: [:i |
		((r @env1:__getitem__: i - 1) includesString: sub) ifTrue: [found := true]].
	^ found

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testCleanModuleReportsNothing [
	"A module whose globals are all committable (ints, lists, dicts,
	functions, a compiled regex, which rebuilds its C pointer) audits
	clean."

	self assert: (self checkModule: 'grail_deploy_clean') @env1:__len__ equals: 0

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testDirtyModuleFlagsSemaphore [
	"A generator's Semaphore is flagged (non-persistable -- commit would
	fail 2407), under the generator's path and Python type."

	self assert: (self findings: 'grail_deploy_dirty'
		includeSubstring: 'grail_deploy_dirty.gen (a generator) -> Semaphore')

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testDirtyModuleFlagsSocket [
	"An open socket in a module global is flagged (dead after
	commit/logout)."

	self assert: (self findings: 'grail_deploy_dirty' includeSubstring: 'GsSocket')

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testFindingsCarryClassPath [
	"Each finding names the path from the module down to the session-bound
	object in Python terms, with the holder's Python type."

	self assert: (self findings: 'grail_deploy_dirty'
		includeSubstring: 'grail_deploy_dirty.sock (a socket) -> GsSocket')

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testLockIsNotFlagged [
	"A threading.Lock commits and works in a later session (measured,
	docs/App_Namespaces_Design.md §6.0): its Semaphore is held where a commit
	never writes.  The old walk descended into that storage and flagged it."

	self deny: (self findings: 'grail_deploy_dirty' includeSubstring: '.lock')

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testNestedPathNamesKeyAndAttribute [
	"A socket held as an attribute of an object in a dict is reported by its
	Python path: the dict key, then the attribute."

	self assert: (self findings: 'grail_deploy_dirty'
		includeSubstring: 'grail_deploy_dirty.conns[''primary'']._sock (a socket) -> GsSocket')

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testStaleGenerationDiscardsCanonicalRegistries [
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

	| ug st savedMemo savedDeployGen savedMods savedHashes savedDeps savedClasses savedSet marker |
	ug := UserGlobals.
	st := SessionTemps current.
	savedMemo := st at: #'GrailCanonicalGenChecked' otherwise: nil.
	savedDeployGen := ug at: #'GrailCanonicalDeployGeneration' otherwise: nil.
	savedMods := ug at: #'GrailCanonicalModules' otherwise: nil.
	savedHashes := ug at: #'GrailCanonicalModuleHashes' otherwise: nil.
	savedDeps := ug at: #'GrailCanonicalModuleDeps' otherwise: nil.
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
		savedDeps isNil
			ifTrue: [ug removeKey: #'GrailCanonicalModuleDeps' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalModuleDeps' put: savedDeps].
		savedClasses isNil
			ifTrue: [ug removeKey: #'GrailCanonicalClasses' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalClasses' put: savedClasses].
		savedSet isNil
			ifTrue: [ug removeKey: #'GrailCanonicalClassSet' ifAbsent: []]
			ifFalse: [ug at: #'GrailCanonicalClassSet' put: savedSet]]

]

{ #category : 'Grail-Tests-deploy' }
DeployCheckTestCase >> testUnimportedModuleReported [
	"Auditing a module that was never imported returns a single
	explanatory finding rather than raising."

	| r |
	importlib @env1:modules removeKey: #'no_such_deploy_mod' ifAbsent: [].
	r := (gemstone @env1:instance) @env1:deploy_check: 'no_such_deploy_mod'.
	self assert: r @env1:__len__ equals: 1.
	self assert: ((r @env1:__getitem__: 0) includesString: 'not imported')

]
