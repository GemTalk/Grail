! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- NamedIntConstant class definition
expectvalue /Class
doit
PythonInstance subclass: 'NamedIntConstant'
  instVarNames: #( value name )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
NamedIntConstant comment:
'Grail stand-in for CPython''s ``class _NamedIntConstant(int)``
pattern (re/_constants.py).  Wraps a SmallInteger ``value`' , '`'
, ' and a string ``name`` (typically the same name as the binding
the constant is assigned to), so ``repr()`` and debug dumps show
the symbolic name rather than the raw integer.

Designed for use as a symbol-like opcode identifier: each
constant is its own object, so ``op is LITERAL`` (identity)
distinguishes constants reliably.  The underlying int is reached
via ``__index__``, ``__int__``, or the ``value`` accessor.

# Why we don''t subclass int
Grail represents Python ``int`` as Smalltalk ``SmallInteger``, a
tagged-immediate type with no room for per-instance attributes.
Subclassing it to add a ``.name`` slot is not possible without
moving every int operation to a real heap-object representation,
which the rest of Grail isn''t paying for.

# How it crosses the C boundary
The CPython shim''s ``PyLong_As*`` extractors first try
``GciOopToI64`` and fall back to sending ``__index__`` (env 1) when
the OOP isn''t a tagged SmallInteger.  So a ``NamedIntConstant``
flowing into ``_sre.compile()``''s bytecode list is unboxed at the
boundary — the C side never sees the wrapper.

# Caveats — silent name loss
Operations that don''t go through ``__repr__`` lose the name and
yield a plain int.  Notably:
  - Arithmetic forwards via DNU to the underlying value and
    returns a SmallInteger (``MAXREPEAT - 1`` is a plain int).
  - ``f''{x}''`` formatting calls ``__format__``, not ``__repr__``,
    and goes through the same DNU path.
  - Reverse-direction equality (``16 == LITERAL``) only works
    because ``Int>>__eq__:`` has an ``__index__`` fallback; other
    SmallInteger methods that compare by identity will silently
    return ``False`` rather than failing loudly.

The name is meant for debug-time print only; do not depend on it
surviving arithmetic.'
%

expectvalue /Class
doit
NamedIntConstant category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
removeallmethods NamedIntConstant
removeallclassmethods NamedIntConstant

set compile_env: 0

! ------------------- Class-side: construction (env 0 + env 1)

category: 'Grail-Instance Creation'
classmethod: NamedIntConstant
value: aValue name: aName
	"Construct a NamedIntConstant.  Smalltalk-side entry point."

	^ self @env0:basicNew
		setValue: aValue name: aName;
		yourself
%

! ------------------- Instance-side: accessors

category: 'Grail-Accessors'
method: NamedIntConstant
setValue: aValue name: aName

	value := aValue.
	name := aName.
%

category: 'Grail-Accessors'
method: NamedIntConstant
value
	"The underlying SmallInteger.  Used by the CPython shim
	when crossing into C — see ``PyLong_AsLong`` in cpython.cc."

	^ value
%

! ------------------- Smalltalk-level equality and hashing
!
! Defined at env 0 so ``aNamedIntConstant = 16`` is true at the
! Smalltalk level — needed for SUnit ``assert:equals:`` and any
! Smalltalk-side use of the wrapper in sets/dicts.  Mirrors the
! pattern Grail's Int / Bool / Float classes follow.

category: 'Grail-Comparison'
method: NamedIntConstant
= other

	(other isKindOf: NamedIntConstant) ifTrue: [^ value = other value].
	^ value = other
%

category: 'Grail-Hashing'
method: NamedIntConstant
hash

	^ value hash
%

set compile_env: 1

! ------------------- Python protocol — env-1 methods

category: 'Grail-Instance Creation'
classmethod: NamedIntConstant
__new__: aValue _: aName
	"Python fast-path instantiation entry point —
	``NamedIntConstant(value, name)`` compiles to
	``NamedIntConstant @env1:__new__: value _: name`` via
	CallAst's bareCallClassNewSelector discriminator."

	^ self @env0:value: aValue name: aName
%

