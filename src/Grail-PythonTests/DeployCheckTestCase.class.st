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
DeployCheckTestCase >> testStaleGenerationKeepsCanonicalRegistries [
	"RUNTIME-GENERATION GUARD (docs/Persistent_Modules_and_Classes.md D7): every
	install bumps GrailRuntimeGeneration, and keeps Grail's classes.  So
	importlib ___canonicalGenerationCheck___ must KEEP the deployed modules --
	their classes and instances are what stored objects refer to -- and stamp
	the deploy generation current; a module built under an older runtime
	generation then reads as not current, which rebuilds it in place on its
	next import.

	The test simulates the post-install state (registries populated, the deploy
	generation back-dated, one module built under the previous runtime and one
	under this one), clears the per-session memos to force a re-check, and
	asserts both.  Every mutated global is restored afterwards -- the suite must
	not disturb a standing deployment."

	| ug st runtimeGen savedMemo savedCurrency savedDeployGen savedMods savedHashes savedDeps mods hashes deps |
	ug := UserGlobals.
	st := SessionTemps current.
	runtimeGen := ug at: #'GrailRuntimeGeneration' otherwise: 0.
	savedMemo := st at: #'GrailCanonicalGenChecked' otherwise: nil.
	savedCurrency := st at: #'GrailModuleCurrency' otherwise: nil.
	savedDeployGen := ug at: #'GrailCanonicalDeployGeneration' otherwise: nil.
	savedMods := ug at: #'GrailCanonicalModules' otherwise: nil.
	savedHashes := ug at: #'GrailCanonicalModuleHashes' otherwise: nil.
	savedDeps := ug at: #'GrailCanonicalModuleDeps' otherwise: nil.
	[
		mods := RcKeyValueDictionary new.
		hashes := RcKeyValueDictionary new.
		deps := RcKeyValueDictionary new.
		#('stale_marker_module' 'current_marker_module') do: [:name |
			mods at: name put: 42.
			hashes at: name put: 'hash'].
		deps at: 'stale_marker_module' put: { 'gen' . #() . runtimeGen - 1 }.
		deps at: 'current_marker_module' put: { 'gen' . #() . runtimeGen }.
		ug at: #'GrailCanonicalModules' put: mods.
		ug at: #'GrailCanonicalModuleHashes' put: hashes.
		ug at: #'GrailCanonicalModuleDeps' put: deps.
		ug at: #'GrailCanonicalDeployGeneration' put: runtimeGen - 1.
		st removeKey: #'GrailCanonicalGenChecked' ifAbsent: [].
		st removeKey: #'GrailModuleCurrency' ifAbsent: [].
		"First touch keeps the registries and stamps the deploy generation current."
		self assert: (importlib ___canonicalModules___ includesKey: 'stale_marker_module').
		self assert: (ug at: #'GrailCanonicalModuleDeps') == deps.
		self assert: (ug at: #'GrailCanonicalDeployGeneration' otherwise: nil) equals: runtimeGen.
		"Built under the previous runtime: not current, so its next import rebuilds it."
		self deny: (importlib ___isCurrentModule___: 'stale_marker_module').
		self assert: (importlib ___isCurrentModule___: 'current_marker_module')
	] ensure: [
		st removeKey: #'GrailCanonicalGenChecked' ifAbsent: [].
		savedMemo isNil ifFalse: [st at: #'GrailCanonicalGenChecked' put: savedMemo].
		st removeKey: #'GrailModuleCurrency' ifAbsent: [].
		savedCurrency isNil ifFalse: [st at: #'GrailModuleCurrency' put: savedCurrency].
		{ #'GrailCanonicalDeployGeneration' -> savedDeployGen.
		  #'GrailCanonicalModules' -> savedMods.
		  #'GrailCanonicalModuleHashes' -> savedHashes.
		  #'GrailCanonicalModuleDeps' -> savedDeps } do: [:each |
			each value isNil
				ifTrue: [ug removeKey: each key ifAbsent: []]
				ifFalse: [ug at: each key put: each value]]]

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
