Class {
	#name : 'MatchStatementIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MatchStatementIRTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'match_ir_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'match_ir_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'match_ir_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
MatchStatementIRTestCase >> ___disagreeingKeys___ [
	"Every key of the fixture's EXPECTED, which holds repr STRINGS rather than
	values -- so the comparison is against repr(r[k]), as the fixture's own
	__main__ does.  Read from EXPECTED rather than listed here because the text
	twin (MatchStatementTestCase) already names them one per test; what this
	case adds is that the IR arm agrees on all of them at once."

	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	expected @env0:keysAndValuesDo: [:k :want |
		| got |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want @env0:asString
			ifFalse: [bad add: k @env0:asString , ': ' , got , ' vs ' , want @env0:asString]].
	^ bad

]

{ #category : 'Grail-Private' }
MatchStatementIRTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/match_statement.py'

]

{ #category : 'Grail-Private' }
MatchStatementIRTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'match_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'match_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'match_ir'.
	^ irModule

]

{ #category : 'Grail-Setup' }
MatchStatementIRTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'match_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'match_ir_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'match_ir'.
	self ___forgetCanonicalModule___: 'match_ir_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - match under IR' }
MatchStatementIRTestCase >> testAMatchStatementIsNowEligible [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With no IR predicate it censuses 10
	`stmt:MatchAst' and compiles 2 defs, and the behavioural test above STILL
	PASSES -- the text twin answers all twenty correctly.  With the cut, 12
	compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'stmt:MatchAst' ifAbsent: [0]) = 0
		description: 'a match statement still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 12
		description: 'fewer defs compiled than the cut measured (12): '
			, counts printString

]

{ #category : 'Grail-Tests - match under IR' }
MatchStatementIRTestCase >> testEveryMatchShapeAgreesWithCPythonUnderIR [
	"All twenty of the fixture's checks with the seam forced on.

	Two of them are the silently-wrong hazards the fixture exists for: a BARE
	name captures where a DOTTED name compares, and a sequence pattern must not
	match str / bytes / dict / set.  An emit that got either wrong answers a
	plausible value rather than raising."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'match shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - match under IR' }
MatchStatementIRTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the missing predicate used to make it do.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 13
		description: 'fewer defs compiled than the cut measured (13, against 3 '
			, 'before it): compiled = ' , (stats at: #compiled) printString

]
