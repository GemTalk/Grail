! ------------------- Remove existing behavior from dict_keyiterator
removeAllMethods dict_keyiterator
removeAllClassMethods dict_keyiterator
! ------------------- Class methods for dict_keyiterator
set compile_env: 0
category: 'other'
classmethod: dict_keyiterator
on: a_dict

	| sequence |
	sequence := OrderedCollection new: a_dict size.
	a_dict keysAndValuesDo: [:eachKey : eachValue |
		sequence add: (tuple with: eachKey with: eachValue).
	].
	^super on: sequence
%
! ------------------- Instance methods for dict_keyiterator
