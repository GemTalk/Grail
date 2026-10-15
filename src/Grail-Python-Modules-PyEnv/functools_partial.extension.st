Extension { #name : 'functools_partial' }

{ #category : 'Grail-Placeholder' }
functools_partial class >> ___applyPlaceholders___: boundArgs with: newArgs [
	"Fill each Placeholder in boundArgs with the next positional from
	newArgs (in order), passing non-Placeholder bound args through and
	appending any leftover newArgs.  A Placeholder with no newArg left
	to consume stays a Placeholder -- construction tolerates that
	(a mid-sequence reserved slot); the call path treats a surviving
	Placeholder as a missing argument."

	| ph result newList |
	ph := functools_Placeholder ___singleton___.
	result := OrderedCollection @env0:new.
	newList := OrderedCollection @env0:withAll:
		(newArgs == nil ifTrue: [#()] ifFalse: [newArgs]).
	boundArgs @env0:do: [:a |
		(a == ph)
			ifTrue: [
				newList @env0:isEmpty
					ifTrue: [result @env0:add: a]
					ifFalse: [result @env0:add: newList @env0:removeFirst]]
			ifFalse: [result @env0:add: a]].
	result @env0:addAll: newList.
	^ result @env0:asArray

]

{ #category : 'Grail-Calling' }
functools_partial class >> ___checkKeywordStrings___: kw [
	"Raise CPython's TypeError when a keywords dict holds a non-string key."

	(kw == nil or: [kw @env0:isEmpty]) ifTrue: [^ self].
	kw @env0:keysDo: [:k |
		(k isKindOf: CharacterCollection) ifFalse: [
			TypeError ___signal___: 'keywords must be strings']]

]

{ #category : 'Grail-Placeholder' }
functools_partial class >> ___countPlaceholders___: anArray [
	| ph n |
	ph := functools_Placeholder ___singleton___.
	n := 0.
	anArray @env0:do: [:a | a == ph ifTrue: [n := n @env0:+ 1]].
	^ n

]

{ #category : 'Grail-String Representation' }
functools_partial class >> ___keywordPairs___: kw [
	"kw's (key, value) pairs as a plain Array of 2-element Arrays, detached
	from the dict.  Formatting a key can run arbitrary Python (__str__), and
	that Python can mutate the very dict being formatted, so nothing may
	iterate it live."

	| out |
	(kw == nil or: [kw @env0:isEmpty]) ifTrue: [^ #()].
	out := OrderedCollection @env0:new.
	kw @env0:keysAndValuesDo: [:k :v |
		out @env0:add: (Array @env0:with: k with: v)].
	^ out @env0:asArray

]

{ #category : 'Grail-Reflection' }
functools_partial class >> __getitem__: item [
	"``partial[int]'' -- a REAL types.GenericAlias, not Grail's usual
	collapse to the class itself.

	CPython opts into parameterised generics one class at a time
	(``partial.__class_getitem__ = classmethod(GenericAlias)''); a class
	that does not say so has no __class_getitem__ at all.  Grail inverts the
	default -- Metaclass3 answers the class, because forty-five sites in the
	vendored frameworks subscript a class only to use it as a BASE and want
	the subscript discarded -- so opting in means overriding here.

	Inherited by Python subclasses of partial through the metaclass chain,
	which is what makes ``CPartialSubclass[int].__origin__'' answer the
	SUBCLASS: self is the receiver, not functools_partial.

	That inheritance is exactly why a subclass defining its OWN
	__class_getitem__ has to be let through first: this override sits on the
	metaclass chain ahead of Metaclass3 >> ___grailClassGetitemDispatch___:
	and would otherwise swallow the hook.  CPython runs the hook there
	(measured on 3.14) and keeps the alias for a subclass without one, which
	is what the guard reproduces.  The same guard is on the dict and list
	shortcuts; only dict is covered by a corpus test
	(test_genericclass test_class_getitem_with_builtins), and leaving the
	three disagreeing is how the next one gets found the hard way."

	(((self @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1) ~~ nil
		or: [(self @env0:whichClassIncludesSelector: #'___class_getitem__:kw:' environmentId: 1) ~~ nil])
		or: [((self ___classChainAttrLookup___: #'__class_getitem__') ~~ nil)
			or: [(self ___classAttrOverlayLookup___: self name: #'__class_getitem__') ~~ nil]])
			ifTrue: [^ self ___grailClassGetitemDispatch___: item].
	^ PyGenericAlias ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Reflection' }
functools_partial class >> __module__ [
	"partial.__module__ -- test_repr builds the repr's name prefix from
	``{partial.__module__}.{partial.__qualname__}''."

	^ 'functools'

]

{ #category : 'Grail-Reflection' }
functools_partial class >> __qualname__ [
	^ 'partial'

]

{ #category : 'Grail-Instantiation' }
functools_partial class >> value: positional value: keywords [
	"partial(fn, *args, **kw) -- class-call entry.  Route through the
	__new__ protocol so subclass instantiation (ClassDefAst-emitted
	value:value: uses ___allocateInstance___) and direct calls share
	one constructor."

	^ self ___allocateInstance___: positional kw: keywords

]

{ #category : 'Grail-String Representation' }
functools_partial >> ___keyString___: aKey [
	"str(key) for the repr.  A keywords dict normally holds only strings, so
	the common case must not pay for a dispatch; a non-string key is legal
	because ``keywords'' is an ordinary mutable dict
	(test_manually_adding_non_string_keyword puts 1234 in one), and CPython
	formats it with str() rather than repr()."

	(aKey isKindOf: CharacterCollection) ifTrue: [^ aKey @env0:asString].
	^ [(aKey __str__) @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: aKey @env0:printString]

]

{ #category : 'Grail-Instantiation' }
functools_partial >> ___new__: positional kw: keywords [
	"Constructor body.  self is the CLASS: ___allocateInstance___ runs a
	class-body __new__ non-virtually with the class as receiver, which
	also makes ``class Sub(partial): pass`` construct Sub instances."

	| inst fn rest kw ph |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___: 'partial expected at least 1 argument, got 0'].
	fn := positional @env0:at: 1.
	rest := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	kw := keywords == nil
		ifTrue: [KeyValueDictionary @env0:new]
		ifFalse: [keywords @env0:copy].
	ph := functools_Placeholder ___singleton___.
	"Placeholder is not allowed as a keyword-argument value (checked by
	identity, so ALWAYS_EQ -- which == everything -- is not treated as
	a Placeholder)."
	kw @env0:valuesDo: [:v | v == ph ifTrue: [
		TypeError ___signal___: 'Placeholder cannot be passed as a keyword argument']].
	"CPython flattens partial-of-partial: adopt the inner func, and the
	outer positional args FILL the inner's Placeholder slots (leftover
	outer args append); the OUTER keywords override the inner."
	(fn isKindOf: functools_partial) ifTrue: [
		| merged |
		rest := functools_partial
			___applyPlaceholders___: (fn @env0:dynamicInstVarAt: #args) @env0:asArray
			with: rest.
		merged := (fn @env0:dynamicInstVarAt: #keywords) @env0:copy.
		kw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
		kw := merged.
		fn := fn @env0:dynamicInstVarAt: #func].
	"Trailing Placeholders are not allowed (they could never be filled
	at call time)."
	(rest @env0:isEmpty @env0:not and: [(rest @env0:last) == ph]) ifTrue: [
		TypeError ___signal___: 'trailing Placeholders are not allowed'].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #func put: fn.
	inst @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: rest).
	inst @env0:dynamicInstVarAt: #keywords put: kw.
	^ inst

]

{ #category : 'Grail-Calling' }
functools_partial >> ___pyCallValue___: positional kw: kwargs [
	"The INDIRECT call protocol.  A partial reached through a variable, or
	handed to something that invokes its argument generically, arrives here
	rather than at value:value: -- and object's implementation raises
	``'functools_partial' object is not callable'', which is how a
	partialmethod wrapping a partial failed (test_over_partial)."

	^ self value: positional value: kwargs

]

{ #category : 'Grail-Pickle Protocol' }
functools_partial >> ___reservedName___: aName [
	"True for the three internal-state names (func / args / keywords),
	which are stored as dynamic instVars but must NOT appear in
	__dict__ and are read-only via attribute assignment."

	| s |
	s := aName @env0:asString.
	^ (s @env0:= 'func') or: [s @env0:= 'args' or: [s @env0:= 'keywords']]

]

{ #category : 'Grail-Attribute Access' }
functools_partial >> __delattr__: name [
	"``del p.__dict__'' is forbidden (CPython: TypeError).  Other
	deletions fall through to the default."

	(name @env0:asString @env0:= '__dict__') ifTrue: [
		TypeError ___signal___: 'a partial object''s dictionary may not be deleted'].
	^ super __delattr__: name

]

{ #category : 'Grail-Introspection' }
functools_partial >> __dict__ [
	"The instance namespace -- user attributes only (``p.attr = ...''),
	NOT the func/args/keywords internal state (those are C-level slots
	in CPython, absent from __dict__).  A fresh dict snapshot: partial's
	tests read it via signature() and compare by value; no test writes
	back through it."

	| d pairs |
	d := dict ___new___.
	pairs := self @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		| nm |
		nm := pairs @env0:at: i.
		(self ___reservedName___: nm) ifFalse: [
			d @env0:at: nm @env0:asString put: (pairs @env0:at: i @env0:+ 1)]].
	^ d

]

{ #category : 'Grail-Descriptor' }
functools_partial >> __get__: obj [
	^ self __get__: obj _: None

]

{ #category : 'Grail-Descriptor' }
functools_partial >> __get__: obj _: cls [
	"CPython 3.14 made partial a DESCRIPTOR, so a partial stored as a class
	attribute works as a method: read off an instance it binds that instance
	as the first argument after the bound ones, and read off the class it
	answers itself unbound.

	This is a 3.14 behaviour CHANGE -- through 3.13 a partial was not a
	descriptor and an instance read handed back the partial itself.  Grail
	targets 3.14 (the vendored corpus is 3.14.4), so 3.14 is what this
	implements; the vendored frameworks predate it, which is why the full
	SUnit suite is the check that matters here."

	(obj == nil or: [obj == None]) ifTrue: [^ self].
	^ MethodBinding instance: obj callable: self

]

{ #category : 'Grail-Pickle' }
functools_partial >> __reduce__ [
	"(class, (func,), (func, args, keywords or None, __dict__ or None)).

	The counterpart __setstate__ already described but that was missing:
	Object >> __reduce__ raises ``Not yet implemented: __reduce__'' through
	``self error:'', an env-0 Smalltalk error that Python cannot catch, so
	all four partial variants failed test_pickle and test_recursive_pickle
	as uncatchable ST errors rather than as ordinary failures.

	Shape matches CPython's functools.partial.__reduce__ exactly, including
	the two ``or None'' collapses -- an EMPTY keywords dict or __dict__ is
	pickled as None, not as an empty container.  __setstate__ already
	accepts None for both, so the round trip closes without touching it.

	``self class'' rather than the partial class, so a SUBCLASS pickles
	back as itself (TestPartialCSubclass / TestPartialPySubclass)."

	| kw ns |
	kw := self @env0:dynamicInstVarAt: #keywords.
	((kw @env0:isNil) @env0:or: [kw @env0:isEmpty]) ifTrue: [kw := None].
	ns := self __dict__.
	(ns @env0:isEmpty) ifTrue: [ns := None].
	^ tuple @env0:withAll: {
		(self @env0:class).
		(tuple @env0:withAll: (Array @env0:with: (self @env0:dynamicInstVarAt: #func))).
		(tuple @env0:withAll: {
			(self @env0:dynamicInstVarAt: #func).
			(self @env0:dynamicInstVarAt: #args).
			kw.
			ns }) }

]

{ #category : 'Grail-String Representation' }
functools_partial >> __repr__ [
	"<module>.<qualname>(<func repr>, args..., k=v...), or the bare ``...''
	when re-entered on the SAME partial.

	CYCLE HANDLING matches CPython, where partial.__repr__ is wrapped in
	reprlib.recursive_repr(): re-entering on an object already being repr'd
	yields just the ellipsis, so a self-referential partial prints
	``functools.partial(...)'' instead of recursing until the gem's stack
	dies (it used to fail as an uncatchable AlmostOutOfStack, and as the
	FIRST of two overflows in the session it also made the second one
	fatal).  test_recursive_repr covers all three positions the cycle can
	sit in -- func, an arg, and a keyword value -- and each falls out of the
	same guard.

	The seen set is the #GrailReprSeen session set that list / tuple / dict
	__repr__ already use, so a cycle running through a MIX of containers and
	partials is still detected wherever it closes.

	The NAME is read from the receiver's own class rather than hardcoded:
	ClassDefAst gives a subclass its defining module, so
	``class partial(functools.partial)'' in test.test_functools must repr as
	``test.test_functools.partial(...)'' (test_repr)."

	| stream func args kw seen name |
	seen := SessionTemps @env0:current @env0:at: #GrailReprSeen otherwise: nil.
	seen @env0:isNil ifTrue: [
		seen := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailReprSeen put: seen].
	(seen @env0:includes: self) ifTrue: [^ '...'].
	seen @env0:add: self.
	^ [[
	"Snapshot func/args/keywords BEFORE formatting any element: an element's
	 own __repr__ may reentrantly mutate this partial via __setstate__ (see
	 test_repr_safety_against_reentrant_mutation), rebinding these instVars.
	 CPython captures them at entry; re-reading #keywords after the args loop
	 would pick up the mutated value."
	func := self @env0:dynamicInstVarAt: #func.
	args := self @env0:dynamicInstVarAt: #args.
	kw := self @env0:dynamicInstVarAt: #keywords.
	name := (self @env0:class __module__) @env0:asString @env0:, '.'
		@env0:, (self @env0:class __qualname__) @env0:asString.
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: name.
	stream @env0:nextPut: $(.
	stream @env0:nextPutAll: (func __repr__) @env0:asString.
	args @env0:do: [:a |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: (a __repr__) @env0:asString].
	"SNAPSHOT the keyword pairs before formatting any of them.  CPython
	renders each as f''{k}={v!r}'', so the KEY goes through str() -- and a
	key whose __str__ mutates the keywords dict (test_keystr_replaces_value)
	would otherwise be mutating the collection mid-iteration.  Capturing
	pairs up front also keeps the ORIGINAL value alive, which is precisely
	what that test checks: the value replaced during key formatting must not
	be the one that gets printed."
	(functools_partial ___keywordPairs___: kw) @env0:do: [:pair |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: (self ___keyString___: (pair @env0:at: 1)).
		stream @env0:nextPutAll: '='.
		stream @env0:nextPutAll: ((pair @env0:at: 2) __repr__) @env0:asString].
	stream @env0:nextPut: $).
	stream @env0:contents]
		@env0:on: (AlmostOutOfStack @env0:, AlmostOutOfStackError) do: [:ex |
			"Belt and braces, as in list >> __repr__: a nesting that is deep
			but NOT cyclic still reaches the gem's stack limit, and the
			resumable notification is uncatchable from Python unless it is
			converted here."
			RecursionError ___signal___:
				'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]

]

{ #category : 'Grail-Attribute Access' }
functools_partial >> __setattr__: name _: value [
	"func / args / keywords are read-only (CPython: AttributeError).
	Everything else is a normal user attribute."

	(self ___reservedName___: name) ifTrue: [
		AttributeError ___signal___: 'attribute ''' @env0:, name @env0:asString
			@env0:, ''' of ''functools.partial'' objects is not writable'].
	^ super __setattr__: name _: value

]

{ #category : 'Grail-Pickle Protocol' }
functools_partial >> __setstate__: state [
	"Restore partial state from a 4-tuple (func, args, kwds, namespace)
	-- the pickle/copy protocol counterpart of __reduce__.  Validates
	shape and element types (CPython raises TypeError otherwise),
	coerces args to a plain tuple and kwds to a plain dict (tuple/dict
	SUBCLASSES are normalized), rejects a trailing Placeholder, and
	installs namespace as the instance __dict__ (None clears it)."

	| ph fn args kwds namespace kd pairs |
	(state isKindOf: tuple) ifFalse: [
		TypeError ___signal___: 'argument to __setstate__ must be a tuple'].
	(state @env0:size @env0:= 4) ifFalse: [
		TypeError ___signal___: 'expected 4 items in state, got '
			@env0:, state @env0:size @env0:printString].
	fn := state @env0:at: 1.
	args := state @env0:at: 2.
	kwds := state @env0:at: 3.
	namespace := state @env0:at: 4.
	(fn == None or: [fn == nil]) ifTrue: [
		TypeError ___signal___: 'the first argument must be callable'].
	(args isKindOf: tuple) ifFalse: [
		TypeError ___signal___: 'invalid partial state (args must be a tuple)'].
	((kwds == None) or: [kwds isKindOf: KeyValueDictionary]) ifFalse: [
		TypeError ___signal___: 'invalid partial state (kwds must be a dict)'].
	((namespace == None) or: [namespace isKindOf: KeyValueDictionary]) ifFalse: [
		TypeError ___signal___: 'invalid partial state (namespace must be a dict)'].
	ph := functools_Placeholder ___singleton___.
	(args @env0:isEmpty @env0:not and: [(args @env0:at: args @env0:size) == ph]) ifTrue: [
		TypeError ___signal___: 'trailing Placeholders are not allowed'].
	"Install internal state -- args to a PLAIN tuple, kwds to a PLAIN
	dict (test_setstate_subclasses requires exact tuple/dict types)."
	self @env0:dynamicInstVarAt: #func put: fn.
	"An EXACT tuple / dict is installed AS IS; only a SUBCLASS is normalised.
	That is what CPython's partial_setstate does (PyTuple_CheckExact and
	PyDict_CheckExact, incref otherwise), and the difference is observable:
	copy.copy(f) reaches __setstate__ with f's OWN args and keywords, so
	rebuilding them here made ``f_copy.args is f.args'' false -- which
	test_functools' test_copy asserts.  The comment above already said
	subclasses were the case being normalised; the code did it to everything."
	(args @env0:class @env0:== tuple)
		ifTrue: [self @env0:dynamicInstVarAt: #args put: args]
		ifFalse: [self @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: args)].
	"EXACT means the canonical dict class, which is PyDict at run time --
	KeyValueDictionary alone missed it, so every keywords dict was rebuilt."
	((kwds ~~ None) and: [
		(kwds @env0:class @env0:== (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #PyDict))
		or: [kwds @env0:class @env0:== KeyValueDictionary]])
		ifTrue: [self @env0:dynamicInstVarAt: #keywords put: kwds]
		ifFalse: [
			kd := KeyValueDictionary @env0:new.
			(kwds ~~ None) ifTrue: [
				kwds @env0:keysAndValuesDo: [:k :v | kd @env0:at: k put: v]].
			self @env0:dynamicInstVarAt: #keywords put: kd].
	"Reset the instance __dict__: drop every user attribute (all
	dynamic instVars except the reserved three), then apply namespace."
	pairs := self @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		| nm |
		nm := pairs @env0:at: i.
		(self ___reservedName___: nm) ifFalse: [
			self @env0:removeDynamicInstVar: nm]].
	(namespace ~~ None) ifTrue: [
		namespace @env0:keysAndValuesDo: [:k :v |
			self @env0:dynamicInstVarAt: k @env0:asSymbol put: v]].
	^ None

]

{ #category : 'Grail-Calling' }
functools_partial >> value: morePositional value: moreKw [
	"Invoke: fn(*bound, *more, **{**boundKw, **moreKw}) -- later
	keywords override the bound ones (CPython semantics)."

	| fn allArgs bk allKw remaining |
	fn := self @env0:dynamicInstVarAt: #func.
	"Fill reserved Placeholder slots with the call's positional args
	(leftover call args append).  A Placeholder that survives means the
	caller supplied too few positionals -- CPython's exact message."
	allArgs := functools_partial
		___applyPlaceholders___: (self @env0:dynamicInstVarAt: #args) @env0:asArray
		with: (morePositional == nil ifTrue: [#()] ifFalse: [morePositional]).
	remaining := functools_partial ___countPlaceholders___: allArgs.
	remaining @env0:> 0 ifTrue: [
		TypeError ___signal___: ('missing positional arguments in ''partial'' call; expected at least '
			@env0:, (functools_partial ___countPlaceholders___:
				(self @env0:dynamicInstVarAt: #args) @env0:asArray) @env0:printString
			@env0:, ', got '
			@env0:, (morePositional == nil ifTrue: [0] ifFalse: [morePositional @env0:size]) @env0:printString)].
	bk := self @env0:dynamicInstVarAt: #keywords.
	allKw := (bk == nil or: [bk @env0:isEmpty])
		ifTrue: [moreKw]
		ifFalse: [
			(moreKw == nil or: [moreKw @env0:isEmpty])
				ifTrue: [bk]
				ifFalse: [
					| merged |
					merged := bk @env0:copy.
					moreKw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
					merged]].
	"``keywords'' is an ordinary mutable dict, so anything can be put in it
	(test_manually_adding_non_string_keyword puts 1234 there).  CPython
	tolerates that until the CALL, where a non-string key is a TypeError --
	Grail would instead have passed it down and produced whatever the callee
	made of it.  Costs one isEmpty test on the common keyword-free call."
	functools_partial ___checkKeywordStrings___: allKw.
	"value:value: is the universal call protocol -- BoundMethod, class
	objects (partial(int, base=2)), blocks, and nested partials all
	dispatch through it; ___pyCallValue___ rejects classes."
	^ fn value: allArgs value: allKw

]
