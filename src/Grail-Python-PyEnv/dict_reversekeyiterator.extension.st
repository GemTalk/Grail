Extension { #name : 'dict_reversekeyiterator' }

{ #category : 'Grail-Iterator Protocol' }
dict_reversekeyiterator >> __class__ [
	^ self @env0:class

]

{ #category : 'Grail-Iterator Protocol' }
dict_reversekeyiterator >> __iter__ [
	^ self

]

{ #category : 'Grail-Iterator Protocol' }
dict_reversekeyiterator >> __length_hint__ [
	"dictiter_len: the items still expected, while the dict keeps its size."

	(dict @env0:~~ nil @env0:and: [used @env0:= dict @env0:size]) ifTrue: [^ len].
	^ 0

]

{ #category : 'Grail-Iterator Protocol' }
dict_reversekeyiterator >> __next__ [
	| key |
	key := self @env0:___step___.
	key @env0:== nil ifTrue: [^ StopIteration @env0:signal].
	^ self @env0:___produce___: key

]

{ #category : 'Grail-Pickling' }
dict_reversekeyiterator >> __reduce__ [
	"dictiter_reduce: iter() over a list of what a copy of this iterator would
	still yield, so this one is not advanced."

	| copy remaining key |
	copy := self @env0:___copyState___.
	remaining := list ___new___.
	[(key := copy @env0:___step___) @env0:== nil] @env0:whileFalse: [
		remaining append: (copy @env0:___produce___: key)].
	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'iter'.
		tuple @env0:withAll: { remaining } }

]
