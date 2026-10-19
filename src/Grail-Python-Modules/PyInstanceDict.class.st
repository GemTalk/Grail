"Live view of a PythonInstance's dynamic-instVar storage as a
Python-style dict.  Returned by ``PythonInstance >> __dict__'.

Reads and writes flow through the underlying instance's
dynamicInstVarAt: / dynamicInstVarAt:put: so mutations on the view
(``rv.__dict__.update(self.__dict__)') are reflected on the
backing instance — a pre-existing snapshot-only implementation
silently dropped writes and tripped jinja2's ``Frame.copy()' /
``Symbols.copy()' patterns that depend on this idiom for attribute
forwarding.

Instance variables:
* ``source`` — the PythonInstance this view wraps.

"
Class {
	#name : 'PyInstanceDict',
	#superclass : 'Object',
	#instVars : [
		'source'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
PyInstanceDict class >> on: aPythonInstance [
	"Construct a live view bound to aPythonInstance.  Writes to the
	view land in the instance's dynamic-instVar storage."

	| inst |
	inst := self new.
	inst _setSource: aPythonInstance.
	^ inst

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___allPairs___ [
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

	| raw over result n hidden |
	raw := source @env0:dynamicInstVarPairs.
	over := self ___overflow___.
	"A builtin root's own storage (AbstractPyInt keeps its value in #value) is
	not an instance attribute -- see ___pyHiddenStateNames___."
	hidden := ((source @env0:class @env0:whichClassIncludesSelector:
			#'___pyHiddenStateNames___' environmentId: 1) @env0:notNil)
		ifTrue: [source @env1:___pyHiddenStateNames___]
		ifFalse: [#()].
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
			@env0:or: [(hidden @env0:includes: (raw @env0:at: n))
			@env0:or: [self ___slotPairs___: result name: (raw @env0:at: n)]]) ifFalse: [
			result @env0:add: (raw @env0:at: n);
				add: (raw @env0:at: n @env0:+ 1)].
		n := n @env0:+ 2].
	over @env0:ifNotNil: [:d |
		d @env0:keysAndValuesDo: [:k :v | result @env0:add: k; add: v]].
	^ result @env0:asArray

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___isNamespaceStringKey___: key [
	"True when key can be a dynamic-instVar name -- i.e. when it is a string.

	A str SUBCLASS counts, as it must: CPython treats one as a string
	everywhere, and Grail's ``asSymbol'' already accepts it."

	^ key @env0:isKindOf: CharacterCollection

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___overflow___ [
	"The non-string-key dict, or nil when this namespace has none.

	Answers nil rather than an empty dict so the common case -- every namespace
	in the corpus -- costs one dynamic-instVar read and no allocation."

	^ source @env0:dynamicInstVarAt: self ___overflowSlot___

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___overflowCreate___ [
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

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___overflowSlot___ [
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

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___pythonKeyFor___: key [
	"A stored key as Python should see it.

	A string key is stored as a SYMBOL and has to come back as a str; a non-string
	key comes back UNCHANGED.  ``asString''-ing the latter is the trap this method
	exists to close: it turns the int 0 into '0', which then passes an
	``isinstance(k, str)'' filter and reads as a name.  CPython's own suggestion
	machinery sifts a namespace exactly that way."

	^ (self ___isNamespaceStringKey___: key)
		ifTrue: [
			"The session's canonical str for the name, so two reads of one key
			are the same object, and are the object sys.intern answers."
			(key isKindOf: Symbol) ifTrue: [key ___pyInterned___] ifFalse: [key asString]]
		ifFalse: [key]

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___rawAt___: key [
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

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___rawAt___: key put: value [
	"Store value under key in whichever store takes that kind of key."

	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ self ___slotOrDynamicAt___: key asSymbol put: value].
	"Replacing through a string-EQUAL key keeps the ORIGINAL key, as a dict does."
	(self ___stringKeyEqualTo___: key) ifNotNil: [:sym |
		^ self ___slotOrDynamicAt___: sym put: value].
	^ (self ___overflowCreate___) at: key put: value

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___rawRemoveKey___: key [
	"Remove key from whichever store holds it.  Silent when absent, like the
	callers that have already established presence."

	(self ___isNamespaceStringKey___: key) ifTrue: [
		^ self ___slotOrDynamicRemove___: key asSymbol].
	(self ___stringKeyEqualTo___: key) ifNotNil: [:sym |
		^ self ___slotOrDynamicRemove___: sym].
	(self ___overflow___) ifNotNil: [:d | d removeKey: key ifAbsent: [nil]]

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___slotOrDynamicAt___: sym [
	"A string key's value: the INFERRED slot when sym names one
	(GRAIL_INFERRED_SLOTS; nil when unset), else the dynamic instVar."

	| idx |
	idx := source @env1:___pyInferredSlotIndexFor___: sym.
	"An UNSET slot falls through to a per-object value of the same name (a
	promotion leftover), as the attribute read does."
	idx ~~ 0 ifTrue: [^ (source @env1:___pySlotAt___: idx) ifNil: [source dynamicInstVarAt: sym]].
	^ source dynamicInstVarAt: sym

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___slotOrDynamicAt___: sym put: value [
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

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___slotOrDynamicRemove___: sym [
	"Remove a string key: an INFERRED slot is nilled (an instVar cannot be
	removed; nil is absent), a dynamic instVar is removed."

	| idx |
	idx := source @env1:___pyInferredSlotIndexFor___: sym.
	idx ~~ 0 ifTrue: [
		"Both homes: the slot is nilled and a promotion leftover goes with it."
		(source dynamicInstVarAt: sym) == nil ifFalse: [source removeDynamicInstVar: sym].
		^ source @env1:___pySlotAt___: idx put: nil].
	^ source removeDynamicInstVar: sym

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___slotPairs___: pairs name: aSymbol [
	"Whether aSymbol is one of the NAMES in pairs, a flat name/value Array as
	object >> ___pyInferredSlotPairs___ answers it (so only SET slots).  Used to
	report a name once when a dynamic instVar of the same name survives
	underneath a slot."

	1 to: pairs size by: 2 do: [:i | (pairs at: i) == aSymbol ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___stringKeyEqualTo___: key [
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

]

{ #category : 'Grail-Non-String Keys' }
PyInstanceDict >> ___stringKeysDo___: aBlock [
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

]

{ #category : 'Grail-Private' }
PyInstanceDict >> _setSource: anInstance [
	source := anInstance

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> at: aKey [
	"Smalltalk-side keyed read.  Raises if absent — match KeyValueDictionary."

	| val sym |
	sym := aKey asSymbol.
	val := self ___slotOrDynamicAt___: sym.
	val == nil ifTrue: [
		^ source _errorKeyNotFound: aKey
	].
	^ val

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> at: aKey ifAbsent: aBlock [
	"Smalltalk-side keyed read with fallback block."

	| val sym |
	sym := aKey asSymbol.
	val := self ___slotOrDynamicAt___: sym.
	val == nil ifTrue: [^ aBlock value].
	^ val

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> at: aKey put: aValue [
	"Writes propagate to the source instance's dynamic-instVar storage (or its
	inferred slot)."

	self ___slotOrDynamicAt___: aKey asSymbol put: aValue.
	^ aValue

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> includesKey: aKey [
	"Non-string keys included: the Smalltalk-protocol probes back ``__contains__''
	and the builtins that walk a namespace, so a key the dict holds has to answer
	true through every one of them."

	(self ___isNamespaceStringKey___: aKey) ifFalse: [
		^ (self ___overflow___) ifNil: [false] ifNotNil: [:d | d includesKey: aKey]].
	^ (self ___slotOrDynamicAt___: aKey asSymbol) ~~ nil

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> isEmpty [
	^ self ___allPairs___ isEmpty

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> keys [
	"Return the keys as an Array (Smalltalk-side iteration target)."

	| pairs result |
	pairs := self ___allPairs___.
	result := Array new: pairs size // 2.
	1 to: pairs size by: 2 do: [:i |
		result at: (i + 1) // 2 put: (pairs at: i)
	].
	^ result

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> keysAndValuesDo: aBlock [
	"Iterate (key, value) pairs in declaration order."

	| pairs |
	pairs := self ___allPairs___.
	1 to: pairs size by: 2 do: [:i |
		aBlock value: (pairs at: i)
			value: (pairs at: i + 1)
	]

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> notEmpty [
	^ self ___allPairs___ notEmpty

]

{ #category : 'Grail-Smalltalk-Protocol' }
PyInstanceDict >> size [
	^ self ___allPairs___ size // 2

]

{ #category : 'Grail-Accessing' }
PyInstanceDict >> source [
	^ source

]
