Extension { #name : 'functools' }

{ #category : 'Grail-Signatures' }
functools class >> ___methodSignatureTable___ [
	"Parameter specs for functools functions implemented in SMALLTALK rather
	than as Python defs -- there is no FunctionDefAst to stamp one, so the
	signature is declared here in the same triple form
	``(name, kind-index, default-source-text)''.

	Read through the same class-side walk BoundMethod >> __signature_spec__
	uses for a method, so ``inspect.signature(functools.cmp_to_key)'' answers
	``(mycmp)'' as CPython's does."

	^ (KeyValueDictionary @env0:new)
		@env0:at: 'cmp_to_key' put: { { 'mycmp' . 1 } };
		@env0:yourself

]

{ #category : 'Grail-ABC MRO' }
functools >> ___c3Merge___: sequences [
	"CPython's functools._c3_merge: repeatedly take the first sequence head
	that appears in no other sequence's TAIL, and strike it from every head.
	``sequences'' is CONSUMED -- callers pass throw-away OrderedCollections.

	Raises Python RuntimeError('Inconsistent hierarchy') exactly where
	CPython's does, so an impossible hierarchy reports the CPython error
	instead of quietly answering a short MRO.

	Bounded by the total element count rather than written as a whileTrue:
	loop -- the merge emits at most one class per element, so the bound
	cannot cut a valid linearization short, and a bug in the candidate scan
	terminates instead of hanging the dispatcher."

	| result live winner candidate budget |
	result := OrderedCollection @env0:new.
	budget := 0.
	sequences @env0:do: [:s | budget := budget @env0:+ s @env0:size].
	1 @env0:to: budget @env0:+ 1 do: [:ignored |
		live := sequences @env0:reject: [:s | s @env0:isEmpty].
		live @env0:isEmpty ifTrue: [^ Array @env0:withAll: result].
		winner := live
			@env0:detect: [:s1 |
				(live
					@env0:detect: [:s2 | self ___c3TailIncludes___: s2 of: s1 @env0:first]
					ifNone: [nil]) == nil]
			ifNone: [nil].
		winner == nil ifTrue: [
			RuntimeError ___signal___: 'Inconsistent hierarchy'].
		candidate := winner @env0:first.
		result @env0:add: candidate.
		sequences @env0:do: [:s |
			(s @env0:isEmpty @env0:not and: [s @env0:first == candidate])
				ifTrue: [s @env0:removeFirst]]].
	^ Array @env0:withAll: result

]

{ #category : 'Grail-ABC MRO' }
functools >> ___c3MroOf___: aClass abcs: abcs [
	"CPython's functools._c3_mro: the C3 linearization of aClass with the
	relevant ABCs from ``abcs'' spliced in where each one's behaviour is
	INTRODUCED -- issubclass(aClass, abc) holds, but no direct base is
	already a subclass of it.  Unrelated ABCs drop out.

	Two substitutions carry Grail's class graph, each argued at its helper:
	___pyVisibleBases___ stands in for cls.__bases__, because the raw
	Smalltalk chain exposes ancestors CPython has no class for; and
	___isAbcClass___ stands in for hasattr(base, '__abstractmethods__'),
	because Grail's abc defines no such attribute."

	| bases boundary explicitBases abstractBases otherBases remaining seqs |
	bases := self ___pyVisibleBases___: aClass.
	"Bases up to and including the LAST explicit ABC are considered first."
	boundary := 0.
	bases @env0:size @env0:to: 1 by: -1 do: [:i |
		(boundary @env0:= 0 and: [self ___isAbcClass___: (bases @env0:at: i)])
			ifTrue: [boundary := i]].
	explicitBases := boundary @env0:= 0
		ifTrue: [OrderedCollection @env0:new]
		ifFalse: [bases @env0:copyFrom: 1 to: boundary].
	otherBases := boundary @env0:= (bases @env0:size)
		ifTrue: [OrderedCollection @env0:new]
		ifFalse: [bases @env0:copyFrom: boundary @env0:+ 1 to: bases @env0:size].
	"``abcs'' is consumed as the walk descends: an ABC spliced in HERE must
	not be spliced again inside a base's linearization.  Copied per level,
	as CPython's ``abcs = list(abcs)'' does, so a sibling branch still sees
	it."
	remaining := OrderedCollection @env0:new.
	abcs == nil ifFalse: [abcs @env0:do: [:a | remaining @env0:add: a]].
	abstractBases := OrderedCollection @env0:new.
	remaining @env0:do: [:abc |
		((self ___issubclassOf___: aClass of: abc)
			and: [(bases
				@env0:detect: [:b | self ___issubclassOf___: b of: abc]
				ifNone: [nil]) == nil])
					ifTrue: [abstractBases @env0:add: abc]].
	abstractBases @env0:do: [:abc | remaining @env0:remove: abc ifAbsent: []].
	seqs := OrderedCollection @env0:new.
	seqs @env0:add: (OrderedCollection @env0:with: aClass).
	explicitBases @env0:do: [:b |
		seqs @env0:add: (OrderedCollection @env0:withAll:
			(self ___c3MroOf___: b abcs: remaining))].
	abstractBases @env0:do: [:b |
		seqs @env0:add: (OrderedCollection @env0:withAll:
			(self ___c3MroOf___: b abcs: remaining))].
	otherBases @env0:do: [:b |
		seqs @env0:add: (OrderedCollection @env0:withAll:
			(self ___c3MroOf___: b abcs: remaining))].
	seqs @env0:add: (OrderedCollection @env0:withAll: explicitBases).
	seqs @env0:add: (OrderedCollection @env0:withAll: abstractBases).
	seqs @env0:add: (OrderedCollection @env0:withAll: otherBases).
	^ self ___c3Merge___: seqs

]

{ #category : 'Grail-ABC MRO' }
functools >> ___c3TailIncludes___: aSequence of: anObject [
	"anObject appears in aSequence AFTER its head.  Spelled out rather than
	``allButFirst includes:'' to avoid a copy per probe, and to compare by
	IDENTITY: C3 orders classes, and Grail has distinct classes that answer
	equal Python names."

	2 @env0:to: aSequence @env0:size do: [:i |
		(aSequence @env0:at: i) == anObject ifTrue: [^ true]].
	^ false

]

{ #category : 'Grail-ABC MRO' }
functools >> ___collectVisibleBasesOf___: aClass root: aRoot into: out depth: aDepth [
	"Recursive worker for ___pyVisibleBases___.  Depth-capped: the hidden
	chains are shallow (four links at worst), and a bound keeps a cycle in a
	hand-built hierarchy from hanging the dispatcher instead of raising."

	aDepth @env0:> 32 ifTrue: [^ self].
	(aClass __bases__) @env0:do: [:b |
		(self ___isHiddenBase___: b of: aRoot)
			ifTrue: [
				self ___collectVisibleBasesOf___: b root: aRoot into: out
					depth: aDepth @env0:+ 1]
			ifFalse: [
				(out @env0:includesIdentical: b) ifFalse: [out @env0:add: b]]]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___composeMroOf___: aClass types: types [
	"CPython's functools._compose_mro: aClass's linearization with the
	RELEVANT entries of ``types'' (a dispatch registry's keys) spliced in.

	Three filters, then the C3 walk:
	  * drop anything already in aClass's own mro, anything that is not a
	    class, and anything aClass is not a subclass of.  Requiring a class
	    is what drops a bare builtin-type name -- ``str'' reaches a registry
	    as a BoundMethod, not a class -- and stands in for CPython's
	    hasattr(typ, '__mro__') and its GenericAlias check;
	  * drop entries that are strict bases of other entries: they arrive in
	    the linearization anyway, via the entry that supersedes them;
	  * stabilize the ORDER of the survivors.  Two ABCs that are unrelated to
	    each other have no intrinsic order, so a subclass of both that aClass
	    also implements is used to impose one: Collection orders (Sized,
	    Container) for a dict, which is what makes defaultdict's composed mro
	    (defaultdict, dict, Sized, Container, object) rather than the reverse."

	| bases related pruned mro |
	bases := aClass __mro__.
	related := OrderedCollection @env0:new.
	types == nil ifFalse: [
		types @env0:do: [:t |
			((t isKindOf: Behavior)
				and: [(bases @env0:includesIdentical: t) @env0:not
				and: [(related @env0:includesIdentical: t) @env0:not
				and: [self ___issubclassOf___: aClass of: t]]])
					ifTrue: [related @env0:add: t]]].
	pruned := related @env0:reject: [:t |
		(related
			@env0:detect: [:other |
				(other ~~ t) and: [(other __mro__) @env0:includesIdentical: t]]
			ifNone: [nil]) @env0:notNil].
	mro := OrderedCollection @env0:new.
	pruned @env0:do: [:t |
		| found |
		found := OrderedCollection @env0:new.
		(self ___pyDirectSubclassesOf___: t) @env0:do: [:sub |
			((bases @env0:includesIdentical: sub) @env0:not
				and: [self ___issubclassOf___: aClass of: sub]) ifTrue: [
					| useful |
					useful := OrderedCollection @env0:new.
					(sub __mro__) @env0:do: [:s |
						(pruned @env0:includesIdentical: s)
							ifTrue: [useful @env0:add: s]].
					found @env0:add: useful]].
		found @env0:isEmpty
			ifTrue: [
				(mro @env0:includesIdentical: t) ifFalse: [mro @env0:add: t]]
			ifFalse: [
				(self ___sortByLengthDescending___: found) @env0:do: [:each |
					each @env0:do: [:subcls |
						(mro @env0:includesIdentical: subcls)
							ifFalse: [mro @env0:add: subcls]]]]].
	^ self ___c3MroOf___: aClass abcs: mro

]

{ #category : 'Grail-ABC MRO' }
functools >> ___cpythonClassRepr___: aClass [
	"A class rendered the way CPython's type.__repr__ does --
	<class 'collections.abc.Container'>, with ``builtins'' omitted -- because
	the ambiguity message below is asserted VERBATIM by test_mro_conflicts.

	Rendered here rather than by fixing Grail's global class repr, which
	answers <Container class object>.  Changing that would alter what every
	corpus test sees whenever it prints a class; it is a real difference and
	worth its own change, measured on its own.  This one is scoped to the
	message."

	| m n |
	n := self ___pyNameOf___: aClass.
	m := self ___pyModuleOf___: aClass.
	^ (m == nil or: [m @env0:asString @env0:= 'builtins'])
		ifTrue: ['<class ''' @env0:, n @env0:, '''>']
		ifFalse: ['<class ''' @env0:, m @env0:asString @env0:, '.'
			@env0:, n @env0:, '''>']

]

{ #category : 'Grail-ABC MRO' }
functools >> ___findImplFor___: aClass registry: reg [
	"CPython's functools._find_impl: the most specific registered
	implementation for aClass, chosen over the mro _compose_mro builds -- so
	ABC registrations are ordered by specificity rather than by hash order.

	Answers nil when nothing matches.  CPython answers None there, but only
	reaches it when its registry lacks an ``object'' entry; its registry
	always has one, because singledispatch seeds the registry with the
	default.  Grail keeps the default in its own slot, so nil is the normal
	``fall through to the default'' answer and the caller supplies it.

	Raises RuntimeError for an ambiguous dispatch exactly where CPython does:
	once a match is found, the NEXT registered class in the linearization
	makes it ambiguous -- unless one of the two is on aClass's own __mro__
	(an explicit base wins outright), or the match is a subclass of it (more
	specific, so it legitimately wins)."

	| mro ownMro match |
	mro := self ___composeMroOf___: aClass
		types: (self ___sortByPyName___: reg @env0:keys).
	ownMro := [aClass __mro__]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: #()].
	match := nil.
	mro @env0:do: [:t |
		match == nil
			ifTrue: [(reg @env0:includesKey: t) ifTrue: [match := t]]
			ifFalse: [
				((reg @env0:includesKey: t)
					and: [(ownMro @env0:includesIdentical: t) @env0:not
					and: [(ownMro @env0:includesIdentical: match) @env0:not
					and: [(self ___issubclassOf___: match of: t) @env0:not]]])
						ifTrue: [
							RuntimeError ___signal___: 'Ambiguous dispatch: '
								@env0:, (self ___cpythonClassRepr___: match)
								@env0:, ' or '
								@env0:, (self ___cpythonClassRepr___: t)].
				^ reg @env0:at: match otherwise: nil]].
	^ match == nil ifTrue: [nil] ifFalse: [reg @env0:at: match otherwise: nil]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___isAbcClass___: aClass [
	"CPython's _c3_mro asks ``hasattr(base, '__abstractmethods__')'' to find
	where a class's explicit ABC bases stop, and so does this now.  It used to
	look for Grail's own _ABCRoot in the mro, because Grail's abc was a stub
	that set __abstractmethods__ on nothing; abc and collections.abc are
	CPython's own now, ABCMeta sets it on every class it builds, and _ABCRoot
	is gone -- so the old test answered false for every class, user ABCs on
	abc.ABC and the numbers tower included."

	^ [aClass ___pyAttrLoad___: #'__abstractmethods__'. true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___isHiddenBase___: aBase of: aClass [
	"True when aBase is a Smalltalk ancestor CPython has no class for, so the
	C3 walk must look THROUGH it at its own bases.  Two kinds:

	  * no __module__ at all -- AbstractDictionary, Collection,
	    SequenceableCollection, PythonInstance;
	  * the builtin TWIN -- one Python class over two Smalltalk classes, the
	    inner one reporting the SAME __name__ and __module__ as the outer
	    (dict is PyDict over KeyValueDictionary).  Collapsing it is what keeps
	    a single ``dict'' in the composed MRO; left alone, dict's own
	    linearization would begin (dict, dict)."

	| baseModule ownModule |
	(aBase isKindOf: Behavior) ifFalse: [^ true].
	baseModule := self ___pyModuleOf___: aBase.
	baseModule == nil ifTrue: [^ true].
	ownModule := self ___pyModuleOf___: aClass.
	^ (ownModule @env0:notNil
		and: [ownModule @env0:asString @env0:= baseModule @env0:asString])
			and: [(self ___pyNameOf___: aBase) @env0:= (self ___pyNameOf___: aClass)]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___issubclassOf___: aSub of: aSuper [
	"issubclass(aSub, aSuper), tolerating a non-class on either side: the
	haystack _compose_mro is handed comes from a registry whose keys can be
	bare builtin-type names (BoundMethods, not classes), and CPython's
	is_related drops whatever has no __mro__ rather than raising."

	(aSub == aSuper) ifTrue: [^ true].
	^ [((builtins @env0:___instance___) issubclass: aSub _: aSuper) == true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-Private' }
functools >> ___lruWrap___: aFunction maxsize: aMaxsize typed: aTyped [
	"Build the cache wrapper AND give it the wrapped function's identifying
	metadata, which is what CPython's lru_cache does as its final step
	(``update_wrapper(wrapper, user_function)'').

	Without the copy a decorated function lost its identity: ``square.
	__name__'' / ``__doc__'' / ``__module__'' all raised AttributeError on
	the LruCacheWrapper (test_lru_cache_decoration compares every one of
	WRAPPER_ASSIGNMENTS between the cached function and the original)."

	^ self
		___updateWrapper___: (LruCacheWrapper
			___wrap___: aFunction maxsize: aMaxsize typed: aTyped)
		wrapped: aFunction
		assigned: self WRAPPER_ASSIGNMENTS
		updated: self WRAPPER_UPDATES

]

{ #category : 'Grail-Total Ordering' }
functools >> ___orderingDerivablesFrom___: root [
	"CPython's ``_convert'' table: the three operators each root can supply,
	in upstream's order (which only matters for reading this alongside
	Lib/functools.py -- installation order has no effect)."

	root @env0:== #'__lt__' ifTrue: [^ #( #'__gt__' #'__le__' #'__ge__' )].
	root @env0:== #'__le__' ifTrue: [^ #( #'__ge__' #'__lt__' #'__gt__' )].
	root @env0:== #'__gt__' ifTrue: [^ #( #'__lt__' #'__ge__' #'__le__' )].
	^ #( #'__le__' #'__gt__' #'__lt__' )

]

{ #category : 'Grail-Total Ordering' }
functools >> ___orderingRootsOf___: cls [
	"The ordering dunders ``cls'' supplies itself -- CPython's
	``{op for op in _convert if getattr(cls, op, None) is not getattr(object,
	op, None)}''.  Grail spreads a class dict across three stores, so all
	three have to be asked:

	  * a compiled ``def __lt__'' is an env-1 method; ``object'' owning the
	    selector means the class merely INHERITED the default, which is
	    exactly the ``is getattr(object, op)'' case CPython excludes.
	  * a class-body binding (``__lt__ = _cmp'') becomes a generated unary
	    accessor on the metaclass.  Only the UNARY name is probed: every
	    class answers the binary ``__lt__:'' through object, so testing that
	    would report all four operators on every class.
	  * a runtime ``Cls.__lt__ = f'' lands in the per-class ___dynInstVars___ store
	    (or, for a canonical class, the session overlay) -- both of which
	    ___dynamicClassAttr___ walks."

	^ #( #'__lt__' #'__le__' #'__gt__' #'__ge__' ) @env0:select: [:op | | owner |
		owner := cls @env0:whichClassIncludesSelector:
			(op @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1.
		(owner @env0:~~ nil and: [owner @env0:~~ object])
			or: [(cls ___respondsTo___: op)
				or: [(cls ___dynamicClassAttr___: op) @env0:~~ nil]]]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___pyDirectSubclassesOf___: aClass [
	"aClass's direct subclasses, Python-visible ones only.  This is what
	``cls.__subclasses__()'' answers (Class.gs's Behavior>>__subclasses__
	delegates straight here), and what _compose_mro's ABC walk consults.

	THREE sources, and all three are needed.

	  * ``subclasses'' -- GemStone's own, i.e. ``ClassOrganizer new
	    subclassesOf: self''.  It finds classes by scanning symbol dictionaries,
	    so it covers the Smalltalk-defined Python classes and the kernel.
	  * importlib's SUBCLASS registry.  Every Python class is created with
	    ``inDictionary: nil'', so the scan above cannot see a single one of them.
	    Until this was added the method silently answered [] for user classes --
	    ``class MySeq(Sequence)'' in a module was invisible to the ABC walk that
	    exists to find exactly that.
	  * importlib's MI registry.  A multiple-inheritance class is chained under
	    its PRIMARY base only, so a SECONDARY base would never see it.
	    collections.abc.Collection is exactly that case: it declares (Sized,
	    Iterable, Container) and is chained under Sized alone, and _compose_mro's
	    whole purpose here is finding it from Container.

	Ordered by Python name.  CPython's __subclasses__ answers definition
	order; GemStone's ``subclasses'' and the identity-keyed MI registry are
	both unordered, so name order is substituted to make the result
	REPRODUCIBLE.  It is only ever a tie-break: the caller sorts by useful-base
	count, and this decides equal counts."

	| out il reg |
	out := OrderedCollection @env0:new.
	(aClass @env0:subclasses) @env0:do: [:s |
		(self ___pyModuleOf___: s) @env0:notNil ifTrue: [out @env0:add: s]].
	il := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #importlib.
	(il @env0:___registeredSubclassesOf___: aClass) @env0:do: [:s |
		((out @env0:includesIdentical: s) @env0:not
			and: [(self ___pyModuleOf___: s) @env0:notNil])
				ifTrue: [out @env0:add: s]].
	reg := il @env0:___miRegistry___.
	reg @env0:keysAndValuesDo: [:sub :entry |
		(((entry @env0:at: 1) @env0:includesIdentical: aClass)
			and: [(out @env0:includesIdentical: sub) @env0:not
			and: [(self ___pyModuleOf___: sub) @env0:notNil]])
				ifTrue: [out @env0:add: sub]].
	^ self ___sortByPyName___: out

]

{ #category : 'Grail-ABC MRO' }
functools >> ___pyModuleOf___: aClass [
	"The Python ``__module__'' of a class, or nil when it reports none.

	Grail presents only SOME of a class's Smalltalk ancestors to Python and
	hides the rest: dict's chain is PyDict -> KeyValueDictionary ->
	AbstractDictionary -> Collection -> Object, and only the two ends of that
	report a module.  Reporting one is therefore the test for ``CPython has a
	class here'', which is what the C3 walk below needs.

	Read through the attribute protocol rather than as a direct send: a class
	with no __module__ accessor gets one from ___pythonBuiltinTypeModule___
	inside ___pyAttrLoad___:, and a class with neither raises Python
	AttributeError -- where a direct Smalltalk send would be an uncatchable
	MessageNotUnderstood."

	^ [aClass ___pyAttrLoad___: #'__module__']
		@env0:on: AttributeError
		do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___pyNameOf___: aClass [
	"The Python ``__name__'' of a class -- NOT its Smalltalk name.  The two
	differ exactly where Grail maps one Python class onto a kernel class:
	KeyValueDictionary answers 'dict'.  Answers '' when there is no name at
	all, so callers can compare without a nil check."

	| n |
	n := [aClass ___pyAttrLoad___: #'__name__']
		@env0:on: AttributeError
		do: [:ex | ex @env0:return: nil].
	^ n == nil ifTrue: [''] ifFalse: [n @env0:asString]

]

{ #category : 'Grail-ABC MRO' }
functools >> ___pyVisibleBases___: aClass [
	"aClass's direct bases AS CPYTHON WOULD REPORT THEM: every hidden
	Smalltalk ancestor replaced, in place, by its own visible bases, with
	duplicates dropped.  dict answers (object), list answers (object) and
	defaultdict answers (dict) -- matching CPython's __bases__ -- where the
	raw Smalltalk chain answers (dict), (SequenceableCollection) and (dict).

	Splicing rather than filtering is what keeps ``object'' reachable: it sits
	BELOW the hidden ancestors, so dropping them without descending would
	strand every builtin's linearization short of its root."

	| out |
	out := OrderedCollection @env0:new.
	self ___collectVisibleBasesOf___: aClass root: aClass into: out depth: 0.
	^ out

]

{ #category : 'Grail-Built-in Functions' }
functools >> ___reduce___: function over: iterable initial: initial hasInitial: hasInitial [
	"CPython's Lib/functools.py reduce, including the part the arity-split
	versions got wrong: an EMPTY iterable with no initial value is a
	TypeError, not the StopIteration that escaped from the first __next__.

	The single-item case never calls the function at all -- ``reduce(42,
	'1')'' answers '1' -- which falls out of seeding from the first element
	and only then looping."

	| iter value |
	iter := iterable __iter__.
	hasInitial
		ifTrue: [value := initial]
		ifFalse: [
			value := [iter __next__] @env0:on: StopIteration do: [:ex |
				ex @env0:return: #'___GrailReduceEmpty___'].
			value @env0:== #'___GrailReduceEmpty___' ifTrue: [
				TypeError ___signal___:
					'reduce() of empty iterable with no initial value']].
	[[| item |
		item := iter __next__.
		value := function ___pyCallValue___: { value. item } kw: nil.
		] repeat]
		@env0:on: StopIteration do: [:ex | "exhausted"].
	^ value

]

{ #category : 'Grail-ABC MRO' }
functools >> ___sortByLengthDescending___: aCollection [
	"Stable descending sort by size -- CPython does ``found.sort(key=len,
	reverse=True)'' and Python's sort is STABLE, so equal-length candidates
	keep their incoming order and that order decides ABC ties.  Written as a
	counting pass rather than a comparison sort because GemStone's sorts are
	not stable."

	| out longest |
	out := OrderedCollection @env0:new.
	longest := 0.
	aCollection @env0:do: [:e |
		e @env0:size @env0:> longest ifTrue: [longest := e @env0:size]].
	longest @env0:to: 0 by: -1 do: [:n |
		aCollection @env0:do: [:e |
			e @env0:size @env0:= n ifTrue: [out @env0:add: e]]].
	^ out

]

{ #category : 'Grail-ABC MRO' }
functools >> ___sortByPyName___: aCollection [
	"Ascending by Python __name__.  Sorted on the NAME rather than on the
	classes themselves: ``<'' is not defined between two classes."

	^ (aCollection @env0:asSortedCollection: [:a :b |
		(self ___pyNameOf___: a) @env0:<= (self ___pyNameOf___: b)])
			@env0:asOrderedCollection

]

{ #category : 'Grail-Private' }
functools >> ___updateWrapper___: wrapper wrapped: wrapped assigned: assigned updated: updated [
	"The body shared by update_wrapper and wraps, following CPython's
	three phases exactly:

	  1. ASSIGN each name in ``assigned``, skipping the ones the wrapped
	     object doesn't have (CPython swallows AttributeError here, which
	     is what lets ``@wraps`` decorate a builtin).
	  2. MERGE each name in ``updated`` -- ``getattr(wrapper, n).update(
	     getattr(wrapped, n, {}))``.  Note the asymmetry: a name missing on
	     the WRAPPED object defaults to an empty dict, but one missing on
	     the WRAPPER raises, and so does a wrapper attribute that has no
	     ``update`` (test_missing_attributes deletes the slot, then sets it
	     to 1, and expects AttributeError both times).  Both errors are
	     produced by going through the attribute protocol rather than by
	     hand-coding a check.
	  3. Set ``__wrapped__`` LAST, so step 2 can't leave the wrapped
	     function's own stale ``__wrapped__`` in place (CPython issue
	     17482).

	Grail's ExecBlock side-table gives closures the __dict__ / __doc__ /
	__type_params__ this needs; see ExecBlockAttrs for why __name__ and
	friends are deliberately NOT __dict__ entries."

	assigned @env0:do: [:name |
		| value found |
		found := true.
		value := [wrapped ___pyAttrLoad___: name @env0:asSymbol]
			@env0:on: AttributeError
			do: [:ex | found := false. ex @env0:return: nil].
		found ifTrue: [wrapper __setattr__: name _: value]].
	updated @env0:do: [:name |
		| target source updater |
		target := wrapper ___pyAttrLoad___: name @env0:asSymbol.
		source := [wrapped ___pyAttrLoad___: name @env0:asSymbol]
			@env0:on: AttributeError do: [:ex | ex @env0:return: dict ___new___].
		"Reach ``update'' through the attribute protocol so a non-mapping
		wrapper attribute raises Python AttributeError, matching
		``getattr(wrapper, n).update(...)''.  A direct Smalltalk send would
		be an uncatchable MessageNotUnderstood instead."
		updater := target ___pyAttrLoad___: #'update'.
		updater ___pyCallValue___: (Array @env0:with: source) kw: nil].
	wrapper __setattr__: '__wrapped__' _: wrapped.
	^ wrapper

]

{ #category : 'Grail-Private' }
functools >> ___wrapperArg___: positional kw: kwargs at: anIndex named: aName default: aDefault [
	"Resolve one of update_wrapper / wraps' optional ``assigned`` /
	``updated`` arguments, accepted either positionally at anIndex or by
	keyword.  An EMPTY tuple is a meaningful value (``wraps(f, (), ())``
	copies nothing), so absence is decided by arity and key presence, never
	by emptiness."

	(kwargs @env0:notNil and: [kwargs @env0:includesKey: aName])
		ifTrue: [^ kwargs @env0:at: aName].
	(positional @env0:notNil and: [positional @env0:size @env0:>= anIndex])
		ifTrue: [^ positional @env0:at: anIndex].
	^ aDefault

]

{ #category : 'Grail-ABC MRO' }
functools >> __c3_mro: positional kw: kwargs [
	"functools._c3_mro(cls, abcs=None).  CPython keeps this private but
	test_functools calls it directly (test_c3_abc), so it is a real module
	function, not just an internal helper.

	Answers a Smalltalk Array; a Python list literal compares equal to one,
	which is what the test's assertEqual asks."

	| cls abcs |
	(positional == nil or: [positional @env0:size @env0:< 1]) ifTrue: [
		TypeError ___signal___:
			'_c3_mro() missing 1 required positional argument: ''cls'''].
	cls := positional @env0:at: 1.
	abcs := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	kwargs == nil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			(k @env0:asString @env0:= 'abcs')
				ifTrue: [abcs := v]
				ifFalse: [
					TypeError ___signal___:
						'_c3_mro() got an unexpected keyword argument '''
							@env0:, k @env0:asString @env0:, '''']]].
	^ self ___c3MroOf___: cls abcs: abcs

]

{ #category : 'Grail-ABC MRO' }
functools >> __compose_mro: positional kw: kwargs [
	"Varargs form of _compose_mro.  CPython's signature is positional-only,
	so a keyword call is a TypeError rather than a silent miss."

	kwargs == nil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			TypeError ___signal___:
				'_compose_mro() takes no keyword arguments']].
	(positional == nil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___:
			'_compose_mro() takes 2 positional arguments'].
	^ self ___composeMroOf___: (positional @env0:at: 1) types: (positional @env0:at: 2)

]

{ #category : 'Grail-ABC MRO' }
functools >> __find_impl: positional kw: kwargs [
	"Varargs form of _find_impl.  CPython's signature is positional-only."

	kwargs == nil ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			TypeError ___signal___: '_find_impl() takes no keyword arguments']].
	(positional == nil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___: '_find_impl() takes 2 positional arguments'].
	^ self ___findImplFor___: (positional @env0:at: 1)
		registry: (positional @env0:at: 2)

]

{ #category : 'Grail-ABC MRO' }
functools >> _c3_mro: aClass [
	"functools._c3_mro(cls) -- the fixed-arity form, for a call with no
	``abcs''.  The varargs companion is __c3_mro:kw: (CallAst builds a
	varargs selector as '_' , name , ':kw:', and the Python name already
	begins with an underscore)."

	^ self ___c3MroOf___: aClass abcs: nil

]

{ #category : 'Grail-Built-in Functions' }
functools >> _cmp_to_key: positional kw: kwargs [
	"Varargs companion: cmp_to_key(mycmp=f) keyword form and
	argument-count errors (test_cmp_to_key)."

	| f |
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: 'cmp_to_key expected 1 argument, got '
			@env0:, positional @env0:size @env0:printString].
	f := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs ~~ nil and: [kwargs @env0:includesKey: 'mycmp'])
				ifTrue: [kwargs @env0:at: 'mycmp']
				ifFalse: [TypeError ___signal___: 'cmp_to_key() missing required argument: mycmp']].
	^ self cmp_to_key: f

]

{ #category : 'Grail-ABC MRO' }
functools >> _compose_mro: aClass _: types [
	"functools._compose_mro(cls, types) -- the fixed-arity form.  Called
	directly by test_functools (test_compose_mro) and by _find_impl."

	^ self ___composeMroOf___: aClass types: types

]

{ #category : 'Grail-ABC MRO' }
functools >> _find_impl: aClass _: reg [
	"functools._find_impl(cls, registry) -- the fixed-arity form.  Private in
	CPython, but test_functools calls it directly (test_cache_invalidation
	compares the dispatcher's cached entry against it)."

	^ self ___findImplFor___: aClass registry: reg

]

{ #category : 'Grail-Built-in Functions' }
functools >> _lru_cache: positional kw: kwargs [
	"Varargs entry — ``lru_cache(maxsize=128, typed=False)'' from user
	code.  Honors BOTH keywords (maxsize default 128, matching CPython);
	``typed'' used to be accepted and discarded here, which is why
	typed=True cached 3 and 3.0 together.  Also accepts typed
	positionally, as ``lru_cache(128, True)''."

	| ms ty |
	ms := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'maxsize'])
		ifTrue: [kwargs @env0:at: 'maxsize']
		ifFalse: [(positional ~~ nil and: [positional @env0:isEmpty @env0:not])
			ifTrue: [positional @env0:at: 1]
			ifFalse: [128]].
	ty := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'typed'])
		ifTrue: [kwargs @env0:at: 'typed']
		ifFalse: [(positional ~~ nil and: [positional @env0:size @env0:>= 2])
			ifTrue: [positional @env0:at: 2]
			ifFalse: [false]].
	^ [:positional2 :keywords2 |
		self ___lruWrap___: (positional2 @env0:at: 1) maxsize: ms typed: ty]

]

{ #category : 'Grail-Built-in Functions' }
functools >> _reduce: positional kw: kwargs [
	"Varargs reduce: the keyword forms and the argument-count errors.

	``initial'' may be passed as a KEYWORD (test_initial_keyword), and CPython
	still accepts ``function'' / ``sequence'' by keyword while warning that it
	is deprecated (test_reduce_with_kwargs).  Wrong counts are TypeErrors
	rather than whatever the fixed-arity dispatch happened to raise."

	| args fn iterable initial hasInitial haveFn haveSeq deprecated |
	args := positional @env0:ifNil: [#()].
	args @env0:size @env0:> 3 ifTrue: [
		TypeError ___signal___: 'reduce() takes at most 3 arguments ('
			@env0:, args @env0:size @env0:printString @env0:, ' given)'].
	haveFn := args @env0:size @env0:>= 1.
	haveSeq := args @env0:size @env0:>= 2.
	fn := haveFn ifTrue: [args @env0:at: 1] ifFalse: [nil].
	iterable := haveSeq ifTrue: [args @env0:at: 2] ifFalse: [nil].
	hasInitial := args @env0:size @env0:>= 3.
	initial := hasInitial ifTrue: [args @env0:at: 3] ifFalse: [nil].
	deprecated := false.
	(kwargs @env0:isNil or: [kwargs @env0:isEmpty]) ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v | | key |
			key := k @env0:asString.
			key @env0:= 'initial'
				ifTrue: [
					hasInitial ifTrue: [
						TypeError ___signal___:
							'reduce() got multiple values for argument ''initial'''].
					initial := v.
					hasInitial := true]
				ifFalse: [key @env0:= 'function'
				ifTrue: [
					haveFn ifTrue: [
						TypeError ___signal___:
							'reduce() got multiple values for argument ''function'''].
					fn := v. haveFn := true. deprecated := true]
				ifFalse: [key @env0:= 'sequence'
				ifTrue: [
					haveSeq ifTrue: [
						TypeError ___signal___:
							'reduce() got multiple values for argument ''sequence'''].
					iterable := v. haveSeq := true. deprecated := true]
				ifFalse: [
					TypeError ___signal___:
						'reduce() got an unexpected keyword argument ''' @env0:, key @env0:, '''']]]]].
	(haveFn and: [haveSeq]) ifFalse: [
		TypeError ___signal___:
			'reduce expected at least 2 arguments, got '
				@env0:, args @env0:size @env0:printString].
	deprecated ifTrue: [
		"CPython 3.14 accepts the old keyword names and warns.  Routed through
		the warnings module so unittest's assertWarns can record it."
		(Python @env0:at: #warnings otherwise: nil) @env0:ifNotNil: [:w |
			w @env0:___instance___
				warn: 'Passing keyword arguments to reduce() is deprecated'
				_: (Python @env0:at: #DeprecationWarning otherwise: nil)]].
	^ self ___reduce___: fn over: iterable initial: initial hasInitial: hasInitial

]

{ #category : 'Grail-Built-in Functions' }
functools >> _update_wrapper: positional kw: kwargs [
	"Varargs form of update_wrapper covering the ``assigned=`` /
	``updated=`` variants, positional or keyword."

	| wrapper wrapped assigned updated |
	(positional @env0:isNil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___:
			'update_wrapper() missing required argument: wrapped'].
	wrapper := positional @env0:at: 1.
	wrapped := positional @env0:at: 2.
	assigned := self ___wrapperArg___: positional kw: kwargs
		at: 3 named: 'assigned' default: self WRAPPER_ASSIGNMENTS.
	updated := self ___wrapperArg___: positional kw: kwargs
		at: 4 named: 'updated' default: self WRAPPER_UPDATES.
	^ self ___updateWrapper___: wrapper wrapped: wrapped
		assigned: assigned updated: updated

]

{ #category : 'Grail-Built-in Functions' }
functools >> _wraps: positional kw: kwargs [
	"Varargs form of wraps covering the ``assigned=`` / ``updated=``
	variants (positional or keyword), used by jinja2.async_utils and by
	CPython decorator chains that narrow what gets copied."

	| wrapped assigned updated |
	(positional @env0:isNil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___: 'wraps() missing required argument: wrapped'].
	wrapped := positional @env0:at: 1.
	assigned := self ___wrapperArg___: positional kw: kwargs
		at: 2 named: 'assigned' default: self WRAPPER_ASSIGNMENTS.
	updated := self ___wrapperArg___: positional kw: kwargs
		at: 3 named: 'updated' default: self WRAPPER_UPDATES.
	^ [:positional2 :keywords2 |
		self ___updateWrapper___: (positional2 @env0:at: 1)
			wrapped: wrapped assigned: assigned updated: updated]

]

{ #category : 'Grail-Built-in Functions' }
functools >> cache: aFunction [
	"``@cache'' (Python 3.9+) — shorthand for ``@lru_cache(maxsize=None)''
	with an unbounded cache."

	^ self ___lruWrap___: aFunction maxsize: None typed: false

]

{ #category : 'Grail-Built-in Functions' }
functools >> cmp_to_key: mycmp [
	"cmp_to_key(cmp) -> a key factory: key(x) wraps x so comparisons
	route through cmp (sorted/min/max with old-style comparators --
	test_functools exercises it directly)."

	^ [:___p___ :___k___ |
		| w o |
		"K wraps exactly one object.  Too MANY arguments was accepted silently,
		quietly ignoring everything past the first (test_cmp_to_key_arguments
		asserts both directions)."
		(___p___ ~~ nil and: [___p___ @env0:size @env0:> 1]) ifTrue: [
			TypeError ___signal___: 'K() takes exactly one argument ('
				@env0:, ___p___ @env0:size @env0:printString @env0:, ' given)'].
		o := (___p___ ~~ nil and: [___p___ @env0:size @env0:>= 1])
			ifTrue: [___p___ @env0:at: 1]
			ifFalse: [
				(___k___ ~~ nil and: [___k___ @env0:includesKey: 'obj'])
					ifTrue: [___k___ @env0:at: 'obj']
					ifFalse: [TypeError ___signal___: 'K() missing required argument: obj']].
		w := functools_cmpkey @env0:new.
		w @env0:dynamicInstVarAt: #obj put: o.
		w @env0:dynamicInstVarAt: #cmp put: mycmp.
		w]
		"CPython's cmp_to_key returns a CLASS K whose __init__ takes ``obj'',
		so inspect.signature reports ``(obj)''.  Grail returns a block, which
		carries the same def-time spec a nested def would."
		@env0:___pySig___: { { 'obj' . 1 } }

]

{ #category : 'Grail-Initialization' }
functools >> initialize [
	"Bind the partial class.  The module attribute load falls through
	to SymbolDictionary storage once no partial:/-varargs methods
	shadow it, so ``functools.partial`` / ``from functools import
	partial`` yield the CLASS."

	| holder present |
	self @env0:at: #partial put: functools_partial.
	"_CacheInfo: the named 4-tuple class lru_cache.cache_info() returns
	and test code constructs directly."
	"partialmethod: the CLASS, published the same way partial is.  It has to
	be the SymbolDictionary entry rather than a module method, because a
	method of that name SHADOWS the entry -- and a method cannot be
	subclassed or instantiated through Grail's __new__ protocol."
	self @env0:at: #partialmethod put: functools_partialmethod.
	self @env0:at: #'_CacheInfo' put: functools_CacheInfo.
	"Placeholder: the singleton sentinel for reserved positional slots
	in partial (Python 3.14).  Its type is functools_Placeholder;
	``Placeholder'' is that type's sole instance."
	self @env0:at: #Placeholder put: functools_Placeholder ___singleton___.
	"cached_property: the CLASS, published the same way partial is.  It has
	to be the SymbolDictionary entry rather than a module method, because a
	method of that name SHADOWS the entry -- and a method cannot be
	subclassed or instantiated through Grail's __new__ protocol."
	self @env0:at: #cached_property put: functools_cached_property.
	"RLock: CPython's functools does ``from _thread import RLock'' and
	test_functools constructs one (``self.lock = py_functools.RLock()''),
	so the name is part of the module's surface."
	self @env0:at: #RLock put: PyThreadRLock.
	"``__hash__ = None'' as a class ATTRIBUTE, matching CPython's class dict for
	the cmp_to_key wrapper.  The raising __hash__ method above is what a hash
	SEND finds; this is what READS of the attribute see, and reads are what
	collections.abc.Hashable consults (``getattr(x, '__hash__') is not None'').
	Without it isinstance(k, Hashable) stayed True even though hash(k) raised --
	test_functools TestCmpToKey.test_hash asserts both.

	Safe to sit alongside the method because object >> ___classChainAttrLookup___
	resolves in MRO order and excludes the attribute's OWN class from the
	nearer-method check: an attribute assigned over a method on the SAME class
	is CPython's last-write-wins, so the attribute is the class-dict entry.

	Store only when the holder does not already carry the name: the holder is
	the COMMITTED class-attribute store, and this initialize runs once per
	session (module singletons are session-local), so an unconditional
	re-store of the same value dirtied every session's transaction at its
	first import -- System needsCommit answered true before the user had
	written anything, which gemdb's transaction-entry check would misread
	as pending user data."
	present := false.
	holder := functools_cmpkey @env0:perform: #'___dynInstVars___' env: 1.
	holder == nil ifFalse: [
		present := holder @env0:dynamicInstanceVariables @env0:includesIdentical: #'__hash__'].
	present ifFalse: [
		functools_cmpkey @env1:___classHolderAttrStore___: #'__hash__' put: None]

]

{ #category : 'Grail-Built-in Functions' }
functools >> lru_cache: maxsize [
	"lru_cache(maxsize) -> decorator.  The decorator wraps the user
	function in a LruCacheWrapper that memoizes results and exposes
	``cache_clear`` / ``cache_info``.

	``@lru_cache`` (bare, no parens) passes the FUNCTION directly as
	the sole argument -- CPython supports both that and
	``@lru_cache(maxsize=N)''.  The bare form uses CPython's default
	bound of 128; the ``(maxsize=N)'' form uses N.  ``maxsize'' is
	normally an Integer or None; anything else is the bare-decorator
	function, so wrap it immediately (default 128).  django.views.debug
	uses the bare form."

	((maxsize isKindOf: Integer)
		or: [maxsize == nil or: [maxsize == None]]) ifFalse: [
		^ self ___lruWrap___: maxsize maxsize: 128 typed: false].
	^ [:positional2 :keywords2 |
		self ___lruWrap___: (positional2 @env0:at: 1) maxsize: maxsize typed: false]

]

{ #category : 'Grail-Built-in Functions' }
functools >> reduce: function _: iterable [
	"reduce(function, iterable) -> value.
	Apply function of two arguments cumulatively to the items of
	iterable, from left to right."

	^ self ___reduce___: function over: iterable initial: nil hasInitial: false

]

{ #category : 'Grail-Built-in Functions' }
functools >> reduce: function _: iterable _: initial [
	"reduce(function, iterable, initial) -> value.
	Like reduce/2 but uses initial as the starting value."

	^ self ___reduce___: function over: iterable initial: initial hasInitial: true

]

{ #category : 'Grail-Single Dispatch' }
functools >> singledispatch: aFunc [
	"functools.singledispatch(func) -- generic-function decorator.
	Returns a wrapper that dispatches on the TYPE of its first
	positional argument, walking that type's __mro__ (C3-aware for MI
	classes) for the most specific registered implementation and
	falling back to func.

	The wrapper carries the wrapped function's identifying metadata, as
	CPython's does (``update_wrapper(wrapper, func)'' is singledispatch's
	last step).  Without it ``g.__name__'' / ``g.__doc__'' raised
	AttributeError on the wrapper (test_wrapping_attributes), and the
	arity error below could not name the function."

	^ self
		___updateWrapper___: (functools_singledispatch ___on: aFunc)
		wrapped: aFunc
		assigned: self WRAPPER_ASSIGNMENTS
		updated: self WRAPPER_UPDATES

]

{ #category : 'Grail-Single Dispatch' }
functools >> singledispatchmethod: aFunc [
	"functools.singledispatchmethod(func) -- singledispatch for a METHOD.

	Same generic-function machinery as singledispatch, dispatching on the
	first argument AFTER the receiver rather than on the receiver itself.

	Applies to a plain instance method.  ``@singledispatchmethod
	@classmethod'' and ``@singledispatchmethod @staticmethod'' are not
	supported: Grail consumes those inner decorators at PARSE time by
	re-classing the def onto the metaclass, so no instance-side method
	survives for this decorator to wrap.  Those stacks keep the behaviour
	they had while this decorator did not exist at all -- the class-body
	decorator handler drops the application and the undecorated method
	stays in place."

	^ functools_singledispatchmethod ___on: aFunc

]

{ #category : 'Grail-Total Ordering' }
functools >> total_ordering: cls [
	"functools.total_ordering(cls) -- fill in the rich comparisons the class
	does not define, deriving each from __eq__ plus the one ordering method
	it does define.

	This used to pass the class straight through, on the theory that Grail's
	pairwise fallback (``a <= b'' reflects to ``b.__ge__(a)'') already covered
	it.  It does not: a class defining only __lt__ has no __ge__ to reflect
	INTO, so ``a <= b'' raised ``'<=' not supported between instances of 'A'
	and 'A''' -- and the whole point of the decorator is that the other five
	operators start working.  test_functools' four test_total_ordering_xx
	cases each assert all six comparisons.

	Follows CPython's algorithm exactly:
	  * ``roots'' = the ordering operators the class defines ITSELF (CPython
	    tests ``getattr(cls, op) is not getattr(object, op)'').
	  * no roots at all is a ValueError, not a silent no-op.
	  * the root is ``max(roots)'' -- lexicographically that prefers __lt__
	    to __le__ to __gt__ to __ge__.
	  * an operator already in roots is never overwritten
	    (test_total_ordering_no_overwrite: ``class A(int)'' inherits all four
	    from int, so nothing is synthesised)."

	| roots root |
	roots := self ___orderingRootsOf___: cls.
	roots @env0:isEmpty ifTrue: [
		ValueError ___signal___:
			'must define at least one ordering operation: < > <= >='].
	"``max(roots)'' over the four dunder names, spelled as the preference
	order it produces rather than as a string sort."
	root := (#( #'__lt__' #'__le__' #'__gt__' #'__ge__' )
		@env0:detect: [:op | roots @env0:includes: op] ifNone: [nil]).
	(self ___orderingDerivablesFrom___: root) @env0:do: [:op |
		(roots @env0:includes: op) ifFalse: [
			cls ___pyAttrStore___: op @env0:asString
				put: (functools_ordering_op ___derived___: op from: root)]].
	^ cls

]

{ #category : 'Grail-Built-in Functions' }
functools >> update_wrapper: wrapper _: wrapped [
	"functools.update_wrapper(wrapper, wrapped) — copy the
	WRAPPER_ASSIGNMENTS metadata from wrapped onto wrapper, merge
	WRAPPER_UPDATES (``__dict__``), and set ``wrapper.__wrapped__``.
	The decorator ecosystem (jinja2's ``optimizeconst``, every
	``@wraps``-using library) leans on this at module-init time."

	^ self ___updateWrapper___: wrapper wrapped: wrapped
		assigned: self WRAPPER_ASSIGNMENTS
		updated: self WRAPPER_UPDATES

]

{ #category : 'Grail-Constants' }
functools >> WRAPPER_ASSIGNMENTS [
	"Tuple of attribute names ``functools.update_wrapper`` copies from
	wrapped to wrapper.  Also read directly by callers that splice it into
	a decorator's own signature (jinja2.compiler).

	CPython 3.14's list exactly.  ``__annotate__'' rather than
	``__annotations__'' is the whole point of PEP 649 here: copying the
	annotate FUNCTION hands the wrapper the wrapped function's deferred
	computation, so an annotation naming something not yet bound is still
	unresolved on the wrapper and resolves later for both.  Copying the
	computed dict instead would have forced evaluation at wrap time.

	check_wrapper asserts identity for every name in this list, so the
	wrapper and the wrapped must end up sharing the very same annotate
	function -- which is why it is stamped once at def-time rather than
	rebuilt per read."

	^ tuple @env0:withAll: #('__module__' '__name__' '__qualname__' '__doc__' '__annotate__' '__type_params__')

]

{ #category : 'Grail-Constants' }
functools >> WRAPPER_UPDATES [
	"Tuple of attribute names ``functools.update_wrapper`` MERGES
	from wrapped into wrapper (default: just ``__dict__``)."

	^ tuple @env0:withAll: #('__dict__')

]

{ #category : 'Grail-Built-in Functions' }
functools >> wraps: wrapped [
	"wraps(wrapped) → decorator that copies identifying metadata from
	wrapped onto the wrapper it is applied to."

	^ [:positional :keywords |
		self ___updateWrapper___: (positional @env0:at: 1)
			wrapped: wrapped
			assigned: self WRAPPER_ASSIGNMENTS
			updated: self WRAPPER_UPDATES]

]
