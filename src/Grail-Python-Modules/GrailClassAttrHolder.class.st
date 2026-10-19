"The per-class attribute store a generated Python class keeps in its
``___dynInstVars___' classInstVar -- the ONE home of every class attribute
(docs/Class_Attribute_Single_Home.md).

It was a plain ``Object new' whose GemStone dynamic instVars were the class
dict, and every reader still speaks that protocol: dynamicInstVarAt:,
dynamicInstVarAt:put:, dynamicInstVarAt:ifAbsent:, removeDynamicInstVar:,
dynamicInstanceVariables, dynamicInstVarPairs.  A dynamic instVar has a hard
ceiling of 255 per object, and once the body's own attributes moved into the
holder a class body with more than 255 assignments -- test_listcomps runs one
with 300, in class scope -- hit it as a MemoryError where the classInstVars
it replaced had no limit.  So the holder is now this class, which answers the
same six messages over an unbounded, INSERTION-ORDERED store (the class
__dict__ view depends on the order: test_builtin test_namespace_order), and
no reader had to change.

nil is the unbound token throughout Grail (None is a singleton), so storing
nil REMOVES the entry, exactly as the kernel primitive does.

Instance variables:
* ``dict``  -- IdentityKeyValueDictionary, Symbol -> value.
* ``order`` -- OrderedCollection of the Symbols in first-store order.

"
Class {
	#name : 'GrailClassAttrHolder',
	#superclass : 'Object',
	#instVars : [
		'dict',
		'order'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
GrailClassAttrHolder class >> new [
	^ super new ___initialize

]

{ #category : 'Grail-MI Provenance' }
GrailClassAttrHolder >> ___forgetInherited___: aSymbol [
	| names |
	names := super dynamicInstVarAt: #'___grailMIInherited___'.
	names == nil ifFalse: [names remove: aSymbol asSymbol ifAbsent: []].
	^ self

]

{ #category : 'Grail-Initialization' }
GrailClassAttrHolder >> ___initialize [
	dict := IdentityKeyValueDictionary new.
	order := OrderedCollection new.
	^ self

]

{ #category : 'Grail-MI Provenance' }
GrailClassAttrHolder >> ___isInherited___: aSymbol [
	"True when aSymbol's entry is a merge copy (see ___noteInherited___:)."

	| names |
	names := super dynamicInstVarAt: #'___grailMIInherited___'.
	^ names ~~ nil and: [names includes: aSymbol asSymbol]

]

{ #category : 'Grail-MI Provenance' }
GrailClassAttrHolder >> ___noteInherited___: aSymbol [
	"Record that aSymbol's entry was COPIED here from a secondary base by
	importlib's ___mergeSecondaryBases___:..., not stored by the class itself.
	Single inheritance underneath means a secondary base's class attributes
	have to be copied for reads to find them, but in CPython they are the
	BASE's, not the subclass's: ``class G(Generic[T], O): ...'' listed O's
	attributes in G.__dict__, and SQLAlchemy's TypingOnly -- which asserts a
	direct subclass adds nothing -- refused SQLCoreOperations over Generic's
	copied ``_is_protocol''.  ___classDict___ asks ___isInherited___:.

	Kept in the object's OWN kernel dynamic instVar, under super, rather than
	in ``dict'': every reader of the holder protocol (43 of them, enum member
	scans among them) would otherwise see the record as an attribute; and an
	instVar would change the shape of every deployed class's holder.  A later
	store or removal of the name by anyone forgets it, so an attribute the
	class then sets for itself is its own again."

	| names |
	names := super dynamicInstVarAt: #'___grailMIInherited___'.
	names == nil ifTrue: [
		names := IdentitySet new.
		super dynamicInstVarAt: #'___grailMIInherited___' put: names].
	names add: aSymbol asSymbol.
	^ self

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> dynamicInstanceVariables [
	"The stored names, as an Array of Symbols in first-store order."

	^ order asArray

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> dynamicInstVarAt: aSymbol [
	"The value stored under aSymbol, or nil."

	^ dict at: aSymbol otherwise: nil

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> dynamicInstVarAt: aSymbol ifAbsent: aBlock [
	^ dict at: aSymbol ifAbsent: aBlock

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> dynamicInstVarAt: aSymbol put: aValue [
	"Store aValue under aSymbol, remembering first-store order; nil removes,
	as the kernel primitive's _remoteNil does.  Answers aValue."

	aValue == nil ifTrue: [
		self removeDynamicInstVar: aSymbol.
		^ aValue].
	(dict includesKey: aSymbol) ifFalse: [order add: aSymbol].
	dict at: aSymbol put: aValue.
	self ___forgetInherited___: aSymbol.
	^ aValue

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> dynamicInstVarPairs [
	"A flat Array alternating name and value, in first-store order -- the
	shape the kernel answers and ___classDict___ iterates by 2."

	| result |
	result := Array new: order size * 2.
	order doWithIndex: [:sym :i |
		result at: i * 2 - 1 put: sym.
		result at: i * 2 put: (dict at: sym)].
	^ result

]

{ #category : 'Grail-Dynamic InstVar Protocol' }
GrailClassAttrHolder >> removeDynamicInstVar: aSymbol [
	"Remove aSymbol's entry; a missing name is a no-op (every caller probes
	first, and the reset paths sweep names that may already be gone)."

	self ___forgetInherited___: aSymbol.
	(dict includesKey: aSymbol) ifFalse: [^ self].
	dict removeKey: aSymbol.
	order remove: aSymbol ifAbsent: [].
	^ self

]
