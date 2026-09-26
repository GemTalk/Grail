! ===============================================================================
! WeakReference.gs — Smalltalk-native weak-reference layer for Grail, built on
! GemStone ephemerons, made commit-safe with a three-class split.
!
! The dbTransient + ephemeron commit contract is: a dbTransient wrapper hides
! its slot contents from commit, so an ephemeron *held in* a dbTransient slot
! does not trip commit's ephemeron check. A dbTransient instance that *is
! itself* an ephemeron still trips it. This file uses the first pattern:
!
!   WeakReference          — regular class, persists normally. Holds
!                            (holder, hashCache). hashCache is a SmallInteger
!                            frozen from the referent's hash at creation, so
!                            a ref keeps a stable hash even after its referent
!                            dies (matching CPython).
!
!   WeakReferenceHolder    — dbTransient. Holds (ephemeron, callback, dead).
!                            Is NOT itself an ephemeron — it just holds one
!                            in its first slot. When the WeakReference is
!                            committed, the reference to the holder persists
!                            by identity, but the holder's slots (including
!                            the link to the inner ephemeron) are not written;
!                            so commit never reaches the ephemeron at all.
!
!   WeakReferenceEphemeron — regular class with `beEphemeron: true` set on
!                            instances. First instVar `referent` is the
!                            ephemeron key; second instVar `holder` is a
!                            back-pointer so #mourn can dispatch to the
!                            holder's _ephemeronFired hook.
!
! Ephemeron firing: GC fires the inner ephemeron, the bit clears
! synchronously, the ephemeron is queued for #mourn. #mourn dispatches to
! the holder's _ephemeronFired which flips dead first (so a callback
! observes ref() == None), runs the user callback wrapped to receive the
! *outer* WeakReference, then nils its references. The ephemeron's own
! #mourn then nils its referent and back-pointer.
!
! After commit + read-back: holder.ephemeron is nil (dbTransient erased it),
! so the ref reports dead while keeping its frozen hash — the same semantics
! CPython gives weakrefs across pickle.
!
! Constraints inherited from ephemerons (kernel docs on Object>>beEphemeron:):
!   - Has no effect if the ephemeron's first instVar is a special (immediate)
!     or committed object. The Python layer rejects such referents with
!     TypeError up front; here we still construct the chain and treat it as
!     permanently alive (degenerate but harmless at the Smalltalk level).
! ===============================================================================

! ------------------- Superclass / dictionary check
run
Object ifNil: [self error: 'Object is not defined.'].
(System myUserProfile symbolList objectNamed: #'Python')
	ifNil: [self error: 'Python dictionary is not defined. Check file ordering.'].
%

! ------------------- Forward references (mutual class refs in method bodies)
run
| dict |
dict := System myUserProfile symbolList objectNamed: #'Python'.
#( #'WeakReference' #'WeakReferenceHolder' #'WeakReferenceEphemeron'
   #'FinalizerEphemeron'
   #'WeakValueDictionary' #'WeakKeyDictionary' #'WeakSet' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
%

! ===============================================================================
! WeakReferenceEphemeron — the inner ephemeron object. Regular class (not
!   dbTransient); `beEphemeron: true` is set on its instances. First instVar
!   `referent` is the ephemeron key; second instVar `holder` is a back-pointer
!   the #mourn handler uses to dispatch to the holder's _ephemeronFired hook.
!
!   Reachable from a persistent graph only via WeakReferenceHolder's first
!   slot. Since WeakReferenceHolder is dbTransient, commit's walk never
!   crosses into it, so the ephemeron is never visited during commit and
!   never trips commit's ephemeron check.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReferenceEphemeron'
  instVarNames: #( referent holder )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakReferenceEphemeron category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakReferenceEphemeron removeAllMethods.
WeakReferenceEphemeron class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-private'
method: WeakReferenceEphemeron
_setReferent: anObject holder: aHolder

	referent := anObject.
	holder := aHolder.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakReferenceEphemeron
referent
	"Answer the weakly-held referent (nil once mourned)."

	^referent
%

category: 'Grail-Weak-finalization'
method: WeakReferenceEphemeron
mourn
	"Sent by the finalization process after GC fires this ephemeron.
	 Dispatch to the holder's hook (which marks dead, runs the callback,
	 and releases its references), then nil our own slots so the
	 ephemeron is fully released for GC."

	holder ifNotNil: [holder _ephemeronFired].
	holder := nil.
	referent := nil
