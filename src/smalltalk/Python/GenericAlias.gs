! ===============================================================================
! PyGenericAlias -- CPython's ``types.GenericAlias'', the object a
! parameterised generic evaluates to: ``partial[int]'', ``list[str]''.
!
! Grail's DEFAULT for class subscription stays what it has always been:
! Metaclass3 >> __getitem__: answers the class itself, so ``list[int] is
! list'' and ``class Foo(MultiDict[K, V])'' compiles to ``class
! Foo(MultiDict)''.  Forty-five sites across werkzeug / flask / itsdangerous
! / jinja2 / asgiref / blinker use a subscripted class as a BASE and depend
! on that collapse; nothing enforces type parameters at runtime, so the
! discarded subscript costs nothing.
!
! But the collapse is observable where a test looks at the alias rather than
! using it, and CPython opts INTO real aliases per class -- ``partial'' gets
! one from ``__class_getitem__ = classmethod(GenericAlias)'', and a class
! that does not say so has no __class_getitem__ at all.  So this is opt-in
! here too: functools_partial answers a real alias (class-side
! __getitem__:), everything else keeps the collapse.  Broadening it is a
! matter of adding the same override per class, once whatever consumes the
! alias -- base resolution via __mro_entries__ above all -- is ready for it.
!
! __parameters__ is the honest simplification: CPython collects every
! TypeVar-like argument, recognising them by __typing_subst__.  Grail's
! typing.TypeVar answers a _TypeVarInstance, so that is what gets collected.
! Good enough for ``partial[int]'' -> () and ``partial[T]'' -> (T,), which is
! the whole of what the tests and the corpus ask for.
! ===============================================================================

expectvalue /Class
doit
PythonInstance subclass: 'PyGenericAlias'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyGenericAlias comment:
'``types.GenericAlias'' -- the result of subscripting a class that opts into
real parameterised generics.  Carries __origin__ / __args__ / __parameters__,
calls and proxies attribute reads through to its origin, and answers
(origin,) from __mro_entries__ so it can still be used as a base class.'
%

expectvalue /Class
doit
PyGenericAlias category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyGenericAlias removeAllMethods: 1.
PyGenericAlias class removeAllMethods: 1.
%

set compile_env: 1

! ------------------------------------------------------------------ building

category: 'Grail-Instantiation'
classmethod: PyGenericAlias
origin: aClass args: anArgArray
	"The Smalltalk-side constructor.  anArgArray is a plain Array of the
	subscript arguments, already flattened out of any tuple."

	| inst params |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__origin__' put: aClass.
	inst @env0:dynamicInstVarAt: #'__args__' put: (tuple @env0:withAll: anArgArray).
	params := anArgArray @env0:select: [:each | self ___isTypeVar___: each].
	inst @env0:dynamicInstVarAt: #'__parameters__'
		put: (tuple @env0:withAll: params).
	^ inst
%

category: 'Grail-Instantiation'
classmethod: PyGenericAlias
___isTypeVar___: anObject
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
%

category: 'Grail-Instantiation'
classmethod: PyGenericAlias
___fromSubscript___: item origin: aClass
	"Build an alias for ``aClass[item]''.  A multi-element subscript
	(``dict[K, V]'') arrives as a tuple; a single one arrives bare."

	^ self origin: aClass
		args: ((item isKindOf: tuple)
			ifTrue: [item @env0:asArray]
			ifFalse: [Array @env0:with: item])
%

category: 'Grail-Instantiation'
classmethod: PyGenericAlias
value: positional value: keywords
	"``types.GenericAlias(origin, args)'' -- CPython exposes the constructor."

	| origin rest |
	(positional == nil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___: 'GenericAlias expected 2 arguments'].
	origin := positional @env0:at: 1.
	rest := positional @env0:at: 2.
	^ self ___fromSubscript___: rest origin: origin
%

! ------------------------------------------------------------------ behaviour

category: 'Grail-Reflection'
method: PyGenericAlias
__repr__
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
	out @env0:nextPutAll: (self ___nameOf___: origin).
	out @env0:nextPut: $[.
	args @env0:asArray @env0:doWithIndex: [:each :i |
		i @env0:> 1 ifTrue: [out @env0:nextPutAll: ', '].
		out @env0:nextPutAll: (self ___nameOf___: each)].
	out @env0:nextPut: $].
	^ out @env0:contents @env0:asUnicodeString
