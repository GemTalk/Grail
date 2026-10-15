Class {
	#name : 'WeakReferenceHolder',
	#superclass : 'Object',
	#instVars : [
		'ephemeron',
		'callback',
		'dead'
	],
	#gs_options : [
		'dbTransient'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-finalization' }
WeakReferenceHolder >> _ephemeronFired [
	"Dispatched by the inner ephemeron's #mourn. Mark dead first so the
	 callback observes #value == nil (Python's 'referent is None inside the
	 callback'), then run the user callback (wrapped at construction time to
	 substitute the outer WeakReference for its argument), then release
	 internal references."

	dead == true ifTrue: [^self].
	dead := true.
	callback ifNotNil: [callback value: self].
	callback := nil.
	ephemeron := nil

]

{ #category : 'Grail-Weak-private' }
WeakReferenceHolder >> _setEphemeron: anEphemeron callback: aBlock [
	"Initialise an unfired holder. The caller wires #beEphemeron: true on
	 the inner ephemeron separately so it can fall back gracefully when the
	 referent is ineligible (immediate / committed)."

	ephemeron := anEphemeron.
	callback := aBlock.
	dead := false.
	^self

]

{ #category : 'Grail-Weak-testing' }
WeakReferenceHolder >> isAlive [
	dead == true ifTrue: [^false].
	ephemeron ifNil: [^false].
	^ephemeron referent ~~ nil

]

{ #category : 'Grail-Weak-testing' }
WeakReferenceHolder >> isDead [
	^self isAlive not

]

{ #category : 'Grail-Weak-accessing' }
WeakReferenceHolder >> value [
	"Answer the referent if still alive, or nil if reclaimed or post-commit.
	 nil-tolerant: after commit + read-back, `dead` is nil rather than
	 false; treating nil-dead-with-nil-ephemeron as dead handles that path."

	dead == true ifTrue: [^nil].
	ephemeron ifNil: [^nil].
	^ephemeron referent

]