%

! ===============================================================================
! WeakReferenceHolder — dbTransient wrapper that holds the inner ephemeron
!   in its first slot. Instances commit cleanly: the dbTransient option means
!   none of (ephemeron, callback, dead) are written to disk, and since commit
!   does not walk a dbTransient instance's slots, the inner ephemeron is
!   never visited. After commit + read-back the holder's slots are nil and
!   the WeakReference reports dead.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReferenceHolder'
  instVarNames: #( ephemeron callback dead )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( #dbTransient )
%

expectvalue /Class
doit
WeakReferenceHolder category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakReferenceHolder removeAllMethods.
WeakReferenceHolder class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-private'
method: WeakReferenceHolder
_setEphemeron: anEphemeron callback: aBlock
	"Initialise an unfired holder. The caller wires #beEphemeron: true on
	 the inner ephemeron separately so it can fall back gracefully when the
	 referent is ineligible (immediate / committed)."

	ephemeron := anEphemeron.
	callback := aBlock.
	dead := false.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakReferenceHolder
value
	"Answer the referent if still alive, or nil if reclaimed or post-commit.
	 nil-tolerant: after commit + read-back, `dead` is nil rather than
	 false; treating nil-dead-with-nil-ephemeron as dead handles that path."

	dead == true ifTrue: [^nil].
	ephemeron ifNil: [^nil].
	^ephemeron referent
%

category: 'Grail-Weak-testing'
method: WeakReferenceHolder
isAlive
	dead == true ifTrue: [^false].
	ephemeron ifNil: [^false].
	^ephemeron referent ~~ nil
%

category: 'Grail-Weak-testing'
method: WeakReferenceHolder
isDead
	^self isAlive not
%

category: 'Grail-Weak-finalization'
method: WeakReferenceHolder
_ephemeronFired
	"Dispatched by the inner ephemeron's #mourn. Mark dead first so the
	 callback observes #value == nil (Python's 'referent is None inside the
	 callback'), then run the user callback (wrapped at construction time to
	 substitute the outer WeakReference for its argument), then release
	 internal references."

	dead == true ifTrue: [^self].
	dead := true.
	callback ifNotNil: [callback value: self].
	callback := nil.
	ephemeron := nil
%

! ===============================================================================
! WeakReference — public commit-safe weak-reference object. Delegates the
!   ephemeron behavior to a WeakReferenceHolder; persists hashCache directly
!   so a once-alive ref keeps a stable dict-key hash across commit / death.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReference'
  instVarNames: #( holder hashCache )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakReference category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakReference removeAllMethods.
WeakReference class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: WeakReference
on: anObject
	"Answer a weak reference to anObject (no callback)."

	^self _on: anObject callback: nil
%

category: 'Grail-Weak-constructors'
classmethod: WeakReference
on: anObject callback: aBlock
	"Answer a weak reference to anObject. When anObject is reclaimed, evaluate
	 aBlock with the resulting WeakReference as its argument. By then `value`
	 already answers nil. aBlock receives the WeakReference itself (not the
	 holder) — the holder wraps it at construction so #mourn's invocation
	 routes correctly."

	^self _on: anObject callback: aBlock
%

category: 'Grail-Weak-private'
classmethod: WeakReference
_on: anObject callback: aBlockOrNil
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
%

