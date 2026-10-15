Class {
	#name : 'GlobalsShadowBuiltinTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
GlobalsShadowBuiltinTestCase >> assertMatchesCPythonAt: key [
	"Compare the fixture's recorded result against its CPython-generated
	expectation, both through repr so a 7 and a '7' cannot pass for each other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
GlobalsShadowBuiltinTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'globals_shadow_builtin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/globals_shadow_builtin.py')
		name: 'globals_shadow_builtin'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testALocalBindingStillWinsOverBoth [
	"LEGB order: a real local shadows the global, which shadows the builtin.
	The probe must not reach past a local -- ___moduleGlobalShadowName___
	declines when ___localBindingShadows___: answers true."

	self assertMatchesCPythonAt: 'local_shadow'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testARuntimeGlobalsShadowIsSeenByACompiledFunction [
	"THE DEFECT.  ``uses_len'' is compiled before the write; CPython's
	LOAD_GLOBAL still finds the shadow, because the lookup happens per call and
	reads globals first.  Grail answered 3 where CPython answers 7 -- and the
	write was not lost, merely unread, which is what ``shadow_is_in_globals''
	pins down."

	self assertMatchesCPythonAt: 'shadowed_len'.
	self assertMatchesCPythonAt: 'shadow_is_in_globals'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testDeletingTheShadowRestoresTheBuiltin [
	"The probe reads the slot at CALL time, so removing the global has to put
	the builtin back with no recompilation.  A fix that cached the lookup would
	pass the test above and fail this one."

	self assertMatchesCPythonAt: 'after_del_len'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testRebindingBuiltinsItselfStillWorks [
	"The pre-existing mechanism (___syncBuiltinOverride___:), asserted here so
	the new probe cannot regress it: the probe's then-branch IS the direct send
	that sync rewrites, so the two have to compose."

	self assertMatchesCPythonAt: 'builtins_patched_len'.
	self assertMatchesCPythonAt: 'after_restore_len'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testTheKwargsEmitPathIsProbedToo [
	"``sorted(x, reverse=True)'' carries a keyword, so it takes the VARARGS
	emit (``_sorted: {args} kw: dict''), a different method from the
	fixed-arity one.  Both had to be wrapped; covering only the fixed-arity
	path would leave every kwargs-bearing builtin call unshadowable."

	self assertMatchesCPythonAt: 'shadowed_sorted'.
	self assertMatchesCPythonAt: 'after_del_sorted'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testTheShadowIsModuleLocal [
	"The reason the builtins-sync mechanism could not be reused.  While this
	module's ``len'' is shadowed, ``builtins.len'' itself still answers 3 -- so
	every OTHER module is unaffected.  A fix that synced the shared builtins
	singleton would make this read 7 and quietly corrupt the whole session."

	self assertMatchesCPythonAt: 'builtin_len_unaffected'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testTheShadowIsSeenFromInsideAClassMethod [
	"THE UPSTREAM NESTING, and the case a module-level fixture cannot reach.

	test_dynamic's test_globals_shadow_builtins defines its function inside a
	unittest.TestCase METHOD.  That is a different codegen context: in a class
	method ``self'' is the Python instance, not the module, so a probe emitted
	against ``self'' reads a dynamic instVar that is simply absent there and
	never fires -- no error, just the old answer.  The first cut of this fix
	declined the class context outright and scored 7/7 on a module-level
	fixture while the suite row it was written for still read
	``AssertionError: 3 != 7''.

	The emit now takes its receiver from ___moduleStoreReceiverExpr___, the
	same helper a ``global x'' store uses: ``self'' in the module body and its
	top-level defs, the module singleton spelled out inside a class method."

	self assertMatchesCPythonAt: 'shadow_inside_class_method'.

]

{ #category : 'Grail-Tests' }
GlobalsShadowBuiltinTestCase >> testTheUnshadowedCallIsUnchanged [
	"The common path: no shadow, the direct builtins send, same answers as
	before the probe existed.  First because everything else is a deviation
	from it -- if this breaks, the probe broke ordinary code."

	self assertMatchesCPythonAt: 'baseline_len'.
	self assertMatchesCPythonAt: 'baseline_sorted'.

]
