"
P1.4 of the IR-only codegen plan: IR STRICT MODE (importlib >> ___irStrict___,
GRAIL_IR_STRICT).  Under it a def the IR eligibility check admits but whose IR
build fails, and a def refused for a broken internal invariant, raise a
SystemError naming the def, its file and line and the cause, instead of
compiling silently through the text path.

Pinned here:
  * the switch: its spellings, that it is off by default, that it means
    nothing with IR codegen off, and that a test can seed it;
  * what a strict failure looks like, for a fallback and for an invariant
    refusal, and that without strict mode both stay silent;
  * the session tallies run_tests.sh reads (#sessionFallbacks,
    #sessionInvariants), which ___irStatsReset___ leaves alone;
  * tests/python/ir_strict_mode.py -- the shapes the census found falling
    back (#2234, #2170, and a NUL in a __slots__ name) -- loads under
    strict mode with no fallback and
    agrees with CPython (run the file directly).
"
Class {
	#name : 'IRStrictModeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'savedTotals',
		'irRegistrySnapshot',
		'loaded'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRStrictModeTestCase >> ___def___: aName in: aSource [
	"The FunctionDefAst named aName anywhere in aSource, parsed, so its parent
	chain is the one the parser builds."

	| found |
	(PythonParser parse: aSource) ___anyDescendantSatisfies___: [:n |
		((n isKindOf: FunctionDefAst) and: [n name asString = aName])
			ifTrue: [found := n. true]
			ifFalse: [false]].
	^ found

]

{ #category : 'Grail-Private' }
IRStrictModeTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/ir_strict_mode.py'

]

{ #category : 'Grail-Private' }
IRStrictModeTestCase >> ___loadFixture___ [
	"tests/python/ir_strict_mode.py, loaded with the seam forced on and STRICT
	mode on, under a module name of its own."

	| name |
	name := 'irsm_ir_strict_mode'.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	irRegistrySnapshot ifNil: [irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStrictForce___: true.
	importlib ___irStatsReset___.
	loaded := true.
	^ importlib loadModuleFromPath: self ___fixturePath___ name: name

]

{ #category : 'Grail-Private' }
IRStrictModeTestCase >> ___nestedSource___ [
	^ 'class Outer:
    def m(self):
        def inner():
            pass
        return inner
'

]

{ #category : 'Grail-Private' }
IRStrictModeTestCase >> ___strictFailureOf___: aBlock [
	"The description of the SystemError aBlock raises, or nil if it raises none."

	^ [aBlock value. nil] on: SystemError do: [:ex | ex return: ex description]

]

{ #category : 'Grail-Setup' }
IRStrictModeTestCase >> setUp [
	"The session tallies are what run_tests.sh fails a strict run on, and these
	tests provoke strict failures on purpose: keep the counts they add out of
	the shard's."

	| temps |
	super setUp.
	temps := SessionTemps current.
	savedTotals := {
		temps at: #'___grailIRFallbackTotal___' otherwise: nil.
		temps at: #'___grailIRInvariantTotal___' otherwise: nil }

]

{ #category : 'Grail-Setup' }
IRStrictModeTestCase >> tearDown [
	| temps |
	importlib ___irStrictForce___: nil.
	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	loaded == true ifTrue: [
		(importlib @env1:modules) removeKey: #'irsm_ir_strict_mode' ifAbsent: [].
		self ___forgetCanonicalModule___: 'irsm_ir_strict_mode'].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	temps := SessionTemps current.
	#(#'___grailIRFallbackTotal___' #'___grailIRInvariantTotal___') doWithIndex: [:k :i |
		(savedTotals at: i)
			ifNil: [temps removeKey: k ifAbsent: []]
			ifNotNil: [:v | temps at: k put: v]].
	super tearDown

]

{ #category : 'Grail-Tests - failures' }
IRStrictModeTestCase >> testFallbackIsSilentWithoutStrictMode [
	| def before msg |
	def := self ___def___: 'inner' in: self ___nestedSource___.
	importlib ___irCodegenForce___: true.
	importlib ___irStrictForce___: false.
	importlib ___irStatsReset___.
	before := importlib ___irStats___ at: #sessionFallbacks.
	msg := self ___strictFailureOf___: [
		importlib ___irNoteFallback___: def
			error: (Error new messageText: 'IR codegen: boom')
			file: '/x/strict.py'].
	self assert: msg isNil description: 'raised without strict mode: ' , msg printString.
	self assert: (importlib ___irStats___ at: #fallbacks) = 1.
	self assert: (importlib ___irStats___ at: #sessionFallbacks) = (before + 1).
	self assert: (importlib ___irStats___ at: #lastError) = 'inner: IR codegen: boom'

]

{ #category : 'Grail-Tests - failures' }
IRStrictModeTestCase >> testFallbackRaisesInStrictMode [
	"The error names the def by its qualified name, the file and line it was
	written at, and the build's own error -- not a codegen-gap stub."

	| def msg |
	def := self ___def___: 'inner' in: self ___nestedSource___.
	importlib ___irCodegenForce___: true.
	importlib ___irStrictForce___: true.
	importlib ___irStatsReset___.
	msg := self ___strictFailureOf___: [
		importlib ___irNoteFallback___: def
			error: (Error new messageText: 'IR codegen: boom')
			file: '/x/strict.py'].
	self assert: msg notNil description: 'strict mode did not raise'.
	self assert: (msg beginsWith: 'SystemError: Grail IR strict mode (GRAIL_IR_STRICT)')
		description: msg.
	self assert: (msg includesString: '''Outer.m.<locals>.inner'' (/x/strict.py, line 3)')
		description: msg.
	self assert: (msg includesString: 'its IR build failed: IR codegen: boom')
		description: msg.
	"Recorded as well as raised."
	self assert: (importlib ___irStats___ at: #fallbacks) = 1

]

{ #category : 'Grail-Tests - fixture' }
IRStrictModeTestCase >> testFixtureAgreesWithCPythonUnderStrictIR [
	| mod r table bad |
	mod := self ___loadFixture___.
	r := mod @env1:___pyAttrLoad___: #r.
	table := mod @env1:___pyAttrLoad___: #EXPECTED.
	bad := OrderedCollection new.
	(table @env1:keys) asArray do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env0:asString.
		want := (table @env1:__getitem__: k) @env0:asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'ir_strict_mode disagrees with CPython under strict IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - fixture' }
IRStrictModeTestCase >> testFixtureFallsBackNowhere [
	"Loading raises under strict mode if anything falls back; the counters
	say the same thing without it, and that the fixture really went through
	IR."

	| stats |
	self ___loadFixture___.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbackLog) printString.
	self assert: (stats at: #compiled) > 0
		description: 'nothing in the fixture compiled through IR'

]

{ #category : 'Grail-Tests - failures' }
IRStrictModeTestCase >> testInvariantRefusalRaisesInStrictMode [
	"A predicate that RAISES is the one invariant exit reachable from a real
	tree: a FunctionDefAst with no arguments node.  Without strict mode it is
	a refusal (the def compiles as text) counted for the session; with it, a
	SystemError naming the invariant."

	| def ctx admitted before msg |
	def := FunctionDefAst new.
	def name: 'broken'.
	ctx := CallAst ___compileContextSnapshot___.
	ctx at: #'moduleClassBeingCompiled' put: Object.
	ctx at: #'classBeingCompiled' put: nil.
	importlib ___irCodegenForce___: true.
	importlib ___irStrictForce___: false.
	before := importlib ___irStats___ at: #sessionInvariants.
	admitted := CallAst ___withCompileContext___: ctx do: [importlib ___irAdmits___: def].
	self deny: admitted.
	self assert: (importlib ___irStats___ at: #sessionInvariants) = (before + 1).
	importlib ___irStrictForce___: true.
	msg := self ___strictFailureOf___: [
		CallAst ___withCompileContext___: ctx do: [importlib ___irAdmits___: def]].
	self assert: msg notNil description: 'strict mode did not raise'.
	self assert: (msg includesString: '''broken''') description: msg.
	self assert: (msg includesString: 'broken internal invariant (invariant:reasonProbeRaised)')
		description: msg

]

{ #category : 'Grail-Tests - switch' }
IRStrictModeTestCase >> testSessionTalliesSurviveStatsReset [
	| before |
	importlib ___irCodegenForce___: true.
	importlib ___irStrictForce___: false.
	before := importlib ___irStats___ at: #sessionFallbacks.
	importlib ___irNoteFallback___: (self ___def___: 'inner' in: self ___nestedSource___)
		error: (Error new messageText: 'boom') file: nil.
	importlib ___irStatsReset___.
	self assert: (importlib ___irStats___ at: #fallbacks) = 0.
	self assert: (importlib ___irStats___ at: #sessionFallbacks) = (before + 1)

]

{ #category : 'Grail-Tests - switch' }
IRStrictModeTestCase >> testStrictFlagSpellings [
	"Opt-in: unset, empty and the four off-words (any case) are OFF."

	#(nil '' '0' 'false' 'FALSE' 'No' 'off') do: [:raw |
		self deny: (importlib ___irStrictFlagFor___: raw)
			description: raw printString , ' turned strict mode on'].
	#('1' 'true' 'yes' 'on' 'strict') do: [:raw |
		self assert: (importlib ___irStrictFlagFor___: raw)
			description: raw printString , ' left strict mode off']

]

{ #category : 'Grail-Tests - switch' }
IRStrictModeTestCase >> testStrictNeedsTheIRArm [
	importlib ___irStrictForce___: true.
	importlib ___irCodegenForce___: false.
	self deny: importlib ___irStrict___ description: 'strict mode on the text arm'.
	importlib ___irCodegenForce___: true.
	self assert: importlib ___irStrict___.
	self assert: (importlib ___irStats___ at: #strict).
	importlib ___irStrictForce___: false.
	self deny: importlib ___irStrict___

]
