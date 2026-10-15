Extension { #name : 'functools_CacheInfo' }

{ #category : 'Grail-Instantiation' }
functools_CacheInfo class >> hits: h misses: m maxsize: x currsize: c [
	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #hits put: h.
	inst @env0:dynamicInstVarAt: #misses put: m.
	inst @env0:dynamicInstVarAt: #maxsize put: x.
	inst @env0:dynamicInstVarAt: #currsize put: c.
	^ inst

]

{ #category : 'Grail-Instantiation' }
functools_CacheInfo class >> value: positional value: keywords [
	"_CacheInfo(hits, misses, maxsize, currsize) -- accepts positional
	OR keyword arguments (test code builds it with keywords)."

	| pick |
	pick := [:idx :key |
		(positional ~~ nil and: [positional @env0:size @env0:>= idx])
			ifTrue: [positional @env0:at: idx]
			ifFalse: [(keywords ~~ nil and: [keywords @env0:includesKey: key])
				ifTrue: [keywords @env0:at: key]
				ifFalse: [None]]].
	^ self
		hits: (pick @env0:value: 1 value: 'hits')
		misses: (pick @env0:value: 2 value: 'misses')
		maxsize: (pick @env0:value: 3 value: 'maxsize')
		currsize: (pick @env0:value: 4 value: 'currsize')

]

{ #category : 'Grail-Sequence' }
functools_CacheInfo >> ___asArray___ [
	^ { self @env0:dynamicInstVarAt: #hits.
		self @env0:dynamicInstVarAt: #misses.
		self @env0:dynamicInstVarAt: #maxsize.
		self @env0:dynamicInstVarAt: #currsize }

]

{ #category : 'Grail-Comparison' }
functools_CacheInfo >> __eq__: other [
	"Field-wise equality.  A namedtuple compares equal to another
	namedtuple (or plain tuple) with the same element values; compare
	element-by-element via the Python __eq__ so None/int match."

	| mine theirs |
	mine := self ___asArray___.
	theirs := (other isKindOf: functools_CacheInfo)
		ifTrue: [other ___asArray___]
		ifFalse: [(other isKindOf: SequenceableCollection)
			ifTrue: [other @env0:asArray]
			ifFalse: [^ false]].
	mine @env0:size @env0:= theirs @env0:size ifFalse: [^ false].
	1 @env0:to: mine @env0:size do: [:i |
		((mine @env0:at: i) __eq__: (theirs @env0:at: i)) == true
			ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Sequence' }
functools_CacheInfo >> __getitem__: idx [
	"Namedtuples index like tuples: 0-based, negative from the end, slices, and
	IndexError past the end.  It used to answer the kernel's raw OffsetError
	there, which nothing in Python can catch -- so the legacy sequence
	iterator, which stops on IndexError, never stopped: list(cache_info())
	died, and so did ``hits, misses, maxsize, currsize = f.cache_info()'' once
	unpacking asked for the one value past the targets that CPython asks for
	(test_functools' test_lru)."

	^ (tuple @env0:withAll: self ___asArray___) __getitem__: idx

]

{ #category : 'Grail-Hashing' }
functools_CacheInfo >> __hash__ [
	"CacheInfo is a namedtuple, so CPython hashes it as a TUPLE of its fields --
	equal CacheInfos hash equal and one works as a dict key.  Grail defined
	field-wise __eq__ with no __hash__, so it kept object's identity hash and
	two equal CacheInfos hashed differently.

	Delegating to a real tuple keeps this in step with tuple >> __hash__ for
	free, including the TypeError an unhashable field would raise."

	^ (tuple @env0:withAll: self ___asArray___) __hash__

]

{ #category : 'Grail-Sequence' }
functools_CacheInfo >> __iter__ [
	"Iterate the four fields, as the tuple CPython's _CacheInfo is."

	^ (tuple @env0:withAll: self ___asArray___) __iter__

]

{ #category : 'Grail-Sequence' }
functools_CacheInfo >> __len__ [
	^ 4

]

{ #category : 'Grail-Comparison' }
functools_CacheInfo >> __ne__: other [
	^ (self __eq__: other) @env0:not

]

{ #category : 'Grail-String Representation' }
functools_CacheInfo >> __repr__ [
	^ 'CacheInfo(hits=' @env0:, (self @env0:dynamicInstVarAt: #hits) __repr__ @env0:asString
		@env0:, ', misses=' @env0:, (self @env0:dynamicInstVarAt: #misses) __repr__ @env0:asString
		@env0:, ', maxsize=' @env0:, (self @env0:dynamicInstVarAt: #maxsize) __repr__ @env0:asString
		@env0:, ', currsize=' @env0:, (self @env0:dynamicInstVarAt: #currsize) __repr__ @env0:asString
		@env0:, ')'

]

{ #category : 'Grail-Accessors' }
functools_CacheInfo >> currsize [
	^ self @env0:dynamicInstVarAt: #currsize

]

{ #category : 'Grail-Accessors' }
functools_CacheInfo >> hits [
	^ self @env0:dynamicInstVarAt: #hits

]

{ #category : 'Grail-Accessors' }
functools_CacheInfo >> maxsize [
	^ self @env0:dynamicInstVarAt: #maxsize

]

{ #category : 'Grail-Accessors' }
functools_CacheInfo >> misses [
	^ self @env0:dynamicInstVarAt: #misses

]
