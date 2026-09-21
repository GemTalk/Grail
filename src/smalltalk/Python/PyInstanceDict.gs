! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PyInstanceDict class definition
expectvalue /Class
doit
Object subclass: 'PyInstanceDict'
  instVarNames: #( source )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyInstanceDict comment:
'Live view of a PythonInstance''s dynamic-instVar storage as a
Python-style dict.  Returned by ``PythonInstance >> __dict__''.

Reads and writes flow through the underlying instance''s
dynamicInstVarAt: / dynamicInstVarAt:put: so mutations on the view
(``rv.__dict__.update(self.__dict__)'') are reflected on the
backing instance — a pre-existing snapshot-only implementation
silently dropped writes and tripped jinja2''s ``Frame.copy()'' /
``Symbols.copy()'' patterns that depend on this idiom for attribute
forwarding.

Instance variables:
* ``source`` — the PythonInstance this view wraps.
'
%

expectvalue /Class
doit
PyInstanceDict category: 'Grail-Modules'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyInstanceDict removeAllMethods.
PyInstanceDict class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyInstanceDict
on: aPythonInstance
	"Construct a live view bound to aPythonInstance.  Writes to the
	view land in the instance's dynamic-instVar storage."

	| inst |
	inst := self new.
	inst _setSource: aPythonInstance.
	^ inst
%

category: 'Grail-Private'
method: PyInstanceDict
_setSource: anInstance
	source := anInstance
%

