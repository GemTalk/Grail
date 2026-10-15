Class {
	#name : 'WeakReferenceEphemeron',
	#superclass : 'Object',
	#instVars : [
		'referent',
		'holder'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-private' }
WeakReferenceEphemeron >> _setReferent: anObject holder: aHolder [

	referent := anObject.
	holder := aHolder.
	^self

]

{ #category : 'Grail-Weak-finalization' }
WeakReferenceEphemeron >> mourn [
	"Sent by the finalization process after GC fires this ephemeron.
	 Dispatch to the holder's hook (which marks dead, runs the callback,
	 and releases its references), then nil our own slots so the
	 ephemeron is fully released for GC."

	holder ifNotNil: [holder _ephemeronFired].
	holder := nil.
	referent := nil

]

{ #category : 'Grail-Weak-accessing' }
WeakReferenceEphemeron >> referent [
	"Answer the weakly-held referent (nil once mourned)."

	^referent

]
