! ------------------- Superclass check
run
AbstractPyInt ifNil: [self error: 'AbstractPyInt is not defined. Check file ordering.'].
%

! ------- NamedIntConstant class definition
expectvalue /Class
doit
AbstractPyInt subclass: 'NamedIntConstant'
  instVarNames: #()
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
pattern (re/_constants.py).  A real number (see [[AbstractPyInt]])
wrapping a SmallInteger ``value`` plus a string ``name`` (usually the
binding it is assigned to), so ``repr()`` and debug dumps show the
symbolic name rather than the raw integer.

Designed as a symbol-like opcode identifier: each constant is its own
object, so ``op is LITERAL`` (identity) distinguishes constants
reliably.  Inherits the int-like numeric protocol from AbstractPyInt
(comparison, hashing, arithmetic-by-coercion, ``__index__``, and
``isinstance(op, int) == True``); the underlying int is also reachable
via ``value`` / ``__int__`` / ``__index__``.

# How it crosses the C boundary
The CPython shim''s ``PyLong_As*`` extractors first try ``GciOopToI64``
and fall back to sending ``__index__`` (env 1) when the OOP isn''t a
tagged SmallInteger.  So a NamedIntConstant flowing into
``_sre.compile()``''s bytecode list is unboxed at the boundary — the C
side never sees the wrapper.

# Caveats — silent name loss
Arithmetic coerces the wrapper to its plain value, so results are plain
SmallIntegers (``MAXREPEAT - 1`` is a plain int).  The name is for
debug-time print only; do not depend on it surviving arithmetic.'
%

expectvalue /Class
doit
NamedIntConstant category: 'Grail-Modules'
%

! ------------------- Remove existing behavior (env 0 AND env 1, so methods
! now inherited from AbstractPyInt do not linger from a prior install)
expectvalue /Metaclass3
doit
NamedIntConstant removeAllMethods.
NamedIntConstant class removeAllMethods.
NamedIntConstant removeAllMethods: 1.
NamedIntConstant class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- Class-side: construction (env 0 + env 1)

category: 'Grail-Instance Creation'
classmethod: NamedIntConstant
value: aValue name: aName
	"Construct a NamedIntConstant.  Smalltalk-side entry point."

	^ self basicNew
		setValue: aValue name: aName;
		yourself
%

! ------------------- Instance-side: accessors

category: 'Grail-Accessors'
method: NamedIntConstant
setValue: aValue name: aName

	self dynamicInstVarAt: #value put: aValue.
	self dynamicInstVarAt: #name put: aName.
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
	"Python attribute access — ``constant.name`` returns the symbolic
	name passed at construction (read from dynamic-instVar storage)."

	^ self @env0:dynamicInstVarAt: #name
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
name: aValue
	"The ``name`` slot is read-only.  Python ``setattr(c, 'name', x)``
	hits this method and gets AttributeError instead of silently
	overwriting."

	AttributeError ___signal___: 'attribute ''name'' is read-only on NamedIntConstant'
%

category: 'Grail-Python Protocol'
method: NamedIntConstant
__repr__
	"`repr(named)` — the symbolic name.  This is the whole point of the
	wrapper: debug dumps show ``LITERAL`` rather than ``16``.  Overrides
	AbstractPyInt's value-based repr."

	^ self name
%

set compile_env: 0
