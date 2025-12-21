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
SequenceableCollection removeAllMethods: 2.
SequenceableCollection class removeAllMethods: 2.
%

! ------------------- Instance methods for SequenceableCollection
set compile_env: 2

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__len__
	"Return the length of the sequence."

	^ self perform: #size env: 0
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__getitem__: index
	"Return the item at the given index.
	Supports negative indices (counting from end).
	TODO: Support slicing."

	| size idx |
	size := self perform: #size env: 0.
	idx := index.

	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].

	"Check bounds (Python uses 0-based indexing)"
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'list index out of range'}
	].

	"Convert to 1-based Smalltalk index"
	^ self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%

category: 'Python-Sequence Protocol'
method: SequenceableCollection
__contains__: item
	"Return True if item is in the sequence, False otherwise."

	^ self perform: #includes: env: 0 withArguments: {item}
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
__eq__: other
	"Return True if sequences are equal (same type, same length, same elements)."

	| myClass otherClass |
	myClass := self perform: #class env: 0.
	otherClass := other perform: #class env: 0.
	
	"Must be same class"
	myClass == otherClass ifFalse: [^ false].
	
	"Use Smalltalk's = for comparison"
	^ self with: other perform: #= env: 0
%

category: 'Python-Comparison'
method: SequenceableCollection
__ne__: other
	"Return True if sequences are not equal."

	^ (self perform: #__eq__: env: 2 withArguments: {other}) perform: #not env: 0
%

category: 'Python-Comparison'
method: SequenceableCollection
__lt__: other
	"Lexicographic comparison: self < other"

	^ self perform: #< env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: SequenceableCollection
__le__: other
	"Lexicographic comparison: self <= other"

	^ self perform: #<= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: SequenceableCollection
__gt__: other
	"Lexicographic comparison: self > other"

	^ self perform: #> env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: SequenceableCollection
__ge__: other
	"Lexicographic comparison: self >= other"

	^ self perform: #>= env: 0 withArguments: {other}
%

category: 'Python-Sequence Operations'
method: SequenceableCollection
__add__: other
	"Concatenate two sequences. Returns a new sequence of the same type."

	| result x |
	result := self perform: #copy env: 0.
	result perform: #addAll: env: 0 withArguments: {other}.
	^ result
%

category: 'Python-Sequence Operations'
method: SequenceableCollection
__mul__: n
	"Repeat the sequence n times. Returns a new sequence."

	| result |
	result := (self perform: #species env: 0) perform: #new env: 0.
	(n perform: #<= env: 0 withArguments: {0}) ifTrue: [
		^ result
	].

	n perform: #timesRepeat: env: 0 withArguments: {
		[result perform: #addAll: env: 0 withArguments: {self}]
	}.
	^ result
%

category: 'Python-Sequence Operations'
method: SequenceableCollection
__rmul__: n
	"Reverse multiply: n * sequence. Same as __mul__."

	^ self perform: #__mul__: env: 2 withArguments: {n}
%

category: 'Python-Sequence Methods'
method: SequenceableCollection
count: value
	"Return the number of times value appears in the sequence."

	| count |
	count := 0.
	self perform: #do: env: 0 withArguments: {
		[:each |
			(each perform: #= env: 0 withArguments: {value}) ifTrue: [
				count := count perform: #+ env: 0 withArguments: {1}
			]
		]
	}.
	^ count
%

category: 'Python-Sequence Methods'
method: SequenceableCollection
index: value
	"Return the index of the first occurrence of value.
	Raises ValueError if value is not found."

	| idx |
	idx := self perform: #indexOf:ifAbsent: env: 0 withArguments: {
		value.
		[ValueError perform: #signal: env: 0 withArguments: {'list.index(x): x not in list'}]
	}.

	"Convert from 1-based Smalltalk to 0-based Python"
	^ idx perform: #- env: 0 withArguments: {1}
%

category: 'Python-String Representation'
method: SequenceableCollection
__repr__
	"Return a string representation of the sequence.
	Subclasses override to provide list vs tuple formatting."

	| stream |
	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: $[ perform: #nextPut: env: 0.

	self perform: #do:separatedBy: env: 0 withArguments: {
		[:each |
			| reprStr |
			reprStr := each perform: #__repr__ env: 2.
			stream with: reprStr perform: #nextPutAll: env: 0
		].
		[stream with: ', ' perform: #nextPutAll: env: 0]
	}.

	stream with: $] perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

category: 'Python-String Representation'
method: SequenceableCollection
__str__
	"Return a string representation. Same as __repr__ for sequences."

	^ self perform: #__repr__ env: 2
%

category: 'Python-Other'
method: SequenceableCollection
__doc__
	"Return the docstring for SequenceableCollection."

	^ 'Base class for sequences (list, tuple, etc.)'
%

! ------------------- Reset compile environment
set compile_env: 0


