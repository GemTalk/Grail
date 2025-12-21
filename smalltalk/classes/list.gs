! ===============================================================================
! OrderedCollection Methods (Python 'list' type)
! ===============================================================================
! This file contains Python method implementations for OrderedCollection
! to make it behave like Python's list type.
!
! OrderedCollection inherits shared sequence methods from SequenceableCollection.
! This file adds list-specific mutating methods.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from list
expectvalue /Metaclass3
doit
list removeAllMethods: 2.
list class removeAllMethods: 2.
%

! ------------------- Instance methods for list
set compile_env: 2

category: 'Python-Sequence Protocol'
method: list
__iter__
	"Return an iterator over the list."

	^ list_iterator perform: #___on: env: 2 withArguments: {self}
%


category: 'Python-Sequence Protocol'
method: list
__setitem__: index _: value
	"Set the item at the given index.
	Supports negative indices (counting from end)."

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
		IndexError perform: #signal: env: 0 withArguments: {'list assignment index out of range'}
	].

	"Convert to 1-based Smalltalk index"
	self perform: #at:put: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}. value}.
	^ nil
%

category: 'Python-Sequence Protocol'
method: list
__delitem__: index
	"Delete the item at the given index.
	Supports negative indices (counting from end)."

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
		IndexError perform: #signal: env: 0 withArguments: {'list assignment index out of range'}
	].

	"Convert to 1-based Smalltalk index"
	self perform: #removeAtIndex: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}.
	^ nil
%

category: 'Python-Sequence Operations'
method: list
__iadd__: other
	"In-place concatenation: self += other. Returns self."

	self perform: #addAll: env: 0 withArguments: {other}.
	^ self
%

category: 'Python-Sequence Operations'
method: list
__imul__: n
	"In-place repetition: self *= n. Returns self."

	| original count |
	count := n.
	(count perform: #<= env: 0 withArguments: {0}) ifTrue: [
		self perform: #size: env: 0 withArguments: {0}.
		^ self
	].

	original := self perform: #copy env: 0.
	(count perform: #- env: 0 withArguments: {1}) perform: #timesRepeat: env: 0 withArguments: {
		[self perform: #addAll: env: 0 withArguments: {original}]
	}.
	^ self
%

category: 'Python-List Methods'
method: list
append: item
	"Add item to the end of the list."

	self perform: #add: env: 0 withArguments: {item}.
	^ nil
%

category: 'Python-List Methods'
method: list
clear
	"Remove all items from the list."

	self perform: #size: env: 0 withArguments: {0}.
	^ nil
%

category: 'Python-List Methods'
method: list
copy
	"Return a shallow copy of the list."

	^ self perform: #copy env: 0
%

category: 'Python-List Methods'
method: list
extend: iterable
	"Extend the list by appending all items from iterable."

	self perform: #addAll: env: 0 withArguments: {iterable}.
	^ nil
%

category: 'Python-List Methods'
method: list
insert: index _: item
	"Insert item before the given index."

	| size idx temp |
	size := self perform: #size env: 0.
	idx := index.

	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		temp := size perform: #+ env: 0 withArguments: {idx}.
		idx := temp perform: #max: env: 0 withArguments: {0}
	].

	"Clamp to valid range"
	temp := idx perform: #max: env: 0 withArguments: {0}.
	idx := temp perform: #min: env: 0 withArguments: {size}.

	"Convert to 1-based Smalltalk index (add at position idx+1)"
	(idx perform: #= env: 0 withArguments: {0})
		ifTrue: [self perform: #addFirst: env: 0 withArguments: {item}]
		ifFalse: [self perform: #add:afterIndex: env: 0 withArguments: {item. idx}].
	^ nil
%

category: 'Python-List Methods'
method: list
pop
	"Remove and return the last item. Raises IndexError if list is empty."

	| size |
	size := self perform: #size env: 0.
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'pop from empty list'}
	].

	^ self perform: #removeLast env: 0
%

category: 'Python-List Methods'
method: list
pop: index
	"Remove and return the item at index. Raises IndexError if index is out of range."

	| size idx item stIdx |
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
		IndexError perform: #signal: env: 0 withArguments: {'pop index out of range'}
	].

	"Convert to 1-based Smalltalk index"
	stIdx := idx perform: #+ env: 0 withArguments: {1}.
	item := self perform: #at: env: 0 withArguments: {stIdx}.
	self perform: #removeAtIndex: env: 0 withArguments: {stIdx}.
	^ item
%

category: 'Python-List Methods'
method: list
remove: value
	"Remove the first occurrence of value. Raises ValueError if not found."

	self perform: #remove:ifAbsent: env: 0 withArguments: {
		value.
		[ValueError perform: #signal: env: 0 withArguments: {'list.remove(x): x not in list'}]
	}.
	^ nil
%

category: 'Python-List Methods'
method: list
reverse
	"Reverse the list in place."

	| reversed |
	reversed := self perform: #reversed env: 0.
	self perform: #size: env: 0 withArguments: {0}.
	self perform: #addAll: env: 0 withArguments: {reversed}.
	^ nil
%

category: 'Python-List Methods'
method: list
sort
	"Sort the list in place using Python's __lt__ for comparison."

	self perform: #sort: env: 0 withArguments: {
		[:a :b | a perform: #__lt__: env: 2 withArguments: {b}]
	}.
	^ nil
%

category: 'Python-String Representation'
method: list
__repr__
	"Return a string representation of the list: [item1, item2, ...]"

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

category: 'Python-Other'
method: list
__doc__
	"Return the docstring for list."

	^ 'Built-in mutable sequence.

If no argument is given, the constructor creates a new empty list.
The argument must be an iterable if specified.'
%

! ------------------- Reset compile environment
set compile_env: 0


