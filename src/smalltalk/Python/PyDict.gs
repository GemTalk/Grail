! ------------------- Superclass check
run
KeyValueDictionary ifNil: [self error: 'KeyValueDictionary is not defined.'].
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
