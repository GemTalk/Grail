! ------------------- Remove existing behavior from OrderedDictionary
removeallmethods OrderedDictionary
removeallclassmethods OrderedDictionary
! ------------------- Class methods for OrderedDictionary
category: 'instance creation'
classmethod: OrderedDictionary
new

	^self basicNew initialize
%
category: 'instance creation'
classmethod: OrderedDictionary
fromAssociations: anArray
	"Create an OrderedDictionary from an array of Associations"

	| od |
	od := self new.
	anArray do: [:each | od at: each key put: each value].
	^od
%
category: 'instance creation'
classmethod: OrderedDictionary
withAll: aCollection
	"Create an OrderedDictionary from another dictionary-like object
	 (OrderedDictionary, Dictionary, SymbolDictionary) or a collection of Associations."

	| od |
	od := self new.
	(aCollection isKindOf: AbstractDictionary)
		ifTrue: [aCollection keysAndValuesDo: [:key :value | od at: key put: value]]
		ifFalse: [aCollection do: [:each | od at: each key put: each value]].
	^od
%
! ------------------- Instance methods for OrderedDictionary
category: 'initialization'
method: OrderedDictionary
initialize

	dictionary := Dictionary new.
	keys := OrderedCollection new.
	^self
%
category: 'accessing'
method: OrderedDictionary
at: key

	^dictionary at: key
%
category: 'accessing'
method: OrderedDictionary
at: key ifAbsent: aBlock

	^dictionary at: key ifAbsent: aBlock
%
category: 'accessing'
method: OrderedDictionary
at: key otherwise: defaultValue

	^dictionary at: key ifAbsent: [defaultValue]
%
category: 'accessing'
method: OrderedDictionary
at: key ifAbsentPut: aBlock
	"If key exists, return its value. Otherwise, evaluate aBlock, store the result at key, and return it."

	^(dictionary includesKey: key)
		ifTrue: [dictionary at: key]
		ifFalse: [
			| value |
			value := aBlock value.
			self at: key put: value.
			value
		]
%
category: 'accessing'
method: OrderedDictionary
associationAt: aKey

	| assoc |
	assoc := dictionary associationAt: aKey otherwise: nil.
	assoc == nil ifTrue: [
		self at: aKey put: nil.
		assoc := dictionary associationAt: aKey.
	].
	^assoc
%
category: 'accessing'
method: OrderedDictionary
associationAt: aKey otherwise: defaultValue

	^dictionary associationAt: aKey otherwise: defaultValue
%
category: 'accessing'
method: OrderedDictionary
add: anAssociation
	"Add an association to the dictionary.
	 This stores the actual association object, allowing association sharing between dictionaries."

	(dictionary includesKey: anAssociation key)
		ifFalse: [keys add: anAssociation key].
	dictionary add: anAssociation.
	^anAssociation
%
category: 'accessing'
method: OrderedDictionary
addAll: aDictionary
	"Add all key-value pairs from aDictionary to this dictionary"

	aDictionary keysAndValuesDo: [:key :value |
		self at: key put: value
	].
	^aDictionary
%
category: 'accessing'
method: OrderedDictionary
at: key put: value

	"If key already exists, update in place (preserves order).
	 If key is new, append to end of keys."
	(dictionary includesKey: key)
		ifFalse: [keys add: key].
	dictionary at: key put: value.
	^value
%
category: 'removing'
method: OrderedDictionary
removeKey: key

	dictionary removeKey: key.
	keys remove: key.
%
category: 'removing'
method: OrderedDictionary
removeKey: key ifAbsent: aBlock

	| result |
	result := dictionary removeKey: key ifAbsent: [^aBlock value].
	keys remove: key ifAbsent: [].
	^result
%
category: 'testing'
method: OrderedDictionary
includesKey: key

	^dictionary includesKey: key
%
category: 'accessing'
method: OrderedDictionary
keys

	"Return keys in insertion order"
	^keys copy
%
category: 'accessing'
method: OrderedDictionary
values

	"Return values in insertion order"
	^keys collect: [:key | dictionary at: key]
%
category: 'accessing'
method: OrderedDictionary
size

	^dictionary size
%
category: 'enumerating'
method: OrderedDictionary
do: aBlock

	"Iterate values in insertion order"
	keys do: [:key | aBlock value: (dictionary at: key)]
%
category: 'enumerating'
method: OrderedDictionary
keysAndValuesDo: aBlock

	"Iterate key-value pairs in insertion order"
	keys do: [:key | aBlock value: key value: (dictionary at: key)]
%
category: 'enumerating'
method: OrderedDictionary
keysDo: aBlock

	"Iterate keys in insertion order"
	keys do: aBlock
%
category: 'accessing'
method: OrderedDictionary
lastKey

	"Return the last key (most recently inserted)"
	^keys last
%
category: 'accessing'
method: OrderedDictionary
firstKey

	"Return the first key (earliest inserted)"
	^keys first
%
category: 'removing'
method: OrderedDictionary
clear

	dictionary := Dictionary new.
	keys := OrderedCollection new.
%
category: 'copying'
method: OrderedDictionary
copy

	| newDict |
	newDict := self class new.
	keys do: [:key |
		newDict at: key put: (dictionary at: key)
	].
	^newDict
%
category: 'testing'
method: OrderedDictionary
isEmpty

	^dictionary isEmpty
%
category: 'comparing'
method: OrderedDictionary
= anObject

	"Two OrderedDictionaries are equal if they have the same keys and values"
	(anObject isKindOf: OrderedDictionary) ifFalse: [^false].
	self size = anObject size ifFalse: [^false].
	self keysAndValuesDo: [:key :value |
		(anObject includesKey: key) ifFalse: [^false].
		(anObject at: key) = value ifFalse: [^false].
	].
	^true
%
