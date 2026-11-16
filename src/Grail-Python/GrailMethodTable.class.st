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

A LIVE FUNCTION ANCHORS ITS METHOD (keepMethodOf:), because under native
code the VM does not trace an ExecBlock's reference to its method when it
decides which weak references and ephemerons have died.  Measured on
4.0.0.a8 Linux x86_64 with GEM_NATIVE_CODE_ENABLED=2, kernel only: a
WeakReference to the method of a block held in UserGlobals is cleared by
``System _generationScavenge_vmMarkSweep'' -- while the block still runs,
its method at the same oop.  With native code off it is not cleared.  So
the entries of a function exec() defined -- its block method's, and through
that method its doit's -- were mourned while the function was alive, and
f.__code__ and f_globals went with them.  The anchor is an entry keyed by the
function, whose liveness the VM does see, holding its method as the value:
while the function lives, the method is reached through the anchor too.
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

{ #category : 'Grail-Weak-anchoring' }
GrailMethodTable class >> anchor: aBlock method: aMethod [
	"keepMethodOf: once the caller knows no class owns aMethod, aBlock's."

	(SessionTemps current at: #GrailMethodAnchors ifAbsentPut: [self new])
		at: aBlock put: aMethod

]

{ #category : 'Grail-Weak-private' }
GrailMethodTable class >> initialSweepSize [

	^ 64

]

{ #category : 'Grail-Weak-anchoring' }
GrailMethodTable class >> keepMethodOf: aBlock [
	"While aBlock lives, keep its method reachable by a path the VM traces.

	Under native code the VM does not see an ExecBlock's reference to its
	method when it mourns weak references and ephemerons (see the class
	comment), so a method no class owns, held only by a live function, read
	as dead and its entries here were dropped.  This files an entry keyed by
	the block itself -- held as weakly as any unowned key -- whose value is
	the method: the block's liveness the VM does see, and while it lasts the
	entry marks the method, and through it the home doit.

	Every function is anchored at def time, by atMethodOf:ifAbsentPut: on the
	def-site table.  A block a class owns needs no anchor and gets none: its
	method lives as long as the class."

	| method |
	method := aBlock method.
	method inClass ~~ nil ifTrue: [^ self].
	self anchor: aBlock method: method

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

{ #category : 'Grail-Weak-accessing' }
GrailMethodTable >> atMethodOf: aFunction ifAbsentPut: aBlock [
	"at: aFunction method ifAbsentPut: aBlock, for a table a def stamps -- and
	 a function no class owns also anchors its method (class >>
	 keepMethodOf:).  One ownership test decides both, so a function a class
	 owns pays nothing for the anchor."

	| method entry value |
	method := aFunction method.
	(self isOwned: method) ifTrue: [
		^ owned at: method ifAbsent: [owned at: method put: aBlock value]].
	self class anchor: aFunction method: method.
	entry := unowned at: method asOop otherwise: nil.
	(entry ~~ nil and: [entry key == method]) ifTrue: [^ entry value].
	value := aBlock value.
	self at: method put: value.
	^ value

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
	 test for both.  A function (an ExecBlock) is owned when its method is:
	 that is the key keepMethodOf: files.  Any other key counts as owned: it
	 is held strongly, as every key was before."

	(aKey isKindOf: GsNMethod) ifTrue: [^ aKey inClass ~~ nil].
	(aKey isKindOf: ExecBlock) ifTrue: [^ aKey method inClass ~~ nil].
	^ true

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
