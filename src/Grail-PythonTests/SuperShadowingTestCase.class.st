Class {
	#name : 'SuperShadowingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'staticProbe',
		'dynamicProbe',
		'mockProbe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperShadowingTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
SuperShadowingTestCase >> dynamicAt: aKey [
	^ dynamicProbe @env1:__getitem__: aKey

]

{ #category : 'Grail-Private' }
SuperShadowingTestCase >> mockAt: aKey [
	^ mockProbe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperShadowingTestCase >> setUp [
	"Two fixtures, because a module-level ``class super:'' shadows the name for
	the WHOLE module -- the static case cannot host its own control."

	staticProbe := self ___loadProbe___: 'super_shadowing_static'.
	dynamicProbe := self ___loadProbe___: 'super_shadowing_dynamic'.
	mockProbe := self ___loadProbe___: 'mock_patch_builtin_name'.

]

{ #category : 'Grail-Private' }
SuperShadowingTestCase >> staticAt: aKey [
	^ staticProbe @env1:__getitem__: aKey

]

{ #category : 'Grail-Tests - Static shadow' }
SuperShadowingTestCase >> testAModuleThatBindsSuperGetsItsOwnClassFromZeroArgSuper [
	"The shape the whole change is about.  ``super()'' inside a method of a
	module that defines ``class super:'' must call THAT class.  CallAst's
	zero-arg rewrite fired unconditionally and produced the builtin proxy, so
	this answered the proxy's AttributeError instead of 'truly super'."

	self assert: (self staticAt: 'zero_arg') @env0:asString equals: 'truly super'.

]

{ #category : 'Grail-Tests - Runtime shadow' }
SuperShadowingTestCase >> testANamePatchedOntoTheModuleAtRuntimeWins [
	"Nothing static can see this: the attribute is set long after the module
	body was compiled.  This is what test_super's test_shadowed_dynamic and
	test_shadowed_dynamic_two_arg do through mock.patch."

	self assert: (self dynamicAt: 'patched_zero_arg') @env0:asString
		equals: 'super super'.
	self assert: (self dynamicAt: 'patched_two_arg') @env0:asString equals: '(1, 2)'.

]

{ #category : 'Grail-Tests - mock.patch' }
SuperShadowingTestCase >> testAnExistingNameIsStillPatchedAndRestored [
	"The guard on the above: create-and-remove must not displace ordinary
	patch-and-restore."

	self assert: (self mockAt: 'existing_during') @env0:asString equals: 'replaced'.
	self assert: (self mockAt: 'existing_after') @env0:asString equals: 'kept'.

]

{ #category : 'Grail-Tests - Runtime shadow' }
SuperShadowingTestCase >> testAnUnpatchedModuleStillGetsTheBuiltin [
	"The control, and the one that matters most for regression: the probe must
	fall back to the proxy for every ordinary call.  A cooperative chain still
	reaches its base, and a name the base does not define is still an
	AttributeError at lookup time."

	self assert: (self dynamicAt: 'unpatched_chain') @env0:asString equals: 'Base.f'.
	self assert: (self dynamicAt: 'unpatched_missing_attr') @env0:asString
		equals: 'AttributeError'.

]

{ #category : 'Grail-Tests - mock.patch' }
SuperShadowingTestCase >> testAPatchThatCreatedANameRemovesItAgain [
	"Restoring it to the ``old value'' would leave ``super = None'' on the
	module -- which shadows the builtin for every later test in the file, so the
	failure would land somewhere else entirely."

	self assert: (self mockAt: 'after') equals: false.

]

{ #category : 'Grail-Tests - Runtime shadow' }
SuperShadowingTestCase >> testARuntimeShadowDisplacesCooperativeSuperToo [
	"As with the static shadow, and measured rather than assumed -- the fixture
	first predicted ``Base.f'' here and CPython raised: Derived.f no longer
	reaches Base.f, because ``super()'' is now MySuper() and MySuper has no f."

	self assert: (self dynamicAt: 'patched_derived') @env0:asString
		equals: 'AttributeError: ''MySuper'' object has no attribute ''f'''.

]

{ #category : 'Grail-Tests - Static shadow' }
SuperShadowingTestCase >> testAShadowDisplacesCooperativeSuperToo [
	"The sharp edge, and the reason a shadow cannot be treated as cosmetic: a
	class that WOULD have cooperated through super() reaches the shadowing class
	instead of its base.  A fix that honoured the shadow only where the builtin
	would have failed would pass the tests above and get this one wrong."

	self assert: (self staticAt: 'derived_gets_the_shadow_not_the_base') @env0:asString
		equals: 'truly super'.

]

{ #category : 'Grail-Tests - Static shadow' }
SuperShadowingTestCase >> testAShadowedSuperReceivesTheArgumentsTheSourceWrote [
	"``super(1, 2)'' under a shadow is an ORDINARY call of an ordinary class --
	the arguments go to its __init__ and are not interpreted as (type, obj).
	This one reaches the shadow through NameAst's bare-name handler rather than
	CallAst's 2-arg rewrite, since the arguments are constants, so it covers the
	second of the two emit sites."

	self assert: (self staticAt: 'two_arg') @env0:asString equals: '(1, 2)'.

]

{ #category : 'Grail-Tests - mock.patch' }
SuperShadowingTestCase >> testMockCanPatchABuiltinNameOntoAModule [
	"CPython allows this on purpose -- create=True when the name is a builtin
	and the target is a module -- so a test can shadow a builtin per module.
	Grail's port raised AttributeError before the patch was installed, so
	test_shadowed_dynamic failed in the HARNESS rather than in the code it was
	written to exercise."

	self assert: (self mockAt: 'before') equals: false.
	self assert: (self mockAt: 'during') equals: 42.

]

{ #category : 'Grail-Tests - mock.patch' }
SuperShadowingTestCase >> testPatchingAnUndefinedNonBuiltinNameStillRaises [
	"A name that is neither defined nor a builtin is a typo, and CPython reports
	it.  Widening create=True to everything would swallow it silently -- which is
	why the module + builtin-name test is kept rather than dropped for being
	awkward to express on Grail."

	self assert: (self mockAt: 'typo') @env0:asString equals: 'AttributeError'.

]

{ #category : 'Grail-Tests - Runtime shadow' }
SuperShadowingTestCase >> testRemovingTheRuntimeShadowRestoresTheBuiltin [
	"The probe reads the module attribute afresh each call, so deleting it puts
	the builtin back -- there is no cached decision to go stale."

	self assert: (self dynamicAt: 'restored_chain') @env0:asString equals: 'Base.f'.

]

{ #category : 'Grail-Tests - Builtins' }
SuperShadowingTestCase >> testSuperIsABuiltinsAttribute [
	"``builtins.super'' did not exist.  #super WAS in the populate list, but the
	Smalltalk class is ``Super'' -- ``super'' is a pseudo-variable and cannot be
	a class name -- so the lookup found nothing, and that loop binds only names
	that resolve, so it failed silently.  mock.patch consults exactly this to
	decide a builtin name may be shadowed on a module."

	| b |
	b := (Python at: #'builtins') @env1:instance.
	self assert: (b @env1:___pyAttrLoad___: #'super') == Super.

]

{ #category : 'Grail-Tests - Builtins' }
SuperShadowingTestCase >> testSuperIsListedByDirBuiltins [
	"hasattr is not enough on its own: mock's rule reads the NAME LIST, and
	dir(builtins) is built from selectors plus the eagerly-populated
	dynamic-instVars rather than from the same source."

	| b names |
	b := (Python at: #'builtins') @env1:instance.
	names := b @env1:__dir__.
	self assert: (names @env0:includes: 'super').

]

{ #category : 'Grail-Tests - Static shadow' }
SuperShadowingTestCase >> testTheNameSuperAsAValueIsTheShadowingClass [
	"Not merely callable-compatible: the NAME must resolve to the very class
	the module bound, so ``x is super'' holds."

	self assert: (self staticAt: 'value_is_the_shadowing_class') equals: true.
	self assert: (self staticAt: 'value_is_not_a_builtin') @env0:asString
		equals: 'super'.

]

{ #category : 'Grail-Tests - Static shadow' }
SuperShadowingTestCase >> testTheShadowingClassIsAnOrdinaryClass [
	"``isinstance(super(), super)'' -- once the name is bound to a plain class,
	everything about it is plain."

	self assert: (self staticAt: 'instance_of_shadow') equals: true.

]
