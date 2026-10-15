Class {
	#name : 'WeakSet',
	#superclass : 'Object',
	#instVars : [
		'refs'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-constructors' }
WeakSet class >> new [
	^super new _init

]

{ #category : 'Grail-Weak-private' }
WeakSet >> _init [
	refs := OrderedCollection new.
	^self

]

{ #category : 'Grail-Weak-adding' }
WeakSet >> add: anObject [
	| ref ourRefs |
	(self includes: anObject) ifTrue: [^anObject].
	ourRefs := refs.
	ref := WeakReference on: anObject callback: [:r | ourRefs remove: r ifAbsent: []].
	refs add: ref.
	^anObject

]

{ #category : 'Grail-Weak-testing' }
WeakSet >> includes: anObject [
	refs do: [:r | r value == anObject ifTrue: [^true]].
	^false

]

{ #category : 'Grail-Weak-removing' }
WeakSet >> remove: anObject [
	refs do: [:r |
		r value == anObject ifTrue: [refs remove: r. ^anObject]].
	^self error: 'not in set'

]

{ #category : 'Grail-Weak-accessing' }
WeakSet >> size [
	| n |
	n := 0.
	refs do: [:r | r isAlive ifTrue: [n := n + 1]].
	^n

]
