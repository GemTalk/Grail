! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SelfReboundInMethodTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SelfReboundInMethodTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SelfReboundInMethodTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelfReboundInMethodTestCase
!
! A METHOD THAT REBINDS ITS OWN RECEIVER, THROUGH THE DIRECT-TO-IR PATH.
!
! ``cm:method:selfRebound'' (11).  CPython treats the self/cls parameter as an
! ordinary rebindable local, and two idioms depend on it: ``self = None'' to
! break a reference cycle, and ``self = object.__new__(cls)'' in __new__.
! Grail compiles the receiver to Smalltalk ``self'', which cannot be assigned,
! so such a method carries it in a TEMP instead.
!
! THE ROW LOOKED LIKE THE EXPENSIVE ONE AND WAS NOT.  It was parked twice as
! "degrades every receiver fast path across several node classes" -- true, but
! they all reach that decision through ONE predicate: ___irIsSelfReceiver___ ->
! CallAst>>isSelfReference:, which already answers false when
! selfParameterRebound is set.  Setting that flag for the build stands every
! fast path down at once, so the cut is the flag plus a transport temp, which is
! exactly what generateMethodSourceOn: emits.
!
! WHAT THE BEHAVIOURAL TEST COULD NOT SEE.  The first version passed all of
! these checks with correct answers and still had a gap: ___irLocalNameSet___
! excluded the receiver, so ``self = None'' refused one step later as an
! ordinary bad assignment target.  The census said so and the fixture could not
! -- the row did not close, it MOVED (method:selfRebound 11 -> 0 while
! AssignAst:target-NameAst went 0 -> 6 and target-TupleAst 2 -> 7, eligible
! unchanged).  A row that relocates rather than vanishing is only visible in the
! row-by-row diff; the totals alone read as a plausible "+0 net, all uncovered".
!
! ``del self'' IS STILL REFUSED (``method:selfDeleted''), and deliberately: it
! does not compile on the TEXT path either -- measured, ``Grail could not
! compile this method (codegen gap)'' -- so admitting it here would put the IR
! path ahead of its own oracle and leave the flag-off build failing on source
! the flag-on build accepts.  The fixture documents it instead of asserting it.
! ===============================================================================

doit
SelfReboundInMethodTestCase removeAllMethods.
SelfReboundInMethodTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SelfReboundInMethodTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'self_rebound_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'self_rebound_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'self_rebound_ir'.
	self ___forgetCanonicalModule___: 'self_rebound_census'.
	irModule := nil
%

category: 'Grail-Private'
method: SelfReboundInMethodTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/self_rebound_in_method.py'
%

category: 'Grail-Private'
method: SelfReboundInMethodTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('reads_before_and_after_the_rebinding'
	    'an_instvar_read_before_the_rebinding'
	    'an_instvar_store_before_the_rebinding' 'the_dunder_new_idiom'
	    'a_self_send_before_the_rebinding' 'rebound_to_another_instance'
	    'rebound_on_one_branch_only' 'a_receiver_not_spelled_self'
	    'a_loop_over_an_instvar_then_rebind')
%

category: 'Grail-Private'
method: SelfReboundInMethodTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'self_rebound_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'self_rebound_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'self_rebound_ir'.
	^ irModule
%

category: 'Grail-Private'
method: SelfReboundInMethodTestCase
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

category: 'Grail-Tests - rebound receiver'
method: SelfReboundInMethodTestCase
testEveryReboundShapeAgreesWithCPythonUnderIR
	"All nine shapes with the seam forced on.

	The pairs are the point: each check reads something through the receiver
	BEFORE the rebinding and then observes the rebound value AFTER it.  A
	transport that left a receiver fast path alive answers the INSTANCE after
	the rebinding -- a wrong VALUE, not an error, and one that looks right in
	every test that never rebinds.  ``a_receiver_not_spelled_self'' covers the
	other transport spelling: a parameter named ``__self'' is declared under its
	OWN name, where ``self'' must travel as ``_self''."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'rebound-receiver shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - rebound receiver'
method: SelfReboundInMethodTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the seam fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%

category: 'Grail-Private'
method: SelfReboundInMethodTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'self_rebound_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'self_rebound_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'self_rebound_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - rebound receiver'
method: SelfReboundInMethodTestCase
testAReboundReceiverIsNowEligible
	"The assertion that fails if the cut is reverted -- and the one that caught
	the gap the behavioural test could not.

	It asserts BOTH that the row is gone AND that the count landed in
	`cm:eligible', because the first version of this cut moved the refusal to
	`AssignAst:target-NameAst' instead of closing it: the receiver was carried
	in a temp but was still missing from ___irLocalNameSet___, so the store to
	it refused one step later.  Checking only that `method:selfRebound' reads 0
	would have passed on that version."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:method:selfRebound' ifAbsent: [0]) = 0
		description: 'a rebound receiver still refuses: ' , counts printString.
	self assert: (counts at: #'cm:AssignAst:target-NameAst' ifAbsent: [0]) = 0
		description: 'the refusal MOVED rather than closing -- the receiver is '
			, 'carried but not a local: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 16
		description: 'fewer class methods eligible than the cut measured (16): '
			, counts printString
%
