! ===============================================================================
! PropertyDescriptor — Grail runtime ``property'' builtin.
! ===============================================================================
! Python's ``property(fget, fset=None, fdel=None, doc=None)'' is a
! runtime-callable builtin that builds a descriptor object.  Grail also handles
! ``@property'' at parse time (ClassDefAst compiles the decorated def into a real
! getter METHOD), but the CALL form builds a PropertyDescriptor here.
!
! This descriptor now models the CPython ``property'' object closely enough for
! test_property''s object-protocol suite:
!
!   * subclassable (``class PropertySub(property)'') and CONSTRUCTED THROUGH
!     ``___init__:kw:'' so a subclass instance fills fget/fset/fdel/doc (a
!     subclass previously came back with everything nil -- the class-side
!     constructors only ran for the base ``property(...)'' call).
!   * ``getter'' / ``setter'' / ``deleter'' return a COPY with one function
!     replaced, honouring CPython''s docstring-precedence rules (explicit doc
!     wins and is preserved across copies; an undocumented property adopts a new
!     getter''s docstring).
!   * ``__doc__'' is stored as an instance attribute (matching CPython putting it
!     in the C slot / the subclass instance dict), so it is readable, writable,
!     and -- on a ``__slots__''-without-``__doc__'' subclass -- silently dropped
!     for an explicit doc but re-raised for a getter''s doc.
!   * ``__name__'' (with ``__set_name__'' from the class-creation walk, plus a
!     getter-name fallback), ``__set_name__'' (arg-count validated), and
!     ``__isabstractmethod__''.
!
! STILL a gap: __set__ / __delete__ are not wired here — Grail''s attribute
! STORE path does not consult descriptors, so ``obj.prop = v'' on a read-only
! property does not raise.  __get__ IS wired (applied by
! object>>___descriptorGet___:).
! ===============================================================================

! ------- PropertyDescriptor class definition
expectvalue /Class
doit
Object subclass: 'PropertyDescriptor'
  instVarNames: #( fget fset fdel name getterDoc )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PropertyDescriptor category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
removeallmethods PropertyDescriptor
removeallclassmethods PropertyDescriptor

set compile_env: 0

! ------------------- Raw (env-0) slot access, used internally.
category: 'Grail-Private'
method: PropertyDescriptor
_rawFget
	^ fget
%

category: 'Grail-Private'
method: PropertyDescriptor
_rawFset
	^ fset
%

category: 'Grail-Private'
method: PropertyDescriptor
_rawFdel
	^ fdel
%

category: 'Grail-Private'
method: PropertyDescriptor
_getterDoc
	^ getterDoc == true
%

set compile_env: 1

! ------------------- Core construction (env-1: reads getter __doc__ and stores
!                     the computed __doc__ through the Python attribute path).

category: 'Grail-Private'
method: PropertyDescriptor
___pyPropInit___: fg _: fs _: fd _: dc
	"Initialise the four pieces.  ``None'' means ``no function'' (CPython treats
	a None fget/fset/fdel as absent), stored as nil so the readers answer None
	and the descriptor protocol sees an absent accessor."

	fget := (fg == nil or: [fg == None]) ifTrue: [nil] ifFalse: [fg].
	fset := (fs == nil or: [fs == None]) ifTrue: [nil] ifFalse: [fs].
	fdel := (fd == nil or: [fd == None]) ifTrue: [nil] ifFalse: [fd].
	name := nil.
	self ___computeAndStoreDoc___: dc.
	^ self
%

