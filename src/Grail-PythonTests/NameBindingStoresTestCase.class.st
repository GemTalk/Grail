"tests/python/name_binding_stores.py and tests/python/name_loads_module_shadows.py
-- the name loads and binding stores the IR path used to refuse (P1.2a) -- held to
CPython on both codegen paths, with the IR arm proven to have compiled them.

Each fixture lists in KNOWN_GRAIL the checks Grail still gets wrong on BOTH
paths; those are pinned as expected failures (testKnownGrailDivergencesStill
Diverge), so a fix shows up as a pin to delete rather than going unnoticed."
Class {
	#name : 'NameBindingStoresTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'modules',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___censusCountsFor___: aFixture [
	"Load aFixture under the ELIGIBILITY CENSUS and answer its counts."

	| nm |
	nm := 'nbs_census_' , aFixture.
	(importlib @env1:modules) removeKey: nm asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: nm.
	self ___snapshotRegistry___.
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: (self ___fixturePath___: aFixture) name: nm]
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___disagreeingKeysIn___: aModule [
	"Every EXPECTED key Grail gets wrong, except the KNOWN_GRAIL ones."

	| bad known |
	bad := OrderedCollection new.
	known := self ___knownGrailIn___: aModule.
	(self ___keysIn___: aModule) do: [:k |
		(known includes: k) ifFalse: [
			| got want |
			got := self ___reprOf___: aModule dict: #'r' key: k.
			want := self ___reprOf___: aModule dict: #'EXPECTED' key: k.
			got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]]].
	^ bad

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___fixturePath___: aFixture [
	^ importlib grailDir , '/tests/python/' , aFixture , '.py'

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___fixtures___ [
	"Fixture name -> the number of top-level defs plus class-body methods it
	holds, every one of which must compile through IR."

	^ { 'name_binding_stores' -> 34. 'name_loads_module_shadows' -> 16 }

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___keysIn___: aModule [
	| keys |
	keys := aModule @env1:___pyAttrLoad___: #'KEYS'.
	^ (1 to: (keys @env1:__len__)) collect: [:i |
		(keys @env1:__getitem__: i - 1) @env0:asString]

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___knownFallbacks___ [
	"Fixture name -> how many of its defs the IR build still hands to text.
	name_binding_stores: HeaderWalrus.m, whose ``@d := deco'' and
	``metaclass=(mk := Meta)'' fail to build under IR with ``undefined symbol
	d'' -- a gap older than this change; the text fallback gives CPython's
	answer.  Pinned with =, so a fix shows up as a count to lower."

	^ Dictionary new
		at: 'name_binding_stores' put: 1;
		yourself

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___knownGrailIn___: aModule [
	| known |
	known := aModule @env1:___pyAttrLoad___: #'KNOWN_GRAIL'.
	^ ((1 to: (known @env1:__len__)) collect: [:i |
		(known @env1:__getitem__: i - 1) @env0:asString]) asSet

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___module___: aFixture ir: aBoolean [
	"Forced on or off, under its own module name: what this pins is an
	ELIGIBILITY widening, so a flag-off run would exercise none of it."

	| nm |
	nm := 'nbs_' , (aBoolean ifTrue: ['ir_'] ifFalse: ['text_']) , aFixture.
	modules ifNil: [modules := Dictionary new].
	^ modules at: nm ifAbsent: [
		| m |
		(importlib @env1:modules) removeKey: nm asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: nm.
		self ___snapshotRegistry___.
		importlib ___irCodegenForce___: aBoolean.
		aBoolean ifTrue: [importlib ___irStatsReset___].
		m := importlib loadModuleFromPath: (self ___fixturePath___: aFixture) name: nm.
		modules at: nm put: m.
		m]

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___reprOf___: aModule dict: aSymbol key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: aSymbol) @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
NameBindingStoresTestCase >> ___snapshotRegistry___ [
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___]

]

{ #category : 'Grail-Setup' }
NameBindingStoresTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	self ___fixtures___ do: [:assoc |
		#('nbs_ir_' 'nbs_text_' 'nbs_census_') do: [:prefix |
			| n |
			n := prefix , assoc key.
			(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
			self ___forgetCanonicalModule___: n]].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	modules := nil

]

{ #category : 'Grail-Tests - name loads and binding stores' }
NameBindingStoresTestCase >> testEveryShapeAgreesWithCPythonOnTheTextPath [
	"The text twin agrees too.  Four shapes were wrong on it as well and are
	fixed on both paths: ``except ():'' (a CompileError), a ``global'' except
	target left bound after its handler, the ``o.__class__'' leaf of a with /
	for / unpack / chained store (type(o) unchanged), the class-cell walrus
	(never compiled), and ``__class__'' in a module-level def (answered the
	module type)."

	self ___fixtures___ do: [:assoc |
		| bad |
		bad := self ___disagreeingKeysIn___: (self ___module___: assoc key ir: false).
		self assert: bad isEmpty
			description: assoc key , ' disagrees with CPython on the text path: '
				, bad asArray printString]

]

{ #category : 'Grail-Tests - name loads and binding stores' }
NameBindingStoresTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	self ___fixtures___ do: [:assoc |
		| bad |
		bad := self ___disagreeingKeysIn___: (self ___module___: assoc key ir: true).
		self assert: bad isEmpty
			description: assoc key , ' disagrees with CPython under IR: '
				, bad asArray printString]

]

{ #category : 'Grail-Tests - name loads and binding stores' }
NameBindingStoresTestCase >> testKnownGrailDivergencesStillDiverge [
	"Expected failures, on both paths.  When one of these starts agreeing with
	CPython, delete it from the fixture's KNOWN_GRAIL: the comparison tests
	above will then hold it."

	self ___fixtures___ do: [:assoc |
		#(true false) do: [:ir |
			| m |
			m := self ___module___: assoc key ir: ir.
			(self ___knownGrailIn___: m) do: [:k |
				self deny: (self ___reprOf___: m dict: #'r' key: k)
						= (self ___reprOf___: m dict: #'EXPECTED' key: k)
					description: assoc key , ' ' , k , ' now agrees with CPython ('
						, (ir ifTrue: ['IR'] ifFalse: ['text'])
						, '); remove it from KNOWN_GRAIL']]]

]

{ #category : 'Grail-Tests - name loads and binding stores' }
NameBindingStoresTestCase >> testNoDefInTheFixturesRefuses [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it: an eligibility refusal never reaches the seam, so it is
	not a FALLBACK, and the agreement tests above would keep passing on the
	text twin.  Every top-level def and class-body method in the fixtures is
	compiled or eligible -- no refusal row of any kind."

	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self ___fixtures___ do: [:assoc |
		| counts refusals done |
		counts := self ___censusCountsFor___: assoc key.
		refusals := counts keys select: [:k |
			| s |
			s := k asString.
			(s includesString: 'Ast')
				or: [(s includesString: 'shape:')
				or: [(s includesString: 'method:')
				or: [(s includesString: 'signature:')
				or: [(s includesString: 'nestedDef:')
				or: [s includesString: 'classDef:']]]]]].
		self assert: refusals isEmpty
			description: assoc key , ' still refuses: ' , refusals asArray printString.
		self assert: (counts at: #fallback ifAbsent: [0]) = 0
			description: assoc key , ': an eligible def fell back: ' , counts printString.
		done := (counts at: #compiled ifAbsent: [0]) + (counts at: #'cm:eligible' ifAbsent: [0]).
		self assert: done >= assoc value
			description: assoc key , ': fewer defs compiled than the fixture holds ('
				, assoc value printString , '): ' , counts printString]

]

{ #category : 'Grail-Tests - name loads and binding stores' }
NameBindingStoresTestCase >> testTheIRArmActuallyCompiledTheFixtures [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text."

	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self ___fixtures___ do: [:assoc |
		| stats |
		modules ifNotNil: [modules removeKey: 'nbs_ir_' , assoc key ifAbsent: []].
		self ___module___: assoc key ir: true.
		stats := importlib ___irStats___.
		self assert: (stats at: #fallbacks)
				= (self ___knownFallbacks___ at: assoc key ifAbsent: [0])
			description: assoc key , ': IR fell back to text: '
				, (stats at: #fallbacks) printString
				, ' (last error: ' , (stats at: #lastError) printString , ')']

]
