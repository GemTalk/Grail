! ------------------- Superclass check
run
KeyValueDictionary ifNil: [self error: 'KeyValueDictionary is not defined.'].
CollisionBucket ifNil: [self error: 'CollisionBucket is not defined.'].
%

! ------- PyDictCollisionBucket — a collision bucket whose key comparison
! defers to the owning PyDict's Python-aware compareKey:with:.  The kernel
! CollisionBucket compares colliding keys with Smalltalk ``='', which would
! bypass a key's Python __eq__ once two keys share a hash bucket (test_dict
! test_str_nonstr: a str key colliding with a custom-__hash__ key).  PyDict
! sets `collisionBucketClass` to this so bucket lookups stay Python-correct.
expectvalue /Class
doit
CollisionBucket subclass: 'PyDictCollisionBucket'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Metaclass3
doit
PyDictCollisionBucket removeAllMethods: 0.
PyDictCollisionBucket removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Hashing'
method: PyDictCollisionBucket
compareKey: key1 with: key2
	"Compare colliding keys via the owning PyDict's compareKey:with: (Python
	__eq__ for PythonInstance keys), so a custom __eq__ is honored inside a
	collision bucket -- the kernel default is Smalltalk ``=''.  Falls back to
	``='' if the owning dict is somehow unset."

	keyValueDictionary ifNil: [^ key1 = key2].
	^ keyValueDictionary compareKey: key1 with: key2
%

! ------- PyDict — the Python 'dict' type: a KeyValueDictionary that
! ------- preserves INSERTION ORDER (CPython 3.7+ guarantee).
!
! docs/Ordered_Dict.md.  PyDict is-a KeyValueDictionary, so every consumer
! (internal at:/do:, the C-shim `isKindOf: KeyValueDictionary`, isinstance)
! keeps working -- only creation (Python dicts are PyDict) and iteration
! ORDER change.  A named `order` instVar (an OrderedCollection of keys in
! insertion order) is maintained by the env-0 mutators and walked by the
! env-0 iteration primitives; the Python dict protocol (keys/values/items/
! __iter__/__repr__), which is compiled onto KeyValueDictionary and builds
! on those primitives, therefore inherits correct order for free.
!
! REHASH SAFETY: KeyValueDictionary grows/shrinks its hash table through
! rebuildTable:, which iterates the LIVE table via the very keysAndValuesDo:
! we override -- and mid-rebuild `self at:` cannot find a moved entry.  So a
! `rehashing` flag, set only by our rebuildTable: override, routes the
! iteration overrides back to super (hash order, table-safe) for the
! duration of the rebuild, and suppresses order bookkeeping on any
! re-insertion the rebuild performs.  Everywhere else the overrides walk
! `order`.
expectvalue /Class
doit
KeyValueDictionary subclass: 'PyDict'
  instVarNames: #( order rehashing version )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyDict comment:
'The Python ``dict'' type: a KeyValueDictionary that preserves insertion
order (CPython 3.7+). ``order'' is an OrderedCollection of keys in
insertion order, maintained by the mutator overrides and walked by the
iteration overrides. ``rehashing'' guards the table-rebuild reentry. See
docs/Ordered_Dict.md.'
%

expectvalue /Class
doit
PyDict category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyDict removeAllMethods: 0.
PyDict removeAllMethods: 1.
PyDict class removeAllMethods: 0.
PyDict class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- order-list access

category: 'Grail-Order'
method: PyDict
___order___
	"The insertion-order key list, created lazily so every allocation path
	(new / basicNew / a faulted-in committed instance whose slot was nil)
	is covered."

	order isNil ifTrue: [order := OrderedCollection new].
	^ order
%

category: 'Grail-Order'
method: PyDict
___setOrder___: anOrderedCollection
	order := anOrderedCollection
%

! ------------------- structural-mutation version (iteration guard)

category: 'Grail-Order'
method: PyDict
___version___
	"A monotonic counter bumped by every STRUCTURAL mutation (a key added or
	removed -- NOT a value update of an existing key).  An iterator snapshots
	it at creation and re-checks on each step; a mismatch means the dict was
	structurally changed during iteration (CPython's ``dictionary changed size
	during iteration'' RuntimeError).  A plain size compare misses ``del d[k];
	d[k]=v'' (net size unchanged) -- test_mutating_iteration_delete.  Lazily
	0 so a faulted-in committed instance (nil slot) starts clean."

	version isNil ifTrue: [version := 0].
	^ version
%

category: 'Grail-Order'
method: PyDict
___bumpVersion___
	version := self ___version___ + 1
%

! ------------------- table rebuild (rehash) -- the single choke point

