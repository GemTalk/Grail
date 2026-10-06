! ------------------- Superclass check
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ------- gemstone class (Python 'gemstone' module)
expectvalue /Class
doit
NativeModule subclass: 'gemstone'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
gemstone comment:
'Python gemstone module.

Provides basic metadata about the Grail runtime and interoperability
with existing GemStone data and operations:

  * gemstone.system — the GemStone System class.  Transaction control
    goes through it: gemstone.system.commit() / gemstone.system.abort()
    (env-1 class-side methods on System, installed by System.gs).
  * gemstone.mySymbolList — a list of the session''s SymbolDictionary
    instances (GsCurrentSession currentSession symbolList).
  * gemstone[name] — namespace lookup via the subscript protocol.

Methods on this class are real env-1 fast-path methods, dispatched
directly via `gemstone.method(args)` Python calls compiled to
`((gemstone instance) method: args)` Smalltalk sends.  Value attributes
(system, mySymbolList, version) live in the Grail-Accessors category so
attribute reads perform them instead of wrapping a BoundMethod.
'
%

expectvalue /Class
doit
gemstone category: 'Grail-Modules'
%

! ===============================================================================
! gemstone Module (Python 'gemstone' module)
! ===============================================================================

! ------------------- Remove existing Python methods from gemstone
expectvalue /Metaclass3
doit
gemstone removeAllMethods: 1.
gemstone class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: gemstone
initialize
	"No-op. The `module>>instance` class method still calls `initialize`
	on the newly-created instance, so this stub keeps that contract."
%

! ===============================================================================
! Subscript protocol — namespace access via gemstone[name]
! ===============================================================================

category: 'Grail-Subscript Protocol'
method: gemstone
__delitem__: key
	"Remove the object named key from UserGlobals. Raises KeyError if not found."

	| name |
	name := key @env0:asSymbol.
	(UserGlobals @env0:includesKey: name) ifFalse: [
		KeyError ___signal___: key
	].
	UserGlobals @env0:removeKey: name.
	^ None
%

category: 'Grail-Subscript Protocol'
method: gemstone
__getitem__: key
	"Return the object named key from the current session. Raises KeyError if not found."

	| name session result |
	name := key @env0:asSymbol.
	session := GsCurrentSession @env0:currentSession.
	result := session @env0:objectNamed: name.
	result ifNil: [
		KeyError ___signal___: key
	].
	^ result
%

category: 'Grail-Subscript Protocol'
method: gemstone
__setitem__: key _: value
	"Set the object named key in the current session. If an Association exists, update it; otherwise add to UserGlobals."

	| name session assoc |
	name := key @env0:asSymbol.
	session := GsCurrentSession @env0:currentSession.
	assoc := session @env0:resolveSymbol: name.
	assoc ifNotNil: [
		assoc @env0:value: value.
		^ None
	].
	UserGlobals @env0:at: name put: value.
	^ None
%

! ===============================================================================
! GemStone interoperability — value attributes
! ===============================================================================

category: 'Grail-Accessors'
method: gemstone
mySymbolList
	"Python gemstone.mySymbolList — a Python list of the current session's
	SymbolDictionary instances, from GsCurrentSession currentSession
	symbolList.  A fresh list is built per read so Python-side
	mutation of the list cannot disturb the session's real symbol list
	(the SymbolDictionary elements themselves are the live objects).

	Compiled in the Grail-Accessors category so a bare attribute read
	performs this method and returns the value (see ___pyAttrLoad___'s
	module branch) rather than wrapping it as a BoundMethod."

	^ list @env0:withAll: (GsCurrentSession @env0:currentSession @env0:symbolList)
%

category: 'Grail-Accessors'
method: gemstone
system
	"Python gemstone.system — the GemStone System class.  Transaction
	control is dispatched through it: gemstone.system.commit() and
	gemstone.system.abort() resolve to env-1 class-side methods compiled
	on System by System.gs (replacing the former module-level
	gemstone.commit()/gemstone.abort()).

	Compiled in the Grail-Accessors category so a bare attribute read
	performs this method and returns the class."

	^ System
