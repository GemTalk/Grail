Class {
	#name : 'EvalCallerNamespaceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EvalCallerNamespaceTestCase >> ___censusCountsForFixture___ [
	"Load this fixture under the ELIGIBILITY CENSUS and answer its counts.

	The census is the only instrument that can see this cut.  ___irStats___
	cannot: an eligibility refusal never reaches the seam, so it is not a
	FALLBACK -- the refused defs are compiled the old way, every behavioural
	assertion in this class still passes, and ``compiled > 0'' stays true on the
	strength of the fixture's other defs.  That is not a hypothetical here: this
	whole class passed for months while NONE of its eval-bearing defs were on
	the IR path."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'eval_caller_namespace_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'eval_caller_namespace_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/eval_caller_namespace.py')
		name: 'eval_caller_namespace_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
EvalCallerNamespaceTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
EvalCallerNamespaceTestCase >> reprAt: aKey [
	"The fixture's entries are Python values; compare their repr so a failure
	prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
EvalCallerNamespaceTestCase >> setUp [
	probe := self ___loadProbe___: 'eval_caller_namespace'.

]

{ #category : 'Grail-Setup' }
EvalCallerNamespaceTestCase >> tearDown [
	"Undo whatever the census test below forced.  Harmless for every other
	test here, which touches none of it."

	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'eval_caller_namespace_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'eval_caller_namespace_census'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testALocalShadowsAModuleGlobal [
	"Locals are laid OVER globals, not merged beside them."

	self assert: (self reprAt: 'a_local_shadows_a_module_global')
		equals: '''shadowed'''.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testAnEmptyGlobalsDictStillHidesTheCaller [
	"THE GUARD.  An empty dict is a namespace, not a missing one, and a fallback
	that fired on emptiness rather than on absence would let every sandboxed
	eval() read the frame it was called from."

	self assert: (self reprAt: 'empty_globals_still_hides_the_caller')
		equals: '''NameError'''.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testAnUnboundNameStillRaises [
	"Reaching the caller's namespace must not make every name resolvable."

	self assert: (self reprAt: 'an_unbound_name_still_raises')
		equals: '''NameError'''.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testBareEvalIsUnchanged [
	"The one-argument form, which CallAst rewrites at compile time.  It reaches
	_eval: with a namespace already and must never touch the new fallback."

	self assert: (self reprAt: 'bare_eval_is_unchanged') equals: '9'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testBuiltinsStillResolve [
	"Through an explicit empty globals AND through the caller fallback."

	self assert: (self reprAt: 'builtins_still_resolve') equals: '[3, 4]'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testExplicitGlobalsAreStillHonoured [
	"A supplied namespace is used as given, not merged with the caller's."

	self assert: (self reprAt: 'explicit_globals_are_still_honoured')
		equals: '11'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testExplicitLocalsAreStillUsed [
	"globals None, locals given: the given mapping is used and the fallback
	supplies only the globals half."

	self assert: (self reprAt: 'explicit_locals_are_used') equals: '42'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testLiteralNoneIsTreatedAsOmitted [
	"The literal spelling, which failed for the same reason: Python's None is an
	object, so the isNil test called it a supplied namespace."

	self assert: (self reprAt: 'literal_none') equals: '6'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testLocalsAreVisibleFromAMethod [
	"The method's frame IS found -- which is what localises the module-globals
	problem to the module derivation rather than to the frame walk."

	self assert: (self reprAt: 'locals_from_a_method') equals: '5'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testModuleGlobalsAreVisibleFromEveryCallShape [
	"All four shapes, together, because the point is that they AGREE.  The
	method case needed the defining class's __module__; the others are settled
	by the frame's receiver or its filename."

	self assert: (self reprAt: 'module_globals_from_a_top_level_def')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_lambda')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_nested_def')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_method')
		equals: '''module-level'''.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testNamesHoldingNoneAreTreatedAsOmitted [
	"The runtime half: parameters that HOLD None.  No compile-time rewrite can
	see this, which is why the fallback has to live at the call."

	self assert: (self reprAt: 'names_holding_none') equals: '6'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testTheDbcheckShapeWorks [
	"test_decorators' dbcheck verbatim -- the decorator compiles
	``args[1] is not None'' and evals it inside a wrapper whose ``args'' is a
	local, with globals and locals both holding None.  The second half checks
	the expression's answer is USED, not merely computed: a false condition must
	raise."

	self assert: (self reprAt: 'the_dbcheck_shape') equals: '[3, ''ValueError'']'.

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testTheEvalShapesAreNowEligible [
	"The assertion that can actually fail if the cut is reverted.

	MEASURED BOTH WAYS on this fixture, which is what makes the numbers below
	claims rather than hopes.  With the blanket refusal restored it censuses
	4 top-level defs compiled, 0 eligible class methods, and 14 + 2
	`frameSensitive-eval' rows.  With the cut: 11 compiled, 2 eligible, and the
	blanket row gone -- what refuses now refuses under a NAMED reason
	(`-bareRewrite', 1, and `-nested', 6), each of which is its own open cut.

	Holder's two methods are the class-method half and they are the point: both
	are ``eval('...', None, None)'' inside a METHOD, the shape the caller-frame
	walk was measured to get right and the refusal declined anyway.

	On a platform without IR support the forced flag is correctly a no-op and
	the census collects nothing to assert."

	| counts blanket |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	blanket := (counts at: #'CallAst:frameSensitive-eval' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-eval' ifAbsent: [0])
		+ (counts at: #'CallAst:frameSensitive-exec' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-exec' ifAbsent: [0]).
	self assert: blanket = 0
		description: 'eval/exec still refused under the un-split row: '
			, blanket printString , ' of ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 11
		description: 'fewer top-level defs compiled than the cut measured (11): '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 2
		description: 'Holder''s eval-bearing methods are not IR-eligible: '
			, counts printString

]

{ #category : 'Grail-Tests' }
EvalCallerNamespaceTestCase >> testTheInnermostFrameWins [
	"``the caller'' is the immediate caller, not any enclosing one -- the marker
	walk stops at the first generated frame."

	self assert: (self reprAt: 'the_innermost_frame_wins') equals: '''inner'''.

]
