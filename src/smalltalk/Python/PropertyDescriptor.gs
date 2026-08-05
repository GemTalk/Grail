! ===============================================================================
! PropertyDescriptor — Grail runtime ``property'' builtin.
! ===============================================================================
! Python's ``property(fget, fset=None, fdel=None, doc=None)'' is a
! runtime-callable builtin that builds a descriptor object.  Grail
! currently handles ``@property'' at parse time (the decorator
! installs a paired accessor on the class body) but doesn't expose
! the ``property'' name as a runtime callable — Werkzeug 3.x and
! the rest of the upstream stdlib call ``property(fget, fset, fdel,
! doc)'' from helper factories to build derived properties.
!
! ``property(fget, fset, fdel, doc)'' returns a PropertyDescriptor holding the
! four pieces, and it DOES now participate in attribute reads: ``__get__'' runs
! the getter, applied by object>>___descriptorGet___:.  So the CALL form of
! property behaves like the ``@property'' decorator on reads, where previously
! only the decorator worked and a stored ``property(fget)'' read back as the
! function itself.
!
! STILL a gap: __set__ / __delete__ are not wired, because Grail's attribute
! STORE path does not consult descriptors.  ``obj.prop = v'' writes a dynamic
! instVar that then SHADOWS the getter, and assigning to a read-only property
! does not raise.  The decorator route emits an explicit setter method to cover
! that; the call form has no equivalent.
! ===============================================================================

! ------- PropertyDescriptor class definition
expectvalue /Class
doit
Object subclass: 'PropertyDescriptor'
  instVarNames: #( fget fset fdel doc )
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

category: 'Grail-Private'
method: PropertyDescriptor
_setFget: fg fset: fs fdel: fd doc: dc
	fget := fg.
	fset := fs.
	fdel := fd.
	doc := dc.
%

category: 'Grail-Accessing'
method: PropertyDescriptor
fget
	^ fget
%

category: 'Grail-Accessing'
method: PropertyDescriptor
fset
	^ fset
%

category: 'Grail-Accessing'
method: PropertyDescriptor
fdel
	^ fdel
%

category: 'Grail-Accessing'
method: PropertyDescriptor
doc
	^ doc
%

set compile_env: 1

! ------------------- Class-side constructors (Python ``property(...)'' shape)

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__
	"Zero-arg property() — rarely used.  Returns a descriptor with
	all four slots nil."

	| inst |
	inst := self @env0:new.
	inst @env0:_setFget: nil fset: nil fdel: nil doc: nil.
	^ inst
%

category: 'Grail-Descriptor Protocol'
method: PropertyDescriptor
__get__: instance _: owner
	"Run the getter, which is the whole point of a property.  Without this an
	attribute holding a ``property(...)'' read back as the DESCRIPTOR OBJECT
	instead of the getter's value, so the CALL form of property did nothing --
	only the ``@property'' DECORATOR worked, and that works by a different
	route entirely (ClassDefAst compiles the decorated def into a real getter
	METHOD, so no descriptor is involved).

	CPython's ``property.__get__(None, owner)'' answers the property itself, so
	CLASS access is left alone -- ``C.prop'' must stay the descriptor for
	``C.prop.fget'' and for ``x = C.prop'' re-assignment to work.

	A property with no fget raises AttributeError, as CPython does.  Applied by
	object>>___descriptorGet___:, which already honours __get__ on a
	class-attribute read.

	NOT wired: __set__ / __delete__.  Grail's attribute STORE path does not
	consult descriptors, so ``obj.prop = v'' still writes a dynamic instVar
	that then shadows this getter, and a read-only property does not raise on
	assignment.  The decorator route emits an explicit setter method for that
	case; the call form has no equivalent yet."

	(instance == nil or: [instance == None]) ifTrue: [^ self].
	fget == nil ifTrue: [
		^ AttributeError ___signal___: 'unreadable attribute'].
	^ fget ___pyCallValue___: { instance } kw: nil
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg
	"``property(fget)'' — read-only descriptor."

	| inst |
	inst := self @env0:new.
	inst @env0:_setFget: fg fset: nil fdel: nil doc: nil.
	^ inst
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs
	"``property(fget, fset)'' — read/write descriptor."

	| inst |
	inst := self @env0:new.
	inst @env0:_setFget: fg fset: fs fdel: nil doc: nil.
	^ inst
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs _: fd
	"``property(fget, fset, fdel)'' — full descriptor without doc."

	| inst |
	inst := self @env0:new.
	inst @env0:_setFget: fg fset: fs fdel: fd doc: nil.
	^ inst
%

category: 'Grail-Class-Call Fast Path'
classmethod: PropertyDescriptor
__new__: fg _: fs _: fd _: dc
	"``property(fget, fset, fdel, doc)'' — full descriptor with doc."

	| inst |
	inst := self @env0:new.
	inst @env0:_setFget: fg fset: fs fdel: fd doc: dc.
	^ inst
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

set compile_env: 0

! ------------------- Python-visible introspection
! ``fget'' / ``fset'' / ``fdel'' / ``__doc__'' are DATA attributes in CPython, so
! ``C.prop.fget'' must answer the getter, not a bound method.  The accessors above
! are env 0 and therefore invisible to a Python attribute read, hence env-1
! readers plus the whitelist.  ___pythonValueAttrs___ MUST be env 0: the
! ___pyAttrLoad___ probe consults it through an env-0 ``respondsTo:''.

set compile_env: 1

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

category: 'Grail-Reflection'
method: PropertyDescriptor
__doc__
	"CPython carries the ``doc'' argument, falling back to the getter's own
	docstring when none was passed."

	doc == nil ifFalse: [^ doc].
	fget == nil ifTrue: [^ None].
	^ [fget ___pyAttrLoad___: #'__doc__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None]
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
		yourself
%
