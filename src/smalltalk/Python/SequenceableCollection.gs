! ===============================================================================
! SequenceableCollection Methods (Python sequence protocol)
! ===============================================================================
! This file contains Python method implementations for SequenceableCollection
! that are shared by both list (OrderedCollection) and tuple (Array subclass).
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from SequenceableCollection
expectvalue /Metaclass3
doit
SequenceableCollection removeAllMethods: 1.
SequenceableCollection class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Sequence Operations'
method: SequenceableCollection
__add__: other
	"Concatenate two sequences. Returns a new sequence of the same type.
	Python only concatenates like kinds: list+tuple / list+int raise the
	catchable TypeError (previously [1] + (1,) silently concatenated)."

	| result x |
	(self ___sameSequenceKindAs___: other) ifFalse: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].

	result := self @env0:copy.
	result @env0:addAll: other.
	^ result
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__contains__: item
	"Return True if item is in the sequence.  CPython compares each element
	with the target via rich equality (identity first, then element.__eq__,
	then reflected), in order -- NOT Smalltalk `includes:` (`=`), which
	misses custom __eq__ (ALWAYS_EQ in [1]) and ignores comparison order /
	side effects (seq_tests test_contains_fake / test_contains_order).  Size
	is re-read each step so an __eq__ that mutates the sequence stays safe."

	| i |
	i := 1.
	[i @env0:<= self @env0:size] @env0:whileTrue: [
		((self @env0:at: i) ___pyRichEqBool___: item) ifTrue: [^ true].
		i := i @env0:+ 1].
	^ false
%

category: 'Grail-Other'
method: SequenceableCollection
__doc__
	"Return the docstring for SequenceableCollection."

	^ 'Base class for sequences (list, tuple, etc.)'
%

category: 'Grail-Comparison'
method: SequenceableCollection
__eq__: other
	"Return True if sequences are equal (same type, same length, same elements)."

	| myClass otherClass |
	myClass := self @env0:class.
	otherClass := other @env0:class.

	"Same class: Smalltalk's structural = is the fast path -- but it recurses
	into elements with Smalltalk =, which demands same-class elements.  A
	content-equal element pair of differing Smalltalk class (a plain
	KeyValueDictionary from __dict__ / globals reflection vs a PyDict
	literal; or 1 vs 1.0) fails that check though Python == holds.  Trust a
	TRUE result; on FALSE fall back to element-wise env-1 __eq__ (Python
	semantics), the same rule the cross-class branch below uses."
	myClass == otherClass ifTrue: [
		(self @env0:= other) ifTrue: [^ true].
		(self @env0:size) @env0:= (other @env0:size) ifFalse: [^ false].
		1 @env0:to: self @env0:size do: [:i |
			(((self @env0:at: i) __eq__: (other @env0:at: i)) == true)
				ifFalse: [^ false]].
		^ true].

	"Cross-class LIST comparison: plain Array and OrderedCollection both
	surrogate Python ``list'' (historically str.split returned Arrays;
	splat/varargs still produce them), and Python compares lists by
	content.  tuple is an Array SUBCLASS and a distinct Python type, so
	the Array side uses an exact-class check -- [1] == (1,) stays False.
	Elements compare through env-1 __eq__ so Python semantics (nested
	lists, None, cross-class strings) hold."
	((myClass == Array or: [self isKindOf: OrderedCollection])
		and: [otherClass == Array or: [other isKindOf: OrderedCollection]])
		ifTrue: [
			(self @env0:size) @env0:= (other @env0:size) ifFalse: [^ false].
			1 @env0:to: self @env0:size do: [:i |
				(((self @env0:at: i) __eq__: (other @env0:at: i)) == true)
					ifFalse: [^ false]].
			^ true].
	^ false
%

category: 'Grail-Comparison'
method: SequenceableCollection
___sameSequenceKindAs___: other
	"True when self and other are the same ordered Python sequence kind
	(so lexicographic comparison applies): both tuples, both lists
	(OrderedCollection or exact plain Array), or both bytes-like."

	| selfList otherList |
	((self isKindOf: tuple) and: [other isKindOf: tuple])
		ifTrue: [^ true].
	((self isKindOf: ByteArray) and: [other isKindOf: ByteArray])
		ifTrue: [^ true].
	"Plain Array (EXACT class) is Grail's ambiguous sequence carrier:
	*args captures, splat results, and legacy subStrings products all
	materialize as Arrays whether CPython would have a tuple or a list.
	Until varargs capture produces real tuples, a plain Array
	interoperates with BOTH kinds -- django's URL resolver concatenates
	an *args Array with a converters tuple on every resolve.  The
	strict pairs (OrderedCollection vs tuple) still raise."
	(self @env0:class == Array or: [other @env0:class == Array])
		ifTrue: [^ true].
	selfList := self isKindOf: OrderedCollection.
	otherList := other isKindOf: OrderedCollection.
	^ selfList and: [otherList]
