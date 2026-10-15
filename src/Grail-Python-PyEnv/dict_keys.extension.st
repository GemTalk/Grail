Extension { #name : 'dict_keys' }

{ #category : 'Grail-Iterator Protocol' }
dict_keys >> ___reverseIteratorClass___ [
	^ dict_reversekeyiterator

]

{ #category : 'Grail-Collection Protocol' }
dict_keys >> __contains__: k [
	^ mapping @env0:includesKey: k

]

{ #category : 'Grail-Iterator Protocol' }
dict_keys >> __iter__ [
	"Return the LIVE key iterator over the backing dict (not a snapshot-list
	iterator) so a structural mutation during iteration is detected
	(test_mutating_iteration_delete_over_*)."
	^ dict_keyiterator ___on: mapping

]

{ #category : 'Grail-String Representation' }
dict_keys >> __repr__ [
	^ self ___reprElementsPrefixed: 'dict_keys('

]
