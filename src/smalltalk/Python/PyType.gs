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

! DELIBERATELY NOT registered in the flat Python dictionary as ``type''.
!
! Adding ``Python at: #'type' put: PyType'' was tried and REGRESSED two
! modules.  The entry makes NameAst >> isResolvableSymbol: answer true for
! ``type'', so a bare ``type'' in call position stops emitting the builtin
! fast path and starts emitting the CLASS -- and ``type('NewClass', (object,),
! {})'' then compiles as a constructor call, dying with a Smalltalk
! MessageNotUnderstood (``a Metaclass3 does not understand #_new:kw:'') where
! it used to build a class (test_subclassinit test_type).
!
! Nothing needs the alias yet: ClassDefAst emits the literal ``PyType'' for a
! ``class M(type)'' base, which resolves as an ordinary Smalltalk global.
! Registering the name belongs with the step that gives PyType the call
! protocol (__call__ dispatching the 1-arg and 3-arg forms), so that the name
! and the call change together rather than the name racing ahead of it.
run
PyType
%
