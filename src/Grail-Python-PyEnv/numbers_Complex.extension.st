Extension { #name : 'numbers_Complex' }

{ #category : 'Grail-Mixins' }
numbers_Complex >> __bool__ [
	"PEP 3141 concrete mixin: ``self != 0''."

	^ (self ___cmpNe___: 0)

]

{ #category : 'Grail-Mixins' }
numbers_Complex >> __rsub__: other [
	"PEP 3141 concrete mixin: ``-self + other''."

	^ self __neg__ ___binOpAdd___: other

]

{ #category : 'Grail-Mixins' }
numbers_Complex >> __sub__: other [
	"PEP 3141 concrete mixin: ``self + -other''."

	^ self ___binOpAdd___: other __neg__

]
