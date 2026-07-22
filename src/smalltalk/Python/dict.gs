! ===============================================================================
! dict Methods (Python 'dict' type - mutable mapping)
! ===============================================================================
! This file contains Python method implementations for the dict class.
! dict is mapped to GemStone's KeyValueDictionary class.
!
! dict is a mutable mapping type that maps hashable keys to arbitrary values.
! Dictionaries preserve insertion order (as of Python 3.7).
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from dict
expectvalue /Metaclass3
doit
dict removeAllMethods: 1.
dict class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Hashing'
method: dict
__hash__
	"Dicts are mutable and therefore unhashable (matches CPython)."

	TypeError ___signal___: 'unhashable type: ''dict'''
%

category: 'Grail-Initialization'
classmethod: dict
__new__
	"dict() — create an empty dict. Receiver is the class."

	^ self ___new___
%

category: 'Grail-Initialization'
classmethod: dict
__new__: source
	"dict(source) — create a dict from another mapping or from an
	iterable of (key, value) pairs. Receiver is the class.

	If `source` is a mapping (responds to `keys` / `__getitem__`), copy
	its entries. Otherwise treat it as an iterable of 2-element
	sequences."

	| result iter done keysMethod keysIter k |
	result := self ___new___.

	"Mapping fast path: source is a dict (or KeyValueDictionary)"
	(source isKindOf: KeyValueDictionary) ifTrue: [
		source @env0:keysAndValuesDo: [:_k :_v |
			result @env0:at: _k put: _v
		].
		^ result
	].

	"Python mapping protocol: source has a ``keys`` method.  Iterate
	keys and copy each via ``__getitem__``.  Catches collections.
	ChainMap, OrderedDict subclasses, and any user mapping that
	exposes ``keys`` + ``__getitem__`` (jinja2's render path passes
	a ChainMap through ``dict(globals, **{})``)."
	keysMethod := [source keys] @env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noKeys__].
	keysMethod == #__noKeys__ ifFalse: [
		keysIter := keysMethod __iter__.
		done := false.
		[done] @env0:whileFalse: [
			[
				k := keysIter __next__.
				result @env0:at: k put: (source __getitem__: k).
			] @env0:on: StopIteration do: [:ex | done := true].
		].
		^ result
	].

	"Iterable of 2-element sequences"
	iter := source __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| pair |
			pair := iter __next__.
			(pair @env0:size @env0:= 2) ifFalse: [
				ValueError ___signal___:
					'dictionary update sequence element has wrong length'
			].
			result @env0:at: (pair @env0:at: 1) put: (pair @env0:at: 2)
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: dict
fromkeys: iterable
	"dict.fromkeys(iterable) — return a new dict with keys from
	iterable, each mapped to None.  Used by re._parser to dedupe
	a list while preserving insertion order (`list(dict.fromkeys(xs))`)."

	^ self fromkeys: iterable _: None
%

category: 'Grail-Initialization'
classmethod: dict
fromkeys: iterable _: value
	"dict.fromkeys(iterable, value) — return a new dict with keys
	from iterable, each mapped to ``value``."

	| result iter done |
	result := self ___new___.
	"A string yields its 1-character SUBSTRINGS as keys, not Smalltalk
	 Characters (CPython quirk: dict.fromkeys('abc') == {'a':v,'b':v,'c':v})."
	(iterable isKindOf: CharacterCollection) ifTrue: [
		1 @env0:to: iterable @env0:size do: [:i |
			| s |
			s := Unicode7 ___new___: 1.
			s @env0:at: 1 put: (iterable @env0:at: i).
			result @env0:at: s put: value
		].
		^ result
	].
	(iterable isKindOf: SequenceableCollection) ifTrue: [
		1 @env0:to: iterable @env0:size do: [:i |
			result @env0:at: (iterable @env0:at: i) put: value
		].
		^ result
	].
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[result @env0:at: iter __next__ put: value]
			@env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Initialization'
