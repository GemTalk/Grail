! ===============================================================================
! _thread — native low-level threading primitives, backed by GemStone GsProcess
! and Semaphore.  CPython's ``threading`` is built on ``_thread``; Grail follows
! the same layering (pure-Python ``threading`` on top of this).
!
! A gem is single-OS-threaded, so these are GsProcess green threads: concurrent
! and interleaved on one CPU (the scheduler switches at sends/allocations and on
! blocking I/O), never truly parallel — much like CPython threads under the GIL.
! Shared mutable state therefore still needs a lock for compound updates; the
! locks here are real (Semaphore-backed), not the old no-ops.  True parallelism
! needs separate gems (see GsExternalSession) — that is the ``multiprocessing``
! story, not this one.
! ===============================================================================

! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- PyThreadLock — a mutex (threading.Lock / allocate_lock()) -----------
expectvalue /Class
doit
Object subclass: 'PyThreadLock'
  instVarNames: #('sem')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #(#dbTransient)
%

expectvalue /Class
doit
PyThreadLock comment:
'A Python ``_thread.lock`` / ``threading.Lock`` — wraps a GemStone
``Semaphore forMutualExclusion``.  acquire() waits, release() signals,
locked() reports state.  Re-entrancy is NOT provided here (threading.RLock
adds that on top).'
%

expectvalue /Class
doit
PyThreadLock category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyThreadLock removeAllMethods: 0.
PyThreadLock removeAllMethods: 1.
PyThreadLock class removeAllMethods: 0.
PyThreadLock class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: PyThreadLock
create
	"A fresh, unlocked mutex."

	^ self new _initLock
%

category: 'Grail-Private'
method: PyThreadLock
_initLock
	sem := Semaphore forMutualExclusion.
	^ self
%

category: 'Grail-Private'
method: PyThreadLock
_sem
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
%

set compile_env: 1

category: 'Grail-Lock'
method: PyThreadLock
acquire
	"Block until the lock is available, then take it.  Returns True."

	self @env0:_sem @env0:wait.
	^ true
%

category: 'Grail-Lock'
method: PyThreadLock
acquire: blocking
	"``acquire(blocking)`` — when blocking is false, return immediately with
	whether the lock was taken."

	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	self @env0:_sem @env0:wait.
	^ true
%

category: 'Grail-Lock'
method: PyThreadLock
acquire: blocking _: timeout
	"``acquire(blocking, timeout)`` — timeout is in seconds (negative = forever)."

	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	(timeout @env0:< 0) @env0:ifTrue: [self @env0:_sem @env0:wait. ^ true].
	^ self @env0:_sem @env0:waitForMilliseconds: (timeout @env0:* 1000) @env0:truncated
%

category: 'Grail-Lock'
method: PyThreadLock
_acquire: positional kw: kwargs
	"Varargs ``acquire(blocking=True, timeout=-1)``."

	| n blocking timeout |
	n := positional @env0:size.
	blocking := (n @env0:>= 1) @env0:ifTrue: [positional @env0:at: 1] @env0:ifFalse: [true].
	timeout := (n @env0:>= 2) @env0:ifTrue: [positional @env0:at: 2] @env0:ifFalse: [-1].
	blocking @env0:ifFalse: [^ self @env0:_sem @env0:tryLock].
	(timeout @env0:< 0) @env0:ifTrue: [self @env0:_sem @env0:wait. ^ true].
	^ self @env0:_sem @env0:waitForMilliseconds: (timeout @env0:* 1000) @env0:truncated
%

category: 'Grail-Lock'
method: PyThreadLock
release
	"Release the lock (signal one waiter)."

	self @env0:_sem @env0:signal.
	^ None
%

category: 'Grail-Lock'
method: PyThreadLock
locked
	^ self @env0:_sem @env0:isLocked
%

category: 'Grail-Lock'
method: PyThreadLock
__enter__
	self @env0:_sem @env0:wait.
	^ self
%

category: 'Grail-Lock'
method: PyThreadLock
__exit__: excType _: excValue _: tb
	self @env0:_sem @env0:signal.
	^ false
%

! ------- PyThreadRLock — a re-entrant mutex (threading.RLock / _thread.RLock)
! Class definitions must be created in env 0: env-1 ``Object'' is the Python
! object class, which does not understand the subclass-creation selector.
set compile_env: 0

expectvalue /Class
doit
Object subclass: 'PyThreadRLock'
  instVarNames: #('sem' 'owner' 'count')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #(#dbTransient)
%

expectvalue /Class
doit
PyThreadRLock comment:
'A Python ``_thread.RLock`` — a mutex the OWNING thread may re-acquire.
Adds an owner (the acquiring GsProcess) and a recursion count on top of
PyThreadLock''s Semaphore: a second acquire by the owner just bumps the
count, and the Semaphore is only released when the count falls back to
zero.  Releasing a lock this thread does not hold is a RuntimeError, as
in CPython.

CPython''s functools does ``from _thread import RLock'' and uses one to
guard the lru_cache bookkeeping, so this is also what
``functools.RLock'' names.

#dbTransient for the same reason as PyThreadLock: a Semaphore cannot be
committed, and a freshly-faulted lock is correctly UNLOCKED because lock
state is meaningless across sessions.'
%

expectvalue /Class
doit
PyThreadRLock category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyThreadRLock removeAllMethods: 0.
PyThreadRLock removeAllMethods: 1.
PyThreadRLock class removeAllMethods: 0.
PyThreadRLock class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Private'
classmethod: PyThreadRLock
create
	"A fresh, unlocked re-entrant mutex."

	^ self new _initLock
