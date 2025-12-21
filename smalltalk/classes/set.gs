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

! ------------------- Instance methods for set
set compile_env: 2

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

	TypeError perform: #signal: env: 0 withArguments: {'unhashable type: ''set'''}
%

category: 'Python-Mutation Methods'
method: set
add: item
	"Add an element to the set."

	self perform: #add: env: 0 withArguments: {item}
%

category: 'Python-Mutation Methods'
method: set
remove: item
	"Remove an element from the set. Raises KeyError if not found."

	| removed |
	removed := false.
	self perform: #do: env: 0 withArguments: {[:each |
		(each perform: #__eq__: env: 2 withArguments: {item}) ifTrue: [
			self perform: #remove: env: 0 withArguments: {each}.
			removed := true.
			^ nil
		]
	]}.
	
	removed ifFalse: [
		KeyError perform: #signal: env: 0 withArguments: {item}
	]
%

category: 'Python-Mutation Methods'
method: set
discard: item
	"Remove an element from the set if it is present."

	self perform: #do: env: 0 withArguments: {[:each |
		(each perform: #__eq__: env: 2 withArguments: {item}) ifTrue: [
			self perform: #remove: env: 0 withArguments: {each}.
			^ nil
		]
	]}
%

category: 'Python-Mutation Methods'
method: set
pop
	"Remove and return an arbitrary element from the set.
	Raises KeyError if the set is empty."

	| item |
	(self perform: #isEmpty env: 0) ifTrue: [
		KeyError perform: #signal: env: 0 withArguments: {'pop from an empty set'}
	].

	item := nil.
	self perform: #do: env: 0 withArguments: {[:each |
		item isNil ifTrue: [
			item := each
		]
	]}.

	self perform: #remove: env: 0 withArguments: {item}.
	^ item
%

category: 'Python-Mutation Methods'
method: set
clear
	"Remove all elements from the set."

	self perform: #removeAll: env: 0 withArguments: {self}
%

category: 'Python-Mutation Methods'
method: set
update: other
	"Update the set, adding elements from other."

	other perform: #do: env: 0 withArguments: {[:each |
		self perform: #add: env: 0 withArguments: {each}
	]}
%

category: 'Python-Mutation Methods'
method: set
intersection_update: other
	"Update the set, keeping only elements found in it and other."

	| toRemove |
	toRemove := Array perform: #new env: 0.
	
	self perform: #do: env: 0 withArguments: {[:each |
		(other perform: #__contains__: env: 2 withArguments: {each}) ifFalse: [
			toRemove perform: #add: env: 0 withArguments: {each}
		]
	]}.
	
	toRemove perform: #do: env: 0 withArguments: {[:each |
		self perform: #remove: env: 0 withArguments: {each}
	]}
%

category: 'Python-Mutation Methods'
method: set
difference_update: other
	"Update the set, removing elements found in other."

	| toRemove |
	toRemove := Array perform: #new env: 0.
	
	self perform: #do: env: 0 withArguments: {[:each |
		(other perform: #__contains__: env: 2 withArguments: {each}) ifTrue: [
			toRemove perform: #add: env: 0 withArguments: {each}
		]
	]}.
	
	toRemove perform: #do: env: 0 withArguments: {[:each |
		self perform: #remove: env: 0 withArguments: {each}
	]}
%

category: 'Python-Mutation Methods'
method: set
symmetric_difference_update: other
	"Update the set, keeping only elements found in either set, but not in both."

	| toAdd toRemove |
	toAdd := Array perform: #new env: 0.
	toRemove := Array perform: #new env: 0.

	"Find elements in self that are also in other (to remove)"
	self perform: #do: env: 0 withArguments: {[:each |
		(other perform: #__contains__: env: 2 withArguments: {each}) ifTrue: [
			toRemove perform: #add: env: 0 withArguments: {each}
		]
	]}.

	"Find elements in other that are not in self (to add)"
	other perform: #do: env: 0 withArguments: {[:each |
		(self perform: #__contains__: env: 2 withArguments: {each}) ifFalse: [
			toAdd perform: #add: env: 0 withArguments: {each}
		]
	]}.

	"Remove common elements"
	toRemove perform: #do: env: 0 withArguments: {[:each |
		self perform: #remove: env: 0 withArguments: {each}
	]}.

	"Add unique elements from other"
	toAdd perform: #do: env: 0 withArguments: {[:each |
		self perform: #add: env: 0 withArguments: {each}
	]}
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
	size := self perform: #size env: 0.

	"Handle empty set specially"
	(size perform: #= env: 0 withArguments: {0}) ifTrue: [
		^ 'set()'
	].

	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: ${ perform: #nextPut: env: 0.

	first := true.
	self perform: #do: env: 0 withArguments: {[:each |
		| reprStr |
		first ifFalse: [
			stream with: ', ' perform: #nextPutAll: env: 0
		].
		reprStr := each perform: #__repr__ env: 2.
		stream with: reprStr perform: #nextPutAll: env: 0.
		first := false
	]}.

	stream with: $} perform: #nextPut: env: 0.
	^ stream perform: #contents env: 0
%

set compile_env: 0


