Extension { #name : 'PyInstanceDict' }

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> ___keysList___ [
	"The keys as a list, in order -- what ``keys'' answered before it became a
	view, for the internal readers that want a sequence (__reversed__)."

	| pairs result |
	pairs := self @env0:___allPairs___.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result append: (self @env0:___pythonKeyFor___: (pairs @env0:at: i))
	].
	^ result

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> ___keySymbolFor___: key [
	"A namespace dict is backed by DYNAMIC INSTANCE VARIABLES, which are
	keyed by Symbol, so every key has to be a string.  CPython's instance
	and module dicts are ordinary dicts and accept any hashable key, so this
	is a representation limit of Grail's namespaces rather than a Python
	rule -- but it has to surface as a CATCHABLE TypeError.  Sending
	``asSymbol'' to a non-string raised ``a CustomStr does not understand
	#asSymbol'', a Smalltalk MNU that Python's ``except'' cannot catch and
	that can take the whole session down from inside a builtin callback
	(test_iter's test_reduce_mutating_builtins_iter reaches it with
	``builtins.__dict__[CustomStr('iter')] = ...'').  The message is
	CPython's own wording for a non-string name in a namespace."

	(key @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
		TypeError ___signal___: ('attribute name must be string, not '''
			@env0:, key @env0:class @env0:name @env0:asString @env0:, '''')].
	^ key @env0:asSymbol

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __contains__: key [
	^ (self @env0:___rawAt___: key) ~~ nil

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __copy__ [
	"copy.copy() of a __dict__: the same plain dict as copy()."

	^ self copy

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __deepcopy__: memo [
	"copy.deepcopy() of a __dict__: a deep copy of the plain dict copy()
	answers, which is what CPython's deepcopy of a real dict gives.

	Missing, deepcopy fell back to reduce-and-rebuild exactly as copy.copy()
	had: the rebuilt view had no instance behind it, the first store went to
	nil, and the ImproperOperation it raised is a Smalltalk error no Python
	``except'' sees.  pydantic's model_copy(deep=True) is
	``deepcopy(self.__dict__, memo=memo)'', so it took the whole process down
	(tests/test_main.py's test_model_construct_with_model_post_init_and_model_copy).

	The view is entered in memo as the result too, as _deepcopy_dict enters
	the dict it is building, so a value that refers back to the __dict__
	finds the copy rather than recursing."

	| copyMod result |
	copyMod := (importlib @env0:___instance___) @env1:import_module: 'copy'.
	result := (copyMod @env1:___pyAttrLoad___: #deepcopy)
		@env1:value: { self copy. memo } value: nil.
	(memo ~~ nil and: [memo ~~ None]) ifTrue: [
		memo @env1:__setitem__: (((Python @env0:at: #builtins) @env0:___instance___)
			@env1:id: self) _: result].
	^ result

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __eq__: other [
	"Compare by CONTENTS, as a mapping.

	``instance.__dict__'' is a real dict in CPython, so code compares it as
	one -- ``self.__dict__ == other.__dict__'' is the whole of __eq__ for
	several classes, and a copy or pickle round trip written that way could
	never pass while this view inherited object's IDENTITY equality: two
	instances with identical attributes compared unequal.

	Equal to any mapping with the same keys and equal values, not just to
	another PyInstanceDict, so ``obj.__dict__ == {'foo': 1}'' works too.
	Values compare with the Python == protocol, which honours a user __eq__."

	| otherKeys mySize |
	(other ___respondsTo___: #'keys') ifFalse: [^ NotImplemented].
	mySize := self __len__.
	otherKeys := [other keys] @env0:on: AbstractException do: [:e | e @env0:return: nil].
	otherKeys == nil ifTrue: [^ NotImplemented].
	(otherKeys @env0:size @env0:= mySize) ifFalse: [^ false].
	self @env0:keysAndValuesDo: [:k :v |
		| ov |
		ov := [other __getitem__: k @env0:asString]
			@env0:on: AbstractException do: [:e | e @env0:return: #'___absent___'].
		(ov @env0:== #'___absent___') ifTrue: [^ false].
		(v ___pyRichEqBool___: ov) ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __getitem__: key [
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		KeyError ___signal___: key
	].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __iter__ [
	"Iterating a dict yields its KEYS in Python (the values come from
	indexing).  Match by yielding the dict-keys list's iterator."

	^ dict_keyiterator ___on: (PyInstanceDictMapping @env0:___on: self)

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __len__ [
	^ self @env0:___allPairs___ @env0:size @env0:// 2

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __ne__: other [
	"Derived from __eq__ so the two never disagree."

	| r |
	r := self __eq__: other.
	(r @env0:== NotImplemented) ifTrue: [^ r].
	^ r @env0:not

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __repr__ [
	"Match Python's dict.__repr__ shape — sufficient for debugging."

	| stream first |
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: '{'.
	first := true.
	self @env0:keysAndValuesDo: [:k :v |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		first := false.
		"NO cascade here: a cascade continuation after an @env0: send is
		compiled in the METHOD's environment (env-1) and MNUs on the
		kernel WriteStream."
		stream @env0:nextPutAll: (k __repr__ @env0:___reprResult___) @env0:asString.
		stream @env0:nextPutAll: ': '.
		stream @env0:nextPutAll: (v __repr__ @env0:___reprResult___) @env0:asString
	].
	stream @env0:nextPutAll: '}'.
	^ stream @env0:contents

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __reversed__ [
	"reversed(d) -- keys in reverse insertion order.  Reuse ``keys'' (which
	exposes the dynamic-instVar Symbols as Python ``str''s) so reverse
	iteration yields the SAME string keys as forward ``keys''/``__iter__'';
	collecting raw keysAndValuesDo: keys here would leak Symbols
	(test_dict test_reverse_iterator_for_shared_shared_dicts: reversed(__dict__)
	== ['y', 'x'])."

	^ (self ___keysList___ @env0:reverse) __iter__

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> __setitem__: key _: value [
	"A NON-STRING key is stored rather than refused.  ``inst.__dict__[0] = 1'' is
	legal Python -- CPython's instance dict is an ordinary dict -- and it used to
	raise the TypeError that belongs to a non-string ATTRIBUTE NAME, which is a
	different thing: ``setattr(inst, 0, 1)'' is the one CPython rejects, with that
	message.  See ___overflowSlot___."

	self @env0:___rawAt___: key put: value.
	^ value

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> _update: positional kw: kwargs [
	"``d.update([E], **F)'' -- the varargs form dict has.  A module's or an
	instance's __dict__ had only the one-argument update:, so
	``mod.__dict__.update(__name__=..., __file__=...)'' -- runpy's _run_code,
	on every run_path -- raised ``update() takes a different number of
	arguments''.  E first, then the keywords, as dict does."

	positional @env0:size @env0:> 1 ifTrue: [
		^ TypeError ___signal___: 'update expected at most 1 argument, got '
			@env0:, positional @env0:size @env0:printString].
	positional @env0:isEmpty ifFalse: [self update: (positional @env0:at: 1)].
	(kwargs @env0:isNil not and: [kwargs @env0:isEmpty not]) ifTrue: [
		kwargs @env0:keysAndValuesDo: [:key :value |
			(key @env0:isKindOf: CharacterCollection) ifFalse: [
				TypeError ___signal___: 'keywords must be strings'].
			self @env0:___rawAt___: key @env0:asString put: value]].
	^ None

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> clear [
	"Python ``dict.clear()'' — remove every dynamic instVar from the
	source instance (django's LazyObject.__setattr__ resets state with
	``self.__dict__.clear()'')."

	"Drops the overflow WHOLESALE rather than key by key, and drops it by removing
	the reserved slot: ___allPairs___ hides that slot on purpose, so iterating the
	merged keys and calling removeDynamicInstVar: on each would have handed a
	non-string key to a primitive that requires a Symbol."
	| pairs |
	pairs := self @env0:___allPairs___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		(self @env0:___isNamespaceStringKey___: (pairs @env0:at: i)) ifTrue: [
			self @env0:___slotOrDynamicRemove___: (pairs @env0:at: i)]
	].
	(self @env0:___overflow___) @env0:ifNotNil: [:d |
		source @env0:removeDynamicInstVar: self @env0:___overflowSlot___].
	^ None

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> copy [
	"``obj.__dict__.copy()'' -- a plain dict of the instance's attributes, as
	CPython answers (its __dict__ IS a dict).  Missing, so copy.copy() of a
	__dict__ fell back to reduce-and-rebuild and failed storing on nil -- which
	is how pydantic's model_copy() died (docs/Support_Pydantic.md, Phase 5)."

	| d |
	d := (Python @env0:at: #dict) @env0:new.
	self @env0:keysAndValuesDo: [:k :v | d @env1:__setitem__: (self @env0:___pythonKeyFor___: k) _: v].
	^ d

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> get: key [
	^ self get: key _: None

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> get: key _: default [
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [^ default].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> items [
	"A live dict_items view -- see ``keys''."

	^ dict_items ___on: (PyInstanceDictMapping @env0:___on: self)

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> keys [
	"Python ``dict.keys()'' -- a LIVE dict_keys view, as CPython answers.

	These three were snapshot lists, so iterating one while the instance
	changed could not notice.  CPython raises ``dictionary changed size during
	iteration'', and Element's deepcopy relies on it: copy.deepcopy walks the
	instance's __dict__ with ``for key, value in x.items()'', and a child whose
	__deepcopy__ clears the root adds keys underneath it (test_xml_etree's
	BadElementTest.test_deepcopy_clear).  The views share dict's own view and
	iterator classes over PyInstanceDictMapping, which yields the keys as
	Python sees them (a str, not the stored Symbol) and reports the live size
	the iterators check."

	^ dict_keys ___on: (PyInstanceDictMapping @env0:___on: self)

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> pop: key [
	"Python ``dict.pop(k)'' — remove and return; KeyError when absent."

	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		KeyError ___signal___: key
	].
	self @env0:___rawRemoveKey___: key.
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> pop: key _: default [
	"Python ``dict.pop(k, default)'' — remove and return, or default."

	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [^ default].
	self @env0:___rawRemoveKey___: key.
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> setdefault: key [
	^ self setdefault: key _: None

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> setdefault: key _: default [
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		self @env0:___rawAt___: key put: default.
		^ default
	].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> update: other [
	"Copy entries from another mapping into the source instance's
	dynamic-instVar storage.  Accepts a dict / PyInstanceDict / any
	object with keysAndValuesDo: (the Smalltalk-side iteration
	protocol that both classes implement).  Symbol- or String-keyed
	input is normalised to Symbol before storing — instances use
	Symbol keys for dynamicInstVarAt: regardless of caller convention."

	| scratch |
	((other @env0:isKindOf: KeyValueDictionary) or: [other @env0:isKindOf: PyInstanceDict]) ifFalse: [
		"A user mapping or an iterable of pairs: let dict's update: do the
		CPython dispatch (keys() + __getitem__, else pairs, else TypeError)
		into a scratch dict, then copy that in."
		scratch := dict ___new___.
		scratch update: other.
		^ self update: scratch].
	other @env0:keysAndValuesDo: [:k :v |
		self @env0:___rawAt___: k put: v
	].
	^ None

]

{ #category : 'Grail-Python-Protocol' }
PyInstanceDict >> values [
	"A live dict_values view -- see ``keys''."

	^ dict_values ___on: (PyInstanceDictMapping @env0:___on: self)

]
