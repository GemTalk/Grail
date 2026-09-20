! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AugAssignSliceTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AugAssignSliceTargetTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AugAssignSliceTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AugAssignSliceTargetTestCase
!
! ``x[1:2] *= 2'' -- AN AUGMENTED ASSIGNMENT WHOSE TARGET IS A SLICE, ON THE IR
! PATH.
!
! `cm:AugAssignAst:target-SubscriptAst-slice' (1, test_augassign's
! testSequences).  The subscript arm of the IR emit handled a plain index and
! stood down for a slice, on the reasoning that "the text's SliceAst spelling is
! SubscriptAst's own".
!
! THAT REASONING IS TRUE OF A LOAD AND FALSE OF THIS STATEMENT, which is the
! whole of the cut.  ``xs[i:j]'' as a VALUE compiles to the env-0 sequence fast
! path -- ``slice @env0:___newStart: lo stop: hi step: st'', nil for an omitted
! bound -- and that spelling is SubscriptAst's, never SliceAst's.  But
! printSmalltalkSubscriptAugAssignOn: never prints the TARGET: the target's ctx
! is Store, and printing it would emit a load.  It prints ``target slice''
! directly, which is SliceAst's OWN ``slice @env1:__new__: lo _: hi _: st'' with
! None for an omitted bound -- exactly what SliceAst>>___emitIRValueOn___:
! already answers, and what the #subscript arm already asks for on both halves.
!
! So the emit needed no new line; the refusal was the only thing in the way.
! That is also why this class exists rather than a count: a cut that only
! DELETES a stand-down is indistinguishable from a no-op unless something
! exercises the shape it re-admits.
!
! WHAT THE SHAPES PIN, beyond "it compiles":
!
!   * the slice object carries start / stop / step into BOTH dunders --
!     ``custom_slice'' records what a Python-level __getitem__ and __setitem__
!     are handed, so a mis-built slice cannot pass by accident;
!   * an omitted bound arrives as None, not nil and not 0;
!   * the operation is IN PLACE, so an alias observes it (``x is y'');
!   * the extended-slice arm RAISES, with the message as part of the contract;
!   * it is not list-specific (a bytearray shape).
!
! Drives tests/python/augassign_slice_target.py, whose EXPECTED table was
! produced by RUNNING CPython 3.14.6.
! ===============================================================================

doit
AugAssignSliceTargetTestCase removeAllMethods.
AugAssignSliceTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AugAssignSliceTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ast_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ast_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: AugAssignSliceTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/augassign_slice_target.py'
%

category: 'Grail-Private'
method: AugAssignSliceTargetTestCase
___irModule___
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
%

category: 'Grail-Private'
method: AugAssignSliceTargetTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: AugAssignSliceTargetTestCase
___expectedReprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests - augmented assignment to a slice'
method: AugAssignSliceTargetTestCase
testEverySliceShapeAgreesWithCPythonUnderIR
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
%

category: 'Grail-Tests - augmented assignment to a slice'
method: AugAssignSliceTargetTestCase
testTheSliceObjectReachesBothDunders
	"The shape a value check cannot see.  A list would still come out right if
	the emit passed a plain integer, a wrongly-built slice or a slice with nil
	where None belongs, because list handles several of those; a Python-level
	__getitem__ / __setitem__ records exactly what it was handed.  BOTH halves
	are recorded, because the read and the write build the slice separately."

	| got |
	got := self ___reprOf___: 'custom_slice'.
	self assert: got = (self ___expectedReprOf___: 'custom_slice')
		description: 'the slice reaching the dunders is not CPython''s: ' , got
%

category: 'Grail-Tests - augmented assignment to a slice'
method: AugAssignSliceTargetTestCase
testTheExtendedSliceStillRaises
	"``x[::2] *= 2'' is an ERROR in CPython, not a value: an extended slice
	cannot take a sequence of a different length.  An emit that quietly did
	something sensible here would pass every other check in this class."

	| got |
	got := self ___reprOf___: 'step_slice'.
	self assert: got = (self ___expectedReprOf___: 'step_slice')
		description: 'the extended-slice arm stopped raising ValueError: ' , got
%

category: 'Grail-Tests - augmented assignment to a slice'
method: AugAssignSliceTargetTestCase
testTheOperationIsInPlace
	"``y[1:2] += [7]'' mutates the object both names hold; an emit that built a
	new list and stored it would leave the alias behind and still answer the
	right value through the name that was assigned.  The fixture answers the
	ALIAS and the identity together, which is what test_augassign asserts."

	| got |
	got := self ___reprOf___: 'add_slice'.
	self assert: got = (self ___expectedReprOf___: 'add_slice')
		description: 'the slice augmented assignment was not in place: ' , got
%

category: 'Grail-Private'
method: AugAssignSliceTargetTestCase
___censusCountsForForcedIRLoad___
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
%

category: 'Grail-Tests - augmented assignment to a slice'
method: AugAssignSliceTargetTestCase
testTheRefusalRowIsGone
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
%
