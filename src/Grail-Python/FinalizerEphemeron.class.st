Class {
	#name : 'FinalizerEphemeron',
	#superclass : 'Object',
	#instVars : [
		'referent',
		'action',
		'argument'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-private' }
FinalizerEphemeron class >> _pendingCount [
	"How many objects are being watched -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [^ 0]) size

]

{ #category : 'Grail-Weak-private' }
FinalizerEphemeron class >> _queue [
	"Hooks whose objects have died, waiting for a safe point: triples of
	 { action. object. argument }."

	^ SessionTemps current at: #'GrailFinalizerQueue' ifAbsent: [
		SessionTemps current at: #'GrailFinalizerQueue' put: OrderedCollection new]

]

{ #category : 'Grail-Weak-private' }
FinalizerEphemeron class >> _queuedCount [
	"How many hooks are waiting for a safe point -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerQueue' ifAbsent: [^ 0]) size

]

{ #category : 'Grail-Weak-private' }
FinalizerEphemeron class >> _registry [
	"The session's pending watches -- see the class section for why there has
	 to be one, and why it is session-local."

	^ SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [
		SessionTemps current at: #'GrailFinalizerEphemerons' put: IdentitySet new]

]

{ #category : 'Grail-Weak-finalization' }
FinalizerEphemeron class >> _runPending [
	"Run every queued hook, oldest first, including any a hook queues while
	 this runs.  Not reentrant: a hook that registers a watch (asyncio's
	 finalizer creates an aclose() step) reaches here again, and the nested
	 call leaves the rest to the loop already running.

	 Each hook is guarded -- one that raises must not stop the others, or
	 escape into the code that happened to reach this safe point.  The guard
	 is deliberately not a bare AbstractException handler: the VM's stack
	 warning has to reach whoever can act on it, so it passes."

	| temps |
	temps := SessionTemps current.
	(temps at: #'GrailFinalizerQueue' ifAbsent: [^ self]) isEmpty ifTrue: [^ self].
	(temps at: #'GrailFinalizerRunning' ifAbsent: [false]) ifTrue: [^ self].
	temps at: #'GrailFinalizerRunning' put: true.
	"Take the whole batch and leave an empty queue behind for the hooks to add
	 to, round after round.  NOT removeFirst per job: measured, it made the
	 queue cost ~7 us a hook against ~0.06 us for this -- it dominated an
	 async for loop, which queues one hook per step."
	[[(temps at: #'GrailFinalizerQueue') isEmpty] whileFalse: [
		| jobs |
		jobs := temps at: #'GrailFinalizerQueue'.
		temps at: #'GrailFinalizerQueue' put: OrderedCollection new.
		jobs do: [:job |
			[(job at: 1) value: (job at: 2) value: (job at: 3)]
				on: AbstractException
				do: [:ex |
					((ex isKindOf: AlmostOutOfStack) or: [ex isKindOf: AlmostOutOfStackError])
						ifTrue: [ex pass].
					ex return: nil]]]]
		ensure: [temps at: #'GrailFinalizerRunning' put: false]

]

{ #category : 'Grail-Weak-constructors' }
FinalizerEphemeron class >> on: anObject do: aTwoArgBlock with: anArgument [
	"Evaluate aTwoArgBlock with anObject and anArgument once anObject has been
	 reclaimed (at the next safe point -- see the class section).  Answers the
	 ephemeron, or nil when anObject cannot be watched: an immediate or a
	 committed object, on which beEphemeron: silently has no effect, so the
	 watch would sit in the registry forever and never fire.

	 Registering is itself a safe point, so the hooks queued since the last
	 one run first."

	| ep |
	self _runPending.
	(anObject isSpecial or: [anObject isCommitted]) ifTrue: [^ nil].
	ep := self new _setReferent: anObject action: aTwoArgBlock argument: anArgument.
	[ep beEphemeron: true] on: Error do: [:ex | ^ nil].
	self _registry add: ep.
	^ ep

]

{ #category : 'Grail-Weak-private' }
FinalizerEphemeron >> _setReferent: anObject action: aTwoArgBlock argument: anArgument [

	referent := anObject.
	action := aTwoArgBlock.
	argument := anArgument.
	^ self

]

{ #category : 'Grail-Weak-testing' }
FinalizerEphemeron >> isWatching [
	"Still waiting for its object to die -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [^ false])
		includes: self

]

{ #category : 'Grail-Weak-finalization' }
FinalizerEphemeron >> mourn [
	"Sent by the finalization process once GC finds the referent reachable only
	 through ephemerons.  Leave the registry, hand the hook to the queue -- the
	 queue's strong reference is what keeps the object alive until its hook
	 runs -- and release every slot.  Nothing here runs the hook: this can be
	 ANY point in the session, a compile included (see the class section)."

	(SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [nil])
		ifNotNil: [:reg | reg remove: self ifAbsent: []].
	action == nil ifFalse: [
		FinalizerEphemeron _queue add: { action. referent. argument }].
	referent := nil.
	action := nil.
	argument := nil

]

{ #category : 'Grail-Weak-accessing' }
FinalizerEphemeron >> referent [
	"The watched object while it lives -- asked by a caller deciding whether a
	 collection is worth running (PythonCoroutine class >>
	 ___closeCapture___:).  Reading it holds it only as long as the
	 caller's temp does."

	^ referent

]
