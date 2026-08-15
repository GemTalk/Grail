! ------------------- Superclass check
run
Set ifNil: [self error: 'Set is not defined.'].
%

! ===============================================================================
! set class (Python 'set' type - mutable unordered collection)
! ===============================================================================
! Sibling of frozenset; both are direct subclasses of GemStone's Set.
! Shared read-only and result-creating methods live on Set itself
! (see SetProtocol.gs); this file adds set-specific overrides (__hash__
! raising TypeError, __repr__ formatting), mutation methods, and the
! in-place set operators.
! ===============================================================================

! ------- set class definition
expectvalue /Class
doit
Set subclass: 'set'
  instVarNames: #( table )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
set comment:
'Python set type - mutable, unordered collection of unique hashable elements.
A sibling of `frozenset` (both subclasses of GemStone Set); neither inherits
from the other, matching Python.

Unlike frozenset, set instances:
- Can be modified in place via add, remove, discard, pop, clear, update
- Are not hashable (cannot be dict keys or set elements)
- Support in-place set operators (&=, |=, -=, ^=)
'
%

expectvalue /Class
doit
set category: 'Grail-Collections-Unordered'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
set removeAllMethods: 1.
set class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Hashing'
method: set
__hash__
	"set is mutable and therefore not hashable."

	TypeError ___signal___: 'unhashable type: ''set'''
%

category: 'Grail-Initialization'
method: set
__init__
	"set().__init__() -- CPython set_init clears then adds nothing, so an
	explicit no-arg re-init empties the set.  (Only reached by an EXPLICIT
	``s.__init__()'' call; base/subclass construction populate through
	__new__ / ___pyBuiltinSubclassInit___, never this fixed-arity form.)"

	self clear.
	^ None
%

category: 'Grail-Initialization'
method: set
__init__: iterable
	"set.__init__(iterable) -- CLEAR then repopulate (CPython allows re-init;
	test_init calls it twice and expects replacement).  This fixed-arity form
	is what an explicit ``s.__init__(word)'' and a subclass's
	``super().__init__(arg)'' resolve to (test_keywords_in_subclass's
	subclass_with_init); the varargs ___init__:kw: construction fallback is
	deliberately NOT defined here so __new__-consumed args stay lenient."

	self clear.
	self update: iterable.
	^ None
%

category: 'Grail-Initialization'
method: set
__init__: a _: b
	"set.__init__ takes at most one positional argument (test_init:
	``s.__init__(s, 2)'' raises TypeError)."

	TypeError ___signal___: (self @env0:class @env0:name @env0:asString
		@env0:, ' expected at most 1 argument, got 2')
%

category: 'Grail-Initialization'
method: set
___init__: positional kw: keywords
	"Varargs set.__init__(*args, **kw).  VALIDATES ONLY -- never populates.
	It is reached by (a) an explicit ``set().__init__(a=1)'' (test_new_or_init:
	set takes NO keyword arguments, bpo-43413) and (b) the construction
	fallback for a set subclass with no own __init__.  Population is NOT done
	here: an explicit ``s.__init__(word)'' dispatches to the fixed-arity
	__init__: form, and during construction the positional was already consumed
	by ___pyBuiltinSubclassInit___ -- re-updating here would double-consume a
	one-shot iterator argument (test_setOfFrozensets: 0 != 3).  A subclass WITH
	its own __init__ dispatches to that instead and never reaches here."

	(keywords @env0:notNil @env0:and: [keywords @env0:notEmpty]) ifTrue: [
		TypeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, ' expected at most 1 argument, got ' @env0:, positional @env0:size @env0:printString)].
	^ None
%

