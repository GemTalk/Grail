"A dictionary keyed by compiled methods that does not keep a method alive when
no class owns it.

Grail records facts about compiled code in session tables keyed by the
method: the scope a doit ran in, the code object a function block was
stamped with, a def site's slots.  Held strongly, an entry for a method no
class owns -- one compiled by exec(), eval(), a REPL statement, or a block
inside one -- kept that method alive for the session, and with it every
global its literals bind.  A doit reads and writes its globals through
SymbolAssociations it holds as literals, so whatever an exec() bound stayed
reachable long after its namespace was dropped.  A generator stored that way
was never finalized (test_generators' test_generator_resurrect).

So a method no class owns is held weakly, in a GrailMethodTableEntry
ephemeron, and an entry lasts as long as its method does.  A method a class
owns -- installed, or a block of one -- lives as long as its class anyway,
and is held strongly in an IdentityKeyValueDictionary exactly as before:
nothing about how a module's or a class's code is looked up changes.  The
same goes for a key that is not a method at all.

The weak half is keyed by the method's oop, so the dictionary itself holds
no method.  A reused oop is told apart by the entry's own key, which is nil
once the method has died and been mourned.  Dead entries stay until the next
sweep, which runs when the weak half has doubled since the last one --
SharedWeakReferences' scheme.
"
Class {
	#name : 'GrailMethodTable',
	#superclass : 'Object',
	#instVars : [
		'owned',
		'unowned',
		'sweepSize'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-private' }
GrailMethodTable class >> initialSweepSize [

	^ 64

]

{ #category : 'Grail-Weak-constructors' }
GrailMethodTable class >> new [

	^ super new initialize

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> at: aMethod ifAbsent: aBlock [

	| entry |
	(self isOwned: aMethod) ifTrue: [^ owned at: aMethod ifAbsent: aBlock].
	entry := unowned at: aMethod asOop otherwise: nil.
	^ (entry ~~ nil and: [entry key == aMethod])
		ifTrue: [entry value]
		ifFalse: [aBlock value]

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> at: aMethod ifAbsentPut: aBlock [

	^ self at: aMethod ifAbsent: [self at: aMethod put: aBlock value]

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> at: aMethod otherwise: aDefault [

	^ self at: aMethod ifAbsent: [aDefault]

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> at: aMethod put: aValue [
	"Record aValue against aMethod.  A live entry for the same method keeps
	 its ephemeron and takes the new value; anything else under that oop --
	 none, or a dead method's entry -- is replaced."

	| oop entry |
	(self isOwned: aMethod) ifTrue: [^ owned at: aMethod put: aValue].
	oop := aMethod asOop.
	entry := unowned at: oop otherwise: nil.
	(entry ~~ nil and: [entry key == aMethod]) ifTrue: [
		entry setValue: aValue.
		^ aValue].
	unowned size >= sweepSize ifTrue: [self forgetDead].
	unowned at: oop put: (GrailMethodTableEntry key: aMethod value: aValue).
	^ aValue

]

{ #category : 'Grail-Weak-private' }
GrailMethodTable >> forgetDead [
	"Drop the entries whose method has died, and sweep again once what is
	 left has doubled."

	| deadKeys |
	deadKeys := unowned keys select: [:oop | (unowned at: oop) key == nil].
	deadKeys do: [:oop | unowned removeKey: oop].
	sweepSize := unowned size * 2 max: self class initialSweepSize

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> includesKey: aMethod [

	self at: aMethod ifAbsent: [^ false].
	^ true

]

{ #category : 'Grail-Weak-private' }
GrailMethodTable >> initialize [

	owned := IdentityKeyValueDictionary new.
	unowned := IntegerKeyValueDictionary new.
	sweepSize := self class initialSweepSize

]

{ #category : 'Grail-Weak-private' }
GrailMethodTable >> isOwned: aKey [
	"Does a class own aKey -- an installed method, or a block of one?  A
	 block method's inClass answers its home method's class, so this is one
	 test for both.  A key that is not a method counts as owned: it is held
	 strongly, as every key was before."

	^ (aKey isKindOf: GsNMethod) not or: [aKey inClass ~~ nil]

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> removeKey: aMethod ifAbsent: aBlock [

	| oop entry |
	(self isOwned: aMethod) ifTrue: [^ owned removeKey: aMethod ifAbsent: aBlock].
	oop := aMethod asOop.
	entry := unowned at: oop otherwise: nil.
	(entry ~~ nil and: [entry key == aMethod]) ifFalse: [^ aBlock value].
	unowned removeKey: oop.
	^ entry value

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> size [
	"How many methods have an entry: every owned one, and every unowned one
	 that is still alive."

	| live |
	live := 0.
	unowned keysAndValuesDo: [:oop :entry | entry key ~~ nil ifTrue: [live := live + 1]].
	^ owned size + live

]
