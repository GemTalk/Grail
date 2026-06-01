! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WeakrefModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WeakrefModuleTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WeakrefModuleTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakrefModuleTestCase removeAllMethods.
WeakrefModuleTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! WeakrefModuleTestCase — Python-level tests for the `weakref` stdlib module.
!
! The module is implemented in src/python/stdlib/weakref.py on top of the
! Smalltalk WeakReference ephemeron layer (src/weakref/WeakReference.gs). The
! Smalltalk-layer tests live in WeakReferenceTestCase; this file exercises the
! Python surface.
!
! Tests load tests/python/weakref_basic.py through importlib (the same path
! used by tests like NextIterTestCase) — Python's `eval:` scope has limitations
! around class definitions and instance-call dispatch that real module loading
! doesn't share. The Python file does all the weakref work and exposes results
! as module-level booleans the tests read via `testModule @env1:name`.
! ===============================================================================

category: 'Grail-Setup'
method: WeakrefModuleTestCase
setUp
	"Clear residual transient state from prior tests so the module-init
	 collection in weakref_basic.py reliably reaps its short-lived
	 referents. Without this preliminary sweep, surviving stack roots from
	 earlier tests can keep our test referents alive past the in-module
	 weakref._collect() call and the finalize-fired assertion sees nothing."

	| mods |
	System _generationScavenge_vmMarkSweep.
	System _vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons.
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'weakref_basic' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/weakref_basic.py')
		name: 'weakref_basic'.
%

! ------------------------------------------------------------------------------
! ref
! ------------------------------------------------------------------------------

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefValueWhileAlive
	"Calling a live ref returns its exact referent."

	self assert: (testModule @env1:ref_value_while_alive_is_referent) equals: true.
%

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefValueNoneAfterCollection

	self assert: (testModule @env1:ref_is_none_after_collection) equals: true.
%

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefCallbackFiresOnce

	self assert: (testModule @env1:callback_fired_once) equals: true.
%

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefCallbackSeesDeadReferent
	"By the time the callback runs, the referent answers None."

	self assert: (testModule @env1:callback_saw_dead_referent) equals: true.
%

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefEqualityWhileAlive
	"Two refs to equal-and-alive referents compare equal."

	self assert: (testModule @env1:refs_equal_while_alive) equals: true.
%

category: 'Grail-Tests-weakref-ref'
method: WeakrefModuleTestCase
testRefHashableAsDictKey

	self assert: (testModule @env1:ref_is_hashable_as_dict_key) equals: true.
%

! ------------------------------------------------------------------------------
! WeakValueDictionary
! ------------------------------------------------------------------------------

category: 'Grail-Tests-WeakValueDictionary'
method: WeakrefModuleTestCase
testWVDEntryVanishesWhenValueCollected

	self assert: (testModule @env1:wvd_entry_vanishes_when_value_collected)
		equals: true.
%

category: 'Grail-Tests-WeakValueDictionary'
method: WeakrefModuleTestCase
testWVDGetMissingReturnsDefault

	self assert: (testModule @env1:wvd_get_missing_returns_default) equals: true.
%

! ------------------------------------------------------------------------------
! WeakSet
! ------------------------------------------------------------------------------

category: 'Grail-Tests-WeakSet'
method: WeakrefModuleTestCase
testWeakSetMemberVanishesWhenCollected

	self assert: (testModule @env1:weakset_member_vanishes_when_collected)
		equals: true.
%

! ------------------------------------------------------------------------------
! finalize
! ------------------------------------------------------------------------------

category: 'Grail-Tests-finalize'
method: WeakrefModuleTestCase
testFinalizeAliveBeforeCollect

	self assert: (testModule @env1:finalize_alive_before_collect) equals: true.
%

category: 'Grail-Tests-finalize'
method: WeakrefModuleTestCase
testFinalizeFiresOnCollection

	self assert: (testModule @env1:finalize_fired_on_collection) equals: true.
%

category: 'Grail-Tests-finalize'
method: WeakrefModuleTestCase
testFinalizeNotAliveAfterFire

	self assert: (testModule @env1:finalize_not_alive_after_fire) equals: true.
%

category: 'Grail-Tests-finalize'
method: WeakrefModuleTestCase
testFinalizeExplicitCallReturns

	self assert: (testModule @env1:finalize_explicit_call_returns) equals: true.
%

category: 'Grail-Tests-finalize'
method: WeakrefModuleTestCase
testFinalizeInertAfterExplicitCall

	self assert: (testModule @env1:finalize_inert_after_explicit_call) equals: true.
%

! ------------------------------------------------------------------------------
! proxy
! ------------------------------------------------------------------------------

category: 'Grail-Tests-weakref-proxy'
method: WeakrefModuleTestCase
testProxyForwardsAttrAndMethod
	"weakref.proxy delegates attribute reads and method calls to the live
	referent without recursing in ``_Proxy.__get`` (the name-mangling stack
	overflow that broke flask.jsonify)."

	| r |
	r := testModule @env1:proxy_forwards_attr_and_method.
	self assert: (r @env1:__getitem__: 0) equals: 42.
	self assert: (r @env1:__getitem__: 1) equals: 'hi'
%

category: 'Grail-Tests-weakref-proxy'
method: WeakrefModuleTestCase
testProxyForwardsContainerOps
	"weakref.proxy delegates __getitem__ / __len__ / __contains__."

	| r |
	r := testModule @env1:proxy_forwards_container_ops.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 1) equals: 2.
	self assert: (r @env1:__getitem__: 2) equals: true
%
