Class {
	#name : 'WeakReferenceTestSubject',
	#superclass : 'Object',
	#instVars : [
		'tag'
	],
	#category : 'Grail-Weak-Tests'
}

{ #category : 'comparing' }
WeakReferenceTestSubject >> = anObject [
	^(anObject isKindOf: WeakReferenceTestSubject) and: [tag = anObject tag]

]

{ #category : 'accessing' }
WeakReferenceTestSubject >> doubled [
	"A selector Object does not implement, so WeakProxy forwarding can be tested."
	^tag * 2

]

{ #category : 'comparing' }
WeakReferenceTestSubject >> hash [
	^tag hash

]

{ #category : 'accessing' }
WeakReferenceTestSubject >> tag [
	^tag

]

{ #category : 'accessing' }
WeakReferenceTestSubject >> tag: anObject [
	tag := anObject

]
