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
expectvalue /Class
doit
KeyValueDictionary subclass: 'PyDict'
  instVarNames: #( order )
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
iteration overrides. See docs/Ordered_Dict.md.'
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

! ------------------- mutators (maintain order; guard with O(1) includesKey:)

category: 'Grail-Mutation'
method: PyDict
at: aKey put: aValue
	"Append the key to the order list on FIRST insertion; an update leaves
	its position unchanged (CPython semantics).  includesKey: is the O(1)
	hash probe, so this adds no scan."

	| isNew |
	isNew := (self includesKey: aKey) not.
	super at: aKey put: aValue.
	isNew ifTrue: [self ___order___ addLast: aKey].
	^ aValue
%

category: 'Grail-Mutation'
method: PyDict
add: anAssociation
	| isNew |
	isNew := (self includesKey: anAssociation key) not.
	super add: anAssociation.
	isNew ifTrue: [self ___order___ addLast: anAssociation key].
	^ anAssociation
%

category: 'Grail-Mutation'
method: PyDict
removeKey: aKey
	self ___order___ remove: aKey ifAbsent: [].
	^ super removeKey: aKey
%

category: 'Grail-Mutation'
method: PyDict
removeKey: aKey ifAbsent: aBlock
	(self includesKey: aKey) ifTrue: [self ___order___ remove: aKey ifAbsent: []].
	^ super removeKey: aKey ifAbsent: aBlock
%

category: 'Grail-Mutation'
method: PyDict
removeAllKeys: aCollection
	aCollection do: [:k | self ___order___ remove: k ifAbsent: []].
	^ super removeAllKeys: aCollection
%

! ------------------- iteration (walk order)

category: 'Grail-Iteration'
method: PyDict
keysDo: aBlock
	self ___order___ do: [:k | aBlock value: k]
%

category: 'Grail-Iteration'
method: PyDict
valuesDo: aBlock
	self ___order___ do: [:k | aBlock value: (self at: k)]
%

category: 'Grail-Iteration'
method: PyDict
keysAndValuesDo: aBlock
	self ___order___ do: [:k | aBlock value: k value: (self at: k)]
%

category: 'Grail-Iteration'
method: PyDict
associationsDo: aBlock
	self ___order___ do: [:k | aBlock value: (self associationAt: k)]
%

category: 'Grail-Iteration'
method: PyDict
do: aBlock
	"KeyValueDictionary>>do: iterates VALUES."
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
