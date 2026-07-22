! ===============================================================================
! Grail-Python: class-side __getitem__ (subscript on classes)
!
! Python evaluates `Class[arg]` at class-bind time for parameterized
! generics:
!     class Foo(Generic[T]): ...
!     class Bar(Serializer[str]): ...
!
! CPython routes that through the metaclass's __getitem__ (PEP 560
! provides __class_getitem__ as an opt-in shortcut so users don't
! need a custom metaclass; the underlying mechanism is still
! metaclass-level).
!
! Grail's `SubscriptAst` codegen emits `(value) __getitem__: (slice)`
! unconditionally - an env-1 instance message to the receiver.  When
! the receiver is a class, that lookup walks the metaclass chain
! and lands on Metaclass3.  Installing a default `__getitem__:` on
! Metaclass3 returns the class itself, which is what parameterized
! generics expect.
!
! Scalar built-ins (int / float / bool / str / bytes / NoneType /
! Character / Symbol) explicitly raise TypeError on subscript,
! mirroring CPython.  Container types (list / dict / tuple / set /
! frozenset) get the default permissive behavior and `list[int]`-
! style annotations work.
! ===============================================================================

! ------- Hygiene: drop any prior class-side overrides we installed.
! ------- Metaclass3 is shared with the kernel; per-file
! ------- ``removeAllMethods: 1`` would be too broad, so use
! ------- removeSelector: targeted at the env-1 method we own.
! ------- IMPORTANT: only touch metaclasses here.  Removing
! ------- ``__getitem__:`` from the *instance* sides of these
! ------- classes would erase the legitimate sequence-protocol
! ------- methods (e.g. CharacterCollection >> __getitem__: in
! ------- str.gs) that earlier files install in env 1.
run
| classes metaclasses |
classes := { Integer. Float. Boolean. CharacterCollection.
    ByteArray. Character. Symbol. UndefinedObject }.
metaclasses := { Metaclass3 } , (classes collect: [:c | c class]).
metaclasses do: [:c |
    "Guarded: under GsPackagePolicy this env-1 method is a per-user SESSION
     method, which removeSelector: can't remove (protected) and which the
     package recreation at install start has already dropped -- so this
     hygiene is redundant and must not fail."
    [ c removeSelector: #'__getitem__:' environmentId: 1 ] on: Error do: [:e | ]
].
%

set compile_env: 1

category: 'Grail-Python protocol'
method: Metaclass3
__getitem__: index
	"Default class-side subscript - parameterized generics
	(`Foo[T]`, `list[int]`, etc.) return the class itself.  Matches
	what CPython's stdlib generics return from `__class_getitem__`
	(close enough for use as a base class or type annotation).

	Specific scalar metaclasses override this with a TypeError to
	mirror CPython's strictness (`int[X]` etc.)."

	^ self
%

category: 'Grail-Python protocol'
classmethod: Integer
__getitem__: index
	^ TypeError ___signal___: 'type ''int'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: Float
__getitem__: index
	^ TypeError ___signal___: 'type ''float'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: Boolean
__getitem__: index
	^ TypeError ___signal___: 'type ''bool'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: CharacterCollection
__getitem__: index
	"Covers Python str (Unicode7, Unicode16, Unicode32, ISOLatin,
	MultiByteString, etc. - everything that inherits from
	CharacterCollection) plus Symbol family (a CharacterCollection
	subclass)."

	^ TypeError ___signal___: 'type ''str'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: ByteArray
__getitem__: index
	^ TypeError ___signal___: 'type ''bytes'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: Character
__getitem__: index
	^ TypeError ___signal___: 'type ''Character'' is not subscriptable'
%

category: 'Grail-Python protocol'
classmethod: UndefinedObject
__getitem__: index
	^ TypeError ___signal___: 'type ''NoneType'' is not subscriptable'
%

set compile_env: 0
