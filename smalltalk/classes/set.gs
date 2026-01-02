! ===============================================================================
! set Methods (Python 'set' type - mutable set)
! ===============================================================================
! This file contains Python method implementations for the set class.
! set is a mutable unordered collection of unique hashable elements.
!
! set inherits from frozenset (Set). Most methods are inherited from frozenset.
! This file contains:
!   1. Overrides for methods that differ (e.g., __hash__, __repr__)
!   2. Additional mutation methods (add, remove, discard, pop, clear, update, etc.)
!   3. In-place set operation methods (__iand__, __ior__, __isub__, __ixor__)
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from set
expectvalue /Metaclass3
doit
set removeAllMethods: 2.
set class removeAllMethods: 2.
%

set compile_env: 2

! ------------------- Instance methods for set

category: 'Python-Type'
method: set
__class__
	"Return the Python type for set"
	^ set
%

category: 'Python-Hashing'
method: set
__hash__
	"set is mutable and therefore not hashable."

	TypeError ___signal___: 'unhashable type: ''set'''
%

category: 'Python-Mutation Methods'
method: set
add: item
	"Add an element to the set."

	self ___add___: item
%

category: 'Python-Mutation Methods'
method: set
remove: item
	"Remove an element from the set. Raises KeyError if not found."

	| removed |
	removed := false.
	self ___do___: [:each |
		(each perform: #__eq__: env: 2 withArguments: {item}) ifTrue: [
			self ___remove___: each.
			removed := true.
			^ nil
		]
	].
	
	removed ifFalse: [
		KeyError ___signal___: item
	]
%

category: 'Python-Mutation Methods'
method: set
discard: item
	"Remove an element from the set if it is present."

	self ___do___: [:each |
		(each perform: #__eq__: env: 2 withArguments: {item}) ifTrue: [
			self ___remove___: each.
			^ nil
		]
	]
%

category: 'Python-Mutation Methods'
method: set
pop
	"Remove and return an arbitrary element from the set.
	Raises KeyError if the set is empty."

	| item |
	(self ___isEmpty___) ifTrue: [
		KeyError ___signal___: 'pop from an empty set'
	].

	item := nil.
	self ___do___: [:each |
		item isNil ifTrue: [
			item := each
		]
	].

	self ___remove___: item.
	^ item
%

category: 'Python-Mutation Methods'
method: set
clear
	"Remove all elements from the set."

	self ___removeAll___: self
%

category: 'Python-Mutation Methods'
method: set
update: other
	"Update the set, adding elements from other."

	other ___do___: [:each |
		self ___add___: each
	]
%

category: 'Python-Mutation Methods'
method: set
intersection_update: other
	"Update the set, keeping only elements found in it and other."

	| toRemove |
	toRemove := list ___new___.
	
	self ___do___: [:each |
		(other __contains__: each) ifFalse: [
			toRemove ___add___: each
		]
	].
	
	toRemove ___do___: [:each |
		self ___remove___: each
	]
%

category: 'Python-Mutation Methods'
method: set
difference_update: other
	"Update the set, removing elements found in other."

	| toRemove |
	toRemove := list ___new___.
	
	self ___do___: [:each |
		(other __contains__: each) ifTrue: [
			toRemove ___add___: each
		]
	].
	
	toRemove ___do___: [:each |
		self ___remove___: each
	]
%

category: 'Python-Mutation Methods'
method: set
symmetric_difference_update: other
	"Update the set, keeping only elements found in either set, but not in both."

	| toAdd toRemove |
	toAdd := list ___new___.
	toRemove := list ___new___.

	"Find elements in self that are also in other (to remove)"
	self ___do___: [:each |
		(other __contains__: each) ifTrue: [
			toRemove ___add___: each
		]
	].

	"Find elements in other that are not in self (to add)"
	other ___do___: [:each |
		(self __contains__: each) ifFalse: [
			toAdd ___add___: each
		]
	].

	"Remove common elements"
	toRemove ___do___: [:each |
		self ___remove___: each
	].

	"Add unique elements from other"
	toAdd ___do___: [:each |
		self ___add___: each
	]
%

category: 'Python-In-Place Operators'
method: set
__iand__: other
	"In-place intersection: self &= other. Returns self."

	self perform: #intersection_update: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__ior__: other
	"In-place union: self |= other. Returns self."

	self perform: #update: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__isub__: other
	"In-place difference: self -= other. Returns self."

	self perform: #difference_update: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__ixor__: other
	"In-place symmetric difference: self ^= other. Returns self."

	self perform: #symmetric_difference_update: env: 2 withArguments: {other}.
	^ self
%

category: 'Python-String Representation'
method: set
__repr__
	"Return a string representation of the set: {item1, item2, ...}"

	| stream first size |
	size := self ___size___.

	"Handle empty set specially"
	(size ___eq___: 0) ifTrue: [
		^ 'set()'
	].

	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPut___: ${.

	first := true.
	self ___do___: [:each |
		| reprStr |
		first ifFalse: [
			stream ___nextPutAll___: ', '
		].
		reprStr := each perform: #__repr__ env: 2.
		stream ___nextPutAll___: reprStr.
		first := false
	].

	stream ___nextPut___: $}.
	^ stream ___contents___
%

set compile_env: 0
