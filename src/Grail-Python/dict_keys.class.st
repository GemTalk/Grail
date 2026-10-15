Class {
	#name : 'dict_keys',
	#superclass : 'dict_set_view',
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Private' }
dict_keys >> ___elements [
	| l |
	l := OrderedCollection new.
	mapping keysDo: [:k | l add: k].
	^ l

]
