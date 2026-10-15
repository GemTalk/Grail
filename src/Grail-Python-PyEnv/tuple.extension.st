Extension { #name : 'tuple' }

{ #category : 'Grail-Generics' }
tuple class >> __getitem__: item [
	"``tuple[int, str]'' -- a REAL types.GenericAlias, as list's is (see list
	class >> __getitem__:, which this mirrors, subclass hook and all).

	The collapse to the bare class was observable in annotations: PEP 646's
	``tuple[*Ts]'' has to keep its arguments -- ``A.__annotations__['y'].__args__''
	is how test_annotationlib reads the unpacked TypeVarTuple back -- and
	``*tuple[int, ...]'' iterates the alias, which a class cannot do."

	(((self @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1) ~~ nil
		or: [(self @env0:whichClassIncludesSelector: #'___class_getitem__:kw:' environmentId: 1) ~~ nil])
		or: [((self ___classChainAttrLookup___: #'__class_getitem__') ~~ nil)
			or: [(self ___classAttrOverlayLookup___: self name: #'__class_getitem__') ~~ nil]])
			ifTrue: [^ self ___grailClassGetitemDispatch___: item].
	^ PyGenericAlias ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Initialization' }
tuple class >> __new__ [
	"tuple() — return an empty, frozen tuple. Receiver is the class."

	^ self @env0:new

]

{ #category : 'Grail-Initialization' }
tuple class >> __new__: iterable [
	"tuple(iterable) — create a frozen tuple from iterable's items.
	Receiver is the class."

	| items iter done ic |
	"``X.__new__(cls)'' -- CPython's first argument to a type's __new__ is the
	TARGET CLASS, not the contents: a class that inherits from the receiver
	can only be that.  Built as a plain constructor argument it was
	iterated -- ``'type' object is not iterable'' -- which is what
	SQLAlchemy's ``ImmutableDictBase.__new__(cls)'' (FacadeDict) raised at
	MetaData() construction.  A STRICT subclass only: ``list(list)'' reaches
	here too and must raise as CPython's does, and a class that does not
	inherit from the receiver stays an iterable (``list(SomeEnum)'')."
	((iterable @env0:isKindOf: Behavior)
		@env0:and: [iterable @env0:inheritsFrom: self])
			@env0:ifTrue: [^ iterable @env0:new].
	"Fast index-copy ONLY for the EXACT built-in sequence classes.  A SUBCLASS
	may override __iter__ to iterate differently (seq_tests test_constructors'
	LyingTuple, issue #23757), and CPython always constructs via the iterator
	protocol -- so any subclass falls through to the __iter__ path below.
	Strings (CharacterCollection) also fall through: ``withAll:'' would iterate
	them as Characters, not the 1-char Python strings CPython yields."
	ic := iterable @env0:class.
	((ic == OrderedCollection) @env0:or: [(ic == Array) @env0:or: [ic == tuple]]) ifTrue: [
		"tuple(t) returns the SAME object when t is already an exact tuple and
		we're building an exact tuple -- CPython's identity optimization for
		immutables (test_constructors: ``tuple(t0_3) is t0_3'')."
		((self @env0:== tuple) @env0:and: [ic == tuple]) ifTrue: [^ iterable].
		^ self @env0:withAll: iterable
	].
	items := OrderedCollection @env0:new.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[items @env0:add: iter __next__]
			@env0:on: StopIteration do: [:ex | done := true]
	].
	^ self @env0:withAll: items

]

{ #category : 'Grail-Initialization' }
tuple class >> __new__: cls _: iterable [
	"CPython convention ``tuple.__new__(cls, iterable)'': the FIRST positional
	is the TARGET class (a tuple subclass), the second the contents.  A
	subclass __new__ doing ``super().__new__(cls, arg)'' lands here
	(test_keywords_in_subclass's subclass_with_new).  Build an instance of
	cls, which ___frozenInstance: leaves mutable so it can carry attributes."

	^ cls @env0:withAll: iterable

]

{ #category : 'Grail-Initialization' }
tuple class >> _new: positional kw: kwargs [
	"tuple(**kw) / tuple(iterable, extra) -- CPython rejects keyword
	arguments and >1 positional; raise the catchable TypeError instead
	of an uncatchable MNU (test_tuple's test_keyword_args)."

	(kwargs ~~ nil and: [kwargs @env0:size @env0:> 0]) ifTrue: [
		TypeError ___signal___: 'tuple() takes no keyword arguments'].
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: 'tuple expected at most 1 argument, got '
			@env0:, positional @env0:size @env0:printString].
	positional @env0:size @env0:= 0 ifTrue: [^ self __new__].
	^ self __new__: (positional @env0:at: 1)

]

{ #category : 'Grail-Sequence Protocol' }
tuple >> ___getslice___: lower _: upper _: step [
	"Slice a tuple — returns a new (frozen) tuple.  Overrides the
	SequenceableCollection implementation, which builds via
	``species new + add:``; that path fails on tuple because empty
	tuples are already invariant.  Re-uses the inherited bounds
	normalization by collecting into a mutable OrderedCollection
	first, then freezing via ``tuple withAll:``."

	| size lo hi st accumulator i lwr upr |
	size := self @env0:size.
	"The subscript slice passes the Python None singleton (not Smalltalk nil)
	for an unset bound/step; normalise so the ifNil: defaults fire instead of
	comparing None with an integer (test_operator's test_itemgetter slices a
	tuple with ``slice(2, 4)'' -- step None)."
	"Each bound is FETCHED through __index__, exactly as the inherited
	implementation does: a slice keeps whatever objects the source wrote, so
	``t[o:o2]'' with __index__ objects otherwise reaches the env-0 arithmetic
	below and dies on an uncatchable ``does not understand #<''
	(test_index.TupleTestCase.test_slice / test_slice_bug7532 / test_error).
	___asIndexOrNil___ leaves an unset bound alone."
	lwr := lower ___asIndexOrNil___.
	upr := upper ___asIndexOrNil___.
	st := ((step @env0:== None) or: [step @env0:isNil]) ifTrue: [1] ifFalse: [step ___asIndex___].
	lwr := (lwr @env0:== None) ifTrue: [nil] ifFalse: [lwr].
	upr := (upr @env0:== None) ifTrue: [nil] ifFalse: [upr].
	st @env0:= 0 ifTrue: [ValueError ___signal___: 'slice step cannot be zero'].

	lo := lwr
		ifNil: [st @env0:> 0 ifTrue: [0] ifFalse: [size @env0:- 1]]
		ifNotNil: [lwr @env0:< 0
			ifTrue: [(size @env0:+ lwr) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [lwr @env0:min:
				(st @env0:> 0 ifTrue: [size] ifFalse: [size @env0:- 1])]].

	hi := upr
		ifNil: [st @env0:> 0 ifTrue: [size] ifFalse: [-1]]
		ifNotNil: [upr @env0:< 0
			ifTrue: [(size @env0:+ upr) @env0:max:
				(st @env0:> 0 ifTrue: [0] ifFalse: [-1])]
			ifFalse: [upr @env0:min:
				(st @env0:> 0 ifTrue: [size] ifFalse: [size @env0:- 1])]].

	"A contiguous slice is one block copy into an exact-size tuple (#1385);
	an empty one is THE empty tuple, as tuple withAll: answers it."
	st @env0:= 1 ifTrue: [| n inst |
		lo @env0:>= hi ifTrue: [^ tuple @env0:new].
		n := hi @env0:- lo.
		inst := tuple @env0:new: n.
		inst @env0:replaceFrom: 1 to: n with: self startingAt: lo @env0:+ 1.
		^ tuple @env0:___frozenInstance: inst].

	accumulator := OrderedCollection @env0:new.
	i := lo.
	st @env0:> 0
		ifTrue: [[i @env0:< hi] whileTrue: [
			accumulator @env0:add: (self @env0:at: i @env0:+ 1).
			i := i @env0:+ st]]
		ifFalse: [[i @env0:> hi] whileTrue: [
			accumulator @env0:add: (self @env0:at: i @env0:+ 1).
			i := i @env0:+ st]].
	^ tuple @env0:withAll: accumulator

]

{ #category : 'Grail-Sequence Operations' }
tuple >> __add__: other [
	"Concatenate two sequences. Returns a new (frozen) tuple.
	Python only concatenates tuple + tuple."

	| accumulator |
	"Accept tuple + plain Array too -- the Array is Grail's ambiguous
	*args/splat carrier (see ___sameSequenceKindAs___)."
	((other isKindOf: tuple) or: [other @env0:class == Array]) ifFalse: [
		^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'].

	accumulator := OrderedCollection @env0:new.
	accumulator @env0:addAll: self.
	accumulator @env0:addAll: other.
	^ tuple @env0:withAll: accumulator

]

{ #category : 'Grail-Sequence Protocol' }
tuple >> __delitem__: index [
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object doesn''t support item deletion'

]

{ #category : 'Grail-Introspection' }
tuple >> __dict__ [
	"``obj.__dict__'' for a tuple SUBCLASS instance -- the live dynamic-instVar
	view list and bytes publish.  Only a class PYTHON defined gets one: an EXACT
	tuple, and Grail's own Smalltalk subclasses of it (struct_time is a tuple),
	have no instance dict, as in CPython.  test_pickle's round trips compare
	subclass instances' __dict__."

	(self @env0:class @env0:whichClassIncludesSelector: #'___pyDefinedClass___'
		environmentId: 1) @env0:isNil ifTrue: [
		^ AttributeError ___signal___:
			'''tuple'' object has no attribute ''__dict__'''].
	^ self ___grailInstanceDictView___

]

{ #category : 'Grail-Other' }
tuple >> __doc__ [
	"Return the docstring for tuple."

	^ 'Built-in immutable sequence.

If no argument is given, the constructor returns an empty tuple.
If iterable is specified the tuple is initialized from iterable''s items.

If the argument is a tuple, the return value is the same object.'

]

{ #category : 'Grail-Pickle' }
tuple >> __getnewargs__ [
	"CPython's tuple.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The tuple's elements as a plain tuple, matching CPython's
	tuple.__getnewargs__().

	It exists for PICKLING an immutable builtin's subclass.  ``class MySub(tuple)''
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- allocating a bare instance rebuilds an empty one.  Grail's
	pickle used to reduce any tuple subclass to a plain tuple, losing the class."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { tupleClass @env0:withAll: (self @env0:asArray) }

]

{ #category : 'Grail-Hashing' }
tuple >> __hash__ [
	"Combine the ELEMENTS' Python hashes.  Tuples are hashable (unlike lists)
	because they are immutable, and CPython derives the value from the members.

	This used to answer the Smalltalk ``Array hash'', which hashes members with
	the Smalltalk ``hash''.  Three things were wrong with that, and PyDict
	buckets every key by __hash__ (PyDict >> hashFunction:), so each one reached
	real dict lookups:

	  * An UNHASHABLE member did not raise.  ``hash((1, 2, []))'' answered 556
	    where CPython raises ``TypeError: unhashable type: 'list'''.  Sending
	    __hash__ to each member is what propagates it -- list.__hash__ already
	    raises -- so no separate check is needed.
	  * A member's custom __hash__ was IGNORED, because the Smalltalk hash of a
	    PythonInstance is its identity hash.  Two equal one-tuples of a
	    custom-__eq__/__hash__ object hashed differently, so
	    ``{(Custom(1),): 'x'}[(Custom(1),)]'' raised KeyError even though the
	    bare ``{Custom(1): 'x'}[Custom(1)]'' worked.
	  * Cross-type numeric agreement broke for bool: Python says
	    ``hash(True) == hash(1)'', but the Smalltalk ``true hash'' is not
	    ``1 hash'', so ``hash((True,)) != hash((1,))''.  Taking the members'
	    PYTHON hashes fixes this for free, and keeps hash((1,)) == hash((1.0,)).

	The VALUE is not CPython's.  CPython mixes with 64-bit xxHash constants whose
	results do not fit a GemStone SmallInteger, so matching it would put
	LargeInteger arithmetic on the hot path of every tuple-keyed dict operation.
	Nothing depends on the number -- Python documents hash values as
	implementation-defined -- and the one property that IS contractual,
	equal-values-hash-equal across numeric types, comes from the member hashes
	rather than from the mixing.

	Order-sensitive, so (1, 2) and (2, 1) do not collide, and the length is
	folded in so (1, 2) and (1, 2, 0) do not either.

	A CLASS member is hashed as hash() hashes it -- by type.__hash__, which
	its metaclass may replace -- never by sending it __hash__, which reads the
	class's own attribute: the one describing its INSTANCES.  h11's event
	classes set ``__hash__ = None'' to make events unhashable, so its state
	tables, keyed by tuples like ``(Request, CLIENT)'', got None as a member's
	hash and died on ``nil bitXor:'', an uncatchable MessageNotUnderstood."

	| acc |
	acc := 3430008.
	1 @env0:to: self @env0:size do: [:i |
		| lane e |
		e := self @env0:at: i.
		lane := (e @env0:isKindOf: Behavior)
			ifTrue: [(builtins instance) hash: e]
			ifFalse: [e __hash__].
		acc := ((acc @env0:* 1000003) @env0:bitXor: lane) @env0:bitAnd: 16r3FFFFFFF].
	^ (acc @env0:bitXor: self @env0:size) @env0:bitAnd: 16r3FFFFFFF

]

{ #category : 'Grail-Sequence Protocol' }
tuple >> __iter__ [
	"Return an iterator over the tuple."

	^ tuple_iterator ___on: self

]

{ #category : 'Grail-Sequence Operations' }
tuple >> __mul__: n [
	"Repeat the tuple n times. Returns a new (frozen) tuple.
	Overrides the SequenceableCollection implementation, which builds the
	result via species ___new___ + addAll: -- that path doesn't work for
	tuples because the empty instance is already frozen."

	| accumulator count |
	((n isKindOf: Integer)
		or: [n ___hasIndexDunder___]) ifFalse: [
		^ self ___binOpFallback___: n op: '*' reflected: #'__rmul__:'].
	"Fetch the count via __index__ -- the probe only proved n is index-LIKE
	(a method argument cannot be assigned in Smalltalk, hence the temp)."
	count := n ___asRepeatCount___.
	(count @env0:<= 0) ifTrue: [^ tuple @env0:new].
	"CPython: t * 1 returns t ITSELF when t's type is exactly tuple (an
	identity optimization -- seq_tests test_repeat: id(s) == id(s*1)); a
	tuple subclass still gets a fresh plain tuple."
	((count @env0:= 1) and: [self @env0:class == tuple]) ifTrue: [^ self].
	accumulator := OrderedCollection @env0:new.
	count @env0:timesRepeat: [accumulator @env0:addAll: self].
	^ tuple @env0:withAll: accumulator

]

{ #category : 'Grail-String Representation' }
tuple >> __repr__ [
	"Return a string representation of the tuple: (item1, item2, ...)
	Special case: single-element tuples need a trailing comma."

	| stream size seen |
	seen := SessionTemps @env0:current @env0:at: #GrailReprSeen otherwise: nil.
	seen @env0:isNil ifTrue: [
		seen := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailReprSeen put: seen].
	(seen @env0:includes: self) ifTrue: [^ '(...)'].
	"seen's size is the current repr nesting depth: deep nesting must raise the catchable
	RecursionError before the gem's real stack overflows -- threshold 200
	because a default gem has GEM_MAX_SMALLTALK_STACK_DEPTH 1000 and each
	repr level costs several frames (list_tests test_repr_deep nests 200k)."
	seen @env0:size @env0:> 200 ifTrue: [
		RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object'].
	seen @env0:add: self.
	^ [[size := self @env0:size.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $(.

	size == 1 ifTrue: [
		"Single element tuple needs trailing comma"
		| reprStr |
		reprStr := (self @env0:at: 1) __repr__ @env0:___reprResult___.
		stream @env0:nextPutAll: reprStr.
		stream @env0:nextPutAll: ','.
	] ifFalse: [
		self @env0:do: [:each |
				| reprStr |
				reprStr := each __repr__ @env0:___reprResult___.
				stream @env0:nextPutAll: reprStr
			] separatedBy: [stream @env0:nextPutAll: ', ']
	].

	stream @env0:nextPut: $).
	stream @env0:contents]
		@env0:on: (AlmostOutOfStack @env0:, AlmostOutOfStackError) do: [:ex |
			"A default gem's stack (GEM_MAX_SMALLTALK_STACK_DEPTH 1000)
			overflows before the seen-size guard fires -- convert the
			resumable notification into CPython's RecursionError."
			RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]

]

{ #category : 'Grail-Sequence Protocol' }
tuple >> __setitem__: index _: value [
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object does not support item assignment'

]