%

category: 'Grail-Instantiation'
classmethod: PyThreadRLock
value: positional value: keywords
	"``RLock()'' — the Python class-call entry."

	^ self create
%

category: 'Grail-Private'
method: PyThreadRLock
_initLock
	sem := Semaphore forMutualExclusion.
	count := 0.
	^ self
%

category: 'Grail-Private'
method: PyThreadRLock
_sem
	"Lazy, session-safe Semaphore access — see PyThreadLock >> _sem."

	sem isNil ifTrue: [sem := Semaphore forMutualExclusion. count := 0].
	count isNil ifTrue: [count := 0].
	^ sem
%

category: 'Grail-Private'
method: PyThreadRLock
_take
	"Enter the lock, counting re-entry by the thread that already owns it."

	| me |
	me := GsProcess current.
	self _sem.
	owner == me ifTrue: [count := count + 1. ^ true].
	sem wait.
	owner := me.
	count := 1.
	^ true
%

category: 'Grail-Private'
method: PyThreadRLock
_drop
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
%

set compile_env: 1

category: 'Grail-Lock'
method: PyThreadRLock
acquire
	^ self @env0:_take
%

category: 'Grail-Lock'
method: PyThreadRLock
_acquire: positional kw: kwargs
	"Varargs ``acquire(blocking=True, timeout=-1)''.  A re-entrant acquire by
	the owner never blocks, so blocking/timeout only matter on first entry."

	| n blocking |
	n := positional @env0:isNil @env0:ifTrue: [0] @env0:ifFalse: [positional @env0:size].
	blocking := (n @env0:>= 1) @env0:ifTrue: [positional @env0:at: 1] @env0:ifFalse: [true].
	(blocking @env0:== false and: [(self @env0:owner) @env0:~~ (GsProcess @env0:current)])
		ifTrue: [
			(self @env0:_sem @env0:tryLock) @env0:ifFalse: [^ false].
			^ self @env0:_claimTried].
	^ self @env0:_take
%

category: 'Grail-Lock'
method: PyThreadRLock
release
	self @env0:_drop.
	^ None
%

category: 'Grail-Lock'
method: PyThreadRLock
locked
	^ self @env0:_sem @env0:isLocked
%

category: 'Grail-Lock'
method: PyThreadRLock
__enter__
	self @env0:_take.
	^ self
%

category: 'Grail-Lock'
method: PyThreadRLock
__exit__: excType _: excValue _: tb
	self @env0:_drop.
	^ false
%

set compile_env: 0

category: 'Grail-Private'
method: PyThreadRLock
owner
	^ owner
%

category: 'Grail-Private'
method: PyThreadRLock
_claimTried
	"Record ownership after a successful non-blocking tryLock."

	owner := GsProcess current.
	count := 1.
	^ true
%

set compile_env: 0

! ------- _thread module ------------------------------------------------------
set compile_env: 0

expectvalue /Class
doit
module subclass: '_thread'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_thread comment:
'The native ``_thread`` module (registered under that name in sys.modules).
Provides start_new_thread() over GsProcess fork, allocate_lock() over
Semaphore, and get_ident() from the active GsProcess.'
%

expectvalue /Class
doit
_thread category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_thread removeAllMethods: 0.
_thread removeAllMethods: 1.
_thread class removeAllMethods: 0.
_thread class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Threading'
classmethod: _thread
_spawnProcess: function args: args
	"Fork a GsProcess that runs ``function(*args)`` and return its identifier.
	Forking is done here, in env 0: a fork initiated from inside an env-1
	method leaves the new process unschedulable (the scheduler deadlocks when
	the parent later waits on it).  An unhandled error in the new thread
	terminates only that GsProcess; the Python bootstrap in ``threading`` does
	the finer-grained handling."

	| proc |
	proc := [
		[function @env1:value: args value: nil] on: Error do: [:e | nil]
	] fork.
	^ proc asOop
%

set compile_env: 1

category: 'Grail-Threading'
method: _thread
start_new_thread: function _: args
	"``start_new_thread(function, args)`` — see ``_spawnProcess:args:``."

	^ _thread @env0:_spawnProcess: function args: args
%

category: 'Grail-Threading'
method: _thread
_start_new_thread: positional kw: kwargs
	"Varargs ``start_new_thread(function, args[, kwargs])``."

	^ _thread @env0:_spawnProcess: (positional @env0:at: 1) args: (positional @env0:at: 2)
%

category: 'Grail-Threading'
method: _thread
allocate_lock
	"A fresh unlocked mutex (``_thread.allocate_lock()``)."

	^ PyThreadLock @env0:create
%

category: 'Grail-Threading'
method: _thread
get_ident
	"Identifier of the calling thread (the active GsProcess)."

	^ GsProcess @env0:current @env0:asOop
%

category: 'Grail-Initialization'
method: _thread
initialize
	"``RLock'' is a CLASS, so it has to be the SymbolDictionary entry
	rather than a module method -- a method of that name would shadow the
	entry, and a method can neither be subclassed nor construct through
	``RLock()''.  ``from _thread import RLock'' is how CPython's functools
	gets it."

	self @env0:at: #RLock put: PyThreadRLock
%

! Leave the compile environment at 0 so the next input file's class
! definitions are created in env 0 (env 1 ``Object'' is the Python object
! class, which makes a class-definition doit fail).
set compile_env: 0
