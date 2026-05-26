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
	^ callable @env1:___pyCallValue___: newPositional kw: kwargs
%

category: 'Grail-Callable'
method: MethodBinding
__call__: positional
	"Make MethodBinding respond to Python''s ``callable(...)'' protocol.
	Forwards to the varargs entry point with empty kwargs."

	^ self @env1:value: positional value: nil
%

category: 'Grail-Callable'
method: MethodBinding
___pyCallValue___: positional kw: kwargs
	"Forward the Python ``f(args, **kw)'' call site to the
	descriptor-bound dispatch."

	^ self @env1:value: positional value: kwargs
%

set compile_env: 0
