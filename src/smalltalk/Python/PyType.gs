! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PyType — the Python 'type' type
!
! PythonInstance, NOT ``object''.  The bare name ``object'' resolves to GemStone
! Object, and ClassDefAst redirects a Python ``class C(object)'' to
! PythonInstance for exactly this reason: every ``isKindOf: PythonInstance''
! gate in ___pyAttrLoad___ (property pair-reads, class-attr fallbacks) misfires
! for a class outside that chain.  A metaclass rooted here is a Python class
! like any other and must not drop out of it.
expectvalue /Class
doit
PythonInstance subclass: 'PyType'
  instVarNames: #( )
  classVars: #()
  classInstVars: #( dynInstVars )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyType comment:
'Python''s ``type'': the class whose instances are classes.

Grail has always had a ``type'' BUILTIN -- ``type(x)'' answers x''s class --
but never a ``type'' OBJECT.  The name evaluated to a BoundMethod on builtins,
so every property that makes ``type'' a class was false:

    repr(type)              <BoundMethod object at 0x...>   (CPython: <class ''type''>)
    type(type)              BoundMethod                     (CPython: type)
    isinstance(type, type)  False                           (CPython: True)
    type.__mro__            AttributeError                  (CPython: (type, object))

The consequence that mattered is inheritance: ``class Meta(type)'' could not
root at a non-class, so it silently rooted at PythonInstance instead.  A
metaclass therefore had no ``type'' in its ancestry, ``super().__new__(cls,
name, bases, ns)'' had nothing to reach, and ``issubclass(Meta, type)'' was
false -- which is why object >> ___pyMetaclass___ deliberately does NOT report
a declared ``metaclass='' (it broke copy()''s ``issubclass(type(x), type)''
atomic test).

This class is that missing object.  It is deliberately EMPTY of construction
machinery at this stage: it exists so that ``type'' is a class, so that
``class Meta(type)'' has a real base, and so the rooting can be measured on
its own before class creation is routed through it.  The type-construction
protocol (__call__ / __new__ / __init__ / mro) lands on top of it, and the
class statement is taught to route through a metaclass after that.

WHY A SEPARATE CLASS AND NOT A SMALLTALK METACLASS.  Smalltalk''s metaclass
cannot model Python''s.  ``Foo class'' is auto-created with Foo, has exactly
one instance, and its superclass is FORCED: ``Foo class superclass = Foo
superclass class''.  So the metaclass hierarchy is a rigid mirror of the class
hierarchy, while Python lets the two differ arbitrarily -- ``class A(Base,
metaclass=Meta)'' takes its bases from Base and its type from Meta, and one
metaclass is shared by any number of classes.  Neither the sharing nor the
independence is expressible with ``Foo class'', which is why a Python
metaclass is an ORDINARY Grail class here and the Smalltalk metaclass keeps
its own job (holding @classmethods and class attributes).  See
docs/Class_Body_Namespace.md.'
%

expectvalue /Class
doit
PyType category: 'Grail-Python Types'
%

set compile_env: 1

category: 'Grail-Class-Call Fast Path'
classmethod: PyType
value: positional value: kwargs
	"``type(...)'' reaching the class through the legacy call dispatch.

	Binding the NAME ``type'' to this class is what makes the call arrive here
	at all: NameAst >> isResolvableSymbol: then answers true, so a bare
	``type'' in call position emits the CLASS rather than a BoundMethod on
	builtins, and CallAst routes the call to the metaclass.  Registering the
	name WITHOUT this method was tried and broke class creation outright --
	``type('NewClass', (object,), {})'' died with ``a Metaclass3 does not
	understand #_new:kw:'' (test_subclassinit test_type).  The name and the
	call protocol have to land together, which is why they do."

	^ self _new: positional kw: kwargs
%

category: 'Grail-Class-Call Fast Path'
classmethod: PyType
_new: positional kw: kwargs
	"Python's ``type'' constructor, both spellings:

	  type(x)                 -- the object's type
	  type(name, bases, ns)   -- build a class

	Delegates to the builtins implementations rather than reimplementing
	either, so this is a re-entry point and not a second copy: ``type(x)''
	is object >> ___pyMetaclass___, and the three-argument form is the class
	builder that learned to honour a non-empty namespace.

	CPython rejects the keyword spelling -- ``type(name='C', bases=(), dict={})''
	raises TypeError, which test_subclassinit test_type asserts -- so kwargs
	are refused rather than merged into the positional count."

	| n |
	(kwargs @env0:notNil and: [kwargs @env0:isEmpty @env0:not]) @env0:ifTrue: [
		^ TypeError @env1:___signal___: 'type() takes no keyword arguments'].
	n := positional @env0:size.
	(n @env0:= 1) @env0:ifTrue: [
		^ (builtins @env1:instance) @env1:type: (positional @env0:at: 1)].
	(n @env0:= 3) @env0:ifTrue: [
		^ (builtins @env1:instance)
			@env1:type: (positional @env0:at: 1)
			_: (positional @env0:at: 2)
			_: (positional @env0:at: 3)].
	^ TypeError @env1:___signal___:
		'type() takes 1 or 3 arguments'
%

set compile_env: 0

! The flat Python dictionary entry.  This is what binds the NAME ``type'' to a
! class, so that ``type'' as a VALUE is a class object rather than a
! BoundMethod -- which is what makes issubclass(Meta, type) and
! isinstance(type, type) answerable at all.  It only works alongside the call
! protocol above; see that method for what breaks without it.
run
Python at: #'type' put: PyType.
PyType
%
