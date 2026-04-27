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
list removeAllMethods: 1.
list class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Sequence Protocol'
method: list
__delitem__: index
	"Delete the item at the given index.
	Supports negative indices (counting from end)."

	| size idx |
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
	^ nil
%

category: 'Python-Other'
method: list
__doc__
	"Return the docstring for list."

	^ 'Built-in mutable sequence.

If no argument is given, the constructor creates a new empty list.
The argument must be an iterable if specified.'
%

category: 'Python-Sequence Operations'
method: list
__iadd__: other
	"In-place concatenation: self += other. Returns self."

	self @env0:addAll: other.
	^ self
%

category: 'Python-Sequence Operations'
method: list
__imul__: n
	"In-place repetition: self *= n. Returns self."

	| original |
	(n @env0:<= 0) ifTrue: [
		self @env0:size: 0.
		^ self
	].

	original := self @env0:copy.
	(n @env0:- 1) @env0:timesRepeat: [
		self @env0:addAll: original.
	].
	^ self
%

category: 'Python-Sequence Protocol'
method: list
__iter__
	"Return an iterator over the list."

	^ list_iterator @env1:___on: self
%

category: 'Python-String Representation'
method: list
__repr__
	"Return a string representation of the list: [item1, item2, ...]"

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

category: 'Python-Sequence Protocol'
method: list
__setitem__: index _: value
	"Set the item at the given index.
	Supports negative indices (counting from end)."

	| size idx |
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
	^ nil
%

category: 'Python-List Methods'
method: list
append: item
	"Add item to the end of the list."

	self @env0:add: item.
	^ nil
%

category: 'Python-List Methods'
method: list
clear
	"Remove all items from the list."

	self @env0:size: 0.
	^ nil
%

category: 'Python-List Methods'
method: list
copy
	"Return a shallow copy of the list."

	^ self @env0:copy
%

category: 'Python-List Methods'
method: list
extend: iterable
	"Extend the list by appending all items from iterable."

	self @env0:addAll: iterable.
	^ nil
%

category: 'Python-List Methods'
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
	^ nil
%

category: 'Python-List Methods'
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

category: 'Python-List Methods'
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

category: 'Python-List Methods'
method: list
remove: value
	"Remove the first occurrence of value. Raises ValueError if not found."

	self @env0:remove: value ifAbsent: [ValueError ___signal___: 'list.remove(x): x not in list'].
	^ nil
%

category: 'Python-List Methods'
method: list
reverse
	"Reverse the list in place."

	| reversed |
	reversed := self @env0:reversed.
	self @env0:size: 0.
	self @env0:addAll: reversed.
	^ nil
%

category: 'Python-List Methods'
method: list
sort
	"Sort the list in place using Python's __lt__ for comparison."

	self @env0:sort: [:a :b | a @env1:__lt__: b].
	^ nil
%

set compile_env: 0
