"Python set type - mutable, unordered collection of unique hashable elements.
A sibling of `frozenset` (both subclasses of GemStone Set); neither inherits
from the other, matching Python.

Unlike frozenset, set instances:
- Can be modified in place via add, remove, discard, pop, clear, update
- Are not hashable (cannot be dict keys or set elements)
- Support in-place set operators (&=, |=, -=, ^=)

"
Class {
	#name : 'set',
	#superclass : 'Set',
	#instVars : [
		'table'
	],
	#category : 'Grail-Collections-Unordered'
}

{ #category : 'Grail-Introspection' }
set class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Facade Construction' }
set class >> new [
	"Return an empty facade set with its PyDict element table initialized."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	^ inst

]

{ #category : 'Grail-Facade Construction' }
set class >> withAll: aCollection [
	"Build a facade set from aCollection (dedup by Python __hash__/__eq__ via the
	table).  Overrides kernel Collection class>>withAll: so the instance gets a
	table (the kernel path could allocate via new: and skip our new).

	SNAPSHOT the source first: populating the table calls the elements' Python
	__eq__ (for dedup), and a pathological __eq__ may mutate/clear the source
	mid-iteration (bpo-46615's TestMethodsMutating_Set_List).  Iterating a live
	Grail list being cleared crashes with a kernel OffsetError; copying to an
	Array up front (no user code runs during the copy) makes construction robust
	-- the __eq__ mutation then hits only the original, not our snapshot."

	| inst |
	inst := self new.
	(Array @env0:withAll: aCollection) @env0:do: [:each | inst add: each].
	^ inst

]

{ #category : 'Grail-Facade Storage' }
set >> ___pyInitTable___ [
	"Install a fresh PyDict as the element table (keys = elements)."

	table := PyDict new

]

{ #category : 'Grail-Facade Storage' }
set >> add: anElement [
	"Add an element (dedup by Python __hash__/__eq__; first-inserted key kept).
	The value is a fixed sentinel that is never read.  An unhashable element must
	report CPython's ``cannot use 'X' as a set element'' (the PyDict store raises
	it as a ``dict key'').  Re-label only on the exception path -- zero overhead
	for a hashable add -- and let a genuine __eq__ TypeError (not unhashability)
	propagate unchanged.  Covers EVERY add path: s.add(x), set-literal/comprehension
	codegen (@env0:add:), construction (withAll:), and the C-shim."

	table isNil ifTrue: [^ super add: anElement].
	[table at: anElement put: true]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
set >> do: aBlock [
	"Iterate the elements (the table's keys, in insertion order)."

	table isNil ifTrue: [^ super do: aBlock].
	^ table keysDo: aBlock

]

{ #category : 'Grail-Facade Storage' }
set >> includes: anElement [
	"Membership by Python __hash__/__eq__ (via PyDict includesKey:).  An
	unhashable element is re-labelled to the set-element TypeError (only on the
	exception path); a stored element's __eq__ raising during the compare is not
	unhashability, so it propagates unchanged."

	table isNil ifTrue: [^ super includes: anElement].
	^ [table includesKey: anElement]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass]

]

{ #category : 'Grail-Facade Storage' }
set >> isEmpty [
	table isNil ifTrue: [^ super isEmpty].
	^ table isEmpty

]

{ #category : 'Grail-Facade Storage' }
set >> remove: anElement [
	"Remove a present element (callers locate it first).  A no-op if absent."

	table isNil ifTrue: [^ super remove: anElement].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
set >> remove: anElement ifAbsent: aBlock [
	table isNil ifTrue: [^ super remove: anElement ifAbsent: aBlock].
	(table includesKey: anElement) ifFalse: [^ aBlock value].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement

]

{ #category : 'Grail-Facade Storage' }
set >> removeAll: aCollection [
	"Remove every element of aCollection.  ``removeAll: self'' (set>>clear) resets
	the table -- iterating it while removing would mutate mid-iteration."

	table isNil ifTrue: [^ super removeAll: aCollection].
	aCollection == self ifTrue: [table := PyDict new. ^ aCollection].
	aCollection do: [:each | table removeKey: each ifAbsent: [nil]].
	^ aCollection

]

{ #category : 'Grail-Facade Storage' }
set >> size [
	table isNil ifTrue: [^ super size].
	^ table size

]
