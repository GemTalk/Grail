Extension { #name : 'PyDict' }

{ #category : 'Grail-Iteration' }
PyDict >> __reversed__ [
	^ dict_reversekeyiterator @env0:___on: self

]

{ #category : 'Grail-Mutation Methods' }
PyDict >> clear [
	self @env0:___clear___.
	^ None

]

{ #category : 'Grail-Mutation Methods' }
PyDict >> popitem [
	"Remove and return the last (key, value) pair; KeyError when empty."

	| assoc |
	assoc := self @env0:___popLast___.
	assoc @env0:== nil ifTrue: [
		^ KeyError ___signal___: 'popitem(): dictionary is empty'].
	^ tuple @env0:with: assoc @env0:key with: assoc @env0:value

]
