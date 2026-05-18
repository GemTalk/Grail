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
	"Concatenate two sequences. Returns a new sequence of the same type."

	| result x |
	result := self @env0:copy.
	result @env0:addAll: other.
	^ result
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__contains__: item
	"Return True if item is in the sequence, False otherwise."

	^ self @env0:includes: item
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
	
	"Must be same class"
	myClass == otherClass ifFalse: [^ false].
	
	"Use Smalltalk's = for comparison"
	^ self @env0:= other
%

category: 'Grail-Comparison'
method: SequenceableCollection
__ge__: other
	"Lexicographic comparison: self >= other"

	^ self @env0:>= other
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
	(index @env0:isKindOf: slice) ifTrue: [
		^ self @env1:__getslice__: index @env1:start
			_: index @env1:stop
			_: index @env1:step
	].
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
__getslice__: lower _: upper _: step
	"Return a slice of self. lower/upper/step are integers or None for
	defaults. Negative indices count from the end and are clamped to the
	collection. Step must be non-zero; negative step yields a reverse
	slice. Empty slices return an empty copy of the same species.

	This is the runtime target for Python `self[lower:upper:step]`
	expressions emitted by SubscriptAst when its slice is a SliceAst."

	| size lo hi st result i |
	size := self @env0:size.
	st := step ifNil: [1].
	st @env0:= 0 ifTrue: [ValueError ___signal___: 'slice step cannot be zero'].

	"Normalize lower"
	lo := lower
		ifNil: [st @env0:> 0 ifTrue: [0] ifFalse: [size @env0:- 1]]
		ifNotNil: [lower @env0:< 0
			ifTrue: [(size @env0:+ lower) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [lower @env0:min:
				(st @env0:> 0 ifTrue: [size] ifFalse: [size @env0:- 1])]].

	"Normalize upper"
	hi := upper
		ifNil: [st @env0:> 0 ifTrue: [size] ifFalse: [-1]]
		ifNotNil: [upper @env0:< 0
			ifTrue: [(size @env0:+ upper) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [upper @env0:min:
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

category: 'Grail-Comparison'
method: SequenceableCollection
__gt__: other
	"Lexicographic comparison: self > other"

	^ self @env0:> other
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__iter__
	"Return an iterator over the sequence.  Subclasses such as
	OrderedCollection and tuple override this with a class-specific
	iterator; concrete subclasses without an override (e.g. plain
	Array, which is what Interval>>__getslice__ returns) fall through
	to a generic tuple_iterator wrapping the receiver."

	^ tuple_iterator @env1:___on: self
%

category: 'Grail-Comparison'
method: SequenceableCollection
__le__: other
	"Lexicographic comparison: self <= other"

	^ self @env0:<= other
%

category: 'Grail-Sequence Protocol'
method: SequenceableCollection
__len__
	"Return the length of the sequence."

	^ self @env0:size
%

category: 'Grail-Comparison'
method: SequenceableCollection
__lt__: other
	"Lexicographic comparison: self < other"

	^ self @env0:< other
%

category: 'Grail-Sequence Operations'
method: SequenceableCollection
__mul__: n
	"Repeat the sequence n times. Returns a new sequence."

	| result |
	result := (self @env0:species) ___new___.
	(n @env0:<= 0) ifTrue: [
		^ result
	].

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
	"Return the number of times value appears in the sequence."

	| count |
	count := 0.
	self @env0:do: [:each |
		(each @env0:= value) ifTrue: [
			count := count @env0:+ 1
		]
	].
	^ count
%

category: 'Grail-Sequence Methods'
method: SequenceableCollection
index: value
	"Return the index of the first occurrence of value.
	Raises ValueError if value is not found."

	| idx |
	idx := self @env0:indexOf: value ifAbsent: [ValueError ___signal___: 'list.index(x): x not in list'].

	"Convert from 1-based Smalltalk to 0-based Python"
	^ idx @env0:- (1)
%

set compile_env: 0