category: 'Grail-Accessing'
method: PyInstanceDict
source
	^ source
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey
	"Smalltalk-side keyed read.  Raises if absent — match KeyValueDictionary."

	| val sym |
	sym := aKey asSymbol.
	val := self ___slotOrDynamicAt___: sym.
	val == nil ifTrue: [
		^ source _errorKeyNotFound: aKey
	].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey ifAbsent: aBlock
	"Smalltalk-side keyed read with fallback block."

	| val sym |
	sym := aKey asSymbol.
	val := self ___slotOrDynamicAt___: sym.
	val == nil ifTrue: [^ aBlock value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey put: aValue
	"Writes propagate to the source instance's dynamic-instVar storage (or its
	inferred slot)."

	self ___slotOrDynamicAt___: aKey asSymbol put: aValue.
	^ aValue
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___overflowSlot___
	"The reserved dynamic-instVar name holding this namespace's NON-STRING keys.

	A namespace dict is backed by dynamic instance variables, whose keys the VM
	requires to be Symbols -- so a string key is the only kind the backing store
	can hold.  CPython's instance and module dicts are ordinary dicts and take
	any hashable key: ``inst.__dict__[0] = 1'' and ``globals()[0] = 1'' are both
	legal, and test_traceback reaches the second one deliberately.

	Those keys go in a real dict parked in this one Symbol slot.  Nothing is lost
	by keeping them out of the attribute store: a non-string key is unreachable
	through attribute syntax in CPython too, because ``obj.x'' can only spell a
	string.  So this is not an approximation of the semantics -- it is the same
	split CPython makes, expressed in the storage Grail has.

	Hidden from every enumeration by ___allPairs___, which is the one place that
	reads the backing store."

	^ #'___nonStringNamespaceKeys___'
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___isNamespaceStringKey___: key
	"True when key can be a dynamic-instVar name -- i.e. when it is a string.

	A str SUBCLASS counts, as it must: CPython treats one as a string
	everywhere, and Grail's ``asSymbol'' already accepts it."

	^ key @env0:isKindOf: CharacterCollection
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___overflow___
	"The non-string-key dict, or nil when this namespace has none.

	Answers nil rather than an empty dict so the common case -- every namespace
	in the corpus -- costs one dynamic-instVar read and no allocation."

	^ source @env0:dynamicInstVarAt: self ___overflowSlot___
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___overflowCreate___
	"The non-string-key dict, made on first non-string write.

	A KeyValueDictionary, which is what Grail's ``dict'' IS -- so a non-string key
	hashes and compares exactly as it would in any other Python dict, rather than
	by some rule peculiar to namespaces."

	| d |
	d := self ___overflow___.
	d == nil ifTrue: [
		d := KeyValueDictionary @env0:new.
		source @env0:dynamicInstVarAt: self ___overflowSlot___ put: d].
	^ d
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___allPairs___
	"Every (key, value) pair in this namespace: the dynamic instVars first, then
	the non-string keys, as a flat Array of alternating key and value.

	THE ONE PLACE that reads the backing store, which is what makes the reserved
	overflow slot invisible -- ``keys'', ``__len__'', ``items'', ``__repr__'' and
	the rest each used to call ``dynamicInstVarPairs'' for themselves, so a slot
	hidden in one would have shown through the others.

	Keys come back as they are stored: Symbols from the instVar side, the original
	objects from the overflow.  Callers that hand keys to Python convert.

	ORDER: string keys in declaration order, then non-string keys.  CPython keeps
	one insertion order across both, so a namespace holding a mix reports them
	interleaved where Grail groups them.  Preserving that would mean a parallel
	order list for a case no test in the corpus depends on -- recorded here rather
	than approximated."

	| raw over result n |
	raw := source @env0:dynamicInstVarPairs.
	over := self ___overflow___.
	result := OrderedCollection @env0:new.
	"INFERRED slots (GRAIL_INFERRED_SLOTS) are ordinary instance attributes
	that happen to live in named instVars; they come first, in the class's
	first-assignment order -- see object >> ___pyInferredSlotPairs___."
	result @env0:addAll: source @env1:___pyInferredSlotPairs___.
	"ONE NAME, ONE ENTRY: a dynamic instVar whose name is a SET slot is a
	promotion leftover (a value stored per object before the class gave the
	name a position); the slot is the home the read answers from, so the
	dict lists the name once, with the slot's value
	(docs/Schema_Evolution_Design.md, cut 1)."
	n := 1.
	[n @env0:< raw @env0:size] @env0:whileTrue: [
		((raw @env0:at: n) @env0:== self ___overflowSlot___
			@env0:or: [self ___slotPairs___: result name: (raw @env0:at: n)]) ifFalse: [
			result @env0:add: (raw @env0:at: n);
				add: (raw @env0:at: n @env0:+ 1)].
		n := n @env0:+ 2].
	over @env0:ifNotNil: [:d |
		d @env0:keysAndValuesDo: [:k :v | result @env0:add: k; add: v]].
	^ result @env0:asArray
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___pythonKeyFor___: key
	"A stored key as Python should see it.

	A string key is stored as a SYMBOL and has to come back as a str; a non-string
	key comes back UNCHANGED.  ``asString''-ing the latter is the trap this method
	exists to close: it turns the int 0 into '0', which then passes an
	``isinstance(k, str)'' filter and reads as a name.  CPython's own suggestion
	machinery sifts a namespace exactly that way."

	^ (self ___isNamespaceStringKey___: key)
		ifTrue: [key asString]
		ifFalse: [key]
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___stringKeysDo___: aBlock
	"Every STRING key of this namespace, as its stored Symbol.  Overridden by
	PyModuleDict, whose string keys are not only dynamic instVars."

	| raw slots |
	slots := source @env1:___pyInferredSlotPairs___.
	1 to: slots size by: 2 do: [:i | aBlock value: (slots at: i)].
	raw := source dynamicInstVarPairs.
	"A dynamic name that is a SET slot is a promotion leftover, reported once,
	as the slot (see ___allPairs___)."
	1 to: raw size by: 2 do: [:i |
		((raw at: i) == self ___overflowSlot___
			or: [self ___slotPairs___: slots name: (raw at: i)]) ifFalse: [aBlock value: (raw at: i)]]
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___slotPairs___: pairs name: aSymbol
	"Whether aSymbol is one of the NAMES in pairs, a flat name/value Array as
	object >> ___pyInferredSlotPairs___ answers it (so only SET slots).  Used to
	report a name once when a dynamic instVar of the same name survives
	underneath a slot."

	1 to: pairs size by: 2 do: [:i | (pairs at: i) == aSymbol ifTrue: [^ true]].
	^ false
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___stringKeyEqualTo___: key
	"The existing STRING key that this non-string key compares EQUAL to, or nil.

	Two stores are not one hash table, and this is where the difference would
	show.  CPython's dict finds a slot by ``hash(key)'' then ``=='', so a key that
	merely IMITATES a string finds the string's slot -- and that is not a corner
	case, it is the idiom test_iter uses to swap out a builtin:

	    builtins.__dict__[CustomStr('iter')] = my_iter
	    del builtins.__dict__[CustomStr('iter')]

	where CustomStr is hashable and string-equal but is not a str.  Routed to the
	overflow on its own, that write would have added a SECOND entry and the delete
	would have raised KeyError while the real ``iter'' sat untouched.

	Only reached for a non-string key, which is rare, so the scan costs nothing on
	any path the corpus exercises.  Equality is asked through the PYTHON protocol
	and guarded: a key whose __eq__ raises is treated as equal to nothing, since a
	namespace lookup must not propagate an exception from a comparison it made on
	the caller's behalf."

	self ___stringKeysDo___: [:sym |
		([(key @env1:___cmpEq___: sym asString) == true]
			on: AbstractException do: [:ex | ex return: false])
				ifTrue: [^ sym]].
	^ nil
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___rawAt___: key
	"The value stored under key, or nil when absent -- from whichever of the two
	stores owns that kind of key.

	nil MEANS ABSENT here, as it does for dynamicInstVarAt: itself, and the
	overflow side is made to agree.  A Python None is a distinct object and stores
	fine; Smalltalk nil is never a legitimate namespace value."

	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ self ___slotOrDynamicAt___: key asSymbol].
	"A string-EQUAL key belongs to the string store; see ___stringKeyEqualTo___:."
	(self ___stringKeyEqualTo___: key) ifNotNil: [:sym |
		^ self ___slotOrDynamicAt___: sym].
	^ (self ___overflow___)
		ifNil: [nil]
		ifNotNil: [:d | d at: key otherwise: nil]
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___slotOrDynamicAt___: sym
	"A string key's value: the INFERRED slot when sym names one
	(GRAIL_INFERRED_SLOTS; nil when unset), else the dynamic instVar."

	| idx |
	idx := source @env1:___pyInferredSlotIndexFor___: sym.
	"An UNSET slot falls through to a per-object value of the same name (a
	promotion leftover), as the attribute read does."
	idx ~~ 0 ifTrue: [^ (source @env1:___pySlotAt___: idx) ifNil: [source dynamicInstVarAt: sym]].
	^ source dynamicInstVarAt: sym
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___slotOrDynamicAt___: sym put: value
	"Store under a string key: the INFERRED slot when sym names one, else the
	dynamic instVar -- so ``obj.__dict__['x'] = v'' and ``obj.x'' agree."

	| idx |
	idx := source @env1:___pyInferredSlotIndexFor___: sym.
	idx ~~ 0 ifTrue: [
		source @env1:___pySlotAt___: idx put: value.
		"One home per name: a promotion leftover is superseded."
		(source dynamicInstVarAt: sym) == nil ifFalse: [source removeDynamicInstVar: sym].
		^ value].
	^ source dynamicInstVarAt: sym put: value
