Class {
	#name : 'WeakReferenceTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-Weak-Tests'
}

{ #category : 'Grail-Weak-Tests-support' }
WeakReferenceTestCase >> collectGarbage [
	"Force reclamation of unreferenced non-persistent objects and drain the
	 ephemeron finalization queue so #mourn (callbacks, finalizers,
	 weak-collection pruning) fires synchronously before this returns. The
	 scavenge alone fires the ephemerons and clears their isEphemeron bit, but
	 #mourn is dispatched on a separate finalization process — in a TestCase
	 method context the async signal isn't always delivered before the next
	 assertion, so we drain the queue here directly."

	System _generationScavenge_vmMarkSweep.
	GcFinalizeNotification new _finalizeEphemerons

]

{ #category : 'Grail-Tests-FinalizerEphemeron' }
WeakReferenceTestCase >> testAnImmediateCannotBeWatched [
	"beEphemeron: silently does nothing to an immediate, so a watch on one
	 would never fire and never leave the registry."

	self assert: (FinalizerEphemeron on: 42 do: [:obj :arg | nil] with: nil) isNil.
	self assert: (FinalizerEphemeron on: nil do: [:obj :arg | nil] with: nil) isNil.

]

{ #category : 'Grail-Tests-FinalizerEphemeron' }
WeakReferenceTestCase >> testARaisingFinalizerDoesNotEscapeTheCollection [
	"Mourning runs wherever the VM finalizes; a hook that raises must not
	 unwind the code it interrupted."

	| subject |
	subject := WeakReferenceTestSubject new tag: 1.
	FinalizerEphemeron on: subject do: [:obj :arg | obj error: 'boom'] with: nil.
	subject := nil.
	self collectGarbage.
	FinalizerEphemeron _runPending.
	self assert: FinalizerEphemeron _queuedCount = 0.

]

{ #category : 'Grail-Tests-ref-death' }
WeakReferenceTestCase >> testCallbackFiredOnCollection [
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

]

{ #category : 'Grail-Tests-ref-live' }
WeakReferenceTestCase >> testEqualityWhileAlive [
	"Two references to equal, live referents compare equal."

	| a b |
	a := WeakReferenceTestSubject new tag: 7.
	b := WeakReferenceTestSubject new tag: 7.
	self assert: (WeakReference on: a) = (WeakReference on: b).

]

{ #category : 'Grail-Tests-FinalizerEphemeron' }
WeakReferenceTestCase >> testFinalizerDoesNotFireWhileReachable [
	| subject log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 1.
	FinalizerEphemeron on: subject do: [:obj :arg | arg add: obj] with: log.
	self collectGarbage.
	FinalizerEphemeron _runPending.
	self assert: log isEmpty.
	self assert: subject tag = 1.

]

{ #category : 'Grail-Tests-FinalizerEphemeron' }
WeakReferenceTestCase >> testFinalizerIsHandedTheObjectAndItsArgument [
	"Unlike a weakref callback, the hook sees the object that died -- the
	 ephemeron resurrects it -- plus the datum registered with it, and runs
	 once.  The watch then leaves the registry."

	| subject log ep |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 7.
	ep := FinalizerEphemeron
		on: subject
		do: [:obj :arg | arg add: obj tag]
		with: log.
	self assert: ep isWatching.
	subject := nil.
	self collectGarbage.
	FinalizerEphemeron _runPending.
	self assert: log asArray = #(7).
	self deny: ep isWatching.
	self collectGarbage.
	FinalizerEphemeron _runPending.
	self assert: log size = 1.

]

{ #category : 'Grail-Tests-FinalizerEphemeron' }
WeakReferenceTestCase >> testMourningOnlyQueuesTheHook [
	"Mourning can land anywhere -- a compile included -- so it only QUEUES the
	 hook; a safe point runs it.  collectGarbage here is the bare scavenge +
	 drain, deliberately not gc.collect(), which is such a safe point."

	| subject log |
	log := OrderedCollection new.
	subject := WeakReferenceTestSubject new tag: 3.
	FinalizerEphemeron on: subject do: [:obj :arg | arg add: obj tag] with: log.
	subject := nil.
	self collectGarbage.
	self assert: log isEmpty.
	self assert: FinalizerEphemeron _queuedCount >= 1.
	FinalizerEphemeron _runPending.
	self assert: log asArray = #(3).
	self assert: FinalizerEphemeron _queuedCount = 0.

]

{ #category : 'Grail-Tests-ref-death' }
WeakReferenceTestCase >> testReferentNilInsideCallback [
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

]

{ #category : 'Grail-Tests-ref-live' }
WeakReferenceTestCase >> testUsableAsDictionaryKey [
	"A reference is hashable and usable as a dictionary key while alive."

	| subject ref d |
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject.
	d := Dictionary new.
	d at: ref put: 99.
	self assert: (d at: ref) = 99.

]

{ #category : 'Grail-Tests-ref-death' }
WeakReferenceTestCase >> testValueNilAfterCollection [
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

]

{ #category : 'Grail-Tests-ref-live' }
WeakReferenceTestCase >> testValueWhileAlive [
	"A live reference answers its exact referent."

	| subject ref |
	subject := WeakReferenceTestSubject new tag: 1.
	ref := WeakReference on: subject.
	self assert: ref value == subject.
	self assert: ref isAlive.
	self deny: ref isDead.

]

{ #category : 'Grail-Tests-WeakSet' }
WeakReferenceTestCase >> testWeakSetMembershipWhileAlive [
	"A live member is contained in the set."

	| s x |
	x := WeakReferenceTestSubject new tag: 1.
	s := WeakSet new.
	s add: x.
	self assert: (s includes: x).
	self assert: s size = 1.

]

{ #category : 'Grail-Tests-WeakSet' }
WeakReferenceTestCase >> testWeakSetMemberVanishesWhenCollected [
	"A member drops out of the set once collected."

	| s x |
	x := WeakReferenceTestSubject new tag: 1.
	s := WeakSet new.
	s add: x.
	x := nil.
	self collectGarbage.
	self assert: s size = 0.

]

{ #category : 'Grail-Tests-WeakKeyDictionary' }
WeakReferenceTestCase >> testWKDEntryVanishesWhenKeyCollected [
	"An entry disappears once its key is collected."

	| d key |
	key := WeakReferenceTestSubject new tag: 3.
	d := WeakKeyDictionary new.
	d at: key put: 42.
	key := nil.
	self collectGarbage.
	self assert: d size = 0.

]

{ #category : 'Grail-Tests-WeakKeyDictionary' }
WeakReferenceTestCase >> testWKDLikeDictWhileAlive [
	"While its key is alive, the dictionary behaves normally."

	| d key |
	key := WeakReferenceTestSubject new tag: 3.
	d := WeakKeyDictionary new.
	d at: key put: 42.
	self assert: (d at: key) = 42.
	self assert: d size = 1.
	self assert: (d includesKey: key).

]

{ #category : 'Grail-Tests-WeakValueDictionary' }
WeakReferenceTestCase >> testWVDAtIfAbsent [
	"at:ifAbsent: answers the absent block for a missing key."

	| d |
	d := WeakValueDictionary new.
	self assert: (d at: #missing ifAbsent: [#fallback]) = #fallback.

]

{ #category : 'Grail-Tests-WeakValueDictionary' }
WeakReferenceTestCase >> testWVDEntryVanishesWhenValueCollected [
	"An entry disappears once its value is collected."

	| d value |
	value := WeakReferenceTestSubject new tag: 9.
	d := WeakValueDictionary new.
	d at: #k put: value.
	value := nil.
	self collectGarbage.
	self deny: (d includesKey: #k).
	self assert: d size = 0.

]

{ #category : 'Grail-Tests-WeakValueDictionary' }
WeakReferenceTestCase >> testWVDLikeDictWhileAlive [
	"While its value is alive, the dictionary behaves normally."

	| d value |
	value := WeakReferenceTestSubject new tag: 9.
	d := WeakValueDictionary new.
	d at: #k put: value.
	self assert: (d at: #k) == value.
	self assert: d size = 1.
	self assert: (d includesKey: #k).

]
