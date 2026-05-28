! ===============================================================================
! WeakReferenceTestCase.gs — Smalltalk tests for the weak-reference layer
! defined in WeakReference.gs.
!
! Subclass of PythonTestCase so the test runner picks these up via
! `PythonTestCase suite`. The tests exercise the Smalltalk API directly (no
! Python `eval:` involved); they share the suite only for discovery.
!
! Object death uses real GemStone GC. Each death test drops the only known
! strong reference to a fresh subject (assigns nil), forces collection with
! `System _generationScavenge_vmMarkSweep` (via #collectGarbage), then asserts
! the weak structure observed the death. GemStone clears the ephemerons'
! references automatically and #mourn fires through `GcFinalizeNotification`.
! ===============================================================================

! ------------------- Superclass / dictionary check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
WeakReference ifNil: [self error: 'WeakReference is not defined. Load WeakReference.gs first.'].
%

! ------------------- Forward references
run
| dict |
dict := System myUserProfile symbolList objectNamed: #'PythonTests'.
#( #'WeakReferenceTestSubject' #'WeakReferenceTestCase' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
%

! ===============================================================================
! WeakReferenceTestSubject — a minimal referenceable object for the tests.
!   Has value-based equality (on `tag`) so WeakReference equality can be tested,
!   and a `doubled` method so message forwarding through WeakProxy can be tested.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReferenceTestSubject'
  instVarNames: #( tag )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WeakReferenceTestSubject category: 'Grail-Weak-Tests'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakReferenceTestSubject removeAllMethods.
WeakReferenceTestSubject class removeAllMethods.
%

set compile_env: 0

category: 'accessing'
method: WeakReferenceTestSubject
tag
	^tag
%

category: 'accessing'
method: WeakReferenceTestSubject
tag: anObject
	tag := anObject
%

category: 'accessing'
method: WeakReferenceTestSubject
doubled
	"A selector Object does not implement, so WeakProxy forwarding can be tested."
	^tag * 2
%

category: 'comparing'
method: WeakReferenceTestSubject
= anObject
	^(anObject isKindOf: WeakReferenceTestSubject) and: [tag = anObject tag]
%

category: 'comparing'
method: WeakReferenceTestSubject
hash
	^tag hash
%

! ===============================================================================
! WeakReferenceTestCase
! ===============================================================================

expectvalue /Class
doit
PythonTestCase subclass: 'WeakReferenceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WeakReferenceTestCase category: 'Grail-Weak-Tests'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakReferenceTestCase removeAllMethods.
WeakReferenceTestCase class removeAllMethods.
%

set compile_env: 0

! ------------------------------------------------------------------------------
! Support
! ------------------------------------------------------------------------------

category: 'Grail-Weak-Tests-support'
method: WeakReferenceTestCase
collectGarbage
	"Force reclamation of unreferenced non-persistent objects and drain the
	 ephemeron finalization queue so #mourn (callbacks, finalizers,
	 weak-collection pruning) fires synchronously before this returns. The
	 scavenge alone fires the ephemerons and clears their isEphemeron bit, but
	 #mourn is dispatched on a separate finalization process — in a TestCase
	 method context the async signal isn't always delivered before the next
	 assertion, so we drain the queue here directly."

	System _generationScavenge_vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons
%

! ------------------------------------------------------------------------------
! WeakReference — live referent (no collection required)
! ------------------------------------------------------------------------------

category: 'Grail-Tests-ref-live'
method: WeakReferenceTestCase
testValueWhileAlive
	"A live reference answers its exact referent."

	| subject ref |
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject.
	self assert: ref value == subject.
	self assert: ref isAlive.
	self deny: ref isDead.
%

category: 'Grail-Tests-ref-live'
method: WeakReferenceTestCase
testEqualityWhileAlive
	"Two references to equal, live referents compare equal."

	| a b |
	a := WeakReferenceTestSubject new tag: 7.
	b := WeakReferenceTestSubject new tag: 7.
	self assert: (WeakReference on: a) = (WeakReference on: b).
%

category: 'Grail-Tests-ref-live'
method: WeakReferenceTestCase
testUsableAsDictionaryKey
	"A reference is hashable and usable as a dictionary key while alive."

	| subject ref d |
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject.
	d := Dictionary new.
	d at: ref put: 99.
	self assert: (d at: ref) = 99.
%

! ------------------------------------------------------------------------------
! WeakReference — death (real GemStone GC: drop the strong ref, then scavenge)
! ------------------------------------------------------------------------------

category: 'Grail-Tests-ref-death'
method: WeakReferenceTestCase
testValueNilAfterCollection
	"Once the only strong reference is dropped and GC runs, the reference
	 answers nil."

	| subject ref |
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject.
	subject := nil.
	self collectGarbage.
	self assert: ref value isNil.
	self assert: ref isDead.
	self deny: ref isAlive.
%

category: 'Grail-Tests-ref-death'
method: WeakReferenceTestCase
testCallbackFiredOnCollection
	"The callback runs exactly once when the referent is collected, receiving
	 the reference itself."

	| subject ref log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject callback: [:r | log add: r].
	subject := nil.
	self collectGarbage.
	self assert: log size = 1.
	self assert: log first == ref.
%

category: 'Grail-Tests-ref-death'
method: WeakReferenceTestCase
testReferentNilInsideCallback
	"By the time the callback runs, the referent is already gone: the
	 reference answers nil during the callback."

	| subject ref log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject callback: [:r | log add: r value].
	subject := nil.
	self collectGarbage.
	self assert: log size = 1.
	self assert: log first isNil.