category: 'Grail-Weak-private'
method: WeakReference
_setHolder: aHolder hashCache: aHash

	holder := aHolder.
	hashCache := aHash.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakReference
value
	"Answer the referent if alive, nil if reclaimed or post-commit."

	holder == nil ifTrue: [^nil].
	^holder value
%

category: 'Grail-Weak-testing'
method: WeakReference
isAlive
	holder == nil ifTrue: [^false].
	^holder isAlive
%

category: 'Grail-Weak-testing'
method: WeakReference
isDead
	^self isAlive not
%

category: 'Grail-Weak-comparing'
method: WeakReference
= aWeakReference
	"Equal while both referents are alive and equal; identity otherwise
	 (matches CPython)."

	self == aWeakReference ifTrue: [^true].
	(aWeakReference isKindOf: WeakReference) ifFalse: [^false].
	(self isDead or: [aWeakReference isDead]) ifTrue: [^false].
	^self value = aWeakReference value
%

category: 'Grail-Weak-comparing'
method: WeakReference
hash
	"Hash frozen at creation so the reference remains usable as a dict key
	 after its referent dies or after a commit + read-back."

	^hashCache
%

! ------------------- Python protocol (env 1) — re-exported as weakref.ref
set compile_env: 1

category: 'Grail-Weak-Python'
classmethod: WeakReference
__new__: anObject
	"weakref.ref(obj) — create a weak reference."

	^self @env0:on: anObject
%

category: 'Grail-Weak-Python'
classmethod: WeakReference
__new__: anObject _: aCallback
	"weakref.ref(obj, callback) — create a weak reference whose callback runs
	 when obj is reclaimed. The Python callable (an ExecBlock taking
	 (positional, kwargs)) is wrapped in a 1-arg Smalltalk block so #mourn's
	 simple `callback value: self` invocation routes through Python's
	 (positional, kwargs) calling convention."

	aCallback == None ifTrue: [^self @env0:on: anObject].
	^self @env0:on: anObject
		callback: [:r | aCallback @env0:value: (Array @env0:with: r) value: nil]
%

category: 'Grail-Weak-Python'
method: WeakReference
__call__
	"r() — return the referent or None."

	| v |
	v := self @env0:value.
	v == nil ifTrue: [^None].
	^v
%

category: 'Grail-Weak-Python'
method: WeakReference
__eq__: other
	^self @env0:= other
%

category: 'Grail-Weak-Python'
method: WeakReference
__ne__: other
	^(self @env0:= other) @env0:not
%

category: 'Grail-Weak-Python'
method: WeakReference
__hash__
	^self @env0:hash
%

category: 'Grail-Weak-Python'
method: WeakReference
value: positional value: kwargs
	"Python `r()` — legacy callable form. CallAst falls back to
	 `obj value: {args} value: kwargs` for instance calls, so route to
	 __call__ here. (Python's weakref.ref(obj)() expects to return the
	 referent or None; we ignore args since ref calls take no arguments.)"

	^self @env1:__call__
%

category: 'Grail-Weak-Python'
method: WeakReference
___pyCallValue___: positional kw: kwargs
	"The INDIRECT call protocol, forwarded to value:value: above.  Same
	forwarding shape as BoundMethod and PythonInstance.

	Needed because the IR codegen path spells a Python call
	``___pyCallValue___:kw:'' where the text path spells it ``value:value:''
	(see CallAst>>___emitIRGeneralCallOn___: for why), and without this a
	``r()'' compiled through IR reached object>>___pyCallValue___:kw: and
	raised ``'WeakReference' object is not callable''."

	^ self @env1:value: positional value: kwargs
%

category: 'Grail-Weak-Python'
classmethod: WeakReference
_collect
	"Grail extension exposed to Python as `weakref._collect()`. Force GemStone
	 in-memory collection and drain the ephemeron finalization queue so weak
	 refs fire and callbacks run synchronously. The Python equivalent of
	 CPython's `gc.collect()` for the purpose of weakref tests."

	WeakReference @env0:_flushProcessStackAreas.
	System @env0:_generationScavenge_vmMarkSweep.
	GcFinalizeNotification @env0:new @env0:_finalizeEphemerons.
	FinalizerEphemeron @env0:_runPending
