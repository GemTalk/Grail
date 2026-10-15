"Python tuple type - immutable sequence.

Built-in immutable sequence. If no argument is given, the constructor returns
an empty tuple. If iterable is specified the tuple is initialized from
iterable's items.

Implemented as an Array subclass. All class-side constructors freeze the
result via immediateInvariant before returning, so callers receive a fully
immutable instance. The new: anInteger fill: aBlock builder supports the
populate-then-freeze pattern.

"
Class {
	#name : 'tuple',
	#superclass : 'Array',
	#category : 'Grail-Collections-Sequenceable'
}

{ #category : 'Grail-instance creation' }
tuple class >> ___frozenInstance: inst [
	"Freeze EXACT tuples (immutable, so element storage never changes);
	leave SUBCLASS instances mutable so they can carry instance attributes
	-- a tuple subclass has a __dict__ in CPython, and test_keywords_in_subclass's
	subclass_with_init sets ``self.newarg''.  Python exposes no element
	mutation on either, so subclass elements stay effectively immutable."

	self == tuple ifTrue: [^ inst immediateInvariant].
	^ inst

]

{ #category : 'Grail-Introspection' }
tuple class >> ___pythonValueAttrs___ [
	"``obj.__dict__'' is a VALUE read, not a callable wrapper -- see __dict__."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-instance creation' }
tuple class >> new [
	"Return an empty, frozen tuple.

	For tuple itself, THE empty tuple: CPython's is a singleton, and code
	compares with ``is'' -- ``TypeVar(name='T', default=()).__default__ is ()''
	(test_typing TypeVarTests.test_constructor).  One per session, and safe to
	share because an exact tuple is invariant: anything that tried to grow it
	in place raises rather than changing every ``()'' at once.  A subclass
	instance stays fresh and mutable, as ___frozenInstance: explains."

	self == tuple ifFalse: [^ self ___frozenInstance: (self new: 0)].
	^ SessionTemps current at: #'GrailEmptyTuple'
		ifAbsentPut: [self ___frozenInstance: (self new: 0)]

]

{ #category : 'Grail-instance creation' }
tuple class >> new: anInteger fill: aBlock [
	"Build a tuple of size anInteger by passing the mutable instance to
	aBlock (which populates it via at:put:), then freeze and return.
	Use this for the rare populate-then-freeze case where the elements
	cannot be supplied as a single collection up front."

	| inst |
	inst := self new: anInteger.
	aBlock value: inst.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
tuple class >> with: a [

	| inst |
	inst := self new: 1.
	inst at: 1 put: a.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
tuple class >> with: a with: b [

	| inst |
	inst := self new: 2.
	inst at: 1 put: a.
	inst at: 2 put: b.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
tuple class >> with: a with: b with: c [

	| inst |
	inst := self new: 3.
	inst at: 1 put: a.
	inst at: 2 put: b.
	inst at: 3 put: c.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
tuple class >> with: a with: b with: c with: d [

	| inst |
	inst := self new: 4.
	inst at: 1 put: a.
	inst at: 2 put: b.
	inst at: 3 put: c.
	inst at: 4 put: d.
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-instance creation' }
tuple class >> withAll: aCollection [

	| inst i |
	(self == tuple and: [aCollection size = 0]) ifTrue: [^ self new].
	inst := self new: aCollection size.
	i := 1.
	aCollection do: [:each |
		inst at: i put: each.
		i := i + 1.
	].
	^ self ___frozenInstance: inst

]

{ #category : 'Grail-Exception handling' }
tuple >> handles: anException [
	"Python ``except (TypeError, ValueError):`` builds a tuple of
	exception classes and uses it as the ``on:do:`` selector pattern
	(see TryAst codegen).  GemStone's handler-match protocol asks
	the handler class ``handles: anException``; without this method
	the lookup ends in MNU.  Delegate to each element: the tuple
	matches if any contained class would."

	self do: [:each |
		(each handles: anException) ifTrue: [^ true]
	].
	^ false

]
