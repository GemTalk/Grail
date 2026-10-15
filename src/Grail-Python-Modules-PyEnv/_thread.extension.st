Extension { #name : '_thread' }

{ #category : 'Grail-Built-in Functions' }
_thread >> _get_context [
	"Grail-only, for contextvars: the calling thread's current Context, or
	None before it has one.

	PER THREAD, as CPython's.  It was one session-wide slot, which every
	green thread shared: a worker that ran while a task was inside
	Context.run saw that task's context as its own (and wrote into it), and a
	new thread started inside its creator's context where CPython starts it in
	an empty one.  A thread started by start_new_thread keeps its context on
	its own GsProcess (environmentAt:), so it dies with the thread.  The MAIN
	thread keeps it in SessionTemps: it is not one process -- a later GCI call
	can run on a fresh one -- and its context must last the session.  Neither
	is committed.  Resolved through ___pythonThreadOf___: like get_ident, so a
	generator body shares its resumer's context."

	| p |
	p := _thread @env0:___contextProcess___.
	p == nil ifTrue: [
		^ SessionTemps @env0:current @env0:at: #'GrailPyMainContext' otherwise: None].
	^ p @env0:environmentAt: #'GrailPyContext' ifAbsent: [None]

]

{ #category : 'Grail-Built-in Functions' }
_thread >> _set_context: aContext [
	"Grail-only: make aContext the calling thread's current Context.  See
	_get_context."

	| p |
	p := _thread @env0:___contextProcess___.
	p == nil
		ifTrue: [SessionTemps @env0:current @env0:at: #'GrailPyMainContext' put: aContext]
		ifFalse: [p @env0:environmentAt: #'GrailPyContext' put: aContext].
	^ None

]

{ #category : 'Grail-Threading' }
_thread >> _start_new_thread: positional kw: kwargs [
	"Varargs ``start_new_thread(function, args[, kwargs])``."

	^ _thread @env0:_spawnProcess: (positional @env0:at: 1) args: (positional @env0:at: 2)

]

{ #category : 'Grail-Built-in Functions' }
_thread >> allocate_lock [
	"A fresh unlocked mutex (``_thread.allocate_lock()``)."

	^ PyThreadLock @env0:create

]

{ #category : 'Grail-Built-in Functions' }
_thread >> get_ident [
	"Identifier of the calling THREAD.  A generator or coroutine body runs on a
	GsProcess of its own, but in Python it runs on the thread that resumed it,
	so the answer is that thread's process (importlib class >>
	___pythonThreadOf___:), as CPython's get_ident() inside a generator is its
	consumer's.  Answering the body's own process gave every generator a thread
	identity of its own: a lock owned in a coroutine read as owned elsewhere,
	and a per-thread table keyed on it -- contextvars' current context -- split
	one thread's state across its generators."

	^ (importlib @env0:___pythonThreadOf___: GsProcess @env0:current) @env0:asOop

]

{ #category : 'Grail-Initialization' }
_thread >> initialize [
	"``RLock'' is a CLASS, so it has to be the SymbolDictionary entry
	rather than a module method -- a method of that name would shadow the
	entry, and a method can neither be subclassed nor construct through
	``RLock()''.  ``from _thread import RLock'' is how CPython's functools
	gets it."

	self @env0:at: #RLock put: PyThreadRLock

]

{ #category : 'Grail-Threading' }
_thread >> start_new_thread: function _: args [
	"``start_new_thread(function, args)`` — see ``_spawnProcess:args:``."

	^ _thread @env0:_spawnProcess: function args: args

]
