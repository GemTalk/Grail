! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyControlFlowTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyControlFlowTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyControlFlowTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyControlFlowTestCase
!
! CONTROL FLOW IN A METHOD-LOCAL CLASS BODY, THROUGH THE DIRECT-TO-IR PATH.
!
! `cm:classDef:bodyStatement' (4) refused a class body holding anything but the
! DECLARATIVE statements -- defs, nested classes, a docstring, a plain or
! annotated assignment.  An ``if'', ``for'', ``with'', ``try'', ``del'' or
! augmented assignment falls through to the ORDINARY statement emitters, which
! stamp a ``___curPos___'' the class-body helper did not declare.
!
! ALL FOUR SITES ARE REAL CODE and between them use four different statements:
! test_enum's setUp picks a member with ``if''/``else'', its test_ignore builds
! members with a ``for'' over ``vars()'', its test_enum_dict_in_metaclass
! asserts inside the body with ``with self.assertRaises(...)'', and test_scope's
! testClassNamespaceOverridesClosure uses ``del'' to check a class-body name
! does not leak to the enclosing function.
!
! THE DECLARATION WAS NOT THE HARD PART, and shipping it alone would have been
! wrong.  ``___curPos___'' is also what PyFrame>>___namesIncludeCodegenMarker___:
! reads to decide a frame is generated Python, and the class-body helper had
! neither a Python name nor a position map -- so an exception raised in a class
! body reported the enclosing def suspended at its ``class C:'' statement and
! LOST the line it happened on.  That was already true of the simple bodies the
! IR path compiled, and admitting these four would have spread it.  It is fixed
! first, in its own cut (ClassBodyTracebackTestCase); this one lands on top of
! it, which is why the fixture's last check is a traceback rather than a value.
!
! THE DECLARATION IS CONDITIONAL -- only a body that has control flow gets the
! temp -- so a declarative body's helper is unchanged and keeps answering ``not
! a Python frame'' to that walk, exactly as before.
! ===============================================================================

doit
ClassBodyControlFlowTestCase removeAllMethods.
ClassBodyControlFlowTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyControlFlowTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbcf_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbcf_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_control_flow.py'
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___keys___
	"Named rather than read from the fixture so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('an_if_else_true' 'an_if_else_false' 'a_for_loop_over_vars'
	    'a_with_statement' 'a_del_of_a_body_name' 'a_try_except'
	    'an_augmented_assignment' 'a_def_beside_the_control_flow'
	    'the_traceback_of_a_raise_inside_it')
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___irModule___
	"The fixture with the seam FORCED ON.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbcf_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbcf_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbcf_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___expectedReprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests - control flow in a class body'
method: ClassBodyControlFlowTestCase
testEveryClassBodyStatementKindAgreesWithCPythonUnderIR
	"Nine checks: the six statement kinds the refusal covered, a def sitting
	beside them (the declarative path still works in the same body), and the
	traceback of a raise from inside the control flow."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___expectedReprOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'class-body statement kinds disagreeing with CPython under '
			, 'IR: ' , bad asArray printString
%

category: 'Grail-Tests - control flow in a class body'
method: ClassBodyControlFlowTestCase
testARaiseInsideTheControlFlowKeepsItsLine
	"The reason this cut waited for the traceback one.

	Declaring ``___curPos___'' makes the helper answer to
	___namesIncludeCodegenMarker___:, which is what made an exception raised in
	a class body report the enclosing def at its ``class C:'' statement and
	lose the failing line.  With the class-body frame carrying a name and a
	position map the same raise reports CPython's two entries."

	| got |
	got := self ___reprOf___: 'the_traceback_of_a_raise_inside_it'.
	self assert: ((got includesString: '''C''') and: [got includesString: 'b = 1 // 0'])
		description: 'a raise inside a class body''s control flow lost its frame '
			, 'or its line: ' , got
%

category: 'Grail-Private'
method: ClassBodyControlFlowTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	___irStats___ CANNOT SEE THIS CUT and the test below says so: an
	eligibility refusal never reaches the seam, so it is not a fallback -- the
	refused methods are compiled the old way, every value in the fixture is
	still right, and ``fallbacks'' stays 0 either way.  This is the instrument
	that can."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'cbcf_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbcf_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'cbcf_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - control flow in a class body'
method: ClassBodyControlFlowTestCase
testTheClassBodyStatementRowIsGone
	"THE ASSERTION THAT FAILS IF THE CUT IS REVERTED, and the only one that
	can: with the refusal in place this fixture censuses 8 `classDef:bodyStatement'
	class methods and 1 eligible one; with the cut, none and 9.

	Measured both ways on this fixture, not inferred from the corpus."

	| counts refused |
	"GUARDED ON SUPPORT, NOT ON THE AMBIENT FLAG.  ___censusCountsForFixture___
	FORCES the seam on, so this test has something to measure whether or not
	the run set GRAIL_IR_CODEGEN -- and ``___irCodegenEnabled___ ifFalse: [^ self]''
	would make it return before measuring anything in the flag-off suite, which
	is most runs.  Caught by the control: with the refusal restored this test
	still passed, because it was not looking."
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	refused := (counts at: #'cm:classDef:bodyStatement' ifAbsent: [0])
		+ (counts at: #'classDef:bodyStatement' ifAbsent: [0]).
	self assert: refused = 0
		description: 'a class body with control flow still refuses: '
			, refused printString , ' of ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 9
		description: 'fewer class methods eligible than the cut measured (9): '
			, counts printString
%

category: 'Grail-Tests - control flow in a class body'
method: ClassBodyControlFlowTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: an eligibility refusal never reaches the seam, so it
	is not a FALLBACK -- the refused methods are compiled the old way and every
	value above is still right.  Only the count can tell.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