category: 'Grail-In-Place Operators'
method: set
__iand__: other
	"In-place intersection: self &= other. Returns self.  The OPERATOR
	requires a set operand (intersection_update accepts iterables)."

	(other isKindOf: Set) ifFalse: [
		^ self ___binOpFallback___: other op: '&=' reflected: #'__rand__:'].
	self intersection_update: other.
	^ self
%

category: 'Grail-In-Place Operators'
method: set
__ior__: other
	"In-place union: self |= other. Returns self.  The OPERATOR requires a
	set operand (update accepts iterables)."

	(other isKindOf: Set) ifFalse: [
		^ self ___binOpFallback___: other op: '|=' reflected: #'__ror__:'].
	self update: other.
	^ self
%

category: 'Grail-In-Place Operators'
method: set
__isub__: other
	"In-place difference: self -= other. Returns self.  The OPERATOR requires
	a set operand (difference_update accepts iterables)."

	(other isKindOf: Set) ifFalse: [
		^ self ___binOpFallback___: other op: '-=' reflected: #'__rsub__:'].
	self difference_update: other.
	^ self
%

category: 'Grail-In-Place Operators'
method: set
__ixor__: other
	"In-place symmetric difference: self ^= other. Returns self.  The
	OPERATOR requires a set operand (symmetric_difference_update accepts
	iterables)."

	(other isKindOf: Set) ifFalse: [
		^ self ___binOpFallback___: other op: '^=' reflected: #'__rxor__:'].
	self symmetric_difference_update: other.
	^ self
%

category: 'Grail-String Representation'
method: set
__repr__
	"Return '{a, b, c}' or 'set()' for the empty set."

	| stream first size |
	size := self @env0:size.

	"Handle empty set specially"
	(size == 0) ifTrue: [
		^ 'set()'
	].

	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: ${.

	first := true.
	self @env0:do: [:each |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: each __repr__.
		first := false
	].

	stream @env0:nextPut: $}.
	^ stream @env0:contents
%

category: 'Grail-Mutation Methods'
method: set
add: item
	"Python set.add(x).  The facade @env0:add: performs the hashability check
	(set-element message) and the table store."

	^ self @env0:add: item
%

category: 'Grail-Mutation Methods'
method: set
clear
	"Remove all elements from the set."

	self @env0:removeAll: self
%

category: 'Grail-Mutation Methods'
method: set
difference_update: other
	"Update the set, removing elements found in other.  Accepts any iterable."

	| coerced toRemove |
	coerced := self ___asElementSet___: other.
	toRemove := list ___new___.

	self @env0:do: [:each |
		(coerced __contains__: each) ifTrue: [
			toRemove @env0:add: each
		]
	].

	toRemove @env0:do: [:each |
		self @env0:remove: each
	].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
discard: item
	"Remove an element from the set if it is present.  A mutable-set argument
	is matched as the equivalent frozenset (CPython set-membership rule); a
	list/dict/bytearray argument raises TypeError."

	| probe |
	probe := (item isKindOf: set) ifTrue: [frozenset @env1:__new__: item] ifFalse: [item].
	probe ___requireHashableAsSetElement___.
	self @env0:do: [:each |
		"___pyRichEqBool___, not the raw dunder: __eq__ legitimately answers
		NotImplemented (a str element against a frozenset probe, say), and a
		Symbol in a Boolean position is an uncatchable ImproperOperation.  The
		helper does identity-first, then the full rich ==, then coerces."
		(each ___pyRichEqBool___: probe) ifTrue: [
			self @env0:remove: each.
			^ nil
		]
	]
%

category: 'Grail-Mutation Methods'
method: set
intersection_update: other
	"Update the set, keeping only elements found in it and other.  Accepts
	any iterable."

	| coerced toRemove |
	coerced := self ___asElementSet___: other.
	toRemove := list ___new___.

	self @env0:do: [:each |
		(coerced __contains__: each) ifFalse: [
			toRemove @env0:add: each
		]
	].

	toRemove @env0:do: [:each |
		self @env0:remove: each
	].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
pop
	"Remove and return an arbitrary element from the set.
	Raises KeyError if the set is empty."

	| item |
	(self @env0:isEmpty) ifTrue: [
		KeyError ___signal___: 'pop from an empty set'
	].

	item := nil.
	self @env0:do: [:each |
		"@env0: required — isNil is a configurable optimized selector and
		compiles as a real (unimplemented) env-1 send on a host extent
		that deoptimized it."
		item @env0:isNil ifTrue: [
			item := each
		]
	].

	self @env0:remove: item.
	^ item
%

category: 'Grail-Mutation Methods'
method: set
remove: item
	"Remove an element from the set. Raises KeyError if not found.  A
	mutable-set argument is matched as the equivalent frozenset (CPython
	set-membership rule); a list/dict/bytearray argument raises TypeError."

	| probe removed |
	probe := (item isKindOf: set) ifTrue: [frozenset @env1:__new__: item] ifFalse: [item].
	probe ___requireHashableAsSetElement___.
	removed := false.
	self @env0:do: [:each |
		"See discard: -- the raw dunder can answer NotImplemented."
		(each ___pyRichEqBool___: probe) ifTrue: [
			self @env0:remove: each.
			removed := true.
			^ nil
		]
	].

	removed ifFalse: [
		KeyError ___signal___: item
	]
%

category: 'Grail-Mutation Methods'
method: set
symmetric_difference_update: other
	"Update the set, keeping only elements found in either set, but not in
	both.  Accepts any iterable."

	| coerced toAdd toRemove |
	coerced := self ___asElementSet___: other.
	toAdd := list ___new___.
	toRemove := list ___new___.

	"Find elements in self that are also in other (to remove)"
	self @env0:do: [:each |
		(coerced __contains__: each) ifTrue: [
			toRemove @env0:add: each
		]
	].

	"Find elements in other that are not in self (to add)"
	coerced @env0:do: [:each |
		(self __contains__: each) ifFalse: [
			toAdd @env0:add: each
		]
	].

	"Remove common elements"
	toRemove @env0:do: [:each |
		self @env0:remove: each
	].

	"Add unique elements from other"
	toAdd @env0:do: [:each |
		self @env0:add: each
	].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
update: other
	"Update the set, adding elements from any iterable."

	| coerced |
	coerced := self ___asElementSet___: other.
	coerced @env0:do: [:each |
		self @env0:add: each
	].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
_update: positional kw: kwargs
	"Variadic set.update(*others): apply update for each argument (0 args is
	a no-op).  BoundMethod routes a multi-/zero-arg call here."

	positional @env0:do: [:each | self update: each].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
_intersection_update: positional kw: kwargs
	"Variadic set.intersection_update(*others)."

	positional @env0:do: [:each | self intersection_update: each].
	^ None
%

category: 'Grail-Mutation Methods'
method: set
_difference_update: positional kw: kwargs
	"Variadic set.difference_update(*others)."

	positional @env0:do: [:each | self difference_update: each].
	^ None
%

set compile_env: 0

! ===============================================================================
! Facade element storage (env 0).  A set's elements live in a PyDict `table`
! (keys = elements, value = a sentinel), keyed by Python __hash__/__eq__ (Phase 1)
! rather than the kernel Set's Smalltalk =/hash.  These override the native
! Collection selectors so that EVERY caller -- the Python protocol on Set
! (SetProtocol.gs), the mutation methods above, set-literal/comprehension codegen,
! the C-shim, and set_iterator -- routes through Python semantics unchanged,
! because they all send @env0:do:/add:/includes:/size/remove:/... which now
! dispatch here for a facade set.  A nil `table` (a set reached before ___pyInitTable___)
! falls back to native kernel storage, and bare kernel Set instances (never a
! `set`/`frozenset`) keep the kernel methods entirely.
! ===============================================================================

category: 'Grail-Facade Construction'
classmethod: set
new
	"Return an empty facade set with its PyDict element table initialized."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	^ inst
%

category: 'Grail-Facade Construction'
classmethod: set
withAll: aCollection
	"Build a facade set from aCollection (dedup by Python __hash__/__eq__ via the
	table).  Overrides kernel Collection class>>withAll: so the instance gets a
	table (the kernel path could allocate via new: and skip our new).

	SNAPSHOT the source first: populating the table calls the elements' Python
	__eq__ (for dedup), and a pathological __eq__ may mutate/clear the source
	mid-iteration (bpo-46615's TestMethodsMutating_Set_List).  Iterating a live
	Grail list being cleared crashes with a kernel OffsetError; copying to an
	Array up front (no user code runs during the copy) makes construction robust
	-- the __eq__ mutation then hits only the original, not our snapshot."

	| inst |
	inst := self new.
	(Array @env0:withAll: aCollection) @env0:do: [:each | inst add: each].
	^ inst
%

category: 'Grail-Facade Storage'
method: set
___pyInitTable___
	"Install a fresh PyDict as the element table (keys = elements)."

	table := PyDict new
%

category: 'Grail-Facade Storage'
method: set
do: aBlock
	"Iterate the elements (the table's keys, in insertion order)."

	table isNil ifTrue: [^ super do: aBlock].
	^ table keysDo: aBlock
%

category: 'Grail-Facade Storage'
method: set
add: anElement
	"Add an element (dedup by Python __hash__/__eq__; first-inserted key kept).
	The value is a fixed sentinel that is never read.  An unhashable element must
	report CPython's ``cannot use 'X' as a set element'' (the PyDict store raises
	it as a ``dict key'').  Re-label only on the exception path -- zero overhead
	for a hashable add -- and let a genuine __eq__ TypeError (not unhashability)
	propagate unchanged.  Covers EVERY add path: s.add(x), set-literal/comprehension
	codegen (@env0:add:), construction (withAll:), and the C-shim."

	table isNil ifTrue: [^ super add: anElement].
	[table at: anElement put: true]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass].
	^ anElement
%

category: 'Grail-Facade Storage'
method: set
includes: anElement
	"Membership by Python __hash__/__eq__ (via PyDict includesKey:).  An
	unhashable element is re-labelled to the set-element TypeError (only on the
	exception path); a stored element's __eq__ raising during the compare is not
	unhashability, so it propagates unchanged."

	table isNil ifTrue: [^ super includes: anElement].
	^ [table includesKey: anElement]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass]
%

category: 'Grail-Facade Storage'
method: set
size
	table isNil ifTrue: [^ super size].
	^ table size
%

category: 'Grail-Facade Storage'
method: set
isEmpty
	table isNil ifTrue: [^ super isEmpty].
	^ table isEmpty
%

category: 'Grail-Facade Storage'
method: set
remove: anElement
	"Remove a present element (callers locate it first).  A no-op if absent."

	table isNil ifTrue: [^ super remove: anElement].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement
%

category: 'Grail-Facade Storage'
method: set
remove: anElement ifAbsent: aBlock
	table isNil ifTrue: [^ super remove: anElement ifAbsent: aBlock].
	(table includesKey: anElement) ifFalse: [^ aBlock value].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement
%

category: 'Grail-Facade Storage'
method: set
removeAll: aCollection
	"Remove every element of aCollection.  ``removeAll: self'' (set>>clear) resets
	the table -- iterating it while removing would mutate mid-iteration."

	table isNil ifTrue: [^ super removeAll: aCollection].
	aCollection == self ifTrue: [table := PyDict new. ^ aCollection].
	aCollection do: [:each | table removeKey: each ifAbsent: [nil]].
	^ aCollection
%
