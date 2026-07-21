! ------------------- Superclass check
run
Array ifNil: [self error: 'Array is not defined.'].
%

! ===============================================================================
! tuple class (Python 'tuple' type - immutable sequence)
! ===============================================================================
! Implemented as a subclass of Array so that plain Smalltalk Arrays remain
! mutable while tuple instances are frozen via immediateInvariant before
! being returned by any class-side constructor. (InvariantArray is not
! suitable here: its instances are only invariant after commit.)
!
! Class-side instance creation methods are env:0 Smalltalk; the Python dunder
! methods below are env:1.
! ===============================================================================

! ------- tuple class definition
expectvalue /Class
doit
Array subclass: 'tuple'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
tuple comment:
'Python tuple type - immutable sequence.

Built-in immutable sequence. If no argument is given, the constructor returns
an empty tuple. If iterable is specified the tuple is initialized from
iterable''s items.

Implemented as an Array subclass. All class-side constructors freeze the
result via immediateInvariant before returning, so callers receive a fully
immutable instance. The new: anInteger fill: aBlock builder supports the
populate-then-freeze pattern.
'
%

expectvalue /Class
doit
tuple category: 'Grail-Collections-Sequenceable'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
tuple removeAllMethods: 1.
tuple class removeAllMethods: 1.
%

! ===============================================================================
! Class-side instance creation (env:0 Smalltalk)
! Each constructor freezes the result before returning.
! ===============================================================================

set compile_env: 0

category: 'Grail-instance creation'
classmethod: tuple
new
	"Return an empty, frozen tuple."

	^ (self new: 0) immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
with: a

	| inst |
	inst := self new: 1.
	inst at: 1 put: a.
	^ inst immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
with: a with: b

	| inst |
	inst := self new: 2.
	inst at: 1 put: a.
	inst at: 2 put: b.
	^ inst immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
with: a with: b with: c

	| inst |
	inst := self new: 3.
	inst at: 1 put: a.
	inst at: 2 put: b.
	inst at: 3 put: c.
	^ inst immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
with: a with: b with: c with: d

	| inst |
	inst := self new: 4.
	inst at: 1 put: a.
	inst at: 2 put: b.
	inst at: 3 put: c.
	inst at: 4 put: d.
	^ inst immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
withAll: aCollection

	| inst i |
	inst := self new: aCollection size.
	i := 1.
	aCollection do: [:each |
		inst at: i put: each.
		i := i + 1.
	].
	^ inst immediateInvariant
%

category: 'Grail-instance creation'
classmethod: tuple
new: anInteger fill: aBlock
	"Build a tuple of size anInteger by passing the mutable instance to
	aBlock (which populates it via at:put:), then freeze and return.
	Use this for the rare populate-then-freeze case where the elements
	cannot be supplied as a single collection up front."

	| inst |
	inst := self new: anInteger.
	aBlock value: inst.
	^ inst immediateInvariant
%

category: 'Grail-Exception handling'
method: tuple
handles: anException
	"Python ``except (TypeError, ValueError):`` builds a tuple of
	exception classes and uses it as the ``on:do:`` selector pattern
	(see TryAst codegen).  GemStone's handler-match protocol asks
	the handler class ``handles: anException``; without this method
	the lookup ends in MNU.  Delegate to each element: the tuple
	matches if any contained class would."

	self do: [:each |
		(each handles: anException) ifTrue: [^ true]
	].
	^ false
%

! ===============================================================================
! Python-level methods (env:1)
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'
classmethod: tuple
__new__
	"tuple() — return an empty, frozen tuple. Receiver is the class."

	^ self @env0:new
%