%

category: 'Grail-Comparison'
method: SequenceableCollection
__ge__: other
	"Lexicographic comparison: self >= other.  GemStone
	SequenceableCollection doesn't expose ``>=`` directly, so
	implement Python's element-by-element rule explicitly:
	compare prefix elements until one differs, then the result is
	the elements' comparison; if the prefix is identical the
	longer (or equal-length) sequence wins."

	| size otherSize minSize i a b |
	"Ordering is defined only within the same Python sequence kind:
	tuple-vs-tuple, list-vs-list (OrderedCollection / plain Array both
	surrogate list), bytes-vs-bytes.  Anything else -- including
	tuple-vs-list and range (Interval), which CPython leaves
	unorderable -- takes the reflected-op / TypeError fallback instead
	of silently comparing sizes."
	(self ___sameSequenceKindAs___: other)
		ifFalse: [^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	size := self @env0:size.
	otherSize := other @env0:size.
	minSize := size @env0:min: otherSize.
	i := 1.
	[i @env0:<= minSize] @env0:whileTrue: [
		a := self @env0:at: i.
		b := other @env0:at: i.
		(a @env0:= b) ifFalse: [^ a __ge__: b].
		i := i @env0:+ 1
	].
	^ size @env0:>= otherSize
%

category: 'Grail-Comparison'
method: SequenceableCollection
__gt__: other
	| size otherSize minSize i a b |
	"Ordering is defined only within the same Python sequence kind:
	tuple-vs-tuple, list-vs-list (OrderedCollection / plain Array both
	surrogate list), bytes-vs-bytes.  Anything else -- including
	tuple-vs-list and range (Interval), which CPython leaves
	unorderable -- takes the reflected-op / TypeError fallback instead
	of silently comparing sizes."
	(self ___sameSequenceKindAs___: other)
		ifFalse: [^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	size := self @env0:size.
	otherSize := other @env0:size.
	minSize := size @env0:min: otherSize.
	i := 1.
	[i @env0:<= minSize] @env0:whileTrue: [
		a := self @env0:at: i.
		b := other @env0:at: i.
		(a @env0:= b) ifFalse: [^ a __gt__: b].
		i := i @env0:+ 1
	].
	^ size @env0:> otherSize
%

category: 'Grail-Comparison'
method: SequenceableCollection
__le__: other
	| size otherSize minSize i a b |
	"Ordering is defined only within the same Python sequence kind:
	tuple-vs-tuple, list-vs-list (OrderedCollection / plain Array both
	surrogate list), bytes-vs-bytes.  Anything else -- including
	tuple-vs-list and range (Interval), which CPython leaves
	unorderable -- takes the reflected-op / TypeError fallback instead
	of silently comparing sizes."
	(self ___sameSequenceKindAs___: other)
		ifFalse: [^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	size := self @env0:size.
	otherSize := other @env0:size.
	minSize := size @env0:min: otherSize.
	i := 1.
	[i @env0:<= minSize] @env0:whileTrue: [
		a := self @env0:at: i.
		b := other @env0:at: i.
		(a @env0:= b) ifFalse: [^ a __le__: b].
		i := i @env0:+ 1
	].
	^ size @env0:<= otherSize
%

category: 'Grail-Comparison'
method: SequenceableCollection
__lt__: other
	| size otherSize minSize i a b |
	"Ordering is defined only within the same Python sequence kind:
	tuple-vs-tuple, list-vs-list (OrderedCollection / plain Array both
	surrogate list), bytes-vs-bytes.  Anything else -- including
	tuple-vs-list and range (Interval), which CPython leaves
	unorderable -- takes the reflected-op / TypeError fallback instead
	of silently comparing sizes."
	(self ___sameSequenceKindAs___: other)
		ifFalse: [^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	size := self @env0:size.
	otherSize := other @env0:size.
	minSize := size @env0:min: otherSize.
	i := 1.
	[i @env0:<= minSize] @env0:whileTrue: [
		a := self @env0:at: i.
		b := other @env0:at: i.
		(a @env0:= b) ifFalse: [^ a __lt__: b].
		i := i @env0:+ 1
	].
	^ size @env0:< otherSize
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__getitem__: index
	"Return the item at the given index.
	Supports negative indices (counting from end) and slice
	subscripts (``xs[i:j:k]`` — codegen now passes a real
	``slice`` instance instead of three separate bounds, so
	receivers that want list-style slicing dispatch here)."

	| size idx |
	(index isKindOf: slice) ifTrue: [
		^ self ___getslice___: index start
			_: index stop
			_: index step
	].
	"Non-integer, non-slice index: catchable TypeError (CPython message
	shape) instead of an uncatchable env-0 comparison DNU on the index."
	((index isKindOf: Integer)
		or: [(index @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		| seqName |
		"CPython names the sequence type: 'list indices must be integers or
		slices, not str' (list_tests test_getitem_error).  list is a raw
		OrderedCollection, tuple is Array/its subclass."
		seqName := (self @env0:isKindOf: OrderedCollection)
			ifTrue: ['list']
			ifFalse: [(self @env0:isKindOf: Array) ifTrue: ['tuple']
				ifFalse: [self @env0:class @env0:name @env0:asString]].
		TypeError ___signal___: (seqName @env0:, ' indices must be integers or slices, not '
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
		IndexError ___signal___: 'list index out of range'
	].

	"Convert to 1-based Smalltalk index"
	^ self @env0:at: (idx @env0:+ 1)
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
___getslice___: lower _: upper _: step
	"Return a slice of self. lower/upper/step are integers or None for
	defaults. Negative indices count from the end and are clamped to the
	collection. Step must be non-zero; negative step yields a reverse
	slice. Empty slices return an empty copy of the same species.

	This is the runtime target for Python `self[lower:upper:step]`
	expressions emitted by SubscriptAst when its slice is a SliceAst."

	| size lo hi st result i lwr upr |
	size := self @env0:size.
	"The subscript slice passes the Python None singleton (not Smalltalk nil)
	for an unset bound/step; normalise so the ifNil: defaults fire instead of
	comparing None with an integer (a[2:4] has step None -- test_list's
	test_getslice / test_subscript)."
	lwr := (lower @env0:== None) ifTrue: [nil] ifFalse: [lower].
	upr := (upper @env0:== None) ifTrue: [nil] ifFalse: [upper].
	st := ((step @env0:== None) or: [step @env0:isNil]) ifTrue: [1] ifFalse: [step].
	st @env0:= 0 ifTrue: [ValueError ___signal___: 'slice step cannot be zero'].

	"Normalize lower"
	lo := lwr
		ifNil: [st @env0:> 0 ifTrue: [0] ifFalse: [size @env0:- 1]]
		ifNotNil: [lwr @env0:< 0
			ifTrue: [(size @env0:+ lwr) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [lwr @env0:min:
				(st @env0:> 0 ifTrue: [size] ifFalse: [size @env0:- 1])]].

	"Normalize upper"
	hi := upr
		ifNil: [st @env0:> 0 ifTrue: [size] ifFalse: [-1]]
		ifNotNil: [upr @env0:< 0
			ifTrue: [(size @env0:+ upr) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [upr @env0:min:
				(st @env0:> 0 ifTrue: [size] ifFalse: [size @env0:- 1])]].

	"Walk lo, lo+st, lo+2st, ... while the index is on the correct side
	of hi for the step direction. Result is an instance of the same
	species (OrderedCollection for lists, String for strings, ...)."
	result := self @env0:species @env0:new.
	i := lo.
	st @env0:> 0
		ifTrue: [[i @env0:< hi] whileTrue: [
			result @env0:add: (self @env0:at: i @env0:+ 1).
			i := i @env0:+ st]]
		ifFalse: [[i @env0:> hi] whileTrue: [
			result @env0:add: (self @env0:at: i @env0:+ 1).
			i := i @env0:+ st]].
	^ result
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__iter__
	"Return an iterator over the sequence.  Subclasses such as
	OrderedCollection and tuple override this with a class-specific
	iterator; concrete subclasses without an override (e.g. plain
	Array, which is what Interval>>___getslice___ returns) fall through
	to a generic tuple_iterator wrapping the receiver."

	^ tuple_iterator ___on: self
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__len__
	"Return the length of the sequence."

	^ self @env0:size
%

category: 'Grail-Sequence Operations'
method: SequenceableCollection
__mul__: n
	"Repeat the sequence n times. Returns a new sequence."

	| result |
	((n isKindOf: Integer)
		or: [(n @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		^ self ___binOpFallback___: n op: '*' reflected: #'__rmul__:'].
	result := (self @env0:species) ___new___.
	(n @env0:<= 0) ifTrue: [
		^ result
	].
	"seq * sys.maxsize must raise, not exhaust the gem's temporary
	object memory (test_list_resize_overflow kills the session
	otherwise)."
	(self @env0:size @env0:* n) @env0:> 50000000 ifTrue: [
		MemoryError ___signal___: 'repeated sequence would exhaust memory'].

	n @env0:timesRepeat: [result @env0:addAll: self].
	^ result
%

category: 'Grail-Comparison'
method: SequenceableCollection
__ne__: other
	"Return True if sequences are not equal."

	^ (self __eq__: other) @env0:not
%

category: 'Grail-String Representation'
method: SequenceableCollection
__repr__
	"Return a string representation of the sequence.
	Subclasses override to provide list vs tuple formatting."

	| stream |
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $[.

	self @env0:do: [:each |
			| reprStr |
			reprStr := each __repr__.
			stream @env0:nextPutAll: reprStr
		] separatedBy: [stream @env0:nextPutAll: ', '].

	stream @env0:nextPut: $].
	^ stream @env0:contents
%

category: 'Grail-Sequence Operations'
method: SequenceableCollection
__rmul__: n
	"Reverse multiply: n * sequence. Same as __mul__."

	^ self __mul__: n
%

category: 'Grail-String Representation'
method: SequenceableCollection
__str__
	"Return a string representation. Same as __repr__ for sequences."

	^ self __repr__
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
count: value
	"Return the number of times value appears in the sequence, comparing by
	Python rich equality (see __contains__), not Smalltalk `=` -- so custom
	__eq__ is honored (seq_tests test_count: [0,1,2]*3 count ALWAYS_EQ == 9)."

	| count i |
	count := 0.
	i := 1.
	[i @env0:<= self @env0:size] @env0:whileTrue: [
		((self @env0:at: i) ___pyRichEqBool___: value) ifTrue: [count := count @env0:+ 1].
		i := i @env0:+ 1].
	^ count
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
index: value
	"list.index(value): first index of value (Python rich equality),
	ValueError if absent."

	^ self ___pyIndex___: value from: 0 to: self @env0:size
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
index: value _: start
	"list.index(value, start): search from Python index `start`."

	^ self ___pyIndex___: value from: start to: self @env0:size
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
index: value _: start _: stop
	"list.index(value, start, stop): search the Python half-open range
	[start, stop)."

	^ self ___pyIndex___: value from: start to: stop
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
___pyIndex___: value from: pStart to: pStop
	"Shared index() scan.  pStart/pStop are Python indices (negative allowed,
	slice-style clamped to [0, size]); compare each element in the half-open
	range by rich equality and answer the first 0-based match, else raise
	ValueError.  Size is re-read each step so an __eq__ mutating the sequence
	cannot walk off the end (list_tests test_index EvilCmp)."

	| n lo hi i |
	n := self @env0:size.
	lo := pStart.  hi := pStop.
	(lo @env0:< 0) ifTrue: [lo := lo @env0:+ n.  (lo @env0:< 0) ifTrue: [lo := 0]].
	(lo @env0:> n) ifTrue: [lo := n].
	(hi @env0:< 0) ifTrue: [hi := hi @env0:+ n.  (hi @env0:< 0) ifTrue: [hi := 0]].
	(hi @env0:> n) ifTrue: [hi := n].
	i := lo.
	[(i @env0:< hi) and: [i @env0:< self @env0:size]] @env0:whileTrue: [
		((self @env0:at: i @env0:+ 1) ___pyRichEqBool___: value) ifTrue: [^ i].
		i := i @env0:+ 1].
	^ ValueError ___signal___: 'list.index(x): x not in list'
%

set compile_env: 0
