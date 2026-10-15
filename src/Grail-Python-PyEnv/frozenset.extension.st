Extension { #name : 'frozenset' }

{ #category : 'Grail-Initialization' }
frozenset >> ___init__: positional kw: keywords [
	"Varargs frozenset.__init__(*args, **kw).  frozenset has NO __init__ of its
	own in CPython -- it inherits object.__init__, which rejects keyword/excess
	arguments UNLESS the class overrides __new__ (then the leftover args were
	__new__'s to consume, and object.__init__ stays lenient).  So reject keyword
	arguments only when the receiver's class does NOT define its own __new__:
	  - frozenset() or a plain frozenset subclass -> reject (test_new_or_init:
	    frozenset().__init__(a=1); test_keywords_in_subclass: subclass(seq=())).
	  - a subclass that overrides __new__ (a user def compiles to ___new__:kw:)
	    already consumed the kwarg there -> stay lenient
	    (test_keywords_in_subclass's frozenset subclass_with_new(arg, newarg=3);
	    the set case, by contrast, has a strict set.__init__ and still rejects).
	frozenset is immutable, so a positional iterable was already consumed by
	__new__ -- there is nothing to populate here.  A subclass WITH its own
	__init__ dispatches to that and never reaches here."

	((keywords @env0:notNil @env0:and: [keywords @env0:notEmpty])
		@env0:and: [(self @env0:class @env0:whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) @env0:isNil]) ifTrue: [
		TypeError ___signal___: (self @env0:class @env0:name @env0:asString
			@env0:, '() takes no keyword arguments')].
	^ None

]

{ #category : 'Grail-Generics' }
frozenset >> __class_getitem__: item [
	"``frozenset[int]'' -- a REAL types.GenericAlias.  PEP 560's own hook rather
	than the class-side ``__getitem__:'' list, tuple and dict override: a
	class-side method leaks into INSTANCE attribute lookup, so it would make
	``hasattr(frozenset(), '__getitem__')'' true where CPython says false
	(TypeErrorTestCase testTheFallbackDoesNotInventAGetitemAttribute).  Those
	three have an instance __getitem__ anyway; a frozenset does not.  And
	``frozenset().__class_getitem__'' exists in CPython too.

	Metaclass3 >> ___grailClassGetitemDispatch___: runs this with the CLASS as
	receiver, so a subclass's alias has the subclass as its origin."

	"Late-bound: this file compiles before GenericAlias.gs defines the class."
	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Introspection' }
frozenset >> __dict__ [
	"``obj.__dict__'' for a frozenset SUBCLASS instance -- the live dynamic-instVar
	view list and bytes publish.  Only a class PYTHON defined gets one: an EXACT
	frozenset, and Grail's own Smalltalk subclasses of it (struct_time is a tuple),
	have no instance dict, as in CPython.  test_pickle's round trips compare
	subclass instances' __dict__."

	(self @env0:class @env0:whichClassIncludesSelector: #'___pyDefinedClass___'
		environmentId: 1) @env0:isNil ifTrue: [
		^ AttributeError ___signal___:
			'''frozenset'' object has no attribute ''__dict__'''].
	^ self ___grailInstanceDictView___

]

{ #category : 'Grail-Hashing' }
frozenset >> __hash__ [
	"Return a hash value. frozenset is hashable because it's immutable."

	| hash |
	hash := 0.
	self @env0:do: [:each |
		hash := hash @env0:bitXor: each __hash__
	].
	^ hash

]

{ #category : 'Grail-String Representation' }
frozenset >> __repr__ [
	"Return 'frozenset({a, b, c})' or 'frozenset()' for the empty set."

	| stream first size |
	size := self @env0:size.
	(size @env0:= 0) ifTrue: [^ 'frozenset()'].

	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: 'frozenset({'.

	first := true.
	self @env0:do: [:each |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: each __repr__ @env0:___reprResult___.
		first := false
	].

	stream @env0:nextPutAll: '})'.
	^ stream @env0:contents

]
