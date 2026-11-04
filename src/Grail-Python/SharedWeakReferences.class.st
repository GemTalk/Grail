"The session's shared weak references: for each object, the weak reference
without a callback that every weakref.ref(object) answers while it lives --
CPython's ``basic ref'', which heads the object's list of weak references
and is what object.__weakref__ reads (Objects/weakrefobject.c:330-354,
try_reuse_basic_ref; :376-399, insert_weakref).

Keyed by the referent's oop, not by the referent, so the table holds no
referent alive; a reused oop is told apart by the reference's own value.
A reference whose referent died stays until the next sweep, which runs once
the table has doubled since the last one.
"
Class {
	#name : 'SharedWeakReferences',
	#superclass : 'Object',
	#instVars : [
		'references',
		'sweepSize'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-accessing' }
SharedWeakReferences class >> current [
	"The session's: a weak reference is session state (its holder is
	 dbTransient)."

	^ SessionTemps current at: #'GrailSharedWeakReferences' ifAbsent: [
		SessionTemps current at: #'GrailSharedWeakReferences' put: self empty]

]

{ #category : 'Grail-Weak-constructors' }
SharedWeakReferences class >> empty [

	^ self new initializeSweepSize: self initialSweepSize

]

{ #category : 'Grail-Weak-private' }
SharedWeakReferences class >> initialSweepSize [

	^ 64

]

{ #category : 'Grail-Weak-private' }
SharedWeakReferences >> add: aWeakReference on: anObject [

	references size >= sweepSize ifTrue: [self forgetDead].
	references at: (self keyFor: anObject) put: aWeakReference.
	^ aWeakReference

]

{ #category : 'Grail-Weak-private' }
SharedWeakReferences >> forgetDead [

	| deadKeys |

	deadKeys := references keys select: [:key | (references at: key) isDead].
	deadKeys do: [:key | references removeKey: key].
	sweepSize := references size * 2 max: self class initialSweepSize

]

{ #category : 'Grail-Weak-private' }
SharedWeakReferences >> initializeSweepSize: aSize [

	references := IdentityKeyValueDictionary new.
	sweepSize := aSize

]

{ #category : 'Grail-Weak-private' }
SharedWeakReferences >> keyFor: anObject [

	^ anObject asOop

]

{ #category : 'Grail-Weak-accessing' }
SharedWeakReferences >> referenceTo: anObject ifNone: aBlock [

	| reference |

	reference := references at: (self keyFor: anObject) ifAbsent: [^ aBlock value].
	^ reference value == anObject
		ifTrue: [reference]
		ifFalse: [aBlock value]

]

{ #category : 'Grail-Weak-accessing' }
SharedWeakReferences >> referenceTo: anObject ifNonePut: aBlock [

	^ self referenceTo: anObject ifNone: [self add: aBlock value on: anObject]

]
