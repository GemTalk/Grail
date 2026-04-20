! ------------------- Superclass check
run
frozenset ifNil: [self error: 'frozenset is not defined. Check file ordering.'].
%

! ------- set class (Python 'set' type - mutable set)
expectvalue /Class
doit
frozenset subclass: 'set'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
set comment:
'Python set type - mutable unordered collection of unique hashable elements.

This is the mutable variant of frozenset. It inherits all methods from Set
(which implements Python''s frozenset type) but allows mutation through add,
remove, discard, pop, clear, and update methods.

Unlike frozenset (Set), set instances:
- Can be modified in place
- Are not hashable (cannot be used as dict keys or set elements)
- Support in-place set operations (&=, |=, -=, ^=)

Set uses equality-based comparison (via __eq__ and __hash__) for membership
testing, not identity-based comparison.
'
%

expectvalue /Class
doit
set category: 'Collections-Unordered'
%

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
set removeAllMethods: 1.
set class removeAllMethods: 1.
%

set compile_env: 1

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

category: 'Python-In-Place Operators'
method: set
__iand__: other
	"In-place intersection: self &= other. Returns self."

	self @env1:intersection_update: other.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__ior__: other
	"In-place union: self |= other. Returns self."

	self @env1:update: other.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__isub__: other
	"In-place difference: self -= other. Returns self."

	self @env1:difference_update: other.
	^ self
%

category: 'Python-In-Place Operators'
method: set
__ixor__: other
	"In-place symmetric difference: self ^= other. Returns self."

	self @env1:symmetric_difference_update: other.
	^ self
%

category: 'Python-String Representation'
method: set
__repr__
	"Return a string representation of the set: {item1, item2, ...}"

	| stream first size |
	size := self @env0:size.

	"Handle empty set specially"
	(size @env0:= 0) ifTrue: [
		^ 'set()'
	].

	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: ${.

	first := true.
	self @env0:do: [:each |
		| reprStr |
		first ifFalse: [
			stream @env0:nextPutAll: ', '
		].
		reprStr := each @env1:__repr__.
		stream @env0:nextPutAll: reprStr.
		first := false
	].

	stream @env0:nextPut: $}.
	^ stream @env0:contents
%

category: 'Python-Mutation Methods'
method: set
add: item
	"Add an element to the set."

	self @env0:add: item
%

category: 'Python-Mutation Methods'
method: set
clear
	"Remove all elements from the set."

	self @env0:removeAll: self
%

category: 'Python-Mutation Methods'
method: set
difference_update: other
	"Update the set, removing elements found in other."

	| toRemove |
	toRemove := list ___new___.
	
	self @env0:do: [:each |
		(other __contains__: each) ifTrue: [
			toRemove @env0:add: each
		]
	].
	
	toRemove @env0:do: [:each |
		self @env0:remove: each
	]
%

category: 'Python-Mutation Methods'
method: set
discard: item
	"Remove an element from the set if it is present."

	self @env0:do: [:each |
		(each @env1:__eq__: item) ifTrue: [
			self @env0:remove: each.
			^ nil
		]
	]
%

category: 'Python-Mutation Methods'
method: set
intersection_update: other
	"Update the set, keeping only elements found in it and other."

	| toRemove |
	toRemove := list ___new___.
	
	self @env0:do: [:each |
		(other __contains__: each) ifFalse: [
			toRemove @env0:add: each
		]
	].
	
	toRemove @env0:do: [:each |
		self @env0:remove: each
	]
%

category: 'Python-Mutation Methods'
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
		item isNil ifTrue: [
			item := each
		]
	].

	self @env0:remove: item.
	^ item
%

category: 'Python-Mutation Methods'
method: set
remove: item
	"Remove an element from the set. Raises KeyError if not found."

	| removed |
	removed := false.
	self @env0:do: [:each |
		(each @env1:__eq__: item) ifTrue: [
			self @env0:remove: each.
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
symmetric_difference_update: other
	"Update the set, keeping only elements found in either set, but not in both."

	| toAdd toRemove |
	toAdd := list ___new___.
	toRemove := list ___new___.

	"Find elements in self that are also in other (to remove)"
	self @env0:do: [:each |
		(other __contains__: each) ifTrue: [
			toRemove @env0:add: each
		]
	].

	"Find elements in other that are not in self (to add)"
	other @env0:do: [:each |
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
	]
%

category: 'Python-Mutation Methods'
method: set
update: other
	"Update the set, adding elements from other."

	other @env0:do: [:each |
		self @env0:add: each
	]
%

set compile_env: 0