category: 'Grail-Instance Creation'
classmethod: NamedIntConstant
value: positional value: keywords
	"Legacy call-form entry point — fires when the call site can't
	resolve the receiver as a known class at codegen time (e.g.
	``_NamedIntConstant = NamedIntConstant`` then
	``_NamedIntConstant(v, n)`` — the alias isn't in the Python
	dictionary, so bareCallClassNewSelector returns nil and the
	codegen emits the generic ``value:value:`` form)."

	^ self @env0:value: (positional @env0:at: 1) name: (positional @env0:at: 2)
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
name
	"Python attribute access — ``constant.name`` returns the
	symbolic name passed at construction."

	^ name
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
name: aValue
	"The ``name`` slot is read-only; the setter exists only so
	``___pyAttrLoad___:`` treats ``name`` as a value attribute
	rather than wrapping the getter in a BoundMethod.  Same
	pattern as @property's AttributeError setter."

	AttributeError ___signal___: 'attribute ''name'' is read-only on NamedIntConstant'
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__index__
	"Python integer-conversion contract (PEP 357).  CPython
	uses this when a C API needs ``Py_ssize_t``; we use it for
	the same purpose in the shim.  Always returns a SmallInteger."

	^ value
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__int__
	"`int(named)` — defers to __index__ for the SmallInteger value."

	^ value
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__repr__
	"`repr(named)` — the symbolic name.  This is the whole point
	of the wrapper: debug dumps show ``LITERAL`` rather than ``16``."

	^ name
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__str__
	"`str(named)` — mirror Python's int subclass, which returns
	the string of the integer value, not the name.  The name
	only surfaces via repr()."

	^ value @env1:__str__
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__hash__
	"Hash by underlying value, so a NamedIntConstant and its
	integer value collide in dict/set membership consistently
	with __eq__."

	^ value @env1:__hash__
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__eq__: other
	"Value-based equality.  Unwrap other if it's also a
	NamedIntConstant, otherwise dispatch to the underlying int's
	__eq__ which handles SmallInteger vs SmallInteger comparison."

	(other isKindOf: NamedIntConstant) ifTrue: [
		^ value @env1:__eq__: other value
	].
	^ value @env1:__eq__: other
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__ne__: other
	"Negation of __eq__."

	^ (self @env1:__eq__: other) not
%

! ------------------- Ordered comparison
!
! Object defines abstract env-1 stubs for __lt__:, __le__:, __gt__:,
! __ge__: that raise "Not yet implemented".  Inheriting them would
! intercept env-1 dispatch BEFORE DNU could forward to the underlying
! int, so we override each explicitly here.  Unwrap other if it's
! also a NamedIntConstant; otherwise let int's comparison handle the
! SmallInteger-vs-other dispatch.

category: 'Grail-Python Protocol'
method: NamedIntConstant
__lt__: other

	(other isKindOf: NamedIntConstant) ifTrue: [
		^ value @env1:__lt__: other value
	].
	^ value @env1:__lt__: other
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__le__: other

	(other isKindOf: NamedIntConstant) ifTrue: [
		^ value @env1:__le__: other value
	].
	^ value @env1:__le__: other
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__gt__: other

	(other isKindOf: NamedIntConstant) ifTrue: [
		^ value @env1:__gt__: other value
	].
	^ value @env1:__gt__: other
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__ge__: other

	(other isKindOf: NamedIntConstant) ifTrue: [
		^ value @env1:__ge__: other value
	].
	^ value @env1:__ge__: other
%

set compile_env: 0

! ------------------- DNU forwarder (env-0, so env-1 misses route here)

category: 'Grail-Python Protocol'
method: NamedIntConstant
doesNotUnderstand: aSelector args: anArray envId: envId
	"Forward unknown env-1 messages to the wrapped SmallInteger.
	Covers __add__, __sub__, __and__, __or__, __lt__, __le__,
	__gt__, __ge__, and the rest of the numeric protocol — anything
	we haven't overridden above falls through to integer arithmetic
	and returns a plain SmallInteger.

	If the receiver of the original message is a NamedIntConstant
	in arithmetic position, the result strips the name — that is a
	documented and intentional limitation (see class comment).

	Lives in env-0 because GemStone's env-1 dispatch falls back to
	the env-0 DNU when a message isn't found in env-1 (mirroring
	the PythonInstance DNU setup)."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	^ value perform: aSelector env: 1 withArguments: anArray
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
cantPerform: aSymbol withArguments: anArray env: envId
	"Mirror DNU for explicit perform: env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%
