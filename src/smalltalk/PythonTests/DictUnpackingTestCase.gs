! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictUnpackingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DictUnpackingTestCase'
  instVarNames: #( irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DictUnpackingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DictUnpackingTestCase — ``{**mapping}`` dict-literal unpacking.  The parser
! marks an unpack element with a None key (the mapping in `values`); DictAst
! codegen merges it via `update:`.  Before the fix the nil key was sent
! `printSmalltalkWithParenthesisOn:` and codegen crashed.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DictUnpackingTestCase removeAllMethods.
DictUnpackingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
loadFixture
	"Load tests/python/dict_unpacking.py fresh."

	importlib @env1:modules removeKey: #'dict_unpacking' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_unpacking.py')
		name: 'dict_unpacking'
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testBasicUnpack
	"``{**a}`` copies all of a's items."

	| d |
	d := self loadFixture @env1:basic_unpack.
	self assert: (d @env1:__getitem__: 'x') equals: 1.
	self assert: (d @env1:__getitem__: 'y') equals: 2.
	self assert: d size equals: 2
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testMergeTwo
	"``{**a, **b}`` merges both mappings."

	| d |
	d := self loadFixture @env1:merge_two.
	self assert: (d @env1:__getitem__: 'x') equals: 1.
	self assert: (d @env1:__getitem__: 'y') equals: 2.
	self assert: d size equals: 2
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testUnpackBetweenLiterals
	"``{'before': 0, **a, 'after': 9}`` interleaves literal and
	unpacked entries."

	| d |
	d := self loadFixture @env1:unpack_between_literals.
	self assert: (d @env1:__getitem__: 'before') equals: 0.
	self assert: (d @env1:__getitem__: 'mid') equals: 5.
	self assert: (d @env1:__getitem__: 'after') equals: 9.
	self assert: d size equals: 3
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testLaterKeyOverwrites
	"A literal key after an unpack overwrites the unpacked value
	(CPython left-to-right evaluation)."

	| d |
	d := self loadFixture @env1:later_key_overwrites.
	self assert: (d @env1:__getitem__: 'x') equals: 99.
	self assert: d size equals: 1
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testUnpackEmpty
	"Unpacking an empty mapping is a no-op."

	| d |
	d := self loadFixture @env1:unpack_empty.
	self assert: (d @env1:__getitem__: 'keep') equals: 1.
	self assert: d size equals: 1
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'du_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'du_ir'
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
loadFixtureUnderForcedIR
	"The same file with the IR seam FORCED on, under its own module name."

	(importlib @env1:modules) removeKey: #'du_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'du_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_unpacking.py')
		name: 'du_ir'
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testEveryDisplayAgreesBetweenTheArms
	"THE IR ARM AGAINST THE TEXT ARM, function by function.

	A ``{**m}'' display used to refuse IR eligibility outright -- the nil key
	that marks the unpack was read as ``not emittable'' -- so every def holding
	one compiled as text and the tests above passed on the text path whatever
	the flag said.  Lifting that refusal is invisible to them.

	Compared against the TEXT arm rather than a literal table, so there is no
	second set of expectations to drift from the fixture; the text path is the
	oracle the emit mirrors.

	ORDER IS THE INTERESTING PART.  ``later_key_overwrites'' and
	``unpack_between_literals'' hold the same kinds of element in different
	positions, and the merges must run IN POSITION -- an emit that hoisted them
	ahead of the explicit pairs, or ran them after, still answers the right
	keys and the wrong values."

	| text ir bad names |
	text := self loadFixture.
	ir := self loadFixtureUnderForcedIR.
	names := #('basic_unpack' 'merge_two' 'unpack_between_literals'
		'later_key_overwrites' 'unpack_empty' 'method_display' 'from_mapping'
		'not_a_mapping' 'result_is_a_copy').
	bad := OrderedCollection new.
	names do: [:n | | t i |
		t := ((text @env1:___pyAttrLoad___: n asSymbol)
			@env1:___pyCallValue___: #() kw: nil) @env1:__repr__ @env0:asString.
		i := ((ir @env1:___pyAttrLoad___: n asSymbol)
			@env1:___pyCallValue___: #() kw: nil) @env1:__repr__ @env0:asString.
		t = i ifFalse: [bad add: n , ': IR ' , i , ' vs text ' , t]].
	self assert: bad isEmpty
		description: 'a dict display disagrees between the arms: '
			, bad asArray printString.
	importlib ___irCodegenSupported___ ifTrue: [
		self assert: (importlib ___irStats___ at: #fallbacks) = 0
			description: 'IR fell back to text, so the comparison proves nothing: '
				, (importlib ___irStats___ at: #fallbacks) printString]
%

category: 'Grail-Private'
method: DictUnpackingTestCase
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
	(importlib @env1:modules) removeKey: #'du_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'du_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: (importlib grailDir , '/tests/python/dict_unpacking.py')
		name: 'du_ir'] ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	^ census at: #counts
%

category: 'Grail-Tests-DictUnpacking'
method: DictUnpackingTestCase
testTheRefusalRowIsGone
	"The row this cut closes must not appear in the census of its own fixture.

	Named rows, not a total: a count can stay level while a row MOVES to the
	next refusal one guard down, which has happened repeatedly in this
	migration and reads as ``the cut did nothing''."

	| counts present |
	counts := self ___censusCountsForForcedIRLoad___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	present := #('shape:DictAst' 'cm:shape:DictAst') select: [:row |
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
