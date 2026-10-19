Class {
	#name : 'dict_reverseitemiterator',
	#superclass : 'dict_reversekeyiterator',
	#category : 'Grail-Collections-Iterators'
}

{ #category : 'Grail-Iteration' }
dict_reverseitemiterator >> ___produce___: aKey [
	^ tuple with: aKey with: (dict at: aKey)

]
