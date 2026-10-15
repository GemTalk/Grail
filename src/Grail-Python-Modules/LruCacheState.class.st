"What one lru_cache wrapper has remembered IN THIS SESSION: the results by
key, the keys from least to most recently used, and the hit / miss counts.

It lives in SessionTemps, keyed by the wrapper (LruCacheWrapper >>
___sessionState___), never in the wrapper itself.  CPython's lru_cache is
process memory; a wrapper made at module level in a DEPLOYED module is a
committed object, and holding the cache in it made every hit a write to a
shared object (two gems serving one app conflicted over typing's _tp_cache)
and every miss a way for the caller's arguments and results to reach the
repository with the next commit (#1229)."
Class {
	#name : 'LruCacheState',
	#superclass : 'Object',
	#instVars : [
		'results',
		'recency',
		'hits',
		'misses'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Instance Creation' }
LruCacheState class >> empty [

	^ self new initializeEmpty

]

{ #category : 'Recording' }
LruCacheState >> at: aKey put: aResult keepingAtMost: aMaxsize [
	"The wrapped call may have re-entered and cached this very key -- a
	recursive memoized function does exactly that -- so the key joins the
	recency list only when it is genuinely new.  aMaxsize None is unbounded."

	(results includesKey: aKey) ifFalse: [recency add: aKey].
	results at: aKey put: aResult.
	aMaxsize == None ifTrue: [^ self].
	[results size > aMaxsize] whileTrue: [
		results removeKey: recency removeFirst ifAbsent: []]

]

{ #category : 'Accessing' }
LruCacheState >> hits [

	^ hits

]

{ #category : 'Initialization' }
LruCacheState >> initializeEmpty [

	results := KeyValueDictionary new.
	recency := OrderedCollection new.
	hits := 0.
	misses := 0

]

{ #category : 'Accessing' }
LruCacheState >> misses [

	^ misses

]

{ #category : 'Recording' }
LruCacheState >> recordHitFor: aKey [

	hits := hits + 1.
	recency remove: aKey ifAbsent: [].
	recency add: aKey

]

{ #category : 'Recording' }
LruCacheState >> recordMiss [

	misses := misses + 1

]

{ #category : 'Accessing' }
LruCacheState >> resultAt: aKey ifAbsent: aBlock [

	^ results at: aKey ifAbsent: aBlock

]

{ #category : 'Accessing' }
LruCacheState >> size [

	^ results size

]