category: 'Grail-Initialization'
classmethod: tuple
__new__: iterable
	"tuple(iterable) — create a frozen tuple from iterable's items.
	Receiver is the class."

	| items iter done |
	"Strings are SequenceableCollections, but the ``withAll:'' fast path
	iterates them with Smalltalk ``do:'' -- yielding Characters, not the
	1-char Python strings CPython's ``tuple(str)'' produces.  Route
	CharacterCollections through the Python ``__iter__'' path below instead
	(``tuple('abcde')[-1]'' must be 'e', a str, not $e -- test_operator's
	test_itemgetter).  bytes/bytearray are NOT CharacterCollections, so they
	keep the fast path (their elements are ints, matching CPython)."
	((iterable isKindOf: SequenceableCollection)
		and: [(iterable isKindOf: CharacterCollection) not]) ifTrue: [
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
%

category: 'Grail-Initialization'
classmethod: tuple
_new: positional kw: kwargs
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
%

category: 'Grail-Sequence Operations'
method: tuple
__add__: other
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
%

category: 'Grail-Sequence Protocol'
method: tuple
___getslice___: lower _: upper _: step
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
	lwr := (lower @env0:== None) ifTrue: [nil] ifFalse: [lower].
	upr := (upper @env0:== None) ifTrue: [nil] ifFalse: [upper].
	st := ((step @env0:== None) or: [step @env0:isNil]) ifTrue: [1] ifFalse: [step].
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
%

category: 'Grail-Sequence Operations'
method: tuple
__mul__: n
	"Repeat the tuple n times. Returns a new (frozen) tuple.
	Overrides the SequenceableCollection implementation, which builds the
	result via species ___new___ + addAll: -- that path doesn't work for
	tuples because the empty instance is already frozen."

	| accumulator |
	((n isKindOf: Integer)
		or: [(n @env0:class
			@env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil]) ifFalse: [
		^ self ___binOpFallback___: n op: '*' reflected: #'__rmul__:'].
	(n @env0:<= 0) ifTrue: [^ tuple @env0:new].
	"CPython: t * 1 returns t ITSELF when t's type is exactly tuple (an
	identity optimization -- seq_tests test_repeat: id(s) == id(s*1)); a
	tuple subclass still gets a fresh plain tuple."
	((n @env0:= 1) and: [self @env0:class == tuple]) ifTrue: [^ self].
	accumulator := OrderedCollection @env0:new.
	n @env0:timesRepeat: [accumulator @env0:addAll: self].
	^ tuple @env0:withAll: accumulator
%

category: 'Grail-Sequence Protocol'
method: tuple
__delitem__: index
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object doesn''t support item deletion'
%

category: 'Grail-Other'
method: tuple
__doc__
	"Return the docstring for tuple."

	^ 'Built-in immutable sequence.

If no argument is given, the constructor returns an empty tuple.
If iterable is specified the tuple is initialized from iterable''s items.

If the argument is a tuple, the return value is the same object.'
%

category: 'Grail-Serialization'
method: tuple
__getnewargs__
	"Return arguments for unpickling.
	For tuples, this is just the tuple itself as an argument."

	^ tuple @env0:with: self
%

category: 'Grail-Hashing'
method: tuple
__hash__
	"Return a hash value for the tuple.
	Tuples are hashable (unlike lists) because they are immutable."

	| hash |
	hash := self @env0:hash.
	^ hash
%

category: 'Grail-Sequence Protocol'
method: tuple
__iter__
	"Return an iterator over the tuple."

	^ tuple_iterator ___on: self
%

category: 'Grail-String Representation'
method: tuple
__repr__
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
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPut: $(.

	size == 1 ifTrue: [
		"Single element tuple needs trailing comma"
		| reprStr |
		reprStr := (self @env0:at: 1) __repr__.
		stream @env0:nextPutAll: reprStr.
		stream @env0:nextPutAll: ','.
	] ifFalse: [
		self @env0:do: [:each |
				| reprStr |
				reprStr := each __repr__.
				stream @env0:nextPutAll: reprStr
			] separatedBy: [stream @env0:nextPutAll: ', ']
	].

	stream @env0:nextPut: $).
	stream @env0:contents]
		@env0:on: AlmostOutOfStack do: [:ex |
			"A default gem's stack (GEM_MAX_SMALLTALK_STACK_DEPTH 1000)
			overflows before the seen-size guard fires -- convert the
			resumable notification into CPython's RecursionError."
			RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]
%

category: 'Grail-Sequence Protocol'
method: tuple
__setitem__: index _: value
	"Tuples are immutable - raise TypeError."

	TypeError ___signal___: '''tuple'' object does not support item assignment'
%

set compile_env: 0