classmethod: dict
_new: positional kw: keywords
	"dict(**kwargs) and dict(source, **kwargs) varargs entry point.
	Builds a dict from any positional source plus keyword overrides.
	Used by the class-call varargs fast path when keyword arguments
	are passed (e.g. `dict(a=1, b=2)`).

	Per CPython, the resulting dict's keys are Python ``str''s — even
	though CallAst's varargs codegen builds the kwargs IdentityKeyValueDictionary
	with Symbol keys for fast Smalltalk-side lookup, the dict() boundary
	converts those to Strings so subsequent Python-level
	``dict[key]'' / ``key in dict'' lookups by string literal match
	(jinja2's render-context lookup is exactly this shape)."

	| result |
	(positional @env0:size @env0:> 1) ifTrue: [
		TypeError ___signal___: 'dict expected at most 1 positional argument'
	].
	result := positional @env0:isEmpty
		ifTrue: [self ___new___]
		ifFalse: [self __new__: (positional @env0:at: 1)].
	keywords ifNotNil: [
		keywords @env0:keysAndValuesDo: [:k :v |
			"CPython: ``dict(**mapping)'' requires string keys -- a non-string
			key (dict(**{1:2})) is a TypeError, not silently stringified
			(test_invalid_keyword_arguments).  Symbols (the normal a=1 kwarg
			carrier) and Strings are both CharacterCollections."
			(k @env0:isKindOf: CharacterCollection) ifFalse: [
				TypeError ___signal___: 'keywords must be strings'].
			result @env0:at: k @env0:asString put: v
		]
	].
	^ result
%

category: 'Grail-Generics'
classmethod: dict
__getitem__: item
	"`dict[K, V]` is a parameterized type alias.  Python's
	``dict.__class_getitem__`` returns a ``types.GenericAlias``
	wrapping ``dict`` with the type args, but for our purposes
	(class-statement bases, runtime annotation evaluation) the
	origin class is sufficient — code that subscripts a built-in
	collection at runtime is doing so for typing scaffolding, not
	for actual element lookup.  Returning the class lets
	``class Namespace(dict[str, Foo]):`` inherit from dict cleanly."

	^ self
%

category: 'Grail-Type'
method: dict
__class__
	"Return the Python type for dict"
	^ dict
%

category: 'Grail-Initialization'
method: dict
__init__
	"0-arg dict initializer — receiver is already empty; nothing
	to do.  Provided so user subclasses calling ``super().__init__()''
	via the ``Super'' proxy find a parent method on dict's chain."
	^ None
%

category: 'Grail-Initialization'
method: dict
__init__: source
	"1-arg dict initializer — populate self from ``source''.
	Mirrors CPython ``dict.__init__(other)'' which copies entries
	from a mapping (anything with ``items()'') or an iterable of
	(key, value) pairs.  Provided so user subclasses that call
	``super().__init__(defaults)'' (e.g. flask.config.Config) get
	the source-copy behaviour instead of bouncing off the
	``no parent method __init__'' miss."

	source == nil ifTrue: [^ None].
	source == None ifTrue: [^ None].
	(source isKindOf: KeyValueDictionary) ifTrue: [
		source @env0:keysAndValuesDo: [:_k :_v |
			self @env0:at: _k put: _v].
		^ None].
	"Mapping protocol: iterate keys + index by [k]."
	((source @env0:class @env0:whichClassIncludesSelector: #'keys' environmentId: 1) notNil) ifTrue: [
		(source keys) @env0:do: [:k |
			self @env0:at: k put: (source __getitem__: k)].
		^ None].
	"Iterable of (k, v) pairs — fall back to plain do."
	source @env0:do: [:pair |
		self @env0:at: (pair @env0:at: 1) put: (pair @env0:at: 2)].
	^ None
%

category: 'Grail-Initialization'
method: dict
___init__: positional kw: keywords
	"Varargs dict.__init__ -- the form the Super resolver picks for
	``super().__init__(*args, **kwargs)'' from a dict subclass when the
	call carries keyword args (Super>>pickMethod prefers the
	``___init__:kw:'' varargs selector over the fixed ``__init__''/
	``__init__:'' forms precisely when kwOk is false).  A dict subclass
	whose own __init__ chains up with kwargs
	(``super().__init__(**kw)'') reached the 0-arg ``__init__'' before
	and silently dropped them.  Populates self in place.

	The no-kwargs paths are unaffected: super().__init__() resolves to
	the 0-arg ``__init__'' and super().__init__(source) to the 1-arg
	``__init__:'' (both preferred over this varargs form when kwOk is
	true), so flask.config.Config's ``super().__init__(defaults)''
	keeps its existing dispatch."

	^ self ___initFrom___: positional kw: keywords
%

category: 'Grail-Initialization'
method: dict
___initFrom___: positional kw: keywords
	"Populate self IN PLACE from an optional positional mapping/iterable
	plus keyword args -- the in-place equivalent of dict's constructor.
	A dict SUBCLASS that does not override __init__ is instantiated by
	ClassDefAst-emitted code that allocates an empty instance and calls
	this, matching CPython where the inherited dict.__init__ populates
	(dict.__new__ allocates empty, __init__ fills).  Reuses dict class
	>> __new__: for the mapping/iterable-of-pairs handling, then applies
	the keyword overrides with str keys (the dict() boundary rule)."

	(positional @env0:size @env0:> 1) ifTrue: [
		TypeError ___signal___: 'dict expected at most 1 positional argument'].
	positional @env0:isEmpty ifFalse: [
		(dict __new__: (positional @env0:at: 1)) @env0:keysAndValuesDo: [:k :v |
			self @env0:at: k put: v]].
	keywords ifNotNil: [
		keywords @env0:keysAndValuesDo: [:k :v |
			self @env0:at: k @env0:asString put: v]].
	^ self
%

category: 'Grail-Collection Protocol'
method: dict
__contains__: key
	"Return True if key is in the dictionary, else False.  An unhashable key
	can never be present; CPython raises TypeError (checked only on the miss
	path so a present key stays fast)."
	(self @env0:includesKey: key) ifTrue: [^ true].
	key ___requireHashableAsDictKey___.
	^ false
%

category: 'Grail-Subscript Protocol'
method: dict
__delitem__: key
	"Remove d[key] from dictionary. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		KeyError ___signal___: key
	].
	self @env0:removeKey: key
%

category: 'Grail-Comparison'
method: dict
__eq__: other
	"Return True if dictionaries have the same (key, value) pairs"

	| mySize otherSize |
	"Accept EVERY KeyValueDictionary, not just the PyDict subclass: Grail
	hands plain KVDs to Python from many places (globals(), a module's
	__dict__, C-shim results, dicts committed before the PyDict flip).  A
	Python dict must compare equal to any of them by contents -- exactly
	what this guard meant when ``dict'' was itself KeyValueDictionary."
	(other isKindOf: KeyValueDictionary) ifFalse: [
		^ false
	].
	
	mySize := self @env0:size.
	otherSize := other @env0:size.
	(mySize @env0:= otherSize) ifFalse: [
		^ false
	].
	
	self @env0:keysAndValuesDo: [:key :value |
		| otherHasKey otherValue |
		otherHasKey := other @env0:includesKey: key.
		otherHasKey ifFalse: [
			^ false
		].
		otherValue := other @env0:at: key.
		(value __eq__: otherValue) ifFalse: [
			^ false
		]
	].
	
	^ true
%

category: 'Grail-Subscript Protocol'
method: dict
__getitem__: key
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		key ___requireHashableAsDictKey___.
		"__missing__ protocol: a dict SUBCLASS may define __missing__(key) to
		supply/raise for absent keys (base dict has none).  An instance-var
		__missing__ is (correctly) ignored -- this is a method-dict lookup."
		(self @env0:class @env0:whichClassIncludesSelector: #'__missing__:' environmentId: 1) notNil
			ifTrue: [^ self __missing__: key].
		KeyError ___signal___: key
	].
	^ self @env0:at: key
%

category: 'Grail-Iterator Protocol'
method: dict
__iter__
	"Return an iterator over the keys of the dictionary"
	^ dict_keyiterator ___on: self
%

category: 'Grail-Collection Protocol'
method: dict
__len__
	"Return the number of items in the dictionary"
	^ self @env0:size
%

category: 'Grail-Comparison'
method: dict
__ne__: other
	"Return True if dictionaries do not have the same (key, value) pairs"
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Merge Operators'
method: dict
__or__: other
	"PEP 584 ``self | other'' — a new dict with other's entries merged over
	self's (other wins on key conflicts).  Only mappings merge; a non-mapping
	yields NotImplemented (so the ``|'' operator raises TypeError, but a direct
	``d.__or__(x)'' answers NotImplemented, per test_dict.test_merge_operator)."

	| result |
	(other isKindOf: AbstractDictionary) ifFalse: [
		^ Python @env0:at: #'NotImplemented' otherwise: nil].
	result := dict ___new___.
	result update: self.
	result update: other.
	^ result
%

category: 'Grail-Merge Operators'
method: dict
__ror__: other
	"PEP 584 reflected merge ``other | self'' — self wins on conflicts."

	| result |
	(other isKindOf: AbstractDictionary) ifFalse: [
		^ Python @env0:at: #'NotImplemented' otherwise: nil].
	result := dict ___new___.
	result update: other.
	result update: self.
	^ result
%

category: 'Grail-Merge Operators'
method: dict
__ior__: other
	"PEP 584 in-place merge ``self |= other'' — like update(), accepts a
	mapping OR an iterable of key/value pairs; returns self."

	self update: other.
	^ self
%

category: 'Grail-String Representation'
method: dict
__repr__
	"Return a string representation of the dictionary"

	| stream isEmpty seen |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [
		^ '{}'
	].
	"Cycle + depth guard -- shared #GrailReprSeen set with list/tuple
	(a self-referential dict prints '{...}'; 200k-deep nesting raises
	the catchable RecursionError before the real stack overflows)."
	seen := SessionTemps @env0:current @env0:at: #GrailReprSeen otherwise: nil.
	seen @env0:isNil ifTrue: [
		seen := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailReprSeen put: seen].
	(seen @env0:includes: self) ifTrue: [^ '{...}'].
	seen @env0:size @env0:> 200 ifTrue: [
		RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object'].
	seen @env0:add: self.

	^ [[stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '{'.

	self @env0:keysAndValuesDo: [:key :value |
		| keyRepr valueRepr |
		keyRepr := key __repr__.
		valueRepr := value __repr__.
		stream @env0:nextPutAll: keyRepr.
		stream @env0:nextPutAll: ': '.
		stream @env0:nextPutAll: valueRepr.
		stream @env0:nextPutAll: ', '
	].

	"Remove the trailing ', '"
	stream @env0:skip: -2.
	stream @env0:nextPutAll: '}'.

	stream @env0:contents]
		@env0:on: AlmostOutOfStack do: [:ex |
			"A default gem's stack (GEM_MAX_SMALLTALK_STACK_DEPTH 1000)
			overflows before the seen-size guard fires -- convert the
			resumable notification into CPython's RecursionError."
			RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]
%

category: 'Grail-Subscript Protocol'
method: dict
__setitem__: key _: value
	"Set d[key] to value"
	key ___requireHashableAsDictKey___.
	self @env0:at: key put: value.
	^ None
%

category: 'Grail-Mutation Methods'
method: dict
clear
	"Remove all items from the dictionary"
	self @env0:removeAllKeys: (self @env0:keys)
%

category: 'Grail-Mutation Methods'
method: dict
copy
	"Return a shallow copy of the dictionary"
	^ self @env0:copy
%

category: 'Grail-Access Methods'
method: dict
get: key
	"Return the value for key if key is in the dictionary, else None"
	^ self get: key _: None
%

category: 'Grail-Access Methods'
method: dict
get: key _: default
	"Return the value for key if key is in the dictionary, else default"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [key ___requireHashableAsDictKey___].
	hasKey ifTrue: [
		^ self @env0:at: key
	].
	^ default
%

category: 'Grail-View Methods'
method: dict
items
	"Return a live view of the dictionary's (key, value) pairs (a dict_items,
	set-like, repr'd as ``dict_items([...])'')."

	^ dict_items ___on: self
%

category: 'Grail-View Methods'
method: dict
keys
	"Return a live view of the dictionary's keys (a dict_keys, set-like,
	repr'd as ``dict_keys([...])'')."

	^ dict_keys ___on: self
%

category: 'Grail-Mutation Methods'
method: dict
pop: key
	"If key is in the dictionary, remove it and return its value, else raise KeyError"

	| hasKey value |
	hasKey := self @env0:includesKey: key.
	hasKey ifFalse: [
		key ___requireHashableAsDictKey___.
		KeyError ___signal___: key
	].
		value := self @env0:at: key.
	self @env0:removeKey: key.
	^ value
%

category: 'Grail-Mutation Methods'
method: dict
pop: key _: default
	"If key is in the dictionary, remove it and return its value, else
	return default.

	GRAIL: also try the symbol form of the key — kwargs dicts built
	from Smalltalk-side ``__init__:kw:`` callers store keys as
	Symbols, but Python source calling ``kwargs.pop('name', default)``
	passes a String.  Symbol = String for human eyes but distinct
	OOPs for identity-keyed dictionaries."

	| value |
	(self @env0:includesKey: key) ifTrue: [
		value := self @env0:at: key.
		self @env0:removeKey: key.
		^ value
	].
	((key isKindOf: String) and: [self @env0:includesKey: key @env0:asSymbol])
		ifTrue: [
			value := self @env0:at: key @env0:asSymbol.
			self @env0:removeKey: key @env0:asSymbol.
			^ value
		].
	^ default
%

category: 'Grail-Mutation Methods'
method: dict
popitem
	"Remove and return a (key, value) pair from the dictionary in LIFO order.
	Raises KeyError if the dictionary is empty"

	| isEmpty lastKey lastValue pair |
	isEmpty := self @env0:isEmpty.
	isEmpty ifTrue: [
		KeyError ___signal___: 'popitem(): dictionary is empty'
	].

	lastKey := nil.
	lastValue := nil.
	self @env0:keysAndValuesDo: [:key :value |
		lastKey := key.
		lastValue := value
	].

	self @env0:removeKey: lastKey.
	pair := tuple @env0:with: lastKey with: lastValue.
	^ pair
%

category: 'Grail-Mutation Methods'
method: dict
setdefault: key
	"If key is in the dictionary, return its value. If not, insert key with value None and return None"
	^ self setdefault: key _: None
%

category: 'Grail-Mutation Methods'
method: dict
setdefault: key _: default
	"If key is in the dictionary, return its value. If not, insert key with value default and return default"

	| hasKey |
	hasKey := self @env0:includesKey: key.
	hasKey ifTrue: [
		^ self @env0:at: key
	].
	key ___requireHashableAsDictKey___.
	self @env0:at: key put: default.
	^ default
%

category: 'Grail-Mutation Methods'
method: dict
update: other
	"Update the dictionary with key/value pairs from other, overwriting existing keys"

	| keysMethod keysIter iter done k idx |
	(other isKindOf: KeyValueDictionary) ifTrue: [
		other @env0:keysAndValuesDo: [:key :value |
			self @env0:at: key put: value].
		^ None].
	"Python mapping protocol: other exposes keys + __getitem__
	(PyInstanceDict, user mappings) -- mirrors ___fromMapping___."
	keysMethod := [other keys]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noKeys__].
	(keysMethod == #__noKeys__) ifFalse: [
		keysIter := keysMethod __iter__.
		done := false.
		[done] @env0:whileFalse: [
			[k := keysIter __next__.
			self @env0:at: k put: (other __getitem__: k)]
				@env0:on: StopIteration do: [:ex | done := true]].
		^ None].
	"Iterable of 2-element pairs, via the __iter__ protocol.  A plain
	do: here was an uncatchable MNU for d.update(None) / d.update(42)
	(test_dict, mapping_tests)."
	((other @env0:class
		@env0:whichClassIncludesSelector: #'__iter__' environmentId: 1) ~~ nil) ifFalse: [
		TypeError ___signal___: '''' @env0:, other @env0:class @env0:name @env0:asString
			@env0:, ''' object is not iterable'].
	iter := other __iter__.
	idx := 0.
	done := false.
	[done] @env0:whileFalse: [
		[| pair |
		pair := iter __next__.
		((pair isKindOf: SequenceableCollection)
			or: [(pair @env0:class
				@env0:whichClassIncludesSelector: #'__getitem__:' environmentId: 1) ~~ nil]) ifFalse: [
			TypeError ___signal___: 'cannot convert dictionary update sequence element #'
				@env0:, idx @env0:printString @env0:, ' to a sequence'].
		(pair __len__ @env0:= 2) ifFalse: [
			ValueError ___signal___: 'dictionary update sequence element #'
				@env0:, idx @env0:printString @env0:, ' has length '
				@env0:, pair __len__ @env0:printString @env0:, '; 2 is required'].
		self @env0:at: (pair __getitem__: 0) put: (pair __getitem__: 1).
		idx := idx @env0:+ 1]
			@env0:on: StopIteration do: [:ex | done := true]]
%

category: 'Grail-Mutation Methods'
method: dict
_update: positional kw: kwargs
	"Python ``dict.update([E], **F)'' varargs form — merge a positional
	mapping/iterable E (if given) and the keyword args F into self.  flask's
	``create_jinja_environment'' does ``rv.globals.update(url_for=...,
	get_flashed_messages=..., config=...)''."

	positional @env0:isEmpty ifFalse: [
		self update: (positional @env0:at: 1)
	].
	(kwargs @env0:isNil not and: [kwargs @env0:isEmpty not]) ifTrue: [
		kwargs @env0:keysAndValuesDo: [:key :value |
			"``d.update(**mapping)'' requires string keys; a non-string key
			(update(**{1:2})) is a TypeError (test_invalid_keyword_arguments)."
			(key @env0:isKindOf: CharacterCollection) ifFalse: [
				TypeError ___signal___: 'keywords must be strings'].
			self @env0:at: key @env0:asString put: value
		]
	].
	^ None
%

category: 'Grail-Python-Protocol'
method: dict
__reversed__
	"reversed(d) -- iterate keys in reverse insertion order.  GemStone's
	KeyValueDictionary is hash-ordered, so 'reverse' here is relative to
	whatever order keysDo: yields (same caveat as __iter__); the point
	is a working iterator instead of an uncatchable reverseDo: MNU."

	| ks |
	ks := OrderedCollection @env0:new.
	self @env0:keysDo: [:k | ks @env0:add: k].
	^ (ks @env0:reverse) __iter__
%

category: 'Grail-View Methods'
method: dict
values
	"Return a live view of the dictionary's values (a dict_values, repr'd as
	``dict_values([...])'')."

	^ dict_values ___on: self
%

set compile_env: 0
