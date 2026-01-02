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

set compile_env: 2

! ------------------- Instance methods for frozenset

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

	^ self ___size___
%

category: 'Python-Collection Protocol'
method: frozenset
__contains__: item
	"Test if item is in the frozenset."

	^ self ___includes___: item
%

category: 'Python-Comparison'
method: frozenset
__eq__: other
	"Return True if self and other have the same elements."

	| otherClass |
	otherClass := other ___class___.
	
	"Check if other is a set or frozenset"
	((otherClass ___eq___: frozenset) or: [
		otherClass ___eq___: set
	]) ifFalse: [^ false].
	
	"Compare using Set's equality"
	^ self ___eq___: other
%

category: 'Python-Comparison'
method: frozenset
__ne__: other
	"Return True if self and other have different elements."

	^ (self __eq__: other) ___not___
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
	self ___do___: [:each |
		| elemHash |
		elemHash := each __hash__.
		hash := hash perform: #bitXor: env: 0 withArguments: {elemHash}
	].
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
	result := self ___copy___.
	other ___do___: [:each |
		result ___add___: each
	].
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
intersection: other
	"Return a new frozenset with elements common to self and other."

	| result |
	result := frozenset ___new___.
	self ___do___: [:each |
		(other __contains__: each) ifTrue: [
			result ___add___: each
		]
	].
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
difference: other
	"Return a new frozenset with elements in self that are not in other."

	| result |
	result := frozenset ___new___.
	self ___do___: [:each |
		(other __contains__: each) ifFalse: [
			result ___add___: each
		]
	].
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
symmetric_difference: other
	"Return a new frozenset with elements in either self or other but not both."

	| result |
	result := frozenset ___new___.

	"Add elements from self that are not in other"
	self ___do___: [:each |
		(other __contains__: each) ifFalse: [
			result ___add___: each
		]
	].

	"Add elements from other that are not in self"
	other ___do___: [:each |
		(self __contains__: each) ifFalse: [
			result ___add___: each
		]
	].

	^ result
%

category: 'Python-Set Tests'
method: frozenset
issubset: other
	"Test whether every element in the set is in other."

	self ___do___: [:each |
		(other __contains__: each) ifFalse: [
			^ false
		]
	].
	^ true
%

category: 'Python-Set Tests'
method: frozenset
issuperset: other
	"Test whether every element in other is in the set."

	other ___do___: [:each |
		(self __contains__: each) ifFalse: [
			^ false
		]
	].
	^ true
%

category: 'Python-Set Tests'
method: frozenset
isdisjoint: other
	"Return True if the set has no elements in common with other."

	self ___do___: [:each |
		(other __contains__: each) ifTrue: [
			^ false
		]
	].
	^ true
%

category: 'Python-Copying'
method: frozenset
copy
	"Return a shallow copy of the frozenset."

	^ self ___copy___
%

category: 'Python-String Representation'
method: frozenset
__repr__
	"Return a string representation of the frozenset: frozenset({item1, item2, ...})"

	| stream first |
	stream := WriteStream ___on___: (String ___new___).
	stream ___nextPutAll___: 'frozenset({'.

	first := true.
	self ___do___: [:each |
		| reprStr |
		first ifFalse: [
			stream ___nextPutAll___: ', '
		].
		reprStr := each __repr__.
		stream ___nextPutAll___: reprStr.
		first := false
	].

	stream ___nextPutAll___: '})'.
	^ stream ___contents___
%

set compile_env: 0
