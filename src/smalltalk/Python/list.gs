! ===============================================================================
! OrderedCollection Methods (Python 'list' type)
! ===============================================================================
! This file contains Python method implementations for OrderedCollection
! to make it behave like Python's list type.
!
! OrderedCollection inherits shared sequence methods from SequenceableCollection.
! This file adds list-specific mutating methods.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from list
expectvalue /Metaclass3
doit
list removeAllMethods: 1.
list class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: list
__new__
	"list() — create an empty list. Receiver is the class."

	^ self ___new___
%

category: 'Grail-Initialization'
classmethod: list
__new__: iterable
	"list(iterable) — create a list from the elements of iterable.
	Receiver is the class.

	Three iteration shapes are recognised, in priority order:
	  1. SequenceableCollection — copy by index for speed.
	  2. Python ``__iter__`` / ``__next__`` protocol — the most
	     general path, used for generators and built-in iterators.
	  3. Python sequence-protocol fallback — when the class
	     defines ``__len__`` + ``__getitem__`` but not ``__iter__``
	     (the re._parser SubPattern idiom).  Walks indices 0..n-1
	     calling __getitem__ on each, matching CPython's iter()
	     behaviour for classes that lack __iter__."

	| result iter done cls hasIter hasGetitem ic |
	result := self ___new___.
	"Strings are SequenceableCollections, but ``at:'' yields Characters, not
	the 1-char Python strings CPython's ``list(str)'' produces.  Route
	CharacterCollections through the __iter__ / sequence-protocol paths below
	instead.  bytes/bytearray are NOT CharacterCollections, so they keep the
	fast path (elements are ints, matching CPython).

	The index-copy fast path is used ONLY for the EXACT built-in sequence
	classes: a subclass may override __iter__ to iterate in a different order
	(seq_tests test_constructors' LyingList/LyingTuple, issue #23757), and
	CPython always constructs via the iterator protocol -- so any subclass
	falls through to the __iter__ path below."
	ic := iterable @env0:class.
	((ic == OrderedCollection) or: [(ic == Array) or: [ic == tuple]]) ifTrue: [
		1 @env0:to: iterable @env0:size do: [:i |
			result @env0:add: (iterable @env0:at: i)
		].
		^ result
	].
	cls := iterable @env0:class.
	hasIter := (cls @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) notNil.
	hasIter ifTrue: [
		iter := iterable __iter__.
		done := false.
		[done] @env0:whileFalse: [
			[result @env0:add: iter __next__]
				@env0:on: StopIteration do: [:ex | done := true]
		].
		^ result
	].
	hasGetitem := (cls @env0:whichClassIncludesSelector: #'__getitem__:' environmentId: 1) notNil.
	hasGetitem ifTrue: [
		| n |
		n := iterable __len__.
		0 @env0:to: n @env0:- 1 do: [:i |
			result @env0:add: (iterable __getitem__: i)
		].
		^ result
	].
	TypeError ___signal___:
		('''' @env0:, cls @env0:name @env0:, ''' object is not iterable')
%

category: 'Grail-Initialization'
method: list
__init__
	"list.__init__() with no iterable clears the list (CPython list___init__
	with no argument).  `a = [1,2,3]; a.__init__()` -> []  (list_tests
	test_init)."

	self @env0:size: 0.
	^ None
%

category: 'Grail-Initialization'
method: list
__init__: iterable
	"list.__init__(iterable) resets the list to the iterable's elements.
	CPython clears then extends; clearing first keeps this idempotent with
	the __new__: population (so plain `list(x)` stays single-populated) while
	an explicit `a.__init__(y)` -- or a list subclass's `super().__init__(y)`
	(list_tests test_init, test_list test_keywords_in_subclass) -- replaces
	the contents."

	self @env0:size: 0.
	self extend: iterable.
	^ None
%

category: 'Grail-Sequence Protocol'
method: list
__delitem__: index
	"Delete the item at the given index, or every item in a slice.
	Supports negative indices (counting from end).  Slice deletion
	is what ``del lst[:]`` (used by re._parser.parse_template's
	literal-buffer reset) and friends compile to."

	| size idx |
	(index isKindOf: slice) ifTrue: [
		^ self ___delSlice___: index
	].
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		TypeError ___signal___: ('list indices must be integers or slices, not '
			@env0:, index @env0:class @env0:name @env0:asString)].
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'list assignment index out of range'
	].

	"Convert to 1-based Smalltalk index"
	self @env0:removeAtIndex: (idx @env0:+ 1).
	^ None
