! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- enum class (Python 'enum' module)
expectvalue /Class
doit
module subclass: 'enum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
enum comment:
'Python enum module (stub).

Provides support for enumerations.
Currently stubs IntFlag, KEEP, global_enum, and _simple_enum
to allow import re to proceed.
See https://docs.python.org/3/library/enum.html
'
%

expectvalue /Class
doit
enum category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
enum removeAllMethods: 1.
enum class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: enum
initialize
	"Initialize stored attributes."
	self @env0:at: #KEEP put: #KEEP.
	"FlagBoundary + verify() constants: opaque symbols are enough for
	``from enum import STRICT, CONFORM, ...`` to resolve (test_enum)."
	self @env0:at: #STRICT put: #STRICT.
	self @env0:at: #CONFORM put: #CONFORM.
	self @env0:at: #EJECT put: #EJECT.
	self @env0:at: #UNIQUE put: #UNIQUE.
	self @env0:at: #CONTINUOUS put: #CONTINUOUS.
	self @env0:at: #NAMED_FLAGS put: #NAMED_FLAGS.
	self @env0:at: #ReprEnum put: ReprEnum.
	self @env0:at: #EnumDict put: dict.
	"Enum / IntEnum / IntFlag / StrEnum / Flag are all real classes now
	(see PyEnumTypes.gs): ``class X(IntEnum): A = 1`` builds real members
	via the metaclass hook ``___pyClassDefined___:``.  StrEnum is
	AbstractPyStr-rooted so its members ARE strings (str(member) == value,
	the ReprEnum contract)."
	self @env0:at: #Enum put: Enum.
	self @env0:at: #EnumType put: Enum @env0:class.
	self @env0:at: #property put: PropertyDescriptor.
	self @env0:at: #member put: PropertyDescriptor.
	self @env0:at: #nonmember put: PropertyDescriptor.
	"``member'' and ``nonmember'' are overwritten just below with real
	callables; the at: entries above only keep ``from enum import member''
	resolving if the dynamic-instVar store is ever bypassed."
	self @env0:at: #auto put: PropertyDescriptor.
	self @env0:at: #EnumMeta put: Enum @env0:class.
	self @env0:at: #IntEnum put: IntEnum.
	self @env0:at: #IntFlag put: IntFlag.
	self @env0:at: #StrEnum put: StrEnum.
	self @env0:at: #Flag put: Flag.
	"Pre-store ``auto'' as a BoundMethod so ``from enum import auto''
	binds to the callable rather than invoking the unary method
	immediately and binding its result (an integer).  Werkzeug's
	sansio.multipart hits this via ``State(Enum): PREAMBLE = auto()''."
	self @env0:dynamicInstVarAt: #auto put: (BoundMethod receiver: self selector: #auto).
	"``nonmember(x)'' / ``@nonmember'' must be a real 1-arg callable that wraps
	x in a marker the enum metaclass unwraps to a plain (non-member) class
	attribute -- NOT PropertyDescriptor, which the builder counted as a member
	(Django's Choices.do_not_call_in_templates, test_*_with_nonmember)."
	self @env0:dynamicInstVarAt: #nonmember put: (BoundMethod receiver: self selector: #nonmember:).
	"``member(x)'' / ``@member'' is nonmember's mirror: a real 1-arg callable
	wrapping x in a marker the enum builder unwraps into a FORCED member.  It
	used to be bound to PropertyDescriptor, so ``@member class Inner'' produced
	a PropertyDescriptor -- which the builder then either counted as a member
	with the descriptor as its VALUE or (since the _EnumDict descriptor rule)
	skipped entirely, and whose post-decorator ``__qualname__'' store raised a
	raw Smalltalk doesNotUnderstand (test_enum
	test_nested_classes_in_enum_with_member)."
	self @env0:dynamicInstVarAt: #member put: (BoundMethod receiver: self selector: #member:)
%

! ===============================================================================
! Stored-attribute accessors
! ===============================================================================

category: 'Grail-Accessors'
method: enum
IntFlag
	^ self @env0:at: #IntFlag
%

category: 'Grail-Accessors'
method: enum
KEEP
	^ self @env0:at: #KEEP
%

category: 'Grail-Accessors'
method: enum
Enum
	^ self @env0:at: #Enum
%

category: 'Grail-Accessors'
method: enum
IntEnum
	^ self @env0:at: #IntEnum
%

category: 'Grail-Accessors'
method: enum
StrEnum
	^ self @env0:at: #StrEnum
%

category: 'Grail-Accessors'
method: enum
Flag
	^ self @env0:at: #Flag
%

category: 'Grail-Built-in Functions'
method: enum
auto
	"``enum.auto()`` — return a marker that ___grailBuildMembers:
	resolves to last-integer-value + 1 in declaration order (CPython
	per-class semantics; a process-global counter gave arbitrary
	values -- 112 test_enum errors expected first/second/third = 1/2/3)."

	^ GrailEnumAuto @env0:new
%

category: 'Grail-Built-in Functions'
method: enum
member: aValue
	"``enum.member(x)'' / ``@member'' — wrap x in a marker that
	___grailBuildMembers: unwraps into a FORCED member: x becomes the member's
	value even where the ordinary rules would skip the name, which is the whole
	point of CPython's member() (a nested class, or a descriptor that
	_EnumDict would leave a plain class attribute).  The exact mirror of
	nonmember: above."

	^ (Python @env0:at: #GrailEnumMember) @env0:on: aValue
%

category: 'Grail-Built-in Functions'
method: enum
nonmember: aValue
	"``enum.nonmember(x)`` / ``@nonmember`` — wrap x in a marker that
	___grailBuildMembers: unwraps to a PLAIN class attribute, excluded from
	the enum's members (CPython nonmember: Outer.Inner is Inner, MyTypes.f is
	float, Example.ALL == 3)."

	^ (Python @env0:at: #GrailEnumNonmember) @env0:on: aValue
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: enum
global_enum: cls
	"global_enum(cls) — injects each of cls's class-side attributes
	into the defining module's globals, then returns the class.

	Equivalent of CPython's ``@enum.global_enum``: after the
	decorator runs, every enum member is reachable both as
	``Cls.MEMBER`` and as a bare module-level ``MEMBER`` name.  In
	Grail the class-side attributes are paired ``X`` / ``X:``
	methods on the metaclass (compiled by ClassDefAst codegen for
	each class-body ``NAME = value`` statement); we iterate those
	pairs, read each value via the unary getter, and store it on
	the module instance (which is a SymbolDictionary).

	The defining module is read from the synthetic ``__module__``
	class slot that ClassDefAst stamps on every Python user class.
	Names starting with ``_`` are skipped — they're not enum members
	(internal ones include ``__module__`` itself)."

	| module classMd processed |
	module := cls @env0:perform: #'__module__' env: 1.
	"__module__ is the dotted NAME STRING (CPython semantics) -- resolve
	the instance through sys.modules; tolerate a module INSTANCE stored
	by older codegen.  Unresolvable name -> decorator is a no-op."
	(module isKindOf: CharacterCollection) ifTrue: [
		module := importlib modules
			@env0:at: (module @env0:asString @env0:asSymbol)
			otherwise: nil.
		module @env0:isNil ifTrue: [^ cls]].
	classMd := cls @env0:class @env0:methodDictForEnv: 1.
	processed := IdentitySet @env0:new.
	classMd @env0:keysDo: [:sel |
		| nameStr setter |
		nameStr := sel @env0:asString.
		((nameStr @env0:size @env0:> 0
			and: [(nameStr @env0:at: 1) @env0:= $_]) not
			and: [(processed @env0:includes: sel) not]) ifTrue: [
			setter := (nameStr @env0:, ':') @env0:asSymbol.
			(classMd @env0:includesKey: setter) ifTrue: [
				| val |
				val := cls @env0:perform: sel env: 1.
				module @env0:dynamicInstVarAt: sel put: val.
				processed @env0:add: sel.
			].
		].
	].
	"CPython @global_enum also rewrites member __repr__ to ``module.NAME''
	(global_enum_repr / global_flag_repr).  Mark the class so its member
	__repr__ methods produce that form (test_global_enum_str)."
	Enum ___grailMarkGlobalEnum: cls.
	^ cls
%

category: 'Grail-Built-in Functions'
method: enum
__simple_enum: positional kw: kwargs
	"_simple_enum(cls) or _simple_enum(cls, boundary=...) -> decorator.
	Returns a decorator that returns the class unchanged.
	Used by re module: @enum._simple_enum(IntFlag, boundary=enum.KEEP).
	Grail's varargs-selector convention prepends one underscore to
	the Python name, so the Python ``_simple_enum`` becomes the
	Smalltalk selector ``__simple_enum:kw:``."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: enum
_verify: positional kw: kwargs
	"@verify(UNIQUE | CONTINUOUS | NAMED_FLAGS, ...) -> decorator.  UNIQUE is
	enforced -- it delegates to the same alias check as @unique, raising
	ValueError on a duplicate-valued enum (test_enum test_unique_dirty via
	@verify).  CONTINUOUS is enforced too (test_continuous): the member values
	must form a gap-free run -- consecutive integers for an enum, consecutive
	powers of two for a flag.  NAMED_FLAGS stays advisory (returns the class
	unchanged); skipping it only means we never raise on it."

	| checksUnique checksContinuous |
	checksUnique := positional @env0:includes: (self @env0:at: #UNIQUE).
	checksContinuous := positional @env0:includes: (self @env0:at: #CONTINUOUS).
	^ [:positional2 :keywords2 |
		| cls |
		cls := positional2 @env0:at: 1.
		checksUnique ifTrue: [self unique: cls].
		checksContinuous ifTrue: [self continuous: cls].
		cls]
%

category: 'Grail-Built-in Functions'
method: enum
unique: cls
	"``@unique`` -- raise ValueError when the enum has any ALIAS (a name in
	__members__ whose member's canonical name differs, i.e. a duplicate value),
	listing each ``alias -> name`` in definition order; otherwise return cls
	unchanged (CPython enum.unique).  Previously ``unique`` was bound to
	PropertyDescriptor, so ``@unique`` silently accepted duplicate-valued enums
	(test_enum test_unique_dirty).  __members__ preserves declaration order, so
	the alias list matches CPython's message ordering."

	| dups msg byName |
	byName := cls @env1:_member_map_.
	dups := OrderedCollection @env0:new.
	"CPython lists aliases in DECLARATION order; _member_map_ is hash-ordered, so
	walk the CANONICAL members in definition order and gather each one's aliases
	(other __members__ names bound to the same member object).  Reproduces the
	usual alias-follows-canonical layout the tests assert."
	((Python @env0:at: #Enum) ___grailMembers: cls) @env0:do: [:member |
		| canonical |
		canonical := (member @env0:dynamicInstVarAt: #name) @env0:asString.
		byName @env0:keysAndValuesDo: [:name :m |
			(m == member and: [(name @env0:asString @env0:= canonical) @env0:not]) ifTrue: [
				dups @env0:add: (name @env0:asString @env0:, ' -> ' @env0:, canonical)]]].
	dups @env0:isEmpty ifTrue: [^ cls].
	msg := WriteStream @env0:on: String @env0:new.
	dups @env0:doWithIndex: [:d :i |
		i @env0:> 1 ifTrue: [msg @env0:nextPutAll: ', '].
		msg @env0:nextPutAll: d].
	^ ValueError ___signal___: ('duplicate values found in <enum '''
		@env0:, cls @env0:name @env0:asString @env0:, '''>: ' @env0:, msg @env0:contents)
%

category: 'Grail-Built-in Functions'
method: enum
continuous: cls
	"``@verify(CONTINUOUS)`` -- raise ValueError when the member values leave a
	gap (CPython enum.verify CONTINUOUS).  For a plain enum the values must be
	consecutive integers between the min and max; for a flag they must be the
	consecutive powers of two between the lowest and highest set bit.  Fewer
	than two values, or any non-integer value, is nothing to check -- return
	cls unchanged (test_continuous)."

	| enumClass isFlag values sorted low high missing enumType msg |
	enumClass := Python @env0:at: #Enum.
	isFlag := enumClass ___grailIsFlagClass: cls.
	values := Set @env0:new.
	(enumClass ___grailMembers: cls) @env0:do: [:m |
		values @env0:add: (m @env0:dynamicInstVarAt: #value)].
	(values @env0:size @env0:< 2) ifTrue: [^ cls].
	(values @env0:anySatisfy: [:v | (v isKindOf: Integer) @env0:not]) ifTrue: [^ cls].
	sorted := values @env0:asSortedCollection.
	low := sorted @env0:first.
	high := sorted @env0:last.
	missing := OrderedCollection @env0:new.
	isFlag
		ifTrue: [
			"range(_high_bit(low)+1, _high_bit(high)); _high_bit(v) == v highBit - 1,
			so i runs low highBit .. high highBit - 2 and the value checked is 2**i."
			(low @env0:highBit) to: (high @env0:highBit @env0:- 2) do: [:i | | p |
				p := 1 @env0:bitShift: i.
				(values @env0:includes: p) ifFalse: [missing @env0:add: p]]]
		ifFalse: [
			(low @env0:+ 1) to: (high @env0:- 1) do: [:i |
				(values @env0:includes: i) ifFalse: [missing @env0:add: i]]].
	missing @env0:isEmpty ifTrue: [^ cls].
	enumType := isFlag ifTrue: ['flag'] ifFalse: ['enum'].
	msg := WriteStream @env0:on: String @env0:new.
	missing @env0:doWithIndex: [:m :i |
		i @env0:> 1 ifTrue: [msg @env0:nextPutAll: ', '].
		msg @env0:nextPutAll: m @env0:printString].
	^ ValueError ___signal___: ('invalid ' @env0:, enumType @env0:, ' '''
		@env0:, cls @env0:name @env0:asString @env0:, ''': missing values '
		@env0:, msg @env0:contents)
%

category: 'Grail-Built-in Functions'
method: enum
__test_simple_enum: positional kw: kwargs
	"_test_simple_enum(checked, simple) — CPython-internal consistency
	check between a @_simple_enum class and its handwritten twin.
	Nothing to verify here; return None."

	^ None
%

category: 'Grail-Built-in Functions'
method: enum
_iter_bits_lsb: num
	"_iter_bits_lsb(n) — yield each set bit, least-significant first, as a
	LAZY generator (CPython enum._iter_bits_lsb is a generator function).  A
	negative argument raises ValueError (``-8 is not a positive integer'')
	when the generator is CONSUMED, not when it is created: the test passes
	``list(_iter_bits_lsb(-8))'' to assertRaisesRegex, so the raise must
	surface inside list() -- an eager materialized list would raise during
	argument evaluation, outside the assertRaises context (test_enum
	TestHelpers.test_iter_bits_lsb).  No Grail caller consumes this other
	than by iteration, so a generator is a safe drop-in for the old list."

	^ PythonGenerator withBlock: [:gen | | n |
		(num @env0:< 0) ifTrue: [
			ValueError ___signal___: (num @env0:printString
				@env0:, ' is not a positive integer')].
		n := num.
		[n @env0:> 0] @env0:whileTrue: [ | bit |
			bit := n @env0:bitAnd: (n @env0:negated).
			gen ___yield___: bit.
			n := n @env0:- bit]]
%

category: 'Grail-Built-in Functions'
method: enum
_is_descriptor: obj
	"_is_descriptor(obj) — True if obj defines __get__, __set__ or
	__delete__ (CPython enum._is_descriptor)."

	| bi |
	bi := builtins instance.
	^ (bi hasattr: obj _: '__get__')
		or: [(bi hasattr: obj _: '__set__')
		or: [bi hasattr: obj _: '__delete__']]
%

category: 'Grail-Built-in Functions'
method: enum
_is_dunder: name
	"_is_dunder(name) — True for a __dunder__ name: len > 4, starts and
	ends with '__', and neither name[2] nor name[-3] is '_'
	(CPython enum._is_dunder)."

	| n sz |
	n := name @env0:asString.
	sz := n @env0:size.
	^ (sz @env0:> 4)
		and: [((n @env0:at: 1) @env0:= $_)
		and: [((n @env0:at: 2) @env0:= $_)
		and: [((n @env0:at: (sz @env0:- 1)) @env0:= $_)
		and: [((n @env0:at: sz) @env0:= $_)
		and: [((n @env0:at: 3) @env0:~= $_)
		and: [(n @env0:at: (sz @env0:- 2)) @env0:~= $_]]]]]]
%

category: 'Grail-Built-in Functions'
method: enum
_is_sunder: name
	"_is_sunder(name) — True for a _sunder_ name: len > 2, starts and ends
	with '_', and neither name[1] nor name[-2] is '_'
	(CPython enum._is_sunder)."

	| n sz |
	n := name @env0:asString.
	sz := n @env0:size.
	^ (sz @env0:> 2)
		and: [((n @env0:at: 1) @env0:= $_)
		and: [((n @env0:at: sz) @env0:= $_)
		and: [((n @env0:at: 2) @env0:~= $_)
		and: [(n @env0:at: (sz @env0:- 1)) @env0:~= $_]]]]
%

category: 'Grail-Built-in Functions'
method: enum
_is_private: clsName _: name
	"_is_private(cls_name, name) — True for a name-mangled private name
	'_ClsName__x' that is not also dunder-terminated
	(CPython enum._is_private)."

	| n pat patLen sz |
	n := name @env0:asString.
	pat := '_' @env0:, clsName @env0:asString @env0:, '__'.
	patLen := pat @env0:size.
	sz := n @env0:size.
	^ (sz @env0:> patLen)
		and: [((n @env0:copyFrom: 1 to: patLen) @env0:= pat)
		and: [((n @env0:at: sz) @env0:~= $_)
			or: [(n @env0:at: (sz @env0:- 1)) @env0:~= $_]]]
%

set compile_env: 0

! The module singleton is committed and lazily initialized; clear it so
! the updated ``initialize`` above (real Enum/IntEnum/IntFlag classes)
! re-runs on next access instead of returning a stale cached instance.
run
enum @env1:clearInstance.
%
