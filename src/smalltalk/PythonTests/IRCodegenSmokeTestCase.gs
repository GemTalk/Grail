! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRCodegenSmokeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRCodegenSmokeTestCase'
  instVarNames: #(testModule)
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
! One test checks the imported functions still return the right values (env-1
! dispatch to the IR-built methods); the other checks the IR path was actually
! taken -- every def compiled, none fell back to text -- so a silent regression
! to the text path cannot pass unnoticed.  See experiments/ir/MIGRATION.md.
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
	"Force the IR flag on, zero the counters, and import the fixture cold so the
	import runs the IR path.  A fresh test worker starts with the flag off (env
	var unset), so this is the only place it is on."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ir_codegen_smoke' ifAbsent: [].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
		name: 'ir_codegen_smoke'.
%

category: 'Grail-Setup'
method: IRCodegenSmokeTestCase
tearDown
	"Restore the default (flag reads the env var again) and drop the fixture so
	the next test re-imports cold."

	| mods |
	importlib ___irCodegenEnabledInvalidate___.
	mods := importlib @env1:modules.
	mods removeKey: #'ir_codegen_smoke' ifAbsent: [].
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
testTracebackThroughIRMethod
	"An IR-built method is first-class in a Python traceback: the frame machinery
	recognises it (source begins ``def '') and derives its line from native
	source offsets.  text_caller (text) calls ir_raiser (IR), which raises
	TypeError; the formatted traceback must name ir_raiser and show its source."

	| tb |
	tb := testModule perform: #text_caller env: 1 withArguments: { }.
	self assert: (tb includesString: 'in ir_raiser')
		description: 'IR method frame missing from traceback: ' , tb printString.
	self assert: (tb includesString: 'n + ')
		description: 'IR method source line missing from traceback: ' , tb printString.
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
			self assert: (stats at: #compiled) = 71
				description: 'IR compiled count was ' , (stats at: #compiled) printString
					, ', expected 71']
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
