! ------------------- Superclass check
run
Set ifNil: [self error: 'Set is not defined.'].
%

! ===============================================================================
! set class (Python 'set' type - mutable unordered collection)
! ===============================================================================
! Sibling of frozenset; both are direct subclasses of GemStone's Set.
! Shared read-only and result-creating methods live on Set itself
! (see SetProtocol.gs); this file adds set-specific overrides (__hash__
! raising TypeError, __repr__ formatting), mutation methods, and the
! in-place set operators.
! ===============================================================================

! ------- set class definition
expectvalue /Class
doit
Set subclass: 'set'
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
'Python set type - mutable, unordered collection of unique hashable elements.
A sibling of `frozenset` (both subclasses of GemStone Set); neither inherits
from the other, matching Python.

Unlike frozenset, set instances:
- Can be modified in place via add, remove, discard, pop, clear, update
- Are not hashable (cannot be dict keys or set elements)
- Support in-place set operators (&=, |=, -=, ^=)
'
%

expectvalue /Class
doit
set category: 'Collections-Unordered'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
set removeAllMethods: 1.
set class removeAllMethods: 1.
%

set compile_env: 1

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
	"Return '{a, b, c}' or 'set()' for the empty set."

	| stream first size |
	size := self @env0:size.

	"Handle empty set specially"
	(size == 0) ifTrue: [
		^ 'set()'
	].

	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: ${.

	first := true.
	self @env0:do: [:each |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: each @env1:__repr__.
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
		(other @env1:__contains__: each) ifTrue: [
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
		(other @env1:__contains__: each) ifFalse: [
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
		(other @env1:__contains__: each) ifTrue: [
			toRemove @env0:add: each
		]
	].

	"Find elements in other that are not in self (to add)"
	other @env0:do: [:each |
		(self @env1:__contains__: each) ifFalse: [
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
