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
	traceback machinery) working across the IR path."

	| src |
	src := (testModule class compiledMethodAt: #answer environmentId: 1)
		sourceString.
	self deny: src isNil description: 'IR method sourceString was nil'.
	self assert: (src includesString: 'def answer')
		description: 'IR method source lacked the Python def: ' , src printString.
	self deny: (src includesString: '___curPos___')
		description: 'IR method source carried a ___curPos___ store'.
%

category: 'Grail-Tests'
method: IRCodegenSmokeTestCase
testIRPathWasActuallyTaken
	"The fixture's nine eligible top-level defs must ALL compile through the IR
	path with no fallback -- otherwise ``correct results'' could come entirely
	from the text path and the seam would be silently dead."

	| stats |
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fallbacks: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) = 9
		description: 'IR compiled count was ' , (stats at: #compiled) printString
			, ', expected 9'.
%