%

category: 'Grail-Non-String Keys'
method: PyInstanceDict
___slotOrDynamicRemove___: sym
	"Remove a string key: an INFERRED slot is nilled (an instVar cannot be
	removed; nil is absent), a dynamic instVar is removed."

	| idx |
	idx := source @env1:___pyInferredSlotIndexFor___: sym.
	idx ~~ 0 ifTrue: [
		"Both homes: the slot is nilled and a promotion leftover goes with it."
		(source dynamicInstVarAt: sym) == nil ifFalse: [source removeDynamicInstVar: sym].
		^ source @env1:___pySlotAt___: idx put: nil].
	^ source removeDynamicInstVar: sym
%
category: 'Grail-Non-String Keys'
method: PyInstanceDict
___rawAt___: key put: value
	"Store value under key in whichever store takes that kind of key."

	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ self ___slotOrDynamicAt___: key asSymbol put: value].
	"Replacing through a string-EQUAL key keeps the ORIGINAL key, as a dict does."
	(self ___stringKeyEqualTo___: key) ifNotNil: [:sym |
		^ self ___slotOrDynamicAt___: sym put: value].
	^ (self ___overflowCreate___) at: key put: value
%
category: 'Grail-Non-String Keys'
method: PyInstanceDict
___rawRemoveKey___: key
	"Remove key from whichever store holds it.  Silent when absent, like the
	callers that have already established presence."

	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ self ___slotOrDynamicRemove___: key asSymbol].
	(self ___stringKeyEqualTo___: key) ifNotNil: [:sym |
		^ self ___slotOrDynamicRemove___: sym].
	(self ___overflow___) ifNotNil: [:d | d removeKey: key ifAbsent: [nil]]
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
includesKey: aKey
	"Non-string keys included: the Smalltalk-protocol probes back ``__contains__''
	and the builtins that walk a namespace, so a key the dict holds has to answer
	true through every one of them."

	(self ___isNamespaceStringKey___: aKey) ifFalse: [
		^ (self ___overflow___) ifNil: [false] ifNotNil: [:d | d includesKey: aKey]].
	^ (self ___slotOrDynamicAt___: aKey asSymbol) ~~ nil
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keysAndValuesDo: aBlock
	"Iterate (key, value) pairs in declaration order."

	| pairs |
	pairs := self ___allPairs___.
	1 to: pairs size by: 2 do: [:i |
		aBlock value: (pairs at: i)
			value: (pairs at: i + 1)
	]
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keys
	"Return the keys as an Array (Smalltalk-side iteration target)."

	| pairs result |
	pairs := self ___allPairs___.
	result := Array new: pairs size // 2.
	1 to: pairs size by: 2 do: [:i |
		result at: (i + 1) // 2 put: (pairs at: i)
	].
	^ result
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
size
	^ self ___allPairs___ size // 2
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
isEmpty
	^ self ___allPairs___ isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
