Class {
	#name : 'dict_reversevalueiterator',
	#superclass : 'dict_reversekeyiterator',
	#category : 'Grail-Collections-Iterators'
}

{ #category : 'Grail-Iteration' }
dict_reversevalueiterator >> ___produce___: aKey [
	^ dict at: aKey

]