%

category: 'Grail-Accessors'
method: gemstone
repository
	"Python gemstone.repository — the SystemRepository instance.
	Repository administration is dispatched through it:
	gemstone.repository.full_backup(path) and friends resolve to env-1
	instance methods compiled on Repository by Repository.gs, the same
	relationship gemstone.system has to System.gs.  The destructive
	operations live there, not here: a unary method on this module class
	is PERFORMED by a bare attribute read, so a module-level
	mark_for_collection would run from any introspection that reads every
	name -- help(), inspect.getmembers(), a REPL completer.  (dir() itself
	answers names, not values, and is safe.)  Instance attribute reads only
	wrap.

	Compiled in the Grail-Accessors category so a bare attribute read
	performs this method and returns the instance."

	^ SystemRepository
%

! ===============================================================================
! Sessions -- primitives for gemdb.sessions
! ===============================================================================

category: 'Grail-Accessors'
method: gemstone
session_serial
	"Python gemstone.session_serial — this session's serial number
	(System session), the id sessions are listed and described by."

	^ System @env0:session
%

category: 'Grail-Accessors'
method: gemstone
session_ids
	"Python gemstone.session_ids — the serial numbers of every current
	session (System currentSessions), system gems included, as a Python
	list.  Describe one with gemstone.describe_session(id)."

	^ list @env0:withAll: (System @env0:currentSessions)
%

category: 'Grail-Session Introspection'
method: gemstone
describe_session: aSerial
	"Python gemstone.describe_session(serial) -- a Python dict describing
	one session, from System descriptionOfSession: (positional fields;
	the indices below are the stable documented ones): 1 the UserProfile,
	2 the gem's process id, 3 the gem's host.  Field 17, when present,
	names system gems ('symbolgem', ...); nil for ordinary logins.
	Reading another session's description requires the SessionAccess
	privilege; a missing or logged-out serial raises KeyError."

	| d result name |
	d := [System @env0:descriptionOfSession: aSerial]
		@env0:on: Error do: [:ex |
			KeyError ___signal___: aSerial].
	result := dict ___new___.
	result __setitem__: (str @env0:withAll: 'session_id') _: aSerial.
	result __setitem__: (str @env0:withAll: 'user')
		_: (str @env0:withAll: ((d @env0:at: 1) @env0:userId)).
	result __setitem__: (str @env0:withAll: 'pid') _: (d @env0:at: 2).
	result __setitem__: (str @env0:withAll: 'host')
		_: (str @env0:withAll: (d @env0:at: 3)).
	name := None.
	((d @env0:size) @env0:>= 17) ifTrue: [
		(d @env0:at: 17) == nil ifFalse: [
			name := str @env0:withAll: ((d @env0:at: 17) @env0:asString)]].
	result __setitem__: (str @env0:withAll: 'name') _: name.
	result __setitem__: (str @env0:withAll: 'current')
		_: aSerial @env0:= (System @env0:session).
	^ result
%

! ===============================================================================
! Transaction state -- primitives for the gemdb module
! ===============================================================================

category: 'Grail-Accessors'
method: gemstone
needs_commit
	"Python gemstone.needs_commit -- true when the session's current
	transaction holds changes a commit would write (System needsCommit).
	A value attribute (Grail-Accessors), like `system` and `version`:
	a bare attribute read performs it.

	The gemdb module's transaction() entry check reads this to refuse a
	block while user changes are pending; see src/python/stdlib/gemdb/
	and docs/GemDB_Module.md.  Import machinery must not leave this true
	on a deployed image -- see the guarded store in functools.gs
	initialize for the one offender found and fixed."

	^ System @env0:needsCommit
%