category: 'Grail-Private'
method: PropertyDescriptor
___computeAndStoreDoc___: dc
	"CPython property docstring precedence: an explicit ``doc'' argument wins;
	otherwise the getter''s own ``__doc__'' is adopted (and remembered as
	getter-sourced, which changes how copies treat it).  The computed doc is
	stored as an instance attribute so ``p.__doc__'' reads it and ``p.__doc__ =
	x'' overwrites it.

	On a property SUBCLASS whose ``__slots__'' has no ``__doc__'' slot the store
	raises AttributeError; CPython silently drops an explicit doc there but
	re-raises a getter-sourced one (test_property_with_slots_* /
	test_slots_docstring_copy_exception)."

	| computed gd |
	(dc ~~ nil and: [dc ~~ None])
		ifTrue: [computed := dc. gd := false]
		ifFalse: [
			fget ~~ nil
				ifTrue: [
					computed := [fget ___pyAttrLoad___: #'__doc__']
						@env0:on: AttributeError do: [:e | nil].
					(computed ~~ nil and: [computed ~~ None])
						ifTrue: [gd := true]
						ifFalse: [computed := nil. gd := false]]
				ifFalse: [computed := nil. gd := false]].
	getterDoc := gd.
	[self ___pyAttrStore___: #'__doc__' put: (computed == nil ifTrue: [None] ifFalse: [computed])]
		@env0:on: AttributeError do: [:e |
			gd ifTrue: [e @env0:pass]].
	^ self
%

category: 'Grail-Instance Creation'
method: PropertyDescriptor
___init__: positional kw: kwargs
	"``property.__init__(self, fget=None, fset=None, fdel=None, doc=None)'' --
	the entry a SUBCLASS instantiation reaches (``PropertySub(...)'' allocates
	then calls this).  The base ``property(...)'' call is served by the
	class-side constructors below, which route through the same
	``___pyPropInit___''."

	| nargs fg fs fd dc |
	nargs := positional @env0:size.
	fg := (nargs @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [kwargs @env0:ifNil: [nil] ifNotNil: [:k | k @env0:at: 'fget' ifAbsent: [nil]]].
	fs := (nargs @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [kwargs @env0:ifNil: [nil] ifNotNil: [:k | k @env0:at: 'fset' ifAbsent: [nil]]].
	fd := (nargs @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [kwargs @env0:ifNil: [nil] ifNotNil: [:k | k @env0:at: 'fdel' ifAbsent: [nil]]].
	dc := (nargs @env0:>= 4)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [kwargs @env0:ifNil: [nil] ifNotNil: [:k | k @env0:at: 'doc' ifAbsent: [nil]]].
	^ self ___pyPropInit___: fg _: fs _: fd _: dc
%

! ------------------- Class-side constructors (Python ``property(...)'' shape)

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__
	"Zero-arg property()."

	^ self @env0:new ___pyPropInit___: nil _: nil _: nil _: nil
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg
	"``property(fget)'' — read-only descriptor."

	^ self @env0:new ___pyPropInit___: fg _: nil _: nil _: nil
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs
	"``property(fget, fset)'' — read/write descriptor."

	^ self @env0:new ___pyPropInit___: fg _: fs _: nil _: nil
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs _: fd
	"``property(fget, fset, fdel)'' — full descriptor without doc."

	^ self @env0:new ___pyPropInit___: fg _: fs _: fd _: nil
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs _: fd _: dc
	"``property(fget, fset, fdel, doc)'' — full descriptor with doc."

	^ self @env0:new ___pyPropInit___: fg _: fs _: fd _: dc
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
value: positional value: kwargs
	"Python ``property(*args, **kwargs)'' through the legacy call
	dispatch.  CallAst routes any class call that has kwargs (or
	doesn't match a fixed-arity ``__new__'') through value:value:
	on the class metaclass.  Delegate to _new:kw:."

	^ self _new: positional kw: kwargs
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
_new: positional kw: kwargs
	"Varargs entry — Python ``property(fget, fset=None, fdel=None,
	doc=None)'' can be called with any subset.  Picks positionals
	first, then matching kwargs.  Returns the descriptor."

	| nargs fg fs fd dc |
	nargs := positional @env0:size.
	fg := (nargs @env0:>= 1)
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [kwargs @env0:isNil
			@env0:ifTrue: [nil]
			@env0:ifFalse: [kwargs @env0:at: 'fget' ifAbsent: [nil]]].
	fs := (nargs @env0:>= 2)
		@env0:ifTrue: [positional @env0:at: 2]
		@env0:ifFalse: [kwargs @env0:isNil
			@env0:ifTrue: [nil]
			@env0:ifFalse: [kwargs @env0:at: 'fset' ifAbsent: [nil]]].
	fd := (nargs @env0:>= 3)
		@env0:ifTrue: [positional @env0:at: 3]
		@env0:ifFalse: [kwargs @env0:isNil
			@env0:ifTrue: [nil]
			@env0:ifFalse: [kwargs @env0:at: 'fdel' ifAbsent: [nil]]].
	dc := (nargs @env0:>= 4)
		@env0:ifTrue: [positional @env0:at: 4]
		@env0:ifFalse: [kwargs @env0:isNil
			@env0:ifTrue: [nil]
			@env0:ifFalse: [kwargs @env0:at: 'doc' ifAbsent: [nil]]].
	^ self __new__: fg _: fs _: fd _: dc
%

! ------------------- Descriptor read protocol

category: 'Grail-Descriptor Protocol'
method: PropertyDescriptor
__get__: instance _: owner
	"Run the getter -- the point of a property.  CPython''s
	``property.__get__(None, owner)'' answers the property itself, so CLASS
	access (``C.prop'') keeps the descriptor.  A property with no fget raises
	AttributeError.  Applied by object>>___descriptorGet___:."

	(instance == nil or: [instance == None]) ifTrue: [^ self].
	fget == nil ifTrue: [
		^ self ___raiseUnreachable: instance kind: 'getter'].
	^ fget ___pyCallValue___: { instance } kw: nil
%

category: 'Grail-Descriptor Protocol'
method: PropertyDescriptor
__set__: instance _: value
	"``obj.prop = value'' -- a property is a DATA descriptor, so the store must
	reach here (wired by object>>___pyAttrStore___) rather than writing an
	instance attribute that would shadow the getter.  No fset means read-only:
	CPython raises ``property [...] object has no setter''."

	fset == nil ifTrue: [
		^ self ___raiseUnreachable: instance kind: 'setter'].
	^ fset ___pyCallValue___: { instance. value } kw: nil
%

category: 'Grail-Descriptor Protocol'
method: PropertyDescriptor
__delete__: instance
	"``del obj.prop'' -- wired by object>>___pyAttrDelete___.  No fdel means the
	property has no deleter: ``property [...] object has no deleter''."

	fdel == nil ifTrue: [
		^ self ___raiseUnreachable: instance kind: 'deleter'].
	^ fdel ___pyCallValue___: { instance } kw: nil
%

category: 'Grail-Private'
method: PropertyDescriptor
___raiseUnreachable: instance kind: aKind
	"CPython's unreachable-accessor AttributeError, matching its exact text so
	test_property''s regex assertions pass:

	  property 'name' of 'Owner.qualname' object has no getter/setter/deleter

	The name is present only when __set_name__ ran (a class-body ``x =
	property()''); a property attached after class creation has none, and the
	message drops the ``'name' '' clause -- exactly the WithName / NoName split
	the test exercises."

	| nm owner |
	nm := self ___propName___.
	owner := self ___ownerQualnameFor: instance.
	nm == nil
		ifTrue: [^ AttributeError ___signal___:
			'property of ''' @env0:, owner @env0:, ''' object has no ' @env0:, aKind]
		ifFalse: [^ AttributeError ___signal___:
			'property ''' @env0:, nm @env0:, ''' of ''' @env0:, owner
				@env0:, ''' object has no ' @env0:, aKind]
%

category: 'Grail-Private'
method: PropertyDescriptor
___propName___
	"The property''s __set_name__/assigned name, or nil when it has none."

	^ [self ___pyAttrLoad___: #'__name__'] @env0:on: AttributeError do: [:e | nil]
%

category: 'Grail-Private'
method: PropertyDescriptor
___ownerQualnameFor: instance
	"The owner class''s __qualname__ (``Outer.cls'') for the error text, falling
	back to the plain class name."

	| cls |
	cls := instance @env0:class.
	^ [(cls ___pyAttrLoad___: #'__qualname__') @env0:asString]
		@env0:on: AbstractException do: [:e | cls @env0:name @env0:asString]
%

! ------------------- getter / setter / deleter (return a copy)

category: 'Grail-Copy Protocol'
method: PropertyDescriptor
getter: g
	"Copy of this property with the getter replaced (``@prop.getter'')."

	^ self ___copyGet: g set: nil del: nil
%

category: 'Grail-Copy Protocol'
method: PropertyDescriptor
setter: s
	"Copy of this property with the setter replaced (``@prop.setter'')."

	^ self ___copyGet: nil set: s del: nil
%

category: 'Grail-Copy Protocol'
method: PropertyDescriptor
deleter: d
	"Copy of this property with the deleter replaced (``@prop.deleter'')."

	^ self ___copyGet: nil set: nil del: d
%

category: 'Grail-Private'
method: PropertyDescriptor
___copyGet: g set: s del: d
	"CPython property_copy: a nil/None argument keeps the existing function.
	The doc of the copy: if this property''s doc came from its getter AND the
	copy has a getter, force the copy to recompute from the NEW getter (pass
	None); otherwise carry this property''s current doc forward explicitly."

	| newGet newSet newDel docArg |
	newGet := (g == nil or: [g == None]) ifTrue: [fget] ifFalse: [g].
	newSet := (s == nil or: [s == None]) ifTrue: [fset] ifFalse: [s].
	newDel := (d == nil or: [d == None]) ifTrue: [fdel] ifFalse: [d].
	docArg := (getterDoc == true and: [newGet ~~ nil])
		ifTrue: [None]
		ifFalse: [self ___currentDoc___].
	^ self @env0:class @env0:new ___pyPropInit___: newGet _: newSet _: newDel _: docArg
%

category: 'Grail-Private'
method: PropertyDescriptor
___currentDoc___
	"The current ``__doc__'' value, honouring a user assignment after
	construction (``p.__doc__ = ...'')."

	^ [self ___pyAttrLoad___: #'__doc__'] @env0:on: AttributeError do: [:e | None]
%

! ------------------- __name__ / __set_name__

category: 'Grail-Reflection'
method: PropertyDescriptor
__name__
	"CPython property __name__: whatever __set_name__ (or a direct assignment)
	stored; failing that, the getter''s own __name__.  A missing getter -- or a
	getter with no __name__ -- is an AttributeError; other errors from the
	getter (e.g. a __getattr__ raising RuntimeError) propagate.

	Reached only when no ``__name__'' instance attribute shadows it; a stored
	name (including an explicit None) is answered by the attribute read before
	this method runs."

	(fget == nil or: [fget == None]) ifTrue: [
		^ AttributeError ___signal___: '''property'' object has no attribute ''__name__'''].
	^ [fget ___pyAttrLoad___: #'__name__']
		@env0:on: AttributeError
		do: [:e | AttributeError ___signal___: '''property'' object has no attribute ''__name__''']
%

category: 'Grail-Reflection'
method: PropertyDescriptor
__set_name__: owner _: aName
	"Fixed 2-arg form the class-creation walk (object>>___runSetNameHooks___)
	sends when a property is a class-body value.  Explicit Python calls reach
	the arg-count-validating varargs form below."

	^ self ___set_name__: { owner. aName } kw: nil
%

category: 'Grail-Reflection'
method: PropertyDescriptor
___set_name__: positional kw: kwargs
	"``property.__set_name__(self, owner, name)'' -- exactly two positional
	arguments.  A wrong count is the CPython TypeError, message and all
	(test_property_set_name_incorrect_args).  The name is stored as an instance
	attribute so ``__name__'' answers it."

	| nargs |
	nargs := positional @env0:size.
	nargs @env0:= 2 ifFalse: [
		^ TypeError ___signal___:
			'__set_name__() takes 2 positional arguments but '
				@env0:, nargs @env0:printString @env0:, ' were given'].
	self ___pyAttrStore___: #'__name__' put: (positional @env0:at: 2).
	^ None
%

! ------------------- __isabstractmethod__

category: 'Grail-Reflection'
method: PropertyDescriptor
__isabstractmethod__
	"True when any of the three functions is an abstract method.  Truthiness
	uses Python''s bool(), so a value whose __bool__ raises (test''s NotBool)
	propagates that error."

	{ fget. fset. fdel } @env0:do: [:f |
		(f ~~ nil and: [f ~~ None]) ifTrue: [
			| am |
			am := [f ___pyAttrLoad___: #'__isabstractmethod__']
				@env0:on: AttributeError do: [:e | nil].
			(am ~~ nil and: [am ~~ None])
				ifTrue: [am ___isTruthy___ ifTrue: [^ true]]]].
	^ false
%

! ------------------- Python-visible introspection
! ``fget'' / ``fset'' / ``fdel'' are DATA attributes in CPython, so
! ``C.prop.fget'' answers the getter, not a bound method.  The env-1 readers
! plus the ___pythonValueAttrs___ whitelist give that; ___pythonValueAttrs___
! MUST be env 0 (the ___pyAttrLoad___ probe consults it through an env-0
! ``respondsTo:'').

set compile_env: 1

category: 'Grail-Reflection'
method: PropertyDescriptor
__doc__
	"Default docstring: None.  Construction stores the computed doc as an
	instance attribute (a dynamic instVar, or the ``__doc__'' slot of a
	subclass that declares one), which is read BEFORE this method and so
	shadows it.  Reached only when nothing was stored -- e.g. a property
	SUBCLASS whose ``__slots__'' rejected the store and whose explicit doc
	CPython drops silently -- where the answer must be None, NOT the inherited
	Object>>__doc__ (object's own docstring)."

	^ None
%

category: 'Grail-Reflection'
method: PropertyDescriptor
fget
	^ fget == nil ifTrue: [None] ifFalse: [fget]
%

category: 'Grail-Reflection'
method: PropertyDescriptor
fset
	^ fset == nil ifTrue: [None] ifFalse: [fset]
%

category: 'Grail-Reflection'
method: PropertyDescriptor
fdel
	^ fdel == nil ifTrue: [None] ifFalse: [fdel]
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PropertyDescriptor
___pythonValueAttrs___
	^ IdentitySet new
		add: #'fget';
		add: #'fset';
		add: #'fdel';
		add: #'__doc__';
		add: #'__name__';
		add: #'__isabstractmethod__';
		yourself
%