%

! ------------------------------------------------------------------------------
! WeakProxy
! ------------------------------------------------------------------------------

category: 'Grail-Tests-proxy'
method: WeakReferenceTestCase
testProxyForwardsMessage
	"A live proxy forwards messages to its referent."

	| subject proxy |
	subject := WeakReferenceTestSubject new tag: 21.
	proxy := WeakProxy on: subject.
	self assert: proxy doubled = 42.
%

category: 'Grail-Tests-proxy'
method: WeakReferenceTestCase
testProxyRaisesAfterCollection
	"Using a proxy after its referent is collected raises ReferenceError."

	| subject proxy |
	subject := WeakReferenceTestSubject new tag: 21.
	proxy := WeakProxy on: subject.
	subject := nil.
	self collectGarbage.
	self should: [proxy doubled] raise: ReferenceError.
%

! ------------------------------------------------------------------------------
! WeakValueDictionary
! ------------------------------------------------------------------------------

category: 'Grail-Tests-WeakValueDictionary'
method: WeakReferenceTestCase
testWVDLikeDictWhileAlive
	"While its value is alive, the dictionary behaves normally."

	| d value |
	value := WeakReferenceTestSubject new tag: 9.
	d := WeakValueDictionary new.
	d at: #k put: value.
	self assert: (d at: #k) == value.
	self assert: d size = 1.
	self assert: (d includesKey: #k).
%

category: 'Grail-Tests-WeakValueDictionary'
method: WeakReferenceTestCase
testWVDEntryVanishesWhenValueCollected
	"An entry disappears once its value is collected."

	| d value |
	value := WeakReferenceTestSubject new tag: 9.
	d := WeakValueDictionary new.
	d at: #k put: value.
	value := nil.
	self collectGarbage.
	self deny: (d includesKey: #k).
	self assert: d size = 0.
%

category: 'Grail-Tests-WeakValueDictionary'
method: WeakReferenceTestCase
testWVDAtIfAbsent
	"at:ifAbsent: answers the absent block for a missing key."

	| d |
	d := WeakValueDictionary new.
	self assert: (d at: #missing ifAbsent: [#fallback]) = #fallback.
%

! ------------------------------------------------------------------------------
! WeakKeyDictionary
! ------------------------------------------------------------------------------

category: 'Grail-Tests-WeakKeyDictionary'
method: WeakReferenceTestCase
testWKDLikeDictWhileAlive
	"While its key is alive, the dictionary behaves normally."

	| d key |
	key := WeakReferenceTestSubject new tag: 3.
	d := WeakKeyDictionary new.
	d at: key put: 42.
	self assert: (d at: key) = 42.
	self assert: d size = 1.
	self assert: (d includesKey: key).
%

category: 'Grail-Tests-WeakKeyDictionary'
method: WeakReferenceTestCase
testWKDEntryVanishesWhenKeyCollected
	"An entry disappears once its key is collected."

	| d key |
	key := WeakReferenceTestSubject new tag: 3.
	d := WeakKeyDictionary new.
	d at: key put: 42.
	key := nil.
	self collectGarbage.
	self assert: d size = 0.
%

! ------------------------------------------------------------------------------
! WeakSet
! ------------------------------------------------------------------------------

category: 'Grail-Tests-WeakSet'
method: WeakReferenceTestCase
testWeakSetMembershipWhileAlive
	"A live member is contained in the set."

	| s x |
	x := WeakReferenceTestSubject new tag: 1.
	s := WeakSet new.
	s add: x.
	self assert: (s includes: x).
	self assert: s size = 1.
%

category: 'Grail-Tests-WeakSet'
method: WeakReferenceTestCase
testWeakSetMemberVanishesWhenCollected
	"A member drops out of the set once collected."

	| s x |
	x := WeakReferenceTestSubject new tag: 1.
	s := WeakSet new.
	s add: x.
	x := nil.
	self collectGarbage.
	self assert: s size = 0.
%

! ------------------------------------------------------------------------------
! Finalizer
! ------------------------------------------------------------------------------

category: 'Grail-Tests-finalize'
method: WeakReferenceTestCase
testFinalizerAliveInitially
	"A freshly registered finalizer is alive."

	| subject f |
	subject := WeakReferenceTestSubject new tag: 1.
	f := Finalizer on: subject block: [nil].
	self assert: f isAlive.
%

category: 'Grail-Tests-finalize'
method: WeakReferenceTestCase
testFinalizerFiresOnCollection
	"The finalizer's block runs when the referent is collected."

	| subject f log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 1.
	f := Finalizer on: subject block: [log add: #done].
	subject := nil.
	self collectGarbage.
	self assert: log size = 1.
	self assert: log first = #done.
	self deny: f isAlive.
%

category: 'Grail-Tests-finalize'
method: WeakReferenceTestCase
testFinalizerValueRunsEarlyAndReturns
	"Sending #value runs the block immediately and answers its result."

	| subject f |
	subject := WeakReferenceTestSubject new tag: 1.
	f := Finalizer on: subject block: [17].
	self assert: f value = 17.
%

category: 'Grail-Tests-finalize'
method: WeakReferenceTestCase
testFinalizerInertAfterValue
	"After being run once, the finalizer is dead and a second #value is a no-op."

	| subject f log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 1.
	f := Finalizer on: subject block: [log add: 1].
	f value.
	f value.
	self deny: f isAlive.
	self assert: log size = 1.
%
