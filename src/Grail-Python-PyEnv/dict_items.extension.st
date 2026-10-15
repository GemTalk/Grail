Extension { #name : 'dict_items' }

{ #category : 'Grail-Iterator Protocol' }
dict_items >> ___reverseIteratorClass___ [
	^ dict_reverseitemiterator

]

{ #category : 'Grail-Collection Protocol' }
dict_items >> __contains__: pair [
	| k v |
	(pair isKindOf: SequenceableCollection) ifFalse: [^ false].
	(pair @env0:size @env0:= 2) ifFalse: [^ false].
	k := pair @env0:at: 1.
	v := pair @env0:at: 2.
	(mapping @env0:includesKey: k) ifFalse: [^ false].
	"Identity-first value comparison (CPython PyObject_RichCompareBool): a
	pair whose value IS the stored value tests ``in'' without calling __eq__,
	so a raising/side-effecting __eq__ is skipped when they are identical
	(test_dictviews test_compare_error)."
	^ (mapping @env0:at: k) ___pyRichEqBool___: v

]

{ #category : 'Grail-Iterator Protocol' }
dict_items >> __iter__ [
	"Live item iterator (see dict_keys>>__iter__)."
	^ dict_itemiterator ___on: mapping

]

{ #category : 'Grail-String Representation' }
dict_items >> __repr__ [
	^ self ___reprElementsPrefixed: 'dict_items('

]
