! ===============================================================================
! Set Methods (Python 'frozenset' type)
! ===============================================================================
! This file contains Python method implementations for Set (GemStone class)
! to make it behave like Python's frozenset type.
!
! frozenset is an immutable, hashable, unordered collection of unique elements.
! It uses equality-based comparison (via __eq__ and __hash__) for membership.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from frozenset
expectvalue /Metaclass3
doit
frozenset removeAllMethods: 2.
frozenset class removeAllMethods: 2.
%

! ------------------- Instance methods for frozenset
set compile_env: 2

category: 'Python-Iterator Protocol'
method: frozenset
__iter__
	"Return an iterator over the frozenset."

	^ set_iterator ___on: self
%

category: 'Python-Collection Protocol'
method: frozenset
__len__
	"Return the number of elements in the frozenset."

	^ self perform: #size env: 0
%

category: 'Python-Collection Protocol'
method: frozenset
__contains__: item
	"Test if item is in the frozenset."

	^ self perform: #includes: env: 0 withArguments: {item}
%

category: 'Python-Comparison'
method: frozenset
__eq__: other
	"Return True if self and other have the same elements."

	| otherClass |
	otherClass := other perform: #class env: 0.
	
	"Check if other is a set or frozenset"
	((otherClass perform: #= env: 0 withArguments: {frozenset}) or: [
		otherClass perform: #= env: 0 withArguments: {set}
	]) ifFalse: [^ false].
	
	"Compare using Set's equality"
	^ self perform: #= env: 0 withArguments: {other}
%

category: 'Python-Comparison'
method: frozenset
__ne__: other
	"Return True if self and other have different elements."

	^ (self __eq__: other) perform: #not env: 0
%

category: 'Python-Comparison'
method: frozenset
__le__: other
	"Test whether every element in the set is in other (subset test)."

	^ self perform: #issubset: env: 2 withArguments: {other}
%

category: 'Python-Comparison'
method: frozenset
__lt__: other
	"Test whether the set is a proper subset of other."

	| isSubset notEqual |
	isSubset := self issubset: other.
	notEqual := self __ne__: other.
	^ isSubset perform: #and: env: 0 withArguments: {[notEqual]}
%

category: 'Python-Comparison'
method: frozenset
__ge__: other
	"Test whether every element in other is in the set (superset test)."

	^ self perform: #issuperset: env: 2 withArguments: {other}
%

category: 'Python-Comparison'
method: frozenset
__gt__: other
	"Test whether the set is a proper superset of other."

	| isSuperset notEqual |
	isSuperset := self issuperset: other.
	notEqual := self __ne__: other.
	^ isSuperset perform: #and: env: 0 withArguments: {[notEqual]}
%

category: 'Python-Hashing'
method: frozenset
__hash__
	"Return hash value for frozenset.
	frozenset is immutable and hashable."

	| hash |
	hash := 0.
	self perform: #do: env: 0 withArguments: {[:each |
		| elemHash |
		elemHash := each __hash__.
		hash := hash perform: #bitXor: env: 0 withArguments: {elemHash}
	]}.
	^ hash
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__and__: other
	"Return the intersection of two sets (self & other)."

	^ self perform: #intersection: env: 2 withArguments: {other}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__or__: other
	"Return the union of two sets (self | other)."

	^ self perform: #union: env: 2 withArguments: {other}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__sub__: other
	"Return the difference of two sets (self - other)."

	^ self perform: #difference: env: 2 withArguments: {other}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__xor__: other
	"Return the symmetric difference of two sets (self ^ other)."

	^ self perform: #symmetric_difference: env: 2 withArguments: {other}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rand__: other
	"Return the intersection of two sets (other & self)."

	^ other perform: #intersection: env: 2 withArguments: {self}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__ror__: other
	"Return the union of two sets (other | self)."

	^ other perform: #union: env: 2 withArguments: {self}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rsub__: other
	"Return the difference of two sets (other - self)."

	^ other perform: #difference: env: 2 withArguments: {self}
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rxor__: other
	"Return the symmetric difference of two sets (other ^ self)."

	^ other perform: #symmetric_difference: env: 2 withArguments: {self}
%

category: 'Python-Set Operations (Methods)'
method: frozenset
union: other
	"Return a new frozenset with elements from self and other."

	| result |
	result := self perform: #copy env: 0.
	other perform: #do: env: 0 withArguments: {[:each |
		result perform: #add: env: 0 withArguments: {each}
	]}.
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
intersection: other
	"Return a new frozenset with elements common to self and other."

	| result |
	result := frozenset perform: #new env: 0.
	self perform: #do: env: 0 withArguments: {[:each |
		(other __contains__: each) ifTrue: [
			result perform: #add: env: 0 withArguments: {each}
		]
	]}.
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
difference: other
	"Return a new frozenset with elements in self that are not in other."

	| result |
	result := frozenset perform: #new env: 0.
	self perform: #do: env: 0 withArguments: {[:each |
		(other __contains__: each) ifFalse: [
			result perform: #add: env: 0 withArguments: {each}
		]
	]}.
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
symmetric_difference: other
	"Return a new frozenset with elements in either self or other but not both."

	| result |
	result := frozenset perform: #new env: 0.

	"Add elements from self that are not in other"
	self perform: #do: env: 0 withArguments: {[:each |
		(other __contains__: each) ifFalse: [
			result perform: #add: env: 0 withArguments: {each}
		]
	]}.

	"Add elements from other that are not in self"
	other perform: #do: env: 0 withArguments: {[:each |
		(self __contains__: each) ifFalse: [
			result perform: #add: env: 0 withArguments: {each}
		]
	]}.

	^ result
%

category: 'Python-Set Tests'
method: frozenset
issubset: other
	"Test whether every element in the set is in other."

	self perform: #do: env: 0 withArguments: {[:each |
		(other __contains__: each) ifFalse: [
			^ false
		]
	]}.
	^ true
%

category: 'Python-Set Tests'
method: frozenset
issuperset: other
	"Test whether every element in other is in the set."

	other perform: #do: env: 0 withArguments: {[:each |
		(self __contains__: each) ifFalse: [
			^ false
		]
	]}.
	^ true
%

category: 'Python-Set Tests'
method: frozenset
isdisjoint: other
	"Return True if the set has no elements in common with other."

	self perform: #do: env: 0 withArguments: {[:each |
		(other __contains__: each) ifTrue: [
			^ false
		]
	]}.
	^ true
%

category: 'Python-Copying'
method: frozenset
copy
	"Return a shallow copy of the frozenset."

	^ self perform: #copy env: 0
%

category: 'Python-String Representation'
method: frozenset
__repr__
	"Return a string representation of the frozenset: frozenset({item1, item2, ...})"

	| stream first |
	stream := WriteStream perform: #on: env: 0 withArguments: {String perform: #new env: 0}.
	stream with: 'frozenset({' perform: #nextPutAll: env: 0.

	first := true.
	self perform: #do: env: 0 withArguments: {[:each |
		| reprStr |
		first ifFalse: [
			stream with: ', ' perform: #nextPutAll: env: 0
		].
		reprStr := each __repr__.
		stream with: reprStr perform: #nextPutAll: env: 0.
		first := false
	]}.

	stream with: '})' perform: #nextPutAll: env: 0.
	^ stream perform: #contents env: 0
%

set compile_env: 0


