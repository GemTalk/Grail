Class {
	#name : 'GlobalBindingFormsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GlobalBindingFormsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/global_binding_forms.py'

]

{ #category : 'Grail-Private' }
GlobalBindingFormsTestCase >> ___irModule___ [
	"The same fixture with the IR seam FORCED ON, under its own module name.

	FORCED, not inherited.  The tests above read whatever arm the run is
	configured for, so on the ordinary flag-off gate they exercise the text
	path only -- and the IR path is where these binding forms were wrong three
	separate times.  All three were invisible to a flag-off run and two of them
	were invisible to the census as well, which measures ELIGIBILITY and so
	cannot see an emit that compiles and then does the wrong thing."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'gbf_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'gbf_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'gbf_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
GlobalBindingFormsTestCase >> assertMatchesCPythonAt: key [
	self
		assert: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key) asString
		equals: ((testModule @env1:___pyAttrLoad___: #EXPECTED)
			@env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
GlobalBindingFormsTestCase >> setUp [
	"Reload tests/python/global_binding_forms.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'global_binding_forms' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/global_binding_forms.py')
		name: 'global_binding_forms'.

]

{ #category : 'Grail-Setup' }
GlobalBindingFormsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'gbf_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'gbf_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - Compiles At All' }
GlobalBindingFormsTestCase >> testAClassDefBindsTheGlobal [
	"``global C'' then ``class C'' used to emit an assignment to an
	undeclared Smalltalk symbol, failing the whole method's compile."

	self assertMatchesCPythonAt: 'func_class'.
	self assertMatchesCPythonAt: 'method_class'.

]

{ #category : 'Grail-Tests - Compiles At All' }
GlobalBindingFormsTestCase >> testAFunctionDefBindsTheGlobal [
	"Same undefined-symbol failure for a nested def whose name is
	declared global -- and the module body never mentions that name, so
	the moduleVariableNames test alone could not have caught it."

	self assertMatchesCPythonAt: 'func_def'.
	self assertMatchesCPythonAt: 'method_def'.

]

{ #category : 'Grail-Tests - Scope' }
GlobalBindingFormsTestCase >> testAGlobalDeclarationRebindsTheModuleName [
	"The declaration must REBIND the module's existing name, not create a
	shadow that the module body cannot see."

	self assertMatchesCPythonAt: 'rebinds_module_name'.

]

{ #category : 'Grail-Tests - Compiles At All' }
GlobalBindingFormsTestCase >> testAWalrusBindsTheGlobal [
	self assertMatchesCPythonAt: 'func_walrus'.
	self assertMatchesCPythonAt: 'method_walrus'.

]

{ #category : 'Grail-Tests - Under IR' }
GlobalBindingFormsTestCase >> testEveryBindingFormAgreesWithCPythonUnderIR [
	"EVERY key at once, not one test per form.  The three defects this arm
	exists for each hit a DIFFERENT form, and each was found by a different
	accident rather than by this file; a per-form test only covers the forms
	someone thought to add.

	Reported as a list of disagreeing keys, because the failure that matters is
	WHICH form broke -- a bare ``expected 19 got 18'' names none of them."

	| r exp bad keys |
	r := self ___irModule___ @env1:___pyAttrLoad___: #r.
	exp := self ___irModule___ @env1:___pyAttrLoad___: #EXPECTED.
	keys := (exp @env1:keys) asArray.
	bad := OrderedCollection new.
	keys do: [:k | | got want |
		got := (r @env1:__getitem__: k) asString.
		want := (exp @env1:__getitem__: k) asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a binding form disagrees with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - Compiles At All' }
GlobalBindingFormsTestCase >> testEveryMatchCaptureFormBindsTheGlobal [
	"Sequence capture, star capture and ``as'' capture each emit their own
	bind, so each had to be routed -- one missed form is one silently
	uncompilable method."

	self assertMatchesCPythonAt: 'func_match'.
	self assertMatchesCPythonAt: 'method_match'.
	self assertMatchesCPythonAt: 'method_match_star'.
	self assertMatchesCPythonAt: 'method_match_as'.

]

{ #category : 'Grail-Tests - Under IR' }
GlobalBindingFormsTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"The guard on the guard.  Every value above can be right because the seam
	CAUGHT a raise and compiled the method as text instead -- which is how a
	silent fallback looks from the outside, and it is indistinguishable from a
	clean IR compile by behaviour alone.

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
		description: 'nothing compiled through IR at all'

]

{ #category : 'Grail-Tests - Receiver' }
GlobalBindingFormsTestCase >> testTheModuleReceiverIsUsedInsideAMethod [
	"The QUIET half.  These forms already took the module route but
	hardcoded ``self'', which inside a method is the Python instance --
	so the value landed on the instance and globals() never saw it.  Only
	the in-a-METHOD variants can catch this: in a top-level def ``self''
	really is the module."

	self assertMatchesCPythonAt: 'method_import'.
	self assertMatchesCPythonAt: 'method_unpack'.
	self assertMatchesCPythonAt: 'method_augassign'.
	self assertMatchesCPythonAt: 'method_plain'.

]

{ #category : 'Grail-Tests - Compiles At All' }
GlobalBindingFormsTestCase >> testTheTwoScopedStatementTargetsBindTheGlobal [
	"``except X as e'' and ``with ... as e'' -- the two forms this file's list
	OMITTED, and they are precisely the two that share
	AbstractNode>>___emitModuleScopeStoreOf___:from:on:.  Ten binding forms were
	enumerated here and the helper's own two callers were not among them.

	The except-as gap was real and IR-only: the direct-to-IR emit assigned the
	payload to a METHOD LOCAL, because the parser records an as-name in
	body.variables even when it is declared global, so a leaf existed and the
	plain assign compiled and ran without complaint while globals() kept the
	old value.  `test.test_global test_caught_exception' read
	``KeyError: 'name_caught_exc''' on the flag-on arm of the CPython corpus.
	Both halves were needed: routing the STORE to the module then made the
	handler-body READ answer nil, since it was still reading that local.

	with-as was measured and was already correct on both paths -- asserted here
	anyway, because it is the sibling caller and the cheapest way to notice if
	one of the two ever diverges from the other again."

	self assertMatchesCPythonAt: 'method_except_as'.
	self assertMatchesCPythonAt: 'method_with_as'.

]

{ #category : 'Grail-Tests - Scope' }
GlobalBindingFormsTestCase >> testWithoutAGlobalDeclarationTheBindingStaysLocal [
	"The guard against over-correcting: routing a binding form to the
	module unconditionally would make every function-local class leak
	into globals()."

	self assertMatchesCPythonAt: 'no_global_stays_local'.

]
