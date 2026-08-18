! ===============================================================================
! PyStaticMethod / PyClassMethod — the ``staticmethod'' and ``classmethod''
! builtins as REAL descriptor objects.
!
! Both used to be identity stubs (``staticmethod: fn  ^ fn''), which works for
! the DECORATOR form only because ClassDefAst recognises ``@staticmethod'' /
! ``@classmethod'' at parse time and compiles the def onto the right side of
! the class.  The VALUE form -- ``digest_method = staticmethod(_lazy_sha1)'',
! which flask, werkzeug, itsdangerous and jinja2 all use -- got no such help:
!
!   * ``classmethod(f)'' stored as a class attribute never bound the class, so
!     ``A.cm(x)'' and ``a.cm(x)'' both called ``f(x)'' instead of ``f(A, x)''.
!
!   * ``staticmethod(f)'' relied on f NOT looking like something to bind.  A
!     function from a Python-source module does look like one, so reading it
!     through an instance bound self and passed the receiver as the wrapped
!     function's first argument.  object >> ___isDescriptorCallable___: carries
!     a special case excluding builtin (Smalltalk-implemented) functions
!     precisely to keep that from happening for the builtin half.
!
! As real objects they answer __get__, which the class-attribute read paths
! honour (object >> ___isValueDescriptor___:), so binding is decided by the
! wrapper rather than guessed from what it wraps.
!
! Kept as ``PyStaticMethod'' / ``PyClassMethod'' rather than ``staticmethod'' /
! ``classmethod'': the Smalltalk globals live in one flat Python dictionary
! alongside the module classes, and __name__ / __qualname__ report the Python
! spelling regardless.
! ===============================================================================

! ------- PyStaticMethod
expectvalue /Class
doit
PythonInstance subclass: 'PyStaticMethod'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyStaticMethod comment:
'Python ``staticmethod(f)'' -- a descriptor whose __get__ answers the wrapped
function UNBOUND, however it is reached.  Callable in its own right, as
CPython''s has been since 3.10.'
%

expectvalue /Class
doit
PyStaticMethod category: 'Grail-Modules'
%

! ------- PyClassMethod
expectvalue /Class
doit
PythonInstance subclass: 'PyClassMethod'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyClassMethod comment:
'Python ``classmethod(f)'' -- a descriptor whose __get__ binds the CLASS as the
wrapped function''s first argument, whether it is read through the class or
through an instance.  Not callable directly, matching CPython.'
%

expectvalue /Class
doit
PyClassMethod category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyStaticMethod removeAllMethods: 1.
PyStaticMethod class removeAllMethods: 1.
PyClassMethod removeAllMethods: 1.
PyClassMethod class removeAllMethods: 1.
%

set compile_env: 1

! ------------------------------------------------------------------ static

category: 'Grail-Instantiation'
classmethod: PyStaticMethod
value: positional value: keywords
	"staticmethod(f) -- the class-call entry."

	^ self ___allocateInstance___: positional kw: keywords
%

category: 'Grail-Class-Call Fast Path'
classmethod: PyStaticMethod
__new__: fn
	"``staticmethod(fn)'' fixed-arity class-new fast path -- CallAst emits
	``(staticmethod @env1:__new__: f)'' now that the bare name resolves to this
	CLASS (so ``type(staticmethod(f)) is staticmethod'').  Mirrors ___new__:kw:."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: fn.
	^ inst
%

category: 'Grail-Instantiation'
classmethod: PyStaticMethod
___pyCallValue___: positional kw: kwargs
	"The indirect protocol, which is how a class-body decorator reaches the
	class.  See functools_cached_property for why this is opt-in per class
	rather than answered for every class on ``object''."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs
%

category: 'Grail-Reflection'
classmethod: PyStaticMethod
__name__
	^ 'staticmethod'
%

category: 'Grail-Reflection'
classmethod: PyStaticMethod
__qualname__
	^ 'staticmethod'
