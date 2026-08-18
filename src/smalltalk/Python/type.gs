! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- type — the Python 'type' type
!
! PythonInstance, NOT ``object''.  The bare name ``object'' resolves to GemStone
! Object, and ClassDefAst redirects a Python ``class C(object)'' to
! PythonInstance for exactly this reason: every ``isKindOf: PythonInstance''
! gate in ___pyAttrLoad___ (property pair-reads, class-attr fallbacks) misfires
! for a class outside that chain.  A metaclass rooted here is a Python class
! like any other and must not drop out of it.
expectvalue /Class
doit
PythonInstance subclass: 'type'
  instVarNames: #( )
  classVars: #()
  classInstVars: #( dynInstVars )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
type comment:
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
type category: 'Grail-Python Types'
%

set compile_env: 1

category: 'Grail-Class-Call Fast Path'
classmethod: type
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
classmethod: type
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

category: 'Grail-Class Construction'
classmethod: type
__new__: mcls _: aName _: bases _: ns
	"``super().__new__(cls, name, bases, namespace)'' from inside a metaclass
	__new__.  This is the single shape almost every metaclass in the corpus is
	written in:

	    def __new__(cls, name, bases, namespace):
	        self = super().__new__(cls, name, bases, namespace)
	        ...observe or mutate self...
	        return self

	CPython BUILDS the class here.  Grail cannot: the class statement has
	already compiled its body onto a real Smalltalk class by the time a
	metaclass hook can run, and that class is what the module's methods, closure
	cells and __class__ references are bound to.  Building a second one and
	handing it back would leave the first one live and referenced.

	So the class under construction is what this ANSWERS.  The identity is the
	point -- the metaclass gets the very object the class statement is defining,
	so ``self.f()'', ``self.meta_owner = ...'' and ``namespace.copy()'' all see
	and affect the real class, and returning it re-binds the name to itself.
	The namespace argument needs no replay: ___grailNsStore___:value: writes
	each class-body binding to the namespace AND to the class as it happens, so
	the two already agree.

	Outside a class statement there is nothing under construction and this is an
	ordinary three-argument type() call, which builds a class as it always did."

	| pending |
	pending := type ___classUnderConstruction___.
	pending @env0:notNil ifTrue: [
		"APPLY THE NAMESPACE.  type.__new__ is defined as ``build a class with
		this namespace'', so what the metaclass did to the mapping before
		calling it has to land on the class -- and a metaclass that ADDS to the
		namespace is the whole reason several of them override __new__ at all
		(``namespace['__classcell__'] = cell'').

		Grail's class already carries every binding the BODY made, because
		___grailNsStore___:value: writes to the namespace and the class as each
		statement runs.  What it cannot know about is a write the metaclass
		itself made between the body finishing and this call, which is exactly
		what this replays."
		(ns @env0:isNil @env0:not and: [ns @env0:isEmpty @env0:not]) ifTrue: [
			ns @env0:keysAndValuesDo: [:k :v |
				"``__classcell__'' is protocol, not a class attribute.  CPython
				consumes it here and never stores it on the class -- copying it
				across would leave a stray attribute on every class whose methods
				mention __class__."
				(k @env0:asString @env0:= '__classcell__') @env0:ifFalse: [
					[pending ___pyAttrStore___: k @env0:asSymbol put: v]
						@env0:on: AbstractException do: [:ex | ex @env0:return: nil]]]].
		"BUILD THE ENUM'S MEMBERS, if this class deferred them.  CPython reaches
		EnumType.__new__ through exactly this call -- ``super().__new__'' from
		inside a metaclass __new__ -- and THAT is where an enum's members are
		created, which is why a metaclass may add entries to the classdict and
		have them become members (test_enum test_extra_member_creation).  Grail
		builds members from its own ___pyClassDefined___: hook, which runs
		BEFORE any Python metaclass, so the injected names arrived too late and
		the enum answered only the two the body declared.  Enum class
		>> ___pyClassDefined___: now defers the build when a Python metaclass is
		going to run, and this is where it lands -- after the namespace replay
		above, so the injected values are on the class as raw attributes, which
		is the state the builder expects.
		Deferral is fulfilled here or, if the metaclass never delegates up, by
		the safety net at the end of ___grailDispatchMetaclass___; either way it
		happens exactly once."
		Enum ___grailRunDeferredMemberBuild___: pending namespace: ns.
		"Fill the cell, and police what the metaclass did to it: this is the
		moment CPython populates ``__class__'', and the moment it raises if the
		metaclass dropped the cell or replaced it with something else."
		pending ___grailFillClassCell___: ns.
		^ pending].
	^ (builtins @env1:instance) @env1:type: aName _: bases _: ns
%

category: 'Grail-Class Construction'
classmethod: type
___classUnderConstruction___
	"The class whose statement is currently running its metaclass __new__, or
	nil.  A STACK, because a class statement can appear inside another class's
	body and each needs its own answer.

	Session-local scaffolding for the duration of a class statement, exactly
	like the prepared namespace it partners: it must never be committed."

	| stk |
	stk := SessionTemps @env0:current
		@env0:at: #'GrailClassUnderConstruction' otherwise: nil.
	(stk @env0:isNil or: [stk @env0:isEmpty]) ifTrue: [^ nil].
	^ stk @env0:last
%

category: 'Grail-Attribute Access'
classmethod: type
__dict__
	"``type.__dict__'' as a read-only mappingproxy, so ``type(type.__dict__)''
	yields the mappingproxy TYPE -- which is how test_dict test_views_mapping
	gets hold of it in order to assert that a dict view's ``.mapping'' is one.

	INHERITED, not invented: BoundMethod >> __dict__ carried this for exactly
	the same reason while ``type'' was a BoundMethod.  Once ``type'' became a
	class the read went to the Behavior branch of ___pyAttrLoad___, which
	answered ___classDict___ -- a snapshot KeyValueDictionary -- so the test
	derived PyDict as ``mappingproxy'' and failed against a real one.  That
	branch now consults a metaclass-defined __dict__ first, which is what makes
	this method reachable at all; defining it without that change was a no-op.

	The proxy wraps an EMPTY dict, as the BoundMethod version did: only its
	TYPE is consulted here.  Answering type's real namespace is a separate
	question, and a snapshot would be no more faithful than the empty one until
	class __dict__ is a live proxy generally -- which is the wider fix, since
	CPython hands back a mappingproxy for EVERY class."

	^ mappingproxy @env1:___on: (dict @env1:___new___)
%

set compile_env: 0

! The NAME ``type'' is bound to this class by the class definition itself --
! ``inDictionary: Python'' with the Smalltalk name ``type'' IS the entry.  This
! file used to end with an explicit ``Python at: #'type' put: PyType'' because
! the class was called PyType and the Python name had to be aliased on
! separately; the rename made the alias its own definition.
!
! The binding is what makes ``type'' as a VALUE a class object rather than a
! BoundMethod, which is what makes issubclass(Meta, type) and
! isinstance(type, type) answerable at all.  It only works alongside the call
! protocol above; see that method for what breaks without it.
run
(Python at: #'type') == type
	ifFalse: [self error: 'Python at: #type is not the type class'].
type
%