notEmpty
	^ self ___allPairs___ notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__getitem__: key
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		KeyError ___signal___: key
	].
	^ val
%




category: 'Grail-Python-Protocol'
method: PyInstanceDict
___keySymbolFor___: key
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
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__setitem__: key _: value
	"A NON-STRING key is stored rather than refused.  ``inst.__dict__[0] = 1'' is
	legal Python -- CPython's instance dict is an ordinary dict -- and it used to
	raise the TypeError that belongs to a non-string ATTRIBUTE NAME, which is a
	different thing: ``setattr(inst, 0, 1)'' is the one CPython rejects, with that
	message.  See ___overflowSlot___."

	self @env0:___rawAt___: key put: value.
	^ value
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__contains__: key
	^ (self @env0:___rawAt___: key) ~~ nil
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__len__
	^ self @env0:___allPairs___ @env0:size @env0:// 2
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__eq__: other
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
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__ne__: other
	"Derived from __eq__ so the two never disagree."

	| r |
	r := self __eq__: other.
	(r @env0:== NotImplemented) ifTrue: [^ r].
	^ r @env0:not
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key
	^ self get: key _: None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key _: default
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [^ default].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
keys
	"Python ``dict.keys()'' — return a list of String keys (the
	dynamic-instVar keys are Symbols; we expose them as Python
	``str''s)."

	| pairs result |
	pairs := self @env0:___allPairs___.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result append: (self @env0:___pythonKeyFor___: (pairs @env0:at: i))
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
values
	| pairs result |
	pairs := self @env0:___allPairs___.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result append: (pairs @env0:at: i @env0:+ 1)
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
items
	"Return a list of (key, value) tuples — matches CPython
	``dict.items()'' enough for the ``for k, v in d.items()'' idiom."

	| pairs result |
	pairs := self @env0:___allPairs___.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result append: (tuple @env0:withAll:
			{ self @env0:___pythonKeyFor___: (pairs @env0:at: i).
			  (pairs @env0:at: i @env0:+ 1) })
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
update: other
	"Copy entries from another mapping into the source instance's
	dynamic-instVar storage.  Accepts a dict / PyInstanceDict / any
	object with keysAndValuesDo: (the Smalltalk-side iteration
	protocol that both classes implement).  Symbol- or String-keyed
	input is normalised to Symbol before storing — instances use
	Symbol keys for dynamicInstVarAt: regardless of caller convention."

	other @env0:keysAndValuesDo: [:k :v |
		self @env0:___rawAt___: k put: v
	]
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
clear
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
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
pop: key
	"Python ``dict.pop(k)'' — remove and return; KeyError when absent."

	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		KeyError ___signal___: key
	].
	self @env0:___rawRemoveKey___: key.
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
pop: key _: default
	"Python ``dict.pop(k, default)'' — remove and return, or default."

	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [^ default].
	self @env0:___rawRemoveKey___: key.
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
setdefault: key
	^ self setdefault: key _: None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
setdefault: key _: default
	| val |
	val := self @env0:___rawAt___: key.
	val == nil ifTrue: [
		self @env0:___rawAt___: key put: default.
		^ default
	].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__iter__
	"Iterating a dict yields its KEYS in Python (the values come from
	indexing).  Match by yielding the dict-keys list's iterator."

	^ self keys __iter__
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__reversed__
	"reversed(d) -- keys in reverse insertion order.  Reuse ``keys'' (which
	exposes the dynamic-instVar Symbols as Python ``str''s) so reverse
	iteration yields the SAME string keys as forward ``keys''/``__iter__'';
	collecting raw keysAndValuesDo: keys here would leak Symbols
	(test_dict test_reverse_iterator_for_shared_shared_dicts: reversed(__dict__)
	== ['y', 'x'])."

	^ (self keys @env0:reverse) __iter__
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__repr__
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
		stream @env0:nextPutAll: (k __repr__) @env0:asString.
		stream @env0:nextPutAll: ': '.
		stream @env0:nextPutAll: (v __repr__) @env0:asString
	].
	stream @env0:nextPutAll: '}'.
	^ stream @env0:contents
%

set compile_env: 0
