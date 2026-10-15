Class {
	#name : 'BigmemtestIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BigmemtestIRTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'bigmem_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'bigmem_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'bigmem_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
BigmemtestIRTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/src/python/stdlib/test/grail_bigmem_check.py'

]

{ #category : 'Grail-Private' }
BigmemtestIRTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'bigmem_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'bigmem_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'bigmem_ir'.
	^ irModule

]

{ #category : 'Grail-Setup' }
BigmemtestIRTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'bigmem_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'bigmem_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'bigmem_ir'.
	self ___forgetCanonicalModule___: 'bigmem_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - bigmemtest' }
BigmemtestIRTestCase >> testBigmemtestIsNowEligible [
	"The assertion that fails if the cut is reverted.

	Neither of the other two tests can see it.  Restore the refusal and the
	answers stay 5147 (the text twin gives them) and fallbacks stays 0 (an
	eligibility refusal never reaches the seam, so it is not a fallback).  Only
	the census moves."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:decorators:bigmemtest' ifAbsent: [0]) = 0
		description: 'a @bigmemtest method still refuses: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 2
		description: 'fewer class methods eligible than the cut measured (2): '
			, counts printString

]

{ #category : 'Grail-Tests - bigmemtest' }
BigmemtestIRTestCase >> testTheInjectedDefaultSurvivesTheIRBuild [
	"The same four answers CPythonHarnessTestCase pins on the text path.

	Both decorator spellings are covered by the fixture: the bare name
	(``@bigmemtest'') and the attribute form (``@support.bigaddrspacetest'')."

	| result |
	result := self ___irModule___ @env1:RESULT.
	self assert: (result @env1:__getitem__: 0) equals: 5147
		description: 'the bare-name form did not get the dry-run default'.
	self assert: (result @env1:__getitem__: 1) equals: 5147
		description: 'the attribute form did not get the dry-run default'.
	self assert: (result @env1:__getitem__: 2) equals: true
		description: 'the bare-name method vanished from dir()'.
	self assert: (result @env1:__getitem__: 3) equals: true
		description: 'the attribute-form method vanished from dir()'

]

{ #category : 'Grail-Tests - bigmemtest' }
BigmemtestIRTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard, and the one that would have caught the original
	defect: before the fix these methods answered 5147 correctly and silently
	came from the TEXT twin, because the IR build raised and the seam fell back.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString

]
