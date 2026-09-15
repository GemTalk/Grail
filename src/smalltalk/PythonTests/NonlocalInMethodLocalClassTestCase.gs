! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalInMethodLocalClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NonlocalInMethodLocalClassTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NonlocalInMethodLocalClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NonlocalInMethodLocalClassTestCase
!
! ``nonlocal'' INSIDE A METHOD OF A METHOD-LOCAL CLASS, THROUGH THE IR PATH.
!
! ``cm:NonlocalAst:notLocal'' (22) was the largest row left on the board, and it
! is the second half of the write-back family.  PR #960 made the ENCLOSING frame
! carry a setter block to the class; this makes the inner method USE it, so the
! shape is end-to-end:
!
!     def f(x):
!         class c:
!             def inc(self):
!                 nonlocal x
!                 x += 1
!
! ``x'' is f's local and the method reaches PAST the class to write it.  A class
! body is not a closure scope, so there is no lexical link to f's temp; both
! halves go through the cell pair ClassDefAst emits at definition time --
! ``___cell_x___'' to read, ``___cellSetter_x___'' to write.
!
! THREE PIECES.  NonlocalAst's eligibility admits a declared name that is an
! enclosing FUNCTION's local reached past the class (the owner/del checks below
! it speak about a temp such a name does not have, so they are skipped for it
! rather than answered wrongly); AssignAst and AugAssignAst each gained the
! store, mirroring printSmalltalkOn:'s own branch send for send.  The ``value:''
! that drives the setter is env 0: it is a Smalltalk one-argument block the
! enclosing frame handed over, and an env-1 value: cannot exist on ExecBlock.
!
! WHAT THIS CUT DOES NOT NEED, recorded because the obvious reading is wrong.
! The class-method seam is SUPPRESSED inside the transport helper, and that
! looks like it would leave these methods on text -- which would make the census
! move while nothing changed.  It does not: cut 79 BUILDS a method-local class's
! defs immediately rather than deferring them, so they are IR-built with the
! seam suppressed.  Measured, not assumed: on ``main'' the inner ``inc'' answers
! ___isIRPythonMethod___ FALSE and its sourceString is Smalltalk; with this cut
! it answers TRUE and its sourceString is the Python.  Un-suppressing the seam
! makes it WORSE -- the count of IR-built methods drops -- so the suppression is
! required here, not an obstacle.
!
! THE CENSUS ASSERTION IS THE LOAD-BEARING ONE.  Measured both ways on this
! fixture: reverted, it censuses 8 `cm:NonlocalAst:notLocal' against 1
! `cm:eligible' and compiles 8 of the 16 -- and the behavioural test STILL
! PASSES on all eight checks, because the text twin answers them correctly.
! ===============================================================================

doit
NonlocalInMethodLocalClassTestCase removeAllMethods.
NonlocalInMethodLocalClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NonlocalInMethodLocalClassTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nonlocal_mlc_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'nonlocal_mlc_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nonlocal_mlc_ir'.
	self ___forgetCanonicalModule___: 'nonlocal_mlc_census'.
	irModule := nil
%

category: 'Grail-Private'
method: NonlocalInMethodLocalClassTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/nonlocal_in_method_local_class.py'
%

category: 'Grail-Private'
method: NonlocalInMethodLocalClassTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('augmented_writes_round_trip' 'a_read_without_a_write_sees_it'
	    'the_enclosing_function_sees_the_write' 'a_plain_store_works_too'
	    'every_instance_shares_the_one_binding' 'separate_calls_do_not_share'
	    'two_methods_share_the_binding' 'a_local_and_a_nonlocal_coexist')
%

category: 'Grail-Private'
method: NonlocalInMethodLocalClassTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nonlocal_mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nonlocal_mlc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'nonlocal_mlc_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NonlocalInMethodLocalClassTestCase
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

category: 'Grail-Tests - nonlocal in a method-local class'
method: NonlocalInMethodLocalClassTestCase
testEveryNonlocalShapeAgreesWithCPythonUnderIR
	"All eight shapes with the seam forced on.

	``the_enclosing_function_sees_the_write'' is the one a store to a
	method-local temp would get wrong WITHOUT raising: the value reads back
	correctly inside the class and the update is silently lost outside.
	``separate_calls_do_not_share'' is its mirror -- two calls of the enclosing
	def must get two bindings, which a class-attribute store would collapse
	into one."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'nonlocal shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - nonlocal in a method-local class'
method: NonlocalInMethodLocalClassTestCase
testTheInnerMethodIsActuallyIRBuilt
	"The guard that answers the obvious objection: the class-method seam is
	suppressed inside the transport helper, so are these methods really built
	from IR rather than from their text twin?

	They are.  An IR-built method's sourceString is the user's PYTHON, so the
	test reads it directly rather than trusting a counter.  On ``main'' this
	same probe answers false and yields Smalltalk."

	| mod inst cls m |
	mod := self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	inst := mod @env1:___pyAttrLoad___: #'o'.
	cls := inst @env0:class.
	m := [cls compiledMethodAt: #'inc' environmentId: 1]
		on: Error do: [:ex | ex return: nil].
	self deny: m isNil
		description: 'the method-local class has no ``inc'' method at all'.
	self assert: (BaseException ___isIRPythonMethod___: m)
		description: 'the inner method was built from TEXT, not IR -- so the '
			, 'census would be reporting an eligibility the build does not honour'
%

category: 'Grail-Tests - nonlocal in a method-local class'
method: NonlocalInMethodLocalClassTestCase
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
method: NonlocalInMethodLocalClassTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nonlocal_mlc_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nonlocal_mlc_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'nonlocal_mlc_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - nonlocal in a method-local class'
method: NonlocalInMethodLocalClassTestCase
testNonlocalInAMethodLocalClassIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  Reverted, it censuses 8
	`cm:NonlocalAst:notLocal' against 1 `cm:eligible' and compiles 8 of the 16
	-- and the behavioural test above STILL PASSES, because the text twin
	answers all eight correctly."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:NonlocalAst:notLocal' ifAbsent: [0]) = 0
		description: 'a nonlocal in a method-local class still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 9
		description: 'fewer class methods eligible than the cut measured (9): '
			, counts printString
%
