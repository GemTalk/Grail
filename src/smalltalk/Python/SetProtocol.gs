! ===============================================================================
! Set Methods (Python set/frozenset shared protocol)
! ===============================================================================
! This file contains Python method implementations on the GemStone Set class
! that are shared by both `set` (mutable) and `frozenset` (immutable). The two
! Python types are sibling subclasses of Set; methods that depend on
! mutability live on the subclasses, while everything that's purely a read or
! that produces a new collection lives here.
!
! Methods that produce a new collection use `(self class) withAll: ...` so
! the result type matches the receiver's Python type (set -> set,
! frozenset -> frozenset, mirroring CPython).
!
! These methods are compiled with environmentId 2 (Python).
! ===============================================================================

! ------------------- Remove existing Python methods from Set
expectvalue /Metaclass3
doit
Set removeAllMethods: 1.
Set class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Type Information'
method: Set
__class__
	"Return the actual Python class (set or frozenset)."

	^ self @env0:class
%

category: 'Python-Set Operations (Operators)'
method: Set
__and__: other
	"Intersection: self & other."

	^ self @env1:intersection: other
%

category: 'Python-Collection Protocol'
method: Set
__contains__: item
	"Test if item is in the set."

	^ self @env0:includes: item
%

category: 'Python-Comparison'
method: Set
__eq__: other
	"True iff self and other are both sets with the same elements."

	(other @env0:isKindOf: Set) ifFalse: [^ false].
	^ self @env0:= other
%

category: 'Python-Comparison'
method: Set
__ge__: other
	"Superset test: every element of other is in self."

	^ self @env1:issuperset: other
%

category: 'Python-Comparison'
method: Set
__gt__: other
	"Proper superset test."

	^ (self @env1:issuperset: other) @env0:and: [(self @env1:__eq__: other) @env0:not]
%

category: 'Python-Iterator Protocol'
method: Set
__iter__
	"Return an iterator over the set."

	^ set_iterator ___on: self
%

category: 'Python-Comparison'
method: Set
__le__: other
	"Subset test: every element of self is in other."

	^ self @env1:issubset: other
%

category: 'Python-Collection Protocol'
method: Set
__len__
	"Number of elements."

	^ self @env0:size
%

category: 'Python-Comparison'
method: Set
__lt__: other
	"Proper subset test."

	^ (self @env1:issubset: other) @env0:and: [(self @env1:__eq__: other) @env0:not]
%

category: 'Python-Comparison'
method: Set
__ne__: other
	"True iff self and other differ."

	^ (self @env1:__eq__: other) @env0:not
%

category: 'Python-Set Operations (Operators)'
method: Set
__or__: other
	"Union: self | other."

	^ self @env1:union: other
%

category: 'Python-Set Operations (Operators)'
method: Set
__rand__: other
	"Reverse intersection: other & self."

	^ other @env1:intersection: self
%

category: 'Python-Set Operations (Operators)'
method: Set
__ror__: other
	"Reverse union: other | self."

	^ other @env1:union: self
%

category: 'Python-Set Operations (Operators)'
method: Set
__rsub__: other
	"Reverse difference: other - self."

	^ other @env1:difference: self
%

category: 'Python-Set Operations (Operators)'
method: Set
__rxor__: other
	"Reverse symmetric difference: other ^ self."

	^ other @env1:symmetric_difference: self
%

category: 'Python-Set Operations (Operators)'
method: Set
__sub__: other
	"Difference: self - other."

	^ self @env1:difference: other
%

category: 'Python-Set Operations (Operators)'
method: Set
__xor__: other
	"Symmetric difference: self ^ other."

	^ self @env1:symmetric_difference: other
%

category: 'Python-Copying'
method: Set
copy
	"Shallow copy. Same Python type as the receiver (set or frozenset)."

	^ (self @env0:class) @env0:withAll: self
%

category: 'Python-Set Operations (Methods)'
method: Set
difference: other
	"Elements in self but not in other. Result type matches self."

	| accumulator |
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(other @env1:__contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	^ (self @env0:class) @env0:withAll: accumulator
%

category: 'Python-Set Operations (Methods)'
method: Set
intersection: other
	"Elements common to self and other. Result type matches self."

	| accumulator |
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(other @env1:__contains__: each) ifTrue: [
			accumulator @env0:add: each
		]
	].
	^ (self @env0:class) @env0:withAll: accumulator
%

category: 'Python-Set Tests'
method: Set
isdisjoint: other
	"True iff self and other share no elements."

	self @env0:do: [:each |
		(other @env1:__contains__: each) ifTrue: [^ false]
	].
	^ true
%

category: 'Python-Set Tests'
method: Set
issubset: other
	"True iff every element of self is in other."

	self @env0:do: [:each |
		(other @env1:__contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Python-Set Tests'
method: Set
issuperset: other
	"True iff every element of other is in self."

	other @env0:do: [:each |
		(self @env1:__contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Python-Set Operations (Methods)'
method: Set
symmetric_difference: other
	"Elements in either self or other but not both. Result type matches self."

	| accumulator |
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(other @env1:__contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	other @env0:do: [:each |
		(self @env1:__contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	^ (self @env0:class) @env0:withAll: accumulator
%

category: 'Python-Set Operations (Methods)'
method: Set
union: other
	"Elements from self and other. Result type matches self."

	| accumulator |
	accumulator := Set @env0:new.
	accumulator @env0:addAll: self.
	other @env0:do: [:each | accumulator @env0:add: each].
	^ (self @env0:class) @env0:withAll: accumulator
%

set compile_env: 0
