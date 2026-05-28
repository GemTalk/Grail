! ===============================================================================
! WeakReference.gs — Smalltalk-native weak-reference layer for Grail, built on
! GemStone ephemerons.
!
! Each "weak holder" sets `beEphemeron: true`; its first instVar is the key
! (referent). When mark-sweep finds the key is reachable only through
! ephemerons, the GC fires the ephemeron — synchronously clearing the bit and
! queueing the object for #mourn on a high-priority finalization process.
! Liveness is reported through an explicit `dead` flag (so the answer is
! correct even when the first instVar is an immediate, where the bit is a
! no-op). The Python `weakref` module will delegate to these:
!
!     weakref.ref                 -> WeakReference
!     weakref.proxy               -> WeakProxy
!     weakref.WeakValueDictionary -> WeakValueDictionary
!     weakref.WeakKeyDictionary   -> WeakKeyDictionary
!     weakref.WeakSet             -> WeakSet
!     weakref.finalize            -> Finalizer
!
! Constraints inherited from ephemerons (kernel docs on Object>>beEphemeron:):
!   - Transient only — the bit silently clears on commit.
!   - The bit has no effect if the first instVar is a special (immediate) or
!     committed object. The Python layer rejects such referents with TypeError
!     up front; here we still construct the holder and treat it as permanently
!     alive (degenerate but harmless at the Smalltalk level).
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
#( #'WeakReference' #'WeakProxy' #'WeakValueDictionary'
   #'WeakKeyDictionary' #'WeakSet' #'Finalizer' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
%

! ===============================================================================
! WeakReference — weak reference to a single object, optional callback.
!   Subclass of Object whose first instVar is the ephemeron key.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReference'
  instVarNames: #( referent callback dead hashCache )
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

	^self new _initReferent: anObject callback: nil
%

