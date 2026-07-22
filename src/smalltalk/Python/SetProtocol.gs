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
__new__: a _: b
	"Two positional arguments.  Distinguish the CPython convention
	``set.__new__(cls, iterable)'' -- where the FIRST arg is the target
	CLASS, produced by a subclass ``super().__new__(cls, arg)''
	(test_keywords_in_subclass's subclass_with_new) -- from a genuine
	mis-call ``set(x, y)'' with two values (test_new_or_init:
	``self.thetype([], 2)'' raises TypeError)."

	(a @env0:isBehavior) ifTrue: [^ a @env1:__new__: b].
	^ TypeError ___signal___: (self @env0:name @env0:asString
		@env0:, ' expected at most 1 argument, got 2')
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
		iterable @env0:do: [:e | e ___requireHashableAsSetElement___].
		^ self @env0:withAll: iterable
	].
	"A non-iterable argument is a Python TypeError, not a Smalltalk DNU on
	 __iter__ (test_set's TestOnlySetsNumeric ``set(42)'')."
	(iterable @env0:class @env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) @env0:isNil ifTrue: [
		TypeError ___signal___: ('''' @env0:, iterable @env0:class @env0:name @env0:asString
			@env0:, ''' object is not iterable')].
	items := OrderedCollection @env0:new.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[ | e | e := iter __next__. e ___requireHashableAsSetElement___. items @env0:add: e]
			@env0:on: StopIteration do: [:ex | done := true]
	].
	^ self @env0:withAll: items
%

category: 'Grail-Private'
method: Set
___asElementSet___: other
	"Coerce an arbitrary iterable to a `set` of its Python elements, for the
	iterable-accepting set METHODS (union, difference, update, issubset, ...).
	A set/frozenset is returned as-is (already the right element domain, with
	fast membership + iteration).  Strings yield their 1-character substrings
	and dicts yield their keys (both CPython quirks handled by set>>__new__:),
	and a non-iterable raises a Python TypeError -- so the methods never DNU on
	``42 do:'' nor leak Smalltalk Characters."

	(other isKindOf: Set) ifTrue: [^ other].
	^ set @env1:__new__: other
%

category: 'Grail-Private'
method: Set
___resultSetClass___
	"The Python type a set OPERATION result should have.  CPython returns the
	BASE type (set / frozenset), never a subclass -- ``MySet().union(x)'' is a
	plain set (test_set TestSetSubclass/TestFrozenSetSubclass).  set and
	frozenset are sibling subclasses of Set, so a frozenset (or its subclass)
	answers frozenset; everything else answers set."

	^ (self isKindOf: frozenset) ifTrue: [frozenset] ifFalse: [set]
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
	"Intersection: self & other.  The OPERATOR requires a set operand;
	only the ``intersection'' method accepts arbitrary iterables."

	(other isKindOf: Set) ifTrue: [^ self intersection: other].
	^ self ___binOpFallback___: other op: '&' reflected: #'__rand__:'
%

category: 'Grail-Collection Protocol'
method: Set
__contains__: item
	"Test if item is in the set.  A mutable-set argument is looked up as the
	equivalent frozenset (CPython's ``set in set'' optimization), so
	``{frozenset(x)}.__contains__(set(x))'' is true.  A genuinely unhashable
	argument (list/dict/bytearray) raises TypeError rather than answering
	False -- checked only on the miss path so present elements stay fast."

	| probe |
	probe := (item isKindOf: set) ifTrue: [frozenset @env1:__new__: item] ifFalse: [item].
	(self @env0:includes: probe) ifTrue: [^ true].
	probe ___requireHashableAsSetElement___.
	^ false
%

category: 'Grail-Comparison'
method: Set
__eq__: other
	"True iff self and other have the same elements.  A set/frozenset compares
	directly; a dict keys/items view (set-like) compares as its element set
	(``{1} == {1:1}.keys()''); anything else is unequal (never raises)."

	| o |
	((other isKindOf: Set) @env0:or: [other isKindOf: dict_set_view]) ifFalse: [^ false].
	"Compare by ELEMENTS, so set == frozenset and subclass == base hold
	(GemStone's Set>>= is class-sensitive)."
	o := self ___asElementSet___: other.
	^ ((self @env0:size) @env0:= (o @env0:size)) @env0:and: [self issubset: o]
%

category: 'Grail-Comparison'
method: Set
__ge__: other
	"Superset test: self >= other.  The OPERATOR requires a set operand
	(the ``issuperset'' method accepts arbitrary iterables)."

	(other isKindOf: Set) ifTrue: [^ self issuperset: other].
	^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'
%

category: 'Grail-Comparison'
method: Set
__gt__: other
	"Proper superset test: self > other (requires a set operand)."

	(other isKindOf: Set) ifTrue: [
		^ (self issuperset: other) @env0:and: [(self __eq__: other) @env0:not]].
	^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'
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
	"Subset test: self <= other.  The OPERATOR requires a set operand
	(the ``issubset'' method accepts arbitrary iterables)."

	(other isKindOf: Set) ifTrue: [^ self issubset: other].
	^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'
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
	"Proper subset test: self < other (requires a set operand)."

	(other isKindOf: Set) ifTrue: [
		^ (self issubset: other) @env0:and: [(self __eq__: other) @env0:not]].
	^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'
%

category: 'Grail-Comparison'
method: Set
__ne__: other
	"True iff self and other differ."

	^ (self __eq__: other) @env0:not
%

category: 'Grail-Set Operations (Operators)'
method: Set
__or__: other
	"Union: self | other.  The OPERATOR requires a set operand; only the
	``union'' method accepts arbitrary iterables."

	(other isKindOf: Set) ifTrue: [^ self union: other].
	^ self ___binOpFallback___: other op: '|' reflected: #'__ror__:'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rand__: other
	"Reverse intersection: other & self (only reached when ``other'' did not
	handle ``&''; requires a set operand)."

	(other isKindOf: Set) ifTrue: [^ other intersection: self].
	^ self ___rbinOpFallback___: other op: '&'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__ror__: other
	"Reverse union: other | self (requires a set operand)."

	(other isKindOf: Set) ifTrue: [^ other union: self].
	^ self ___rbinOpFallback___: other op: '|'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rsub__: other
	"Reverse difference: other - self (requires a set operand)."

	(other isKindOf: Set) ifTrue: [^ other difference: self].
	^ self ___rbinOpFallback___: other op: '-'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__rxor__: other
	"Reverse symmetric difference: other ^ self (requires a set operand)."

	(other isKindOf: Set) ifTrue: [^ other symmetric_difference: self].
	^ self ___rbinOpFallback___: other op: '^'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__sub__: other
	"Difference: self - other.  The OPERATOR requires a set operand; only
	the ``difference'' method accepts arbitrary iterables."

	(other isKindOf: Set) ifTrue: [^ self difference: other].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'
%

category: 'Grail-Set Operations (Operators)'
method: Set
__xor__: other
	"Symmetric difference: self ^ other.  The OPERATOR requires a set
	operand; only the ``symmetric_difference'' method accepts iterables."

	(other isKindOf: Set) ifTrue: [^ self symmetric_difference: other].
	^ self ___binOpFallback___: other op: '^' reflected: #'__rxor__:'
%

category: 'Grail-Copying'
method: Set
copy
	"set: a NEW base set.  frozenset: ITSELF when it is exactly a frozenset
	(immutable -- CPython interns, and TestFrozenSet.test_copy asserts the id
	is unchanged), else a new base frozenset.  Never a subclass (test_copy:
	``type(s.copy()) is self.basetype'')."

	(self isKindOf: frozenset) ifTrue: [
		^ (self @env0:class == frozenset)
			ifTrue: [self]
			ifFalse: [frozenset @env0:withAll: self]].
	^ set @env0:withAll: self
%

category: 'Grail-Set Operations (Methods)'
method: Set
difference: other
	"Elements in self but not in other.  Accepts any iterable; result is the
	base type (set/frozenset), never a subclass."

	| coerced accumulator |
	coerced := self ___asElementSet___: other.
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(coerced __contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	^ self ___resultSetClass___ @env0:withAll: accumulator
%

category: 'Grail-Set Operations (Methods)'
method: Set
intersection: other
	"Elements common to self and other.  Accepts any iterable; result is the
	base type (set/frozenset), never a subclass."

	| coerced accumulator |
	coerced := self ___asElementSet___: other.
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(coerced __contains__: each) ifTrue: [
			accumulator @env0:add: each
		]
	].
	^ self ___resultSetClass___ @env0:withAll: accumulator
%

category: 'Grail-Set Tests'
method: Set
isdisjoint: other
	"True iff self and other share no elements.  Accepts any iterable."

	| coerced |
	coerced := self ___asElementSet___: other.
	self @env0:do: [:each |
		(coerced __contains__: each) ifTrue: [^ false]
	].
	^ true
%

category: 'Grail-Set Tests'
method: Set
issubset: other
	"True iff every element of self is in other.  Accepts any iterable."

	| coerced |
	coerced := self ___asElementSet___: other.
	self @env0:do: [:each |
		(coerced __contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Grail-Set Tests'
method: Set
issuperset: other
	"True iff every element of other is in self.  Accepts any iterable."

	| coerced |
	coerced := self ___asElementSet___: other.
	coerced @env0:do: [:each |
		(self __contains__: each) ifFalse: [^ false]
	].
	^ true
%

category: 'Grail-Set Operations (Methods)'
method: Set
symmetric_difference: other
	"Elements in either self or other but not both.  Accepts any iterable;
	result is the base type (set/frozenset), never a subclass."

	| coerced accumulator |
	coerced := self ___asElementSet___: other.
	accumulator := Set @env0:new.
	self @env0:do: [:each |
		(coerced __contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	coerced @env0:do: [:each |
		(self __contains__: each) ifFalse: [
			accumulator @env0:add: each
		]
	].
	^ self ___resultSetClass___ @env0:withAll: accumulator
%

category: 'Grail-Set Operations (Methods)'
method: Set
union: other
	"Elements from self and other.  Accepts any iterable; result is the base
	type (set/frozenset), never a subclass."

	| coerced accumulator |
	coerced := self ___asElementSet___: other.
	accumulator := Set @env0:new.
	accumulator @env0:addAll: self.
	coerced @env0:do: [:each | accumulator @env0:add: each].
	^ self ___resultSetClass___ @env0:withAll: accumulator
%

category: 'Grail-Set Operations (Methods)'
method: Set
_union: positional kw: kwargs
	"Variadic set.union(*others): fold union over every argument (0 args
	yields a copy).  BoundMethod routes a multi-/zero-arg call here."

	| result |
	result := self ___resultSetClass___ @env0:withAll: self.
	positional @env0:do: [:each | result := result union: each].
	^ result
%

category: 'Grail-Set Operations (Methods)'
method: Set
_intersection: positional kw: kwargs
	"Variadic set.intersection(*others)."

	| result |
	result := self ___resultSetClass___ @env0:withAll: self.
	positional @env0:do: [:each | result := result intersection: each].
	^ result
%

category: 'Grail-Set Operations (Methods)'
method: Set
_difference: positional kw: kwargs
	"Variadic set.difference(*others)."

	| result |
	result := self ___resultSetClass___ @env0:withAll: self.
	positional @env0:do: [:each | result := result difference: each].
	^ result
%

set compile_env: 0