%

category: 'Grail-Sequence Protocol'
method: list
___delSlice___: aSlice
	"Slice deletion.  Normalises the slice against self's size and
	removes every visited index.  For step=1 (the common case) it
	delegates to removeFrom:to:.  Extended-step deletion walks the
	indices in descending order so earlier removes don't shift the
	later ones."

	| size indices lo hi st indicesArray |
	size := self @env0:size.
	indices := aSlice indices: size.
	lo := indices @env0:at: 1.
	hi := indices @env0:at: 2.
	st := indices @env0:at: 3.
	(st @env0:= 1) ifTrue: [
		hi @env0:> lo ifTrue: [
			self @env0:removeFrom: lo @env0:+ 1 to: hi
		].
		^ None
	].
	"Clamp |st| to size+1: visits the same index set while keeping the
	inlined to:by:do: comparisons in SmallInteger range -- a LargeInteger
	step (del a[9::1<<333]) MNUs on the env-1 _nonZeroGte: bridge."
	st := (st @env0:> 0)
		ifTrue: [st @env0:min: size @env0:+ 1]
		ifFalse: [st @env0:max: (size @env0:+ 1) @env0:negated].
	indicesArray := OrderedCollection @env0:new.
	"hi is Python-style EXCLUSIVE: last included index is hi-1 for a
	positive step but hi+1 for a negative one."
	(st @env0:> 0)
		ifTrue: [lo @env0:to: hi @env0:- 1 by: st do: [:i | indicesArray @env0:add: i]]
		ifFalse: [lo @env0:to: hi @env0:+ 1 by: st do: [:i | indicesArray @env0:add: i]].
	"Delete in descending INDEX-VALUE order to avoid renumbering (for a
	negative step the array itself is already descending)."
	(st @env0:> 0)
		ifTrue: [indicesArray @env0:size @env0:to: 1 by: -1 do: [:k |
			self @env0:removeAtIndex: (indicesArray @env0:at: k) @env0:+ 1]]
		ifFalse: [1 @env0:to: indicesArray @env0:size do: [:k |
			self @env0:removeAtIndex: (indicesArray @env0:at: k) @env0:+ 1]].
	^ None
%

category: 'Grail-Other'
method: list
__doc__
	"Return the docstring for list."

	^ 'Built-in mutable sequence.

If no argument is given, the constructor creates a new empty list.
The argument must be an iterable if specified.'
%

category: 'Grail-Sequence Operations'
method: list
__iadd__: other
	"In-place concatenation: self += other. Returns self."

	self extend: other.
	^ self
%

category: 'Grail-Sequence Operations'
method: list
__imul__: n
	"In-place repetition: self *= n. Returns self."

	| original |
	(n @env0:<= 0) ifTrue: [
		self @env0:size: 0.
		^ self
	].
	"lst *= sys.maxsize must raise, not exhaust the gem's temporary
	object memory (test_list_resize_overflow kills the whole session
	otherwise)."
	(self @env0:size @env0:* n) @env0:> 50000000 ifTrue: [
		MemoryError ___signal___: 'repeated list would exhaust memory'].

	original := self @env0:copy.
	(n @env0:- 1) @env0:timesRepeat: [
		self @env0:addAll: original.
	].
	^ self
%

category: 'Grail-Initialization'
classmethod: list
_new: positional kw: kwargs
	"list(**kw) / list(a, b) -- CPython rejects keyword arguments and
	more than one positional; raise the catchable TypeError instead of
	an uncatchable MNU (list_tests' test_keyword_args)."

	(kwargs ~~ nil and: [kwargs @env0:size @env0:> 0]) ifTrue: [
		TypeError ___signal___: 'list() takes no keyword arguments'].
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: 'list expected at most 1 argument, got '
			@env0:, positional @env0:size @env0:printString].
	positional @env0:size @env0:= 0 ifTrue: [^ self __new__].
	^ self __new__: (positional @env0:at: 1)
%

category: 'Grail-Sequence Protocol'
method: list
__iter__
	"Return an iterator over the list."

	^ list_iterator ___on: self
%