%

category: 'Grail-Instantiation'
method: PyStaticMethod
___new__: positional kw: keywords
	| inst |
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		TypeError ___signal___: 'staticmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ inst
%

category: 'Grail-Descriptor'
method: PyStaticMethod
__get__: obj _: cls
	"Never binds -- that is the whole point of a static method."

	^ self @env0:dynamicInstVarAt: #'__func__'
%

category: 'Grail-Descriptor'
method: PyStaticMethod
__get__: obj
	^ self @env0:dynamicInstVarAt: #'__func__'
%

category: 'Grail-Callable'
method: PyStaticMethod
___pyCallValue___: positional kw: kwargs
	"CPython 3.10+ made staticmethod objects callable, so
	``staticmethod(f)(x)'' works without going through a class."

	^ (self @env0:dynamicInstVarAt: #'__func__')
		___pyCallValue___: positional kw: kwargs
%

category: 'Grail-Callable'
method: PyStaticMethod
value: positional value: kwargs
	^ (self @env0:dynamicInstVarAt: #'__func__')
		___pyCallValue___: positional kw: kwargs
%

category: 'Grail-Reflection'
method: PyStaticMethod
__isabstractmethod__
	"abc reads this with getattr on every class-body entry, so it has to
	answer rather than raise, and it must report what it WRAPS."

	^ self ___wrappedIsAbstract___
%

category: 'Grail-Reflection'
method: PyStaticMethod
__repr__
	"CPython names the WRAPPED callable: ``<staticmethod(<function f at 0x...>)>''.
	``<staticmethod object>'' told a reader nothing about which function this
	wraps, which is the only interesting thing about a wrapper, and
	test_decorators asserts the form."

	^ self ___wrapperRepr___: 'staticmethod'
%

! ------------------------------------------------------------------ class

category: 'Grail-Callable'
method: PyClassMethod
___pyCallValue___: positional kw: kwargs
	"A classmethod object is NOT callable.  CPython made STATICMETHOD callable in
	3.10 (bpo-43682) and deliberately left classmethod alone, because a
	classmethod has nothing to bind its first argument to until a class supplies
	one.

	Answered as a catchable TypeError rather than left to fall through.  Without
	it the call reached ``doesNotUnderstand: #'__call__''' -- an env-1
	MessageNotUnderstood, which Python cannot catch, so
	``assertRaises(TypeError, wrapper, 1)'' did not fail, it took the whole test
	down as an error."

	^ TypeError ___signal___: '''classmethod'' object is not callable'
%

category: 'Grail-Callable'
method: PyClassMethod
value: positional value: kwargs
	"The other call entry point, refusing for the same reason -- both have to,
	or which one a caller happens to reach decides whether the refusal is
	catchable."

	^ TypeError ___signal___: '''classmethod'' object is not callable'
%

category: 'Grail-Instantiation'
classmethod: PyClassMethod
value: positional value: keywords
	"classmethod(f) -- the class-call entry."

	^ self ___allocateInstance___: positional kw: keywords
%

category: 'Grail-Class-Call Fast Path'
classmethod: PyClassMethod
__new__: fn
	"``classmethod(fn)'' fixed-arity class-new fast path (see PyStaticMethod)."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: fn.
	^ inst
%

category: 'Grail-Instantiation'
classmethod: PyClassMethod
___pyCallValue___: positional kw: kwargs
	"Constructing through the indirect protocol -- see PyStaticMethod."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs
%

category: 'Grail-Reflection'
classmethod: PyClassMethod
__name__
	^ 'classmethod'
%

category: 'Grail-Reflection'
classmethod: PyClassMethod
__qualname__
	^ 'classmethod'
%

category: 'Grail-Instantiation'
method: PyClassMethod
___new__: positional kw: keywords
	| inst |
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		TypeError ___signal___: 'classmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ inst
%

category: 'Grail-Descriptor'
method: PyClassMethod
__get__: obj _: cls
	"Binds the CLASS, whether reached through the class (obj is None, cls is
	the class) or through an instance (both supplied).  MethodBinding is what
	prepends a receiver to the call arguments."

	| owner |
	owner := (cls == nil or: [cls == None])
		ifTrue: [(obj == nil or: [obj == None])
			ifTrue: [nil]
			ifFalse: [obj @env0:class]]
		ifFalse: [cls].
	owner == nil ifTrue: [
		TypeError ___signal___:
			'classmethod descriptor needs an owner class to bind'].
	^ MethodBinding instance: owner
		callable: (self @env0:dynamicInstVarAt: #'__func__')
%

category: 'Grail-Descriptor'
method: PyClassMethod
__get__: obj
	^ self __get__: obj _: None
%

category: 'Grail-Reflection'
method: PyClassMethod
__isabstractmethod__
	^ self ___wrappedIsAbstract___
%

category: 'Grail-Reflection'
method: PyClassMethod
__repr__
	^ self ___wrapperRepr___: 'classmethod'
%

! ------------------------------------------------------------------ shared

category: 'Grail-Private'
method: PythonInstance
___wrappedIsAbstract___
	"__isabstractmethod__ of the wrapped callable, defaulting to false.
	Shared by both wrappers; guarded because most callables do not answer it."

	^ [| f v |
		f := self @env0:dynamicInstVarAt: #'__func__'.
		v := f @env1:___pyAttrLoad___: #'__isabstractmethod__'.
		v == true]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: false]
%

! ------------------- Identity metadata, forwarded to the wrapped function
! CPython's classmethod / staticmethod expose the wrapped function's identity:
! ``SomeClass.__dict__['m'].__name__'' is the function's name.  Grail's answered
! nothing at all, so a caller that inspected one -- functools.wraps copying
! metadata, or singledispatchmethod naming the method in an arity error -- died
! with an uncatchable ``env-1 #'__name__' not understood by PyClassMethod''.

category: 'Grail-Attribute Access'
method: PythonInstance
___wrappedMeta___: aName
	"Read aName off the wrapped ``__func__'' through the Python attribute
	protocol.  Shared by both wrappers."

	^ (self @env0:dynamicInstVarAt: #'__func__') @env1:___pyAttrLoad___: aName
%

category: 'Grail-Reflection'
method: PythonInstance
___wrapperRepr___: aTypeName
	"``<staticmethod(<function f at 0x...>)>'' -- CPython's form, naming the
	wrapped callable through its own repr.  Shared by both wrappers.

	The wrapped repr is taken through the Python protocol rather than
	printString, so a wrapped object with its own __repr__ is honoured."

	| f inner |
	f := self @env0:dynamicInstVarAt: #'__func__'.
	inner := [(f @env1:__repr__) @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: '?'].
	^ ('<' @env0:, aTypeName @env0:, '(' @env0:, inner @env0:, ')>')
		@env0:asUnicodeString
%

category: 'Grail-Attribute Access'
method: PyStaticMethod
__wrapped__
	"CPython exposes the wrapped callable under BOTH names: ``__func__'' is the
	descriptor protocol's spelling, ``__wrapped__'' is the one the introspection
	tools use -- inspect.signature follows it, and functools.wraps sets it.  Grail
	had only the first, so anything that unwrapped generically saw a wrapper it
	could not look through."

	^ self @env0:dynamicInstVarAt: #'__func__'
%

category: 'Grail-Attribute Access'
method: PyClassMethod
__wrapped__
	^ self @env0:dynamicInstVarAt: #'__func__'
%

category: 'Grail-Attribute Access'
method: PyStaticMethod
__module__
	"Forwarded like __name__ / __qualname__ / __doc__: the wrapper reports the
	identity of what it wraps, and CPython's staticmethod copies __module__ among
	them.  Missing entirely, so ``getattr(wrapper, '__module__')'' raised."

	^ self ___wrappedMeta___: #'__module__'
%

category: 'Grail-Attribute Access'
method: PyClassMethod
__module__
	^ self ___wrappedMeta___: #'__module__'
%

category: 'Grail-Attribute Access'
method: PyClassMethod
__name__
	^ self ___wrappedMeta___: #'__name__'
%

category: 'Grail-Attribute Access'
method: PyClassMethod
__qualname__
	^ self ___wrappedMeta___: #'__qualname__'
%

category: 'Grail-Attribute Access'
method: PyClassMethod
__doc__
	^ self ___wrappedMeta___: #'__doc__'
%

category: 'Grail-Reflection'
method: PyStaticMethod
__annotations__
	"Forwarded like __name__ / __doc__: a decorator that inspects the wrapped
	callable's annotations must see them through the wrapper, and
	singledispatchmethod's annotation form infers its dispatch type from them."

	^ self ___wrappedMeta___: #'__annotations__'
%

category: 'Grail-Reflection'
method: PyStaticMethod
__annotate__
	"PEP 649, forwarded for the same reason: functools.update_wrapper copies
	__annotate__ (not __annotations__), so a wrapper built around a
	@classmethod / @staticmethod only inherits annotations if this answers."

	^ self ___wrappedMeta___: #'__annotate__'
%

category: 'Grail-Reflection'
method: PyClassMethod
__annotations__
	"Forwarded like __name__ / __doc__: a decorator that inspects the wrapped
	callable's annotations must see them through the wrapper, and
	singledispatchmethod's annotation form infers its dispatch type from them."

	^ self ___wrappedMeta___: #'__annotations__'
%

category: 'Grail-Reflection'
method: PyClassMethod
__annotate__
	"PEP 649, forwarded for the same reason: functools.update_wrapper copies
	__annotate__ (not __annotations__), so a wrapper built around a
	@classmethod / @staticmethod only inherits annotations if this answers."

	^ self ___wrappedMeta___: #'__annotate__'
%

category: 'Grail-Attribute Access'
method: PyStaticMethod
__name__
	^ self ___wrappedMeta___: #'__name__'
%

category: 'Grail-Attribute Access'
method: PyStaticMethod
__qualname__
	^ self ___wrappedMeta___: #'__qualname__'
%

category: 'Grail-Attribute Access'
method: PyStaticMethod
__doc__
	^ self ___wrappedMeta___: #'__doc__'
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PyStaticMethod
___pythonValueAttrs___
	"``__isabstractmethod__'' is a value in CPython, and abc consults it with
	getattr -- a callable wrapper would test truthy whatever it wrapped.  The
	identity trio is forwarded from the wrapped function and is likewise a value."

	^ IdentitySet new
		add: #'__isabstractmethod__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__doc__';
		add: #'__module__';
		add: #'__wrapped__';
		add: #'__annotations__';
		yourself
%

category: 'Grail-Python Attribute Hook'
classmethod: PyClassMethod
___pythonValueAttrs___
	^ IdentitySet new
		add: #'__isabstractmethod__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__doc__';
		add: #'__module__';
		add: #'__wrapped__';
		add: #'__annotations__';
		yourself
%

set compile_env: 0

! Expose PyStaticMethod / PyClassMethod under their PYTHON names in the Python
! dict so ___initBuiltinNamespace___ (builtins.gs, which already lists
! #staticmethod/#classmethod and binds each name that resolves to a class) makes
! the bare name resolve to the TYPE -- ``type(staticmethod(f)) is staticmethod''.
! ``staticmethod(f)'' behaviour is unchanged (the class-call builds the same
! wrapper the removed builtins method did); the @staticmethod decorator is
! parse-time in ClassDefAst and never used the name.
doit
Python at: #'staticmethod' put: PyStaticMethod.
Python at: #'classmethod' put: PyClassMethod.
true
%
