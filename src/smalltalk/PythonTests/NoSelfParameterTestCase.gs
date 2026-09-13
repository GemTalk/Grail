! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NoSelfParameterTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NoSelfParameterTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NoSelfParameterTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NoSelfParameterTestCase
!
! A CLASS-BODY DEF THAT DECLARES NO PARAMETER AT ALL, THROUGH THE DIRECT-TO-IR
! PATH.
!
! ``def m(*args)'' in a class body has no name for the receiver, but CPython
! still passes it -- as args[0].  That is how the corpus spells a hook wanting
! the raw argument tuple: test_compare writes ``def __eq__(*args)'',
! test_genericclass writes ``def __class_getitem__(*args, **kwargs)'' and then
! asserts that args[0] IS the class.  15 class methods of the suite corpus are
! this shape, and ``method:noSelf'' refused every one of them.
!
! WHY IT NEEDED AN EMIT AND NOT JUST A WIDER GUARD.  The generator strips a
! method's FIRST DECLARED parameter and carries it as the Smalltalk receiver.
! With nothing declared there is nothing to strip, so the receiver has to be put
! back at the front of the *args tuple rather than dropped.  The text path has a
! documented branch for exactly that --
!
!     args := tuple withAll: { (Array with: self) , (positional copyFrom: 1 ...) }
!
! -- and ___emitIRVarargBindingOn___:pos:names:receiverFirst: had only the other
! one.  Emitting
! the wrong branch here does not fail: it answers a tuple one element short with
! every later element shifted, which is a silently wrong VALUE.  ``args[0]'' is
! therefore the check that matters, and the fixture leads with it.
!
! TWO EXITS REMAIN, and the flag-on suite found the second one.
!
!   * ``method:noSelfNamesReceiver'' -- the body NAMES the receiver.  With no
!     parameter of its own such a name is the ENCLOSING method's ``self''
!     captured by a method-local class, and Grail compiles a captured receiver
!     to bare Smalltalk ``self'' -- the inner instance, not the enclosing one.
!     That divergence is on the text path already.
!   * ``method:noSelfSuper'' -- the body calls ``super()''.  CPython's check is
!     on co_argcount, so with nothing declared there is no argument 0 to take
!     the receiver from and the answer is ``RuntimeError: super(): no
!     arguments''.  The IR super shapes (cut 55) emit the method's own receiver
!     and would answer a WORKING super instead.  The first draft of this cut
!     admitted it; SuperPreconditionErrorsTestCase >>
!     testAZeroParameterMethodIsCallableThroughItsClass turned red and named it.
!
! WHY THE CENSUS ASSERTION BELOW IS NOT REDUNDANT.  Measured both ways on this
! fixture: with the refusal restored the behavioural comparison STILL PASSES --
! the text twin gives the same answers -- and only the census moves (8
! ``cm:method:noSelf'' against 8 ``cm:eligible'').  An eligibility refusal never
! reaches the seam, so it is not a fallback either.  A behavioural test alone
! could not see this cut being reverted.
! ===============================================================================

doit
NoSelfParameterTestCase removeAllMethods.
NoSelfParameterTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NoSelfParameterTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'no_self_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'no_self_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'no_self_ir'.
	self ___forgetCanonicalModule___: 'no_self_census'.
	irModule := nil
%

category: 'Grail-Private'
method: NoSelfParameterTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('receiver_is_args_zero' 'no_arguments_still_passes_receiver'
	    'one_argument_follows_the_receiver' 'several_arguments_keep_their_order'
	    'kwargs_bind_separately' 'kwargs_alone_still_carry_the_receiver'
	    'classmethod_receiver_is_the_class'
	    'classmethod_receiver_precedes_the_arguments'
	    'dunder_eq_with_no_parameters' 'class_getitem_sees_the_class_first'
	    'method_local_class_keeps_the_receiver'
	    'super_with_no_declared_parameter_raises'
	    'subclass_receiver_is_the_subclass_instance')
%

category: 'Grail-Private'
method: NoSelfParameterTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'no_self_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'no_self_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_self_parameter.py')
		name: 'no_self_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NoSelfParameterTestCase
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

category: 'Grail-Tests - no declared parameter'
method: NoSelfParameterTestCase
testEveryNoSelfShapeAgreesWithCPythonUnderIR
	"All twelve shapes with the seam forced on.

	``receiver_is_args_zero'' and the three argument-order checks are the ones a
	dropped receiver fails: the tuple comes back one element short with
	everything shifted.  The rest pin the pieces around that -- **kwargs binding
	independently, a @classmethod getting the CLASS as args[0], a method-local
	class and a subclass each binding their own receiver."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'no-parameter shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - no declared parameter'
method: NoSelfParameterTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text.

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
method: NoSelfParameterTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'no_self_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'no_self_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_self_parameter.py')
		name: 'no_self_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - no declared parameter'
method: NoSelfParameterTestCase
testNoSelfIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	8 `cm:method:noSelf' and 0 `cm:eligible', and the behavioural test above
	STILL PASSES because the text twin answers identically.  With the cut, 8
	`cm:eligible' and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:method:noSelf' ifAbsent: [0]) = 0
		description: 'a no-parameter def still refuses: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 8
		description: 'fewer class methods eligible than the cut measured (8): '
			, counts printString
%
