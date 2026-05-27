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
! This stub fills the gap: ``property(fget, fset, fdel, doc)''
! returns a PropertyDescriptor instance that just remembers the
! four pieces.  It DOES NOT participate in attribute access
! dispatch (Grail's __pyAttrLoad doesn't honor the descriptor
! protocol on stored instances yet — that's a separate, deeper
! change).  Sufficient for module-import-time evaluation; runtime
! invocation of the wrapped getter is whatever the caller arranges.
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

	^ self @env1:_new: positional kw: kwargs
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
	^ self @env1:__new__: fg _: fs _: fd _: dc
%

set compile_env: 0
