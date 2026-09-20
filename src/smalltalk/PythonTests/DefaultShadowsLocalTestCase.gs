! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DefaultShadowsLocalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DefaultShadowsLocalTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DefaultShadowsLocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DefaultShadowsLocalTestCase
!
! A PARAMETER DEFAULT THAT NAMES ONE OF THE DEF'S OWN LOCALS, THROUGH THE
! DIRECT-TO-IR PATH.
!
! `signature:defaultReadsLocal' (5 defs) refused any default whose expression
! reads a name the def also binds.  The idiom behind four of the five is one
! line of `codecs', written four times:
!
!     def __getattr__(self, name, getattr=getattr):
!         return getattr(self.stream, name)
!
! A default is evaluated ONCE, at def time, in the scope ENCLOSING the def, so
! that `getattr' is the builtin and never the parameter it is about to fill.
! The text path already emits exactly that -- it generates the default
! expression with MODULE name resolution, so the class form becomes
! `___grailClassDefaultPut___: ... compute: [builtins ___globalAt___: #getattr]'
! and the module form `___moduleDefaultAt:compute: [self ___moduleAttrLoad___:
! #LIMIT]'.  The IR emit was resolving the same name through the METHOD's local
! table instead, which is why the shape had to be refused rather than emitted.
!
! THE CUT IS ONE SCOPE, NOT A NEW EMIT: PyMethodIRBuilder>>withoutLocalsDo:
! empties the local table around each of the three default-expression emits, so
! every name in a default falls to the module / builtins path the text uses.
!
! THE REFUSAL DID NOT GO AWAY -- IT NARROWED, and the two halves it keeps are
! the ones where the text does something else.  The RECEIVER stays refused (the
! text emits a receiver read for it).  An ENCLOSING FUNCTION stays refused:
! there the def-time scope is that function's locals, so a module-global read
! would be a different program.  Nothing in the corpus is in that position, so
! the narrowing is measured rather than hopeful.
!
! ONE SHAPE IS AN XFAIL AND IT IS NOT THIS CUT'S.  A module-level default is
! evaluated LAZILY, on the first call that needs it, so rebinding the global
! between the def and the call changes the answer.  Measured identically on both
! paths -- the IR emit reproduces the text's memo send for send -- and pinned
! below so the cut that fixes it has a tripwire.
! ===============================================================================

doit
DefaultShadowsLocalTestCase removeAllMethods.
DefaultShadowsLocalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DefaultShadowsLocalTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'dsl_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'dsl_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'dsl_ir'.
	self ___forgetCanonicalModule___: 'dsl_census'.
	irModule := nil
%

category: 'Grail-Private'
method: DefaultShadowsLocalTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/default_shadows_local.py'
%

category: 'Grail-Private'
method: DefaultShadowsLocalTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison.

	``rebinding_the_global_afterwards'' is deliberately absent -- it is the
	fixture's XFAIL, pinned by its own test below."

	^ #('the_codecs_getattr_idiom' 'a_module_def_shadowing_a_global'
	    'a_default_naming_a_body_local' 'a_keyword_only_default_shadowing'
	    'a_staticmethod_with_a_shadowing_default'
	    'a_classmethod_with_a_shadowing_default'
	    'two_shadowed_defaults_in_one_signature'
	    'a_call_expression_in_the_default'
	    'a_method_default_sees_the_module_not_the_class')
%

category: 'Grail-Private'
method: DefaultShadowsLocalTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'dsl_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dsl_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'dsl_ir'.
	^ irModule
%

category: 'Grail-Private'
method: DefaultShadowsLocalTestCase
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

category: 'Grail-Tests - shadowing defaults'
method: DefaultShadowsLocalTestCase
testEveryShadowingDefaultShapeAgreesWithCPythonUnderIR
	"Nine shapes with the seam forced on.

	``the_codecs_getattr_idiom'' is the one that cannot pass by accident: if the
	default resolved to the method temp it is about to fill, that temp is still
	nil, and the call raises ``TypeError: 'UndefinedObject' object is not
	callable'' -- measured, by building this fixture with the emit's local
	suppression removed and the refusal left narrow."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'shadowing-default shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - shadowing defaults'
method: DefaultShadowsLocalTestCase
testAModuleDefaultIsStillComputedLazily
	"The fixture's XFAIL, pinned rather than hidden: Grail computes a
	module-level default on the FIRST CALL that needs it, not at def time, so
	rebinding the global in between changes the answer -- CPython answers
	('first', 'second') and Grail ('second', 'second').

	Both paths do it, because the IR emit reproduces the text's
	``___moduleDefaultAt:compute:'' send for send; it is the deferred half of
	the ``defaults are recreated per call'' family.  When that is fixed this
	test fails, which is the point of it."

	| mod got |
	mod := self ___irModule___.
	got := ((mod @env1:___pyAttrLoad___: #'r')
		@env1:__getitem__: 'rebinding_the_global_afterwards')
			@env1:__repr__ @env0:asString.
	self assert: got = '(''second'', ''second'')'
		description: 'the lazy module-default divergence moved (CPython says '
			, '(''first'', ''second'')): ' , got
%

category: 'Grail-Tests - shadowing defaults'
method: DefaultShadowsLocalTestCase
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
	self assert: (stats at: #compiled) >= 11
		description: 'fewer methods compiled than the cut measured (11, against 3 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: DefaultShadowsLocalTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dsl_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dsl_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'dsl_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - shadowing defaults'
method: DefaultShadowsLocalTestCase
testAShadowingDefaultIsNowEligible
	"The assertion that fails if the eligibility half is reverted.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	4 `signature:defaultReadsLocal' and 4 `cm:signature:defaultReadsLocal'
	against 1 eligible class method, and compiles 2 defs; with the cut, 5
	eligible and 6 compiled, with no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'signature:defaultReadsLocal' ifAbsent: [0]) = 0
		description: 'a module def with a shadowing default still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:signature:defaultReadsLocal' ifAbsent: [0]) = 0
		description: 'a method with a shadowing default still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 5
		description: 'fewer class methods eligible than the cut measured (5): '
			, counts printString
%
