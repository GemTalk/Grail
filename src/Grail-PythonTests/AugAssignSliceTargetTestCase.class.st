Class {
	#name : 'AugAssignSliceTargetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AugAssignSliceTargetTestCase >> ___censusCountsForForcedIRLoad___ [
	"Load the fixture with the seam FORCED on AND the eligibility census
	collecting, and answer its #counts.

	THE CENSUS IS THE ONLY INSTRUMENT THAT SEES THIS CUT.  What it changes is
	an ELIGIBILITY test: with the refusal in place the def simply compiles as
	TEXT and answers exactly the same values, so every behavioural check here
	passes against the unfixed tree.  ``fallbacks = 0'' does not see it either
	-- an ineligible def never reaches the seam, so it is not a fallback -- and
	``compiled > 0'' is true of the other defs in the file whatever this one
	does.  Measured: with the stand-down restored, this class was 5 run, 5
	passed."

	| census |
	(importlib @env1:modules) removeKey: #'ast_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ast_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: (importlib grailDir , '/tests/python/augassign_slice_target.py')
		name: 'ast_ir'] ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	^ census at: #counts

]

{ #category : 'Grail-Private' }
AugAssignSliceTargetTestCase >> ___expectedReprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
AugAssignSliceTargetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/augassign_slice_target.py'

]

{ #category : 'Grail-Private' }
AugAssignSliceTargetTestCase >> ___irModule___ [
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ast_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ast_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ast_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
AugAssignSliceTargetTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
AugAssignSliceTargetTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ast_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ast_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - augmented assignment to a slice' }
AugAssignSliceTargetTestCase >> testEverySliceShapeAgreesWithCPythonUnderIR [
	"EVERY key at once, reported as the list of disagreeing keys: the failure
	that matters is WHICH shape broke, and a bare count names none of them."

	| r exp bad keys |
	r := self ___irModule___ @env1:___pyAttrLoad___: #r.
	exp := self ___irModule___ @env1:___pyAttrLoad___: #EXPECTED.
	keys := (exp @env1:keys) asArray.
	bad := OrderedCollection new.
	keys do: [:k | | got want |
		got := (r @env1:__getitem__: k) asString.
		want := (exp @env1:__getitem__: k) asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a slice augmented assignment disagrees with CPython '
			, 'under IR: ' , bad asArray printString

]

{ #category : 'Grail-Tests - augmented assignment to a slice' }
AugAssignSliceTargetTestCase >> testTheExtendedSliceStillRaises [
	"``x[::2] *= 2'' is an ERROR in CPython, not a value: an extended slice
	cannot take a sequence of a different length.  An emit that quietly did
	something sensible here would pass every other check in this class."

	| got |
	got := self ___reprOf___: 'step_slice'.
	self assert: got = (self ___expectedReprOf___: 'step_slice')
		description: 'the extended-slice arm stopped raising ValueError: ' , got

]

{ #category : 'Grail-Tests - augmented assignment to a slice' }
AugAssignSliceTargetTestCase >> testTheOperationIsInPlace [
	"``y[1:2] += [7]'' mutates the object both names hold; an emit that built a
	new list and stored it would leave the alias behind and still answer the
	right value through the name that was assigned.  The fixture answers the
	ALIAS and the identity together, which is what test_augassign asserts."

	| got |
	got := self ___reprOf___: 'add_slice'.
	self assert: got = (self ___expectedReprOf___: 'add_slice')
		description: 'the slice augmented assignment was not in place: ' , got

]

{ #category : 'Grail-Tests - augmented assignment to a slice' }
AugAssignSliceTargetTestCase >> testTheRefusalRowIsGone [
	"The row this cut closes must not appear in the census of its own fixture.

	Named rows, not a total: a count can stay level while a row MOVES to the
	next refusal one guard down, which has happened repeatedly in this
	migration and reads as ``the cut did nothing''."

	| counts present |
	counts := self ___censusCountsForForcedIRLoad___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	present := #('AugAssignAst:target-SubscriptAst-slice' 'cm:AugAssignAst:target-SubscriptAst-slice') select: [:row |
		(counts at: row asSymbol otherwise: 0) > 0].
	self assert: present isEmpty
		description: 'the refusal this cut lifts is still in the census: '
			, (present collect: [:r | r , '=' ,
				(counts at: r asSymbol otherwise: 0) printString]) asArray printString.
	"...and the fixture's defs really did compile, so the absence above is not
	the absence of a MEASUREMENT."
	self assert: ((counts at: #compiled otherwise: 0)
			+ (counts at: #'cm:eligible' otherwise: 0)) > 0
		description: 'the census recorded nothing at all for this fixture'

]

{ #category : 'Grail-Tests - augmented assignment to a slice' }
AugAssignSliceTargetTestCase >> testTheSliceObjectReachesBothDunders [
	"The shape a value check cannot see.  A list would still come out right if
	the emit passed a plain integer, a wrongly-built slice or a slice with nil
	where None belongs, because list handles several of those; a Python-level
	__getitem__ / __setitem__ records exactly what it was handed.  BOTH halves
	are recorded, because the read and the write build the slice separately."

	| got |
	got := self ___reprOf___: 'custom_slice'.
	self assert: got = (self ___expectedReprOf___: 'custom_slice')
		description: 'the slice reaching the dunders is not CPython''s: ' , got

]
