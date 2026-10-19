Class {
	#name : 'WeakReference',
	#superclass : 'Object',
	#instVars : [
		'holder',
		'hashCache'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-private' }
WeakReference class >> _flushProcessStackAreas [
	"Push every switched-out GsProcess's stack out to object memory, so that a
	 collection straight after sees only the references objects really hold.

	 The VM keeps the stacks of the last few processes that ran in C stack
	 areas -- OM_MAX_PROCESS_STACKS of them, GsProcess _maxProcessStacks, 8 on
	 4.0 -- and a stack held there is a GC ROOT until the area is reused.
	 Measured: park N processes nothing refers to, mark-sweep, and exactly the
	 last seven survive, whatever N is.  So a generator abandoned just before
	 gc.collect() -- the whole point of calling it -- is precisely the one
	 whose parked producer is pinned, and it outlives the collection that was
	 supposed to reclaim it (PythonGenerator>>___unrootParkedProducer___ has
	 the other half: the scheduler's own root).

	 A process that is PARKED holds its area, so parking one throwaway process
	 per area evicts every earlier occupant to object memory; the throwaways
	 then finish and give their areas back.  They run one priority ABOVE the
	 caller, so each fork and each signal switches straight to it and back:
	 no other green thread at the caller's priority gets a turn out of a
	 gc.collect()."

	| sched prio sems |
	sched := ProcessorScheduler scheduler.
	prio := (sched activePriority + 1) min: sched highestPriority.
	sems := (1 to: GsProcess _maxProcessStacks) collect: [:i | Semaphore new].
	sems do: [:sem | [sem wait] forkAt: prio].
	sems do: [:sem | sem signal]

]

{ #category : 'Grail-Weak-private' }
WeakReference class >> _on: anObject callback: aBlockOrNil [
	"Build the three-object chain: WeakReference -> WeakReferenceHolder
	 (dbTransient) -> WeakReferenceEphemeron (`beEphemeron: true`). The
	 user callback, if any, is wrapped to substitute the outer
	 WeakReference for its argument so callers can write `[:r | log add: r]`
	 and receive the ref, not the holder."

	| wr h ep wrap |
	wr := self new.
	wrap := aBlockOrNil
		ifNil: [nil]
		ifNotNil: [[:_ | aBlockOrNil value: wr]].
	ep := WeakReferenceEphemeron new.
	h := WeakReferenceHolder new _setEphemeron: ep callback: wrap.
	ep _setReferent: anObject holder: h.
	[ep beEphemeron: true] on: Error do: [:ex |
		"target ineligible (e.g. byte object); leave as a permanent strong ref"].
	wr _setHolder: h hashCache: anObject hash.
	^wr

]

{ #category : 'Grail-Weak-constructors' }
WeakReference class >> on: anObject [
	"Answer a weak reference to anObject (no callback)."

	^self _on: anObject callback: nil

]

{ #category : 'Grail-Weak-constructors' }
WeakReference class >> on: anObject callback: aBlock [
	"Answer a weak reference to anObject. When anObject is reclaimed, evaluate
	 aBlock with the resulting WeakReference as its argument. By then `value`
	 already answers nil. aBlock receives the WeakReference itself (not the
	 holder) — the holder wraps it at construction so #mourn's invocation
	 routes correctly."

	^self _on: anObject callback: aBlock

]

{ #category : 'Grail-Weak-private' }
WeakReference >> _setHolder: aHolder hashCache: aHash [

	holder := aHolder.
	hashCache := aHash.
	^self

]

{ #category : 'Grail-Weak-comparing' }
WeakReference >> = aWeakReference [
	"Equal while both referents are alive and equal; identity otherwise
	 (matches CPython)."

	self == aWeakReference ifTrue: [^true].
	(aWeakReference isKindOf: WeakReference) ifFalse: [^false].
	(self isDead or: [aWeakReference isDead]) ifTrue: [^false].
	^self value = aWeakReference value

]

{ #category : 'Grail-Weak-comparing' }
WeakReference >> hash [
	"Hash frozen at creation so the reference remains usable as a dict key
	 after its referent dies or after a commit + read-back."

	^hashCache

]

{ #category : 'Grail-Weak-testing' }
WeakReference >> isAlive [
	holder == nil ifTrue: [^false].
	^holder isAlive

]

{ #category : 'Grail-Weak-testing' }
WeakReference >> isDead [
	^self isAlive not

]

{ #category : 'Grail-Weak-accessing' }
WeakReference >> value [
	"Answer the referent if alive, nil if reclaimed or post-commit."

	holder == nil ifTrue: [^nil].
	^holder value

]
