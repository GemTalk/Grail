Class {
	#name : 'WeakValueDictionary',
	#superclass : 'Object',
	#instVars : [
		'map'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-constructors' }
WeakValueDictionary class >> new [
	^super new _init

]

{ #category : 'Grail-Weak-private' }
WeakValueDictionary >> _init [
	map := KeyValueDictionary new.
	^self

]

{ #category : 'Grail-Weak-accessing' }
WeakValueDictionary >> at: aKey [
	^self at: aKey ifAbsent: [self error: 'key not found']

]

{ #category : 'Grail-Weak-accessing' }
WeakValueDictionary >> at: aKey ifAbsent: aBlock [
	| ref v |
	ref := map at: aKey ifAbsent: [^aBlock value].
	v := ref value.
	v ifNil: [^aBlock value].
	^v

]

{ #category : 'Grail-Weak-accessing' }
WeakValueDictionary >> at: aKey put: aValue [
	"Bind aKey to aValue, holding aValue weakly."

	| ref ourMap |
	map removeKey: aKey ifAbsent: [].
	ourMap := map.
	ref := WeakReference on: aValue callback: [:r | ourMap removeKey: aKey ifAbsent: []].
	map at: aKey put: ref.
	^aValue

]

{ #category : 'Grail-Weak-testing' }
WeakValueDictionary >> includesKey: aKey [
	| ref |
	ref := map at: aKey ifAbsent: [^false].
	^ref isAlive

]

{ #category : 'Grail-Weak-accessing' }
WeakValueDictionary >> size [
	"Number of entries whose values are still alive."

	| n |
	n := 0.
	map valuesDo: [:ref | ref isAlive ifTrue: [n := n + 1]].
	^n

]