category: 'Grail-String Representation'
method: list
__repr__
	"Return a string representation of the list: [item1, item2, ...].
	A self-referential list (l.append(l)) prints '[...]' at the cycle
	like CPython, instead of recursing to AlmostOutOfStack; the
	in-progress set is session-local (repr is not reentrant across
	green threads in a way that matters here)."

	| stream seen |
	seen := SessionTemps @env0:current @env0:at: #GrailReprSeen otherwise: nil.
	seen @env0:isNil ifTrue: [
		seen := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailReprSeen put: seen].
	(seen @env0:includes: self) ifTrue: [^ '[...]'].
	"seen's size is the current repr nesting depth: deep nesting must raise the catchable
	RecursionError before the gem's real stack overflows -- threshold 200
	because a default gem has GEM_MAX_SMALLTALK_STACK_DEPTH 1000 and each
	repr level costs several frames (list_tests test_repr_deep nests 200k)."
	seen @env0:size @env0:> 200 ifTrue: [
		RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object'].
	seen @env0:add: self.
	^ [[ | i |
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $[.
	"Index walk re-reading size each step (like CPython's list_repr): an
	element __repr__ may mutate this very list (test_list test_repr_mutate
	pops during repr), so the visited count follows the CURRENT size."
	i := 1.
	[i @env0:<= self @env0:size] @env0:whileTrue: [
		i @env0:> 1 ifTrue: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: ((self @env0:at: i) __repr__).
		i := i @env0:+ 1].
	stream @env0:nextPut: $].
	stream @env0:contents]
		@env0:on: AlmostOutOfStack do: [:ex |
			"A default gem's stack (GEM_MAX_SMALLTALK_STACK_DEPTH 1000)
			overflows before the seen-size guard fires -- convert the
			resumable notification into CPython's RecursionError."
			RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]
%

category: 'Grail-Sequence Protocol'
method: list
__setitem__: index _: value
	"Set the item at the given index.
	Supports negative indices (counting from end) and slice
	assignment (``lst[i:j] = iterable`` and ``lst[i:j:k] = iterable``).
	Used by re._parser, which rewrites parts of a SubPattern in-place
	via ``subpattern[i:i+1] = p``."

	| size idx |
	(index isKindOf: slice) ifTrue: [
		^ self ___setSlice___: index _: value
	].
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		TypeError ___signal___: ('list indices must be integers or slices, not '
			@env0:, index @env0:class @env0:name @env0:asString)].

	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'list assignment index out of range'
	].

	"Convert to 1-based Smalltalk index"
	self @env0:at: (idx @env0:+ 1) put: value.
	^ None
%

category: 'Grail-Sequence Protocol'
method: list
___setSlice___: aSlice _: anIterable
	"Slice assignment.  Replaces self[lo..hi] with anIterable's
	items, growing or shrinking as needed.  For the simple
	contiguous case (step = 1, the only case re._parser uses) it
	delegates to OrderedCollection's removeFrom:to: + addAll:.  An
	extended slice (step != 1) requires len(iterable) == slice
	length and replaces one-for-one."

	| size indices lo hi st values len indicesArray |
	"Coerce anIterable to an array FIRST.  Python iterables that aren't
	SequenceableCollections (e.g. re._parser SubPattern, which exposes
	its data through an env-1 __iter__/__next__ pair) need to go
	through the list constructor's iteration loop, not Smalltalk
	asArray -- and that loop runs USER __iter__ code which may mutate
	self (gh-120384: an evil iterable clearing the target list), so
	the slice indices must be computed from the post-iteration size."
	"CharacterCollections take the constructor path too (asArray would yield
	Characters, not 1-char strings) -- ``a[i:j] = 'ham''' assigns strings."
	values := ((anIterable isKindOf: SequenceableCollection)
			and: [(anIterable isKindOf: CharacterCollection) not])
		ifTrue: [anIterable @env0:asArray]
		ifFalse: [(list __new__: anIterable) @env0:asArray].
	len := values @env0:size.
	size := self @env0:size.
	indices := aSlice indices: size.
	lo := indices @env0:at: 1.
	hi := indices @env0:at: 2.
	st := indices @env0:at: 3.
	"Clamp |st| to size+1 -- see ___delSlice___ (LargeInteger steps MNU
	on the env-1 _nonZeroGte: bridge inside inlined to:by:do:)."
	st := (st @env0:> 0)
		ifTrue: [st @env0:min: size @env0:+ 1]
		ifFalse: [st @env0:max: (size @env0:+ 1) @env0:negated].
	(st @env0:= 1) ifTrue: [
		"Contiguous: remove [lo..hi) then insert new items at lo."
		hi @env0:> lo ifTrue: [
			self @env0:removeFrom: lo @env0:+ 1 to: hi
		].
		1 @env0:to: len do: [:i |
			self @env0:add: (values @env0:at: i)
				beforeIndex: lo @env0:+ i
		].
		^ None
	].
	"Extended slice: must match length.  hi is Python-style EXCLUSIVE:
	the last included index is hi-1 for a positive step but hi+1 for a
	negative one (a[::-1] on size 4 -> lo 3, hi -1, st -1 -> 3..0)."
	indicesArray := OrderedCollection @env0:new.
	(st @env0:> 0)
		ifTrue: [lo @env0:to: hi @env0:- 1 by: st do: [:i | indicesArray @env0:add: i]]
		ifFalse: [lo @env0:to: hi @env0:+ 1 by: st do: [:i | indicesArray @env0:add: i]].
	(indicesArray @env0:size @env0:= len) ifFalse: [
		ValueError ___signal___:
			('attempt to assign sequence of size ' @env0:,
				len @env0:printString @env0:,
				' to extended slice of size ' @env0:,
				indicesArray @env0:size @env0:printString)
	].
	1 @env0:to: len do: [:i |
		self @env0:at: (indicesArray @env0:at: i) @env0:+ 1
			put: (values @env0:at: i)
	].
	^ None