category: 'Grail-Accessors'
method: gemstone
uncommitted_imports
	"Python gemstone.uncommitted_imports -- the dotted names of modules THIS
	session imported COLD and has not committed, as a sorted list of str;
	empty when every module the session imported is already in the
	repository.  A value attribute (Grail-Accessors), like ``needs_commit'':
	a bare attribute read performs it.

	Answers the question ``needs_commit is true -- what wrote?'' for the one
	writer a user never typed.  Compiling a module creates its class in
	PythonModules, in the running transaction, so a cold import dirties the
	session before the user's first statement; gemdb's clean-entry check then
	refuses, and without this it describes changes the user did not make.
	The gemdb refusals name these modules and say what to do about them (see
	docs/GemDB_Module.md, ``Imports belong inside the transaction that commits
	them'').

	Also readable on its own as ``what would my commit publish, module-wise''.
	It answers modules only: other uncommitted work is not reported here, so
	an empty list does NOT mean the session is clean -- that is what
	needs_commit is for.

	It names a module this session imported COLD and one it REBUILT -- an edit
	to an already-deployed module recompiles its methods in place and keeps the
	committed class's identity (doc §5 D2), which is still a write and is the
	one a developer meets in their own edit loop.  A plain warm bind answers
	nothing."

	^ list @env0:withAll: ((importlib @env0:___uncommittedImportedModuleNames___)
		@env0:collect: [:each | str @env0:withAll: each])
%

category: 'Grail-Accessors'
method: gemstone
transaction_conflicts
	"Python gemstone.transaction_conflicts -- System transactionConflicts
	as a Python dict.  A value attribute (Grail-Accessors): a bare
	attribute read performs it.  Symbol keys become strs; a Symbol value
	(the commitResult) becomes a str; an Array value (the conflicting
	objects) becomes a list of the LIVE objects; nil becomes None;
	anything else passes through unconverted.

	Read it AFTER a failed commit and BEFORE the abort that releases the
	failed transaction -- abort discards the conflict information."

	| result |
	result := dict ___new___.
	(System @env0:transactionConflicts) @env0:keysAndValuesDo: [:k :v | | key val |
		key := str @env0:withAll: (k @env0:asString).
		val := v.
		(v @env0:isKindOf: Symbol) ifTrue: [val := str @env0:withAll: (v @env0:asString)].
		(v @env0:isKindOf: Array) ifTrue: [val := list @env0:withAll: v].
		v == nil ifTrue: [val := None].
		result __setitem__: key _: val.
	].
	^ result
%

! ===============================================================================
! Session-local storage
! ===============================================================================

category: 'Grail-Session State'
method: gemstone
sessionDict: name
	"Return a session-local Python dict registered under `name`.

	The dict lives in SessionTemps, so it is created fresh for each Gem
	process and is NEVER committed.  Grail uses it for caches that hold
	process-bound objects — compiled regex patterns (SrePattern) and jinja2
	lexers — which must not leak into the commit set or collide between
	concurrent sessions.  Python callers go through the `SessionDict` proxy
	in stdlib `_grail_session.py`, which forwards every dict operation here."

	| temps key |
	temps := SessionTemps @env0:current.
	key := ('___GrailSessionDict___' @env0:, name @env0:asString) @env0:asSymbol.
	^ temps @env0:at: key ifAbsentPut: [dict ___new___]
%

! ===============================================================================
! Continuations -- the primitive under stdlib ``durable``
! ===============================================================================
! A GsProcess continuation is a committable copy of the running stack.  Captured
! from Python, committed, and resumed by ``value:`` in ANOTHER gem, the Python
! frames carry on with their locals intact (measured 2026-09-23: a 16-frame
! stack through importlib and a Python function).  What the copy must not reach
! is anything session-bound -- a Semaphore, the Processor, a GsFile, a Grail
! generator (a forked GsProcess parked on a Semaphore) -- or the commit refuses
! it by class name.

