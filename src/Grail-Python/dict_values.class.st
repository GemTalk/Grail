Class {
	#name : 'dict_values',
	#superclass : 'dict_view',
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Private' }
dict_values >> ___elements [
	| l |
	l := OrderedCollection new.
	mapping valuesDo: [:v | l add: v].
	^ l

]
