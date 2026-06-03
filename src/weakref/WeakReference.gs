! ===============================================================================
! WeakReference.gs — Smalltalk-native weak-reference layer for Grail, built on
! GemStone ephemerons, made commit-safe with a dbTransient holder split.
!
! Two-class structure to keep the ephemeron off the commit path:
!
!   WeakReference         — regular class, persists normally. Holds
!                           (holder, hashCache). hashCache is a SmallInteger
!                           frozen from the referent's hash at creation, so a
!                           ref keeps a stable hash even after its referent
!                           dies (matching CPython).
!
!   WeakReferenceHolder   — dbTransient. Holds the ephemeron state
!                           (referent, callback, dead). `beEphemeron: true`
!                           is set on the holder, not the WeakReference. When
!                           a WeakReference is committed, the *reference* to
!                           the holder persists by identity but the holder's
!                           own instVars are not written; after read-back the
!                           ref reports dead (referent == nil) while keeping
!                           its frozen hash — the same semantics CPython gives
!                           weakrefs across pickle.
!
! Ephemeron firing: GC fires the holder, the bit clears synchronously and
! the holder is queued for #mourn. #mourn flips dead first (so a callback
! observes ref() == None), then runs the user callback wrapped to receive
! the *outer* WeakReference, then nils referent + callback.
!
! Constraints inherited from ephemerons (kernel docs on Object>>beEphemeron:):
!   - Has no effect if the holder's first instVar is a special (immediate)
!     or committed object. The Python layer rejects such referents with
!     TypeError up front; here we still construct the holder and treat it as
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
#( #'WeakReference' #'WeakReferenceHolder' #'WeakValueDictionary'
   #'WeakKeyDictionary' #'WeakSet' )
	do: [:nm | (dict includesKey: nm) ifFalse: [dict at: nm put: nil]].
true
%

! ===============================================================================
! WeakReferenceHolder — dbTransient inner class holding the ephemeron state.
!   First instVar `referent` is the ephemeron key. Instances are dbTransient
!   so they can be committed (the surrounding WeakReference is a normal
!   persistent object) without the ephemeron tripping commit. After commit
!   read-back the holder's instVars are nil and the WeakReference reports
!   dead.
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'WeakReferenceHolder'
  instVarNames: #( referent callback dead )
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
_setReferent: anObject callback: aBlock
	"Initialise an unfired holder. The caller wires #beEphemeron: true
	 separately so it can fall back gracefully when anObject is ineligible
	 (immediate / committed)."

	referent := anObject.
	callback := aBlock.
	dead := false.
	^self
%

category: 'Grail-Weak-accessing'
method: WeakReferenceHolder
value
	"Answer the referent if still alive, or nil if reclaimed or post-commit.
	 nil-tolerant: after commit + read-back, `dead` is nil rather than
	 false; we treat nil-dead-with-nil-referent as dead. (Returning
	 referent directly would yield nil in that case anyway, so the
	 explicit `dead == true` check is mostly for the in-callback window
	 where referent has not yet been nilled.)"

	dead == true ifTrue: [^nil].
	^referent
%

category: 'Grail-Weak-testing'
method: WeakReferenceHolder
isAlive
	dead == true ifTrue: [^false].
	^referent ~~ nil
%

category: 'Grail-Weak-testing'
method: WeakReferenceHolder
isDead
	^self isAlive not
%

category: 'Grail-Weak-finalization'
method: WeakReferenceHolder
mourn
	"Sent by the finalization process after GC fires this ephemeron. Mark
	 dead first so the callback observes #value == nil (Python's 'referent
	 is None inside the callback'), then run the callback, then release
	 internal references. The callback was wrapped at construction time to
	 substitute the outer WeakReference for its argument, so passing self
	 (the holder) here is intentional and the arg is ignored by the wrap."

	dead == true ifTrue: [^self].
	dead := true.
	callback ifNotNil: [callback value: self].
	referent := nil.
	callback := nil
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
	"Build a WeakReference + WeakReferenceHolder pair. The holder is the
	 ephemeron; the WeakReference is a normal object holding (holder,
	 hashCache). The user callback, if any, is wrapped to substitute the
	 outer WeakReference for its argument so callers can write
	 `[:r | log add: r]` and receive the ref, not the holder."

	| wr h wrap |
	wr := self new.
	wrap := aBlockOrNil
		ifNil: [nil]
		ifNotNil: [[:_ | aBlockOrNil value: wr]].
	h := WeakReferenceHolder new _setReferent: anObject callback: wrap.
	[h beEphemeron: true] on: Error do: [:ex |
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
