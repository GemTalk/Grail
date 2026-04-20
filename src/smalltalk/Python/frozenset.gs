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
frozenset removeAllMethods: 1.
frozenset class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Set Operations (Operators)'
method: frozenset
__and__: other
	"Return the intersection of two sets (self & other)."

	^ self @env1:intersection: other
%

category: 'Python-Collection Protocol'
method: frozenset
__contains__: item
	"Test if item is in the frozenset."

	^ self @env0:includes: item
%

category: 'Python-Comparison'
method: frozenset
__eq__: other
	"Return True if self and other have the same elements."

	| otherClass |
	otherClass := other @env0:class.
	
	"Check if other is a set or frozenset"
	((otherClass @env0:= frozenset) or: [
		otherClass @env0:= set
	]) ifFalse: [^ false].
	
	"Compare using Set's equality"
	^ self @env0:= other
%

category: 'Python-Comparison'
method: frozenset
__ge__: other
	"Test whether every element in other is in the set (superset test)."

	^ self @env1:issuperset: other
%

category: 'Python-Comparison'
method: frozenset
__gt__: other
	"Test whether the set is a proper superset of other."

	| isSuperset notEqual |
	isSuperset := self issuperset: other.
	notEqual := self __ne__: other.
	^ isSuperset @env0:and: [notEqual]
%

category: 'Python-Hashing'
method: frozenset
__hash__
	"Return hash value for frozenset.
	frozenset is immutable and hashable."

	| hash |
	hash := 0.
	self @env0:do: [:each |
		| elemHash |
		elemHash := each __hash__.
		hash := hash @env0:bitXor: elemHash
	].
	^ hash
%

category: 'Python-Iterator Protocol'
method: frozenset
__iter__
	"Return an iterator over the frozenset."

	^ set_iterator ___on: self
%

category: 'Python-Comparison'
method: frozenset
__le__: other
	"Test whether every element in the set is in other (subset test)."

	^ self @env1:issubset: other
%

category: 'Python-Collection Protocol'
method: frozenset
__len__
	"Return the number of elements in the frozenset."

	^ self @env0:size
%

category: 'Python-Comparison'
method: frozenset
__lt__: other
	"Test whether the set is a proper subset of other."

	| isSubset notEqual |
	isSubset := self issubset: other.
	notEqual := self __ne__: other.
	^ isSubset @env0:and: [notEqual]
%

category: 'Python-Comparison'
method: frozenset
__ne__: other
	"Return True if self and other have different elements."

	^ (self __eq__: other) @env0:not
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__or__: other
	"Return the union of two sets (self | other)."

	^ self @env1:union: other
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rand__: other
	"Return the intersection of two sets (other & self)."

	^ other @env1:intersection: self
%

category: 'Python-String Representation'
method: frozenset
__repr__
	"Return a string representation of the frozenset: frozenset({item1, item2, ...})"

	| stream first |
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: 'frozenset({'.

	first := true.
	self @env0:do: [:each |
		| reprStr |
		first ifFalse: [
			stream @env0:nextPutAll: ', '
		].
		reprStr := each __repr__.
		stream @env0:nextPutAll: reprStr.
		first := false
	].

	stream @env0:nextPutAll: '})'.
	^ stream @env0:contents
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__ror__: other
	"Return the union of two sets (other | self)."

	^ other @env1:union: self
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rsub__: other
	"Return the difference of two sets (other - self)."

	^ other @env1:difference: self
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__rxor__: other
	"Return the symmetric difference of two sets (other ^ self)."

	^ other @env1:symmetric_difference: self
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__sub__: other
	"Return the difference of two sets (self - other)."

	^ self @env1:difference: other
%

category: 'Python-Set Operations (Operators)'
method: frozenset
__xor__: other
	"Return the symmetric difference of two sets (self ^ other)."

	^ self @env1:symmetric_difference: other
%

category: 'Python-Copying'
method: frozenset
copy
	"Return a shallow copy of the frozenset."

	^ self @env0:copy
%

category: 'Python-Set Operations (Methods)'
method: frozenset
difference: other
	"Return a new frozenset with elements in self that are not in other."

	| result |
	result := frozenset ___new___.
	self @env0:do: [:each |
		(other __contains__: each) ifFalse: [
			result @env0:add: each
		]
	].
	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
intersection: other
	"Return a new frozenset with elements common to self and other."

	| result |
	result := frozenset ___new___.
	self @env0:do: [:each |
		(other __contains__: each) ifTrue: [
			result @env0:add: each
		]
	].
	^ result
%

category: 'Python-Set Tests'
method: frozenset
isdisjoint: other
	"Return True if the set has no elements in common with other."

	self @env0:do: [:each |
		(other __contains__: each) ifTrue: [
			^ false
		]
	].
	^ true
%

category: 'Python-Set Tests'
method: frozenset
issubset: other
	"Test whether every element in the set is in other."

	self @env0:do: [:each |
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

	other @env0:do: [:each |
		(self __contains__: each) ifFalse: [
			^ false
		]
	].
	^ true
%

category: 'Python-Set Operations (Methods)'
method: frozenset
symmetric_difference: other
	"Return a new frozenset with elements in either self or other but not both."

	| result |
	result := frozenset ___new___.

	"Add elements from self that are not in other"
	self @env0:do: [:each |
		(other __contains__: each) ifFalse: [
			result @env0:add: each
		]
	].

	"Add elements from other that are not in self"
	other @env0:do: [:each |
		(self __contains__: each) ifFalse: [
			result @env0:add: each
		]
	].

	^ result
%

category: 'Python-Set Operations (Methods)'
method: frozenset
union: other
	"Return a new frozenset with elements from self and other."

	| result |
	result := self @env0:copy.
	other @env0:do: [:each |
		result @env0:add: each
	].
	^ result
%

set compile_env: 0