category: 'Grail-Built-in Functions'
method: gemstone
___captureContinuation___
	"Python gemstone.___captureContinuation___() -- answer a continuation of
	the calling stack, this frame included.  The FIRST return is the
	GsProcess; every later ``value: x'' sent to it (from any session) returns
	x from this same call, with the caller's locals restored."

	^ GsProcess @env0:continuationFromLevel: 1
%

category: 'Grail-Continuations'
method: gemstone
___isContinuation___: anObject
	"True when anObject is what ___captureContinuation___ answered on its first
	return, as opposed to a value it was resumed with."

	^ (anObject @env0:isKindOf: GsProcess) and: [anObject @env0:isContinuation]
%

category: 'Grail-Continuations'
method: gemstone
___resumeContinuation___: aContinuation _: aValue
	"Replace the CURRENT process's stack with aContinuation's and continue it,
	with aValue as the result of the capturing call.  Nothing after this send
	runs in this process: when the resumed stack completes, its own base
	frames do -- so the caller forks a process whose only job is this send."

	^ aContinuation @env0:value: aValue
%

category: 'Grail-Continuations'
method: gemstone
___callCatchingVMErrors___: aCallable _: args _: kwargs
	"Python gemstone.___callCatchingVMErrors___(fn, args, kwargs) --
	fn(*args, **kwargs), with a GemStone Error raised under it (an MNU in a
	runtime method, a failed primitive) re-raised as a Python RuntimeError
	naming it.  Python's except cannot catch a Smalltalk Error, and
	_thread's process wrapper swallows one, so a durable workflow that hit
	one ended silently and its run stayed 'running'.  Python exceptions are
	not Errors and pass through untouched."

	^ [ aCallable @env1:value: args value: ((kwargs @env0:isNil or: [ kwargs @env1:__len__ @env0:= 0 ])
			ifTrue: [ nil ] ifFalse: [ kwargs ]) ]
		@env0:on: Error
		do: [:e | RuntimeError ___signal___: ('GemStone error ' @env0:, e @env0:number @env0:printString
				@env0:, ': ' @env0:, e @env0:messageText @env0:asString) ]
%

category: 'Grail-Continuations'
method: gemstone
___processFor___: anIdent
	"Python gemstone.___processFor___(ident) -- the GsProcess that
	_thread.start_new_thread answered ``ident'' (its oop) for.  Call it while
	the thread can still be running, and keep the result: an ended process
	may be collected and its oop reused."

	^ Object @env0:_objectForOop: anIdent
%

category: 'Grail-Continuations'
method: gemstone
___processEnded___: aProcess
	"Python gemstone.___processEnded___(p) -- True once the GsProcess has
	terminated (or was never one), or has stopped in the debugger: a signal
	no handler took that is not an Error (so _thread's on: Error did not end
	it) leaves a process in status 'debug', waiting for a debugger that a
	gem running a script never attaches.  Nothing is terminated here: a
	process that resumed a continuation is also left in 'debug' (the
	resumed stack runs in a new GsProcess, measured on 4.0), and its stack
	may hold copies of the workflow's unwind blocks."

	(aProcess @env0:isKindOf: GsProcess) ifFalse: [ ^ true ].
	aProcess @env0:_isTerminated ifTrue: [ ^ true ].
	^ aProcess @env0:_statusString @env0:= 'debug'
%

