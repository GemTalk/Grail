"What dict_keys / dict_values / dict_items and the dict iterators are built on
for an instance's __dict__.  PyInstanceDict's own Smalltalk-side enumeration
yields the STORED keys (Symbols for string keys), which internal callers rely
on; the views must yield the keys Python sees, so they read through this."
Class {
	#name : 'PyInstanceDictMapping',
	#superclass : 'Object',
	#instVars : [
		'dict'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyInstanceDictMapping class >> ___on: aPyInstanceDict [
	^ self new ___setDict: aPyInstanceDict

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> ___instanceDict___ [
	"The PyInstanceDict this reads."
	^ dict

]

{ #category : 'Grail-Private' }
PyInstanceDictMapping >> ___setDict: aPyInstanceDict [
	dict := aPyInstanceDict

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> at: aKey [
	| v |
	v := dict ___rawAt___: aKey.
	v == nil ifTrue: [^ KeyError ___signal___: aKey].
	^ v

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> includesKey: aKey [
	^ (dict ___rawAt___: aKey) ~~ nil

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> keysAndValuesDo: aBlock [
	"Through the dict's OWN enumeration, which is what its ``size'' counts: a
	PyModuleDict lists the module's names, not the raw slot pairs, and a
	mismatch reads as a size change to the iterators."
	dict keysAndValuesDo: [:k :v |
		aBlock value: (dict ___pythonKeyFor___: k) value: v]

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> keysDo: aBlock [
	"The KEYS alone, through the dict's own Smalltalk-side ``keys'' -- never by
	way of keysAndValuesDo:, which for a PyModuleDict READS each value, and a
	module's value read can run code (sys's ``breakpoint'' is a method it
	performs).  Iterating ``vars(sys)'' halted the session."
	dict keys do: [:k | aBlock value: (dict ___pythonKeyFor___: k)]

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> size [
	^ dict size

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDictMapping >> valuesDo: aBlock [
	self keysAndValuesDo: [:k :v | aBlock value: v]

]
