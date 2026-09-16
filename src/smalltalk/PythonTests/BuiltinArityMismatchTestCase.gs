! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinArityMismatchTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinArityMismatchTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinArityMismatchTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinArityMismatchTestCase
!
! A CALL TO A KNOWN BUILTIN AT AN ARITY NO SELECTOR MATCHES, THROUGH THE
! DIRECT-TO-IR PATH.
!
! ``len(1, 2)'', ``aiter()'', ``anext(x, 1, 3)'' -- calls whose only purpose is
! the TypeError.  printSmalltalkOn: resolves these AT COMPILE TIME: finding no
! selector for the shape, it emits, through printArityMismatchErrorOn:forName:,
! a single
!
!     (TypeError ___signal___: '<name>() takes wrong number of arguments
!         (N positional, K keyword) - no matching method')
!
! and NO ARGUMENT EXPRESSIONS AT ALL.  So the IR twin is one send carrying one
! literal -- among the smallest emits in the migration, which is why the census
! row it closes (`cm:CallAst:builtinArityMismatch', 2: test_asyncgen's
! test_aiter_bad_args and test_anext_bad_args) had survived this long only
! because nothing had looked at what the text actually emitted for it.
!
! THE MESSAGE IS BUILT ONCE, BY ___arityMismatchMessageFor___:, and both paths
! call it.  That is not tidiness: test_asyncgen asserts on the TypeError, so a
! drift between the two spellings would be a WRONG ANSWER on one path rather
! than a cosmetic difference.
!
! THE ARGUMENT-EVALUATION DIVERGENCE IS DELIBERATE AND SHARED.  CPython
! evaluates a call's arguments before discovering the arity is wrong;
! Grail's compile-time raise never evaluates them, so ``len(f(), g())'' calls
! neither.  The fixture pins that as an XFAIL.  The IR path reproduces it ON
! PURPOSE -- emitting the arguments here would fix one path only, and flag-on
! and flag-off would then disagree about how many times a side effect ran.
! Reproducing the text is what makes the two paths substitutable; fixing the
! text is a separate change that would move both.
!
! The fixture self-verifies under CPython 3.14, so every expectation is
! CPython's behaviour rather than Grail's opinion of it.
! ===============================================================================

doit
BuiltinArityMismatchTestCase removeAllMethods.
BuiltinArityMismatchTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinArityMismatchTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'builtin_arity_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'builtin_arity_census' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'builtin_arity_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'builtin_arity_ir'.
	self ___forgetCanonicalModule___: 'builtin_arity_census'.
	self ___forgetCanonicalModule___: 'builtin_arity_text'.
	irModule := nil.
%

category: 'Grail-Private'
method: BuiltinArityMismatchTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'builtin_arity_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'builtin_arity_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_arity_mismatch.py')
		name: 'builtin_arity_ir'.
	^ irModule
%

category: 'Grail-Private'
method: BuiltinArityMismatchTestCase
___disagreeingKeys___
	"Every fixture key whose actual value differs from its EXPECTED one,
	compared by repr so a failure prints both sides whole.

	The fixture's one XFAIL is skipped here and asserted on its own below, so
	that it cannot quietly start passing without a test noticing."

	| mod results expected keys bad xfail |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	xfail := 'arguments_are_evaluated_first'.
	bad := OrderedCollection new.
	1 to: (keys @env1:__len__) do: [:i |
		| k got want |
		k := (keys @env1:__getitem__: i - 1) @env0:asString.
		k = xfail ifFalse: [
			got := ((results @env1:__getitem__: k) @env1:__repr__) @env0:asString.
			want := ((expected @env1:__getitem__: k) @env1:__repr__) @env0:asString.
			got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]]].
	^ bad
%

category: 'Grail-Tests - the builtin arity mismatch'
method: BuiltinArityMismatchTestCase
testEveryArityShapeAgreesWithCPythonUnderIR
	"Every shape but the XFAIL, with the seam forced on.

	The CORRECT calls are here on purpose alongside the broken ones: a guard
	that admitted too much would compile ``len([1, 2, 3])'' into an arity
	TypeError, and that shows up here as a wrong value rather than as a
	compile failure."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'arity shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - the builtin arity mismatch'
method: BuiltinArityMismatchTestCase
testTheArgumentEvaluationDivergenceIsStillShared
	"The XFAIL, asserted as a SHARED divergence rather than left unexamined.

	CPython runs both side effects before raising; Grail runs neither, because
	the raise is emitted at compile time in place of the call.  What matters
	for this cut is that the IR path answers what the TEXT path answers -- if
	the IR emit ever started evaluating the arguments, flag-on and flag-off
	would disagree about how many times a side effect ran, and this is the
	test that would say so."

	| mod got |
	mod := self ___irModule___.
	got := (mod @env1:___pyAttrLoad___: #'r') @env1:__getitem__: 'arguments_are_evaluated_first'.
	self assert: got @env0:asString = '0'
		description: 'the IR arity raise now evaluates its arguments (CPython says 2, '
			, 'the text path says 0); flag-on and flag-off no longer agree: '
			, got printString
%

category: 'Grail-Tests - the builtin arity mismatch'
method: BuiltinArityMismatchTestCase
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
method: BuiltinArityMismatchTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	___irStats___ cannot see this cut and the test above says so; this is the
	instrument that can.  An eligibility refusal never reaches the seam, so it
	is not a FALLBACK -- the refused defs are compiled the old way, and
	``compiled > 0'' stays true on the strength of the fixture's other defs."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_arity_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'builtin_arity_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_arity_mismatch.py')
		name: 'builtin_arity_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - the builtin arity mismatch'
method: BuiltinArityMismatchTestCase
testTheArityMismatchDefsAreNowEligible
	"The assertion that fails if the cut is reverted.

	IT ASSERTS THE COUNTS, NOT THE ROW NAME, and that correction is the whole
	reason this method reads the way it does.  The obvious version --
	``counts at: #'CallAst:builtinArityMismatch' = 0'' -- is VACUOUS, because
	this cut also deleted that name from ___irRefusalDetail___: as a dead
	label.  With the shape refusal put back the fixture censuses as
	`CallAst:other', so a test watching for the old name sees zero either way
	and passes against the reverted cut.  It did: the control below was run
	and PASSED before this method was rewritten.

	Measured on this fixture, both ways:

	  |                  | refusal | cut |
	  | compiled         |       2 |   5 |
	  | cm:eligible      |       1 |   2 |
	  | CallAst:other    |       3 |   0 |
	  | cm:CallAst:other |       1 |   0 |

	so the counts separate the two states three times over, and no refusal row
	of any name survives.  On the corpus the row that moved is
	`cm:CallAst:builtinArityMismatch' (2 -> 0, both sites in test_asyncgen),
	with cm:eligible 13217 -> 13219.

	GUARDED ON ___irCodegenSupported___, NOT ___irCodegenEnabled___.  The
	census arm forces the seam on itself, so the ambient flag says nothing
	about whether this can run -- reading it would make the whole test return
	early in the flag-OFF suite, which is the run most likely to be the one
	that catches a reverted cut."

	| counts refusals |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	refusals := counts keys select: [:k |
		(k asString indexOfSubCollection: 'CallAst') > 0].
	self assert: refusals isEmpty
		description: 'a call in the fixture still refuses: '
			, (refusals collect: [:k | k -> (counts at: k)]) asArray printString
			, ' of ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 5
		description: 'fewer top-level defs compiled than the cut measured (5); '
			, 'with the refusal restored this reads 2: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 2
		description: 'Holder''s two methods are not both IR-eligible (the cut '
			, 'measured 2, the refusal 1): ' , counts printString
%

category: 'Grail-Private'
method: BuiltinArityMismatchTestCase
___arityMessageFrom___: moduleName forced: aBoolean
	"Call the fixture's ``bad_arity_in_a_def'' in a module loaded with the seam
	forced the given way, and answer the TypeError's message text."

	| mod |
	(importlib @env1:modules) removeKey: moduleName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: moduleName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: aBoolean.
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_arity_mismatch.py')
		name: moduleName.
	^ [(mod @env1:___pyAttrLoad___: #'bad_arity_in_a_def')
			@env1:___pyCallValue___: #() kw: nil.
		'NO TypeError WAS RAISED']
		on: AbstractException
		do: [:ex |
			(AlmostOutOfStackError handles: ex) ifTrue: [ex pass].
			ex messageText]
%

category: 'Grail-Tests - the builtin arity mismatch'
method: BuiltinArityMismatchTestCase
testBothPathsRaiseTheSameMessage
	"THE EMIT RULE ITSELF: the IR path must produce the SAME message the text
	path produces, character for character.

	Nothing else here checks it.  The CPython comparison cannot -- Grail names
	the arity where CPython names the signature, so the fixture deliberately
	compares exception TYPES and never text.  Yet test_asyncgen, the corpus
	site this cut is for, is a test ABOUT the exception, so a drift between
	the two spellings would be a wrong answer on whichever path drifted.

	___arityMismatchMessageFor___: is shared by construction, which is what
	makes them agree; this is the test that says so rather than assuming it,
	and it is what would catch someone inlining the message back into either
	emit."

	| textMsg irMsg |
	textMsg := self ___arityMessageFrom___: 'builtin_arity_text' forced: false.
	irMsg := self ___arityMessageFrom___: 'builtin_arity_ir' forced: true.
	self assert: textMsg = irMsg
		description: 'the two paths raise different messages -- text: '
			, textMsg printString , ' IR: ' , irMsg printString.
	self assert: (textMsg indexOfSubCollection: 'takes wrong number of arguments') > 0
		description: 'neither path raised the arity TypeError at all: '
			, textMsg printString
%