category: 'Grail-Continuations'
method: gemstone
___cleanupFramesIn___: aContinuation
	"Python gemstone.___cleanupFramesIn___(k) -- the names of the functions
	whose try statement (except or finally) or with statement is open in
	aContinuation, between the capture and durable's _entry: (a list of str;
	empty when none).

	stdlib durable refuses such a checkpoint.  A cleanup or handler block --
	the argument of ensure:, ifCurtailed: or ___ensureFinally___:finally:, or
	the handler of on:do: -- is created before the capture and valued after
	the resume, and GemStone gives it the home VariableContext of the
	capture, not of the resumed frame (Kermit 52132; measured on 4.0.0-a2
	and 4.0.0.a4).  Its writes to the function's locals are lost, and its
	reads are stale.  A handler is valued only when its exception is raised,
	so a try/except around a park came out right in most runs and wrong in
	some: ``except ValueError as e: total = e.args[0] * 100'' after the
	resume left total unchanged (6, not 600) in 2 of 4 IR CI jobs."

	| names stop linkHome |
	names := OrderedCollection @env0:new.
	stop := false.
	linkHome := [:blk | (blk @env0:isKindOf: ExecBlock)
		ifTrue: [ blk @env0:method @env0:homeMethod ] ifFalse: [ nil ] ].
	1 @env0:to: aContinuation @env0:stackDepth do: [:i | | f meth sel home |
		stop ifFalse: [
			f := aContinuation @env0:_frameContentsAt: i.
			meth := f @env0:isNil ifTrue: [ nil ] ifFalse: [ f @env0:at: 1 ].
			meth @env0:notNil ifTrue: [
				((meth @env0:isMethodForBlock and: [ meth @env0:homeMethod @env0:selector == #'_entry:' ])
					and: [ (meth @env0:homeMethod @env0:inClass @env0:name) @env0:= #durable ])
					ifTrue: [ stop := true ]
					ifFalse: [
						sel := meth @env0:selector.
						home := nil.
						((sel == #'ensure:') or: [ sel == #'ifCurtailed:' ])
							ifTrue: [ home := linkHome @env0:value: (f @env0:at: 10) ].
						sel == #'___ensureFinally___:finally:'
							ifTrue: [ home := linkHome @env0:value: (f @env0:at: 11) ].
						"A Python except clause: on: a PyLazyExceptSelector, or on:
						BaseException for a bare except (TryAst >>
						___emitIRSelectorFor___:index:token:on:), plus the
						AbstractException handler a try statement adds.  NOT the
						loop and comprehension handlers (PythonBreak, PythonContinue,
						PythonLoopDrained, PythonReturn): they resume right, and
						every loop has them."
						(((sel == #'on:do:') or: [ sel == #'onException:do:' ])
							and: [ | sig |
								sig := f @env0:at: 11.
								(sig @env0:isKindOf: PyLazyExceptSelector)
									or: [ sig == BaseException or: [ sig == AbstractException ] ] ])
							ifTrue: [ home := linkHome @env0:value: (f @env0:at: 12) ].
						"Not Grail's own handlers: ___callCatchingVMErrors___:_:_: (this
						module) wraps every workflow, and its handler reads no
						workflow local."
						(home @env0:notNil and: [ (home @env0:inClass == ExecBlock) @env0:not
								and: [ (home @env0:inClass == BaseException @env0:class) @env0:not
								and: [ (home @env0:inClass == self @env0:class) @env0:not ] ] ])
							ifTrue: [ | nm |
								nm := home @env0:selector @env0:asString.
								(nm @env0:indexOf: $:) @env0:> 0
									ifTrue: [ nm := nm @env0:copyFrom: 1 to: (nm @env0:indexOf: $:) @env0:- 1 ].
								(names @env0:includes: nm) ifFalse: [ names @env0:add: nm ] ] ] ] ] ].
	^ list @env0:withAll: (names @env0:collect: [:n | str @env0:withAll: n])
%

category: 'Grail-Built-in Functions'
method: gemstone
___tryCommit___
	"Commit, answering True; False on a conflict; or a str saying why GemStone
	REFUSED the commit outright -- a session-bound object (Semaphore, GsFile,
	the Processor, a generator's process) reachable from the commit set.
	commitTransaction signals that as TransactionError 2407 rather than
	answering false, and a Smalltalk error crossing into Python cannot be
	caught there, so the refusal is caught here and handed over as data.
	After a refusal the session must abort before it can commit again
	(ImproperOperation 2424, measured on 4.0).

	A FUNCTION category, like ___captureContinuation___ and
	___commitOrRefusal___: in any other, an attribute read through an alias
	(``import gemstone as g; g.___tryCommit___()'') PERFORMS the method --
	committing at the read -- and then calls the Boolean.  Only the literal
	``gemstone.f()'' is a direct send that never reads the attribute."

	| outcome |
	outcome := self ___commitOrRefusal___.
	^ (outcome @env0:isKindOf: tuple)
		ifTrue: [outcome @env0:at: 2]
		ifFalse: [outcome]
%

category: 'Grail-Built-in Functions'
method: gemstone
___commitOrRefusal___
	"Commit, answering True; False on a conflict; or, when GemStone REFUSED
	the commit outright, a tuple (error number, message, detail).
	___tryCommit___ with the number kept, so a caller can tell why, and for a
	2407 the detail: a tuple (path, sentence) naming where the refused object
	is held -- ``gemdb.root['jobs'] (a generator) holds a Semaphore, which
	GemStone never commits'' -- or None when no path is found.  2407 is a session-bound
	object (an instancesNonPersistent instance -- a generator's Semaphore)
	reachable from the commit set; 2403/2424 is a commit attempted after such
	a refusal without the abort it needs.  gemdb.commit() and
	gemdb.transaction() use this (docs/App_Namespaces_Design.md §6.2).
	System commit here is the env-1 one (System.gs): the D4 flush, then
	commitTransaction.

	Filed under a FUNCTION category on purpose.  An attribute read of a
	unary module method PERFORMS it unless its category is one of those
	(Object >> the unary branch of the module attribute read), and only
	the literal ``gemstone.f()'' compiles to a direct send.  gemdb calls
	this through its ``_gemstone'' alias, where a perform-on-read would
	commit at the read and then call the Boolean."

	^ [ System commit ]
		@env0:on: TransactionError
		do: [:ex | | detail |
			"Where the refused object is held, found NOW: the handler runs before
			anyone aborts, while the failed flush's marks are still there
			(importlib >> ___grailRefusalPathTo___:).  Only on this path, so a
			successful commit never pays for the search."
			detail := ex @env0:number == 2407
				ifTrue: [importlib @env0:___grailRefusalDetail___:
					(ex @env0:gsArguments @env0:atOrNil: 1)]
				ifFalse: [nil].
			"None, not nil, when no path was found: gemdb tests ``detail is not
			None'' and then unpacks it, and a Smalltalk nil passes that test and
			cannot be unpacked -- the refusal became a TypeError.  The search
			scans objects in memory and has missed under a loaded run
			(run_tests.sh's gemdb phase, 2026-10-06)."
			detail == nil ifTrue: [detail := None].
			ex @env0:return: (tuple
				@env0:with: ex @env0:number
				with: (str @env0:withAll: (ex @env0:messageText))
				with: detail)]
%

! ===============================================================================
! Deploy audit
! ===============================================================================

category: 'Grail-Deploy Audit'
method: gemstone
deploy_check: aModule
	"Python gemstone.deploy_check(module) -- a PRE-DEPLOY audit
	(docs/Persistent_Modules_and_Classes.md §6.3).  Walks the
	not-yet-committed object graph reachable from the module and returns a
	Python list of one-line descriptions of every SESSION-BOUND value it
	would sweep into the repository (open files/sockets, semaphores,
	threads, raw C pointers, un-recompilable regex patterns / matches,
	weak references), each with a class-path from the module.  An empty
	list means the module's new closure is commit-clean.

	Accepts a module object or its dotted-name string.  Never commits."

	| name |
	name := (aModule isKindOf: CharacterCollection)
		ifTrue: [aModule @env0:asString]
		ifFalse: [(aModule __name__) @env0:asString].
	^ importlib @env0:___deployCheck___: name
%

! ===============================================================================
! Metadata
! ===============================================================================

category: 'Grail-Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str @env0:withAll: (System @env0:stoneVersionAt: 'gsVersion')
%

set compile_env: 0