category: 'Grail-Order'
method: PyDict
rebuildTable: newSize
	"Every grow/shrink funnels through here.  While the table is being
	rebuilt it is inconsistent (entries are mid-move), so the iteration
	overrides must fall back to super's table-order walk and the mutator
	overrides must not touch `order`.  A flag scoped to this call does both;
	`ensure:` restores it even on error."

	rehashing := true.
	^ [super rebuildTable: newSize] ensure: [rehashing := false]
%

! ------------------- Python key hashing / equality
! CPython dicts bucket and match keys by the key's own __hash__ / __eq__, so a
! key with a custom __hash__ collides with an equal key, a raising __eq__
! propagates (test_dict test_bad_key / test_getitem / test_pop / test_setdefault
! / test_eq / test_mutating_lookup / test_merge_and_mutate), and equal numeric
! keys of different types collapse to one entry (1 == 1.0 == True).
! KeyValueDictionary instead buckets by ``aKey hash'' and matches by
! ``aKey = hashKey'' (Smalltalk).  We override the two kernel hooks (plus the
! collision-bucket class) so EVERY key -- not just PythonInstance keys -- routes
! through the Python protocol (Phase 1 of docs/Python_Robust_Hashtable_Design.md).
!
! Safety: for str / int / tuple / a plain object, Grail's Python __hash__ already
! equals the Smalltalk ``hash'' the kernel would use (object>>__hash__ is ``self
! hash''), so their bucketing is UNCHANGED.  Only keys whose Python hash differs
! -- bool (hash==1, not the Smalltalk identity hash), non-integer float, int(-1)
! (Python's special hashes) -- move buckets, and always consistently, since
! lookup/rebuild use this same hashFunction:.  A key's __hash__ is invoked only
! for bucketing (never mutating the table), and __eq__ only during a probe walk
! BEFORE any insert, so a raising __eq__ propagates without corrupting the table.

category: 'Grail-Hashing'
method: PyDict
hashFunction: aKey
	"Bucket EVERY key by its Python __hash__ so numeric keys collapse across
	types (1/1.0/True share a bucket) and a custom __hash__ drives lookup.  For
	str/int/tuple/plain-object keys this equals the kernel hash (no rebucketing);
	bool / non-integer float / int(-1) move to their Python-hash bucket.

	An unhashable key's __hash__ raises TypeError; re-raise it as CPython's rich
	``cannot use 'X' as a dict key (unhashable type: 'X')'' -- the same message
	__setitem__'s explicit ___requireHashableAsDictKey___ gate produces -- so the
	READ paths (key in d, d[key], .get/.pop/.setdefault), which reach __hash__
	through this bucketing function before any explicit gate, report it too
	rather than the bare ``unhashable type: 'X'''.  A non-TypeError from __hash__
	(e.g. a KeyError) propagates unchanged (test_dict test_unhashable_key)."

	| h |
	"A CLASS buckets by IDENTITY.  CPython hashes a class with type.__hash__,
	never with the class's own ``__hash__'' -- that one describes its
	INSTANCES, and for a mapping type it is the None that makes them
	unhashable (collections.UserDict sets exactly that).  Reading it off the
	class produced nil, and the modulo below then failed with ``nil
	doesNotUnderstand: #\\''.  Classes ARE ordinary dict keys and set
	elements: copy.py keys its atomic-type tables as sets of classes."
	(aKey isKindOf: Behavior)
		ifTrue: [^ (aKey identityHash \\ tableSize) + 1].
	h := [aKey @env1:__hash__] on: TypeError do: [:ex |
		aKey @env1:___raiseUnhashableUse___: ex context: 'a dict key'].
	^ (h \\ tableSize) + 1
%

category: 'Grail-Hashing'
method: PyDict
compareKey: aKey with: hashKey
	"Match keys by Python equality (identity first, then __eq__, a raising __eq__
	propagates).  ``aKey'' is the probe key, ``hashKey'' the stored key."

	aKey == hashKey ifTrue: [^ true].
	"Consult the CUSTOM (PythonInstance) side's __eq__ first.  A built-in's
	__eq__ (str/int) does not reflect to a custom operand, so a str key stored
	against a custom-__eq__ probe -- or the reverse -- must be compared from the
	PythonInstance side (test_str_nonstr: Key3 == 'key3' / StrSub('key3')).  A
	raising __eq__ propagates (test_bad_key)."
	(aKey isKindOf: PythonInstance) ifTrue: [^ aKey @env1:___pyRichEqBool___: hashKey].
	(hashKey isKindOf: PythonInstance) ifTrue: [^ hashKey @env1:___pyRichEqBool___: aKey].
	"Both built-in: Python equality (not the kernel Smalltalk ``='', whose
	Boolean/Number comparison is asymmetric -- ``true = 1'' vs ``1 = true'') so
	1 / 1.0 / True compare equal in whichever probe/stored order they meet."
	^ aKey @env1:___pyRichEqBool___: hashKey
