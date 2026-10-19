Extension { #name : 'dict_values' }

{ #category : 'Grail-Iterator Protocol' }
dict_values >> ___reverseIteratorClass___ [
	^ dict_reversevalueiterator

]

{ #category : 'Grail-Collection Protocol' }
dict_values >> __contains__: v [
	"___pyRichEqBool___, not the raw dunder: __eq__ may answer NotImplemented
	for a foreign operand, which is not a Boolean."
	mapping @env0:valuesDo: [:each | (each ___pyRichEqBool___: v) @env0:ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Iterator Protocol' }
dict_values >> __iter__ [
	"Live value iterator (see dict_keys>>__iter__)."
	^ dict_valueiterator ___on: mapping

]

{ #category : 'Grail-String Representation' }
dict_values >> __repr__ [
	^ self ___reprElementsPrefixed: 'dict_values('

]