%

set compile_env: 0

category: 'Grail-Weak-private'
classmethod: WeakReference
_flushProcessStackAreas
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
%

! ===============================================================================
! FinalizerEphemeron — a destruction hook for one TRANSIENT object: CPython's
!   tp_finalize, for the runtime's own use (not a Python-visible type).
!
!   WeakReference's callback is handed the dead REF, as Python's weakref
!   callbacks are, so it cannot see the object that died.  The hooks CPython
!   fires from a destructor need exactly that object: an async generator's
!   finalizer is CALLED WITH the generator (asyncio schedules its aclose()),
!   and the never-awaited warning names the step object's method and owner.
!   An ephemeron can give it to them, because mourning happens while the key
!   is still in the first slot -- the object is resurrected for the duration
!   of #mourn, which is PEP 442's contract too, and whatever the action keeps
!   hold of stays alive.
!
!   The registry is what keeps a pending hook reachable: an ephemeron that is
!   itself garbage is never traced, so never fired.  It lives in SessionTemps,
!   so commit never reaches it, and nothing points from the watched object to
!   its ephemeron, so the watched object commits clean too.  An object is
!   watched from the moment #on:do: answers until it dies or the session ends;
!   there is no cancel, because every caller decides at mourning time whether
!   the object still needs the hook (a started step, a closed generator: no).
!
!   The action is a TWO-arg block, [:object :argument | ...], so the object
!   travels in the key slot and the per-object datum in its own slot.  A block
!   that closed over either instead would reference the key from a non-key
!   slot; keep the action a clean block and the key only in the key slot.
!
!   #mourn DOES NOT RUN THE ACTION.  Mourning happens wherever the VM
!   finalizes (GcFinalizeNotification, at an interrupt point), and Grail's
!   runtime is not reentrant there: measured in a SUnit shard, 132 mournings
!   landed in the middle of a MODULE COMPILE, and a never-awaited warning run
!   from one of them -- Python code, importing and compiling as it goes --
!   left the interrupted compile unable to resolve a module function
!   (``IR codegen: unhandled name load'', a different AsendLifecycleTestCase
!   test each run).  So #mourn only queues the hook (pure Smalltalk, safe
!   anywhere) and _runPending runs the queue at points known to be ordinary
!   runtime code: gc.collect() -- right after it drains the ephemerons, so a
!   collection still runs its hooks before it returns, as CPython's does --
!   and every new registration.  A queued object stays alive until its hook
!   has run; the queue is emptied at the next of those points.
! ! ===============================================================================

expectvalue /Class
doit
Object subclass: 'FinalizerEphemeron'
  instVarNames: #( referent action argument )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
FinalizerEphemeron category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
FinalizerEphemeron removeAllMethods.
FinalizerEphemeron class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: FinalizerEphemeron
on: anObject do: aTwoArgBlock with: anArgument
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
%

