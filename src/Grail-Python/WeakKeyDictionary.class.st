Class {
	#name : 'WeakKeyDictionary',
	#superclass : 'Object',
	#instVars : [
		'entries'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-constructors' }
WeakKeyDictionary class >> new [
	^super new _init

]

{ #category : 'Grail-Weak-private' }
WeakKeyDictionary >> _init [
	entries := OrderedCollection new.
	^self

]

{ #category : 'Grail-Weak-private' }
WeakKeyDictionary >> _removeEntryFor: aKey [
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [
			entries remove: e.
			^self]]

]

{ #category : 'Grail-Weak-accessing' }
WeakKeyDictionary >> at: aKey [
	^self at: aKey ifAbsent: [self error: 'key not found']

]

{ #category : 'Grail-Weak-accessing' }
WeakKeyDictionary >> at: aKey ifAbsent: aBlock [
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [^e at: 2]].
	^aBlock value

]

{ #category : 'Grail-Weak-accessing' }
WeakKeyDictionary >> at: aKey put: aValue [
	"Hold aKey weakly. Replaces an existing entry for the same identity."

	| entry ref ourEntries |
	self _removeEntryFor: aKey.
	entry := Array new: 2.
	entry at: 2 put: aValue.
	ourEntries := entries.
	ref := WeakReference on: aKey callback: [:r | ourEntries remove: entry ifAbsent: []].
	entry at: 1 put: ref.
	entries add: entry.
	^aValue

]

{ #category : 'Grail-Weak-testing' }
WeakKeyDictionary >> includesKey: aKey [
	entries do: [:e |
		(e at: 1) value == aKey ifTrue: [^true]].
	^false

]

{ #category : 'Grail-Weak-accessing' }
WeakKeyDictionary >> size [
	| n |
	n := 0.
	entries do: [:e | (e at: 1) isAlive ifTrue: [n := n + 1]].
	^n

]
