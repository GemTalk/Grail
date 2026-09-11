! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRCodegenSmokeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRCodegenSmokeTestCase'
  instVarNames: #(testModule registrySnapshot)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IRCodegenSmokeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IRCodegenSmokeTestCase - the direct-to-IR module-method codegen path
! ===============================================================================
! Guards the GRAIL_IR_CODEGEN seam in importlib>>___buildModuleClassBody:name:.
! With the flag forced on, every top-level def in tests/python/ir_codegen_smoke.py
! is compiled through GsNMethod>>generateFromIR: instead of source compilation.
! The tests check that the imported functions still return the right values
! (env-1 dispatch to the IR-built methods); that the IR path was actually taken
! -- every def compiled, none fell back to text -- so a silent regression to the
! text path cannot pass unnoticed; that an IR method carries its Python source
! and is first-class in a traceback; and that it reports itself as Python from
! its stored marker.  See experiments/ir/MIGRATION.md.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IRCodegenSmokeTestCase removeAllMethods: 0.
IRCodegenSmokeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: IRCodegenSmokeTestCase
setUp
	"Force the IR flag on, zero the counters, and import the fixture COLD so the
	import runs the IR path.  A fresh test worker starts with the flag off (env
	var unset), so this is the only place it is on.

	Cold is load-bearing, not tidiness: every assertion here is about what the
	IMPORT did, so a warm BIND of a canonically-deployed instance would answer a
	correct ALL_OK computed at deploy time while ___irStats___ said compiled=0.
	___forgetCanonicalModule___: therefore un-deploys the fixture BEFORE the
	snapshot -- which is also what heals a stone an earlier committing session
	deployed it on -- and the snapshot then lets tearDown remove exactly what
	THIS import adds."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ir_codegen_smoke' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ir_codegen_smoke'.
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
		name: 'ir_codegen_smoke'.
%