category: 'Grail-Weak-private'
classmethod: FinalizerEphemeron
_registry
	"The session's pending watches -- see the class section for why there has
	 to be one, and why it is session-local."

	^ SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [
		SessionTemps current at: #'GrailFinalizerEphemerons' put: IdentitySet new]
%

category: 'Grail-Weak-private'
classmethod: FinalizerEphemeron
_queue
	"Hooks whose objects have died, waiting for a safe point: triples of
	 { action. object. argument }."

	^ SessionTemps current at: #'GrailFinalizerQueue' ifAbsent: [
		SessionTemps current at: #'GrailFinalizerQueue' put: OrderedCollection new]
%

category: 'Grail-Weak-finalization'
classmethod: FinalizerEphemeron
_runPending
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
%

category: 'Grail-Weak-private'
classmethod: FinalizerEphemeron
_pendingCount
	"How many objects are being watched -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [^ 0]) size
%

category: 'Grail-Weak-private'
classmethod: FinalizerEphemeron
_queuedCount
	"How many hooks are waiting for a safe point -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerQueue' ifAbsent: [^ 0]) size
%

category: 'Grail-Weak-private'
method: FinalizerEphemeron
_setReferent: anObject action: aTwoArgBlock argument: anArgument

	referent := anObject.
	action := aTwoArgBlock.
	argument := anArgument.
	^ self
%

category: 'Grail-Weak-testing'
method: FinalizerEphemeron
isWatching
	"Still waiting for its object to die -- for tests."

	^ (SessionTemps current at: #'GrailFinalizerEphemerons' ifAbsent: [^ false])
		includes: self
%

category: 'Grail-Weak-finalization'
method: FinalizerEphemeron
mourn
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
%

! ===============================================================================
! WeakValueDictionary — mapping whose values are held weakly. Each entry is a
!   WeakReference whose callback removes the entry from the backing map on
!   mourn.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakValueDictionary'
  instVarNames: #( map )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakValueDictionary category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakValueDictionary removeAllMethods.
WeakValueDictionary class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: WeakValueDictionary
new
	^super new _init
%

category: 'Grail-Weak-private'
method: WeakValueDictionary
_init
	map := KeyValueDictionary new.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakValueDictionary
at: aKey put: aValue
	"Bind aKey to aValue, holding aValue weakly."

	| ref ourMap |
	map removeKey: aKey ifAbsent: [].
	ourMap := map.
	ref := WeakReference on: aValue callback: [:r | ourMap removeKey: aKey ifAbsent: []].
	map at: aKey put: ref.
	^aValue
%

category: 'Grail-Weak-accessing'
method: WeakValueDictionary
at: aKey
	^self at: aKey ifAbsent: [self error: 'key not found']
%

category: 'Grail-Weak-accessing'
method: WeakValueDictionary
at: aKey ifAbsent: aBlock
	| ref v |
	ref := map at: aKey ifAbsent: [^aBlock value].
	v := ref value.
	v ifNil: [^aBlock value].
	^v
%

category: 'Grail-Weak-testing'
method: WeakValueDictionary
includesKey: aKey
	| ref |
	ref := map at: aKey ifAbsent: [^false].
	^ref isAlive
%

category: 'Grail-Weak-accessing'
method: WeakValueDictionary
size
	"Number of entries whose values are still alive."

	| n |
	n := 0.
	map valuesDo: [:ref | ref isAlive ifTrue: [n := n + 1]].
	^n
%

! ===============================================================================
! WeakKeyDictionary — mapping whose keys are held weakly. Entries are
!   (WeakReference-to-key, value) pairs in a list; lookup is by identity.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakKeyDictionary'
  instVarNames: #( entries )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakKeyDictionary category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakKeyDictionary removeAllMethods.
WeakKeyDictionary class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: WeakKeyDictionary
new
	^super new _init
%

category: 'Grail-Weak-private'
method: WeakKeyDictionary
_init
	entries := OrderedCollection new.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakKeyDictionary
at: aKey put: aValue
	"Hold aKey weakly. Replaces an existing entry for the same identity."

	| entry ref ourEntries |
	self _removeEntryFor: aKey.
	entry := Array new: 2.
	entry at: 2 put: aValue.
	ourEntries := entries.
	ref := WeakReference on: aKey callback: [:r | ourEntries remove: entry ifAbsent: []].
	entry at: 1 put: ref.
	entries add: entry.
	^aValue
%

category: 'Grail-Weak-accessing'
method: WeakKeyDictionary
at: aKey
	^self at: aKey ifAbsent: [self error: 'key not found']
%

category: 'Grail-Weak-accessing'
method: WeakKeyDictionary
at: aKey ifAbsent: aBlock
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [^e at: 2]].
	^aBlock value
%

category: 'Grail-Weak-testing'
method: WeakKeyDictionary
includesKey: aKey
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [^true]].
	^false
