"Python frozenset type - immutable, hashable, unordered collection of unique
elements. A sibling of `set` (both subclasses of GemStone Set); neither
inherits from the other, matching Python.

Class-side constructors freeze instances via immediateInvariant before
returning. Use `frozenset withAll: aCollection` to build from an iterable.

"
Class {
	#name : 'frozenset',
	#superclass : 'Set',
	#instVars : [
		'table'
	],
	#category : 'Grail-Collections-Unordered'
}

{ #category : 'Grail-instance creation' }
frozenset class >> ___frozenInstance: inst [
	"Freeze EXACT frozensets (immutable, so element storage never changes);
	leave SUBCLASS instances mutable so they can carry instance attributes --
	a frozenset subclass has a __dict__ in CPython, and test_keywords_in_subclass's
	subclass_with_new sets ``self.newarg''.  Python exposes no element mutation
	on either (no add/remove), so subclass elements stay effectively immutable."

	self == frozenset ifTrue: [^ inst immediateInvariant].
	^ inst

]

{ #category : 'Grail-Introspection' }
frozenset class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-instance creation' }
frozenset class >> new [
	"Return an empty, frozen frozenset.  The PyDict element table is installed
	BEFORE freezing (a frozen instance can't have its `table` slot reassigned)."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
frozenset class >> withAll: aCollection [
	"Build a frozenset containing every element of aCollection (no duplicates),
	then freeze it (exact frozensets only -- see ___frozenInstance:)."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	"Snapshot the source: dedup calls the elements' Python __eq__, which (bpo-46615)
	may clear the source mid-iteration -- iterating a live list being cleared would
	crash with a kernel OffsetError.  See set class>>withAll:."
	(Array @env0:withAll: aCollection) @env0:do: [:each | inst add: each].
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-Facade Storage' }
frozenset >> ___pyInitTable___ [
	"Install a fresh PyDict as the element table (keys = elements)."

	table := PyDict new

]

{ #category : 'Grail-Facade Storage' }
frozenset >> add: anElement [
	"Add an element (only during construction; dedup by Python __hash__/__eq__).
	An unhashable element is re-labelled to the set-element TypeError (frozenset([[]])
	reports ``cannot use 'list' as a set element''); a genuine __eq__ TypeError
	propagates.  Zero overhead on the hashable path.

	Once the frozenset is frozen (immediateInvariant, exact frozensets), mutation
	is REJECTED: the table object is not itself frozen, so guard explicitly to
	preserve immutability -- a native frozen Set raised on add: (testFrozensetImmutable).
	Construction adds BEFORE ___frozenInstance: freezes, so this never blocks it."

	self isInvariant ifTrue: [^ self error: 'frozenset object is immutable'].
	table isNil ifTrue: [^ super add: anElement].
	[table at: anElement put: true]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
frozenset >> do: aBlock [
	table isNil ifTrue: [^ super do: aBlock].
	^ table keysDo: aBlock

]

{ #category : 'Grail-Facade Storage' }
frozenset >> includes: anElement [
	"Membership by Python __hash__/__eq__; an unhashable element re-labels to the
	set-element TypeError (only on the exception path)."

	table isNil ifTrue: [^ super includes: anElement].
	^ [table includesKey: anElement]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass]

]

{ #category : 'Grail-Facade Storage' }
frozenset >> isEmpty [
	table isNil ifTrue: [^ super isEmpty].
	^ table isEmpty

]

{ #category : 'Grail-Facade Storage' }
frozenset >> remove: anElement [
	table isNil ifTrue: [^ super remove: anElement].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
frozenset >> remove: anElement ifAbsent: aBlock [
	table isNil ifTrue: [^ super remove: anElement ifAbsent: aBlock].
	(table includesKey: anElement) ifFalse: [^ aBlock value].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
frozenset >> removeAll: aCollection [
	table isNil ifTrue: [^ super removeAll: aCollection].
	aCollection == self ifTrue: [table := PyDict new. ^ aCollection].
	aCollection do: [:each | table removeKey: each ifAbsent: [nil]].
	^ aCollection

]

{ #category : 'Grail-Facade Storage' }
frozenset >> size [
	table isNil ifTrue: [^ super size].
	^ table size

]