%

category: 'Grail-List Methods'
method: list
append: item
	"Add item to the end of the list."

	self @env0:add: item.
	^ None
%

category: 'Grail-List Methods'
method: list
clear
	"Remove all items from the list."

	self @env0:size: 0.
	^ None
%

category: 'Grail-List Methods'
method: list
copy
	"Return a shallow copy of the list."

	^ self @env0:copy
%

category: 'Grail-List Methods'
method: list
extend: iterable
	"Extend the list by appending all items from iterable.  A plain
	addAll: sends #do: to the argument, which is an uncatchable MNU for
	non-collections (a.extend(None)) -- probe for iterability and route
	Python-protocol iterables through __iter__/__next__ instead."

	"Strings are Collections, but addAll: iterates them with Smalltalk do:
	yielding Characters, not the 1-char Python strings CPython's
	``list.extend(str)'' appends -- route CharacterCollections through the
	__iter__ path below so ``a.extend('eggs')'' matches ``a += list('eggs')''
	(test_list's test_extend / test_iadd)."
	((iterable isKindOf: Collection)
		and: [(iterable isKindOf: CharacterCollection) not]) ifTrue: [
		self @env0:addAll: iterable.
		^ None].
	((iterable @env0:class
		@env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) ~~ nil) ifTrue: [
		| iter done |
		iter := iterable __iter__.
		done := false.
		[done] @env0:whileFalse: [
			[self @env0:add: iter __next__]
				@env0:on: StopIteration do: [:ex | done := true]].
		^ None].
	TypeError ___signal___: '''' @env0:, iterable @env0:class @env0:name @env0:asString
		@env0:, ''' object is not iterable'
%

category: 'Grail-List Methods'
method: list
insert: index _: item
	"Insert item before the given index."

	| size idx temp |
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		temp := size @env0:+ idx.
		idx := temp @env0:max: 0
	].

	"Clamp to valid range"
	temp := idx @env0:max: 0.
	idx := temp @env0:min: size.

	"Convert to 1-based Smalltalk index (add at position idx+1)"
	(idx @env0:= 0)
		ifTrue: [self @env0:addFirst: item]
		ifFalse: [self @env0:add: item afterIndex: idx].
	^ None
%

category: 'Grail-List Methods'
method: list
pop
	"Remove and return the last item. Raises IndexError if list is empty."

	| size |
	size := self @env0:size.
	(size == 0) ifTrue: [
		IndexError ___signal___: 'pop from empty list'
	].

	^ self @env0:removeLast
%

category: 'Grail-List Methods'
method: list
pop: index
	"Remove and return the item at index. Raises IndexError if index is out of range."

	| size idx item stIdx |
	size := self @env0:size.
	idx := index.

	"Handle negative indices"
	(idx @env0:< 0) ifTrue: [
		idx := size @env0:+ idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx @env0:< 0) or: [
		idx @env0:>= size
	]) ifTrue: [
		IndexError ___signal___: 'pop index out of range'
	].

	"Convert to 1-based Smalltalk index"
	stIdx := idx @env0:+ 1.
	item := self @env0:at: stIdx.
	self @env0:removeAtIndex: stIdx.
	^ item
