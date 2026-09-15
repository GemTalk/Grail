! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ChainedIdentityCompareTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ChainedIdentityCompareTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ChainedIdentityCompareTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ChainedIdentityCompareTestCase
!
! A CHAINED COMPARISON WHOSE OPS INCLUDE ``is'' OR ``in'', THROUGH THE
! DIRECT-TO-IR PATH.
!
! `shape:CompareAst' (5 class methods) was a folder gap, not a shape gap.  The
! UNCHAINED arm has always emitted all four non-rich ops -- is, is not, in, not
! in -- but the chain folder knew only the rich-comparison helper send, and
! ___irOpHelperAt___: answers nil for the other four, so any chain containing one
! refused.  The two stdlib spellings it was keeping out:
!
!     type(numerator) is int is type(denominator)   fractions.Fraction.__new__
!     request[0] == request[-1] in (two quote literals)   pydoc.Helper.interact
!
! WHAT THE CHAIN ACTUALLY ADDS is one temp.  A rich comparison captures its
! middle operand in the shared chain temp as an assignment EXPRESSION and re-reads
! it as the next op's left operand.  ``in'' cannot do that: it reverses its
! operands, so the container is the Smalltalk RECEIVER.  A non-final membership
! test therefore stages its container in a temp of its own, runs the test, and
! copies the container into the shared temp for the next comparison -- discarding
! the copy's value through ___ignore:, so the expression still yields the
! membership result.  setParent: was already allocating that second temp for the
! text path; the IR folder just had no use for it.
!
! THE THREE THINGS A CHAIN MUST GET RIGHT, and only the first is visible in a
! value: the result, the SHORT-CIRCUIT, and each middle operand being evaluated
! EXACTLY ONCE.  The fixture pins the last two with a call counter, because a
! folder that re-evaluates its middle operand answers correctly for every pure
! operand and breaks only on one with a side effect.
! ===============================================================================

doit
ChainedIdentityCompareTestCase removeAllMethods.
ChainedIdentityCompareTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ChainedIdentityCompareTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cic_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'cic_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cic_ir'.
	self ___forgetCanonicalModule___: 'cic_census'.
	irModule := nil
%

category: 'Grail-Private'
method: ChainedIdentityCompareTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/chained_identity_compare.py'
%

category: 'Grail-Private'
method: ChainedIdentityCompareTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('two_is_ops_all_true' 'two_is_ops_first_false' 'two_is_ops_second_false'
	    'rich_then_a_final_in' 'a_non_final_in' 'a_non_final_not_in'
	    'an_is_not_chain' 'two_in_ops' 'the_chain_short_circuits'
	    'a_middle_operand_is_evaluated_once'
	    'a_non_final_in_evaluates_its_container_once'
	    'a_mixed_three_op_chain')
%

category: 'Grail-Private'
method: ChainedIdentityCompareTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cic_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cic_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cic_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ChainedIdentityCompareTestCase
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

category: 'Grail-Tests - chained is/in'
method: ChainedIdentityCompareTestCase
testEveryChainedIdentityShapeAgreesWithCPythonUnderIR
	"All twelve shapes with the seam forced on.

	``a_non_final_in_evaluates_its_container_once'' is the one the second temp
	exists for: the container is the receiver, so a folder that re-emitted the
	comparator for the next link would call the probe twice and still answer
	True."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'chained is/in shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - chained is/in'
method: ChainedIdentityCompareTestCase
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
	self assert: (stats at: #compiled) >= 8
		description: 'fewer defs compiled than the cut measured (8, against 2 with '
			, 'the refusal): compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: ChainedIdentityCompareTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cic_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cic_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'cic_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - chained is/in'
method: ChainedIdentityCompareTestCase
testAChainWithIsOrInIsNowEligible
	"The assertion that fails if the cut is reverted.

	MEASURED BOTH WAYS on this fixture.  With the folder's refusal in place it
	censuses 6 `shape:CompareAst' against 2 compiled, and the behavioural test
	above STILL PASSES -- the text twin answers all twelve correctly.  With the
	cut, 8 compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'shape:CompareAst' ifAbsent: [0]) = 0
		description: 'a chain with is/in still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 8
		description: 'fewer defs compiled than the cut measured (8): '
			, counts printString
%