%

category: 'Grail-Private'
method: PyGenericAlias
___nameOf___: anObject
	| n |
	n := [anObject @env1:___pyAttrLoad___: #'__qualname__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	n == nil ifTrue: [
		n := [anObject @env1:___pyAttrLoad___: #'__name__']
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil]].
	n == nil ifTrue: [^ anObject @env0:printString].
	^ n @env0:asString
%

category: 'Grail-Comparison'
method: PyGenericAlias
__eq__: other
	"CPython compares origin and args, so ``list[int] == list[int]''."

	(other isKindOf: PyGenericAlias) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #'__origin__')
			@env0:== (other @env0:dynamicInstVarAt: #'__origin__'))
		and: [(self @env0:dynamicInstVarAt: #'__args__')
			@env1:__eq__: (other @env0:dynamicInstVarAt: #'__args__')]
%

category: 'Grail-Comparison'
method: PyGenericAlias
__hash__
	^ (self @env0:dynamicInstVarAt: #'__args__') @env1:__hash__
%

category: 'Grail-Callable'
method: PyGenericAlias
___pyCallValue___: positional kw: kwargs
	"``partial[int](fn, 4)'' constructs a partial -- the subscript is erased
	at call time, exactly as in CPython.

	A CLASS origin has to go through its class-call entry (value:value:);
	___pyCallValue___ is not answered for Behaviors in general, and making it
	so is what broke the enum member builder once already."

	| origin |
	origin := self @env0:dynamicInstVarAt: #'__origin__'.
	(origin isKindOf: Behavior) ifTrue: [
		^ origin @env1:value: (positional == nil ifTrue: [#()] ifFalse: [positional])
			value: kwargs].
	^ origin ___pyCallValue___: positional kw: kwargs
%

category: 'Grail-Instantiation'
method: PyGenericAlias
___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames
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
%

category: 'Grail-Callable'
method: PyGenericAlias
value: positional value: kwargs
	^ self ___pyCallValue___: positional kw: kwargs
%

category: 'Grail-Descriptor'
method: PyGenericAlias
__mro_entries__: bases
	"PEP 560: what a class statement uses in place of this alias.  Keeps
	``class Foo(SomeGeneric[int])'' meaning ``class Foo(SomeGeneric)'' for
	any class that opts into real aliases."

	^ tuple @env0:withAll:
		(Array @env0:with: (self @env0:dynamicInstVarAt: #'__origin__'))
%

category: 'Grail-Reflection'
method: PyGenericAlias
__getattr__: aName
	"Unknown attributes read through to the origin -- CPython proxies
	everything but its own handful, so ``list[int].append'' works.

	``asSymbol'' because __getattr__ receives a Python STRING by contract while
	___pyAttrLoad___ reaches primitives (dynamicInstVarAt:) that require a
	Symbol: forwarding the string raw died with an uncatchable Smalltalk
	ArgumentTypeError (``for __bases__ expected a Symbol'') the moment anything
	asked a parameterised generic for an attribute the origin keeps in dynamic
	storage -- reachable as soon as issubclass started testing union members
	individually (``issubclass(int, list[int] | Child)'')."

	^ (self @env0:dynamicInstVarAt: #'__origin__')
		@env1:___pyAttrLoad___: aName @env0:asSymbol
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PyGenericAlias
___pythonValueAttrs___
	"All three are DATA in CPython, so a caller that reads them without
	calling must get the value rather than a bound method."

	^ IdentitySet new
		add: #'__origin__';
		add: #'__args__';
		add: #'__parameters__';
		yourself
%

! ===============================================================================
! PyUnionType -- PEP 604's ``X | Y'' at RUNTIME.
!
! Grail understood a union only in an ANNOTATION, where the source text is parsed
! (functools' ___annotationUnionMembers___).  Evaluated as an expression, ``str |
! bytes'' raised "unsupported operand type(s) for |", so any code that builds a
! union at runtime -- or merely checks that a library rejects one -- hit an error
! about the wrong thing entirely.
!
! Three receivers can appear on the left of a type union, and all three get the
! operator: a plain class (Metaclass3), a builtin referenced as a value (which is
! a BoundMethod in Grail), and a parameterised generic (PyGenericAlias).  Getting
! only some of them would leave ``list[int] | str'' working and ``str | bytes''
! not.
! ===============================================================================

expectvalue /Class
doit
PythonInstance subclass: 'PyUnionType'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyUnionType comment:
'PEP 604 union of types -- what ``int | str'' evaluates to, CPython''s
types.UnionType.  Carries __args__; flattens nested unions, as CPython does, so
``a | b | c'' has three args rather than a union holding a union.'
%

expectvalue /Class
doit
PyUnionType category: 'Grail-Modules'
%

set compile_env: 0

expectvalue /Metaclass3
doit
PyUnionType removeAllMethods: 1.
PyUnionType class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: PyUnionType
___of___: left with: right
	"The union of two type operands, flattening either side that is already a
	union -- CPython''s ``int | str | bytes'' has three args, not two with one
	nested."

	| args inst |
	args := OrderedCollection @env0:new.
	(self ___membersOf___: left) @env0:do: [:m | args @env0:add: m].
	(self ___membersOf___: right) @env0:do: [:m | args @env0:add: m].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__args__' put: (tuple @env0:withAll: args @env0:asArray).
	^ inst
%

category: 'Grail-Instance Creation'
classmethod: PyUnionType
___isTypeOperand___: anOperand
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
	"typing's stand-ins -- ``typing.List[float]'', ``Optional'', ``Union'' -- are
	_StubGeneric instances with no __origin__ to recognise them by.  They exist
	precisely to occupy type-expression positions, so ``typing.List[float] |
	bytes'' is a union; matched by class name because that is the only marker a
	stub carries."
	^ anOperand @env0:class @env0:name @env0:asString @env0:= '_StubGeneric'
%

category: 'Grail-Instance Creation'
classmethod: PyUnionType
___membersOf___: anOperand
	"anOperand''s contribution to a union: its own members when it is already a
	union, otherwise itself."

	(anOperand @env0:isKindOf: self) ifTrue: [
		^ (anOperand @env0:dynamicInstVarAt: #'__args__') @env0:asArray].
	^ Array @env0:with: anOperand
%

category: 'Grail-Attribute Access'
method: PyUnionType
__args__
	^ self @env0:dynamicInstVarAt: #'__args__'
%

category: 'Grail-Representation'
method: PyUnionType
__repr__
	"``int | str'', as CPython prints it."

	| parts |
	parts := WriteStream @env0:on: String @env0:new.
	self __args__ @env0:doWithIndex: [:a :i |
		i @env0:> 1 ifTrue: [parts @env0:nextPutAll: ' | '].
		parts @env0:nextPutAll: (self ___nameOf___: a)].
	^ parts @env0:contents @env0:asUnicodeString
%

category: 'Grail-Representation'
method: PyUnionType
___nameOf___: anOperand
	"An operand''s printable name -- its __name__ when it has one (a class, or a
	builtin reached as a BoundMethod), else its repr."

	^ [(anOperand @env1:___pyAttrLoad___: #'__name__') @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: (anOperand @env1:__repr__) @env0:asString]
%

category: 'Grail-Operators'
method: PyUnionType
__or__: other
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: self with: other
%

category: 'Grail-Operators'
method: PyUnionType
__ror__: other
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: other with: self
%

! ------------------- the operator on the three type-shaped receivers

category: 'Grail-Operators'
method: PyGenericAlias
__or__: other
	"``list[int] | str''.  A parameterised generic is a valid union member."

	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: self with: other
%

category: 'Grail-Operators'
method: PyGenericAlias
__ror__: other
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: other with: self
%

category: 'Grail-Operators'
method: Metaclass3
__or__: other
	"``SomeClass | OtherClass'' -- PEP 604 on a plain class."

	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: self with: other
%

category: 'Grail-Operators'
method: Metaclass3
__ror__: other
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: other with: self
%

category: 'Grail-Operators'
method: BoundMethod
__or__: other
	"``str | bytes''.  A builtin referenced as a value is a BoundMethod in Grail,
	so the union operator has to live here too or the commonest spelling of a
	union -- builtins on both sides -- would still raise."

	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: self with: other
%

category: 'Grail-Operators'
method: BoundMethod
__ror__: other
	(PyUnionType ___isTypeOperand___: other) ifFalse: [^ NotImplemented].
	^ PyUnionType ___of___: other with: self
%

set compile_env: 0
