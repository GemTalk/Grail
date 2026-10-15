"A Python ``_thread.RLock`` — a mutex the OWNING thread may re-acquire.
Adds an owner (the acquiring GsProcess) and a recursion count on top of
PyThreadLock's Semaphore: a second acquire by the owner just bumps the
count, and the Semaphore is only released when the count falls back to
zero.  Releasing a lock this thread does not hold is a RuntimeError, as
in CPython.

CPython's functools does ``from _thread import RLock' and uses one to
guard the lru_cache bookkeeping, so this is also what
``functools.RLock' names.

#dbTransient for the same reason as PyThreadLock: a Semaphore cannot be
committed, and a freshly-faulted lock is correctly UNLOCKED because lock
state is meaningless across sessions."
Class {
	#name : 'PyThreadRLock',
	#superclass : 'Object',
	#instVars : [
		'sem',
		'owner',
		'count'
	],
	#gs_options : [
		'dbTransient'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyThreadRLock class >> create [
	"A fresh, unlocked re-entrant mutex."

	^ self new _initLock

]

{ #category : 'Grail-Instantiation' }
PyThreadRLock class >> value: positional value: keywords [
	"``RLock()'' — the Python class-call entry."

	^ self create

]

{ #category : 'Grail-Private' }
PyThreadRLock >> _claimTried [
	"Record ownership after a successful non-blocking tryLock."

	owner := GsProcess current.
	count := 1.
	^ true

]

{ #category : 'Grail-Private' }
PyThreadRLock >> _drop [
	"Leave the lock, signalling the Semaphore only on the outermost exit."

	self _sem.
	owner == GsProcess current ifFalse: [
		^ (Python at: #RuntimeError)
			___signal___: 'cannot release un-acquired lock'].
	count := count - 1.
	count <= 0 ifTrue: [
		owner := nil.
		count := 0.
		sem signal].
	^ nil

]

{ #category : 'Grail-Private' }
PyThreadRLock >> _initLock [
	sem := Semaphore forMutualExclusion.
	count := 0.
	^ self

]

{ #category : 'Grail-Private' }
PyThreadRLock >> _sem [
	"Lazy, session-safe Semaphore access — see PyThreadLock >> _sem."

	sem isNil ifTrue: [sem := Semaphore forMutualExclusion. count := 0].
	count isNil ifTrue: [count := 0].
	^ sem

]

{ #category : 'Grail-Private' }
PyThreadRLock >> _take [
	"Enter the lock, counting re-entry by the thread that already owns it."

	| me |
	me := GsProcess current.
	self _sem.
	owner == me ifTrue: [count := count + 1. ^ true].
	sem wait.
	owner := me.
	count := 1.
	^ true

]

{ #category : 'Grail-Private' }
PyThreadRLock >> owner [
	^ owner

]