%

category: 'Grail-Hashing'
method: PyDict
collisionBucketClass
	"Collision buckets must compare keys the same way this dict does (Python
	__eq__ for PythonInstance keys), so use a bucket that defers to our
	compareKey:with: rather than the kernel's Smalltalk-``='' bucket."

	^ PyDictCollisionBucket
%

! ------------------- mutators (maintain order; guard with O(1) includesKey:)

category: 'Grail-Mutation'
method: PyDict
at: aKey put: aValue
	"Append the key to the order list on FIRST insertion; an update leaves
	its position unchanged (CPython semantics).  includesKey: is the O(1)
	hash probe, so this adds no scan.  During a rebuild, re-inserted entries
	are already in `order` -- skip the bookkeeping."

	| isNew |
	rehashing == true ifTrue: [^ super at: aKey put: aValue].
	isNew := (self includesKey: aKey) not.
	super at: aKey put: aValue.
	isNew ifTrue: [self ___order___ addLast: aKey. self ___bumpVersion___].
	^ aValue
%

category: 'Grail-Mutation'
method: PyDict
add: anAssociation
	| isNew |
	rehashing == true ifTrue: [^ super add: anAssociation].
	isNew := (self includesKey: anAssociation key) not.
	super add: anAssociation.
	isNew ifTrue: [self ___order___ addLast: anAssociation key. self ___bumpVersion___].
	^ anAssociation
%

category: 'Grail-Mutation'
method: PyDict
removeKey: aKey
	| r |
	self ___order___ remove: aKey ifAbsent: [].
	r := super removeKey: aKey.
	self ___bumpVersion___.
	^ r
%

category: 'Grail-Mutation'
method: PyDict
removeKey: aKey ifAbsent: aBlock
	(self includesKey: aKey) ifTrue: [
		self ___order___ remove: aKey ifAbsent: [].
		self ___bumpVersion___].
	^ super removeKey: aKey ifAbsent: aBlock
%

category: 'Grail-Mutation'
method: PyDict
removeAllKeys: aCollection
	aCollection do: [:k | self ___order___ remove: k ifAbsent: []].
	self ___bumpVersion___.
	^ super removeAllKeys: aCollection
%

! ------------------- iteration (walk order; defer to super during rehash)

category: 'Grail-Iteration'
method: PyDict
keysDo: aBlock
	rehashing == true ifTrue: [^ super keysDo: aBlock].
	self ___order___ do: [:k | aBlock value: k]
%

category: 'Grail-Iteration'
method: PyDict
valuesDo: aBlock
	rehashing == true ifTrue: [^ super valuesDo: aBlock].
	self ___order___ do: [:k | aBlock value: (self at: k)]
%

category: 'Grail-Iteration'
method: PyDict
keysAndValuesDo: aBlock
	rehashing == true ifTrue: [^ super keysAndValuesDo: aBlock].
	self ___order___ do: [:k | aBlock value: k value: (self at: k)]
%

category: 'Grail-Iteration'
method: PyDict
associationsDo: aBlock
	rehashing == true ifTrue: [^ super associationsDo: aBlock].
	self ___order___ do: [:k | aBlock value: (self associationAt: k)]
%

category: 'Grail-Iteration'
method: PyDict
associationAt: aKey
	"KeyValueDictionary has no Association-based storage, so associationAt:
	is undefined here -- build one on demand from the current value.  Used by
	associationsDo: (hence printOn:/printString); previously a bare printString
	of a PyDict raised ``does not understand associationAt:''.  Raises if the
	key is absent, matching the kernel associationAt: contract."
	^ aKey -> (self at: aKey)
%

category: 'Grail-Iteration'
method: PyDict
do: aBlock
	"KeyValueDictionary>>do: iterates VALUES."
	rehashing == true ifTrue: [^ super do: aBlock].
	self valuesDo: aBlock
%

! ------------------- copy (own order list)

category: 'Grail-Copying'
method: PyDict
copy
	"super copy shallow-copies named instVars, sharing the order list;
	give the copy its own."

	| c |
	c := super copy.
	c ___setOrder___: (self ___order___ copy).
	^ c
%

set compile_env: 0

! ------- The Python `dict` type is PyDict.  install.gs's Python-namespace
! ------- block (which runs before this file) aliased `dict` to the kernel
! ------- KeyValueDictionary; re-point it now that PyDict exists so literals,
! ------- dict(), kwargs, isinstance(x, dict) and `type({}) is dict` all use
! ------- the insertion-ordered subclass.
run
Python at: #'dict' put: PyDict.
%
