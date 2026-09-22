! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetDisplayUnpackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SetDisplayUnpackTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SetDisplayUnpackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SetDisplayUnpackTestCase
!
! ``{*a, 1}'' -- A STARRED UNPACK INSIDE A SET DISPLAY, ON BOTH PATHS.
!
! `cm:shape:SetAst' (1, test_collections' test_Set_hash_matches_frozenset).
!
! THE ONLY ONE OF THE TWENTY CLASS-METHOD REFUSALS THAT WAS NOT A REFUSAL TO
! LIFT.  Every other row named a shape the text already emitted and the IR
! declined; this one named a shape NEITHER path had.  The element was printed as
! itself, and StarredAst's own emit is a ``*-unpack in call sites is not yet
! supported'' TypeError signal, so the display raised at RUN time -- which is
! why the upstream test is skipped with a Grail note rather than failing.
!
! The emit is the direct analogue of the ``{**m}'' merge a dict display already
! had: ``___s update: (e)'' beside ``___s add: (e)'', because set>>update: is
! documented as "adding elements from any iterable" and that is exactly what the
! star means.  Both paths emit it, and the IR eligibility judges a starred
! element by its VALUE -- the thing that gets iterated -- since the star itself
! carries nothing.
!
! POSITION IS THE PART A SET CANNOT BETRAY BY ITSELF.  A set has no order, so an
! emit that hoisted the merges ahead of the plain elements would answer the
! right MEMBERS and evaluate the parts in the wrong order; the fixture puts a
! star at either end and uses two of them, and a generator element makes the
! evaluation observable.
!
! Drives tests/python/set_display_unpack.py, whose EXPECTED table was produced
! by RUNNING CPython 3.14.6.
! ===============================================================================

doit
SetDisplayUnpackTestCase removeAllMethods.
SetDisplayUnpackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SetDisplayUnpackTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'sdu_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'sdu_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'sdu_ir'.
	self ___forgetCanonicalModule___: 'sdu_text'.
	irModule := nil
%

category: 'Grail-Private'
method: SetDisplayUnpackTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/set_display_unpack.py'
%

category: 'Grail-Private'
method: SetDisplayUnpackTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'sdu_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_ir'.
	^ irModule
%

category: 'Grail-Private'
method: SetDisplayUnpackTestCase
___textModule___
	"The same fixture with the seam forced OFF -- this cut changes BOTH paths,
	so the text arm needs exercising in its own right and not only as the thing
	the IR arm is compared against."

	(importlib @env1:modules) removeKey: #'sdu_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	^ [importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_text']
		ensure: [importlib ___irCodegenForce___: true]
%

category: 'Grail-Private'
method: SetDisplayUnpackTestCase
___disagreementsIn___: aModule
	| r exp bad |
	r := aModule @env1:___pyAttrLoad___: #r.
	exp := aModule @env1:___pyAttrLoad___: #EXPECTED.
	bad := OrderedCollection new.
	(exp @env1:keys) asArray do: [:k | | got want |
		got := (r @env1:__getitem__: k) asString.
		want := (exp @env1:__getitem__: k) asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	^ bad asArray
%

category: 'Grail-Tests - set display unpacking'
method: SetDisplayUnpackTestCase
testTheTextArmAgreesWithCPython
	"THE TEXT ARM IS NOT A CONTROL HERE, it is half the cut.  Every other row
	in this migration named a shape the text already emitted; this one named a
	shape NEITHER path had, so the text emit is new code and is tested as such."

	self assert: (self ___disagreementsIn___: self ___textModule___) isEmpty
		description: 'the TEXT arm disagrees with CPython: '
			, (self ___disagreementsIn___: self ___textModule___) printString
%

category: 'Grail-Tests - set display unpacking'
method: SetDisplayUnpackTestCase
testTheIRArmAgreesWithCPython
	self assert: (self ___disagreementsIn___: self ___irModule___) isEmpty
		description: 'the IR arm disagrees with CPython: '
			, (self ___disagreementsIn___: self ___irModule___) printString
%

category: 'Grail-Tests - set display unpacking'
method: SetDisplayUnpackTestCase
testANonIterableStarRaisesTypeError
	"``{*5}'' is an ERROR, not a value, and the message is part of the
	contract: set>>update: is forgiving of several things the star is not, so
	an emit that reached it with the wrong argument could quietly succeed."

	| r |
	r := self ___irModule___ @env1:___pyAttrLoad___: #r.
	self assert: ((r @env1:__getitem__: 'star_a_non_iterable') asString)
		equals: ((self ___irModule___ @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: 'star_a_non_iterable') asString
%

category: 'Grail-Tests - set display unpacking'
method: SetDisplayUnpackTestCase
testTheRefusalRowIsGone
	"The row this cut closes must not appear in the census of its own fixture.

	Named rows, not a total: a count can stay level while a row MOVES to the
	next refusal one guard down."

	| census counts |
	(importlib @env1:modules) removeKey: #'sdu_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'sdu_census']
		ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	counts := census at: #counts.
	(importlib @env1:modules) removeKey: #'sdu_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'sdu_census'.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self assert: (counts at: #'shape:SetAst' otherwise: 0) = 0
		description: 'a set display still refuses as shape:SetAst: '
			, counts printString.
	self assert: (counts at: #'cm:shape:SetAst' otherwise: 0) = 0
		description: 'a class method still refuses as cm:shape:SetAst: '
			, counts printString
%
