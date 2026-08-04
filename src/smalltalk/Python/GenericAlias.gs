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
	VARIABLE rather than a concrete type.  CPython asks for
	__typing_subst__; Grail's typing.TypeVar answers a _TypeVarInstance, so
	recognise that by class name -- typing is a Python-source module, so
	there is no Smalltalk global to compare against."

	| cls |
	anObject @env0:== nil ifTrue: [^ false].
	cls := anObject @env0:class.
	^ cls @env0:name @env0:asString @env0:= '_TypeVarInstance'
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
	everything but its own handful, so ``list[int].append'' works."

	^ (self @env0:dynamicInstVarAt: #'__origin__')
		@env1:___pyAttrLoad___: aName
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

set compile_env: 0
