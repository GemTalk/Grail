Extension { #name : 'PyGenericAlias' }

{ #category : 'Grail-Instantiation' }
PyGenericAlias class >> ___fromSubscript___: item origin: aClass [
	"Build an alias for ``aClass[item]''.  A multi-element subscript
	(``dict[K, V]'') arrives as a tuple; a single one arrives bare."

	^ self origin: aClass
		args: ((item isKindOf: tuple)
			ifTrue: [item @env0:asArray]
			ifFalse: [Array @env0:with: item])

]

{ #category : 'Grail-Private' }
PyGenericAlias class >> ___helperCall___: aSymbol with: anArray [
	"Call a function of _grail_generic_alias -- where the RULES of
	types.GenericAlias and types.UnionType live, ported from CPython's C --
	or answer the marker #'___noHelper___' when that module cannot be
	imported yet.  An alias can be built during bootstrap, long before the
	stdlib is importable; nothing reaches here that early except by accident,
	and the callers keep a Smalltalk answer for it."

	| mod fn |
	mod := [(Python @env0:at: #builtins) @env1:instance
			@env1:___import__: { '_grail_generic_alias' } kw: nil]
		@env0:on: AbstractException do: [:ex |
			(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
			ex @env0:return: nil].
	mod == nil ifTrue: [^ #'___noHelper___'].
	fn := mod @env1:___pyAttrLoad___: aSymbol.
	^ fn @env1:___pyCallValue___: anArray kw: nil

]

{ #category : 'Grail-Instantiation' }
PyGenericAlias class >> ___isTypeVar___: anObject [
	"A subscript argument counts towards __parameters__ when it is a type
	VARIABLE rather than a concrete type.  CPython asks for __typing_subst__;
	typing is a Python-source module, so there is no Smalltalk global to compare
	against and the test is by class NAME.

	WALKS THE SUPERCLASS CHAIN rather than comparing the leaf name, which is not
	a refinement but a fix.  ``typing.TypeVar'' became a real class -- it has to
	be, or ``isinstance(T, TypeVar)'' raises instead of answering -- and it
	SUBCLASSES _TypeVarInstance so ParamSpec and TypeVarTuple stay outside it.
	A leaf-name test then answered false for the very object typing.TypeVar now
	returns: caught by GenericAliasTestCase >>
	testATypeVarArgumentCountsAsAParameter, which measured __parameters__ as
	empty where it had been (T,).

	Matching either name in the chain keeps every producer working -- TypeVar,
	ParamSpec and TypeVarTuple all still count as parameters, as they must,
	since __parameters__ is about being a type VARIABLE and not about which
	flavour."

	| cls |
	anObject @env0:== nil ifTrue: [^ false].
	cls := anObject @env0:class.
	[cls @env0:notNil] @env0:whileTrue: [
		| nm |
		nm := cls @env0:name @env0:asString.
		((nm @env0:= '_TypeVarInstance') or: [nm @env0:= 'TypeVar'])
			ifTrue: [^ true].
		cls := cls @env0:superclass].
	^ false

]

{ #category : 'Grail-Instantiation' }
PyGenericAlias class >> __new__: cls _: origin _: args [
	"``GenericAlias.__new__(cls, origin, args)'', which is what a Python
	SUBCLASS reaches through ``super().__new__(cls, origin, args)'' --
	collections.abc's _CallableGenericAlias is one.  Builds an instance of
	cls, not of GenericAlias, so the subclass's methods apply."

	^ cls ___fromSubscript___: args origin: origin

]

{ #category : 'Grail-Instantiation' }
PyGenericAlias class >> origin: aClass args: anArgArray [
	"The Smalltalk-side constructor.  anArgArray is a plain Array of the
	subscript arguments, already flattened out of any tuple."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__origin__' put: aClass.
	inst @env0:dynamicInstVarAt: #'__args__' put: (tuple @env0:withAll: anArgArray).
	"__parameters__ is computed on first READ (PyGenericAlias >>
	__parameters__), as CPython does -- most aliases are never asked."
	inst @env0:dynamicInstVarAt: #'__unpacked__' put: false.
	^ inst

]

{ #category : 'Grail-Instantiation' }
PyGenericAlias class >> value: positional value: keywords [
	"``types.GenericAlias(origin, args)'' -- CPython exposes the constructor."

	| origin rest |
	"A SUBCLASS is called the ordinary way, so its own __new__ and __init__
	run; only GenericAlias itself takes this shortcut."
	self == PyGenericAlias ifFalse: [^ super value: positional value: keywords].
	(positional == nil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___: 'GenericAlias expected 2 arguments'].
	origin := positional @env0:at: 1.
	rest := positional @env0:at: 2.
	^ self ___fromSubscript___: rest origin: origin

]

{ #category : 'Grail-Private' }
PyGenericAlias >> ___argRepr___: anObject [
	"One ARGUMENT as CPython's ga_repr writes it: ``...'' for Ellipsis, the repr
	of anything that is itself an alias (has __origin__ and __args__, so
	``Unpack[Ts]'' stays whole rather than printing its bare __name__), a class
	as its qualified name (``collections.OrderedDict'', but ``int'' for a
	builtin), and the repr of everything else -- ``~T'' for a TypeVar."

	| probe qn mod |
	probe := [:sym | [anObject @env1:___pyAttrLoad___: sym]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	anObject == (Python @env0:at: #'Ellipsis' otherwise: nil) ifTrue: [^ '...'].
	((probe value: #'__origin__') notNil and: [(probe value: #'__args__') notNil])
		ifTrue: [^ self ___reprOf___: anObject].
	qn := probe value: #'__qualname__'.
	mod := probe value: #'__module__'.
	(qn notNil and: [mod notNil]) ifTrue: [
		^ mod @env0:asString @env0:= 'builtins'
			ifTrue: [qn @env0:asString]
			ifFalse: [mod @env0:asString @env0:, '.' @env0:, qn @env0:asString]].
	^ self ___reprOf___: anObject

]

{ #category : 'Grail-Private' }
PyGenericAlias >> ___nameOf___: anObject [
	| n |
	n := [anObject @env1:___pyAttrLoad___: #'__qualname__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	n == nil ifTrue: [
		n := [anObject @env1:___pyAttrLoad___: #'__name__']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	n == nil ifTrue: [^ anObject @env0:printString].
	^ n @env0:asString

]

{ #category : 'Grail-Callable' }
PyGenericAlias >> ___pyCallValue___: positional kw: kwargs [
	"``partial[int](fn, 4)'' constructs a partial -- the subscript is erased
	at call time, exactly as in CPython.

	A CLASS origin has to go through its class-call entry (value:value:);
	___pyCallValue___ is not answered for Behaviors in general, and making it
	so is what broke the enum member builder once already."

	| origin result |
	origin := self @env0:dynamicInstVarAt: #'__origin__'.
	result := (origin isKindOf: Behavior)
		ifTrue: [origin @env1:value: (positional == nil ifTrue: [#()] ifFalse: [positional])
			value: kwargs]
		ifFalse: [origin ___pyCallValue___: positional kw: kwargs].
	"CPython's ga_call records the alias on what it made -- ``list[int]()''
	has __orig_class__ ``list[int]'' when the object accepts attributes --
	and a refusal is not the caller's problem."
	[result @env1:__setattr__: '__orig_class__' _: self]
		@env0:on: AbstractException do: [:ex |
			(ex @env0:isKindOf: AlmostOutOfStackError) ifTrue: [ex @env0:pass].
			ex @env0:return: nil].
	^ result

]

{ #category : 'Grail-Private' }
PyGenericAlias >> ___reprOf___: anObject [
	^ [((Python @env0:at: #builtins) @env1:instance @env1:repr: anObject) @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: anObject @env0:printString]

]

{ #category : 'Grail-Reflection' }
PyGenericAlias >> ___smalltalkRepr___ [
	"``functools.partial[int]''.  Each argument renders as its __name__ when
	it has one (a class) and its repr otherwise (a TypeVar, a string)."

	| out origin args mod |
	origin := self @env0:dynamicInstVarAt: #'__origin__'.
	args := self @env0:dynamicInstVarAt: #'__args__'.
	out := WriteStream @env0:on: String @env0:new.
	"CPython qualifies the origin -- ``functools.partial[int]'' -- for
	anything outside builtins."
	mod := [origin @env1:___pyAttrLoad___: #'__module__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(mod @env0:notNil and: [mod @env0:asString @env0:~= 'builtins']) ifTrue: [
		out @env0:nextPutAll: mod @env0:asString; @env0:nextPut: $.].
	(self @env0:dynamicInstVarAt: #'__unpacked__') == true
		ifTrue: [out @env0:nextPut: $*].
	out @env0:nextPutAll: (self ___nameOf___: origin).
	out @env0:nextPut: $[.
	args @env0:asArray @env0:doWithIndex: [:each :i |
		i @env0:> 1 ifTrue: [out @env0:nextPutAll: ', '].
		out @env0:nextPutAll: (self ___argRepr___: each)].
	out @env0:nextPut: $].
	^ out @env0:contents @env0:asUnicodeString

]

{ #category : 'Grail-Instantiation' }
PyGenericAlias >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"PEP 560's __mro_entries__, applied where Grail actually resolves bases.
	``class Foo(partial[int])'' subclasses the ORIGIN -- without this the
	alias reaches object >> ___subclass___, whose whole job is to raise
	``cannot subclass a non-class base''.

	Not hypothetical: before partial opted into real aliases, ``partial[int]''
	WAS partial, so subclassing it worked.  Opting in has to keep it working."

	^ (self @env0:dynamicInstVarAt: #'__origin__')
		___subclass___: aSymbol
		instVarNames: ivarNames
		classInstVarNames: classIvarNames

]

{ #category : 'Grail-Reflection' }
PyGenericAlias >> __dict__ [
	"``list[float].__dict__'' is the ORIGIN's -- CPython proxies it like every
	other attribute (it is not among the alias's own).  Answered here, and
	listed in ___pythonValueAttrs___, because the generic object __dict__ was
	found first and came back as a BOUND METHOD: pydantic's TypeAdapter reads
	``obj.__dict__[name]'' on the type it adapts and then iterated that method
	as a core schema (``TypeAdapter(list[float]).json_schema()'')."

	^ (self @env0:dynamicInstVarAt: #'__origin__') @env1:___pyAttrLoad___: #'__dict__'

]

{ #category : 'Grail-Comparison' }
PyGenericAlias >> __eq__: other [
	"CPython compares origin and args, so ``list[int] == list[int]''."

	(other isKindOf: PyGenericAlias) ifFalse: [^ false].
	((self @env0:dynamicInstVarAt: #'__unpacked__') == true)
		== ((other @env0:dynamicInstVarAt: #'__unpacked__') == true)
			ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #'__origin__')
			@env0:== (other @env0:dynamicInstVarAt: #'__origin__'))
		and: [(self @env0:dynamicInstVarAt: #'__args__')
			@env1:__eq__: (other @env0:dynamicInstVarAt: #'__args__')]

]

{ #category : 'Grail-Reflection' }
PyGenericAlias >> __getattr__: aName [
	"Unknown attributes read through to the origin -- CPython proxies
	everything but its own handful, so ``list[int].append'' works.

	``asSymbol'' because __getattr__ receives a Python STRING by contract while
	___pyAttrLoad___ reaches primitives (dynamicInstVarAt:) that require a
	Symbol: forwarding the string raw died with an uncatchable Smalltalk
	ArgumentTypeError (``for __bases__ expected a Symbol'') the moment anything
	asked a parameterised generic for an attribute the origin keeps in dynamic
	storage -- reachable as soon as issubclass started testing union members
	individually (``issubclass(int, list[int] | Child)'')."

	"``__bases__'' is the ONE attribute CPython does not proxy: a
	parameterised generic has none, while ``__mro__'' and everything else
	read through to the origin (measured on 3.14).  The difference is
	load-bearing rather than cosmetic -- isinstance()/issubclass() decide
	whether a non-type classinfo participates in the old-style protocol by
	asking for a TUPLE __bases__ (builtins ___abstractBases___, CPython's
	abstract_get_bases), so proxying it makes ``isinstance([], list[int])''
	look like a legitimate check instead of the TypeError CPython raises.
	Grail got the right answer for the wrong reason until __bases__ started
	answering a real tuple."
	"CPython's attribute_exceptions: the names ga_getattro answers itself or
	refuses, rather than forwarding -- a forwarded __reduce_ex__ made
	copy.copy(list[int]) copy a LIST."
	(#('__bases__' '__class__' '__origin__' '__args__' '__unpacked__'
		'__parameters__' '__typing_unpacked_tuple_args__' '__mro_entries__'
		'__reduce_ex__' '__reduce__' '__copy__' '__deepcopy__')
			@env0:includes: aName @env0:asString) ifTrue: [
		^ AttributeError ___signal___:
			'''types.GenericAlias'' object has no attribute ''' @env0:,
				aName @env0:asString @env0:, ''''].
	^ (self @env0:dynamicInstVarAt: #'__origin__')
		@env1:___pyAttrLoad___: aName @env0:asSymbol

]

{ #category : 'Grail-Subscript' }
PyGenericAlias >> __getitem__: item [
	"``list[T][int]'' is ``list[int]'' -- substitution, by CPython's rule
	(ga_getitem).  An alias with no parameters answers the TypeError CPython
	gives: ``list[int][str]'' is ``list[int] is not a generic class''.  It
	used to answer nothing at all: the alias was not subscriptable."

	| r |
	r := PyGenericAlias ___helperCall___: #ga_getitem with: { self. item }.
	r == #'___noHelper___' ifTrue: [
		^ TypeError ___signal___: '''types.GenericAlias'' object is not subscriptable'].
	^ r

]

{ #category : 'Grail-Comparison' }
PyGenericAlias >> __hash__ [
	"CPython's ga_hash: ``hash(origin) ^ hash(args)''.  Hashing the args
	alone put ``list[int]'' and ``set[int]'' in one bucket."

	^ ((self @env0:dynamicInstVarAt: #'__origin__') @env1:__hash__)
		@env0:bitXor: ((self @env0:dynamicInstVarAt: #'__args__') @env1:__hash__)

]

{ #category : 'Grail-Type Checks' }
PyGenericAlias >> __instancecheck__: anObject [
	^ TypeError ___signal___: 'isinstance() argument 2 cannot be a parameterized generic'

]

{ #category : 'Grail-Iteration' }
PyGenericAlias >> __iter__ [
	"PEP 646: iterating an alias yields it once, UNPACKED -- ``*tuple[int, ...]''
	in a subscript or a star-annotation is ``(*tuple[int, ...],)[0]'', an alias
	that differs only in ``__unpacked__'' and prints with a leading star."

	| copy |
	copy := PyGenericAlias
		origin: (self @env0:dynamicInstVarAt: #'__origin__')
		args: (self @env0:dynamicInstVarAt: #'__args__') @env0:asArray.
	copy @env0:dynamicInstVarAt: #'__unpacked__' put: true.
	^ (tuple @env0:withAll: { copy }) @env1:__iter__

]

{ #category : 'Grail-Descriptor' }
PyGenericAlias >> __mro_entries__: bases [
	"PEP 560: what a class statement uses in place of this alias.  Keeps
	``class Foo(SomeGeneric[int])'' meaning ``class Foo(SomeGeneric)'' for
	any class that opts into real aliases."

	^ tuple @env0:withAll:
		(Array @env0:with: (self @env0:dynamicInstVarAt: #'__origin__'))

]

{ #category : 'Grail-Operators' }
PyGenericAlias >> __or__: other [
	"``list[int] | str''.  A parameterised generic is a valid union member."

	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: self with: other

]

{ #category : 'Grail-Attribute Access' }
PyGenericAlias >> __parameters__ [
	"The type parameters among the arguments, collected by CPython's rule
	(_Py_make_parameters, in _grail_generic_alias): anything with
	__typing_subst__, plus the __parameters__ of any argument that has them,
	searching nested tuples and lists -- so ``dict[str, list[T]]'' has (T,).
	It used to be the arguments whose CLASS was named TypeVar, which missed
	a parameter nested one level down and every ParamSpec.

	Computed on first read and kept, as CPython does."

	| p |
	p := self @env0:dynamicInstVarAt: #'___parameters___'.
	p @env0:notNil ifTrue: [^ p].
	p := PyGenericAlias ___helperCall___: #make_parameters
		with: { self @env0:dynamicInstVarAt: #'__args__' }.
	p == #'___noHelper___' ifTrue: [
		^ tuple @env0:withAll: ((self @env0:dynamicInstVarAt: #'__args__') @env0:asArray
			@env0:select: [:each | PyGenericAlias ___isTypeVar___: each])].
	self @env0:dynamicInstVarAt: #'___parameters___' put: p.
	^ p

]

{ #category : 'Grail-Pickling' }
PyGenericAlias >> __reduce__ [
	"``(GenericAlias, (origin, args))'', and ``(next, (iter(...),))'' for a
	starred one -- CPython's ga_reduce.  Without it an alias pickled as an
	instance of a class pickle could not find."

	| r |
	r := PyGenericAlias ___helperCall___: #ga_reduce with: { self }.
	r == #'___noHelper___' ifTrue: [
		^ TypeError ___signal___: 'cannot pickle ''types.GenericAlias'' object'].
	^ r

]

{ #category : 'Grail-Reflection' }
PyGenericAlias >> __repr__ [
	"CPython's ga_repr (in _grail_generic_alias): ``list[int]'', ``tuple[()]'',
	``*tuple[int, ...]'', a Callable's argument LIST in brackets.  The
	Smalltalk rendering below stays for the bootstrap window."

	| r |
	r := PyGenericAlias ___helperCall___: #ga_repr with: { self }.
	r == #'___noHelper___' ifTrue: [^ self ___smalltalkRepr___].
	^ r

]

{ #category : 'Grail-Operators' }
PyGenericAlias >> __ror__: other [
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: other with: self

]

{ #category : 'Grail-Type Checks' }
PyGenericAlias >> __subclasscheck__: aClass [
	^ TypeError ___signal___: 'issubclass() argument 2 cannot be a parameterized generic'

]

{ #category : 'Grail-Reflection' }
PyGenericAlias >> __typing_unpacked_tuple_args__ [
	"The arguments of ``*tuple[...]'', which substitution splices in; None for
	anything else."

	((self @env0:dynamicInstVarAt: #'__unpacked__') == true
		and: [(self @env0:dynamicInstVarAt: #'__origin__') == tuple])
		ifTrue: [^ self @env0:dynamicInstVarAt: #'__args__'].
	^ None

]

{ #category : 'Grail-Callable' }
PyGenericAlias >> value: positional value: kwargs [
	^ self ___pyCallValue___: positional kw: kwargs

]
