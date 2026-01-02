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

set compile_env: 2

! ------------------- Instance methods for list

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
		IndexError ___signal___: 'list assignment index out of range'
	].

	"Convert to 1-based Smalltalk index"
	self ___at___: (idx ___plus___: 1) put: value.
	^ nil
%

category: 'Python-Sequence Protocol'
method: list
__delitem__: index
	"Delete the item at the given index.
	Supports negative indices (counting from end)."

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
		IndexError ___signal___: 'list assignment index out of range'
	].

	"Convert to 1-based Smalltalk index"
	self ___removeAtIndex___: (idx ___plus___: 1).
	^ nil
%

category: 'Python-Sequence Operations'
method: list
__iadd__: other
	"In-place concatenation: self += other. Returns self."

	self ___addAll___: other.
	^ self
%

category: 'Python-Sequence Operations'
method: list
__imul__: n
	"In-place repetition: self *= n. Returns self."

	| original |
	(n ___le___: 0) ifTrue: [
		self ___size___: 0.
		^ self
	].

	original := self ___copy___.
	(n ___minus___: 1) ___timesRepeat___: [
		self ___addAll___: original.
	].
	^ self
%

category: 'Python-List Methods'
method: list
append: item
	"Add item to the end of the list."

	self ___add___: item.
	^ nil
%

category: 'Python-List Methods'
method: list
clear
	"Remove all items from the list."

	self ___size___: 0.
	^ nil
%

category: 'Python-List Methods'
method: list
copy
	"Return a shallow copy of the list."

	^ self ___copy___
%

category: 'Python-List Methods'
method: list
extend: iterable
	"Extend the list by appending all items from iterable."

	self ___addAll___: iterable.
	^ nil
%

category: 'Python-List Methods'
method: list
insert: index _: item
	"Insert item before the given index."

	| size idx temp |
	size := self ___size___.
	idx := index.

	"Handle negative indices"
	(idx ___lt___: 0) ifTrue: [
		temp := size ___plus___: idx.
		idx := temp ___max___: 0
	].

	"Clamp to valid range"
	temp := idx ___max___: 0.
	idx := temp ___min___: size.

	"Convert to 1-based Smalltalk index (add at position idx+1)"
	(idx ___eq___: 0)
		ifTrue: [self perform: #addFirst: env: 0 withArguments: {item}]
		ifFalse: [self perform: #add:afterIndex: env: 0 withArguments: {item. idx}].
	^ nil
%

category: 'Python-List Methods'
method: list
pop
	"Remove and return the last item. Raises IndexError if list is empty."

	| size |
	size := self ___size___.
	(size ___eq___: 0) ifTrue: [
		IndexError ___signal___: 'pop from empty list'
	].

	^ self perform: #removeLast env: 0
%

category: 'Python-List Methods'
method: list
pop: index
	"Remove and return the item at index. Raises IndexError if index is out of range."

	| size idx item stIdx |
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
		IndexError ___signal___: 'pop index out of range'
	].

	"Convert to 1-based Smalltalk index"
	stIdx := idx ___plus___: 1.
	item := self ___at___: stIdx.
	self ___removeAtIndex___: stIdx.
	^ item
%

category: 'Python-List Methods'
method: list
remove: value
	"Remove the first occurrence of value. Raises ValueError if not found."

	self perform: #remove:ifAbsent: env: 0 withArguments: {
		value.
		[ValueError ___signal___: 'list.remove(x): x not in list']
	}.
	^ nil
%

category: 'Python-List Methods'
method: list
reverse
	"Reverse the list in place."

	| reversed |
	reversed := self perform: #reversed env: 0.
	self ___size___: 0.
	self ___addAll___: reversed.
	^ nil
%

category: 'Python-List Methods'
method: list
sort
	"Sort the list in place using Python's __lt__ for comparison."

	self ___sort___: [:a :b | a perform: #__lt__: env: 2 withArguments: {b}].
	^ nil
%

category: 'Python-String Representation'
method: list
__repr__
	"Return a string representation of the list: [item1, item2, ...]"

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
