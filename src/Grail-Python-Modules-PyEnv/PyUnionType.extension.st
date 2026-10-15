Extension { #name : 'PyUnionType' }

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___addMember___: aMember to: members [
	"Add aMember unless an equal one is already there -- CPython's union
	builder deduplicates, by hash where it can and by == where a member is
	unhashable, so == (Python's) is the rule for both here."

	(members @env0:anySatisfy: [:m | PyUnionType ___pyEq___: m with: aMember])
		ifFalse: [members @env0:add: aMember]

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___grailUnionFrom___: aSequence [
	"The union of an ALREADY-VALIDATED sequence of operands.

	``Union[X, Y, ...]'' needs to reach the same object ``X | Y'' builds, and
	cannot get there through ``|''.  CPython's typing.py defines ``__or__'' on
	_GenericAlias, _SpecialForm and the type variables as ``Union[self,
	other]'', so a Union subscript that folded ``|'' over its arguments would
	be calling back into itself -- a cycle with no base case, and the way it
	presents is a RecursionError from inside an unrelated import rather than
	anything that names typing.  This is the entry point that does not fold.

	No ``___isTypeOperand___:'' gate here, deliberately: the gate exists to
	stop ``|'' hijacking unrelated code (``some_set | operator.add'' must still
	TypeError), and a caller that has reached this selector is typing's own
	``Union'' subscript, which has already run every argument through
	``_type_check''.  Re-deciding here would only mean disagreeing with it.

	Flattening and the one-argument collapse match ``___of___:with:'' and
	CPython: ``Union[int]'' is ``int'', not a union of one."

	| args inst |
	args := OrderedCollection @env0:new.
	aSequence @env0:do: [:each |
		(self ___membersOf___: each) @env0:do: [:m | self ___addMember___: m to: args]].
	args @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'Cannot take a Union of no types.'].
	args @env0:size @env0:= 1 ifTrue: [^ args @env0:first].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__args__'
		put: (tuple @env0:withAll: args @env0:asArray).
	^ inst

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___isTypeOperand___: anOperand [
	"Is anOperand something ``|'' may union -- a class, a builtin type reached as
	a value, a parameterised generic, an existing union, or None?

	This gate is why ``|'' does not hijack unrelated code.  CPython's type.__or__
	answers NotImplemented for a non-type, so ``some_set | operator.add'' still
	raises TypeError; without the gate, Grail built a union out of a set and a
	FUNCTION and test_set's TestOnlySetsOperator stopped seeing its expected
	TypeError.  A builtin referenced as a value is a BoundMethod either way, so
	the discriminator is whether its selector names a class."

	| resolved |
	anOperand == nil ifTrue: [^ false].
	(anOperand @env0:isKindOf: Behavior) ifTrue: [^ true].
	(anOperand @env0:isKindOf: PyGenericAlias) ifTrue: [^ true].
	(anOperand @env0:isKindOf: PyUnionType) ifTrue: [^ true].
	anOperand == (ExecBlock @env0:___pyNone___) ifTrue: [^ true].
	(anOperand @env0:isKindOf: BoundMethod) ifTrue: [
		resolved := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #Python)
			@env0:at: anOperand @env0:selector @env0:asSymbol otherwise: nil.
		^ resolved @env0:notNil and: [resolved @env0:isKindOf: Behavior]].
	"typing's own runtime objects are type expressions by construction, and
	``X | Y'' over them is ordinary annotation code:

		T = TypeVar('T')
		def f(x: T | None) -> list[T] | None: ...

	Rejecting them here did not merely refuse the union -- it did not
	terminate.  ``int.__or__(T)'' answers NotImplemented, Python then tries the
	reflected ``T.__ror__(int)'', typing spells that as ``Union[int, T]'', and
	Union's subscript builds its result with ``|'' again: a loop with no base
	case, which surfaced as a RecursionError deep inside an unrelated package's
	import.  Three recognisers, one per shape typing produces:

	  * a generic alias -- ``List[int]'', ``Callable[..., T]'',
	    ``Annotated[X, ...]'' -- always carries an ``__origin__'';
	  * a TYPE VARIABLE of any of the three kinds (TypeVar, ParamSpec,
	    TypeVarTuple) implements ``__typing_subst__'', which is precisely the
	    protocol that marks something substitutable into a type expression;
	  * a PEP 695 type alias implements ``evaluate_value''.

	Each is a protocol the object has to implement to do its job, so none of
	them is a name that happens to match.  The clause this replaces tested for
	the class name ``_StubGeneric'' -- the marker carried by the hand-written
	typing stub that CPython's real typing.py has now replaced -- and there is
	no _StubGeneric left for it to find."
	(anOperand @env0:dynamicInstVarAt: #'__origin__') @env0:notNil
		ifTrue: [^ true].
	(anOperand ___respondsTo___: #'__typing_subst__:') ifTrue: [^ true].
	(anOperand ___respondsTo___: #'evaluate_value') ifTrue: [^ true].
	^ false

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___membersOf___: anOperand [
	"anOperand''s contribution to a union: its own members when it is already a
	union, otherwise itself."

	(anOperand @env0:isKindOf: self) ifTrue: [
		^ (anOperand @env0:dynamicInstVarAt: #'__args__') @env0:asArray].
	"``None'' is normalised to ``NoneType''.  CPython's union constructor does
	this, for both spellings, which is why ``int | None'' prints as ``int |
	None'' but ``get_args'' answers ``(int, <class 'NoneType'>)'' -- the
	shorthand is in the repr, not in the members.  Grail kept the None
	SINGLETON, so a caller reading __args__ to decide 'is this Optional?' --
	the standard idiom, ``type(None) in get_args(hint)'' -- got False for an
	annotation that plainly was.  ``Union[int, None]'' already answered
	NoneType, because typing's _type_check converts before it gets here, so
	the two spellings also disagreed with each other."
	anOperand == (ExecBlock @env0:___pyNone___)
		ifTrue: [^ Array @env0:with: (ExecBlock @env0:___pyNone___) @env0:class].
	^ Array @env0:with: anOperand

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___of___: left with: right [
	"The union of two type operands, flattening either side that is already a
	union -- CPython''s ``int | str | bytes'' has three args, not two with one
	nested."

	| args inst |
	args := OrderedCollection @env0:new.
	(self ___membersOf___: left) @env0:do: [:m | self ___addMember___: m to: args].
	(self ___membersOf___: right) @env0:do: [:m | self ___addMember___: m to: args].
	"``int | int'' is ``int'': CPython's builder drops a repeat, and a union
	of one member is that member."
	args @env0:size @env0:= 1 ifTrue: [^ args @env0:first].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__args__' put: (tuple @env0:withAll: args @env0:asArray).
	^ inst

]

{ #category : 'Grail-Comparison' }
PyUnionType class >> ___pyEq___: a with: b [
	| r |
	a == b ifTrue: [^ true].
	r := [a @env1:__eq__: b] @env0:on: AbstractException do: [:ex | ex @env0:return: NotImplemented].
	r == NotImplemented ifTrue: [
		r := [b @env1:__eq__: a] @env0:on: AbstractException do: [:ex | ex @env0:return: NotImplemented]].
	^ r == true

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"``class X(Union)'' -- CPython refuses, and so does this, where the class
	statement asks the base for a subclass."

	^ TypeError ___signal___: 'type ''typing.Union'' is not an acceptable base type'

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> __class_getitem__: item [
	"``types.UnionType[X, Y]'' -- subscripting the union TYPE builds the union,
	as it does in CPython 3.14, where UnionType IS typing.Union: measured,
	``types.UnionType[int, str]'' is ``int | str''.  annotationlib's
	ForwardRef.__or__ is written exactly this way, so without it
	``ForwardRef('X') | ForwardRef('x')'' answered the bare PyUnionType class.

	No type check on the members, for the reason ___grailUnionFrom___: gives:
	this is the Union SUBSCRIPT, which accepts forward references and other
	non-types that ``|'' on its own would refuse."

	"A STRING member becomes a ForwardRef, as typing.Union's subscript converts
	 it (_type_convert): measured, ``types.UnionType[int, 'x']'' is
	 ``int | ForwardRef('x')'', with no module and is_class False.  So
	 ``ForwardRef('X') | 'x''' equals ``ForwardRef('X') | ForwardRef('x')''."
	| members fwd |
	members := (item @env0:isKindOf: tuple) ifTrue: [item @env0:asArray] ifFalse: [{ item }].
	(members @env0:anySatisfy: [:m | m @env0:isKindOf: CharacterCollection]) ifTrue: [
		fwd := [((Python @env0:at: #builtins) @env1:instance @env1:___import__: { 'annotationlib' } kw: nil)
			@env1:___pyAttrLoad___: #'ForwardRef']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		fwd @env0:notNil ifTrue: [
			members := members @env0:collect: [:m |
				(m @env0:isKindOf: CharacterCollection)
					ifTrue: [fwd ___pyCallValue___: { m } kw: nil]
					ifFalse: [m]]]].
	^ self ___grailUnionFrom___: members

]

{ #category : 'Grail-Instance Creation' }
PyUnionType class >> value: positional value: keywords [
	"``Union()'' -- the union type cannot be instantiated; a union is made by
	``|'' or by subscripting it."

	^ TypeError ___signal___: 'cannot create ''typing.Union'' instances'

]

{ #category : 'Grail-Representation' }
PyUnionType >> ___nameOf___: anOperand [
	"An operand''s printable name -- its __name__ when it is a CLASS, and its
	repr otherwise.

	CPython prints a union member with its ``__qualname__'' when it is a type
	or a function and with plain ``repr()'' otherwise, and the difference is
	visible: ``typing.List | typing.Tuple'' reprs with both names QUALIFIED,
	because a _SpecialGenericAlias is not a type and its repr says
	``typing.List''.  Reading __name__ off it answers the bare ``List'', so the
	union printed as ``List | Tuple'' -- close enough to look right, and not
	what CPython says."

	"``NoneType'' prints as ``None''.  CPython's union repr does this, which is
	why ``int | None'' reads back as it was written even though its __args__
	hold the CLASS -- the shorthand lives in the repr, not in the members.  It
	became visible here only once ___membersOf___: started normalising the None
	singleton to NoneType: before that the member WAS the singleton and printed
	as ``None'' by accident.  inspect.signature renders annotations through
	this, so without it every ``x: int | None'' parameter came out as ``x: int
	| NoneType''."
	anOperand == (ExecBlock @env0:___pyNone___) @env0:class
		ifTrue: [^ 'None'].
	((anOperand @env0:isKindOf: Behavior)
		or: [anOperand @env0:isKindOf: BoundMethod]) ifFalse: [
			^ [(anOperand @env1:__repr__) @env0:asString]
				@env0:on: AbstractException
				do: [:ex | ex @env0:return: anOperand @env0:printString]].
	^ [(anOperand @env1:___pyAttrLoad___: #'__name__') @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: (anOperand @env1:__repr__) @env0:asString]

]

{ #category : 'Grail-Representation' }
PyUnionType >> ___smalltalkRepr___ [
	| parts |
	parts := WriteStream @env0:on: String @env0:new.
	self __args__ @env0:doWithIndex: [:a :i |
		i @env0:> 1 ifTrue: [parts @env0:nextPutAll: ' | '].
		parts @env0:nextPutAll: (self ___nameOf___: a)].
	^ parts @env0:contents @env0:asUnicodeString

]

{ #category : 'Grail-Instantiation' }
PyUnionType >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"``class E(int | str)'' -- a union INSTANCE as a base.  CPython 3.14's
	union_mro_entries refuses with ``Cannot subclass int | str''; without this
	the instance reached object >> ___subclass___ and said ``cannot subclass a
	non-class base (PyUnionType)'', naming the Smalltalk class."

	^ TypeError ___signal___: 'Cannot subclass ' @env0:, self __repr__ @env0:asString

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __args__ [
	^ self @env0:dynamicInstVarAt: #'__args__'

]

{ #category : 'Grail-Comparison' }
PyUnionType >> __eq__: other [
	"Two unions are equal when they have the same members, in any order.

	CPython compares the arg SETS -- ``int | str == str | int'' is True -- and
	as of 3.14 ``typing.Union[int, str]'' and ``int | str'' are one class, so
	the two spellings have to compare equal as well.  Grail had no __eq__ at
	all, so every union compared by identity and both of those were False:
	a library caching parameterised annotations in a dict saw a miss every
	time, and never said why."

	| mine theirs |
	(other @env0:isKindOf: PyUnionType) ifFalse: [^ NotImplemented].
	mine := (self @env0:dynamicInstVarAt: #'__args__') @env0:asArray.
	theirs := (other @env0:dynamicInstVarAt: #'__args__') @env0:asArray.
	mine @env0:size @env0:= theirs @env0:size ifFalse: [^ false].
	"PYTHON equality per member, not Smalltalk's ``='': for a Python instance
	 that is identity, which held for class members (int, str) and failed for
	 anything with its own __eq__ -- two unions of equal ForwardRefs compared
	 unequal (test_annotationlib test_or).  Python's order: identity, then
	 __eq__, then the reflected __eq__ when the first answers NotImplemented."
	mine @env0:do: [:m |
		(theirs @env0:anySatisfy: [:t | PyUnionType ___pyEq___: t with: m])
			ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Subscript' }
PyUnionType >> __getitem__: item [
	"``(T | None)[int]'' is ``int | None'' -- substitution by CPython's rule
	(union_getitem, in _grail_generic_alias), which reaches a variable nested
	inside a member as well: flask's ``t.Union[cabc.Callable[[R], R], ...]''
	substitutes R inside each Callable.  This used to replace only a TOP-LEVEL
	member that was itself a variable, and pass nested ones through."

	| r |
	r := PyGenericAlias ___helperCall___: #union_getitem with: { self. item }.
	r == #'___noHelper___' ifTrue: [
		^ TypeError ___signal___: '''typing.Union'' object is not subscriptable'].
	^ r

]

{ #category : 'Grail-Comparison' }
PyUnionType >> __hash__ [
	"Hashes with the members, order-insensitively, so that equal unions land in
	the same bucket.  A union used as a dict key or put in a set is ordinary --
	``Union[int, str]'' keys a cache in typing itself."

	| r h |
	"CPython's union_hash (in _grail_generic_alias) hashes the member SET, so
	two equal unions of equal-but-distinct members hash alike, and an
	unhashable member raises -- the identity xor below did neither, and stays
	only for the bootstrap window."
	r := PyGenericAlias ___helperCall___: #union_hash with: { self }.
	r == #'___noHelper___' ifFalse: [^ r].
	h := 0.
	(self @env0:dynamicInstVarAt: #'__args__') @env0:do: [:m |
		h := h @env0:bitXor: m @env0:identityHash].
	^ h

]

{ #category : 'Grail-Protocol Refusal' }
PyUnionType >> __iter__ [
	<grailProtocolRefusal>
	"CPython's union type has no tp_iter, so iter(int | str) is ``'typing.Union'
	object is not iterable''.  Without this the legacy sequence protocol found
	__getitem__ -- which is substitution here -- and ``list(str | T)'' built
	str | 0, str | 1, ... without end (test_typing TypeIterationTests).  A
	refusal, so the class dict and collections.abc.Iterable do not count it."

	TypeError ___signal___: '''typing.Union'' object is not iterable'

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __module__ [
	^ 'typing'

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __name__ [
	"CPython 3.14's union type names itself Union: ``(int | str).__name__''."

	^ 'Union'

]

{ #category : 'Grail-Operators' }
PyUnionType >> __or__: other [
	"A UNION accepts what is_unionable() refuses (gh-140348): ``U | 'float'''
	is ``Union[U, 'float']'', whose type check makes the string a ForwardRef."
	(PyUnionType ___isTypeOperand___: other) ifFalse: [
		^ PyUnionType @env1:__getitem__: (tuple @env0:with: self with: other)].
	^ PyUnionType ___of___: self with: other

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __origin__ [
	"The union type itself -- ``(int | str).__origin__ is typing.Union'' in
	3.14, which is what lets typing.get_origin treat a union like any other
	parameterised form."

	^ self @env0:class

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __parameters__ [
	"CPython's union_parameters: the same collection an alias makes."

	| p |
	p := self @env0:dynamicInstVarAt: #'___parameters___'.
	p @env0:notNil ifTrue: [^ p].
	p := PyGenericAlias ___helperCall___: #union_parameters with: { self }.
	p == #'___noHelper___' ifTrue: [^ tuple @env0:new].
	self @env0:dynamicInstVarAt: #'___parameters___' put: p.
	^ p

]

{ #category : 'Grail-Attribute Access' }
PyUnionType >> __qualname__ [
	^ 'Union'

]

{ #category : 'Grail-Pickling' }
PyUnionType >> __reduce__ [
	"``(operator.getitem, (Union, args))'', CPython 3.14's reduction."

	| r |
	r := PyGenericAlias ___helperCall___: #union_reduce with: { self }.
	r == #'___noHelper___' ifTrue: [
		^ TypeError ___signal___: 'cannot pickle ''typing.Union'' object'].
	^ r

]

{ #category : 'Grail-Representation' }
PyUnionType >> __repr__ [
	"``int | str'', as CPython prints it (union_repr, in
	_grail_generic_alias): each member by the same rule an alias argument
	uses, so ``list[int] | test.Employee'' is qualified as CPython qualifies
	it.  The Smalltalk rendering below stays for the bootstrap window."

	| r |
	r := PyGenericAlias ___helperCall___: #union_repr with: { self }.
	r == #'___noHelper___' ifTrue: [^ self ___smalltalkRepr___].
	^ r

]

{ #category : 'Grail-Operators' }
PyUnionType >> __ror__: other [
	"``'float' | U'' -- see __or__:."
	(PyUnionType ___isTypeOperand___: other) ifFalse: [
		^ PyUnionType @env1:__getitem__: (tuple @env0:with: other with: self)].
	^ PyUnionType ___of___: other with: self

]
