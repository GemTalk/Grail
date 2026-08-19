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
	"Class-side subscript.  PEP 560: if the class defines
	__class_getitem__, ``C[x]'' means ``C.__class_getitem__(x)'' with the
	CLASS bound as cls -- it is an implicit classmethod, so a subclass
	inherits the parent's and still sees its own cls.  That is what makes
	``D[int]'' answer ``D[int]'' rather than ``C[int]''.

	Three shapes have to be recognised, because Grail stores them
	differently:
	  (a) a plain ``def __class_getitem__(cls, item)'' in the class body,
	      which compiles to an env-1 INSTANCE method whose self-param is
	      cls -- invoked here through UnboundMethod with the class supplied
	      as the first positional, the same way ___allocateInstance___
	      invokes a class-body __new__;
	  (b) a @classmethod form or any other assigned value, which lands in
	      the class-attribute store;
	  (c) neither, which is the overwhelmingly common case.

	For (c) the answer stays the class itself.  CPython raises
	``type 'C' is not subscriptable'' there, but Grail's permissive default
	is load-bearing: ``class Foo(list[V])'' has to compile to
	``class Foo(list)'', and annotations subscript classes constantly.  The
	tests that want a TypeError want it for a __class_getitem__ that exists
	and cannot be called -- wrong arity, or not callable at all -- and those
	come out of (a) and (b) naturally.

	Specific scalar metaclasses override this with a TypeError to mirror
	CPython's strictness (`int[X]` etc.)."

	| attr definer objectMeta |
	"(1) a class-body ASSIGNMENT (``__class_getitem__ = something'') becomes a
	unary accessor on the metaclass.  It shadows an inherited def, which is
	the ordinary nearest-wins rule, and it need not be callable at all --
	CPython raises TypeError when it is not, rather than silently ignoring it."
	(self @env0:class @env0:whichClassIncludesSelector: #'__class_getitem__' environmentId: 1) ~~ nil
		ifTrue: [
			attr := self @env0:perform: #'__class_getitem__' env: 1.
			"``__class_getitem__ = classmethod(f)'' assigns a DESCRIPTOR, and
			reading it off the class is supposed to BIND it -- the wrapper
			itself is not callable, in Grail or in CPython.  Unwrap to the
			function and supply the class, which is what __get__ would have
			produced.  A staticmethod unwraps the same way but takes no cls."
			(attr @env0:isKindOf: PyClassMethod) ifTrue: [
				^ (attr @env0:dynamicInstVarAt: #'__func__')
					@env1:value: { self. index } value: nil].
			(attr @env0:isKindOf: PyStaticMethod) ifTrue: [
				^ (attr @env0:dynamicInstVarAt: #'__func__')
					@env1:value: { index } value: nil].
			(((Python @env0:at: #builtins) @env0:___instance___)
				@env1:callable: attr) @env0:== true
				ifFalse: [
					^ TypeError ___signal___: ('''' @env0:, self @env0:name @env0:asString
						@env0:, ''' object is not subscriptable')].
			^ attr @env1:value: { self. index } value: nil].
	"(2) a class-body ``def'', which compiles instance-side -- under the plain
	selector for a fixed signature and the varargs one for
	``def __class_getitem__(*args, **kwargs)''.  UnboundMethod resolves
	between them, so both go through one call with the CLASS supplied first."
	((self @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1) ~~ nil
		or: [(self @env0:whichClassIncludesSelector: #'___class_getitem__:kw:' environmentId: 1) ~~ nil])
		ifTrue: [
			^ (UnboundMethod definingClass: self selector: #'__class_getitem__')
				@env1:value: { self. index } value: nil].
	"(3) an explicit @classmethod, which lands metaclass-side under the
	one-argument selector.  EVERY class answers that one, because object
	defines the permissive default there -- so the definer has to be checked,
	and only a definer other than object's metaclass is a real override."
	definer := self @env0:class @env0:whichClassIncludesSelector: #'__class_getitem__:' environmentId: 1.
	objectMeta := (Python @env0:at: #object) @env0:class.
	(definer ~~ nil and: [definer ~~ objectMeta])
		ifTrue: [^ self @env0:perform: #'__class_getitem__:' env: 1 withArguments: { index }].
	"(4) a runtime ``Cls.__class_getitem__ = fn'' lands in the attribute store."
	attr := self ___classChainAttrLookup___: #'__class_getitem__'.
	attr == nil ifTrue: [
		attr := self ___classAttrOverlayLookup___: self name: #'__class_getitem__'].
	attr ~~ nil ifTrue: [
		(((Python @env0:at: #builtins) @env0:___instance___)
			@env1:callable: attr) @env0:== true
			ifFalse: [
				^ TypeError ___signal___: ('''' @env0:, self @env0:name @env0:asString
					@env0:, ''' object is not subscriptable')].
		^ attr @env1:value: { self. index } value: nil].
	"(c) no __class_getitem__ anywhere: the subscript carries no runtime
	semantics here."
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
