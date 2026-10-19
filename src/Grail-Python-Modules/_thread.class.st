"The native ``_thread`` module (registered under that name in sys.modules).
Provides start_new_thread() over GsProcess fork, allocate_lock() over
Semaphore, and get_ident() from the active GsProcess."
Class {
	#name : '_thread',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Threading' }
_thread class >> ___contextProcess___ [
	"The process holding the calling thread's contextvars context, or nil
	for the main thread (whose context is the session's; see _get_context)."

	| p |
	p := importlib ___pythonThreadOf___: GsProcess current.
	^ (p environmentAt: #'GrailPyThread' ifAbsent: [false])
		ifTrue: [p]
		ifFalse: [nil]

]

{ #category : 'Grail-Threading' }
_thread class >> _spawnProcess: function args: args [
	"Fork a GsProcess that runs ``function(*args)`` and return its identifier.
	Forking is done here, in env 0: a fork initiated from inside an env-1
	method leaves the new process unschedulable (the scheduler deadlocks when
	the parent later waits on it).  An unhandled error in the new thread
	terminates only that GsProcess; the Python bootstrap in ``threading`` does
	the finer-grained handling."

	| proc |
	proc := [
		"Marks this process as a Python THREAD, so its contextvars context is
		its own (_thread >> _get_context).  Every other process -- the gem's
		main process, and whichever process a later GCI call runs on -- is the
		main thread and shares the session's."
		GsProcess current environmentAt: #'GrailPyThread' put: true.
		[function @env1:value: args value: nil] on: Error do: [:e |
			"REPORTED, not swallowed.  threading's bootstrap reports every
			Python exception through excepthook; what reaches here is a
			GemStone error below it, and dropping it silently made a thread
			simply vanish -- a blocking portal's event-loop thread, with its
			caller left waiting on a future nothing would ever set."
			[GsFile stderr
				nextPutAll: 'Exception in thread (uncaught GemStone error): ';
				nextPutAll: e description asString; lf;
				nextPutAll: (GsProcess stackReportToLevel: 200); lf]
					on: Error do: [:e2 | nil].
			nil]
	] fork.
	^ proc asOop

]