%

category: 'Grail-List Methods'
method: list
remove: value
	"Remove the first element equal to value (Python rich equality: identity,
	then element.__eq__, then reflected), NOT Smalltalk `remove:` (`=`) which
	misses custom __eq__ and identity (list_tests test_remove: ALWAYS_EQ /
	NEVER_EQ / BadCmp).  Raises ValueError if no element matches.  Size is
	re-read each step so a mutating/raising __eq__ is safe."

	| i |
	i := 1.
	[i @env0:<= self @env0:size] @env0:whileTrue: [
		((self @env0:at: i) ___pyRichEqBool___: value) ifTrue: [
			self @env0:removeAtIndex: i.
			^ None].
		i := i @env0:+ 1].
	^ ValueError ___signal___: 'list.remove(x): x not in list'
%

category: 'Grail-List Methods'
method: list
reverse
	"Reverse the list in place."

	| reversed |
	reversed := self @env0:reversed.
	self @env0:size: 0.
	self @env0:addAll: reversed.
	^ None
%

category: 'Grail-List Methods'
method: list
sort
	"Sort the list IN PLACE using Python's __lt__ for comparison.
	GemStone's ``sort:'' returns a fresh sorted Array rather than
	reordering the receiver, so copy the result back over the
	receiver's slots to get true in-place semantics."

	| sorted |
	sorted := self @env0:sort: [:a :b | a __lt__: b].
	self @env0:replaceFrom: 1 to: self @env0:size with: sorted startingAt: 1.
	^ None
%

category: 'Grail-List Methods'
method: list
_sort: positional kw: kwargs
	"Python list.sort(*, key=None, reverse=False) — in-place sort with
	the keyword-only ``key'' and ``reverse'' args.  Mirrors the
	builtins ``_sorted:kw:'' comparison logic but sorts the receiver in
	place (and returns None).  flask's routing sorts the rule list with
	a key at request time."

	| keyFn reverse sortBlock sorted n0 |
	"key and reverse are keyword-ONLY (Python ``sort(*, key=None,
	reverse=False)``); any positional argument is a TypeError (list_tests
	test_sort: u.sort(42, 42))."
	(positional @env0:notNil and: [positional @env0:isEmpty @env0:not]) ifTrue: [
		TypeError ___signal___: 'sort() takes no positional arguments'].
	keyFn := kwargs @env0:isNil
		ifTrue: [nil]
		ifFalse: [kwargs @env0:at: 'key' ifAbsent: [nil]].
	reverse := kwargs @env0:isNil
		ifTrue: [false]
		ifFalse: [kwargs @env0:at: 'reverse' ifAbsent: [false]].
	sortBlock := keyFn @env0:isNil
		ifTrue: [
			reverse ___isTruthy___
				ifTrue: [[:a :b | b __lt__: a]]
				ifFalse: [[:a :b | a __lt__: b]]]
		ifFalse: [
			reverse ___isTruthy___
				ifTrue: [[:a :b |
					(keyFn value: { b } value: nil)
						__lt__: (keyFn value: { a } value: nil)]]
				ifFalse: [[:a :b |
					(keyFn value: { a } value: nil)
						__lt__: (keyFn value: { b } value: nil)]]].
	"Sort a SNAPSHOT (asArray) rather than self, so a comparison callback
	that mutates self during the sort cannot corrupt the sort primitive
	(GemStone's in-place sort walks stale offsets -> OffsetError otherwise).
	CPython forbids mutating a list while it is being sorted and raises
	``ValueError: list modified during sort'' (list_tests test_sort's
	selfmodifyingComparison); detect the size change and do the same before
	copying the sorted snapshot back over the (unchanged-length) receiver."
	n0 := self @env0:size.
	sorted := (self @env0:asArray) @env0:sort: sortBlock.
	(self @env0:size @env0:~= n0) ifTrue: [
		ValueError ___signal___: 'list modified during sort'].
	self @env0:replaceFrom: 1 to: n0 with: sorted startingAt: 1.
	^ None
%

set compile_env: 0
