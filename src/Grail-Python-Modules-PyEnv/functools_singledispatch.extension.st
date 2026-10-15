Extension { #name : 'functools_singledispatch' }

{ #category : 'Grail-Instance Creation' }
functools_singledispatch class >> ___on: aFunc [
	| inst |
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #default put: aFunc.
	inst @env0:dynamicInstVarAt: #registry put: IdentityKeyValueDictionary @env0:new.
	inst @env0:dynamicInstVarAt: #dispatchCache put: IdentityKeyValueDictionary @env0:new.
	inst @env0:dynamicInstVarAt: #abcCacheToken put: nil.
	^ inst

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch class >> ___resolveDottedName___: aString [
	"Resolve a DOTTED name like ``collections.abc.Mapping'' to the class it names,
	or nil.  Class-side so it can be exercised directly."

	| parts mods |
	parts := aString @env0:asString @env0:subStrings: '.'.
	parts @env0:size @env0:< 2 ifTrue: [^ nil].
	mods := (System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: #importlib) @env1:modules.
	mods == nil ifTrue: [^ nil].
	(parts @env0:size @env0:- 1) @env0:to: 1 @env0:by: -1 @env0:do: [:split |
		| modName mod obj ok |
		modName := ''.
		1 @env0:to: split @env0:do: [:i |
			modName := modName @env0:isEmpty
				ifTrue: [(parts @env0:at: i) @env0:asString]
				ifFalse: [modName @env0:, '.' @env0:, (parts @env0:at: i) @env0:asString]].
		mod := mods @env0:at: modName @env0:asString otherwise: nil.
		mod == nil ifFalse: [
			obj := mod.
			ok := true.
			(split @env0:+ 1) @env0:to: parts @env0:size @env0:do: [:i |
				ok ifTrue: [
					obj := [obj @env1:___pyAttrLoad___: (parts @env0:at: i) @env0:asString @env0:asSymbol]
						@env0:on: AbstractException
						do: [:ex | ex @env0:return: nil].
					obj == nil ifTrue: [ok := false]]].
			(ok and: [obj @env0:isKindOf: Behavior]) ifTrue: [^ obj]]].
	^ nil

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___annotationSourceStrings___: aFunc [
	"aFunc's annotations as SOURCE TEXT -- PEP 649's ``Format.STRING'' --
	or nil when aFunc has none or they cannot be obtained.

	Asking the annotate function for STRING rather than reading
	``__annotations__'' matters because STRING never evaluates anything:
	an annotation naming something not yet bound is exactly the forward
	reference this method has to diagnose, and evaluating it would raise
	NameError here instead.

	Falls back to ``__annotations__'' for a callable with no annotate
	function -- a method reached through a BoundMethod keeps its
	annotations on the defining class rather than carrying one."

	| annotate |
	annotate := [aFunc @env1:__annotate__]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(annotate isKindOf: ExecBlock) ifFalse: [
		^ [aFunc __annotations__]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	^ [annotate @env0:value: { 4 } value: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___annotationUnionMemberNames___: aText [
	"The member NAMES of a union annotation, or nil when aText is not one.
	Shares its parse with ___annotationUnionOfClasses___:, which decides
	whether the union is admissible at all."

	| inner bar bracket |
	bar := '|' @env0:at: 1.
	bracket := '[' @env0:at: 1.
	inner := nil.
	(aText @env0:includes: bar) ifTrue: [inner := aText].
	inner == nil ifTrue: [
		(((aText @env0:indexOfSubCollection: 'typing.Union[') == 1)
			or: [(aText @env0:indexOfSubCollection: 'typing.Optional[') == 1])
			ifFalse: [^ nil].
		inner := aText
			@env0:copyFrom: ((aText @env0:indexOf: bracket) @env0:+ 1)
			to: (aText @env0:size @env0:- 1)].
	^ (inner @env0:subStrings: '|,') @env0:collect: [:m | m @env0:trimSeparators]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___annotationUnionMembers___: aText [
	"The member CLASSES of a union annotation -- ``str | bytes'',
	``typing.Union[str, None]'', ``typing.Optional[int]'' -- as an Array, or
	nil when aText is not a union or a member will not resolve.

	CPython registers a union by registering each member separately, so this
	is all singledispatch needs; there is no union object in the registry."

	| members resolved |
	(self ___annotationUnionOfClasses___: aText) ifFalse: [^ nil].
	members := self ___annotationUnionMemberNames___: aText.
	members @env0:isNil ifTrue: [^ nil].
	resolved := OrderedCollection @env0:new.
	members @env0:do: [:name | | cls |
		cls := self ___resolveAnnotationClass___: name.
		cls @env0:isNil ifTrue: [^ nil].
		resolved @env0:add: cls].
	resolved @env0:isEmpty ifTrue: [^ nil].
	^ resolved @env0:asArray

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___annotationUnionOfClasses___: aText [
	"True when aText is a union annotation whose members are all plain class
	names -- ``typing.Union[int, str]'', ``typing.Optional[str]'', ``int |
	str''.  CPython ACCEPTS these in register() and dispatches for each
	member; Grail cannot yet, so the caller leaves them unregistered rather
	than raising on valid code.

	False for a union with a SUBSCRIPTED member (``list[int] | str'',
	``typing.List[float] | bytes''), which CPython rejects -- ``not all
	arguments are classes''.  That distinction is the whole point: a bare
	``contains a bracket'' test would reject every union too, since
	``typing.Union[int, str]'' has brackets as well."

	| inner members bar bracket |
	"The two characters come from indexing one-character STRINGS.
	``Character value:'' would be the obvious spelling and works on 4.0, but it
	does not exist on 3.7.5 -- ``a Character class does not understand
	#value:'' -- so it broke every caller of this method there while passing
	locally on 4.0.  ``withValue:'' and ``codePoint:'' both exist on 3.7.5 and
	4.0, and so does a bare $| literal; ``at: 1'' on a String literal is used
	here because it needs neither a version-specific selector nor a $| literal,
	which the source tooling misreads as an unclosed parenthesis."
	bar := '|' @env0:at: 1.
	bracket := '[' @env0:at: 1.
	inner := nil.
	(aText @env0:includes: bar) ifTrue: [inner := aText].
	inner == nil ifTrue: [
		(((aText @env0:indexOfSubCollection: 'typing.Union[') == 1)
			or: [(aText @env0:indexOfSubCollection: 'typing.Optional[') == 1])
			ifFalse: [^ false].
		inner := aText
			@env0:copyFrom: ((aText @env0:indexOf: bracket) @env0:+ 1)
			to: (aText @env0:size @env0:- 1)].
	"subStrings: takes any collection of separator characters, so the two
	separators are given as a plain two-character String."
	members := (inner @env0:subStrings: '|,')
		@env0:collect: [:m | m @env0:trimSeparators].
	members @env0:isEmpty ifTrue: [^ false].
	"A subscripted member means this is not a union of plain classes."
	members @env0:do: [:m | (m @env0:includes: bracket) ifTrue: [^ false]].
	^ true

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___checkAbcCacheToken___ [
	"Drop the cache when abc.get_cache_token() has moved, i.e. when SOMETHING
	has been registered on an ABC since the last dispatch.  Such a
	registration never reaches this object, yet it can change what a cached
	class should dispatch to.

	Read straight off the already-imported abc module: dispatching must not
	trigger an import, and a session that has never imported abc cannot have
	registered anything on an ABC either, so a missing module means the token
	cannot have moved."

	| abcModule token seen |
	abcModule := ((System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: #importlib) @env1:modules)
			@env0:at: 'abc' otherwise: nil.
	abcModule == nil ifTrue: [^ self].
	"abc.get_cache_token(), the public spelling CPython's singledispatch uses.
	This read a module global, _abc_invalidation_counter, that only Grail's
	old stub abc kept; with CPython's abc the counter is ABCMeta's, the read
	answered nothing, and the cache was never dropped -- so a class registered
	on an ABC after its first dispatch kept dispatching the old way
	(test_functools test_mro_conflicts)."
	token := [(abcModule ___pyAttrLoad___: #'get_cache_token')
			___pyCallValue___: #() kw: nil]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	token == nil ifTrue: [^ self].
	seen := self @env0:dynamicInstVarAt: #abcCacheToken.
	(seen @env0:= token) ifTrue: [^ self].
	self @env0:dynamicInstVarAt: #abcCacheToken put: token.
	self ___clearDispatchCache___

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___clearDispatchCache___ [
	"Every register() invalidates every cached decision: a newly registered
	class can be more specific than one already resolved and cached."

	self @env0:dynamicInstVarAt: #dispatchCache
		put: IdentityKeyValueDictionary @env0:new

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___dispatchName___ [
	"The wrapped function's name for error messages, falling back to a
	generic label if update_wrapper never ran (a wrapper built directly via
	___on:)."

	^ (self @env0:dynamicInstVarAt: #'__name__')
		@env0:ifNil: ['singledispatch function']

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___inferRegisterType___: aFunc [
	"Infer the dispatch type for the annotation form of register from
	aFunc's first-parameter annotation (__annotations__ minus the
	``return'' entry).  A forward-reference annotation (a string) is
	resolved against the Python globals.  Raises TypeError when no
	usable annotation is present -- CPython requires the first
	parameter be annotated with a class in this form.

	The FIRST parameter's annotation is the one that counts, and Grail's
	annotation dicts ARE insertion-ordered (verified: ``def f(a: int,
	b: str) -> bool'' yields keys a, b, return in that order), so the first
	non-``return'' key is that parameter.  This used to keep the LAST entry
	instead -- the loop overwrote its candidate -- on the belief that the
	dict was hash-ordered.  So ``def _(arg: str, arg2: undefined = None)''
	inferred from ARG2, whose unresolvable annotation then silently became
	the registry key and the registration never matched anything
	(test_forward_reference).

	An annotation that cannot be resolved to a class is a TypeError, not a
	silent string key -- two distinct cases, because CPython distinguishes
	them and so do the tests:
	  * subscripted or unioned (``list[int]'', ``typing.List[float] |
	    bytes'') -- not a class, and never will be
	    (test_register_genericalias_annotation);
	  * a bare unresolved name -- an unresolved forward reference
	    (test_unresolved_forward_reference).
	This reads the annotations in PEP 649's ``Format.STRING'' -- the source
	text -- rather than ``__annotations__'', which since PEP 649 answers
	VALUES.  The source text is what makes the first case detectable at
	all: ``arg: list[int]'' arrives as the string ``list[int]'', whereas
	its VALUE is just ``list'' -- Grail's __class_getitem__ is an identity
	stub, so ``list[int] is list'' and a subscripted annotation would
	silently register the unsubscripted class instead of raising.  When
	__class_getitem__ answers real PyGenericAlias objects for these
	classes, this can read values and test them directly."

	| ann candidate paramName text |
	ann := self ___annotationSourceStrings___: aFunc.
	(ann @env0:isNil or: [ann @env0:isEmpty]) ifTrue: [
		TypeError ___signal___:
			(self ___invalidRegisterMessage___: aFunc)].
	candidate := nil.
	paramName := nil.
	ann @env0:keysAndValuesDo: [:k :v |
		(paramName @env0:isNil and: [(k @env0:asString @env0:= 'return') @env0:not])
			ifTrue: [paramName := k @env0:asString. candidate := v]].
	candidate @env0:isNil ifTrue: [
		TypeError ___signal___:
			(self ___invalidRegisterMessage___: aFunc)].
	"Resolve a forward-reference string against the Python globals."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		text := candidate @env0:asString.
		candidate := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: candidate @env0:asSymbol) @env0:ifNil: [candidate]].
	"Still a string, and DOTTED?  ``collections.abc.Mapping'' -- written either as
	an expression or as a quoted forward reference -- arrives whole, and neither
	the symbol list above nor the bare-name probe below can resolve it: one holds
	no dotted keys, the other would look for an attribute literally named
	``collections.abc.Mapping''.  Walk it instead."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		| walked |
		walked := (self @env0:class) ___resolveDottedName___: candidate @env0:asString.
		walked == nil ifFalse: [candidate := walked]].
	"Still a string?  ABC names ('Mapping', 'Sequence', ...) live as
	classes on the collections.abc module, not in the symbol list --
	resolve through sys.modules when that module has been imported."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		| cabc resolved |
		cabc := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #importlib) modules
			@env0:at: #'collections.abc' otherwise: nil.
		cabc == nil ifFalse: [
			resolved := cabc @env0:dynamicInstVarAt: candidate @env0:asString @env0:asSymbol.
			(resolved ~~ nil and: [resolved isKindOf: Behavior])
				ifTrue: [candidate := resolved]]].
	"A UNION of plain classes registers once per member -- that is how CPython
	dispatches ``str | bytes'': no union object goes into the registry, each
	class does, all pointing at the same implementation.  Grail used to leave
	these UNREGISTERED (valid CPython, so raising was worse) and every call
	quietly fell through to the default."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		(self ___annotationUnionMembers___: text)
			@env0:ifNotNil: [:members | ^ members]].
	"Unresolvable: raise rather than register an unusable string key -- EXCEPT
	for a union whose members are classes Grail could not resolve, which is
	still valid CPython.  Raising there would turn working user code into a
	hard error; leaving it unregistered keeps the previous (soft) behaviour of
	falling through to the default implementation.  See
	___annotationUnionOfClasses___: for why this needs its own test."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		(self ___annotationUnionOfClasses___: text) ifFalse: [
			"A UNION whose members are not all classes has its own CPython wording,
			naming the members joined by ``|'' rather than echoing the annotation:

			    Invalid annotation for 'arg'. int | typing.Iterable[str] not all
			    arguments are classes.

			Checked BEFORE the subscript test below, because a union spelled
			``typing.Union[...]'' contains brackets and would otherwise be reported
			as a single non-class."
			(self ___annotationUnionMemberNames___: text)
				@env0:ifNotNil: [:names |
					TypeError ___signal___: 'Invalid annotation for ''' @env0:, paramName
						@env0:, '''. ' @env0:, (self ___joinWithBars___: names)
						@env0:, ' not all arguments are classes.'].
			(text @env0:includes: $[) ifTrue: [
				TypeError ___signal___: 'Invalid annotation for ''' @env0:, paramName
					@env0:, '''. ' @env0:, text @env0:, ' is not a class.'].
			TypeError ___signal___: 'Invalid annotation for ''' @env0:, paramName
				@env0:, '''. ' @env0:, text
				@env0:, ' is an unresolved forward reference.']].
	^ (self ___registryKey___: candidate) @env0:ifNil: [candidate]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___invalidRegisterMessage___: anOffender [
	"CPython names the OFFENDING argument and says what to do instead:

	    Invalid first argument to `register()`: 42. Use either
	    `@register(some_class)` or plain `@register` on an annotated function.

	Grail described the diagnosis instead (``no type annotation found''), which
	reads fine but is not what callers match on."

	^ ('Invalid first argument to `register()`: '
		@env0:, (self ___safeRepr___: anOffender)
		@env0:, '. Use either `@register(some_class)` or plain `@register` on an '
		@env0:, 'annotated function.') @env0:asString

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___joinWithBars___: names [
	"``int | typing.Iterable[str]'' -- union members as CPython prints them in
	the invalid-annotation message."

	| out |
	out := WriteStream @env0:on: String @env0:new.
	names @env0:doWithIndex: [:n :i |
		i @env0:> 1 ifTrue: [out @env0:nextPutAll: ' | '].
		out @env0:nextPutAll: n @env0:asString].
	^ out @env0:contents

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___registryKey___: aKey [
	"Normalize a registration key to a CLASS.  Bare builtin-type names
	(str, int, ...) reach here as first-class BoundMethods wrapping the
	builtins constructor; map the selector back through the Python
	symbol dictionary to the class it names."

	| sel resolved |
	(aKey isKindOf: Behavior) ifTrue: [^ aKey].
	(aKey isKindOf: BoundMethod) ifTrue: [
		sel := aKey @env0:selector.
		resolved := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #Python) @env0:at: sel @env0:asSymbol otherwise: nil.
		(resolved @env0:notNil and: [resolved isKindOf: Behavior]) ifTrue: [
			^ resolved]].
	^ nil

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___resolveAnnotationClass___: aName [
	"Resolve one annotation NAME to a class, or nil.  The same three places
	___inferRegisterType___ looks: ``None'' names NoneType (CPython treats
	``X | None'' as a union with type(None)), then the Python symbol list,
	then collections.abc for the ABC names that live only on that module."

	| text resolved cabc |
	text := aName @env0:asString.
	(text @env0:= 'None' or: [text @env0:= 'NoneType']) ifTrue: [
		^ Python @env0:at: #NoneType otherwise: nil].
	resolved := (System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: text @env0:asSymbol).
	(resolved @env0:notNil and: [resolved isKindOf: Behavior]) ifTrue: [
		^ resolved].
	cabc := (System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: #importlib) modules
		@env0:at: #'collections.abc' otherwise: nil.
	cabc == nil ifFalse: [
		resolved := cabc @env0:dynamicInstVarAt: text @env0:asSymbol.
		(resolved ~~ nil and: [resolved isKindOf: Behavior]) ifTrue: [
			^ resolved]].
	^ nil

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> ___safeRepr___: anObject [
	"repr(anObject) as a plain String, falling back to the class name when repr
	raises or answers something unusable -- an error message must not fail while
	being built, and the result is concatenated with String literals."

	^ [(anObject @env1:__repr__) @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: anObject @env0:class @env0:name @env0:asString]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> _register: positional kw: kwargs [
	positional @env0:size @env0:>= 2 ifTrue: [
		^ self register: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	^ self register: (positional @env0:at: 1)

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> dispatch: cls [
	"The most specific registered implementation for cls, else the default.

	Resolved by _find_impl over the COMPOSED mro, as CPython does: an ABC
	registration is ordered by SPECIFICITY rather than by whichever matching
	key a hash walk happened to reach first, and two equally specific
	unrelated ABCs raise RuntimeError instead of one of them silently
	winning.

	There is deliberately NO exact-__mro__ fast path in front of this.  It
	would be wrong, not just redundant: a class on cls's own __mro__ can lose
	to a more specific registered ABC.  test_mro_conflicts pins it -- Sized
	is an explicit base of O, yet once Set (a subclass of both Sized and
	Container) is registered on O, Set wins.  The cache below is what pays
	for composing an mro instead of walking one."

	| reg key cache impl |
	reg := self @env0:dynamicInstVarAt: #registry.
	"g.dispatch(int): bare builtin-type names arrive as BoundMethod
	wrappers here too -- normalize, tolerating non-classes."
	key := (self ___registryKey___: cls) @env0:ifNil: [cls].
	"An ABC registration can invalidate a cached decision without touching
	this dispatcher -- ``c.Set.register(O)'' makes Set outrank the Sized entry
	already cached for O.  CPython re-checks abc.get_cache_token() on every
	dispatch for exactly that reason, and so does this."
	self ___checkAbcCacheToken___.
	cache := self @env0:dynamicInstVarAt: #dispatchCache.
	(cache @env0:includesKey: key) ifTrue: [^ cache @env0:at: key].
	impl := (functools @env0:___instance___) ___findImplFor___: key registry: reg.
	(impl == nil and: [key isKindOf: Behavior]) ifTrue: [
		"Nothing CPython would consider matched.  Fall back to the RAW
		Smalltalk chain, which holds classes CPython has no separate name for
		and _find_impl therefore cannot see: ``int'' normalizes to Integer as
		a registry key, but Integer reports the Python name ``int'' -- the
		same as its SmallInteger subclass -- so the composed mro collapses the
		two and a registration against Integer becomes unreachable.

		Ranked BELOW everything in the composed mro on purpose: these are
		Grail's own links, so they must not outrank a class CPython would
		have ordered.  This generalizes two widenings that used to be
		hand-coded here for str and int."
		(key __mro__) @env0:do: [:c |
			(impl == nil and: [reg @env0:includesKey: c])
				ifTrue: [impl := reg @env0:at: c]].
		"Two widenings the chain still cannot reach: isinstance(x, str) is
		true for EVERY CharacterCollection (str maps to Unicode7, but a plain
		String's chain never passes it), and int subclasses are AbstractPyInt
		siblings of Integer rather than descendants."
		((key == CharacterCollection)
			or: [key @env0:inheritsFrom: CharacterCollection]) ifTrue: [
			(reg @env0:includesKey: Unicode7)
				ifTrue: [impl := reg @env0:at: Unicode7]].
		(impl == nil
			and: [(key == AbstractPyInt)
				or: [key @env0:inheritsFrom: AbstractPyInt]]) ifTrue: [
			(reg @env0:includesKey: Integer)
				ifTrue: [impl := reg @env0:at: Integer]]].
	impl == nil ifTrue: [impl := self @env0:dynamicInstVarAt: #default].
	cache @env0:at: key put: impl.
	^ impl

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> register: clsOrFunc [
	"Two forms:
	  * @g.register(cls) -- clsOrFunc is a CLASS: return a decorator
	    that registers the decorated function for cls and hands it back.
	  * @g.register -- clsOrFunc is the decorated FUNCTION itself
	    (Python 3.7+ annotation form): infer the dispatch class from
	    its first parameter's annotation, register, and return it."

	| key |
	key := self ___registryKey___: clsOrFunc.
	key @env0:isNil ifTrue: [
		"Not a class -> the annotation form: clsOrFunc is the function."
		| inferred |
		inferred := self ___inferRegisterType___: clsOrFunc.
		"A UNION annotation (``str | bytes'', ``typing.Optional[int]'')
		registers the implementation once per member, which is how CPython
		dispatches it -- there is no union object in the registry, just each
		class pointing at the same function."
		(inferred isKindOf: Array) ifTrue: [
			inferred @env0:do: [:each |
				(self @env0:dynamicInstVarAt: #registry) @env0:at: each put: clsOrFunc].
			self ___clearDispatchCache___.
			^ clsOrFunc].
		(self @env0:dynamicInstVarAt: #registry) @env0:at: inferred put: clsOrFunc.
		self ___clearDispatchCache___.
		^ clsOrFunc].
	^ [:positional2 :keywords2 |
		| fn |
		fn := positional2 @env0:at: 1.
		(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: fn.
		self ___clearDispatchCache___.
		fn]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> register: cls _: aFunc [
	"g.register(cls, impl) direct form."

	| key |
	key := self ___registryKey___: cls.
	key @env0:isNil ifTrue: [
		TypeError ___signal___: (self ___invalidRegisterMessage___: cls)].
	(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: aFunc.
	self ___clearDispatchCache___.
	^ aFunc

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> registry [
	^ self @env0:dynamicInstVarAt: #registry

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatch >> value: positional value: keywords [
	"Calling the generic function: dispatch on type(args[0])."

	| impl |
	positional @env0:isEmpty ifTrue: [
		"CPython names the FUNCTION, not the machinery:
		``f requires at least 1 positional argument''.  The name comes from
		the update_wrapper copy done in functools>>singledispatch:; read it
		straight out of the dynamic-instVar store rather than sending
		``__name__'', which is not a method on this class."
		TypeError ___signal___: (self ___dispatchName___)
			@env0:, ' requires at least 1 positional argument'].
	impl := self dispatch: (positional @env0:at: 1) @env0:class.
	^ impl value: positional value: keywords

]
