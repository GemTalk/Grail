! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ReservedNameClassCellTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReservedNameClassCellTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReservedNameClassCellTestCase - a captured ``self'' read through the class cell
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReservedNameClassCellTestCase removeAllMethods.
ReservedNameClassCellTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReservedNameClassCellTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'reserved_name_class_cell_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'reserved_name_class_cell_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'reserved_name_class_cell_ir'.
	self ___forgetCanonicalModule___: 'reserved_name_class_cell_census'.
	irModule := nil.
%

category: 'Grail-Private'
method: ReservedNameClassCellTestCase
___keys___
	^ #('new_builds_subclass' 'new_kept_subclass' 'new_saw_captured_self'
	    'renamed_receiver' 'dunder_compare' 'dunder_saw_captured_self'
	    'own_and_captured_receiver' 'capture_is_per_call')
%

category: 'Grail-Private'
method: ReservedNameClassCellTestCase
___disagreeingIn___: results
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		((results @env1:__getitem__: k) = true) ifFalse: [bad add: k]].
	^ bad
%

category: 'Grail-Private'
method: ReservedNameClassCellTestCase
___irResults___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reserved_name_class_cell_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'reserved_name_class_cell_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_name_class_cell.py')
		name: 'reserved_name_class_cell_ir'.
	^ irModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Private'
method: ReservedNameClassCellTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	The census is the only instrument that can see this cut.  ___irStats___
	cannot: an eligibility refusal never reaches the seam, so it is not a
	FALLBACK -- the refused methods are simply compiled the old way, every
	behavioural assertion still passes, and ``compiled > 0'' stays true on the
	strength of the fixture's other methods.  Measured, not reasoned: with the
	refusal restored this fixture censuses 4 `NameAst:reservedIdentifier' and 8
	eligible, and with the cut in place 0 and 12."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reserved_name_class_cell_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'reserved_name_class_cell_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_name_class_cell.py')
		name: 'reserved_name_class_cell_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - captured self through the class cell'
method: ReservedNameClassCellTestCase
testCapturedSelfBehavesUnderIR
	"A method-local class capturing the enclosing method's ``self'', with the
	seam forced on.

	``self'' inside such a class's __new__ is NOT that method's receiver but a
	free variable of the enclosing method, and it reaches the body through the
	class's closure cell.  IR refused every load of a Smalltalk pseudo-variable
	name before it could reach that branch -- wider than the text, which emits
	the ordinary name-agnostic cell read for exactly these reads.

	The fixture self-verifies under CPython, so each expectation is CPython's
	behaviour rather than Grail's opinion of it."

	| bad |
	bad := self ___disagreeingIn___: self ___irResults___.
	self assert: bad isEmpty
		description: 'captured-self shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - captured self through the class cell'
method: ReservedNameClassCellTestCase
testTheRefusedShapeIsNowEligible
	"The assertion that can actually fail if the cut is reverted.

	THE NESTING IN THE FIXTURE IS LOAD-BEARING.  The capture must cross a CLASS
	boundary: the method string-compiles onto the inner class with no lexical
	link to the enclosing method's temps, which is what sends the read through
	the cell.  A plain nested FUNCTION capturing ``self'' reaches the temp
	directly and never refused, so a fixture written that way would pass whether
	or not the cut is present."

	| counts refused |
	counts := self ___censusCountsForFixture___.
	refused := counts at: #'cm:NameAst:reservedIdentifier' ifAbsent: [0].
	self assert: refused = 0
		description: 'captured self still refused as reservedIdentifier: '
			, refused printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 12
		description: 'fewer eligible class methods than the cut measured (12): '
			, counts printString
%

category: 'Grail-Tests - captured self through the class cell'
method: ReservedNameClassCellTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text.  Necessary and NOT sufficient -- see
	___censusCountsForFixture___ for why the census carries this cut."

	| stats |
	self ___irResults___.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString
%
