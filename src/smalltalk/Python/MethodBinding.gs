! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- MethodBinding class definition
expectvalue /Class
doit
Object subclass: 'MethodBinding'
  instVarNames: #( instance callable )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
MethodBinding comment:
'Python descriptor-protocol bound method.  When a callable (a
function, BoundMethod, lambda block) is stored on a class and then
read through an INSTANCE, Python returns a bound method that
prepends the instance to the call''s positional arguments and
forwards to the underlying callable.

    class C: pass
    def greet(self, name): return self.x, name
    C.greet = greet
    c = C(); c.x = 7
    c.greet(''hi'')             # → (7, ''hi'') — self prepended

Reading the same attribute through the CLASS (``C.greet'') returns
the function unchanged.  Storing on the INSTANCE
(``c.method = func'') skips the descriptor protocol entirely and
``c.method(2)'' calls func(2) directly with no self prepend.

This is distinct from BoundMethod: BoundMethod = (receiver,
selector) — when called, dispatches the selector to the receiver.
MethodBinding = (instance, callable) — when called, prepends
instance to args and forwards to the inner callable.  The wrap is
applied by ___pyAttrLoad___ when a callable is found in a class''s
dynInstVars (NOT the instance''s own dynInstVars — that path
bypasses descriptors).'
%

expectvalue /Class
doit
MethodBinding category: 'Grail-Modules'
%

! ------------------- Remove existing behavior from MethodBinding
removeallmethods MethodBinding
removeallclassmethods MethodBinding

set compile_env: 0

! ------------------- Instance methods (env 0 — internal setup and accessors)

category: 'Grail-Private'
method: MethodBinding
_setInstance: anObject callable: aCallable
	instance := anObject.
	callable := aCallable.
%

category: 'Grail-Accessing'
method: MethodBinding
instance
	^ instance
%

category: 'Grail-Accessing'
method: MethodBinding
callable
	^ callable
%

set compile_env: 1

! ------------------- Class methods (env 1)

category: 'Grail-Instance Creation'
classmethod: MethodBinding
instance: anInstance callable: aCallable
	"Create a MethodBinding that prepends ``anInstance'' to its
	positional arguments and forwards to ``aCallable''.  ``aCallable''
	is typically a BoundMethod (from a top-level def) or an ExecBlock
	(from a lambda or nested def closure)."

	| inst |
	inst := self @env0:new.
	inst @env0:_setInstance: anInstance callable: aCallable.
	^ inst
%

set compile_env: 0

! ------------------- Instance methods (env 1 — call protocol)

set compile_env: 1

category: 'Grail-Calling'
method: MethodBinding
value: positional value: kwargs
	"Prepend the bound instance to ``positional'' and forward the call
	to the underlying callable.  Mirrors CPython''s bound-method
	semantics: ``f = cls.method; f(c, x)'' is the same as
	``c.method(x)'' — the wrapper handles the latter by inserting c."

	| newPositional |
	newPositional := { instance } @env0:, positional.
	^ callable ___pyCallValue___: newPositional kw: kwargs
%

category: 'Grail-Callable'
method: MethodBinding
__call__: positional
	"Make MethodBinding respond to Python''s ``callable(...)'' protocol.
	Forwards to the varargs entry point with empty kwargs."

	^ self value: positional value: nil
%

category: 'Grail-Callable'
method: MethodBinding
___pyCallValue___: positional kw: kwargs
	"Forward the Python ``f(args, **kw)'' call site to the
	descriptor-bound dispatch."

	^ self value: positional value: kwargs
%

category: 'Grail-Reflection'
method: MethodBinding
__self__
	"Python's bound-method ``m.__self__'' -- the receiver this binding
	prepends.  A MethodBinding exists only where something WAS bound, so
	answering it is unconditional; the unbound cases never produce one.
	functools.partialmethod is the discriminator that makes that true: over a
	@staticmethod its __get__ answers the partialmethod itself rather than a
	binding, so ``A.static'' and ``a.static'' still have no __self__, and a
	plain partialmethod read off the CLASS is likewise handed back raw."

	^ instance
