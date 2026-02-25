! ===============================================================================
! SequenceableCollection Methods (Python sequence protocol)
! ===============================================================================
! This file contains Python method implementations for SequenceableCollection
! that are shared by both list (OrderedCollection) and tuple (InvariantArray).
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from SequenceableCollection
expectvalue /Metaclass3
doit
SequenceableCollection removeAllMethods: 1.
SequenceableCollection class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Sequence Operations'
method: SequenceableCollection
__add__: other
	"Concatenate two sequences. Returns a new sequence of the same type."

	| result x |
	result := self ___copy___.
	result ___addAll___: other.
	^ result
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__contains__: item
	"Return True if item is in the sequence, False otherwise."

	^ self ___includes___: item
%

category: 'Python-Other'
method: SequenceableCollection
__doc__
	"Return the docstring for SequenceableCollection."

	^ 'Base class for sequences (list, tuple, etc.)'
%

category: 'Python-Comparison'
method: SequenceableCollection
__eq__: other
	"Return True if sequences are equal (same type, same length, same elements)."

	| myClass otherClass |
	myClass := self ___class___.
	otherClass := other ___class___.
	
	"Must be same class"
	myClass == otherClass ifFalse: [^ false].
	
	"Use Smalltalk's = for comparison"
	^ self ___eq___: other
%

category: 'Python-Comparison'
method: SequenceableCollection
__ge__: other
	"Lexicographic comparison: self >= other"

	^ self ___ge___: other
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__getitem__: index
	"Return the item at the given index.
	Supports negative indices (counting from end).
	TODO: Support slicing."

	| size idx |
	size := self ___size___.
	idx := index.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		idx := size ___plus___: idx
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx ___lt___: 0) or: [
		idx ___ge___: size
	]) ifTrue: [
		IndexError ___signal___: 'list index out of range'
	].

	"Convert to 1-based Smalltalk index"
	^ self ___at___: (idx ___plus___: 1)
%

category: 'Python-Comparison'
method: SequenceableCollection
__gt__: other
	"Lexicographic comparison: self > other"

	^ self ___gt___: other
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__iter__
	"Return an iterator over the sequence.
	Subclasses must override this to return an appropriate iterator instance."

	self perform: #subclassResponsibility env: 0
%

category: 'Python-Comparison'
method: SequenceableCollection
__le__: other
	"Lexicographic comparison: self <= other"

	^ self ___le___: other
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__len__
	"Return the length of the sequence."

	^ self ___size___
%

category: 'Python-Comparison'
method: SequenceableCollection
__lt__: other
	"Lexicographic comparison: self < other"

	^ self ___lt___: other
%

category: 'Python-Sequence Operations'
method: SequenceableCollection
__mul__: n
	"Repeat the sequence n times. Returns a new sequence."

	| result |
	result := (self perform: #species env: 0) ___new___.
	(n ___le___: 0) ifTrue: [
		^ result
	].

	n ___timesRepeat___: [result ___addAll___: self].
	^ result
%

category: 'Python-Comparison'
method: SequenceableCollection
__ne__: other
	"Return True if sequences are not equal."

	^ (self __eq__: other) ___not___
%

category: 'Python-String Representation'
method: SequenceableCollection
__repr__
	"Return a string representation of the sequence.
	Subclasses override to provide list vs tuple formatting."

	| stream |
	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPut___: $[.

	self perform: #do:separatedBy: env: 0 withArguments: {
		[:each |
			| reprStr |
			reprStr := each __repr__.
			stream ___nextPutAll___: reprStr
		].
		[stream ___nextPutAll___: ', ']
	}.

	stream ___nextPut___: $].
	^ stream ___contents___
%

category: 'Python-Sequence Operations'
method: SequenceableCollection
__rmul__: n
	"Reverse multiply: n * sequence. Same as __mul__."

	^ self __mul__: n
%

category: 'Python-String Representation'
method: SequenceableCollection
__str__
	"Return a string representation. Same as __repr__ for sequences."

	^ self __repr__
%

category: 'Python-Sequence Methods'
method: SequenceableCollection
count: value
	"Return the number of times value appears in the sequence."

	| count |
	count := 0.
	self ___do___: [:each |
		(each ___eq___: value) ifTrue: [
			count := count ___plus___: 1
		]
	].
	^ count
%

category: 'Python-Sequence Methods'
method: SequenceableCollection
index: value
	"Return the index of the first occurrence of value.
	Raises ValueError if value is not found."

	| idx |
	idx := self ___indexOf___: value ifAbsent: [ValueError ___signal___: 'list.index(x): x not in list'].

	"Convert from 1-based Smalltalk to 0-based Python"
	^ idx ___minus___: (1)
%

set compile_env: 0
