"A Python ``_thread.lock`` / ``threading.Lock`` — wraps a GemStone
``Semaphore forMutualExclusion``.  acquire() waits, release() signals,
locked() reports state.  Re-entrancy is NOT provided here (threading.RLock
adds that on top)."
Class {
	#name : 'PyThreadLock',
	#superclass : 'Object',
	#instVars : [
		'sem'
	],
	#gs_options : [
		'dbTransient'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
PyThreadLock class >> create [
	"A fresh, unlocked mutex."

	^ self new _initLock

]

{ #category : 'Grail-Private' }
PyThreadLock >> _initLock [
	sem := Semaphore forMutualExclusion.
	^ self

]

{ #category : 'Grail-Private' }
PyThreadLock >> _sem [
	"Lazy, SESSION-SAFE Semaphore access.  The class is #dbTransient:
	Semaphores are a non-persistent kernel class (committing one raises
	TransactionError 2407), and module-level ``threading.Lock()`` objects
	sit in real app closures (flask / werkzeug), so a deployed canonical
	module (docs/Persistent_Modules_and_Classes.md par.10) must be able
	to commit a lock.  dbTransient commits the lock's IDENTITY with its
	slots unwritten; in a later session the slot faults in nil and this
	accessor re-creates the mutex on first use.  A freshly-faulted lock
	is therefore UNLOCKED -- correct, since mutex state is meaningless
	across sessions."

	sem isNil ifTrue: [sem := Semaphore forMutualExclusion].
	^ sem

]