%

category: 'Grail-Reflection'
method: MethodBinding
__func__
	"The underlying callable, the companion of __self__ on a bound method."

	^ callable
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: MethodBinding
___pythonValueAttrs___
	"``__self__'' / ``__func__'' are the bound receiver and function, values
	rather than callables; without this the attribute read wraps the accessor
	in a BoundMethod and ``m.__self__ is obj'' compares the wrapper."

	^ IdentitySet new
		add: #'__self__';
		add: #'__func__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__doc__';
		add: #'__annotations__';
		yourself
%

set compile_env: 1

! ------------------- Function metadata, forwarded to the bound callable
! A bound method exposes the underlying function's identifying metadata --
! ``a.meth.__name__'' is the function's name, not the binding's.  Without these
! every one of them raised AttributeError on a bound access while the same read
! through the CLASS answered correctly, which is what test_functools
! TestSingleDispatch.test_method_wrapping_attributes checks for both.

category: 'Grail-Reflection'
classmethod: MethodBinding
__module__
	"``type(a.meth).__module__''.  CPython's bound-method type is
	``builtins.method'', so 'builtins' is the honest answer for Grail's generic
	binding.

	Class-side because the instance-side __module__ below forwards to the wrapped
	callable: reading __module__ on the CLASS found that instance method and
	wrapped it as an UnboundMethod, so ``type(a.meth).__module__'' answered a
	callable rather than any module name.

	Known divergence: for a bound singledispatchmethod CPython answers
	'functools', because its __get__ returns a functools-specific wrapper rather
	than a generic bound method.  Grail returns a MethodBinding for every bound
	access, so test_method_wrapping_attributes still fails on that one assertion
	-- claiming 'functools' here would be wrong for every other bound method."

	^ 'builtins'
%

category: 'Grail-Reflection'
classmethod: MethodBinding
__qualname__
	^ 'method'
%

category: 'Grail-Attribute Access'
method: MethodBinding
__getattr__: aName
	"Forward any attribute the binding itself does not define to the wrapped
	callable.  A bound method in CPython exposes the underlying function's
	attributes, and code relies on it: an lru_cache-wrapped METHOD reached
	through an instance answers ``a.f.cache_info()'' / ``cache_clear()'' --
	django.utils.functional does the latter -- and those live on the wrapper,
	not on the binding.

	Raises AttributeError when the callable has none either, so a genuine typo
	still reports as one."

	^ (self @env0:callable) @env1:___pyAttrLoad___: aName @env0:asString @env0:asSymbol
%

category: 'Grail-Attribute Access'
method: MethodBinding
___boundMeta___: aName
	"Read aName off the bound callable through the Python attribute protocol,
	raising AttributeError when it has none -- the same answer an unbound read
	would give, so both access paths agree."

	^ (self @env0:callable) @env1:___pyAttrLoad___: aName
%

category: 'Grail-Attribute Access'
method: MethodBinding
__name__
	^ self ___boundMeta___: #'__name__'
%

category: 'Grail-Attribute Access'
method: MethodBinding
__qualname__
	^ self ___boundMeta___: #'__qualname__'
%

category: 'Grail-Attribute Access'
method: MethodBinding
__module__
	^ self ___boundMeta___: #'__module__'
%

category: 'Grail-Attribute Access'
method: MethodBinding
__doc__
	"The wrapped callable's docstring.  Without this the read fell through to
	Object's own __doc__ and a bound method claimed to be documented as ``The
	base class of the class hierarchy...''."

	^ self ___boundMeta___: #'__doc__'
%

category: 'Grail-Attribute Access'
method: MethodBinding
__annotations__
	^ self ___boundMeta___: #'__annotations__'
%

set compile_env: 0
