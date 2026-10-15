Class {
	#name : 'dict_items',
	#superclass : 'dict_set_view',
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Private' }
dict_items >> ___elements [
	| l |
	l := OrderedCollection new.
	mapping keysAndValuesDo: [:k :v | l add: (tuple with: k with: v)].
	^ l

]
