Extension { #name : 'PyModuleDict' }

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __contains__: key [
	"MEMBERSHIP AGREES WITH ENUMERATION.  This asked the VALUE chain, which
	lazy-wraps a class method when no binding is found, while keys / __len__ /
	__iter__ all come from ___moduleKeys___.  So the same mapping answered

	    'exit' in vars(sys)        True
	    'exit' in set(vars(sys))   False

	-- and after ``del sys.breakpointhook'' the deleted name was still ``in''
	the dict it had been deleted from.  A membership test that disagrees with
	iteration is worse than either answer on its own: every check that asks
	about ONE name agrees, and only a set comparison reveals it.

	Only STRING keys take the key route.  A module can hold a non-string key
	in its overflow store, and those are matched by value as before."

	| absent |
	(key @env0:isKindOf: CharacterCollection) ifTrue: [
		^ ((self @env0:___moduleKeys___)
			@env0:detect: [:k | k @env0:asString @env0:= key @env0:asString]
			ifNone: [nil]) @env0:notNil].
	absent := Object @env0:new.
	^ (self @env0:___moduleValueAt___: key ifAbsent: [absent]) ~~ absent

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __delitem__: key [
	"``del mod.__dict__[name]''.  A module __dict__ is an ordinary mutable
	dict in CPython, so deletion is part of its contract; without this
	method the generic fallback in Object>>_doesNotUnderstand:... raised
	``'PyModuleDict' object does not support item deletion'' for every
	module, ``del builtins.__dict__['iter']'' included (test_iter
	test_reduce_mutating_builtins_iter).  pop: already removes from
	whichever store holds the binding -- dynamic instVar first, then dict
	slot -- and raises KeyError when absent, which is exactly CPython's
	behaviour, so this is only the dunder spelling of it.  The key is
	A NON-STRING key is deleted rather than refused.  This used to validate the
	key first, so ``del globals()[0]'' raised the TypeError that belongs to a
	non-string ATTRIBUTE NAME -- but a module dict is an ordinary dict in CPython
	and takes any hashable key, so there is now something real to delete.  pop:
	reaches the overflow for it."

	self pop: key

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __getitem__: key [
	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [
		KeyError ___signal___: key].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __ior__: other [
	"PEP 584 ``globals() |= other'' -- an IN-PLACE merge, so this one DOES write
	through to the module, exactly as ``globals().update(other)'' does."

	self update: other.
	^ self

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __len__ [
	^ self @env0:___moduleKeys___ @env0:size

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> __or__: other [
	"PEP 584 ``globals() | other'' -- a new plain dict, module untouched.

	Same reasoning as copy(): the result is a dict, not a view, because CPython's
	operand is a dict and the result must not write through to the module."

	| d |
	d := self copy.
	d update: other.
	^ d

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> copy [
	"``globals().copy()'' -- a SNAPSHOT, as a plain dict.

	CPython's globals() IS a dict, so copy() returns an ordinary dict that no
	longer tracks the module.  Grail's globals() is a LIVE view, which makes the
	distinction load-bearing rather than academic: the whole point of copying is
	to get a namespace you can mutate without touching the module, which is what
	``custom_globals = globals().copy(); custom_globals[k] = v'' relies on (the
	eval-with-custom-globals idiom in test_traceback's suggestion tests, and a
	common one outside them).  Returning another live view would write those
	mutations straight back into the module."

	| d |
	d := dict ___new___.
	self @env0:keysAndValuesDo: [:k :v |
		d __setitem__: k @env0:asString _: v].
	^ d

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> get: key _: default [
	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [^ default].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> items [
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v |
		result append: (tuple @env0:withAll: {
			self @env0:___pythonKeyFor___: k. v })].
	^ result

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> keys [
	"Keys the module holds under a NON-STRING key are yielded as they are, not
	``asString''ed: a Python caller must get the object back, and the ones that
	sift a namespace with ``isinstance(k, str)'' depend on it."
	| result |
	result := list ___new___.
	self @env0:___moduleKeys___ @env0:do: [:k |
		result append: (self @env0:___pythonKeyFor___: k)].
	^ result

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> pop: key [
	"Remove and return; KeyError when absent.  Removes from whichever
	store holds the binding (dynamic instVar first, then dict slot).

	A non-string key lives in neither, so it is taken from the overflow first --
	before ``asSymbol'' below, which such a key does not understand."

	| sym val |
	"@env0: -- this method is in the file's compile_env 1 region, and both
	helpers are defined in the env 0 region above."
	self @env0:___isDoitScope___ ifTrue: [
		^ self @env0:___doitRemove___: key ifAbsent: [KeyError ___signal___: key]].
	(self @env0:___isNamespaceStringKey___: key) ifFalse: [
		"A string-EQUAL key is removed from the string side, where it lives."
		sym := self @env0:___stringKeyEqualTo___: key.
		sym == nil ifTrue: [
			(self @env0:___overflow___) @env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [KeyError ___signal___: key].
				val := d @env0:at: key.
				d @env0:removeKey: key ifAbsent: [nil].
				^ val].
			KeyError ___signal___: key]]
		ifTrue: [sym := key @env0:asSymbol].
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	KeyError ___signal___: key

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> pop: key _: default [
	| sym val |
	"@env0: for the same reason as pop: above -- env 1 region, env 0 helpers."
	self @env0:___isDoitScope___ ifTrue: [
		^ self @env0:___doitRemove___: key ifAbsent: [default]].
	(self @env0:___isNamespaceStringKey___: key) ifFalse: [
		sym := self @env0:___stringKeyEqualTo___: key.
		sym == nil ifTrue: [
			(self @env0:___overflow___) @env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [^ default].
				val := d @env0:at: key.
				d @env0:removeKey: key ifAbsent: [nil].
				^ val].
			^ default]]
		ifTrue: [sym := key @env0:asSymbol].
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	^ default

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> popitem [
	"Remove and return one (key, value) pair; KeyError when empty.

	CPython's dict.popitem is LIFO -- it removes the last-inserted pair.  Grail's
	module storage spans dynamic instVars and dict slots with no single insertion
	order to honour, so this removes the last pair this view enumerates, which is
	the same pair a caller draining the mapping would expect to see next."

	| pairs last |
	pairs := self items.
	(pairs __len__) @env0:= 0 ifTrue: [
		KeyError ___signal___: 'popitem(): dictionary is empty'].
	last := pairs __getitem__: (pairs __len__) @env0:- 1.
	self pop: (last __getitem__: 0).
	^ last

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> setdefault: key _: default [
	"Read through the FULL chain (a dict-slot or def binding counts as
	present); write, when absent, to the canonical dynamic-instVar home."

	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [
		self @env0:___rawAt___: key put: default.
		^ default].
	^ val

]

{ #category : 'Grail-Python-Protocol' }
PyModuleDict >> values [
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v | result append: v].
	^ result

]