%

category: 'Grail-Weak-accessing'
method: WeakKeyDictionary
size
	| n |
	n := 0.
	entries do: [:e | (e at: 1) isAlive ifTrue: [n := n + 1]].
	^n
%

category: 'Grail-Weak-private'
method: WeakKeyDictionary
_removeEntryFor: aKey
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [
			entries remove: e.
			^self]]
%

! ===============================================================================
! WeakSet — set whose elements are held weakly via WeakReferences with
!   self-removing callbacks.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakSet'
  instVarNames: #( refs )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakSet category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakSet removeAllMethods.
WeakSet class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: WeakSet
new
	^super new _init
%

category: 'Grail-Weak-private'
method: WeakSet
_init
	refs := OrderedCollection new.
	^self
%

category: 'Grail-Weak-adding'
method: WeakSet
add: anObject
	| ref ourRefs |
	(self includes: anObject) ifTrue: [^anObject].
	ourRefs := refs.
	ref := WeakReference on: anObject callback: [:r | ourRefs remove: r ifAbsent: []].
	refs add: ref.
	^anObject
%

category: 'Grail-Weak-removing'
method: WeakSet
remove: anObject
	refs do: [:r |
		r value == anObject ifTrue: [refs remove: r. ^anObject]].
	^self error: 'not in set'
%

category: 'Grail-Weak-testing'
method: WeakSet
includes: anObject
	refs do: [:r | r value == anObject ifTrue: [^true]].
	^false
%

category: 'Grail-Weak-accessing'
method: WeakSet
size
	| n |
	n := 0.
	refs do: [:r | r isAlive ifTrue: [n := n + 1]].
	^n
%

! ===============================================================================
! _weakref — Python-importable Smalltalk module that re-exports the underlying
!   WeakReference class. Pure-Python `weakref.py` does `from _weakref import ref`
!   (and the Grail extension `_collect`) to reach the ephemeron layer.
!
!   Registered with importlib so `import _weakref` (and transitively `import
!   weakref`) resolves at install time.
! ===============================================================================

run
module ifNil: [self error: 'module is not defined. _weakref must load after module.gs.'].
%

expectvalue /Class
doit
module subclass: '_weakref'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_weakref category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
_weakref removeAllMethods.
_weakref class removeAllMethods.
%

set compile_env: 1

category: 'Grail-Initialization'
method: _weakref
initialize
	"No-op; `module>>instance` calls initialize on the singleton."
%

category: 'Grail-Built-in Functions'
method: _weakref
ref_class
	"Return the underlying WeakReference Smalltalk class. Used by Python
	 isinstance checks against `weakref.ref`."

	^WeakReference
%

category: 'Grail-Built-in Functions'
method: _weakref
ref: anObject
	"weakref.ref(obj) — construct a weak reference. Python fast-path attribute
	 call `_weakref.ref(x)` dispatches here."

	^WeakReference @env0:on: anObject
%

category: 'Grail-Built-in Functions'
method: _weakref
ref: anObject _: aCallback
	"weakref.ref(obj, callback) — construct a weak reference with callback.
	 Wraps the Python callable (ExecBlock taking positional+kwargs) in a
	 1-arg Smalltalk block so #mourn's `callback value: self` invocation
	 routes through Python's calling convention."

	aCallback == None ifTrue: [^WeakReference @env0:on: anObject].
	^WeakReference @env0:on: anObject
		callback: [:r | aCallback @env0:value: (Array @env0:with: r) value: nil]
%

category: 'Grail-Built-in Functions'
method: _weakref
_collect
	"Grail extension: force GC + drain the ephemeron finalization queue. Used
	 by weakref tests to make ephemeron firing synchronous."

	WeakReference @env1:_collect.
	^None
%

set compile_env: 0
