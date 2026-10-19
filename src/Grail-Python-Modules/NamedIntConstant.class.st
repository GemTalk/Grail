"Grail stand-in for CPython's ``class _NamedIntConstant(int)``
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
The CPython shim's ``PyLong_As*`` extractors first try ``GciOopToI64``
and fall back to sending ``__index__`` (env 1) when the OOP isn't a
tagged SmallInteger.  So a NamedIntConstant flowing into
``_sre.compile()``'s bytecode list is unboxed at the boundary — the C
side never sees the wrapper.

# Caveats — silent name loss
Arithmetic coerces the wrapper to its plain value, so results are plain
SmallIntegers (``MAXREPEAT - 1`` is a plain int).  The name is for
debug-time print only; do not depend on it surviving arithmetic."
Class {
	#name : 'NamedIntConstant',
	#superclass : 'AbstractPyInt',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
NamedIntConstant class >> value: aValue name: aName [
	"Construct a NamedIntConstant.  Smalltalk-side entry point."

	^ self basicNew
		setValue: aValue name: aName;
		yourself

]

{ #category : 'Grail-Accessors' }
NamedIntConstant >> setValue: aValue name: aName [

	self dynamicInstVarAt: #value put: aValue.
	self dynamicInstVarAt: #name put: aName.

]
