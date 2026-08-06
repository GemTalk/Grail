! ------------------- Superclass check
run
Set ifNil: [self error: 'Set is not defined.'].
%

! ===============================================================================
! frozenset class (Python 'frozenset' type - immutable hashable set)
! ===============================================================================
! Implemented as a sibling of `set`, both subclasses of GemStone's Set. All
! class-side constructors send immediateInvariant before returning so the
! result is fully immutable (Set is only invariant after commit otherwise).
!
! Shared read-only and "returns a new collection" methods live on Set itself
! (see SetProtocol.gs); this file only adds frozenset-specific overrides
! (__hash__, __repr__) and freezing constructors.
! ===============================================================================

! ------- frozenset class definition
expectvalue /Class
doit
Set subclass: 'frozenset'
  instVarNames: #( table )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
frozenset comment:
'Python frozenset type - immutable, hashable, unordered collection of unique
elements. A sibling of `set` (both subclasses of GemStone Set); neither
inherits from the other, matching Python.

Class-side constructors freeze instances via immediateInvariant before
returning. Use `frozenset withAll: aCollection` to build from an iterable.
'
%

expectvalue /Class
doit
frozenset category: 'Grail-Collections-Unordered'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
frozenset removeAllMethods: 1.
frozenset class removeAllMethods: 1.
%

! ===============================================================================
! Class-side instance creation (env:0 Smalltalk)
! Each constructor freezes the result before returning.
! ===============================================================================

set compile_env: 0

category: 'Grail-instance creation'
classmethod: frozenset
new
	"Return an empty, frozen frozenset.  The PyDict element table is installed
	BEFORE freezing (a frozen instance can't have its `table` slot reassigned)."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	^ self ___frozenInstance: inst
%

category: 'Grail-instance creation'
classmethod: frozenset
___frozenInstance: inst
	"Freeze EXACT frozensets (immutable, so element storage never changes);
	leave SUBCLASS instances mutable so they can carry instance attributes --
	a frozenset subclass has a __dict__ in CPython, and test_keywords_in_subclass's
	subclass_with_new sets ``self.newarg''.  Python exposes no element mutation
	on either (no add/remove), so subclass elements stay effectively immutable."

	self == frozenset ifTrue: [^ inst immediateInvariant].
	^ inst
%

category: 'Grail-instance creation'
classmethod: frozenset
withAll: aCollection
	"Build a frozenset containing every element of aCollection (no duplicates),
	then freeze it (exact frozensets only -- see ___frozenInstance:)."

	| inst |
	inst := super new.
	inst ___pyInitTable___.
	"Snapshot the source: dedup calls the elements' Python __eq__, which (bpo-46615)
	may clear the source mid-iteration -- iterating a live list being cleared would
	crash with a kernel OffsetError.  See set class>>withAll:."
	(Array @env0:withAll: aCollection) @env0:do: [:each | inst add: each].
	^ self ___frozenInstance: inst
%

! ===============================================================================
! Python-level methods (env:1)
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'
method: frozenset
___init__: positional kw: keywords
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
%

category: 'Grail-Hashing'
method: frozenset
__hash__
	"Return a hash value. frozenset is hashable because it's immutable."

	| hash |
	hash := 0.
	self @env0:do: [:each |
		hash := hash @env0:bitXor: each __hash__
	].
	^ hash
%

category: 'Grail-String Representation'
method: frozenset
__repr__
	"Return 'frozenset({a, b, c})' or 'frozenset()' for the empty set."

	| stream first size |
	size := self @env0:size.
	(size @env0:= 0) ifTrue: [^ 'frozenset()'].

	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: 'frozenset({'.

	first := true.
	self @env0:do: [:each |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		stream @env0:nextPutAll: each __repr__.
		first := false
	].

	stream @env0:nextPutAll: '})'.
	^ stream @env0:contents
%

set compile_env: 0

! ===============================================================================
! Facade element storage (env 0) -- identical to set's; a frozenset's elements
! live in a PyDict `table` keyed by Python __hash__/__eq__.  The table is
! populated during construction (before immediateInvariant); frozenset exposes
! no element mutators, so it is effectively immutable.  remove:/removeAll: are
! provided for symmetry (never reached by the frozenset Python protocol).
! ===============================================================================

category: 'Grail-Facade Storage'
method: frozenset
___pyInitTable___
	"Install a fresh PyDict as the element table (keys = elements)."

	table := PyDict new
%

category: 'Grail-Facade Storage'
method: frozenset
do: aBlock
	table isNil ifTrue: [^ super do: aBlock].
	^ table keysDo: aBlock
%

category: 'Grail-Facade Storage'
method: frozenset
add: anElement
	"Add an element (only during construction; dedup by Python __hash__/__eq__).
	An unhashable element is re-labelled to the set-element TypeError (frozenset([[]])
	reports ``cannot use 'list' as a set element''); a genuine __eq__ TypeError
	propagates.  Zero overhead on the hashable path.

	Once the frozenset is frozen (immediateInvariant, exact frozensets), mutation
	is REJECTED: the table object is not itself frozen, so guard explicitly to
	preserve immutability -- a native frozen Set raised on add: (testFrozensetImmutable).
	Construction adds BEFORE ___frozenInstance: freezes, so this never blocks it."

	self isInvariant ifTrue: [^ self error: 'frozenset object is immutable'].
	table isNil ifTrue: [^ super add: anElement].
	[table at: anElement put: true]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass].
	^ anElement
%

category: 'Grail-Facade Storage'
method: frozenset
includes: anElement
	"Membership by Python __hash__/__eq__; an unhashable element re-labels to the
	set-element TypeError (only on the exception path)."

	table isNil ifTrue: [^ super includes: anElement].
	^ [table includesKey: anElement]
		on: TypeError
		do: [:ex | anElement @env1:___requireHashableAsSetElement___. ex pass]
%

category: 'Grail-Facade Storage'
method: frozenset
size
	table isNil ifTrue: [^ super size].
	^ table size
%

category: 'Grail-Facade Storage'
method: frozenset
isEmpty
	table isNil ifTrue: [^ super isEmpty].
	^ table isEmpty
%

category: 'Grail-Facade Storage'
method: frozenset
remove: anElement
	table isNil ifTrue: [^ super remove: anElement].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement
%

category: 'Grail-Facade Storage'
method: frozenset
remove: anElement ifAbsent: aBlock
	table isNil ifTrue: [^ super remove: anElement ifAbsent: aBlock].
	(table includesKey: anElement) ifFalse: [^ aBlock value].
	table removeKey: anElement ifAbsent: [nil].
	^ anElement
%

category: 'Grail-Facade Storage'
method: frozenset
removeAll: aCollection
	table isNil ifTrue: [^ super removeAll: aCollection].
	aCollection == self ifTrue: [table := PyDict new. ^ aCollection].
	aCollection do: [:each | table removeKey: each ifAbsent: [nil]].
	^ aCollection
%