category: 'Grail-Weak-constructors'
classmethod: WeakReference
on: anObject callback: aBlock
	"Answer a weak reference to anObject. When anObject is reclaimed, evaluate
	 aBlock with this WeakReference as its argument. By then `value` already
	 answers nil. aBlock is sent #value: from #mourn — a Smalltalk block or a
	 Python callable (responding to #value:) both work."

	^self new _initReferent: anObject callback: aBlock
%

category: 'Grail-Weak-private'
method: WeakReference
_initReferent: anObject callback: aBlockOrNil
	"Wire up the referent as the ephemeron key, freeze a hash drawn from the
	 referent, then arm the ephemeron. beEphemeron: silently has no effect if
	 anObject is an immediate or committed object — that case is reported via
	 #isAlive remaining true."

	referent := anObject.
	callback := aBlockOrNil.
	dead := false.
	hashCache := anObject hash.
	[self beEphemeron: true] on: Error do: [:ex |
		"target ineligible (e.g. byte object); leave as a permanent strong ref"].
	^self
%

category: 'Grail-Weak-accessing'
method: WeakReference
value
	"Answer the referent if alive, nil if reclaimed."

	^dead ifTrue: [nil] ifFalse: [referent]
%

category: 'Grail-Weak-testing'
method: WeakReference
isAlive
	^dead not
%

category: 'Grail-Weak-testing'
method: WeakReference
isDead
	^dead
%

category: 'Grail-Weak-comparing'
method: WeakReference
= aWeakReference
	"Equal while both referents are alive and equal; identity otherwise
	 (matches CPython)."

	self == aWeakReference ifTrue: [^true].
	(aWeakReference isKindOf: WeakReference) ifFalse: [^false].
	(dead or: [aWeakReference isDead]) ifTrue: [^false].
	^referent = aWeakReference value
%

category: 'Grail-Weak-comparing'
method: WeakReference
hash
	"Hash frozen at creation so the reference remains usable as a dict key
	 after its referent dies."

	^hashCache
%

category: 'Grail-Weak-finalization'
method: WeakReference
mourn
	"Sent on the finalization process after the GC fires this ephemeron. Mark
	 dead first so the callback observes value == nil (matching Python's
	 'referent is None inside the callback'), then run the callback, then
	 release internal references."

	dead ifTrue: [^self].
	dead := true.
	callback ifNotNil: [callback value: self].
	referent := nil.
	callback := nil
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
classmethod: WeakReference
_collect
	"Grail extension exposed to Python as `weakref._collect()`. Force GemStone
	 in-memory collection and drain the ephemeron finalization queue so weak
	 refs fire and callbacks run synchronously. The Python equivalent of
	 CPython's `gc.collect()` for the purpose of weakref tests."

	System @env0:_generationScavenge_vmMarkSweep.
	GcFinalizeNotification @env0:new @env0:_finalizeEphemerons
%

set compile_env: 0

! ===============================================================================
! WeakProxy — transparent proxy that forwards messages to a weak referent. Uses
!   a WeakReference internally; after the referent is reclaimed, any forwarded
!   message raises ReferenceError. Transparent only for selectors that Object
!   does not already implement.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakProxy'
  instVarNames: #( reference )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
WeakProxy category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
WeakProxy removeAllMethods.
WeakProxy class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: WeakProxy
on: anObject
	^self new _setReference: (WeakReference on: anObject)
%

category: 'Grail-Weak-constructors'
classmethod: WeakProxy
on: anObject callback: aBlock
	^self new _setReference: (WeakReference on: anObject callback: aBlock)
%

category: 'Grail-Weak-private'
method: WeakProxy
_setReference: aWeakReference
	reference := aWeakReference.
	^self
%

category: 'Grail-Weak-forwarding'
method: WeakProxy
doesNotUnderstand: aMessage
	"Forward to the live referent; if reclaimed, raise ReferenceError."

	| target |
	target := reference value.
	target ifNil: [
		^ReferenceError signal: 'weakly-referenced object no longer exists'].
	^target perform: aMessage selector withArguments: aMessage arguments
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
! Finalizer — ephemeron that runs a registered block when its referent is
!   reclaimed (or earlier, on #value). Replacement for ref-with-callback when
!   you want the callback-ordering-safe semantics.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'Finalizer'
  instVarNames: #( referent action alive )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Finalizer category: 'Grail-Weak'
%

set compile_env: 0

expectvalue /Metaclass3
doit
Finalizer removeAllMethods.
Finalizer class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Weak-constructors'
classmethod: Finalizer
on: anObject block: aBlock
	^self new _initReferent: anObject action: aBlock
%

category: 'Grail-Weak-private'
method: Finalizer
_initReferent: anObject action: aBlock
	referent := anObject.
	action := aBlock.
	alive := true.
	[self beEphemeron: true] on: Error do: [:ex | "ineligible target; permanent strong ref"].
	^self
%

category: 'Grail-Weak-evaluating'
method: Finalizer
value
	"Run the block immediately (if alive), mark dead, return the block's
	 result. A second send is a no-op and answers nil."

	| a result |
	alive ifFalse: [^nil].
	alive := false.
	[self beEphemeron: false] on: Error do: [:ex | ].
	a := action.
	action := nil.
	referent := nil.
	a ifNil: [^nil].
	result := a value.
	^result
%

category: 'Grail-Weak-testing'
method: Finalizer
isAlive
	^alive
%

category: 'Grail-Weak-accessing'
method: Finalizer
peek
	"Snapshot the registered action without running it; nil if not alive."

	^alive ifTrue: [action] ifFalse: [nil]
%

category: 'Grail-Weak-removing'
method: Finalizer
detach
	"Disable the finalizer without running it; answer the registered action."

	| a |
	alive ifFalse: [^nil].
	alive := false.
	[self beEphemeron: false] on: Error do: [:ex | ].
	a := action.
	action := nil.
	referent := nil.
	^a
%

category: 'Grail-Weak-finalization'
method: Finalizer
mourn
	"Sent by the finalization process after the GC fires this ephemeron."

	alive ifFalse: [^self].
	alive := false.
	action ifNotNil: [action value].
	referent := nil.
	action := nil
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
