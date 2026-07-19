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

category: 'Grail-Initialization'
classmethod: Set
__new__
	"set() / frozenset() — return an empty instance. `self` is the actual
	receiver class (set or frozenset), so the concrete type matches:
	`set new` returns a mutable set, `frozenset new` returns an immutable
	frozenset (frozenset's class-side `new` adds immediateInvariant)."

	^ self @env0:new
%

category: 'Grail-Initialization'
classmethod: Set
__new__: iterable
	"set(iterable) / frozenset(iterable) — populate from iterable's
	elements. Set semantics deduplicate equal elements. Concrete type
	matches the receiver (`self` is set or frozenset).

	Strings are a CPython quirk: ``frozenset('abc')`` yields the
	*1-character substrings* ``{'a', 'b', 'c'}``, not the characters.
	Smalltalk's string iteration yields Characters, so we copy
	character-by-character into Unicode7 wrappers — otherwise
	``'X' in frozenset('XYZ')`` is always false (Character $X != 'X')
	and constructs like re._parser's ``DIGITS = frozenset('0123456789')``
	silently misbehave.

	The Collection fast path covers Smalltalk Arrays, OrderedCollections,
	Sets, etc.; generic Python iterables fall through to the __iter__/
	__next__ loop."

	| items iter done |
	(iterable isKindOf: CharacterCollection) ifTrue: [
		items := OrderedCollection @env0:new.
		1 @env0:to: iterable @env0:size do: [:i |
			| s |
			s := Unicode7 ___new___: 1.
			s @env0:at: 1 put: (iterable @env0:at: i).
			items @env0:add: s
		].
		^ self @env0:withAll: items
	].
	"Dictionaries iterate their KEYS in Python (``set(d)`` ==
	``set(d.keys())``); Smalltalk's ``do:`` on a dictionary walks the
	VALUES, so the generic Collection fast path below would build the
	wrong set (twilio.request_validator's ``sorted(set(params))``
	KeyError'd using a value as a key)."
	(iterable isKindOf: AbstractDictionary) ifTrue: [
		items := OrderedCollection @env0:new.
		iterable @env0:keysDo: [:k | items @env0:add: k].
		^ self @env0:withAll: items
	].
	(iterable isKindOf: Collection) ifTrue: [
		^ self @env0:withAll: iterable
	].
	items := OrderedCollection @env0:new.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[items @env0:add: iter __next__]
			@env0:on: StopIteration do: [:ex | done := true]
	].
	^ self @env0:withAll: items
%

category: 'Grail-Type Information'
method: Set
__class__
	"Return the actual Python class (set or frozenset)."

	^ self @env0:class
%

category: 'Grail-Set Operations (Operators)'
method: Set
__and__: other
	"Intersection: self & other."

	^ self @env1:intersection: other
%

category: 'Grail-Collection Protocol'
method: Set
__contains__: item
	"Test if item is in the set."

	^ self @env0:includes: item
%

category: 'Grail-Comparison'
method: Set
__eq__: other
	"True iff self and other are both sets with the same elements."

	(other isKindOf: Set) ifFalse: [^ false].
	^ self @env0:= other
%

category: 'Grail-Comparison'
method: Set
__ge__: other
	"Superset test: every element of other is in self."

	^ self @env1:issuperset: other
%

category: 'Grail-Comparison'
method: Set
__gt__: other
	"Proper superset test."

	^ (self @env1:issuperset: other) @env0:and: [(self @env1:__eq__: other) @env0:not]
%

category: 'Grail-Iterator Protocol'
method: Set
__iter__
	"Return an iterator over the set."

	^ set_iterator ___on: self
%

category: 'Grail-Comparison'
method: Set
__le__: other
	"Subset test: every element of self is in other."

	^ self @env1:issubset: other
%

category: 'Grail-Collection Protocol'
method: Set
__len__
	"Number of elements."

	^ self @env0:size
%

category: 'Grail-Comparison'
method: Set
__lt__: other
	"Proper subset test."

	^ (self @env1:issubset: other) @env0:and: [(self @env1:__eq__: other) @env0:not]
%

category: 'Grail-Comparison'
method: Set
__ne__: other
	"True iff self and other differ."

	^ (self @env1:__eq__: other) @env0:not
%

category: 'Grail-Set Operations (Operators)'
method: Set
__or__: other
	"Union: self | other."

	^ self @env1:union: other
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rand__: other
	"Reverse intersection: other & self."

	^ other @env1:intersection: self
%

category: 'Grail-Set Operations (Operators)'
method: Set
__ror__: other
	"Reverse union: other | self."

	^ other @env1:union: self
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rsub__: other
	"Reverse difference: other - self."

	^ other @env1:difference: self
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rxor__: other
	"Reverse symmetric difference: other ^ self."

	^ other @env1:symmetric_difference: self
%

category: 'Grail-Set Operations (Operators)'
method: Set
__sub__: other
	"Difference: self - other."

	^ self @env1:difference: other
%

category: 'Grail-Set Operations (Operators)'
method: Set
__xor__: other
	"Symmetric difference: self ^ other."

	^ self @env1:symmetric_difference: other
%

category: 'Grail-Copying'
method: Set
copy
	"Shallow copy. Same Python type as the receiver (set or frozenset)."

	^ (self @env0:class) @env0:withAll: self
%

category: 'Grail-Set Operations (Methods)'
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

category: 'Grail-Set Operations (Methods)'
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

category: 'Grail-Set Tests'
method: Set
isdisjoint: other
	"True iff self and other share no elements."

	self @env0:do: [:each |
		(other @env1:__contains__: each) ifTrue: [^ false]
	].
	^ true
%

category: 'Grail-Set Tests'
method: Set
issubset: other
	"True iff every element of self is in other."

	self @env0:do: [:each |
		(other @env1:__contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Grail-Set Tests'
method: Set
issuperset: other
	"True iff every element of other is in self."

	other @env0:do: [:each |
		(self @env1:__contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Grail-Set Operations (Methods)'
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

category: 'Grail-Set Operations (Methods)'
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