category: 'Grail-Setup'
method: IRCodegenSmokeTestCase
tearDown
	"Restore the default (flag reads the env var again) and leave NO trace of the
	fixture: the sys.modules key AND every canonical registry the import wrote.

	Dropping the sys.modules key was all this used to do, and that is what broke.
	loadModuleFromPath: also registers the module instance and its source hash in
	the canonical registries, so the fixture was left looking deployed-but-
	deleted: the par.10.5 guard then raised ``module 'ir_codegen_smoke' is
	canonical (deployed); it was removed from sys.modules in this session'' out of
	the SECOND setUp -- after the first had quietly warm-bound and passed on work
	the import never did.  Those registries are UserGlobals, so within one
	non-committing test run they only ever held session state; it is a session
	that DOES commit (an MCP session, a stray deploy) that makes the fixture
	deployed on the stone for good.

	Restoring the snapshot removes what this test added;
	___forgetCanonicalModule___: additionally clears an entry an EARLIER session
	committed, so a poisoned stone heals on the next run instead of failing
	every run until someone purges it by hand."

	| mods |
	importlib ___irCodegenEnabledInvalidate___.
	mods := importlib @env1:modules.
	mods removeKey: #'ir_codegen_smoke' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ir_codegen_smoke'.
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testIREligibleFunctionsReturnCorrectValues
	"Each IR-built function returns what CPython does (env-1 dispatch to the
	generated GsNMethod).  ALL_OK is ``all(RESULTS.values())'' computed in the
	module body, which calls every function -- so this asserts the whole
	RESULTS table at once."

	| allOk |
	allOk := testModule @env1:___pyAttrLoad___: #ALL_OK.
	self assert: allOk == true
		description: 'ir_codegen_smoke ALL_OK was ' , allOk printString
			, ' (RESULTS: '
			, (testModule @env1:___pyAttrLoad___: #RESULTS) printString , ')'.
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testIRMethodCarriesPythonSource
	"An IR-built method attaches its def's own PYTHON source (not the generated
	Smalltalk, and not nil): source introspection sees ``def answer'' and never a
	___curPos___ store.  This is what keeps codegen-introspecting paths (and the
	traceback machinery) working across the IR path.

	4.0-only capability: on a platform without IR (3.7.x) the same def is compiled
	through the text path, so its sourceString is the generated Smalltalk -- not
	the Python def -- which this asserts instead, confirming the IR path was
	correctly not taken."

	| src |
	src := (testModule class compiledMethodAt: #answer environmentId: 1)
		sourceString.
	self deny: src isNil description: 'answer method sourceString was nil'.
	importlib ___irCodegenSupported___
		ifTrue: [
			self assert: (src includesString: 'def answer')
				description: 'IR method source lacked the Python def: ' , src printString.
			self deny: (src includesString: '___curPos___')
				description: 'IR method source carried a ___curPos___ store']
		ifFalse: [
			self deny: (src includesString: 'def answer')
				description: 'text-path method unexpectedly carried the Python def '
					, '(IR should not run without platform support): ' , src printString].
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testIRMethodIsRecognisedAsPython
	"An IR-built method answers ___isGeneratedPythonMethod___ -- and answers it
	from the STORED MARKER, not from a pragma and not from a source read.

	The regression test #893 shipped without, which is why it is here rather
	than alongside the change.  The identity probe has three routes: the
	``<grailPython>'' pragma, an in-memory temps probe, and a source read that
	goes back to the repository and can fault under concurrent shard workers.
	An IR method can carry no pragma -- a pragma is made by GemStone's Smalltalk
	LEXER (comparse.c ``appendToPragmasObj''), and primitive 679 runs the
	generator without it -- so before the marker every IR method fell through to
	that source read.  PyMethodIRBuilder >> ___emitPythonIdentityMarker___ now
	STORES ``___grailPython___'' as the first statement of every method it
	builds; stored and not merely declared, because the generator drops an
	unreferenced temp.

	ASSERTING THE ROUTE IS THE POINT.  Deleting the marker emit leaves the
	ANSWER true -- the source probe still gets there -- so a test that checked
	only ___isGeneratedPythonMethod___ would stay green through the regression
	it exists to catch.  Hence the marker is asserted directly, and the pragma
	asserted ABSENT: if a future GsComMethNode pragma ivar lands (the request is
	open) this is the test that should fail, and the marker temp should then be
	retired rather than the assertion relaxed.

	On 3.7.x the same def takes the text path, which is the exact mirror --
	pragma yes, marker no -- so neither platform passes vacuously."

	| m names |
	m := testModule class compiledMethodAt: #answer environmentId: 1.
	names := m argsAndTemps ifNil: [#()].
	self assert: (BaseException ___isGeneratedPythonMethod___: m)
		description: 'a generated method was not recognised as Python'.
	importlib ___irCodegenSupported___
		ifTrue: [
			self assert: (names includes: #'___grailPython___')
				description: 'IR method lacked the identity marker; argsAndTemps was '
					, names printString.
			self deny: (BaseException ___hasPythonPragma___: m)
				description: 'an IR method carried a <grailPython> pragma -- the lexer '
					, 'cannot have run.  If primitive 679 now seeds cst->PragmasH, '
					, 'retire the marker temp instead of relaxing this'.
			self deny: (names includes: #'___curPos___')
				description: 'IR method carried a ___curPos___ temp: ' , names printString]
		ifFalse: [
			self assert: (BaseException ___hasPythonPragma___: m)
				description: 'text-path method lacked the <grailPython> pragma'.
			self deny: (names includes: #'___grailPython___')
				description: 'the text path emitted the IR identity marker: '
					, names printString].
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testTracebackThroughIRMethod
	"An IR-built method is first-class in a Python traceback: the frame machinery
	recognises it (source begins ``def '') and derives its line from native
	source offsets.  text_caller (text) calls ir_raiser (IR), which raises
	TypeError; the formatted traceback must name ir_raiser and show its source.

	THE PREMISE IS ASSERTED, not assumed.  text_caller is on the text path only
	because its body carries some shape the IR path still refuses, and every
	such shape is a future cut -- so the opt-out will eventually be retired, and
	when it is, this test silently stops being a TEXT-calls-IR check and becomes
	an IR-calls-IR one, still green, testing something else.  That already
	happened once: the opt-out was a bare ``dir()'' until cut 85 made it
	eligible, and nothing went red.  An IR method's sourceString is its own
	PYTHON def (testIRMethodCarriesPythonSource), so a text method's is not;
	that is the cheapest available test of which path built it.

	If this assertion fires, the fix is to give text_caller a different
	still-refusing shape -- NOT to delete the assertion."

	| tb src |
	importlib ___irCodegenSupported___ ifTrue: [
		src := (testModule class compiledMethodAt: #text_caller environmentId: 1)
			sourceString.
		self deny: (src isNil or: [src includesString: 'def text_caller'])
			description: 'text_caller is no longer on the TEXT path -- its IR '
				, 'opt-out has been retired by a later cut, so this test is no '
				, 'longer text-calls-IR.  Give it another refusing shape.'].
	tb := testModule perform: #text_caller env: 1 withArguments: { }.
	self assert: (tb includesString: 'in ir_raiser')
		description: 'IR method frame missing from traceback: ' , tb printString.
	self assert: (tb includesString: 'n + ')
		description: 'IR method source line missing from traceback: ' , tb printString.
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testTracebackThroughMethodLocalClassMethod
	"A method of a METHOD-LOCAL class is first-class in a traceback too (cut 79).
	``mlc_body_traceback'' raises ZeroDivisionError inside the method of a class
	defined in its own body; the formatted traceback must name that method and
	show ITS source line, not the enclosing def's.

	Called from here rather than from the fixture's RESULTS table because it
	imports ``traceback'': a few hundred stdlib defs that would land in the
	compiled count testIRPathWasActuallyTaken asserts exactly."

	| tb |
	tb := testModule perform: #'mlc_body_traceback' env: 1 withArguments: { }.
	self assert: (tb includesString: 'in boom')
		description: 'method-local class method missing from traceback: ' , tb printString.
	self assert: (tb includesString: '1 // 0')
		description: 'method-local class method source line missing: ' , tb printString.
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testIRPathWasActuallyTaken
	"On a platform WITH IR support (4.0), the fixture's eligible top-level defs must
	ALL compile through the IR path with no fallback -- otherwise ``correct
	results'' could come entirely from the text path and the seam would be silently
	dead.

	On a platform WITHOUT IR support (3.7.x), the forced flag must be a correct
	no-op: ___irCodegenEnabled___ answers false despite the forced flag, and the IR
	path is never attempted -- neither a compile nor a fallback -- so the two
	versions share one code base without 3.7.x paying any build-and-fall-back cost."

	| stats |
	stats := importlib ___irStats___.
	importlib ___irCodegenSupported___
		ifTrue: [
			self assert: (stats at: #fallbacks) = 0
				description: 'IR fallbacks: ' , (stats at: #fallbacks) printString
					, ' (last error: ' , (stats at: #lastError) printString , ')'.
			"The running split, because the total alone says nothing about which
			half moved.  Cut 81: 536 -> 549 from the emitter (the class-method
			closure cell), -> 563 with its fixture.  Cut 82: the emitter moved
			it by ZERO -- a full flag-off suite with cut 82's emitter and cut
			81's fixture still read 563, because nothing in that fixture was a
			method-local class carrying a decorator or a class keyword -- and
			all +23 were that cut's own fixture defs and their inner classes'
			methods.  Cut 83 (globals()) likewise moves almost none of it from
			the emitter, because the smoke module barely called globals()
			before; its +9 are its fixture defs.  Combined and RE-MEASURED rather
			than added up -- and here the arithmetic does close: 563 + 23 + 9 =
			595, which is what the combined tree reads.  Re-measure anyway; that
			it closed for two independent fixture-only cuts is not a rule.
			Cut 84 (locals()/vars()): 595 -> 604.  Cut 85: 604 -> **622**, and
			this one closes exactly, which is worth the space because working
			it out is what found two defects:
			  * 604 -> 613, the bare-dir() emitter plus its fixture: nine new
			    defs LESS the two still refused (d_one_arg_form on dir(P),
			    d_in_comprehension on comprehension scope) PLUS DHolder's two
			    class methods -- class-body methods DO land in this counter,
			    measured on a two-line module, which is why the def count alone
			    never reconciles;
			  * 613 -> 614 from the emitter ALONE, fixture held fixed: exactly
			    d_one_arg_form, the one-argument dir the arity narrowing
			    unblocked;
			  * 614 -> 622: seven new fixture defs plus DirThing.__init__;
			  * 622 -> 619 when eval/exec went back to refusing at every
			    arity (the caller-namespace regression below): exactly the
			    three eval/exec fixture defs, which stay in the fixture as
			    text-path conformance claims and as the tripwire for the cut
			    that unifies the two frame-marker spellings.
			Cut 86 (``super'' as a VALUE): 619 -> **627**.  Nine defs and
			methods added, less ONE that correctly refuses -- sv_arity_error's
			``super(int, int, int)'' is at module scope, so CallAst's super
			shape declines it as #'CallAst:super-noClass'.  Identified by
			running the census over the probe module rather than by elimination:
			``importlib ___irCensusOn: true'' then reading #examples names the
			refusing def outright, which is quicker and surer than reasoning
			about which of nine it must be.
			The FIRST reading of the first step was 614 rather than 613, and
			the extra one was ``text_caller'', whose IR opt-out was a bare
			dir() until this cut made it eligible.  That single unexplained
			compile was the ONLY sign that a text-calls-IR traceback test had
			quietly become IR-calls-IR.  testTracebackThroughIRMethod now
			asserts its own premise.  Chasing an off-by-one in this number has
			now twice been worth more than the number.

			Cut ``super()/__class__ through the class cell'': 627 -> **629**.
			The split, measured by censusing this probe module on the reverted
			emitter and again on the new one rather than reasoning about it:
			top-level ``compiled'' does not move at all (423 both times) and the
			whole +2 is class methods, 204 -> 206.  Of the probe's SEVEN
			method-local supers, two came in and five stayed out as
			``cm:CallAst:super-argZeroDeletable'' -- a def NESTED in a method,
			where CPython reads the innermost frame, so the receiver the outer
			method has is not the one super() may use.  That five is the
			nested-def frame family, the same one the eval/exec rows belong to,
			and it is now the largest thing between this probe and full
			eligibility.

			The number is exact on purpose -- it is what makes a silently dead
			seam visible.  Expect to re-measure whenever a cut moves
			eligibility or the fixture grows, and record the split rather than
			just the total.  Note it fails in the FLAG-OFF suite, because this
			test forces the flag: a stale pin looks alarming and is not a
			defect."
			self assert: (stats at: #compiled) = 629
				description: 'IR compiled count was ' , (stats at: #compiled) printString
					, ', expected 629']
		ifFalse: [
			self deny: importlib ___irCodegenEnabled___
				description: 'IR reported enabled with no platform support'.
			self assert: (stats at: #compiled) = 0
				description: 'IR path was attempted without platform support: compiled='
					, (stats at: #compiled) printString.
			self assert: (stats at: #fallbacks) = 0
				description: 'IR fell back without platform support: fallbacks='
					, (stats at: #fallbacks) printString].
%
