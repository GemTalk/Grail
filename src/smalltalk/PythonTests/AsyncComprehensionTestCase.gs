! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncComprehensionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AsyncComprehensionTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AsyncComprehensionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AsyncComprehensionTestCase
!
! PEP 530 ``async for'' CLAUSES IN A COMPREHENSION, THROUGH THE DIRECT-TO-IR PATH.
!
! ``Comprehension:async'' (11 class methods) refused a comprehension with any
! async clause.  The shape turned out to be three substitutions rather than new
! machinery -- ForAst and AsyncForAst already carry exactly this split for the
! STATEMENT form (___emitIRIteratorFrom___:on:, ___emitIRNextFrom___:on:,
! ___irExhaustedExceptionSymbol___), and the clause emit now has the same three
! hooks:
!
!   * the iterator is ``PythonCoroutine ___grailAiter___: (src)'' rather than
!     ``(src) __iter__'' -- through the helper so a missing __aiter__ is a
!     catchable Python TypeError, not an uncatchable doesNotUnderstand;
!   * each step is ``___gen___ ___grailAwaitAnext___: (___iterN___ __anext__)'',
!     awaited through the ENCLOSING coroutine so a suspension inside __anext__
!     suspends the whole comprehension and reaches the driver;
!   * exhaustion is StopAsyncIteration, which is NOT a StopIteration subclass --
!     it descends from Exception -- so the sync handler would never catch it.
!
! KEYED OFF THE CLAUSE, NOT THE COMPREHENSION.  One comprehension may mix
! ``for'' and ``async for'' in either order, which is why the hooks take the
! generator clause rather than reading a whole-comprehension flag; the fixture
! pins both orders and two async clauses together.
!
! WHAT THE CUT DID NOT CLOSE, and the census says so rather than the comment:
! retiring this row uncovered ``GeneratorExpAst:async'' (4 -> 10).  An async
! GENERATOR EXPRESSION is a fourth wrapper shape -- PythonAsyncGenerator over
! ___asyncYield___:, with the outermost iterable bound into a wrapper-block
! parameter at CONSTRUCTION time so nested genexps do not share a loop temp --
! and none of these three hooks reaches it.
! ===============================================================================

doit
AsyncComprehensionTestCase removeAllMethods.
AsyncComprehensionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncComprehensionTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'async_comp_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'async_comp_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'async_comp_ir'.
	self ___forgetCanonicalModule___: 'async_comp_census'.
	irModule := nil
%

category: 'Grail-Private'
method: AsyncComprehensionTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/async_comprehension.py'
%

category: 'Grail-Private'
method: AsyncComprehensionTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('every_kind' 'with_a_filter' 'async_then_sync' 'sync_then_async'
	    'two_async_clauses' 'a_handwritten_iterator' 'the_element_may_await'
	    'a_missing_aiter_is_a_typeerror' 'a_suspension_really_suspends'
	    'an_empty_source_gives_an_empty_result')
%

category: 'Grail-Private'
method: AsyncComprehensionTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'async_comp_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'async_comp_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'async_comp_ir'.
	^ irModule
%

category: 'Grail-Private'
method: AsyncComprehensionTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - async comprehension'
method: AsyncComprehensionTestCase
testEveryAsyncComprehensionShapeAgreesWithCPythonUnderIR
	"All ten shapes with the seam forced on.

	``sync_then_async'' and ``async_then_sync'' are the pair a
	per-COMPREHENSION decision would get wrong: the choice is per CLAUSE.
	``a_suspension_really_suspends'' is the one a synchronous stand-in could
	pass while being wrong -- the source yields control between items and the
	interleaving count proves the await actually happened."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'async comprehension shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - async comprehension'
method: AsyncComprehensionTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do.

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
%

category: 'Grail-Private'
method: AsyncComprehensionTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_comp_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'async_comp_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'async_comp_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - async comprehension'
method: AsyncComprehensionTestCase
testAsyncComprehensionIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	10 `Comprehension:async' and compiles 2 of the 12, and the behavioural test
	above STILL PASSES -- the text twin answers all ten correctly.  With the
	cut, 12 compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'Comprehension:async' ifAbsent: [0]) = 0
		description: 'an async comprehension still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 12
		description: 'fewer defs compiled than the cut measured (12): '
			, counts printString
%
