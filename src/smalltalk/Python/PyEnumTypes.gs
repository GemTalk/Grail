! ===============================================================================
! Enum / IntEnum / IntFlag — real Python enum classes for Grail.
!
! Members are built at class-creation time by the metaclass hook
! ``___pyClassDefined___:`` (ClassDefAst + Object.gs): ``class Color(IntEnum):
! RED = 1`` dispatches the hook class-side to Color, whose metaclass turns
! each class-body ``NAME = value`` into a singleton member instance of Color.
!
!   Enum    < PythonInstance   (members are distinct markers, value-typed)
!   IntEnum < AbstractPyInt    (members ARE ints: isinstance(m, int) True)
!   IntFlag < IntEnum
!
! IntEnum class does NOT inherit Enum class (different storage bases), so
! the shared build/lookup/iterate logic lives as ``___grail*`` class
! methods on Enum class (taking the target class explicitly); IntEnum
! class carries thin delegators.  Per-class member maps live in the Enum
! classVar ``EnumRegistry`` because class objects can't hold dynamic
! instVars.  This file defines the TYPES; the ``enum`` module (Enum.gs)
! aliases to them.
! ===============================================================================

! ------------------- Superclass checks
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
AbstractPyInt ifNil: [self error: 'AbstractPyInt is not defined. Check file ordering.'].
%

! ------------------- Class definitions
expectvalue /Class
doit
PythonInstance subclass: 'Enum'
  instVarNames: #()
  classVars: #( EnumRegistry )
  classInstVars: #( ___dynInstVars___ )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Enum subclass: 'Flag'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

! ------- ReprEnum: an Enum whose MEMBERS str/format as their VALUE (the
! ------- mix-in data type's output), keeping only Enum's repr.  CPython's
! ------- IntEnum/StrEnum/IntFlag are ReprEnum subclasses; in Grail those are
! ------- storage-rooted (AbstractPyInt/AbstractPyStr) and already str as their
! ------- value, so ReprEnum exists here mainly to make ``class E(date,
! ------- ReprEnum)'' DISTINGUISHABLE from ``class E(date, Enum)'' -- the former
! ------- must str(member) == str(value), the latter ``Cls.name''.  A distinct
! ------- class is the only way to tell them apart (bases are otherwise equal).
expectvalue /Class
doit
Enum subclass: 'ReprEnum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Object subclass: 'GrailEnumAuto'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailEnumAuto comment: 'Marker returned by enum.auto(); ___grailBuildMembers: replaces each marker with last-int-value + 1 in declaration order (CPython auto() semantics), so values are per-CLASS 1..n, not a process-global counter.'
%

expectvalue /Class
doit
Object subclass: 'GrailEnumNonmember'
  instVarNames: #( value )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailEnumNonmember comment: 'Marker returned by enum.nonmember(x) (and the @nonmember decorator): wraps x so ___grailBuildMembers: stores x as a PLAIN class attribute and drops the name from _member_names_ / iteration (CPython nonmember -- Outer.Inner is Inner, MyTypes.f is float, Example.ALL == 3).'
%

set compile_env: 0

category: 'Grail-Nonmember'
classmethod: GrailEnumNonmember
on: aValue
	"Wrap aValue as a nonmember marker."

	^ self new setValue: aValue; yourself
%

category: 'Grail-Nonmember'
method: GrailEnumNonmember
setValue: aValue
	value := aValue
%

category: 'Grail-Nonmember'
method: GrailEnumNonmember
value
	"The wrapped value the enum stores as a plain class attribute."

	^ value
%

expectvalue /Class
doit
Object subclass: 'GrailEnumMember'
  instVarNames: #( value )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailEnumMember comment: 'Marker returned by enum.member(x) (and the @member decorator): wraps x so ___grailBuildMembers: FORCES x to be a member even when the ordinary rules would skip it -- a nested class, or a descriptor, which CPython _EnumDict would otherwise leave a plain class attribute (test_enum test_nested_classes_in_enum_with_member).  The exact mirror of GrailEnumNonmember.'
%

set compile_env: 0

category: 'Grail-Member'
classmethod: GrailEnumMember
on: aValue
	"Wrap aValue as a forced-member marker."

	^ self new setValue: aValue; yourself
%

category: 'Grail-Member'
method: GrailEnumMember
setValue: aValue
	value := aValue
%

category: 'Grail-Member'
method: GrailEnumMember
value
	"The wrapped value that becomes the member's value."

	^ value
%

set compile_env: 0

expectvalue /Class
doit
AbstractPyInt subclass: 'IntEnum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
IntEnum subclass: 'IntFlag'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

! ------- StrEnum: str + Enum.  AbstractPyStr-rooted so members ARE
! ------- strings (boxed, #value holds the real string); the Enum
! ------- metaclass protocol is DUPLICATED onto its class side, exactly
! ------- as for IntEnum (AbstractPyStr never passes Enum's class side).
expectvalue /Class
doit
AbstractPyStr subclass: 'StrEnum'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

run
Enum comment: 'Python enum base — see category comment in PyEnumTypes.gs.'.
#( #Enum #Flag #IntEnum #IntFlag #StrEnum #GrailEnumAuto #GrailEnumNonmember #GrailEnumMember ) do: [:nm | (Python at: nm) category: 'Grail-Modules'].
%

! ------------------- Remove existing behavior (env 0 + env 1)
run
#( #Enum #Flag #IntEnum #IntFlag #StrEnum ) do: [:nm | | c |
  c := Python at: nm.
  c removeAllMethods. c class removeAllMethods.
  c removeAllMethods: 1. c class removeAllMethods: 1].
%

set compile_env: 1

! ===============================================================================
! Shared metaclass logic — class methods on Enum class, taking target cls
! ===============================================================================

category: 'Grail-Metaclass'
classmethod: Enum
___grailDeclaredMetaclass___
	"""EnumType -- which in Grail IS ``Enum class'', the object enum.py binds
	that name to.

	CPython's type(Color) is enum.EnumType, and Grail answered Color's own
	anonymous Smalltalk metaclass.  Declaring it here rather than special-casing
	Enum in ___pyMetaclass___ keeps the rule general: a Smalltalk-written class
	that has a real Python metaclass says so, and everything else is type.

	Inherited by every enum whose Smalltalk chain passes Enum; a storage-rooted
	one (``class Mixed(int, Enum)'') is found by ___pyMetaclass___'s MRO walk."""

	^ Enum @env0:class
%

category: 'Grail-Metaclass'
classmethod: IntEnum
___grailDeclaredMetaclass___
	"""EnumType, same as Enum's -- IntEnum cannot inherit that answer.

	It is rooted at AbstractPyInt so its Smalltalk chain never passes Enum, and
	being written in Smalltalk it has no registered MI bases either, so
	___pyMetaclass___'s MRO walk has nothing to find.  StrEnum is the same shape;
	IntFlag inherits this one.  A USER's ``class Mixed(int, Enum)'' is different
	-- it does have registered bases, and the walk finds Enum through them."""

	^ Enum @env0:class
%

category: 'Grail-Metaclass'
classmethod: StrEnum
___grailDeclaredMetaclass___
	"""EnumType -- see IntEnum's, which this mirrors for the AbstractPyStr root."""

	^ Enum @env0:class
%

category: 'Grail-Class Attrs'
classmethod: Enum
___dynInstVars___
	"The per-class attribute holder, the same slot ClassDefAst declares on every
	generated Python class and the same accessor pair it compiles for it.

	Enum is written in Smalltalk and so had neither, which meant Enum itself
	could hold no Python class attribute at all: ___classHolderAttrStore___ (and
	through it every ___pyAttrStore___ that lands on a class) died with ``a Enum
	class does not understand #'___dynInstVars___'''.  It is what lets Enum carry
	``name'' and ``value'' as real DynamicClassAttribute descriptors -- see
	___grailInstallMemberProperties___.

	The category MUST be 'Grail-Class Attrs': that is what the attribute-load
	path recognises as an accessor rather than wrapping the method as a
	BoundMethod, and what ___classBodyDefinitionalDelete___: scopes itself to."

	^ ___dynInstVars___
%

category: 'Grail-Class Attrs'
classmethod: Enum
___dynInstVars___: aHolder
	___dynInstVars___ := aHolder
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailInstallMemberProperties___
	"Give Enum ``name'' and ``value'' as real DynamicClassAttribute descriptors,
	which is what CPython has:

	    Enum.__dict__['name']      <enum.property object>
	    Color.name                 AttributeError -- class access is refused
	    Color.CYAN.name            'CYAN'

	Grail had them as plain Smalltalk methods, so the first answered an
	UnboundMethod and the second answered one instead of raising.  Both are
	needed by inspect, and by more than a spelling: getmembers DISCOVERS these
	two names by sweeping the bases for ``isinstance(v, DynamicClassAttribute)''
	-- such a descriptor hides from dir(), so nothing else offers it -- and
	classify_class_attrs then reports kind 'data' for it, where an UnboundMethod
	is isroutine() and comes out 'method'.  test_enum's test_inspect_getmembers
	and test_inspect_classify_class_attrs both compare against
	``Enum.__dict__['name']'' itself, so the object has to be the descriptor,
	not merely something answering the same value.

	The getter is the SUNDER accessor, not the public one: _name_ and _value_
	read the member's dynamic instVar directly, so the descriptor cannot recurse
	back into itself.

	Member reads do NOT go through here.  ___grailBuildMembers: stores name and
	value as instance dynamic instVars, which ___pyAttrLoad___ finds before it
	ever consults the class -- so the hot path is untouched and this descriptor
	is what the CLASS side sees.  Idempotent, and called from install rather
	than from enum's module initialize: the store lands on the committed class,
	which is the installing user's to write."

	^ Enum ___grailInstallMemberPropertiesOn: self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailInstallMemberPropertiesOn: cls
	"Put the two descriptors in cls's own class-attribute holder.

	Called for Enum at install time, and again from ___grailBuildMembers: for
	any enum whose SMALLTALK chain does not pass Enum -- ``class Mixed(int,
	Enum)'' is rooted at AbstractPyInt, so ___classChainAttrLookup___ walking up
	from it never reaches Enum's holder and ``Mixed.name'' answered the
	UnboundMethod that ___mergeSecondaryBases___ copied down instead of raising.
	The same shape as _ignore_, which worked on a plain Enum and silently did
	nothing on every mixin for exactly this reason."

	"The four-argument __new__ carries the DOCSTRING.  A descriptor built with
	the getter alone reports None, and pydoc renders whatever getdoc hands it --
	so ``help(Color)'' printed a bare ``name'' and ``value'' where CPython prints
	each with its one-line description.  The getter is a Smalltalk method, so
	there is no def-time docstring for the descriptor to pick up on its own; it
	has to be supplied here, exactly as ___methodDocTable___ supplies one for the
	metaclass methods.  CPython's own text, transcribed from the running
	interpreter -- test_enum's test_pydoc compares byte for byte."
	cls @env1:___classHolderAttrStore___: #'name'
		put: (DynamicClassAttribute @env1:__new__:
			(UnboundMethod definingClass: Enum selector: #'_name_')
			_: nil _: nil _: 'The name of the Enum member.').
	cls @env1:___classHolderAttrStore___: #'value'
		put: (DynamicClassAttribute @env1:__new__:
			(UnboundMethod definingClass: Enum selector: #'_value_')
			_: nil _: nil _: 'The value of the Enum member.').
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailRegistry___
	"The per-SESSION enum-member registry (enum class -> {byValue.
	byName. members}), stored in SessionTemps.  The old ``EnumRegistry''
	classVar sat on the committed Enum class, so every enum definition
	dirtied committed state (multi-user commit conflicts) and dragged
	session-defined classes into any commit.  The classVar declaration
	remains but is unused (removing it would restructure the committed
	class)."

	| reg |
	reg := SessionTemps @env0:current @env0:at: #GrailEnumRegistry otherwise: nil.
	reg @env0:isNil ifTrue: [
		reg := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailEnumRegistry put: reg].
	^ reg
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailRecordFor: cls
	"The {byValue. byName. members} record for an enum class, or nil."

	^ self ___grailRegistry___ @env0:at: cls otherwise: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGnvStaticStore
	"Per-SESSION map: enum class -> the PyStaticMethod wrapping its
	_generate_next_value_.  Used ONLY for FUNCTIONAL enums, which (unlike
	class-syntax enums) have no ___dynInstVars___ holder to hold the staticmethod, so
	object>>___classDict___ reads this to surface it in cls.__dict__
	(test_gnv_is_static Function variants).  SessionTemps-backed like
	___grailRegistry___ so it never dirties committed state."

	| s |
	s := SessionTemps @env0:current @env0:at: #GrailEnumGnvStatic otherwise: nil.
	s @env0:isNil ifTrue: [
		s := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailEnumGnvStatic put: s].
	^ s
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGnvStaticFor: cls
	"The PyStaticMethod for a functional enum's _generate_next_value_, or nil."

	^ self ___grailGnvStaticStore @env0:at: cls otherwise: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailStoredGnvFor: cls
	"The PyStaticMethod for cls's functional _generate_next_value_, found by
	walking the superclass chain.  A functional enum stores its gnv keyed by the
	class that DEFINED it (``ReprEnum('enum_type', {'_generate_next_value_':fn},
	type=date)''), but a SUBCLASS built off it (``enum_type('MainEnum', dict(
	first=auto(), ...))'') inherits the gnv and must resolve it for auto()
	numbering.  nil when neither cls nor any ancestor carries a stored gnv."

	| walker sm |
	walker := cls.
	[walker ~~ nil] @env0:whileTrue: [
		sm := self ___grailGnvStaticFor: walker.
		sm @env0:notNil ifTrue: [^ sm].
		walker := walker @env0:superclass].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailStoredGnvInvocable: sm
	"True when a stored functional gnv (a PyStaticMethod) can actually be
	invoked staticmethod-style -- name as the FIRST positional arg, no self.
	CPython treats every _generate_next_value_ as a staticmethod, but Grail's
	class-body codegen represents a plain-def sibling referenced as a value as
	a receiver-LESS BoundMethod whose call protocol POPS positional[1] (the
	name) as the receiver -- so ``fn(name, start, count, last_values)'' loses
	an argument and dispatches the wrong class (the name string).  A
	@staticmethod def instead compiles class-side and is referenced as a
	BoundMethod BOUND to the class (receiver ~~ nil), which invokes correctly;
	a method-local / module-level def is an ExecBlock, which also invokes
	directly.  Only the receiver-less BoundMethod is unusable -- treat those as
	``no gnv'' so the enum falls back to default auto numbering (its prior
	behaviour) rather than crashing the build."

	| f |
	f := sm @env0:dynamicInstVarAt: #'__func__'.
	[f isKindOf: PyStaticMethod] @env0:whileTrue: [
		f := f @env0:dynamicInstVarAt: #'__func__'].
	^ (f isKindOf: BoundMethod)
		ifTrue: [f @env0:receiver @env0:notNil or: [f @env0:definingClass @env0:notNil]]
		ifFalse: [true]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGlobalEnumMap
	"Per-SESSION map: enum class -> its SHORT module name, for classes decorated
	``@enum.global_enum'' (or built via ``_convert_(..., as_global=True)'').  CPython
	rewrites such a class's member __repr__ to ``module.NAME'' (global_enum_repr /
	global_flag_repr) instead of ``<Cls.NAME: value>''.  The short module is captured
	at mark time (reliable for a class-syntax @global_enum class; supplied explicitly
	for a functionally-built _convert_ class).  SessionTemps-backed."

	| s |
	s := SessionTemps @env0:current @env0:at: #GrailGlobalEnums otherwise: nil.
	s @env0:isNil ifTrue: [
		s := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailGlobalEnums put: s].
	^ s
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailShortModuleName: dotted
	"Last dotted component of a module name (CPython: module.split('.')[-1])."

	| s idx |
	s := dotted @env0:asString.
	idx := 0.
	1 @env0:to: s @env0:size do: [:i | (s @env0:at: i) @env0:= $. ifTrue: [idx := i]].
	^ idx @env0:= 0 ifTrue: [s] ifFalse: [s @env0:copyFrom: idx @env0:+ 1 to: s @env0:size]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMarkGlobalEnum: cls
	"Mark a class-syntax @global_enum class; read its short module from __module__
	(the dotted NAME string ClassDefAst stamps, same accessor global_enum: uses)."

	| mod |
	mod := [(cls @env0:perform: #'__module__' env: 1) @env0:asString]
		@env0:on: AbstractException do: [:e | cls @env0:name @env0:asString].
	^ self ___grailMarkGlobalEnum: cls moduleName: mod
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMarkGlobalEnum: cls moduleName: modName
	"Mark cls as a global enum whose members repr with the given short module."

	self ___grailGlobalEnumMap @env0:at: cls put: (Enum ___grailShortModuleName: modName).
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsGlobalEnum: cls
	"True when cls's members should repr as ``module.NAME''."

	^ self ___grailGlobalEnumMap @env0:includesKey: cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGlobalMemberRepr: m
	"CPython global_enum_repr / global_flag_repr: ``<short_module>.<NAME>'' for a
	named member; ``<short_module>.<ClassName>(<value>)'' for a nameless flag value
	(0, or a composite that NO named member covers -- HeadlightsK(8)).  A covered
	composite joins its decomposition pieces with ``|'', each named (identifier)
	piece module-prefixed and any leftover KEEP bits left as a bare int
	(HeadlightsK(13) -> module.LOW_BEAM_K|module.FOG_K|8)."

	| cls modName nm |
	cls := m @env0:class.
	modName := self ___grailGlobalEnumMap @env0:at: cls otherwise: cls @env0:name @env0:asString.
	nm := m @env0:dynamicInstVarAt: #name.
	(Enum ___grailIsFlagClass: cls) ifTrue: [
		| val pieces named out |
		val := m @env0:dynamicInstVarAt: #value.
		"A plain named member formats directly; a COMPOSITE pseudo-member
		decomposes, so that each named piece can carry the module prefix.  Marked
		at construction rather than inferred from a missing name: a composite
		carries the joined name now (CPython 3.11+), which this branch would
		otherwise read as ``already named''.  Decide ``nameless'' by whether the
		decomposition yields any NAMED piece -- a composite that only
		leftover-covers bits (HeadlightsK(8)) has none and formats as Cls(value),
		NOT as the bare leftover int."
		((m @env0:dynamicInstVarAt: #'___grailIsComposite') == true
			or: [nm @env0:isNil or: [nm == None]]) ifTrue: [
			pieces := Enum ___grailFlagDecomposePieces: m.
			named := pieces @env0:reject: [:p |
				(p @env0:size @env0:> 0) and: [(p @env0:at: 1) @env0:isDigit]].
			named @env0:isEmpty ifTrue: [
				^ modName @env0:, '.' @env0:, cls @env0:name @env0:asString
					@env0:, '(' @env0:, val @env0:printString @env0:, ')'].
			out := WriteStream @env0:on: String @env0:new.
			pieces @env0:doWithIndex: [:p :i |
				i @env0:> 1 ifTrue: [out @env0:nextPut: $|].
				((p @env0:size @env0:> 0) and: [(p @env0:at: 1) @env0:isDigit])
					ifTrue: [out @env0:nextPutAll: p]
					ifFalse: [out @env0:nextPutAll: modName @env0:, '.' @env0:, p]].
			^ out @env0:contents].
		^ modName @env0:, '.' @env0:, nm @env0:asString].
	^ modName @env0:, '.' @env0:, nm @env0:asString
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBuildingSet
	"Per-SESSION set of enum classes whose members are mid-construction.
	A class-body ``def __new__`` runs while the class is in this set; if
	that __new__ delegates to ``super().__new__`` (which reaches Enum's
	__new__ -- the by-value lookup -- since the class has no members yet),
	the guard below fires CPython's ``do not use super().__new__'' error.
	SessionTemps-backed so it never dirties committed state, mirroring
	___grailRegistry___."

	| s |
	s := SessionTemps @env0:current @env0:at: #GrailEnumBuilding otherwise: nil.
	s @env0:isNil ifTrue: [
		s := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailEnumBuilding put: s].
	^ s
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___new__: args kw: kw
	"Enum.__new__ as a METHOD (not the class-call, which is metaclass
	value:value:).  Reached by ``super().__new__(cls, value)'' inside a
	user __new__ -- Python's C3 super-walk finds this on Enum's metaclass.
	During member construction the class is in ___grailBuildingSet and has
	no members, so a member __new__ that wrongly delegates up here is the
	<super>.__new__ misuse CPython rejects (test_bad_new_super).  Outside
	construction, behave as the ordinary by-value lookup (``Enum.__new__''
	== ``Enum(value)'').  ``args'' arrives as (cls, value) via super
	(Python passes cls explicitly); a direct ``Cls.__new__(value)'' passes
	just (value) -- the value is always the LAST positional."

	Enum ___grailSuperNewGuard: self.
	^ Enum ___grailLookupValue: self value: (args @env0:at: args @env0:size)
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailSuperNewGuard: cls
	"CPython forbids a member ``def __new__'' from delegating to
	``super().__new__'' while the enum is being built (test_bad_new_super) --
	it must call the appropriate data-type __new__ DIRECTLY.  A class whose
	members are mid-construction is in ___grailBuildingSet.  Called from
	SuperBoundMethod>>value:value: (the super().__new__ dispatch point) BEFORE
	the parent-method walk, so it fires uniformly no matter which storage
	__new__ the walk would land on -- Enum's for a pure enum, Integer/
	AbstractPyInt/AbstractPyFloat/str's for a mixed one.  Raise CPython's error
	when cls is building; no-op otherwise, so a legitimate super().__new__ on a
	non-enum subclass, and a direct member_type.__new__, proceed untouched.

	Restricted to a __new__ defined in the ENUM CLASS'S OWN body, which is what
	CPython actually rejects: the error comes out of Enum.__new__, so it needs
	the super() walk to reach Enum in the first place.  A DATA MIXIN's __new__
	delegating upward is the legitimate shape --

	    class MyInt(int):
	        def __new__(cls, value):
	            return super().__new__(cls, value)
	    class MyIntEnum(HexMixin, MyInt, enum.Enum): ...
	    class Foo(MyIntEnum): TEST = 1

	-- where super() reaches int.__new__, never Enum's.  Once
	___grailFindMemberNew: began running the mixin's __new__ to build members
	(CPython _find_new_ clause 2), the unrestricted guard fired on Foo and took
	out test_multiple_mixin_inherited.

	The owner test is deliberately ``defined ON cls'' rather than the resolved
	walk target: guarding the individual storage constructors was tried and is
	incomplete, because IntEnum/StrEnum/Flag each expose a different one and
	the walk from a BadSuper(IntEnum) lands on AbstractPyInt's, not Enum's."

	| owner |
	((cls @env0:isKindOf: Behavior)
		and: [Enum ___grailBuildingSet @env0:includes: cls]) ifFalse: [^ nil].
	owner := cls @env0:whichClassIncludesSelector: #'___new__:kw:'
		environmentId: 1.
	owner == cls ifTrue: [
		^ TypeError ___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailDropIgnoredNames: cls from: allNames
	"Remove every name the class body listed in ``_ignore_'' -- and ``_ignore_''
	itself -- from cls and from allNames, answering what is left.

	    class Period(timedelta, Enum):
	        _ignore_ = 'Period i'
	        Period = vars()
	        for i in range(32):
	            Period['day_%d' % i] = i, 'day'

	``Period'' and ``i'' are scaffolding for building the real members, and
	CPython leaves NO trace of them: EnumType.__new__ pops each key out of the
	class dict (``for key in ignore: classdict.pop(key, None)''), having pushed
	``_ignore_'' onto the same list first, so test_enum's test_ignore can assert
	all three are absent from the finished class.

	Grail cannot pop from a dict, because by the time this runs the names are
	already REAL class state -- an accessor pair for a name the body assigned
	unconditionally, a ___dynInstVars___ entry for one bound through the namespace, or
	both.  ___classBodyDefinitionalDelete___: is the operation that knows all
	three homes, so the pop becomes a delete of exactly what the body stored.
	It signals NameError for a name that was never bound, which is not an error
	HERE -- ``_ignore_'' may name something the body never got around to
	assigning -- so each delete is guarded.

	The list is read back off the CLASS and re-parsed, rather than taken from
	the EnumDict that already parsed it as it was assigned.  Not a duplicate
	route: a MIXIN enum never gets an EnumDict at all.  ``__prepare__'' reaches
	a class through its metaclass, which Grail resolves along the SMALLTALK
	superclass chain -- and ``class I(int, Enum)'' is rooted at AbstractPyInt,
	``class S(str, Enum)'' at Unicode32, so neither chain passes Enum and the
	pending namespace is nil for both.  Taking the list from the namespace made
	_ignore_ work on a plain Enum and silently do nothing on every mixin, which
	is how it behaved before this method existed.  ___grailParseIgnoreList: is
	shared with EnumDict so the two cannot drift.

	A class whose body never mentioned _ignore_ answers nil, the list is empty,
	and this drops nothing -- which is every enum in the corpus but one."

	| ignored |
	ignored := Enum ___grailParseIgnoreList:
		(Enum ___grailOwnClassAttr: cls named: '_ignore_').
	"``_ignore_'' goes with them -- CPython appends it to the list it is about
	to walk.  Unconditionally, so a body that assigned it is cleaned up even
	when the list itself came out empty."
	ignored @env0:add: '_ignore_'.
	ignored @env0:do: [:n |
		[cls ___classBodyDefinitionalDelete___: n @env0:asSymbol]
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	^ allNames @env0:reject: [:n | ignored @env0:includes: n @env0:asString]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailOwnClassAttr: cls named: aString
	"The value cls's OWN class body bound to aString, or nil -- never an
	inherited one.

	CPython reads ``_ignore_'' out of the classdict, which is the body's own
	namespace, so an inherited value must not be seen.  The two homes are the
	ones ___classBodyDefinitionalStore___:put: writes to: an accessor compiled
	into 'Grail-Class Attrs' for a name the body assigned unconditionally, and
	the per-class ___dynInstVars___ holder for everything else."

	| sym meta holder |
	sym := aString @env0:asSymbol.
	meta := cls @env0:class.
	(meta @env0:whichClassIncludesSelector: sym environmentId: 1) == meta
		ifTrue: [^ [cls @env0:perform: sym env: 1]
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	holder := (cls ___respondsTo___: #___dynInstVars___)
		ifTrue: [cls @env0:perform: #___dynInstVars___ env: 1]
		ifFalse: [nil].
	holder == nil ifTrue: [^ nil].
	^ holder @env0:dynamicInstVarAt: sym
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailParseIgnoreList: aValue
	"CPython's ``value.replace(',',' ').split()'' for a string, ``list(value)''
	for anything else -- answering an OrderedCollection of Strings, empty for
	nil or for a value that is neither.

	Shared by EnumDict >> __setitem__:_: (which needs the list to keep the
	named entries out of _member_names) and by ___grailDropIgnoredNames:from:
	(which needs it to take them off the finished class).  Two parses of one
	syntax is exactly the kind of pair that drifts, and they reach the value by
	different routes -- one as it is assigned, one read back off the class."

	| parsed |
	parsed := OrderedCollection @env0:new.
	aValue @env0:isNil ifTrue: [^ parsed].
	[(aValue isKindOf: CharacterCollection)
		ifTrue: [(aValue @env0:asString @env0:copyReplaceAll: ',' with: ' ')
			@env0:subStrings @env0:do: [:n | parsed @env0:add: n @env0:asString]]
		ifFalse: [aValue @env0:do: [:n | parsed @env0:add: n @env0:asString]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ parsed
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBuildMembers: cls names: attrNames
	"Turn each class-body NAME=value on cls into a singleton member (an
	instance of cls).  Equal values alias to the first member (CPython
	semantics).  Members are written back as the class attributes and
	recorded in EnumRegistry."

	| byValue byName members allOrdered lastInt maxInt allNames dynHolder autoResolved hasUserInit hasUserNew newDefClass tupleClass gnvClass gnvStaticClass genValues foreignMixin forcedMembers ntClass privPat |
	"CPython _check_for_existing_members_: adding members to -- or otherwise
	subclassing -- an enum that already HAS members is illegal (that enum is
	final).  Raise before building anything (test_extending / test_extending2);
	a member-less method/mixin base is allowed (test_extending3)."
	[ | offending |
	offending := Enum ___grailExtendedMemberBase: cls.
	offending @env0:notNil ifTrue: [
		TypeError ___signal___: (Enum ___grailEnumTagFor: cls)
			@env0:, ' cannot extend ' @env0:, (Enum ___grailEnumTagFor: offending)] ] @env0:value.
	"CPython _get_mixins_ base-combination rules: at most one data type mixed
	in, and any data type must precede the Enum base."
	Enum ___grailValidateBases: cls.
	"``name'' and ``value'' are DynamicClassAttributes on Enum, and a
	STORAGE-ROOTED enum cannot inherit them: ``class Mixed(int, Enum)'' is
	rooted at AbstractPyInt, so the class-attribute walk never reaches Enum's
	holder.  Give it its own copy -- see ___grailInstallMemberPropertiesOn:."
	(cls @env0:inheritsFrom: Enum) ifFalse: [
		Enum ___grailInstallMemberPropertiesOn: cls].
	"Names assigned under a class-body ``if`` (the shared test fixture's
	``if issubclass(...): dupe = 3'') never reach classBodyAttributes --
	their stores go through ___pyAttrStore___ into the per-class
	___dynInstVars___ holder BEFORE this hook runs.  Sweep the holder for
	additional member candidates (skipping underscore-prefixed machinery
	such as closure cells) and process them after the declared names."
	allNames := attrNames @env0:asOrderedCollection.
	dynHolder := ((cls @env0:class @env0:whichClassIncludesSelector: #___dynInstVars___ environmentId: 1) notNil)
		ifTrue: [cls @env0:perform: #___dynInstVars___ env: 1]
		ifFalse: [nil].
	dynHolder == nil ifFalse: [
		| dynPairs i |
		"A holder that never received a dynamic instVar has no varying part
		and dynamicInstVarPairs raises OffsetError -- treat as empty.  The
		result is a FLAT alternating (name, value, name, value, ...) array."
		dynPairs := [dynHolder @env0:dynamicInstVarPairs]
			@env0:on: AbstractException do: [:ex | ex @env0:return: #()].
		i := 1.
		[i @env0:< dynPairs @env0:size] @env0:whileTrue: [
			| dynSym ds dynVal |
			dynSym := dynPairs @env0:at: i.
			dynVal := dynPairs @env0:at: i @env0:+ 1.
			ds := dynSym @env0:asString.
			"A value that is ALREADY A MEMBER of the class being built is a
			leftover from a PREVIOUS build of this same class object, not a
			declaration -- so it is not a member candidate.

			Only reachable with canonical classes enabled, where a re-import
			reuses the class OBJECT and re-runs the body over it.  A name the
			body declares is harmless: the body re-stores its raw value before
			this runs.  A name the body does NOT declare -- one a metaclass or
			other definition-time wiring left behind -- still holds the MEMBER
			built last time, and feeding that back in as a value made the enum
			oscillate across loads: members ['ID','NAME'], then
			['ID','NAME','ID_DESC','NAME_DESC'] (CPython's answer, one load late
			and by accident), then TypeError <MyEnum.ID_DESC: '-id'> is not a
			string on the third.  See docs/Persistent_Modules_and_Classes.md
			par.9.1 -- reused code plus re-executed state.

			An ALIAS (``class C(Enum): A = 1; B = A'') is member-valued too, and
			legitimately so, but it is a DECLARED name and so is handled by the
			attrNames pass above; this guard only filters the sweep."
			((ds @env0:size @env0:> 0)
				and: [((ds @env0:at: 1) @env0:= $_) not
				and: [(allNames @env0:includes: dynSym) not
				and: [(dynVal @env0:class == cls) not]]])
					ifTrue: [allNames @env0:add: dynSym].
			i := i @env0:+ 2]].
	"_ignore_ = 'Period i': those names are not members AND not attributes --
	CPython pops each one out of the class dict before anything else looks at
	it.  Grail's class body has already STORED them by now, so the equivalent is
	a delete; done here, before the member passes, so the names are invisible to
	every one of them exactly as they are upstream."
	allNames := Enum ___grailDropIgnoredNames: cls from: allNames.
	"enum.nonmember(x): x is deliberately NOT a member.  Unwrap it, store the
	raw value as a plain class attribute (Outer.Inner is Inner; MyTypes.f is
	float; Example.ALL == 3, type int), and DROP the name from member building
	so it is excluded from _member_names_ / iteration.  Both the call form
	(f = nonmember(float)) and the decorator form (@nonmember class Inner) land
	here as a NAME bound to a GrailEnumNonmember marker.  Done before the
	reserved-name / member passes so the name is invisible to them."
	"enum.member(x) is the exact mirror: x is deliberately a member EVEN WHERE
	the ordinary rules would skip the name -- a nested class, or a descriptor
	the _EnumDict rule below would leave a plain class attribute.  Unwrap it the
	same way and record the name as FORCED so the later passes leave it alone
	(test_enum test_nested_classes_in_enum_with_member)."
	forcedMembers := IdentitySet @env0:new.
	[ | dropped |
	dropped := OrderedCollection @env0:new.
	allNames @env0:do: [:nameSym | | raw hasAcc unwrap |
		hasAcc := (cls @env0:class @env0:whichClassIncludesSelector:
			(nameSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1) notNil.
		raw := hasAcc
			ifTrue: [cls @env0:perform: nameSym env: 1]
			ifFalse: [dynHolder @env0:isNil
				ifTrue: [nil]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym]].
		"Write the unwrapped value back over the marker, wherever the marker was
		stored.  Shared by both markers -- they differ only in what happens to
		the NAME afterwards."
		unwrap := [:rawVal |
			hasAcc
				ifTrue: [cls @env0:perform: (nameSym @env0:asString @env0:, ':') @env0:asSymbol
					env: 1 withArguments: (Array @env0:with: rawVal)]
				ifFalse: [dynHolder @env0:isNil
					ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym put: rawVal]]].
		(raw isKindOf: GrailEnumNonmember) ifTrue: [
			unwrap @env0:value: raw @env0:value.
			dropped @env0:add: nameSym].
		(raw isKindOf: GrailEnumMember) ifTrue: [
			unwrap @env0:value: raw @env0:value.
			forcedMembers @env0:add: nameSym]].
	dropped @env0:isEmpty ifFalse: [
		allNames := allNames @env0:reject: [:n | dropped @env0:includes: n]] ] @env0:value.
	"CPython _EnumDict.__setitem__ names two kinds of class-body value that are
	NOT members -- ``not _is_descriptor(value) and not _is_internal_class(...)''
	-- so both are dropped here, in the one pass.

	A DESCRIPTOR: ``class E(Enum): x = property(f)'' leaves x an ordinary class
	attribute.  See ___grailFunctional: for why ___isValueDescriptor___: is the
	predicate and why underscore names are exempt.

	An INTERNAL CLASS: a class DEFINED IN the body (3.13 -- it was a member,
	with a DeprecationWarning, through 3.12), so ``class Outer(Enum): class
	Inner(Enum): ...'' leaves Outer.Inner the class itself rather than an Outer
	member wrapping it.  Merely NAMING a class defined elsewhere still makes a
	member (``class MyTypes(Enum): i = int''), and CPython separates the two by
	__qualname__ alone; see ___grailIsInternalClass:inClassNamed:.

	Nothing needs to be re-stored for either: the class-body store already holds
	the value (an accessor pair for a declared name, the ___dynInstVars___ holder for
	one assigned under a class-body ``if''), so dropping the name leaves
	``cls.x'' answering it, exactly as CPython's class dict does."
	[ | dropped |
	dropped := OrderedCollection @env0:new.
	allNames @env0:do: [:nameSym | | raw hasAcc ns |
		ns := nameSym @env0:asString.
		((((ns @env0:size @env0:> 0) and: [(ns @env0:at: 1) @env0:= $_]) not)
			and: [(forcedMembers @env0:includes: nameSym) not]) ifTrue: [
			hasAcc := (cls @env0:class @env0:whichClassIncludesSelector:
				(ns @env0:, ':') @env0:asSymbol environmentId: 1) notNil.
			raw := hasAcc
				ifTrue: [cls @env0:perform: nameSym env: 1]
				ifFalse: [dynHolder @env0:isNil
					ifTrue: [nil]
					ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym]].
			((cls ___isValueDescriptor___: raw)
				or: [Enum ___grailIsInternalClass: raw
					inClassNamed: cls @env0:name @env0:asString])
						ifTrue: [dropped @env0:add: nameSym]]].
	dropped @env0:isEmpty ifFalse: [
		allNames := allNames @env0:reject: [:n | dropped @env0:includes: n]] ] @env0:value.
	"Reserved-name validation (CPython EnumType.__new__): a class-body
	ASSIGNMENT may not rebind ``mro`` (it would shadow type.mro) nor use a
	_sunder_ name outside the supported set -- ValueError at definition
	(test_invalid_names across every enum flavor)."
	privPat := '_' @env0:, (cls @env0:name @env0:asString) @env0:, '__'.
	allNames @env0:do: [:nameSym | | ns sz isPriv |
		ns := nameSym @env0:asString.
		sz := ns @env0:size.
		ns @env0:= 'mro' ifTrue: [
			ValueError ___signal___: 'cannot use ''mro'' as an enum member name'].
		"CPython checks _is_private BEFORE _is_sunder, and a mangled PRIVATE name
		passes both tests: ``__major_'' written in class Private is _Private__major_,
		which opens and closes with a single underscore and so reads as a sunder.
		CPython calls it a normal attribute (test_private_variable_is_normal_
		attribute); the pattern is _<ClassName>__ with anything but a trailing
		``__'' after it."
		isPriv := (sz @env0:> privPat @env0:size)
			and: [(ns @env0:copyFrom: 1 to: privPat @env0:size) @env0:= privPat
			and: [((ns @env0:at: sz) @env0:= $_
				and: [(ns @env0:at: sz @env0:- 1) @env0:= $_]) not]].
		"CPython _is_sunder: one leading underscore and one trailing one, so BOTH
		the second and the second-to-last character have to be something else.
		Grail asked for ``not (both are underscores)'', which is the same answer
		only when they agree -- a name underscored at just one end read as a
		sunder and was rejected outright: ``__major_'' in a class body is a
		PRIVATE name, mangled to _Cls__major_ (test_private_variable_is_normal_
		attribute), and CPython does not reserve it."
		(isPriv not
			and: [sz @env0:>= 3
			and: [(ns @env0:at: 1) @env0:= $_
			and: [(ns @env0:at: sz) @env0:= $_
			and: [((ns @env0:at: 2) @env0:= $_) not
			and: [((ns @env0:at: sz @env0:- 1) @env0:= $_) not]]]]])
				ifTrue: [
					(#('_ignore_' '_order_' '_missing_' '_generate_next_value_'
						'_value_repr_' '_numeric_repr_' '_name_' '_value_')
						@env0:includes: ns) ifFalse: [
							ValueError ___signal___:
								'_sunder_ names, such as ''' @env0:, ns
									@env0:, ''', are reserved for future Enum use']]].
	"Duplicate-name validation (CPython _EnumDict.__setitem__): an enum class
	body may not bind a name twice, however the two bindings are spelled --
	assignment/assignment, assignment/def, or descriptor/assignment
	(test_duplicate_name_error covers all three).  Grail's stores simply
	overwrite each other, so codegen records the repeats for us in
	___classBodyDuplicates___; see ClassDefAst.

	The reported value is the SURVIVING one, where CPython names the value the
	FIRST binding had -- the earlier store is gone by the time this runs.  No
	reachable test pins that text (test_dynamic_members_with_static_methods
	does, but fails earlier, on ``vars().update()'' in a class body), and
	matching CPython's shape keeps ``already defined'' regexes working."
	[ | dups |
	dups := (cls @env0:class @env0:whichClassIncludesSelector:
		#'___classBodyDuplicates___' environmentId: 1) @env0:isNil
			ifTrue: [nil]
			ifFalse: [cls @env0:perform: #'___classBodyDuplicates___' env: 1].
	(dups @env0:notNil and: [dups @env0:isEmpty @env0:not]) ifTrue: [ | nm prior |
		nm := (dups @env0:at: 1) @env0:asString.
		prior := [cls @env1:___pyAttrLoad___: nm @env0:asSymbol]
			@env0:on: AbstractException do: [:e | nil].
		TypeError ___signal___:
			'''' @env0:, nm @env0:, ''' already defined as '
				@env0:, ([prior __repr__ @env0:asString]
					@env0:on: AbstractException do: [:e | prior @env0:printString])] ]
		@env0:value.
	"auto()-ordering validation (CPython _EnumDict.__setitem__): a class-body
	``def _generate_next_value_'' must come BEFORE any member that needs it.

	    class Color(Enum):
	        red = auto()
	        ...
	        def _generate_next_value_(name, start, count, last): ...

	is a TypeError (test_auto_order), because CPython resolves each auto() AS
	THE BODY EXECUTES and would have numbered red with the default rule before
	the generator existed.  Grail resolves in a single later pass, so it
	silently applied the generator to every member -- the definition read as
	working code that quietly disagreed with CPython on all three values.

	Only a member that ACTUALLY needed generating counts, which is what keeps
	test_auto_order_wierd legal:

	    weird_auto = auto(); weird_auto.value = 'pathological case'
	    class Color2(Enum):
	        red = weird_auto
	        def _generate_next_value_(...): ...
	        blue = auto()

	CPython sets _auto_called only when it has to CALL the generator, and
	red's value was supplied outside the body.

	WHERE that distinction is read from depends on whether the body ran against
	a namespace.  With one, EnumDict resolved each auto() as it was assigned and
	recorded the names it had to generate for (_auto_named) -- so the marker is
	long gone from the class attribute by the time this runs, and asking the
	namespace is the only way to tell.  Without one -- the functional API,
	_convert_, a class built without a class statement -- the marker is still
	there and carries the distinction itself: a preset auto() answers ``value'',
	a fresh one raises.

	___classBodyOrder___ is what makes the position visible; it records defs
	and assignments alike, in source order (see ClassDefAst)."
	[ | order gnvIdx nsTbl ns autoNamed |
	nsTbl := SessionTemps @env0:current
		@env0:at: #'GrailPendingClassNamespace' otherwise: nil.
	ns := nsTbl @env0:isNil ifTrue: [nil] ifFalse: [nsTbl @env0:at: cls otherwise: nil].
	autoNamed := ns @env0:isNil
		ifTrue: [nil]
		ifFalse: [ns @env0:dynamicInstVarAt: #'_auto_named'].
	order := (cls @env0:class @env0:whichClassIncludesSelector:
		#'___classBodyOrder___' environmentId: 1) @env0:isNil
			ifTrue: [nil]
			ifFalse: [cls @env0:perform: #'___classBodyOrder___' env: 1].
	gnvIdx := nil.
	order @env0:isNil ifFalse: [
		1 @env0:to: order @env0:size do: [:i |
			((order @env0:at: i) @env0:asString @env0:= '_generate_next_value_')
				ifTrue: [gnvIdx @env0:isNil ifTrue: [gnvIdx := i]]]].
	gnvIdx @env0:isNil ifFalse: [
		1 @env0:to: gnvIdx @env0:- 1 do: [:i | | nameSym raw hasAcc |
			nameSym := order @env0:at: i.
			(allNames @env0:includes: nameSym) ifTrue: [
				hasAcc := (cls @env0:class @env0:whichClassIncludesSelector:
					(nameSym @env0:asString @env0:, ':') @env0:asSymbol
					environmentId: 1) notNil.
				raw := hasAcc
					ifTrue: [cls @env0:perform: nameSym env: 1]
					ifFalse: [dynHolder @env0:isNil
						ifTrue: [nil]
						ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym]].
				((autoNamed @env0:notNil
					and: [autoNamed @env0:includes: nameSym @env0:asString])
					or: [(raw isKindOf: GrailEnumAuto)
					and: [([raw ___pyAttrLoad___: #'value'. true]
						@env0:on: AbstractException do: [:ex | false]) @env0:not]])
					ifTrue: [
						TypeError ___signal___:
							'_generate_next_value_ must be defined before members']]]] ]
		@env0:value.
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	"allOrdered: EVERY freshly-built (non-alias) member in definition order --
	canonical single-bit members PLUS the multi-bit/zero ones ``members'' drops.
	Record slot 4; the flag str/repr decomposition walks it so a mask member
	(``OnlyMask = 0x0f'') appears in the composite name (OldTestFlag.test_boundary)."
	allOrdered := OrderedCollection @env0:new.
	"Register the (still-empty) record BEFORE the member loop so a member's
	__new__ can observe the members built so far -- an auto-numbering __new__
	that reads ``len(cls.__members__)'' (test_inherited_new_from_enhanced_enum /
	_from_mixed_enum) must count them, and byValue/byName/members are the SAME
	objects filled in progressively below (a member is added to byName only
	AFTER its __new__ runs, so member N+1 sees exactly the N prior members).
	The post-loop registration overwrites this with identical content plus any
	composite/order handling."
	self ___grailRegistry___ @env0:at: cls put: (Array @env0:with: byValue with: byName with: members with: allOrdered).
	lastInt := 0.
	"maxInt: the running MAXIMUM member value -- Flag auto() numbers from the
	highest bit seen so far, NOT the last value, so a manual value LOWER
	than the max (``DOS = 2'' after FOUR = 4) must not reset the sequence
	(CPython Flag._generate_next_value_ uses max(last_values))."
	maxInt := 0.
	"auto() markers resolve ONCE per instance: ``third = auto(); dupe =
	third`` binds both names to the SAME marker object, so dupe must reuse
	third's resolved value (-> alias), not advance the counter again
	(CPython _EnumDict semantics).  Identity-keyed so distinct auto() calls
	stay distinct."
	autoResolved := IdentityKeyValueDictionary @env0:new.
	"A class-body ``def __init__(self, ...)'' compiles to an env-1
	``___init__:kw:'' method ON cls itself (a plain enum inherits object's,
	so the defining class is NOT cls).  When present, CPython runs it on
	each freshly-built member with the value's tuple elements as positional
	args (a scalar value -> a 1-tuple); exceptions propagate out of the
	class definition (test_init_exception).  Value-carrying enums such as
	the classic Planet(mass, radius) rely on this."
	"A class-body ``def __init__'' on cls, OR one INHERITED from a non-enum
	mixin (``class Entries(Foo, Enum)'' where Foo.__init__ sets member
	slots -- CPython runs the mix-in type's __init__ on each member with its
	value args).  Exclude the enum base classes and the universal roots so a
	plain enum (whose only __init__ is Enum's / object's) still skips it."
	[ | initProvider |
	initProvider := cls @env0:whichClassIncludesSelector: #'___init__:kw:'
		environmentId: 1.
	"What must be excluded is the __init__ GRAIL ships -- Enum's, IntEnum's,
	object's -- not every class that happens to be an enum.  ___grailIsEnumBase:
	answers true for a USER enum subclass too (it inherits Enum), so a base
	written to initialise its subclasses' members never ran:

	    class UniqueEnum(Enum):
	        def __init__(self, *args): ...   'rejects aliases'
	    class Color(UniqueEnum): red = 1; green = 2; grene = 2

	silently accepted the alias (test_no_duplicates).  ___grailIsGrailDefinedType:
	is the symbol-list test that separates Grail's own classes from ones written
	in Python; the universal roots stay spelled out."
	hasUserInit := (initProvider == cls)
		or: [(initProvider @env0:notNil)
			and: [((Enum ___grailIsGrailDefinedType: initProvider) @env0:not)
			and: [(initProvider == (Python @env0:at: #object otherwise: nil)) @env0:not
			and: [(initProvider == PythonInstance) @env0:not
			and: [(initProvider == Object) @env0:not]]]]] ] @env0:value.
	"A class-body ``def __new__(cls, ...)'' likewise compiles to an env-1
	INSTANCE method ON cls (self-param bound to cls).  When present, CPython
	builds each member by running it (member_type construction + user slots)
	rather than a bare allocation; a __new__ that delegates to
	``super().__new__'' trips the guard in Enum>>___new__:kw:.

	An INHERITED user __new__ (``class SubEnum(SuperEnum)'' reusing SuperEnum's
	__new__, test_dir_on_sub..._instance_dict_on_super) must ALSO run so its
	member-instance side effects (``obj.description = ...'') persist.  But
	broadening the test on a DATA-MIXED chain regresses several fixtures
	(test_bad_new_super's super().__new__ guard; test_multiple_mixin_inherited),
	because CPython's _find_new_ weighs member_type.__new__ / Enum.__new__
	identity there -- a refinement not yet mirrored.  So keep the exact cls-only
	rule for every data-mixed enum, and honor an inherited enum __new__ ONLY for
	a PLAIN (member_type is object) enum, where there is no storage constructor
	to disambiguate.  ``inheritsFrom: Enum'' selects an enum-class defining class
	(the built-in storage/data constructors -- AbstractPyInt/Float, PyDate/Time,
	functools_* -- are not enum classes); object member_type is only ever
	Enum-rooted, so the single base check suffices."
	newDefClass := cls @env0:whichClassIncludesSelector: #'___new__:kw:'
		environmentId: 1.
	hasUserNew := (newDefClass == cls) or: [
		newDefClass @env0:notNil
			and: [((newDefClass @env0:inheritsFrom: Enum)
				and: [(Enum ___grailMemberTypeFor: cls) == object])
			or: [(Enum ___grailRecordFor: newDefClass) @env0:notNil]]].
	"CPython _find_new_ clause 2: no __new__ on cls itself, but the DATA MIXIN
	supplies one (``class NEI(NamedInt, Enum)'' where NamedInt is a user int
	subclass).  Members are then member_type.__new__(cls, *args), which is what
	sets both _value_ and the mixin's own instance slots.  See
	___grailFindMemberNew: for the two exclusions that keep this away from
	Grail's storage constructors and from Enum's by-value lookup."
	hasUserNew ifFalse: [ | mixinNew |
		mixinNew := Enum ___grailFindMemberNew: cls.
		mixinNew @env0:notNil ifTrue: [
			newDefClass := mixinNew.
			hasUserNew := true]].
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	"An MI enum whose storage base is Enum (``cls inheritsFrom: Enum'') but
	which mixes in a FOREIGN data type -- ``class E(date, Enum)'', where date is
	merged as a SECONDARY base -- must carry member_type(*source_args) as each
	member's value (CPython builds each via member_type.__new__(cls, *args)).
	nil for a pure Enum/Flag (no mix-in -> object) and for int/str/float-storage
	enums, whose Smalltalk chain does NOT pass Enum and whose member already IS
	the data type (rawValue is already correct)."
	foreignMixin := Enum ___grailValueMixinFor: cls.
	"A method-local class-body ``super()`` resolves its defining class
	through the ``___cell_<name>___'' closure cell, which ClassDefAst
	stores only AFTER this hook (after decorators).  A member __new__ runs
	DURING this hook, so pre-store the cell now -- otherwise super() reads
	nil and its __new__ walk hits ``nil superClass'' instead of reaching
	Enum's guard.  Only matters when a user __new__ exists."
	hasUserNew ifTrue: [
		cls ___pyAttrStore___:
			('___cell_' @env0:, cls @env0:name @env0:asString @env0:, '___') @env0:asSymbol
			put: cls].
	"A class-body ``def _generate_next_value_(name, start, count, last_values)''
	overrides how auto() numbers members (CPython): the mixed date/float enum
	fixtures return values[count].  A PLAIN def compiles to a 4-param env-1
	INSTANCE method ``_generate_next_value_:_:_:'' whose self-param is ``name''
	(gnvClass).  An EXPLICIT ``@staticmethod'' (CPython adds one implicitly, so
	both source forms mean the same thing) instead compiles to a 5-slot env-1
	CLASS-side method ``_generate_next_value_:_:_:_:'' -- receiver is the class,
	the four declared params are all keyword args (gnvStaticClass).  Detect
	both; either is nil when absent (use the built-in per-base rule).  No base
	Enum/Flag/Str/ReprEnum class defines either selector, so a non-nil result is
	always a user gnv.  genValues collects the resolved values in order to pass
	as ``last_values''."
	gnvClass := cls @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:'
		environmentId: 1.
	gnvStaticClass := cls @env0:class @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:_:'
		environmentId: 1.
	genValues := OrderedCollection @env0:new.
	"Members build while cls is in the building set: a member __new__
	that delegates to super().__new__ hits the guard in
	Enum>>___new__:kw:.  ensure: clears it even when that guard (or a
	user __new__/__init__) raises out of the loop."
	"THE CLASS-CALL PATH IS FIXED UP BEFORE THE LOOP, not after it, so that a
	class-body __init__ can call cls(value) on the members built so far:

	    class UniqueEnum(Enum):
	        def __init__(self, *args):
	            ...
	            e = cls(self.value).name

	is CPython's test_no_duplicates, and _value2member_map_ is live there
	because EnumType.__new__ fills it member by member.  Grail's equivalent --
	the registry record above -- is already published before the loop, but the
	generic instantiation still SHADOWED the lookup, so cls(value) built a
	fresh instance and ran __init__ on it: __init__ calling cls(...) recursed
	until RecursionError.  Nothing in the loop needs the generic (member
	construction calls the DATA TYPE's value:value:, never the enum's), and
	the ClassDefAst emit it undoes has already happened by the time this hook
	runs."
	"Drop the ClassDefAst-emitted generic instantiation (env-1
	``value:value:``) so calling the class — Color(value) — reaches the
	inherited enum value-lookup instead of trying to build an instance.
	ONLY the generic one: ___mergeSecondaryBases___ pre-installs Enum's
	own value:value: (category Grail-Enum Metaclass) on MI enums whose
	kernel-rooted chain would otherwise dispatch the class-call to the
	data base's constructor (str-mixin enums hit ``decoding str is not
	supported'')."
	(((cls @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'value:value:')
		and: [((cls @env0:class @env0:categoryOfSelector: #'value:value:' environmentId: 1)
			== #'Grail-Enum Metaclass') not])
		ifTrue: [
			[cls @env0:class @env0:removeSelector: #'value:value:' environmentId: 1]
				@env0:on: Error do: [:ex |
					"A host extent may hook method removal (e.g. a change-
					notification framework patched into Behavior) and fail
					AFTER the selector is already gone.  Swallow the hook's
					failure when the removal took; anything else passes."
					((cls @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'value:value:')
						ifTrue: [ex @env0:pass]]].
	"With the generic gone, make sure the class-call actually reaches
	the ENUM lookup: for MI enums whose kernel-rooted metaclass chain
	provides some other value:value: (str-mixin classes dispatched the
	class-call into CharacterCollection's constructor -- ``decoding str
	is not supported''), compile Enum's version onto the metaclass.
	This runs at HOOK time, i.e. after the ClassDefAst-emitted generic
	instantiation compile, so nothing overwrites it afterwards."
	[ | prov |
	prov := cls @env0:class @env0:whichClassIncludesSelector: #'value:value:' environmentId: 1.
	((prov == Enum @env0:class)
		or: [(prov == IntEnum @env0:class)
		or: [(prov @env0:notNil and: [(cls @env0:class @env0:categoryOfSelector: #'value:value:' environmentId: 1) == #'Grail-Enum Metaclass'])]]) ifFalse: [
		(cls @env0:class) ___compileMethod:
			(Enum @env0:class @env0:sourceCodeAt: #'value:value:' environmentId: 1)
			category: 'Grail-Enum Metaclass']]
		@env0:on: Error do: [:ex | "best effort" ].
	Enum ___grailBuildingSet @env0:add: cls.
	[
	allNames @env0:do: [:nameSym | | nameStr hasAccessor |
		nameStr := nameSym @env0:asString.
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_])
			ifTrue: [
				"A callable bound to __str__/__repr__/__format__ in the class body
				(``__str__ = object.__str__'') is a user output-method override,
				not a member -- route it through the same forwarder machinery the
				functional API uses so it dispatches (and format() follows it).
				A ``def __str__'' is a real compiled method, not an attr here, so
				it is untouched; the callable guard skips non-method dunder attrs
				(__doc__/__module__/...) and every sunder/private name."
				(#('__str__' '__repr__' '__format__') @env0:includes: nameStr) ifTrue: [
					| dunVal |
					dunVal := [ | ha |
						ha := (cls @env0:class @env0:whichClassIncludesSelector:
							(nameStr @env0:, ':') @env0:asSymbol environmentId: 1) @env0:notNil.
						ha ifTrue: [cls @env0:perform: nameSym env: 1]
							ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym]]
						@env0:on: AbstractException do: [:e | nil].
					((dunVal isKindOf: BoundMethod)
						or: [(dunVal isKindOf: UnboundMethod)
						or: [dunVal isKindOf: ExecBlock]]) ifTrue: [
							Enum ___grailStoreOverride: cls name: nameStr callable: dunVal.
							Enum ___grailCompileOverrideForwarder: cls name: nameStr]]]
			ifFalse: [
			| rawValue member built effVal tupleAutoDone aliasOf |
			built := false.
			tupleAutoDone := false.
			"Declared names read through their compiled accessor pair;
			dyn-swept names (class-body ``if`` stores) read from the holder."
			hasAccessor := (cls @env0:class
				@env0:whichClassIncludesSelector: (nameStr @env0:, ':') @env0:asSymbol
				environmentId: 1) notNil.
			rawValue := hasAccessor
				ifTrue: [cls @env0:perform: nameSym env: 1]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym].
			"``TWO = auto(), auto()'': a tuple value carrying auto() markers.  Resolve
			each marker left-to-right with the SAME generator the scalar path uses,
			appending its value to genValues (the gnv's last_values) BETWEEN markers so
			the DEFAULT numeric generator advances: ``auto(), auto()'' is (2, 3).  But
			``count'' is the number of MEMBERS so far (members size), CONSTANT within a
			member -- so a ``return count+1'' gnv yields (2, 2)/(3, 3, 3), matching
			CPython (test_multiple_auto_on_line's two Huh classes differ ONLY in this).
			Non-marker elements pass through (WEDNESDAY = auto(), 'WED').  Only the
			INDIVIDUAL generated values, not the whole tuple, belong in last_values, so
			genValues is updated here and the per-member add below is skipped
			(tupleAutoDone)."
			"A NAMEDTUPLE value carrying auto() markers -- ``first = T(auto(),
			'for the money')''.  Grail's namedtuple classes are not tuple-ROOTED
			(the ``_NT'' chain runs straight to Enum, never through Array), so the
			isKindOf: test below never saw one and the marker survived into the
			member value as ``T(index=<GrailEnumAuto object>, ...)''
			(test_tuple_subclass_with_auto_2).

			Unwrap to a plain tuple here and rebuild after, so the resolution
			itself -- left-to-right, feeding genValues between markers so the
			default generator advances -- stays in ONE place rather than being
			copied for a second container shape."
			ntClass := nil.
			[ | flds |
			flds := [rawValue @env1:___pyAttrLoad___: #'_fields']
				@env0:on: AbstractException do: [:e | nil].
			(flds @env0:notNil and: [(rawValue isKindOf: tupleClass) not]) ifTrue: [
				| els |
				els := OrderedCollection @env0:new.
				flds @env0:do: [:f |
					els @env0:add: (rawValue @env1:___pyAttrLoad___: f @env0:asSymbol)].
				(els @env0:anySatisfy: [:el | el isKindOf: GrailEnumAuto]) ifTrue: [
					ntClass := rawValue @env0:class.
					rawValue := tupleClass @env0:withAll: els]] ] @env0:value.
			((rawValue isKindOf: tupleClass)
				and: [rawValue @env0:anySatisfy: [:el | el isKindOf: GrailEnumAuto]]) ifTrue: [
				| resolvedEls |
				resolvedEls := OrderedCollection @env0:new.
				rawValue @env0:do: [:el |
					(el isKindOf: GrailEnumAuto)
						ifTrue: [ | r hasExplicit explicitVal |
							hasExplicit := true.
							explicitVal := [el ___pyAttrLoad___: #'value']
								@env0:on: AbstractException do: [:ex | hasExplicit := false. nil].
							r := hasExplicit
								ifTrue: [explicitVal]
								ifFalse: [gnvClass @env0:notNil
									ifTrue: [(UnboundMethod definingClass: gnvClass selector: #'_generate_next_value_')
										value: { nameStr. 1. members @env0:size. (list @env0:withAll: genValues) }
										value: KeyValueDictionary @env0:new]
									ifFalse: [gnvStaticClass @env0:notNil
									ifTrue: [cls @env0:perform: #'_generate_next_value_:_:_:_:' env: 1
										withArguments: { nameStr. 1. members @env0:size. (list @env0:withAll: genValues) }]
									ifFalse: [(Enum ___grailIsStrEnumClass: cls)
										ifTrue: [nameStr @env0:asLowercase]
										ifFalse: [(Enum ___grailIsFlagClass: cls)
											ifTrue: [Enum ___grailFlagAutoNext: genValues]
											ifFalse: [Enum ___grailPlainAutoNext: genValues]]]]].
							genValues @env0:add: r.
							(r isKindOf: Integer) ifTrue: [lastInt := r. maxInt := maxInt @env0:max: r].
							resolvedEls @env0:add: r]
						ifFalse: [resolvedEls @env0:add: el]].
				rawValue := tupleClass @env0:withAll: resolvedEls.
				tupleAutoDone := true].
			"Rebuild the namedtuple the unwrap above opened, now that its markers
			carry values.  Best-effort: a type that will not take its own fields
			back keeps the resolved plain tuple rather than breaking the class."
			ntClass @env0:isNil ifFalse: [
				rawValue := [ntClass @env0:perform: #'value:value:' env: 1
					withArguments: { rawValue @env0:asArray. KeyValueDictionary @env0:new }]
					@env0:on: AbstractException do: [:e | rawValue].
				ntClass := nil].
			"auto() markers resolve to last-integer-value + 1 in
			declaration order -- except Flag-natured classes, where the
			next auto value is the next power of two ABOVE the last
			(CPython Flag._generate_next_value_)."
			(rawValue isKindOf: GrailEnumAuto) ifTrue: [
				(autoResolved @env0:includesKey: rawValue)
					ifTrue: [rawValue := autoResolved @env0:at: rawValue]
					ifFalse: [ | resolved hasExplicit explicitVal |
						"CPython: auto() carries a `value` slot defaulting to a sentinel;
						if the code set it explicitly (weird_auto.value = 'x'), that value
						is used verbatim and _generate_next_value_ is NOT called
						(test_auto_order_wierd).  A plain auto() has no `value` attribute
						-> AttributeError -> fall through to the generator/default."
						hasExplicit := true.
						explicitVal := [rawValue ___pyAttrLoad___: #'value']
							@env0:on: AbstractException do: [:ex | hasExplicit := false. nil].
						resolved := hasExplicit
							ifTrue: [explicitVal]
							ifFalse: [gnvClass @env0:notNil
							ifTrue: [
								"Plain-def gnv: _generate_next_value_(name, start=1, count,
								last_values).  count = members built so far; invoke via
								UnboundMethod (the method's self-param is the NAME, not an
								instance of cls)."
								(UnboundMethod definingClass: gnvClass selector: #'_generate_next_value_')
									value: { nameStr. 1. members @env0:size.
										(list @env0:withAll: genValues) }
									value: KeyValueDictionary @env0:new]
							ifFalse: [gnvStaticClass @env0:notNil
							ifTrue: [
								"@staticmethod gnv: same four args, but the method lives
								class-side (receiver is the class, all four params are
								positional).  Send it to cls so metaclass inheritance
								resolves an ancestor's definition."
								cls @env0:perform: #'_generate_next_value_:_:_:_:' env: 1
									withArguments: { nameStr. 1. members @env0:size.
										(list @env0:withAll: genValues) }]
							ifFalse: [(Enum ___grailIsStrEnumClass: cls)
								ifTrue: [nameStr @env0:asLowercase]
								ifFalse: [(Enum ___grailIsFlagClass: cls)
									ifTrue: [Enum ___grailFlagAutoNext: genValues]
									ifFalse: [Enum ___grailPlainAutoNext: genValues]]]]].
						autoResolved @env0:at: rawValue put: resolved.
						rawValue := resolved]].
			"A tuple-auto member already appended its individual generated values to
			genValues (and updated lastInt/maxInt) during resolution above; re-adding
			the whole tuple here would poison last_values for the default numeric
			generator (sorted([1, (2,3)]) raises)."
			tupleAutoDone ifFalse: [
				genValues @env0:add: rawValue.
				(rawValue isKindOf: Integer) ifTrue: [
					lastInt := rawValue.
					maxInt := maxInt @env0:max: rawValue]].
			"StrEnum members are str(*values), validated argument by argument --
			see ___grailStrEnumValueFor:.  Applied AFTER genValues, because
			last_values holds the value as WRITTEN (the tuple), and only when the
			class has no __new__ of its own to decide the value instead."
			((Enum ___grailIsStrEnumClass: cls) and: [hasUserNew @env0:not]) ifTrue: [
				rawValue := Enum ___grailStrEnumValueFor: rawValue].
			"A foreign-mixin enum (``class E(date, Enum)'') carries
			member_type(*args) -- date(2023, 12, 1) -- as its canonical value.
			Construct it up front so alias detection, value-lookup and storage
			all key off the SAME value: ``dupe = third'' must still alias third
			(both resolve to date(2009, 1, 1)), which a byValue keyed by the raw
			tuple while the check used the constructed date would miss.  effVal ==
			rawValue for every non-foreign case (int/str/float/plain), so
			behaviour there is unchanged."
			effVal := Enum ___grailCoerceMemberValue: rawValue
				toMemberType: foreignMixin.
			"CPython _proto_member.__set_name__ decides ALIAS-NESS LAST.  It builds
			the member -- __new__, _value_, _name_, __init__ -- and only then looks
			the value up in _value2member_map_, replacing what it built with the
			canonical member on a hit.  So an alias gets a fully constructed
			THROWAWAY of its own, and the class-body __init__ runs for it:

			    class UniqueEnum(Enum):
			        def __init__(self, *args):
			            if any(self.value == e.value for e in cls):
			                raise ValueError(...)

			is how test_no_duplicates rejects ``grene = 2'' beside ``green = 2'' --
			the alias's own __init__ is what sees the clash and raises.  Grail
			short-circuited on the byValue hit and built nothing, so that class
			body defined quietly.

			Remembered here, applied after the build below."
			aliasOf := (byValue @env0:includesKey: effVal)
				ifTrue: [byValue @env0:at: effVal]
				ifFalse: [nil].
			[
					"Flag composite-alias (CPython): a class-body value whose
					bits are all covered by the ALREADY-DEFINED members
					(``dupe = 3`` after R=1/W=2) is an ALIAS for the
					composite -- reachable by name and value, but excluded
					from iteration and _member_names_."
					member := nil.
					(aliasOf @env0:isNil
						and: [(rawValue isKindOf: Integer)
						and: [rawValue @env0:> 0
						and: [Enum ___grailIsFlagClass: cls]]]) ifTrue: [
						| mask |
						mask := 0.
						members @env0:do: [:m | | mv |
							mv := m @env0:dynamicInstVarAt: #value.
							(mv isKindOf: Integer) ifTrue: [
								mask := mask @env0:bitOr: mv]].
						((rawValue @env0:bitAnd: mask) @env0:= rawValue) ifTrue: [
							"Build the composite pseudo-member inline (the
							registry record doesn't exist until after this
							loop, so ___grailFlagComposite can't).  Cached in
							byValue, so TE(3) later returns the same object.
							An EXPLICITLY-DEFINED composite keeps its class-body
							name -- CPython repr(TE.dupe) is <TE.dupe: 3> --
							while runtime composites (TE(5)) stay nameless."
							member := cls @env0:basicNew.
							built := true.
							member @env0:dynamicInstVarAt: #value put: rawValue.
							member @env0:dynamicInstVarAt: #name put: nameStr.
							member @env0:dynamicInstVarAt: #'_value_' put: rawValue.
							member @env0:dynamicInstVarAt: #'_name_' put: nameStr.
							byValue @env0:at: rawValue put: member]].
						member @env0:isNil ifTrue: [ | memberValue |
							hasUserNew
								ifTrue: [ | newArgs v |
									"Build the member by running the user __new__ (member_type
									construction + user slots).  args = the value tuple unpacked
									(a scalar -> a 1-tuple); the receiver is cls (the __new__
									self-param).  A __new__ that delegates to super().__new__
									raises the guard in Enum>>___new__:kw: here."
									newArgs := Enum ___grailSpreadArgs: rawValue.
									member := (UnboundMethod definingClass: newDefClass selector: #'__new__')
										value: ({ cls } @env0:, newArgs) value: KeyValueDictionary @env0:new.
									"CPython: a member's canonical value is its _value_, set by
									__new__.  When __new__ left it unset, EnumType.__new__ fills it
									with member_type(*args) -- the mix-in's own construction -- and
									only falls back to the raw class-body value when member_type is
									object.  NEI.y.value is NamedInt('the-y', 2), which compares
									equal to 2; the raw tuple ('the-y', 2) was what Grail stored."
									v := [member @env0:dynamicInstVarAt: #'_value_']
								@env0:on: AbstractException do: [:e | nil].
									v @env0:isNil
										ifFalse: [memberValue := v]
										ifTrue: [ | mt built ok |
											mt := Enum ___grailMemberTypeFor: cls.
											(mt @env0:isNil or: [mt == object])
												ifTrue: [memberValue := rawValue]
												ifFalse: [
													"STRICT here, unlike ___grailCoerceMemberValue:'s
													best-effort construction.  CPython wraps exactly this
													call and re-raises as ``_value_ not set in __new__'',
													because a __new__ that neither sets _value_ nor gives
													member_type usable args has left the member with no
													value at all -- keeping the raw class-body tuple would
													paper over a broken definition
													(test_missing_value_error)."
													ok := true.
													built := [Enum
														___grailConstructMemberValueStrict: mt
														args: rawValue]
														@env0:on: AbstractException
														do: [:ex | ok := false. nil].
													ok
														ifTrue: [memberValue := built]
														ifFalse: [
															TypeError ___signal___:
																'_value_ not set in __new__, unable to create it']]]]
								ifFalse: [
									"For a str-storage-rooted enum (``class C(str, Enum)'')
									the member IS a string: give it CONTENT str(value) so
									hash / bool / == behave like a plain str.  basicNew leaves
									the indexed char content empty (member was len 0 -> every
									member hashed/compared equal: ``C.A == 'aval''' compared ''
									to 'aval', and a dict keyed by members collided).  A str
									value keeps its own chars; an int auto value gets content
									'1' even though its .value stays the int (CPython
									_member_type_ is str -> str content, but _value_ is the raw/
									auto value).  int/float storage keeps the value in a named
									slot, so basicNew is right there."
									"A TUPLE-rooted enum (``class SomeTuple(tuple, Enum)'')
									has the same problem the str branch below solves, for
									the same reason: basicNew leaves the INDEXED content
									empty, so every member was a zero-length tuple --
									len() 0, indexing raised IndexError, iteration yielded
									nothing, and ``SomeTuple.third == (3, 'for the
									music')'' was False even though _value_ held exactly
									that (test_tuple_subclass).  Give the member the
									value's elements, as the str branch gives it the
									value's characters.

									A namedtuple mixin is NOT caught here -- Grail's
									namedtuple classes are not tuple-rooted -- so it keeps
									whatever it had."
									(cls @env0:inheritsFrom: tupleClass)
										ifTrue: [ | els |
											els := [effVal @env0:asArray]
												@env0:on: AbstractException
												do: [:e | Array @env0:with: effVal].
											member := cls @env0:new: els @env0:size.
											els @env0:size @env0:> 0 ifTrue: [
												member @env0:replaceFrom: 1 to: els @env0:size
													with: els startingAt: 1]]
									ifFalse: [
									(cls @env0:inheritsFrom: CharacterCollection)
										ifTrue: [ | s |
											s := (effVal isKindOf: CharacterCollection)
												ifTrue: [effVal]
												ifFalse: [[effVal __str__]
													@env0:on: AbstractException do: [:e | '']].
											member := cls @env0:new: s @env0:size.
											s @env0:size @env0:> 0 ifTrue: [
												member @env0:replaceFrom: 1 to: s @env0:size
													with: s startingAt: 1]]
										ifFalse: [member := cls @env0:basicNew]].
									"effVal already carries member_type(*args) for a
									foreign-mixin enum (else the raw value)."
									memberValue := effVal].
							built := true.
							member @env0:dynamicInstVarAt: #value put: memberValue.
							member @env0:dynamicInstVarAt: #name put: nameStr.
							"CPython's canonical sunder attributes; stored as dynamic
							instVars so attribute READS see values (the attr-load path
							probes the instance store before wrapping methods)."
							member @env0:dynamicInstVarAt: #'_value_' put: memberValue.
							member @env0:dynamicInstVarAt: #'_name_' put: nameStr.
							"Run a class-body ``def __init__`` on the freshly-built member
							(CPython _proto_member.__set_name__): value tuple -> positional
							args, a scalar -> a 1-tuple.  Errors propagate out of the class
							definition (test_init_exception).

							BEFORE the member joins byValue / members / byName, because
							CPython runs it before adding to _member_map_ and an __init__
							that inspects its own class must not see itself:

							    class UniqueEnum(Enum):
							        def __init__(self, *args):
							            if any(self.value == e.value for e in cls): raise

							rejected the FIRST member of every subclass once it ran at all
							(test_no_duplicates).  An ALIAS is initialised too -- this member
							is the throwaway CPython builds for it, and everything below is
							what gets skipped instead."
							(hasUserInit) ifTrue: [
								| initArgs |
								initArgs := Enum ___grailSpreadArgs: rawValue.
								member @env0:perform: #'___init__:kw:' env: 1
									withArguments: { initArgs. KeyValueDictionary @env0:new }].
							"...and on the value the member ACTUALLY ENDED UP WITH, which is
							only now known.  CPython looks up enum_member._value_, and a
							user __new__ is free to make that something other than the
							class-body value it was handed:

							    class Period(timedelta, Enum):
							        def __new__(cls, value, period):
							            obj = timedelta.__new__(cls, value)
							            obj._value_ = value          -- 30, not (30, 'month')
							            ...

							so ``month_1 = 30, 'month''' and ``day_30 = 30, 'day''' are the
							SAME member upstream and were two here (test_enum
							TestSpecial.test_ignore).  The early lookup above keys on the
							class-body value, which is right for every enum without a
							__new__ of its own -- there memberValue IS effVal and this
							finds the same answer -- and cannot see through one that has.

							Only when the early test found nothing: a hit there is already
							the canonical member, and re-deriving it from a value the
							throwaway may have changed could pick a different one."
							aliasOf @env0:isNil ifTrue: [
								aliasOf := (byValue @env0:includesKey: memberValue)
									ifTrue: [byValue @env0:at: memberValue]
									ifFalse: [nil]].
							"THE ALIAS TEST, in CPython's place: everything from here on
							records a member the class OWNS, and an alias owns nothing --
							it hands its name to the member that already holds the value
							and the throwaway just built is dropped."
							aliasOf @env0:isNil ifFalse: [member := aliasOf].
							aliasOf @env0:isNil ifTrue: [
							byValue @env0:at: memberValue put: member.
							"Definition-order roll of every non-alias member (see slot-4
							note above) -- added for ALL built members, unlike the
							single-bit-only canonical ``members'' filter below."
							allOrdered @env0:add: member.
							"Drain any value-aliases a user __new__ registered on this
							member via _add_value_alias_ while the class was still
							building (test_add_value_alias_during_creation): the record
							was not yet live, so they were parked on the member -- fold
							them into the now-live value map."
							[(member @env0:dynamicInstVarAt: #'___grailPendingValueAliases')
								@env0:ifNotNil: [:pend |
									pend @env0:do: [:av | byValue @env0:at: av put: member].
									member @env0:dynamicInstVarAt: #'___grailPendingValueAliases' put: nil]]
								@env0:on: AbstractException do: [:e | nil].
							"A Flag member is canonical (iteration / len / reversed /
							_member_names_) ONLY when its value is a SINGLE bit.  A
							zero-valued member (``BLACK = 0``) and any MULTI-bit member
							-- an explicit mask (``MASK = 255``, whose bits are NOT all
							covered by prior members, so it misses the composite-alias
							branch above) or a composite -- are reachable by name and by
							value but are NOT canonical (CPython excludes them from
							iteration; ``A, B = OpenAB`` unpacks exactly the single-bit
							members).  Plain Enum keeps every member canonical."
							((memberValue isKindOf: Integer)
								and: [(Enum ___grailIsFlagClass: cls)
								and: [(memberValue @env0:<= 0)
									or: [(memberValue @env0:bitAnd: memberValue @env0:- 1) @env0:~= 0]]])
								ifFalse: [members @env0:add: member]]]] @env0:value.
			byName @env0:at: nameStr put: member.
			hasAccessor
				ifTrue: [cls @env0:perform: (nameStr @env0:, ':') @env0:asSymbol env: 1
					withArguments: (Array @env0:with: member)]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym put: member]]]]
		@env0:ensure: [Enum ___grailBuildingSet @env0:remove: cls @env0:ifAbsent: []].
	self ___grailRegistry___ @env0:at: cls put: (Array @env0:with: byValue with: byName with: members with: allOrdered).
	"CPython EnumType wraps a user _generate_next_value_ as a staticmethod in the
	class __dict__ (test_gnv_is_static: type(cls.__dict__['_generate_next_value_'])
	is staticmethod).  Grail compiles gnv as a plain method; store a PyStaticMethod
	wrapper in the per-class dynamic-attr holder so BOTH cls._generate_next_value_
	and cls.__dict__['_generate_next_value_'] (which reads that holder) answer a
	staticmethod.  Only when the class actually defines a gnv (gnvClass instance-
	side / gnvStaticClass @staticmethod class-side) -- a plain enum has none."
	(gnvClass @env0:notNil or: [gnvStaticClass @env0:notNil]) ifTrue: [ | sm gnvFn |
		gnvFn := gnvClass @env0:notNil
			ifTrue: [UnboundMethod definingClass: gnvClass selector: #'_generate_next_value_:_:_:']
			ifFalse: [UnboundMethod definingClass: gnvStaticClass selector: #'_generate_next_value_:_:_:_:'].
		sm := PyStaticMethod @env0:new.
		sm @env0:dynamicInstVarAt: #'__func__' put: gnvFn.
		cls @env0:perform: #'___pyAttrStore___:put:' env: 1
			withArguments: { '_generate_next_value_'. sm }].
	"_order_ validation (CPython EnumType): when the class declares an
	``_order_'' string, the canonical member names in DEFINITION order must
	match it exactly -- a wrong order, or extra names on either side, raises
	TypeError.  Aliases are excluded from both (``members'' is canonical-
	only; _order_ conventionally lists canonical names).  Read guarded: no
	_order_ declared -> nil -> skip."
	[ | orderVal |
	orderVal := [cls ___pyAttrLoad___: #'_order_']
		@env0:on: AbstractException do: [:ex | nil].
	(orderVal isKindOf: CharacterCollection) ifTrue: [
		| orderNames memberNames |
		memberNames := (members @env0:collect: [:m |
			(m @env0:dynamicInstVarAt: #name) @env0:asString]) @env0:asArray.
		"ALIASES may appear in _order_ (a Flag ``DOS = 2'' listed alongside
		its canonical ``TWO'') -- CPython strips them before comparing.  An
		alias is a name bound in byName but absent from the canonical member
		names; a name NOT in byName at all (a bogus extra) is kept so it
		still forces a mismatch."
		orderNames := ((orderVal @env0:asString @env0:copyReplaceAll: ',' with: ' ')
			@env0:subStrings)
			@env0:reject: [:n |
				(byName @env0:includesKey: n)
					and: [(memberNames @env0:includes: n) @env0:not]].
		orderNames @env0:asArray @env0:= memberNames ifFalse: [
			TypeError ___signal___: cls @env0:name @env0:asString
				@env0:, ': member order does not match _order_']] ] @env0:value.
	"A data-mixed enum's metaclass lacks the Enum class-side protocol
	(_member_names_, _value_repr_, mro, __reversed__, class repr, ...); install
	it.  No-op for pure Enum/Flag and IntEnum/StrEnum-rooted classes."
	[Enum ___grailInstallClassProtocol: cls] @env0:on: Error do: [:ex | "best effort"].
	"CPython repr/str/format replacement: a mixed-in enum (``class E(int,
	Enum)``) inherits its data-type's output methods through the storage base
	and would str a member as its raw value; force Enum's (or Flag's) unless a
	user or enum method already provides them.  No-op for a pure Enum/Flag
	(members are Enum-rooted) and for IntEnum/IntFlag (own value-str methods)."
	[Enum ___grailInstallEnumOutput: cls] @env0:on: Error do: [:ex | "best effort"].
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailLookupValue: cls value: aValue
	"Color(value) -> the member with that value.  For Flag classes an
	unknown INT value may be a COMPOSITE of member bits (Flag(5) with
	R=1/X=4 -> the R|X pseudo-member)."

	| rec |
	rec := self ___grailRecordFor: cls.
	(rec @env0:notNil and: [(rec @env0:at: 1) @env0:includesKey: aValue])
		ifTrue: [^ (rec @env0:at: 1) @env0:at: aValue].
	(aValue isKindOf: cls) ifTrue: [^ aValue].
	((aValue isKindOf: Integer)
		and: [self ___grailIsFlagClass: cls]) ifTrue: [
		"Boundary-aware construction of an unknown int value, routed by the class's
		effective FlagBoundary (family default, or a ``boundary='' override).  All
		branches require the class to HAVE members -- an empty flag class call still
		raises ``has no members'' below (test_empty_enum_has_no_values)."
		(rec @env0:notNil and: [(rec @env0:at: 3) @env0:notEmpty]) ifTrue: [
			| boundary mask inRange |
			boundary := self ___grailFlagBoundaryOf: cls.
			"KEEP (IntFlag's default): retain uncovered bits -- OpenAB(254) is a live
			composite, never a ValueError."
			boundary @env0:= #'KEEP'
				ifTrue: [^ self ___grailIntFlagValue: cls value: aValue].
			"``in range'' == every set bit lies within the class's FULL named mask --
			its single-bit members AND any multi-bit ones (a ``MASK = 0x0f'' member).
			Member|member ORs land here (both operands' bits are named), so a STRICT
			flag never rejects them; only a genuinely foreign bit is out of range."
			mask := self ___grailFlagNamedMask: cls.
			inRange := (aValue @env0:bitAnd: mask) @env0:= aValue.
			"CONFORM: mask the value into the class's bit space, then build the
			surviving composite (Iron(7) is ONE|TWO; HeadlightsC(13) is
			LOW_BEAM_C|FOG_C; HeadlightsC(8) masks to 0 -> OFF_C)."
			boundary @env0:= #'CONFORM'
				ifTrue: [^ self ___grailIntFlagValue: cls value: (aValue @env0:bitAnd: mask)].
			"EJECT: an in-range value resolves to its composite; anything with a
			foreign bit is ejected as a plain int (Space(7) is the int 7)."
			boundary @env0:= #'EJECT'
				ifTrue: [^ inRange
					ifTrue: [self ___grailIntFlagValue: cls value: aValue]
					ifFalse: [aValue]].
			"STRICT (plain Flag's default): an in-range value builds its composite; an
			out-of-range value raises ``<flag 'X'> invalid value N'' -- UNLESS the class
			defines a USER _missing_, which (CPython) replaces the boundary handler, so
			fall through to the _missing_ dispatch below."
			inRange ifTrue: [^ self ___grailIntFlagValue: cls value: aValue].
			(self ___grailHasUserMissing: cls)
				ifFalse: [^ ValueError ___signal___: (Enum ___grailEnumTagFor: cls)
					@env0:, ' invalid value ' @env0:, aValue @env0:printString]]].
	"A member-less enum class cannot be CALLED at all -- CPython raises
	TypeError ``<enum 'X'> has no members'' (a ValueError here would let
	assertRaises(TypeError) tests fail; test_empty_enum_has_no_values)."
	(rec @env0:isNil or: [(rec @env0:at: 3) @env0:isEmpty]) ifTrue: [
		^ TypeError ___signal___: ((Enum ___grailIsFlagClass: cls)
			ifTrue: ['<flag ''']
			ifFalse: ['<enum '''])
				@env0:, cls @env0:name @env0:asString @env0:, '''> has no members'].
	"CPython Enum.__new__: an UNHASHABLE lookup value misses the hash-based value
	map with a TypeError, then a linear scan compares member values by == --
	``Directions({'sc'})'' finds the ``frozenset({'sc'})'' member (issue 125710).
	For a HASHABLE value == implies hash-equality, so the exact lookup at the top
	already found it and this scan matches nothing new; it only rescues the
	unhashable case (a set matching a frozenset member) and never shadows the
	Flag-composite / _missing_ / ValueError paths, all of which come after it for
	their own value shapes.  ___pyRichEqBool___ is identity-first, so a member
	whose value IS aValue short-circuits without invoking a custom __eq__."
	(rec @env0:at: 3) @env0:do: [:m |
		((m @env0:dynamicInstVarAt: #value) ___pyRichEqBool___: aValue)
			ifTrue: [^ m]].
	"CPython Enum.__new__: an unknown value gets one last chance through a
	user-defined _missing_ classmethod (compiled class-side as _missing_:)
	before ValueError.  Only a USER _missing_ triggers this -- no base enum
	class defines the selector, so whichClassIncludesSelector finds only an
	override."
	(cls @env0:class @env0:whichClassIncludesSelector: #'_missing_:' environmentId: 1) @env0:notNil
		ifTrue: [^ self ___grailMissing: cls value: aValue].
	^ ValueError ___signal___: (Enum ___grailValueRepr: aValue)
		@env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailSpreadArgs: rawValue
	"The positional arguments a member VALUE contributes to __new__ / __init__ /
	member_type(*args) -- CPython's ``args = value if isinstance(value, tuple)
	else (value,)''.

	A NAMEDTUPLE is a tuple in CPython and so spreads.  Grail's namedtuple classes
	are not tuple-ROOTED -- the collections factory's ``_NT'' chain runs straight
	to Enum, never through Array -- so the isKindOf: test missed them and a
	namedtuple value reached a user __new__ as ONE argument: ``missing required
	argument: a'' (test_namedtuple_as_value).  Detected by ``_fields'', the same
	way the auto()-in-a-namedtuple path detects one."

	| tupleClass flds |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	(rawValue isKindOf: tupleClass) ifTrue: [^ rawValue @env0:asArray].
	flds := [rawValue @env1:___pyAttrLoad___: #'_fields']
		@env0:on: AbstractException do: [:e | nil].
	flds @env0:isNil ifFalse: [
		^ [ | els |
			els := OrderedCollection @env0:new.
			flds @env0:do: [:f |
				els @env0:add: (rawValue @env1:___pyAttrLoad___: f @env0:asString @env0:asSymbol)].
			els @env0:asArray]
			@env0:on: AbstractException do: [:e | Array @env0:with: rawValue]].
	^ Array @env0:with: rawValue
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailReduceOf: aMember
	"(cls, (value,)) -- the body of every enum member's __reduce__.

	Shared because the STORAGE-ROOTED roots Grail ships -- IntEnum, IntFlag,
	StrEnum -- do not inherit Enum on the Smalltalk chain, so they never saw it.
	A USER's ``class E(int, Enum)'' did, because ___mergeSecondaryBases___ copies
	Enum's instance methods down, which is why only the shipped roots lost pickle
	identity: with no __reduce__ and no __reduce_ex__ to answer with, pickle fell
	through to newobj(cls) and rebuilt a member-shaped object equal to the
	canonical one but not IT (OldTestFlag test_pickle)."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: {
		aMember @env0:class.
		(tupleClass @env0:withAll: { aMember @env0:dynamicInstVarAt: #value }) }
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMetaclassNamespace___
	"""The class-body namespace an ENUM is built in -- Grail's answer to
	CPython's ``EnumType.__prepare__``, which returns an EnumDict.

	Reached from object >> ___grailPrepareNamespace___ when a class statement
	names no metaclass, because Grail's enum metaclass is Smalltalk (``Enum
	class'') and there is no ``metaclass='' keyword to carry it.

	What it buys is CPython's assignment-time behaviour inside an enum body: a
	reused member name is refused where it is written, and an ``auto()'' is
	resolved as it is assigned, so a later statement in the same body sees the
	number rather than an unresolved marker."""

	^ Enum ___grailNamespaceForClass: self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailNamespaceForClass: cls
	"""___grailMetaclassNamespace___'s body, with the class passed IN.

	Split out because the hook is a CLASSMETHOD, so it is found through the
	Smalltalk metaclass chain -- and a DATA-ROOTED enum's chain does not pass
	Enum.  ``class E(IntEnum)'' is rooted at AbstractPyInt, so ``IntEnum class''
	never reaches ``Enum class'' and the probe for this selector answered nil:
	every IntEnum and StrEnum body ran without an EnumDict.  IntEnum and StrEnum
	now carry their own one-line hook, exactly as they already carry their own
	___pyClassDefined___: for the same reason."""

	| enumDict ns |
	enumDict := Python @env0:at: #'EnumDict' otherwise: nil.
	enumDict isNil ifTrue: [^ nil].
	ns := enumDict @env1:__new__: (cls @env1:__name__).
	"The class being defined, so the namespace can resolve an ``auto()'' the way
	___grailBuildMembers: would: which _generate_next_value_ applies, and
	whether the class is Flag-natured or a StrEnum, are both questions about
	cls.  CPython's EnumType.__prepare__ hands the same thing over as
	``enum_dict._cls_name'' plus the generator taken off the first base."
	ns @env0:dynamicInstVarAt: #'_cls' put: cls.
	^ ns
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailNamespaceAutoValueFor: nameStr class: cls count: count lastValues: lastValues
	"""The value a bare ``auto()'' takes, chosen by exactly the rule
	___grailBuildMembers: applies: a user _generate_next_value_ wins, else a
	StrEnum yields the lowercased name, else a Flag-natured class takes the next
	power of two above the highest value so far and a plain enum the next
	integer.

	Called from EnumDict at ASSIGNMENT time, which is where CPython resolves.
	The builder keeps its own copy of the same choice because it still runs for
	every path that has no namespace -- the functional API, _convert_, and any
	class built without a class statement."""

	(Enum ___grailClassHasGnv: cls) ifTrue: [
		^ Enum ___grailGnvValueFor: cls name: nameStr
			count: count lastValues: (list @env0:withAll: lastValues)].
	(Enum ___grailIsStrEnumClass: cls) ifTrue: [^ nameStr @env0:asLowercase].
	(Enum ___grailIsFlagClass: cls) ifTrue: [^ Enum ___grailFlagAutoNext: lastValues].
	^ Enum ___grailPlainAutoNext: lastValues
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFindDataRepr: cls
	"CPython _find_data_repr_, whose answer a class keeps as _value_repr_ and
	Enum.__repr__ then applies to the value: ``v_repr = cls._value_repr_ or
	repr''.  Walks the bases for the first one that supplies a __repr__ and
	answers what to render the member's value with.

	Only ONE of CPython's outcomes differs from plainly repr-ing the value, so
	that is the only one named here:

	  #dataclass -- the __repr__ found is the one @dataclass GENERATED, which
	      CPython refuses to use.  It substitutes _dataclass_repr, printing
	      just the repr=True fields and no class name, so a member reads
	      ``<Creature.DOG: size='medium', legs=4>'' rather than
	      ``<Creature.DOG: CreatureDataMixin(size='medium', legs=4, tail=True)>''
	      -- the enum member IS the composite, so repeating the mixin's name
	      and the fields it hides would say it twice.

	  nil -- everything else, where Grail's ordinary repr dispatch already
	      produces CPython's answer: a hand-written __repr__ on the data type,
	      one inherited from further up (@dataclass(repr=False) over a base
	      that has one), or none at all, which leaves the default object repr.

	The walk starts at cls's SUPERCLASS because CPython walks the bases, and it
	stops at an enum base with nil for the same reason CPython returns
	``base._value_repr_'' there -- Grail's is always None.  That is what keeps
	a dataclass INSTANCE used as an ordinary member value (``class Plain(Enum):
	A = Free(1)'', bases just (Enum,)) printing its own full repr: the rule is
	about the enum's data TYPE, not about the value happening to be a
	dataclass.

	``In its own __dict__'' is two stores in Grail: a class-body ``def'' is a
	compiled method on that very class, while @dataclass writes its generated
	functions and __dataclass_params__ into the per-class ___dynInstVars___ holder."

	| walker |
	walker := cls @env0:superClass.
	[walker @env0:notNil] @env0:whileTrue: [
		(walker == PythonInstance or: [walker == Object]) ifTrue: [^ nil].
		(Enum ___grailIsEnumBase: walker) ifTrue: [^ nil].
		[ | holder ownRepr params |
		holder := ((walker @env0:class @env0:whichClassIncludesSelector: #___dynInstVars___
			environmentId: 1) notNil)
				ifTrue: [walker @env0:perform: #___dynInstVars___ env: 1]
				ifFalse: [nil].
		ownRepr := (holder @env0:notNil
			and: [([holder @env0:dynamicInstVarAt: #'__repr__']
				@env0:on: AbstractException do: [:e | e @env0:return: nil]) @env0:notNil])
			or: [(walker @env0:whichClassIncludesSelector: #'__repr__' environmentId: 1)
				== walker].
		ownRepr ifTrue: [
			params := holder @env0:isNil
				ifTrue: [nil]
				ifFalse: [[holder @env0:dynamicInstVarAt: #'__dataclass_params__']
					@env0:on: AbstractException do: [:e | e @env0:return: nil]].
			params @env0:isNil ifTrue: [^ nil].
			^ ((params @env1:___pyAttrLoad___: #'repr') == true)
				ifTrue: [#dataclass]
				ifFalse: [nil]] ] @env0:value.
		walker := walker @env0:superClass].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailDataclassRepr: aValue
	"CPython _dataclass_repr -- the substitute for a GENERATED dataclass
	__repr__:

	    ', '.join('%s=%r' % (k, getattr(self, k))
	              for k in dcf.keys() if dcf[k].repr)

	Field ORDER is the declaration order, which __dataclass_fields__ (an
	OrderedDict) already carries, and a field declared ``field(repr=False)'' is
	left out -- that is the whole point of preferring this over the generated
	__repr__, which prints every field and prefixes the mixin's name.

	Answers nil if the value cannot supply the fields, so the caller can fall
	back to an ordinary repr rather than let a repr raise."

	| dcf out |
	dcf := [aValue @env1:___pyAttrLoad___: #'__dataclass_fields__']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	dcf @env0:isNil ifTrue: [^ nil].
	^ [ out := OrderedCollection @env0:new.
		dcf @env0:keysAndValuesDo: [:k :fld |
			((fld @env1:___pyAttrLoad___: #'repr') == true) ifTrue: [ | v |
				v := aValue @env1:___pyAttrLoad___: k @env0:asString @env0:asSymbol.
				out @env0:add: k @env0:asString @env0:, '='
					@env0:, (Enum ___grailValueRepr: v)]].
		out @env0:inject: nil into: [:acc :each |
			acc @env0:isNil ifTrue: [each] ifFalse: [acc @env0:, ', ' @env0:, each]] ]
		@env0:on: AbstractException do: [:e | e @env0:return: nil]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailValueRepr: aValue
	"repr(aValue), for the ``<value> is not a valid <Cls>'' messages.

	CPython builds those with %r, and Smalltalk's printString diverges from
	Python's repr for everything but ints and strings: a tuple came out
	``atuple( 'Foo', atuple( 'pink', 'black'))'' where CPython says
	``('Foo', ('pink', 'black'))'', which is what test_extending matches on.
	Falls back to printString for a value with no usable __repr__."

	^ [aValue @env1:__repr__ @env0:asString]
		@env0:on: AbstractException do: [:e | aValue @env0:printString]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMissing: cls value: aValue
	"Run cls._missing_(aValue) (a user classmethod) and mirror CPython
	Enum.__new__'s handling of its result:
	  * a member of cls (or a resolvable Flag composite int) -> return it;
	  * None with no error -> raise the plain ``not a valid'' ValueError
	    (its __context__ stays None);
	  * a non-member, non-None value -> TypeError ``error in
	    <cls>._missing_: returned <r> instead of None or a valid member'',
	    with the ValueError chained as __context__;
	  * _missing_ itself raised -> re-raise it, chaining the ValueError as
	    __context__ unless it already IS a ValueError.
	The ``not a valid'' ValueError is built (not signaled) up front so it
	can serve as the chained context."

	| veExc result |
	veExc := ValueError @env0:new.
	veExc @env0:perform: #'__init__:' env: 1 withArguments: {
		(Enum ___grailValueRepr: aValue)
			@env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString }.
	result := [cls @env0:perform: #'_missing_:' env: 1 withArguments: { aValue }]
		@env0:on: AbstractException do: [:e |
			(e isKindOf: ValueError) @env0:ifFalse: [
				e @env0:dynamicInstVarAt: #'___context___' put: veExc].
			e @env0:pass].
	(result isKindOf: cls) ifTrue: [^ result].
	((result isKindOf: Integer) and: [self ___grailIsFlagClass: cls]) ifTrue: [
		| comp |
		comp := self ___grailFlagComposite: cls value: result.
		comp @env0:isNil ifFalse: [^ comp]].
	"CPython ``result is None'' -> the plain ValueError.  A Python _missing_
	returns the None SINGLETON (not Smalltalk nil), so test both."
	(result @env0:isNil or: [result == None]) ifTrue: [^ veExc @env0:signal].
	[ | tyExc |
	tyExc := TypeError @env0:new.
	tyExc @env0:perform: #'__init__:' env: 1 withArguments: {
		'error in ' @env0:, cls @env0:name @env0:asString @env0:, '._missing_: returned '
			@env0:, ([result @env1:__repr__ @env0:asString]
				@env0:on: AbstractException do: [:e | result @env0:printString])
			@env0:, ' instead of None or a valid member' }.
	tyExc @env0:dynamicInstVarAt: #'___context___' put: veExc.
	^ tyExc @env0:signal ] @env0:value
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
_missing_: value
	"CPython Enum._missing_ default: no match -> None.  A cooperative user
	override ending with ``return super()._missing_(value)'' resolves here
	instead of AttributeError ``super(): no parent method _missing_''
	(test_multiple_mixin_with_common_data_type / test_missing_exceptions_reset)."

	^ None
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsFlagClass: cls
	"True when cls is Flag-natured: chained under Flag/IntFlag, or an
	MI class whose C3 __mro__ includes Flag (``class E(int, Flag)``
	is AbstractPyInt-chained in Smalltalk)."

	((cls == Flag) or: [cls @env0:inheritsFrom: Flag]) ifTrue: [^ true].
	((cls == IntFlag) or: [cls @env0:inheritsFrom: IntFlag]) ifTrue: [^ true].
	^ [ (cls __mro__) @env0:includesIdentical: Flag ]
		@env0:on: Error do: [:e | e @env0:return: false]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsIntFlagClass: cls
	"True when cls is IntFlag-natured: chained under IntFlag, or an MI class
	whose C3 __mro__ includes IntFlag (``class E(int, IntFlag)'' is
	AbstractPyInt-chained in Smalltalk, so inheritsFrom: IntFlag is false)."

	((cls == IntFlag) or: [cls @env0:inheritsFrom: IntFlag]) ifTrue: [^ true].
	^ [ (cls __mro__) @env0:includesIdentical: IntFlag ]
		@env0:on: Error do: [:e | e @env0:return: false]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBoundaryMap
	"Per-SESSION map: flag class -> its explicit FlagBoundary override symbol,
	recorded when the class was defined with a ``boundary='' keyword
	(___grailSetClassBoundary:to:).  Absent -> the family default stands.
	SessionTemps-backed, like ___grailGlobalEnumMap."

	| s |
	s := SessionTemps @env0:current @env0:at: #GrailFlagBoundaries otherwise: nil.
	s @env0:isNil ifTrue: [
		s := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailFlagBoundaries put: s].
	^ s
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailSetClassBoundary: cls to: aBoundary
	"Record an explicit FlagBoundary override for cls (the ``boundary='' class
	keyword; ClassDefAst emits ``E ___grailSetClassBoundary___: enum.KEEP'').
	The machinery below speaks SYMBOLS -- #'STRICT' and friends -- so normalize
	to one of those and ignore anything else (family default stands).

	The NAME, not the string value.  enum.KEEP is a FlagBoundary member now, and
	a StrEnum member IS its value: ``KEEP asString'' is 'keep', which normalizes
	to #'keep' and matches nothing.  Its ``name'' is 'KEEP'.  A plain Symbol or
	string still works, which is what the internal callers and any older
	spelling pass.

	Read as ``name'' rather than ``_name_'': a StrEnum member is AbstractPyStr-
	rooted and does not inherit Enum's sunder accessors, so ``_name_'' raises
	there (a separate gap, not one this needs)."

	| sym |
	aBoundary @env0:isNil ifTrue: [^ cls].
	sym := (aBoundary isKindOf: Symbol)
		ifTrue: [aBoundary]
		ifFalse: [ | nm |
			nm := [aBoundary @env1:___pyAttrLoad___: #'name']
				@env0:on: AbstractException do: [:e | e @env0:return: nil].
			(nm @env0:notNil and: [nm @env0:isKindOf: CharacterCollection])
				ifTrue: [nm @env0:asString @env0:asSymbol]
				ifFalse: [aBoundary @env0:asString @env0:asSymbol]].
	(#(#'STRICT' #'CONFORM' #'EJECT' #'KEEP') @env0:includes: sym)
		ifTrue: [self ___grailBoundaryMap @env0:at: cls put: sym].
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBoundaryOverrideFor: cls
	"The explicit FlagBoundary override recorded for cls, or nil for none."

	^ self ___grailBoundaryMap @env0:at: cls otherwise: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagBoundaryOf: cls
	"The effective _boundary_ of a flag class: an explicit ``boundary='' class-
	keyword override if one was recorded, else the family DEFAULT -- KEEP for an
	IntFlag-natured class (out-of-range bits retained), STRICT for a plain Flag
	(out-of-range value raises)."

	| override |
	override := self ___grailBoundaryOverrideFor: cls.
	override @env0:notNil ifTrue: [^ override].
	^ (self ___grailIsIntFlagClass: cls) ifTrue: [#'KEEP'] ifFalse: [#'STRICT']
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBoundaryMemberFor: aSymbol
	"The FlagBoundary MEMBER for one of the four boundary symbols -- what
	``cls._boundary_'' answers, since that attribute is read by USER code and
	CPython's is a member (``Iron._boundary_ is FlagBoundary.CONFORM'').

	The machinery below keeps speaking Symbols: they are compared in a dozen
	places on the flag hot path, and a member would have to be unwrapped at
	every one.  This converts only at the boundary where the value escapes into
	Python -- the three _boundary_ accessors.

	Falls back to the symbol if enum is not importable or has no such member,
	so a flag class still reports SOMETHING rather than raising from an
	attribute read."

	| mod member |
	mod := [(Python @env0:at: #'enum') @env1:instance]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	mod @env0:isNil ifTrue: [^ aSymbol].
	member := [mod @env1:___pyAttrLoad___: aSymbol]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ member @env0:isNil ifTrue: [aSymbol] ifFalse: [member]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailHasUserMissing: cls
	"True only when cls (or an ancestor) defines a USER _missing_ classmethod --
	i.e. one NOT inherited from the base ``Enum class>>_missing_:'' default (which
	answers None).  A plain Flag's metaclass chains through Enum class and so
	INHERITS that default; an IntFlag's (AbstractPyInt-rooted) does not -- this
	test treats both the same, so a STRICT flag with no user override raises the
	``invalid value'' boundary error rather than falling through to _missing_."

	| dc |
	dc := cls @env0:class @env0:whichClassIncludesSelector: #'_missing_:'
		environmentId: 1.
	^ dc @env0:notNil and: [dc @env0:~~ Enum @env0:class]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsStrEnumClass: cls
	"True when cls is StrEnum-natured: chained under StrEnum, or an MI
	class whose C3 __mro__ includes StrEnum.  Drives auto() value
	generation (member name lowercased, CPython
	StrEnum._generate_next_value_)."

	| se |
	se := Python @env0:at: #'StrEnum' otherwise: nil.
	se == nil ifTrue: [^ false].
	((cls == se) or: [cls @env0:inheritsFrom: se]) ifTrue: [^ true].
	^ [ (cls __mro__) @env0:includesIdentical: se ]
		@env0:on: Error do: [:e | e @env0:return: false]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsReprEnumClass: cls
	"True when cls was declared with the ReprEnum base (``class E(date,
	ReprEnum)''): chained under ReprEnum, or an MI class whose C3 __mro__
	includes it.  ReprEnum members str/format as their VALUE, not ``Cls.name''
	-- the distinction the plain-Enum vs ReprEnum output rule turns on.  Grail's
	IntEnum/StrEnum are storage-rooted (not ReprEnum-chained) and get their
	value-str output another way, so they are deliberately NOT matched here."

	| re |
	re := Python @env0:at: #'ReprEnum' otherwise: nil.
	re == nil ifTrue: [^ false].
	((cls == re) or: [cls @env0:inheritsFrom: re]) ifTrue: [^ true].
	^ [ (cls __mro__) @env0:includesIdentical: re ]
		@env0:on: Error do: [:e | e @env0:return: false]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagComposite: cls value: intValue
	"The composite pseudo-member for intValue, or nil when its bits
	are not covered by the class's members (CPython STRICT-ish
	boundary).  Composites cache in byValue so repeated lookups are
	identical (A|B is A|B)."

	| rec byValue covered member |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ nil].
	byValue := rec @env0:at: 1.
	(byValue @env0:includesKey: intValue) ifTrue: [^ byValue @env0:at: intValue].
	intValue @env0:= 0 ifFalse: [
		covered := 0.
		(rec @env0:at: 3) @env0:do: [:m |
			| mv |
			mv := m @env0:dynamicInstVarAt: #value.
			(mv isKindOf: Integer) ifTrue: [
				((intValue @env0:bitAnd: mv) @env0:= mv) ifTrue: [
					covered := covered @env0:bitOr: mv]]].
		covered @env0:= intValue ifFalse: [^ nil]].
	member := cls @env0:basicNew.
	member @env0:dynamicInstVarAt: #value put: intValue.
	member @env0:dynamicInstVarAt: #'_value_' put: intValue.
	Enum ___grailNameComposite: member.
	byValue @env0:at: intValue put: member.
	^ member
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIntFlagValue: cls value: intValue
	"Resolve an IntFlag bitwise-op RESULT: the named member when intValue
	matches one, else a cached composite pseudo-member.  Unlike
	___grailFlagComposite: (Flag's STRICT-ish boundary -- uncovered bits
	answer nil and the lookup raises), IntFlag's default boundary is KEEP
	(CPython 3.11+): bits not covered by named members are retained, so
	``Perm.R | 8`` is <Perm.R|8: 12> where a plain Flag would raise.
	Composites cache in byValue so repeated ops answer the identical
	object (A|B is A|B).  A member-less record (shouldn't happen for an
	op on a member) falls back to the plain int."

	^ self ___grailIntFlagValue: cls value: intValue foreign: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIntFlagValue: cls value: intValue foreign: foreignCls
	"As ___grailIntFlagValue:value:, plus the flag class a CROSS-CLASS operand
	contributed (IntFlag >> ___foreignFlagClassOf___:, nil for the ordinary
	same-class case).  Recorded on the composite BEFORE it is named, because
	naming is what consumes it: the leftover bits render as a member of that
	class, which is how CPython's <Simple.SINGLE|<Iron.TWO: 2>: 3> comes out.

	Cached by VALUE, as CPython caches in _value2member_map_ -- and with the
	same consequence: Simple(3) built from a bare int and Simple(3) built from
	``Simple.SINGLE | Iron.TWO'' are one object, whichever was made first.
	CPython's setdefault collides identically (its Iron composite hashes and
	compares equal to 3)."

	| rec byValue member |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ intValue].
	byValue := rec @env0:at: 1.
	(byValue @env0:includesKey: intValue) ifTrue: [^ byValue @env0:at: intValue].
	member := cls @env0:basicNew.
	"The wrapped-int storage AND the enum member value are BOTH dynamic
	instVar #value on an AbstractPyInt-rooted class (see AbstractPyInt's
	class comment), so one store makes the composite a working int."
	member @env0:dynamicInstVarAt: #value put: intValue.
	member @env0:dynamicInstVarAt: #'_value_' put: intValue.
	(foreignCls @env0:notNil and: [foreignCls @env0:isKindOf: Behavior]) ifTrue: [
		member @env0:dynamicInstVarAt: #'___foreignFlagClass___' put: foreignCls].
	Enum ___grailNameComposite: member.
	byValue @env0:at: intValue put: member.
	^ member
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagMask: cls
	"OR of every CANONICAL (single-bit) member's int value."

	| rec mask |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ 0].
	mask := 0.
	(rec @env0:at: 3) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		(mv isKindOf: Integer) ifTrue: [mask := mask @env0:bitOr: mv]].
	^ mask
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagNamedMask: cls
	"OR of every NAMED member's int value -- canonical single-bit members PLUS
	explicit multi-bit ones (a mask member like ``MASK = 255'', which #199 makes
	non-canonical so ___grailFlagMask: no longer covers it).  This is the bit
	space an IntFlag KEEP invert complements within: ``~OpenAB.A'' is
	OpenAB(254) = 255 ^ 1, not B = 3 ^ 1.  byName (rec at: 2) also holds aliases,
	but ORing them is idempotent."

	| rec mask |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ 0].
	mask := 0.
	(rec @env0:at: 2) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		(mv isKindOf: Integer) ifTrue: [mask := mask @env0:bitOr: mv]].
	^ mask
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagSingleBitMask: cls
	"OR of only the SINGLE-BIT named members (CPython's _singles_mask_; its
	_flag_mask_ is ___grailFlagNamedMask: above, which counts multi-bit
	members too).  A
	STRICT/CONFORM Flag inverts within this, NOT the full mask that also
	covers a multi-bit member (``MASK = 255'' with only A=1/B=2): ~A is B, not
	254.  When every member is single-bit this equals ___grailFlagMask:, so a
	closed flag (MASK = A|B, itself a composite excluded from canonical
	members) is unaffected."

	| rec mask |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ 0].
	mask := 0.
	(rec @env0:at: 3) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		((mv isKindOf: Integer)
			and: [mv @env0:> 0
			and: [(mv @env0:bitAnd: (mv @env0:- 1)) @env0:= 0]])
				ifTrue: [mask := mask @env0:bitOr: mv]].
	^ mask
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailLookupName: cls name: aName
	"Color['NAME'] -> the member with that name."

	| rec |
	rec := self ___grailRecordFor: cls.
	(rec @env0:notNil and: [(rec @env0:at: 2) @env0:includesKey: aName])
		ifTrue: [^ (rec @env0:at: 2) @env0:at: aName].
	^ KeyError ___signal___: aName
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMembers: cls
	"Ordered CANONICAL members (for iteration / len / reversed): single-bit only
	for a flag."

	| rec |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ OrderedCollection @env0:new].
	^ rec @env0:at: 3
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailAllNamedMembers: cls
	"EVERY non-alias member in definition order -- canonical single-bit members
	PLUS multi-bit ``mask'' members and a zero member -- for the flag str/repr
	decomposition (a value's name lists every named member it subsumes, so
	``OnlyMask = 0x0f'' shows up; OldTestFlag.test_boundary).  Record slot 4; an
	older 3-slot record (functional builder, whose flags carry no multi-bit named
	members) falls back to the canonical list."

	| rec |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ OrderedCollection @env0:new].
	^ rec @env0:size @env0:>= 4 ifTrue: [rec @env0:at: 4] ifFalse: [rec @env0:at: 3]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailPlainAutoNext: lastValues
	"CPython's DEFAULT Enum._generate_next_value_ for a plain (non-flag)
	class: sorted(last_values).pop() + 1.  A last-values set that cannot be
	sorted (mixed non-comparable types, e.g. a str and an int) raises
	``unable to sort non-numeric values''; a non-numeric maximum (a bare str)
	raises ``unable to increment <repr>'' (test_auto_garbage_fail /
	_corrected_fail).  Empty -> start (1)."

	| maxVal |
	lastValues @env0:isEmpty ifTrue: [^ 1].
	maxVal := [(lastValues @env0:asSortedCollection) @env0:last]
		@env0:on: Error do: [:ex |
			^ TypeError ___signal___: 'unable to sort non-numeric values'].
	^ (maxVal isKindOf: Number)
		ifTrue: [maxVal @env0:+ 1]
		ifFalse: [TypeError ___signal___:
			'unable to increment ' @env0:, maxVal @env0:printString]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagAutoNext: lastValues
	"CPython's DEFAULT Flag._generate_next_value_: 2 ** (_high_bit(max(
	last_values)) + 1) -- i.e. the next power of two above the highest bit
	seen.  A non-integer maximum has no bit length and raises ``invalid flag
	value <repr>'' (OldTestFlag test_auto_number_garbage).  Empty, or a
	max <= 0, -> 1."

	| maxVal |
	lastValues @env0:isEmpty ifTrue: [^ 1].
	maxVal := [(lastValues @env0:asSortedCollection) @env0:last]
		@env0:on: Error do: [:ex |
			^ TypeError ___signal___: 'invalid flag value '
				@env0:, (lastValues @env0:detect: [:v | (v isKindOf: Integer) @env0:not])
					@env0:printString].
	(maxVal isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: 'invalid flag value ' @env0:, maxVal @env0:printString].
	maxVal @env0:<= 0 ifTrue: [^ 1].
	^ 1 @env0:bitShift: maxVal @env0:highBit
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailClassHasGnv: cls
	"True when cls (or an ancestor) provides a USER _generate_next_value_ --
	either a plain-def instance method (selector _generate_next_value_:_:_:,
	self-param is the NAME) or an @staticmethod class-side method (selector
	_generate_next_value_:_:_:_:, receiver is the class).  No base Enum/Flag/
	Str/ReprEnum class defines either, so a hit is always a user gnv.  Lets the
	functional builder invoke the same gnv the class-syntax builder does."

	| sm |
	(cls @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:'
			environmentId: 1) @env0:notNil ifTrue: [^ true].
	(cls @env0:class @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:_:'
			environmentId: 1) @env0:notNil ifTrue: [^ true].
	"A FUNCTIONAL gnv (Enum('et', {'_generate_next_value_':fn}, ...)) has no
	compiled selector; it lives in the session gnv-static store, inherited by
	subclasses.  Honour it only when the stored callable is actually invocable
	staticmethod-style (see ___grailStoredGnvInvocable:) -- a receiver-less
	plain-def BoundMethod is not, so those enums keep their default numbering."
	sm := self ___grailStoredGnvFor: cls.
	^ sm @env0:notNil and: [self ___grailStoredGnvInvocable: sm]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGnvValueFor: cls name: nameStr count: count lastValues: lv
	"Invoke cls's user _generate_next_value_(name, start=1, count, last_values)
	and answer its result.  Prefer the plain-def instance form; fall back to
	the @staticmethod class-side form.  Caller guards with ___grailClassHasGnv:,
	so one of the two selectors always resolves.  Mirrors the class-syntax
	builder's invocation in ___grailBuildMembers:."

	| gnvClass sm |
	gnvClass := cls @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:'
		environmentId: 1.
	gnvClass @env0:notNil ifTrue: [
		^ (UnboundMethod definingClass: gnvClass selector: #'_generate_next_value_')
			value: { nameStr. 1. count. lv }
			value: KeyValueDictionary @env0:new].
	(cls @env0:class @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:_:'
		environmentId: 1) @env0:notNil ifTrue: [
		^ cls @env0:perform: #'_generate_next_value_:_:_:_:' env: 1
			withArguments: { nameStr. 1. count. lv }].
	"Functional gnv: invoke the stored staticmethod with the four positional
	args (name, start=1, count, last_values) -- name is the FIRST arg, not a
	receiver (PyStaticMethod>>value:value: does not bind).  ___grailClassHasGnv:
	guarantees the stored callable is invocable before we get here."
	sm := self ___grailStoredGnvFor: cls.
	sm @env0:notNil ifTrue: [
		^ sm value: { nameStr. 1. count. lv } value: nil].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailEnumTagFor: cls
	"CPython's class-repr tag -- ``<flag 'X'>'' for a Flag subclass,
	``<enum 'X'>'' otherwise.  Phrases the ``cannot extend'' TypeError."

	^ ((Enum ___grailIsFlagClass: cls)
		ifTrue: ['<flag ''']
		ifFalse: ['<enum '''])
			@env0:, cls @env0:name @env0:asString @env0:, '''>'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailExtendedMemberBase: cls
	"CPython _check_for_existing_members_: an enum that already defines
	members is FINAL -- any subclass, whether or not it adds members, is
	illegal.  Answer the first enum ancestor of cls carrying canonical
	members, or nil when cls extends only member-less enums (a method-only
	or mixin base is fine -- test_extending3).  Checks the registered MI
	bases first (a member-bearing secondary base is merged out of the
	primary Smalltalk chain -- ``EvenMoreColor(Color, IntEnum)''), then the
	primary superclass chain (single inheritance -- ``MoreColor(Color)'')."

	| bases |
	bases := [(Python @env0:at: #importlib) @env0:___pythonBasesOf___: cls]
		@env0:on: AbstractException do: [:e | nil].
	(bases @env0:isNil or: [bases @env0:isEmpty]) ifTrue: [
		bases := cls @env0:superclass @env0:isNil
			ifTrue: [#()]
			ifFalse: [Array @env0:with: cls @env0:superclass]].
	bases @env0:do: [:b | | walker |
		walker := b.
		[(walker ~~ nil)
			and: [(walker ~~ Enum) and: [walker ~~ Object]]] @env0:whileTrue: [
			(walker ~~ cls and: [(Enum ___grailMembers: walker) @env0:notEmpty])
				ifTrue: [^ walker].
			walker := walker @env0:superclass]].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsEnumBase: b
	"True when base b is an ENUM class.  Enum's own subclasses answer
	inheritsFrom: Enum, but IntEnum/IntFlag/StrEnum are rooted on their DATA
	storage (AbstractPyInt/Str) and do NOT inherit Enum on the Smalltalk chain,
	so probe those leaf roots too -- the same shape as the issubclass/isinstance
	enum-family widening.  Distinguishes an enum base (IntEnum) from a plain data
	type (int) even though both inherit Integer."

	^ (b == Enum) or: [(b @env0:inheritsFrom: Enum)
		or: [(b == IntEnum) or: [(b @env0:inheritsFrom: IntEnum)
		or: [(b == IntFlag) or: [(b @env0:inheritsFrom: IntFlag)
		or: [(b == StrEnum) or: [(b @env0:inheritsFrom: StrEnum)
		or: [(Enum ___grailRecordFor: b) @env0:notNil]]]]]]]]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsDataTypeBase: b
	"True when base b contributes instance STORAGE to an enum -- a data type in
	CPython's _find_data_type_ sense: rooted at int/float/str storage, or
	carrying its own constructor (date/time via ___new__:kw:).  The universal
	roots (object/PythonInstance/Object), ENUM classes (IntEnum inherits Integer
	but is an enum, not a data-type mixin), and pure behaviour mixins (methods
	only, no storage) are NOT data types."

	(b @env0:isKindOf: Behavior) ifFalse: [^ false].
	(self ___grailIsEnumBase: b) ifTrue: [^ false].
	((b == PythonInstance) or: [(b == Object)
		or: [b == (Python @env0:at: #object otherwise: nil)]]) ifTrue: [^ false].
	^ (b == Integer) or: [(b @env0:inheritsFrom: Integer)
		or: [(b == Float) or: [(b @env0:inheritsFrom: Float)
		or: [(b == CharacterCollection) or: [(b @env0:inheritsFrom: CharacterCollection)
		or: [(b @env0:whichClassIncludesSelector: #'___new__:kw:' environmentId: 1) @env0:notNil]]]]]]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailValidateBases: cls
	"CPython _get_mixins_ / _find_data_type_ ordering rules, enforced at class
	creation: (1) at most ONE data type may be mixed in -- ``class E(str, int,
	Enum)'' raises ``too many data types'' (test_too_many_data_types); (2) a
	data type base must come BEFORE the Enum base -- ``class E(Enum, str)''
	raises (test_wrong_inheritance_order).  Uses the registered MI bases IN
	ORDER; single-inheritance enums (``class E(Enum)'' / ``class E(IntEnum)''),
	which have no MI record or one base, can violate neither rule -> no-op."

	| bases dataTypes enumSeen |
	bases := [(Python @env0:at: #importlib) @env0:___pythonBasesOf___: cls]
		@env0:on: AbstractException do: [:e | nil].
	(bases @env0:isNil or: [bases @env0:size @env0:< 2]) ifTrue: [^ self].
	dataTypes := OrderedCollection @env0:new.
	enumSeen := false.
	bases @env0:do: [:b |
		(self ___grailIsEnumBase: b)
			ifTrue: [enumSeen := true]
			ifFalse: [
				(self ___grailIsDataTypeBase: b) ifTrue: [
					"A data type mixed in AFTER the Enum base is the wrong order."
					enumSeen ifTrue: [
						^ TypeError ___signal___: (Enum ___grailEnumTagFor: cls)
							@env0:, ' cannot extend ' @env0:, b @env0:name @env0:asString].
					dataTypes @env0:add: b]]].
	dataTypes @env0:size @env0:> 1 ifTrue: [
		^ TypeError ___signal___: 'too many data types for '''
			@env0:, cls @env0:name @env0:asString @env0:, ''': '
			@env0:, (dataTypes @env0:collect: [:d | d @env0:name @env0:asString]) @env0:printString].
	^ self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailOperandTypeName: value
	"The name CPython would print for this operand in a TypeError.  A plain
	Smalltalk Integer must read as ``int'', not ``SmallInteger'' -- the message
	is compared verbatim by test_enum's assertRaisesRegex and read by users.
	builtins already owns the kernel-name mapping; this only reaches it, and
	falls back to the Smalltalk class name if builtins is not resolvable from
	here (this source is copied onto MI flag classes)."

	^ [(Python @env0:at: #bytes) ___pyTypeNameOf___: value]
		@env0:on: AbstractException
		do: [:e | e @env0:return: value @env0:class @env0:name @env0:asString]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMemberTypeFor: cls
	"The mix-in data type of enum class cls (Integer/Float/a data base/object),
	the cls-parameterized form of Enum class>>_member_type_.  A mixed enum's
	metaclass does not inherit the Grail-Class Attrs ``_member_type_'' accessor,
	so the metaclass hook (___grailBuildMembers:) can't just send it to cls.

	Two passes: first the Smalltalk storage chain (int/str/float storage bases,
	whose data type IS the superclass); then, for an MI enum whose storage base
	is Enum but which mixes in a FOREIGN data type (``class E(date, Enum)'' --
	date is merged as a SECONDARY base, absent from cls's superclass chain), the
	registered C3 MRO.  object when there is no mix-in."

	| walker |
	walker := cls.
	[walker ~~ nil] @env0:whileTrue: [
		walker == Enum ifTrue: [^ self ___grailMixinFromMro: cls].
		walker == IntEnum ifTrue: [^ Integer].
		walker == AbstractPyInt ifTrue: [^ Integer].
		walker == AbstractPyFloat ifTrue: [^ Float].
		((walker == PythonInstance) or: [walker == Object])
			ifTrue: [^ self ___grailMixinFromMro: cls].
		((Enum ___grailRecordFor: walker) @env0:isNil
			and: [(walker @env0:inheritsFrom: Enum) not
			and: [walker ~~ cls]]) ifTrue: [^ walker].
		walker := walker @env0:superclass].
	^ self ___grailMixinFromMro: cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMixinFromMro: cls
	"Scan cls's registered C3 MRO for a mixed-in data type the Smalltalk
	storage chain missed: the first ancestor that is neither an Enum class nor
	a universal root (object/PythonInstance/Object) nor another enum in the
	build.  ``class E(date, Enum)'' picks Enum as the storage base and merges
	date as a SECONDARY base, so date is absent from cls superclass yet present
	in the MRO.  object when there is no such mix-in (a plain Enum/Flag)."

	| mro |
	mro := [(Python @env0:at: #importlib) @env0:___mroOf___: cls]
		@env0:on: AbstractException do: [:e | #()].
	mro @env0:do: [:c |
		((c ~~ cls)
			and: [(c == Enum) @env0:not
			and: [(c == PythonInstance) @env0:not
			and: [(c == Object) @env0:not
			and: [(c == object) @env0:not
			and: [(c @env0:inheritsFrom: Enum) @env0:not
			and: [(Enum ___grailRecordFor: c) @env0:isNil]]]]]])
				ifTrue: [
					c == AbstractPyInt ifTrue: [^ Integer].
					c == AbstractPyFloat ifTrue: [^ Float].
					^ c]].
	^ object
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailStrBuiltin
	"The object the Python name ``str'' evaluates to -- now the CLASS.

	This used to mint a BoundMethod on builtins>>str:, because that fast-path
	method is what the bare name ``str'' resolved to
	(NameAst>>isFastPathBuiltinName:) and the concrete Unicode class did not
	implement Python's str().  Both halves have changed: builtins>>str: is gone,
	so the name resolves to the class the way ``int'' and ``list'' already did,
	and str.gs's __new__: now carries the str() semantics for a canonical
	receiver.  Minting the old handle would answer a BoundMethod on a selector
	that no longer exists, and since member-value construction is best-effort
	the failure was SILENT: ``class E(str, Enum): june = 1'' kept 1 as its
	_value_ instead of '1'.

	The name is kept for its call sites, which want ``whatever str() is''."

	^ Python @env0:at: #str
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsStringType: mt
	"True when mt is one of Grail's string storage classes.  Unicode7 vs
	Unicode32 is a storage detail, not a Python type difference."

	^ (mt == CharacterCollection)
		or: [(mt @env0:isKindOf: Behavior)
			and: [mt @env0:inheritsFrom: CharacterCollection]]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailStrEnumValueFor: rawValue
	"""CPython StrEnum.__new__ -- ``values must already be of type `str`'':

	    class GoodStrEnum(StrEnum):
	        one = '1'
	        three = b'3', 'ascii'               -- str(b'3', 'ascii') == '3'
	    class Bad(StrEnum):
	        one = 1                             -- TypeError, 1 is not a string

	A member value is the argument list to str(), so a TUPLE value is
	str(*values) -- which is how the bytes/encoding/errors spellings above are
	written -- and each argument has its own complaint.  Grail had none of this:
	the value was stored as given, so ``three'' became the literal string
	'atuple' and every rejected spelling defined quietly.

	Only for a StrEnum-natured class with no __new__ of its own.  ``class
	CustomStrEnum(str, Enum)'' is NOT one, and CPython's messages there come
	from str() itself (``argument 2 must be str, not ...''), which is the
	distinction test_strenum and test_custom_strenum are drawing between their
	otherwise identical bodies."""

	| tupleClass vals bad |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	vals := (rawValue isKindOf: tupleClass)
		ifTrue: [rawValue @env0:asArray]
		ifFalse: [Array @env0:with: rawValue].
	(vals @env0:size @env0:> 3) ifTrue: [
		^ TypeError ___signal___: 'too many arguments for str(): '
			@env0:, (Enum ___grailValueRepr: rawValue)].
	bad := [:i | (Enum ___grailIsStringType: (vals @env0:at: i) @env0:class) @env0:not].
	((vals @env0:size @env0:= 1) and: [bad @env0:value: 1]) ifTrue: [
		^ TypeError ___signal___: (Enum ___grailValueRepr: (vals @env0:at: 1))
			@env0:, ' is not a string'].
	((vals @env0:size @env0:>= 2) and: [bad @env0:value: 2]) ifTrue: [
		^ TypeError ___signal___: 'encoding must be a string, not '
			@env0:, (Enum ___grailValueRepr: (vals @env0:at: 2))].
	((vals @env0:size @env0:= 3) and: [bad @env0:value: 3]) ifTrue: [
		^ TypeError ___signal___: 'errors must be a string, not '
			@env0:, (Enum ___grailValueRepr: (vals @env0:at: 3))].
	"str(*values).  A single string argument is already the value.  The
	bytes+encoding spellings are str(bytes, encoding[, errors]), which is
	bytes.decode(encoding[, errors]) -- reached through the value's own
	``decode'' so the decoding is the one Grail already implements rather than a
	second copy of it here.  (The ``str'' handle itself takes one argument: it
	is a BoundMethod, not a class, because Grail has no single str class.)"
	(vals @env0:size @env0:= 1) ifTrue: [^ vals @env0:at: 1].
	^ ((vals @env0:at: 1) @env1:___pyAttrLoad___: #'decode')
		@env1:value: (vals @env0:copyFrom: 2 to: vals @env0:size) value: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailNormalizeMemberType: aType
	"Map a concrete string storage class onto Grail's ``str'' handle for the
	PYTHON-VISIBLE _member_type_.

	CPython's contract is an identity one -- ``E._member_type_ is str''.  The
	int and float cases already satisfy it (Integer IS int, Float IS float),
	but the string walk answered Unicode7 / Unicode32, so the str case was
	False.  test_enum's shared fixture gates on exactly that identity to decide
	a mixed enum's expected values.

	Only the visible accessor normalizes: the internal walk
	(___grailMemberTypeFor:) keeps answering the Smalltalk class, which its
	isKindOf: and member-construction callers need."

	(Enum ___grailIsStringType: aType) ifTrue: [^ Enum ___grailStrBuiltin].
	^ aType
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailValueMixinFor: cls
	"The type whose constructor builds cls's member VALUES -- CPython's
	member_type in ``new_member._value_ = member_type(*args)'' -- or nil when
	the values stay raw.

	Two cases, deliberately kept apart:

	  * an Enum-ROOTED class mixing in a FOREIGN data type (``class E(date,
	    Enum)'').  Unchanged, long-standing behaviour.

	  * a STORAGE-rooted class (``class E(str, Enum)'', int, float), which used
	    to be excluded entirely and so kept the raw class-body value as its
	    _value_ -- 1 rather than '1'.

	The storage case admits ONLY the three primitive data types Grail models.
	___grailMemberTypeFor: answers the first non-enum ancestor, which for a
	PLAIN mixin is not a data type at all: ``class _EnumSuperClass(metaclass=
	EnumMeta)'' then ``class E(_EnumSuperClass, Enum)'' answers
	_EnumSuperClass, and constructing THAT with the member's value produced
	``<E.A: <_EnumSuperClass object>>'' instead of ``<E.A: 1>'' -- 24 tests
	across every flavour of the shared fixture (test_multiple_superclasses_repr).
	CPython's _get_mixins_ makes the same distinction: a base with no usable
	__new__ is a mixin, not the member type."

	| mt dt |
	"Two layers, and deliberately WIDENING: every answer the storage walk used to
	give is kept, and CPython's member_type only fills in where it gave none.

	The storage walk (___grailMemberTypeFor: plus the Integer/Float/string
	allowlist) is what int/str/float enums have always used, and it stays
	authoritative for them -- routing StrEnum through the general path instead
	changed which class construction went through and broke test_shadowed_attr.

	The allowlist exists because ___grailMemberTypeFor: answers the first
	non-enum ancestor, which for a PLAIN mixin is not a data type at all;
	constructing through one produced ``<E.A: <_EnumSuperClass object>>'' across
	24 fixtures.  But it also excluded genuine data types it was never meant to
	-- every user subclass of a primitive, and every dataclass or namedtuple
	mixin:

	    class HexInt(int):
	        def __repr__(self): return hex(self)
	    class MyEnum(HexInt, enum.Enum): A = 1

	left _value_ a plain 1, so Enum's repr rendered <MyEnum.A: 1> where CPython
	gives <MyEnum.A: 0x1>: the value has to BE a HexInt for its own repr to show
	through.  ___grailFindDataType: is CPython's _find_data_type_, which admits
	those and still rules out the plain mixins the allowlist was guarding
	against (a chain that never reaches a constructor contributes nothing)."

	"CPython's member_type is ``_find_data_type_(bases) or object'', and when it
	is object the value is stored RAW -- ``new_member._value_ = value'' rather
	than ``member_type(*args)''.  So a chain that reaches no constructor settles
	the question before either layer below is consulted: neither the
	first-non-enum-ancestor walk nor the allowlist may resurrect it.

	The layers were both reached through ``cls inheritsFrom: Enum'', which is
	true whenever the storage base ended up being the enum -- exactly the shape
	``class CoolColor(StrMixin, SomeEnum, Enum)'' takes, since a plain mixin is
	no storage base.  ___grailMemberTypeFor: then answered StrMixin, and
	constructing through it made ``CoolColor.RED.value'' a <StrMixin object>
	rather than 1 (test_multiple_mixin)."
	dt := Enum ___grailFindDataType: cls.
	(dt @env0:isNil or: [dt == object]) ifTrue: [^ nil].
	mt := Enum ___grailMemberTypeFor: cls.
	(mt @env0:notNil and: [mt ~~ object]) ifTrue: [
		(cls @env0:inheritsFrom: Enum) ifTrue: [^ mt].
		((mt == Integer)
			or: [(mt == Float)
			or: [Enum ___grailIsStringType: mt]]) ifTrue: [^ mt]].
	"Only a data type WRITTEN IN PYTHON widens.  _find_data_type_ can also answer
	one of Grail's own storage roots -- a plain ``class Book(StrEnum)'' resolves
	to AbstractPyStr -- and those are not Python data types at all, they are how
	Grail stores str/int/float.  The member already IS the data type there, and
	constructing through the boxed root instead produced an AbstractPyStr where
	a plain str belonged, so a member stopped shadowing correctly:
	``Book.author.title'' answered the member Book.title rather than str's title
	method (test_shadowed_attr).  A user class -- HexInt, a @dataclass, a
	namedtuple -- is not in the symbol list and does widen."
	(Enum ___grailIsGrailDefinedType: dt) ifTrue: [^ nil].
	^ dt
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsInternalClass: aValue inClassNamed: clsName
	"CPython _is_internal_class: is aValue a class DEFINED IN the body of the
	enum named clsName, as opposed to one merely named there?

	    class Outer(Enum):
	        class Inner(Enum): ...      -- internal, NOT a member (3.13)

	    class MyTypes(Enum):
	        i = int                     -- named, IS a member (value is int)

	Both bind a name to a class, and nothing about the class itself
	distinguishes them -- so CPython reads __qualname__, which a nested
	definition alone gets prefixed with its enclosing class: ``Outer.Inner''
	against a bare ``Inner''.  The endsWith test covers a nesting deeper than
	one level, where the qualname carries the whole chain
	(``Whatever.Outer.Inner'').

	CPython comments that it deliberately avoids ``re'' here, since re imports
	enum; the string work is spelled out for the same reason."

	| qualname clsname sPattern ePattern qs es |
	(aValue isKindOf: Class) ifFalse: [^ false].
	qualname := [(aValue @env1:___pyAttrLoad___: #'__qualname__') @env0:asString]
		@env0:on: AbstractException do: [:e | e @env0:return: ''].
	clsname := [(aValue @env1:___pyAttrLoad___: #'__name__') @env0:asString]
		@env0:on: AbstractException do: [:e | e @env0:return: ''].
	clsname @env0:isEmpty ifTrue: [^ false].
	sPattern := clsName @env0:, '.' @env0:, clsname.
	qualname @env0:= sPattern ifTrue: [^ true].
	ePattern := '.' @env0:, sPattern.
	qs := qualname @env0:size.
	es := ePattern @env0:size.
	^ (qs @env0:>= es)
		and: [(qualname @env0:copyFrom: qs @env0:- es @env0:+ 1 to: qs) @env0:= ePattern]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailIsGrailDefinedType: aClass
	"True when aClass is one of Grail's OWN types -- a built-in storage or data
	class -- rather than a class written in Python.

	The discriminator is the symbol list.  Grail's built-ins are filed into the
	``Python'' dictionary (AbstractPyInt, AbstractPyStr, PyDate, Enum, ...) or
	are kernel classes named in the user's symbol list (Integer, Float,
	CharacterCollection and its Unicode leaves); Class.gs's ___subclass___
	creates every Python-level class with ``inDictionary: nil'', so a user
	class is reachable only through its module namespace and is never found
	here.  Being an IDENTITY test it also cannot be fooled by a user class that
	merely reuses a built-in name.

	Used to keep ___grailFindMemberNew: away from the storage constructors,
	which do publish ``___new__:kw:'' but whose member construction Grail
	already performs through ___grailCoerceMemberValue:toMemberType:.

	Deliberately NOT an inheritance test: ``inheritsFrom: Number'' looks like
	the same idea but matches every user int subclass too -- NamedInt is
	AbstractPyInt-rooted -- which excluded the exact case this exists to admit."

	| named |
	aClass @env0:isNil ifTrue: [^ false].
	named := [System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: aClass @env0:name @env0:asSymbol]
			@env0:on: AbstractException do: [:e | nil].
	^ named == aClass
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFindMemberNew: cls
	"CPython _find_new_, clause 2: when the class body defines no __new__ of
	its own, the member constructor is ``member_type.__new__'' -- the DATA
	MIXIN's -- and members are then built as member_type.__new__(cls, *args).

	    class NamedInt(int):
	        def __new__(cls, *args):
	            name, *args = args
	            self = int.__new__(cls, *args)
	            self._intname = name
	            return self

	    class NEI(NamedInt, Enum):
	        x = ('the-x', 1)

	Grail only ever honoured a __new__ defined ON cls (plus, narrowly, an
	inherited ENUM one), so NEI's members were bare allocations holding the
	raw tuple: _value_ was ('the-x', 1) instead of 1, and _intname was never
	set at all -- six test_enum cases, all of them pickle round-trips that
	first have to build the member.

	Answers the defining class to construct through, or nil.

	Two exclusions, both load-bearing:

	  * a GRAIL-DEFINED type (___grailIsGrailDefinedType:).  AbstractPyInt and
	    friends do publish ___new__:kw:, but ``class E(int, Enum)'' already
	    gets its value through ___grailCoerceMemberValue:toMemberType:;
	    routing it here as well would double-construct every int/str/float
	    enum in the suite.
	  * an ENUM class.  Enum.__new__ is the by-value LOOKUP, which CPython
	    likewise excludes from _find_new_'s candidate set -- running it during
	    construction is the ``do not use super().__new__'' misuse that
	    Enum>>___new__:kw: exists to reject (test_bad_new_super).  The
	    inherited-enum case keeps its own separate rule at the call site
	    (test_multiple_mixin_inherited)."

	| mt owner |
	mt := Enum ___grailMemberTypeFor: cls.
	(mt @env0:isNil or: [mt == object]) ifTrue: [^ nil].
	(Enum ___grailIsGrailDefinedType: mt) ifTrue: [^ nil].
	owner := mt @env0:whichClassIncludesSelector: #'___new__:kw:' environmentId: 1.
	owner @env0:isNil ifTrue: [^ nil].
	(Enum ___grailIsGrailDefinedType: owner) ifTrue: [^ nil].
	((owner == Enum) or: [owner @env0:inheritsFrom: Enum]) ifTrue: [^ nil].
	^ owner
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailCoerceMemberValue: rawValue toMemberType: mt
	"CPython EnumType.__new__: when the enum mixes in a data type,
	``new_member._value_ = member_type(*args)''.  So ``class E(str, Enum):
	june = 1'' has _value_ == '1', not 1.

	Grail applied this only to a FOREIGN mixin (``class E(date, Enum)'') and
	left int/str/float STORAGE enums holding the raw class-body value, on the
	grounds that the member already IS the data type.  That is true of the
	MEMBER -- the str-storage branch below already gives it str(value) as its
	character content -- but not of its _value_, which stayed the int.

	Answer rawValue unchanged when there is no mix-in or the value already has
	the mixed-in type.  Construction is best-effort (see
	___grailConstructMemberValue:args:): a value the type cannot accept keeps
	its raw form rather than breaking the class definition."

	| ctor |
	(mt @env0:isNil or: [mt == object]) ifTrue: [^ rawValue].
	(Enum ___grailIsStringType: mt)
		ifTrue: [
			"Already a string in any width -- nothing to do.  Otherwise go
			through the str BUILTIN: the concrete Unicode class does not
			implement Python's str()."
			(rawValue isKindOf: CharacterCollection) ifTrue: [^ rawValue].
			ctor := Enum ___grailStrBuiltin]
		ifFalse: [
			(rawValue isKindOf: mt) ifTrue: [^ rawValue].
			ctor := mt].
	^ Enum ___grailConstructMemberValue: ctor args: rawValue
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailConstructMemberValue: memberType args: rawValue
	"Build the mixed-in data value member_type(*args): a scalar rawValue -> a
	1-arg call, a tuple -> its elements spread, mirroring CPython's
	member_type.__new__(cls, *args).  memberType is any CALLABLE -- a class, or
	the ``str'' builtin handle ___grailCoerceMemberValue: passes for string
	storage -- since value:value: is the universal call protocol.  ``class E(date, Enum): d = 2023, 12, 1''
	yields date(2023, 12, 1) as the member's _value_ (Grail stores it as #value
	rather than making the member itself a date, since the storage base is
	Enum).  Best-effort: on any failure keep the raw class-body value."

	| args |
	args := Enum ___grailSpreadArgs: rawValue.
	"str(bytes, encoding[, errors]) -- the ONLY multi-argument spelling of str(),
	and the reason a member value can legitimately be a tuple whose first element
	is bytes:

	    class GoodStrEnum(str, Enum):
	        three = b'3', 'ascii'          -- '3'

	Two things blocked it.  The ``str'' handle is a BoundMethod of fixed arity 1,
	so the call could not be made at all; and the best-effort guard below then
	kept the raw tuple, so the member's value silently became a tuple.  Route it
	through str's own varargs entry, and let the constructor's TypeError REACH
	THE CALLER, which is what CPython does -- ``two = b'2', sys.getdefaultencoding''
	is a TypeError out of the class statement (test_custom_strenum).

	Keyed on the first element being BYTES, not on argument count, because a
	multi-element tuple usually means something else entirely: it is the argument
	list to the class's own __new__ (``key_type = 'An$(Bn)', 0''), which must not
	be handed to str() -- doing so answered ``decoding str is not supported'' and
	displaced the _value_ complaint test_missing_value_error waits for."
	((memberType == Enum ___grailStrBuiltin)
		and: [args @env0:size @env0:> 1
		and: [(args @env0:at: 1) isKindOf: ByteArray]]) ifTrue: [
			"Sent to Unicode7, not CharacterCollection: the decode allocates
			through ``self'', and CharacterCollection is abstract (``a method has
			been invoked in the abstract superclass ... #new:'').  Unicode7 is the
			canonical narrow str class str.gs itself allocates."
			^ Unicode7 @env0:perform: #'_str:kw:' env: 1
				withArguments: { args. KeyValueDictionary @env0:new }].
	^ [memberType @env0:perform: #'value:value:' env: 1
		withArguments: { args. KeyValueDictionary @env0:new }]
		@env0:on: AbstractException do: [:e | rawValue]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailConstructMemberValueStrict: memberType args: rawValue
	"member_type(*args), letting a failure PROPAGATE.

	___grailConstructMemberValue:args: keeps the raw class-body value when the
	type cannot accept it -- right for a coercion that is only refining an
	already-usable value.  The __new__ path needs the opposite: there the member
	has NO value yet, so a failure means the definition is broken and CPython
	reports it as ``_value_ not set in __new__''."

	| args |
	args := Enum ___grailSpreadArgs: rawValue.
	^ memberType @env0:perform: #'value:value:' env: 1
		withArguments: { args. KeyValueDictionary @env0:new }
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagComponents: aMember
	"The canonical SINGLE-BIT component members of a flag member, in definition
	order: Color.PURPLE -> (RED, BLUE), Color.BLACK -> ().  A multi-bit member is
	decomposed, never yielded whole (CPython 3.11+).

	Storage-agnostic -- it reads the #value dynInstVar -- so one copy serves both
	Flag (Enum-rooted) and IntFlag (AbstractPyInt-rooted, which cannot inherit
	Flag), and serves __len__ as well as __iter__.  The walk was already written
	out twice; __len__ would have made it four."

	| v parts |
	v := aMember @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(v isKindOf: Integer) ifTrue: [
		(Enum ___grailMembers: aMember @env0:class) @env0:do: [:mm | | mv |
			mv := mm @env0:dynamicInstVarAt: #value.
			((mv isKindOf: Integer)
				and: [mv @env0:~= 0
				and: [(mv @env0:bitAnd: (mv @env0:- 1)) @env0:= 0
				and: [(v @env0:bitAnd: mv) @env0:= mv]]]) ifTrue: [
				parts @env0:add: mm]]].
	^ parts
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailNameComposite: aMember
	"Stamp a freshly-built composite pseudo-member's name.

	CPython 3.11+ names a composite after the members it subsumes -- ``RED|GREEN''
	-- and that name is REACHABLE: a flag whose __str__ answers self._name_ prints
	it, which is exactly what OldTestIntFlag test_format asserts (``format(NewPerm.R
	| Perm.X, '')'' is 'R|X').  Grail stored None, so that __str__ printed 'None'
	while the built-in repr -- which computes the same join separately -- looked
	right.

	The pieces come from the decomposition the repr already uses, so a KEEP
	composite carrying uncovered bits is named the way it is printed (R|8).  A
	value that decomposes to NOTHING -- zero, with no zero-valued member -- keeps
	None, matching CPython's ``<Color: 0>'' and Grail's own repr for it.  None,
	not nil: nil is the project's ABSENT marker and would fall through to a
	method wrap."

	| pieces nm |
	pieces := [Enum ___grailFlagDecomposePieces: aMember]
		@env0:on: AbstractException do: [:e | nil].
	nm := (pieces @env0:isNil or: [pieces @env0:isEmpty])
		ifTrue: [None]
		ifFalse: [pieces @env0:inject: nil into: [:acc :p |
			acc @env0:isNil ifTrue: [p @env0:asString]
				ifFalse: [acc @env0:, '|' @env0:, p @env0:asString]]].
	aMember @env0:dynamicInstVarAt: #name put: nm.
	aMember @env0:dynamicInstVarAt: #'_name_' put: nm.
	"An explicit marker, because the NAME can no longer answer ``is this a
	composite?''.  ___grailGlobalMemberRepr: still has to decompose -- it prefixes
	each named piece with the module (module.LOW_BEAM_K|module.FOG_K|8) -- and it
	used the absent name as the test; once composites carry one it printed
	``module.LOW_BEAM_K|FOG_K'' instead (test_global_repr_keep /
	test_global_repr_conform1).  Every other name-absent test in this file wants
	precisely the string now stored, so those short-circuit on it and are left
	alone."
	aMember @env0:dynamicInstVarAt: #'___grailIsComposite' put: true.
	^ aMember
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailCompositeNameFor: m
	"Composite/plain name for a (possibly flag) member: 'first|third' for a
	composite, the plain name for a named member, the value's printString when
	no named bit covers it.  Storage-agnostic (reads #name/#value ___dynInstVars___),
	so it works on the int-rooted members of a mixed flag (``class E(int,
	Flag)``), which do NOT inherit Flag>>___compositeName___."

	| cls nm v parts |
	cls := m @env0:class.
	nm := m @env0:dynamicInstVarAt: #name.
	(nm @env0:isNil or: [nm == None]) ifFalse: [^ nm @env0:asString].
	v := m @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(Enum ___grailAllNamedMembers: cls) @env0:do: [:mm | | mv |
		mv := mm @env0:dynamicInstVarAt: #value.
		((mv isKindOf: Integer)
			and: [mv @env0:~= 0
			and: [(v @env0:bitAnd: mv) @env0:= mv]]) ifTrue: [
			parts @env0:add: (mm @env0:dynamicInstVarAt: #name) @env0:asString]].
	parts @env0:isEmpty ifTrue: [^ v @env0:printString].
	^ parts @env0:inject: nil into: [:acc :p |
		acc @env0:isNil ifTrue: [p] ifFalse: [acc @env0:, '|' @env0:, p]]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagDecomposePieces: m
	"The pieces a flag member's INT value decomposes into, in definition order:
	the NAME (a String) of every named member it subsumes, then -- for a KEEP
	composite -- the leftover uncovered bits as ONE bare-int String (so
	HeadlightsK(13) -> {'LOW_BEAM_K'. 'FOG_K'. '8'}).  A named member is included
	when its value is a non-zero subset; ``leftover'' is v with every included
	member's bits cleared.  Empty when v is 0 / not an Integer.  Drives the global
	flag repr; the leftover bare-int piece is what distinguishes an uncovered KEEP
	value from a fully-named one."

	| v parts covered |
	parts := OrderedCollection @env0:new.
	v := m @env0:dynamicInstVarAt: #value.
	(v isKindOf: Integer) ifFalse: [^ parts].
	covered := 0.
	(Enum ___grailAllNamedMembers: m @env0:class) @env0:do: [:mm | | mv |
		mv := mm @env0:dynamicInstVarAt: #value.
		((mv isKindOf: Integer)
			and: [mv @env0:~= 0
			and: [(v @env0:bitAnd: mv) @env0:= mv]]) ifTrue: [
			parts @env0:add: (mm @env0:dynamicInstVarAt: #name) @env0:asString.
			covered := covered @env0:bitOr: mv]].
	"Leftover = v with all covered bits removed (covered is a subset of v, so
	v bitXor: covered clears exactly those).  Rendered through the class's
	_numeric_repr_, which is the ONLY place CPython lets an enum choose how its
	uncovered bits read -- see ___grailNumericRepr:for:."
	"The leftover renders as a member of the class that CONTRIBUTED it, when a
	cross-class operand did.  CPython gets this from the type of _value_ --
	``Simple.SINGLE | Iron.TWO'' leaves an IRON composite there, so ``value ^
	combined'' is <Iron.TWO: 2> rather than the bare 2 and repr spells it out.
	Grail records the class instead (see IntFlag >> ___foreignFlagClassOf___:
	for why it cannot record the value).  The RENDERING class is still the
	receiver's own -- CPython calls cls._numeric_repr_(unknown), so a Simple
	that set _numeric_repr_ = hex still decides the spelling; only the ARGUMENT
	comes from the other enum."
	(v @env0:bitXor: covered) @env0:~= 0 ifTrue: [
		| leftover |
		leftover := v @env0:bitXor: covered.
		parts @env0:add: (Enum
			___grailNumericRepr: (Enum ___grailLeftoverArg: leftover for: m)
			for: m @env0:class)].
	^ parts
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailLeftoverArg: leftover for: m
	"What to hand ___grailNumericRepr:for: for a KEEP composite's uncovered
	bits: normally the bare Integer, but a MEMBER of the foreign flag class
	when a cross-class operand contributed them.

	CPython never chooses -- its _value_ simply IS an instance of the other
	enum, so ``value ^ combined'' comes back as one.  Grail reconstructs the
	equivalent object from the recorded class.

	Falls back to the bare Integer whenever the reconstruction cannot be made:
	the foreign class may be STRICT and refuse a value none of its members
	covers, in which case CPython's own ``^'' through that class would have
	raised too -- and answering the plain int is the pre-existing behaviour, so
	nothing that works today can be made worse by this."

	| foreign |
	foreign := m @env0:dynamicInstVarAt: #'___foreignFlagClass___'.
	(foreign @env0:isNil or: [(foreign @env0:isKindOf: Behavior) @env0:not])
		ifTrue: [^ leftover].
	^ [ | fm |
		fm := Enum ___grailLookupValue: foreign value: leftover.
		fm @env0:isNil ifTrue: [leftover] ifFalse: [fm] ]
			@env0:on: AbstractException do: [:e | e @env0:return: leftover]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailNumericRepr: anInteger for: cls
	"How this flag class renders the bits a KEEP composite carries but no member
	names -- CPython's ``cls._numeric_repr_(unknown)''.

	Flag declares ``_numeric_repr_ = repr'' and a class may override it; the
	stdlib itself does, in re: ``class RegexFlag(...): _numeric_repr_ = hex'',
	which is why CPython prints re.I|0x1000000 as ``re.IGNORECASE|0x1000000''
	rather than in decimal.  _numeric_repr_ is already exempt from the reserved
	_sunder_ check and from EnumDict's member names, so a class body could
	always SET it -- nothing ever read it, and every leftover rendered through
	printString.

	repr remains the fallback (___grailLeftoverFallbackRepr:), and it is the
	right one: it stands in for Flag's own undeclared ``_numeric_repr_ = repr'',
	so a class that sets nothing renders exactly as before.  A _numeric_repr_
	that raises or answers a non-string falls back the same way rather than
	breaking the repr of a member that is otherwise fine.

	THE ARGUMENT is usually the bare Integer of the uncovered bits, but a MEMBER
	of another flag class when a cross-class operand contributed them
	(___grailLeftoverArg:for:).  That is why the fallback cannot be a plain
	printString any more: for an Integer the two agree character-for-character,
	but for a member printString is the Smalltalk one where CPython wants the
	member repr, <Iron.TWO: 2>."

	| fn out |
	fn := [cls ___pyAttrLoad___: #'_numeric_repr_']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(fn @env0:isNil or: [fn == None])
		ifTrue: [^ Enum ___grailLeftoverFallbackRepr: anInteger].
	out := [fn ___pyCallValue___: { anInteger } kw: nil]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	^ (out @env0:isKindOf: CharacterCollection)
		ifTrue: [out @env0:asString]
		ifFalse: [Enum ___grailLeftoverFallbackRepr: anInteger]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailLeftoverFallbackRepr: aValue
	"How a leftover reads when the class declares no _numeric_repr_ -- which is
	every class in Grail, since Flag's own ``_numeric_repr_ = repr'' is not
	declared and this fallback stands in for it.

	So it has to BE repr.  For an Integer printString is repr
	character-for-character, which is why the plain printString sufficed until
	a leftover could be a flag member; for one of those it answers the
	Smalltalk printString and CPython answers the member repr."

	(aValue @env0:isKindOf: Integer) ifTrue: [^ aValue @env0:printString].
	^ [ | r |
		r := aValue @env1:__repr__.
		(r @env0:isKindOf: CharacterCollection)
			ifTrue: [r @env0:asString]
			ifFalse: [aValue @env0:printString] ]
		@env0:on: AbstractException do: [:e | e @env0:return: aValue @env0:printString]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMemberStr: m
	"Enum/Flag member str for a mixed-in (non-ReprEnum) enum: 'Cls.name' for a
	plain member; 'Cls.a|b' / 'Cls(0)' for flag members.  Installed as the
	member __str__ on mixed enums whose data-type root (int/str/...) would
	otherwise str the raw value (``class E(int, Enum)`` -> '3' instead of
	'E.name').  Class-side receiver (Enum) so int/str-rooted members, which are
	NOT Enum instances, can still call it via ``Enum ___grailMemberStr: self''."

	| cls |
	cls := m @env0:class.
	(Enum ___grailIsFlagClass: cls) ifTrue: [
		| v nm |
		v := m @env0:dynamicInstVarAt: #value.
		nm := m @env0:dynamicInstVarAt: #name.
		((nm @env0:isNil or: [nm == None])
			and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
			^ cls @env0:name @env0:asString @env0:, '(0)'].
		^ cls @env0:name @env0:asString @env0:, '.' @env0:, (Enum ___grailCompositeNameFor: m)].
	^ cls @env0:name @env0:asString @env0:, '.' @env0:, (m @env0:dynamicInstVarAt: #name) @env0:asString
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMemberRepr: m
	"Enum/Flag member repr for a mixed-in enum: '<Cls.name: valrepr>' (Flag:
	'<Cls.a|b: N>' / '<Cls: 0>').  Companion of ___grailMemberStr:."

	| cls valRepr |
	cls := m @env0:class.
	"CPython renders the VALUE with repr(), i.e. the value's own __repr__ --
	which is the whole point of building _value_ through the data type:
	<MyEnum.A: 0x1> is HexInt's repr showing through Enum's.  printString is a
	Smalltalk rendering that agrees for ints and strings and diverges for
	everything else -- it gave ``aHexInt'', and ``atuple( 3, 'x')'' where Python
	says ``(3, 'x')''.  Falls back to printString if the value has no usable
	__repr__, so a value that never had one renders as before."
	valRepr := [:v |
		[v @env1:__repr__ @env0:asString]
			@env0:on: AbstractException do: [:e | v @env0:printString]].
	(Enum ___grailIsFlagClass: cls) ifTrue: [
		| v nm |
		v := m @env0:dynamicInstVarAt: #value.
		nm := m @env0:dynamicInstVarAt: #name.
		((nm @env0:isNil or: [nm == None])
			and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
			^ '<' @env0:, cls @env0:name @env0:asString @env0:, ': 0>'].
		^ '<' @env0:, cls @env0:name @env0:asString @env0:, '.'
			@env0:, (Enum ___grailCompositeNameFor: m) @env0:, ': '
			@env0:, (valRepr @env0:value: v) @env0:, '>'].
	^ '<' @env0:, cls @env0:name @env0:asString @env0:, '.'
		@env0:, (m @env0:dynamicInstVarAt: #name) @env0:asString @env0:, ': '
		@env0:, (valRepr @env0:value: (m @env0:dynamicInstVarAt: #value)) @env0:, '>'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailInstallEnumOutput: cls
	"CPython EnumType.__new__ replaces a member's __repr__/__str__/__format__
	with Enum's when the class only inherited the mix-in data type's (or
	object's) -- so ``class E(int, Enum)'' members str as 'E.name', not '3'.
	Grail picks the data type as the storage base, so its str/repr/format are
	inherited and would win; force Enum's (or Flag's, for a flag-natured class)
	onto cls unless a user/enum method already provides them.

	Skipped for StrEnum-natured classes: StrEnum is a ReprEnum -- it
	deliberately inherits str's __str__/__format__ (bare value) and defines
	only its own __repr__.  IntEnum/IntFlag are ReprEnum too but DEFINE their
	value-str __str__/__format__ in category Grail-Enum Member, so the
	per-selector guard below already keeps them."

	| strOverridden |
	"dir(member) -- install the enum member __dir__ on EVERY enum class (before
	the StrEnum/ReprEnum early returns below), so IntEnum/StrEnum/data-mixed
	members -- which do not inherit Enum's instance side -- resolve it too.
	A user-defined __dir__ is left alone."
	(Enum ___grailUserProvides: cls selector: #'__dir__') ifFalse: [
		cls ___compileMethod: '__dir__
	^ Enum ___grailMemberDir: self' category: 'Grail-Enum Member'].
	"A user __str__ override (a class-body def, one inherited from a user base,
	or a functional-API forwarder) with NO matching __format__ override makes
	format() follow str(): CPython's EnumType replaces __format__ with the
	str-delegating one so ``format(member)'' == ``str(member)'' rather than the
	mix-in value format."
	strOverridden := Enum ___grailUserProvides: cls selector: #'__str__'.
	(Enum ___grailIsStrEnumClass: cls) ifTrue: [
		"StrEnum keeps str's value __str__/__format__ and its own __repr__ -- do
		not force Enum's.  The format-follows-str rule is the one exception: a
		StrEnum subclass overriding __str__ (but not __format__) must format via
		str."
		(strOverridden and: [(Enum ___grailUserProvides: cls selector: #'__format__:') @env0:not])
			ifTrue: [cls ___compileMethod: '__format__: aSpec
	^ (self __str__) __format__: aSpec' category: 'Grail-Enum Member'].
		^ cls].
	"ReprEnum (``class E(date, ReprEnum)''): members str/format as their VALUE,
	keeping only Enum's <Cls.name: valuerepr> repr -- the whole point of
	ReprEnum.  What has to be installed depends on the storage root, which
	differs between a FOREIGN mixin and a data-type mixin:

	 * Enum-rooted (foreign mixin, e.g. ``date''): the member inherits Enum's
	   ``Cls.name'' __str__/__format__ -- WRONG for ReprEnum -- so replace them
	   with value-delegating versions.  __repr__ is Enum's inherited one (already
	   the Python-repr value), so leave it.  A user __str__ override is kept, and
	   __format__ then follows str() (CPython's format-follows-str rule) unless
	   the user also overrode __format__.

	 * Data-rooted (int/str/FLOAT storage, ``class E(float, ReprEnum)''): the
	   member IS the data type, so its inherited __str__/__format__ already ARE
	   the value's (and handle every format code -- delegating to the raw #value
	   would drop '{:f}'/'{:n}'); keep them.  Only __repr__ is wrong (the data
	   type's bare-value repr) -- force Enum's.

	StrEnum is handled above; Grail's IntEnum/StrEnum are storage-rooted and not
	ReprEnum-chained, so they never reach here."
	(Enum ___grailIsReprEnumClass: cls) ifTrue: [
		(cls @env0:inheritsFrom: Enum)
			ifTrue: [ | strOv |
				strOv := Enum ___grailUserProvides: cls selector: #'__str__'.
				strOv ifFalse: [
					cls ___compileMethod: '__str__
	^ (self @env0:dynamicInstVarAt: #value) @env1:__str__' category: 'Grail-Enum Member'].
				(Enum ___grailUserProvides: cls selector: #'__format__:') ifFalse: [
					strOv
						ifTrue: [cls ___compileMethod: '__format__: aSpec
	^ (self __str__) __format__: aSpec' category: 'Grail-Enum Member']
						ifFalse: [cls ___compileMethod: '__format__: aSpec
	^ (self @env0:dynamicInstVarAt: #value) @env1:__format__: aSpec' category: 'Grail-Enum Member']]]
			ifFalse: [
				(Enum ___grailShouldForceOutput: cls selector: #'__repr__') ifTrue: [
					cls ___compileMethod: '__repr__
	^ Enum ___grailMemberRepr: self' category: 'Grail-Enum Member']].
		^ cls].
	"Nested {selector. source} pairs (NOT Associations -- a bare ``->'' would
	be an env-1 send and DNU here)."
	{ { #'__repr__'. '__repr__
	^ Enum ___grailMemberRepr: self' }.
	  { #'__str__'. '__str__
	^ Enum ___grailMemberStr: self' }.
	  { #'__format__:'. '__format__: aSpec
	^ (self __str__) __format__: aSpec' } }
		@env0:do: [:pair |
			| sel force |
			sel := pair @env0:at: 1.
			force := Enum ___grailShouldForceOutput: cls selector: sel.
			(sel @env0:= #'__format__:'
				and: [strOverridden
				and: [(Enum ___grailUserProvides: cls selector: sel) @env0:not]])
					ifTrue: [force := true].
			force ifTrue: [
				cls ___compileMethod: (pair @env0:at: 2) category: 'Grail-Enum Member']].
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFindDataType: cls
	"CPython's _find_data_type_: the mixed-in DATA TYPE of an enum, or nil.

	Not the same question as ___grailMemberTypeFor:, which answers the first
	non-enum ancestor of the storage chain.  That is right for storage and wrong
	here: for ``class DumbStrEnum(DumbMixin, CustomStrEnum)'' it answers
	DumbMixin, a pure behaviour mixin, where CPython's data type is str.

	CPython walks the bases carrying a CANDIDATE and commits it at the first
	class that actually constructs:

	    for base in chain.__mro__:
	        if base is object:                     continue
	        elif issubclass(base, Enum):           take base._member_type_, stop
	        elif '__new__' in base.__dict__ or '__dataclass_fields__' in base.__dict__:
	                                               take candidate or base, stop
	        else:                                  candidate = candidate or base

	The candidate is what makes ``class HexInt(int)'' the data type rather than
	int: HexInt defines no __new__ of its own, so it is remembered, and int's
	__new__ is what commits it.  A chain that never reaches a constructor
	contributes nothing -- that is how DumbMixin is excluded, and equally how a
	plain ``def __init__'' mixin is (test_repr_with_init_mixin): the probe is
	__new__/__dataclass_fields__, NOT __init__.

	Walking cls's own registered C3 MRO rather than per-base chains is the same
	traversal flattened; the per-chain candidate reset only distinguishes
	MULTIPLE data types, which CPython rejects outright."

	| mro candidate objCls |
	objCls := Python @env0:at: #object otherwise: nil.
	mro := [(Python @env0:at: #importlib) @env0:___mroOf___: cls]
		@env0:on: AbstractException do: [:e | #()].
	candidate := nil.
	mro @env0:do: [:base |
		(base == cls
			or: [(base == objCls) or: [(base == PythonInstance) or: [base == Object]]])
			ifFalse: [
				(Enum ___grailIsEnumBase: base)
					ifTrue: [ | bmt |
						"An enum base contributes ITS member type, not itself -- this is
						how ``class DumbStrEnum(DumbMixin, CustomStrEnum)'' reaches str
						rather than committing DumbMixin as the candidate."
						bmt := Enum ___grailMemberTypeFor: base.
						(bmt @env0:notNil and: [bmt ~~ objCls]) ifTrue: [^ bmt]]
					ifFalse: [
						((Enum ___grailIsDataTypeBase: base)
							or: [Enum ___grailHasFieldsMarker: base])
							ifTrue: [^ candidate @env0:ifNil: [base]]
							ifFalse: [candidate @env0:isNil ifTrue: [candidate := base]]]]].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailHasFieldsMarker: base
	"The non-__new__ half of CPython's _find_data_type_ constructor probe.

	CPython asks ``'__new__' in base.__dict__ or '__dataclass_fields__' in
	base.__dict__''.  ___grailIsDataTypeBase: covers __new__; this covers the
	two field-carrying shapes that construct without publishing one Grail can
	see:

	  * a @dataclass mixin -- __dataclass_fields__, exactly CPython's own probe.
	    It defines __init__ and no __new__, so it looked like a pure behaviour
	    mixin and its __repr__ was kept instead of Enum's
	    (test_repr_with_dataclass).
	  * a namedtuple base -- _fields.  CPython reaches these through tuple's
	    __new__ (the candidate rule commits the namedtuple subclass), but Grail's
	    namedtuple classes are not tuple-ROOTED: NTCEnum's MRO runs straight from
	    _NT to Enum, so the walk never meets a constructor at all
	    (test_namedtuple_as_value).

	Deliberately paired with __new__ and never with __init__: a mixin that only
	supplies __init__ is NOT a data type, and CPython keeps its __repr__
	(test_repr_with_init_mixin)."

	^ #('__dataclass_fields__' '_fields') @env0:anySatisfy: [:attr |
		[(base @env1:___pyAttrLoad___: attr @env0:asSymbol) @env0:notNil]
			@env0:on: AbstractException do: [:e | false]]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailShouldForceOutput: cls selector: sel
	"True when cls only inherits the mix-in data type's (or object's) output
	method for sel, so ___grailInstallEnumOutput: should replace it with
	Enum's.  False when a USER class-body definition (category Grail-Class
	Methods / Grail-Method Aliases) or an already-enum-style method (Grail-Enum
	Member / Grail-Flag Member / Grail-IntFlag Member) provides it -- those are
	correct and must be kept."

	| p cat dt pdt objCls |
	p := cls @env0:whichClassIncludesSelector: sel environmentId: 1.
	p @env0:isNil ifTrue: [^ true].
	"categoryOfSelector: answers a Symbol -- compare against Symbols."
	cat := [p @env0:categoryOfSelector: sel environmentId: 1]
		@env0:on: AbstractException do: [:e | nil].
	(#(#'Grail-Class Methods' #'Grail-Method Aliases' #'Grail-Enum Override'
		#'Grail-Property-ReadOnly'
		#'Grail-CachedProperty-Setter' #'Grail-Enum Member' #'Grail-Flag Member'
		#'Grail-IntFlag Member') @env0:includes: cat) ifFalse: [^ true].
	"An ENUM-STYLE method (Grail-Enum/Flag/IntFlag Member and the property
	categories) is correct by construction -- it is one Grail installed -- so it
	is kept, unconditionally.  Only a USER definition raises the question below;
	applying the data-type test to the installed ones instead forced Enum's
	__str__/__format__ over IntFlag's own and took out six format/str cases."
	(#(#'Grail-Class Methods' #'Grail-Method Aliases') @env0:includes: cat)
		ifFalse: [^ false].
	"Beyond here the method is a USER definition.  Keeping every one of them was
	too blunt: CPython exempts only the enum's OWN class body and then applies

	    if found_method in (data_type_method, object_method):
	        setattr(enum_class, name, enum_method)

	so a __repr__ INHERITED FROM THE DATA TYPE is replaced by Enum's --

	    class HexInt(int):
	        def __repr__(self): return hex(self)
	    class MyEnum(HexInt, enum.Enum): A = 1
	    repr(MyEnum.A) == '<MyEnum.A: 0x1>'

	-- while one from any other base is left alone, because it is neither the
	data type's method nor object's.  Asking which CATEGORY defined it cannot
	tell those apart: a mixin's def and the enum's own def are both
	Grail-Class Methods (test_inherited_data_type, test_repr_with_dataclass,
	test_namedtuple_as_value on one side; test_repr_with_init_mixin,
	test_strenum on the other)."
	(p == cls) ifTrue: [^ false].
	objCls := Python @env0:at: #object otherwise: nil.
	((p == objCls) or: [(p == PythonInstance) or: [p == Object]]) ifTrue: [^ true].
	dt := Enum ___grailFindDataType: cls.
	dt @env0:isNil ifTrue: [^ false].
	pdt := dt @env0:whichClassIncludesSelector: sel environmentId: 1.
	^ pdt @env0:notNil and: [pdt == p]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailUserProvides: cls selector: sel
	"True when cls's method for sel is a USER definition -- a class-body def
	or one inherited from a user base (category Grail-Class Methods or
	Grail-Method Aliases) -- rather than an inherited data-type/enum method.
	Used to decide whether format() should follow an overridden __str__."

	| p cat |
	p := cls @env0:whichClassIncludesSelector: sel environmentId: 1.
	p @env0:isNil ifTrue: [^ false].
	cat := [p @env0:categoryOfSelector: sel environmentId: 1]
		@env0:on: AbstractException do: [:e | nil].
	^ #(#'Grail-Class Methods' #'Grail-Method Aliases' #'Grail-Enum Override') @env0:includes: cat
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailInstallClassProtocol: cls
	"A data-mixed enum (``class E(int, Enum)'') is rooted at its data type in
	Smalltalk, so its METACLASS does not inherit Enum class and is missing the
	enum class-side protocol (_member_names_, _value_repr_, mro, __reversed__,
	the ``<enum 'Name'>'' class repr, ...).  ___mergeSecondaryBases___ does not
	fill these (Enum class is not a ___dynInstVars___-bearing Python metaclass), so
	`reversed(E)` fell to reverseDo: and `E._value_repr_` raised AttributeError.
	Copy Enum class's own source for each protocol selector onto cls's metaclass
	unless an enum metaclass already provides it (pure Enum/Flag, and the
	IntEnum/StrEnum-rooted classes that carry the duplicated protocol -- their
	provider category is Grail-Enum Metaclass / Grail-Class Attrs, so they are
	left untouched)."

	| mc |
	mc := cls @env0:class.
	#(#'__reversed__' #'mro' #'__repr__' #'__str__' #'__format__:'
		#'_member_names_' #'_member_map_' #'__members__' #'_value2member_map_'
		#'_value_repr_' #'_new_member_' #'__dir__' #'__bool__' #'__new__'
		#'_flag_mask_' #'_singles_mask_' #'_all_bits_'
		#'___grailSetClassBoundary___:')
		@env0:do: [:sel |
			| prov provCat |
			prov := mc @env0:whichClassIncludesSelector: sel environmentId: 1.
			provCat := prov @env0:isNil
				ifTrue: [nil]
				ifFalse: [[prov @env0:categoryOfSelector: sel environmentId: 1]
					@env0:on: AbstractException do: [:e | nil]].
			((provCat @env0:= #'Grail-Enum Metaclass')
				or: [provCat @env0:= #'Grail-Class Attrs']) ifFalse: [
				[ | src cat |
				src := Enum @env0:class @env0:sourceCodeAt: sel environmentId: 1.
				cat := Enum @env0:class @env0:categoryOfSelector: sel environmentId: 1.
				src @env0:isNil ifFalse: [
					mc ___compileMethod: src category: cat @env0:asString]]
					@env0:on: Error do: [:e | "best effort"]]].
	"int.from_bytes: an int-mixed enum (``class E(int, Enum)'') roots at
	AbstractPyInt, whose metaclass lacks kernel Integer's from_bytes
	classmethod -- so ``E.from_bytes(...)'' was an AttributeError.  IntEnum
	carries from_bytes (Grail-Enum Metaclass); copy its version onto any
	other AbstractPyInt-rooted enum metaclass that lacks it so from_bytes
	decodes the bytes then constructs the MEMBER (CPython int.from_bytes
	calls cls(result) for a subclass)."
	(cls @env0:inheritsFrom: AbstractPyInt) ifTrue: [
		#(#'from_bytes:_:' #'from_bytes:_:_:') @env0:do: [:sel |
			(mc @env0:whichClassIncludesSelector: sel environmentId: 1) @env0:isNil ifTrue: [
				[ | src cat |
				src := IntEnum @env0:class @env0:sourceCodeAt: sel environmentId: 1.
				cat := IntEnum @env0:class @env0:categoryOfSelector: sel environmentId: 1.
				src @env0:isNil ifFalse: [
					mc ___compileMethod: src category: cat @env0:asString]]
					@env0:on: Error do: [:e | "best effort"]]]].
	"A data-mixed FLAG (``class E(int, IntFlag)'') roots at its data type, so its
	metaclass inherits neither Flag class>>_boundary_ (#STRICT) nor IntFlag
	class>>_boundary_ (#KEEP) -- ``E._boundary_'' was an AttributeError
	(test_open_invert_expectations reads it).  Install a _boundary_ that answers
	the shared family default (KEEP for IntFlag-natured, STRICT for plain Flag)."
	((self ___grailIsFlagClass: cls)
		and: [(mc @env0:whichClassIncludesSelector: #'_boundary_' environmentId: 1) @env0:isNil])
		ifTrue: [
			[mc ___compileMethod: '_boundary_
	^ Enum ___grailBoundaryMemberFor: (Enum ___grailFlagBoundaryOf: self)' category: 'Grail-Class Attrs']
				@env0:on: Error do: [:e | "best effort"]].
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFunctional: cls positional: positional keywords: keywords
	"Enum('Name', names, *, module=, qualname=, type=, start=1) -- the
	FUNCTIONAL API: build a new enum class at runtime.  ``names'' may be
	a whitespace/comma-separated string, a sequence of names, a sequence
	of (name, value) pairs, or a mapping.  module / qualname / type /
	boundary are accepted and ignored (Grail classes don't carry them);
	omitting names yields an empty enum used as a base class
	(test_enum's ``Enum('enum_type', type=int)'' shape).  Member reads
	(Question.who) resolve through a compiled class-side accessor that
	delegates to the metaclass __getitem__, which both the Enum and
	IntEnum metaclass chains implement."

	| className names start pairs newCls byValue byName members gnvFnValue |
	className := (positional @env0:at: 1) @env0:asSymbol.
	"``names'' may be positional[2] or the ``names='' keyword (Enum('bad',
	names=0)); read both so a non-iterable value under either form reaches the
	guard below rather than being silently dropped (test_empty_names)."
	names := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(keywords ~~ nil and: [keywords @env0:includesKey: 'names'])
			ifTrue: [keywords @env0:at: 'names'] ifFalse: [nil]].
	start := (keywords ~~ nil and: [keywords @env0:includesKey: 'start'])
		ifTrue: [keywords @env0:at: 'start'] ifFalse: [1].
	pairs := OrderedCollection @env0:new.
	names @env0:isNil ifFalse: [
		| isFlag autoVal nextAuto hasGnv genValues |
		"Auto member values in declaration order, mirroring the class-syntax
		builder's resolution: a user _generate_next_value_ (Date/Float mixin
		fixtures return values[count]) wins; else a StrEnum yields the
		lowercased name; else Flag-natured classes DOUBLE (1,2,4... or
		start,2*start when start= is given) and plain enums count sequentially
		from start.  genValues threads the resolved values as gnv's
		last_values."
		isFlag := self ___grailIsFlagClass: cls.
		hasGnv := Enum ___grailClassHasGnv: cls.
		genValues := OrderedCollection @env0:new.
		autoVal := nil.
		nextAuto := [:idx :nameStr | | v |
			v := hasGnv
				ifTrue: [Enum ___grailGnvValueFor: cls name: nameStr
					count: genValues @env0:size lastValues: (list @env0:withAll: genValues)]
				ifFalse: [(self ___grailIsStrEnumClass: cls)
					ifTrue: [nameStr @env0:asLowercase]
					ifFalse: [isFlag
						ifTrue: [autoVal := autoVal @env0:isNil
							ifTrue: [start @env0:max: 1]
							ifFalse: [autoVal @env0:* 2]]
						ifFalse: [autoVal := start @env0:+ idx @env0:- 1]]].
			genValues @env0:add: v.
			v].
		(names isKindOf: CharacterCollection)
			ifTrue: [
				| cleaned tokens idx |
				cleaned := names @env0:copyReplaceAll: ',' with: ' '.
				tokens := cleaned @env0:asString @env0:subStrings.
				idx := 0.
				tokens @env0:do: [:tok |
					idx := idx @env0:+ 1.
					pairs @env0:add: (Array @env0:with: tok @env0:asString
						with: (nextAuto @env0:value: idx value: tok @env0:asString))]]
			ifFalse: [(names isKindOf: KeyValueDictionary)
				ifTrue: [
					names @env0:keysAndValuesDo: [:k :v |
						pairs @env0:add: (Array @env0:with: k @env0:asString with: v)]]
				ifFalse: [
					| idx |
					"A non-iterable ``names'' (Enum('bad', names=0) / Enum('bad', 0,
					type=int)) must raise CPython's TypeError, not leak a raw
					``SmallInteger does not understand #do:'' from the sweep below
					(test_empty_names).  A valid ``names'' sequence answers #do:."
					(names @env0:respondsTo: #'do:') ifFalse: [
						^ TypeError ___signal___: ''''
							@env0:, ((Python @env0:at: #bytes) ___pyTypeNameOf___: names)
							@env0:, ''' object is not iterable'].
					idx := 0.
					names @env0:do: [:item |
						idx := idx @env0:+ 1.
						(item isKindOf: CharacterCollection)
							ifTrue: [pairs @env0:add: (Array @env0:with: item @env0:asString
								with: (nextAuto @env0:value: idx value: item @env0:asString))]
							ifFalse: [pairs @env0:add: (Array @env0:with: (item @env0:at: 1) @env0:asString
								with: (item @env0:at: 2))]]]]].
	"Remember a ``_generate_next_value_'' entry from the functional members dict
	(the gnv) -- surfaced below as a staticmethod in cls.__dict__ via the session
	gnv-static store (test_gnv_is_static Function variants)."
	gnvFnValue := nil.
	[ | gnvPair |
	gnvPair := pairs @env0:detect: [:p | (p @env0:at: 1) @env0:asString @env0:= '_generate_next_value_']
		ifNone: [nil].
	gnvPair @env0:notNil ifTrue: [gnvFnValue := gnvPair @env0:at: 2] ] @env0:value.
	"Honor a ``type='' kwarg (Enum('enum_type', {...}, type=date/int/str/float)):
	root the new class in that data type's storage exactly as the class-syntax
	builder does for ``class enum_type(date, ReprEnum)'' -- select the storage
	base from {typeBase. cls}, subclass it (___subclass___ substitutes the sealed
	AbstractPyInt/Str/Float storage for int/str/float), then merge cls as a
	secondary base so Enum's protocol + the MI record (which ___grailMemberTypeFor:
	reads to recover the mix-in) are installed.  A non-class type= value (or none)
	keeps the plain ``cls ___subclass___:'' path unchanged."
	newCls := (keywords ~~ nil
		and: [(keywords @env0:includesKey: 'type')
		and: [(keywords @env0:at: 'type') isKindOf: Behavior]])
		ifTrue: [ | typeBase il baseArray sb nc |
			typeBase := keywords @env0:at: 'type'.
			il := Python @env0:at: #importlib.
			baseArray := Array @env0:with: typeBase with: cls.
			sb := il @env0:___selectStorageBase___: baseArray.
			nc := sb ___subclass___: className instVarNames: #()
				classInstVarNames: #( #'___dynInstVars___' ).
			il @env0:___mergeSecondaryBases___: nc bases: baseArray.
			nc]
		ifFalse: [cls ___subclass___: className instVarNames: #()
			classInstVarNames: #( #'___dynInstVars___' )].
	"CPython's functional API produces an ORDINARY class, so ``setattr(E, ...)''
	-- and reading E.__module__ -- must work on it.  Grail's per-class attribute
	store is a ``___dynInstVars___'' classInstVar plus its accessor pair, which
	ClassDefAst emits for a class-SYNTAX class and nothing emitted here: every
	class-attribute store on a functional enum raised AttributeError, so
	``enum._make_class_unpicklable(BadPickle)'' could not install either of the
	two things it sets (test_pickle_explodes).

	__module__ is stamped from the ``module='' keyword, which the docstring
	above records as accepted-and-ignored.  It is the name pickle resolves a
	class BY, so ignoring it is what makes a functional enum unpicklable even
	when its module is right there in the call."
	[ | holderSrc |
	(newCls @env0:class @env0:whichClassIncludesSelector: #'___dynInstVars___'
		environmentId: 1) @env0:isNil ifTrue: [
		holderSrc := '___dynInstVars___
	^ ___dynInstVars___'.
		[newCls @env0:class ___compileMethod: holderSrc category: 'Grail-Class Attrs']
			@env0:on: AbstractException do: [:e | nil].
		holderSrc := '___dynInstVars___: ___1
	___dynInstVars___ := ___1.'.
		[newCls @env0:class ___compileMethod: holderSrc category: 'Grail-Class Attrs']
			@env0:on: AbstractException do: [:e | nil]]] @env0:value.
	(keywords ~~ nil and: [keywords @env0:includesKey: 'module']) ifTrue: [
		[newCls @env1:___pyAttrStore___: #'__module__'
			put: (keywords @env0:at: 'module')]
			@env0:on: AbstractException do: [:e | nil]].
	"CPython _EnumDict.__setitem__: a name whose value is a DESCRIPTOR is NOT a
	member.  It stays an ordinary class attribute, and an enum whose members dict
	holds only descriptors stays MEMBER-LESS -- which is what makes it legal to
	subclass.  Grail counted the descriptor as a member, so the shared test
	fixture's ``BaseEnum = enum_type('BaseEnum', {'first': enum.property(f)})''
	built a bogus ``<BaseEnum.first: <PropertyDescriptor object>>'' and the
	descriptor never reached the members of the subclass built from it
	(test_enum's *Function.test_basics).

	___isValueDescriptor___: is the project's existing answer to ``is this class
	attribute a real descriptor object'': PropertyDescriptor (``property'',
	``enum.property'', DynamicClassAttribute) plus any PythonInstance whose own
	class implements __get__.  It deliberately excludes Grail's function
	stand-ins (BoundMethod / UnboundMethod / ExecBlock), which Grail binds
	elsewhere, and it never fires for a CLASS value -- ``f = float'' IS a member
	in CPython, and some Grail kernel classes answer __get__ where CPython's
	types do not.

	Underscore names are left alone: the member loop already routes them (dunder
	overrides, the gnv), matching CPython, whose sunder/dunder handling likewise
	runs before its descriptor test."
	[ | kept |
	kept := OrderedCollection @env0:new.
	pairs @env0:do: [:p | | pName |
		pName := (p @env0:at: 1) @env0:asString.
		((((pName @env0:size @env0:> 0) and: [(pName @env0:at: 1) @env0:= $_]) not)
			and: [newCls ___isValueDescriptor___: (p @env0:at: 2)])
			ifTrue: [Enum ___grailInstallClassDescriptor: newCls
				name: pName descriptor: (p @env0:at: 2)]
			ifFalse: [kept @env0:add: p]].
	pairs := kept ] @env0:value.
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	[ | lastInt maxInt isFlag autoResolved foreignMixin hasGnv genVals |
	lastInt := 0.
	maxInt := 0.
	isFlag := self ___grailIsFlagClass: newCls.
	"An inherited user _generate_next_value_ (a functional gnv stored in the
	session gnv-static store, as in ``ReprEnum('enum_type', {'_generate_next_
	value_':fn}, type=date)'' subclassed by ``enum_type('MainEnum', dict(first=
	auto(), ...))'') drives auto() numbering for the DICT/pairs member forms
	below.  ___grailClassHasGnv: is false for a non-invocable (receiver-less
	plain-def) gnv, so those keep default numbering.  genVals threads the
	resolved member values as the gnv's last_values; count is members-so-far."
	hasGnv := Enum ___grailClassHasGnv: newCls.
	genVals := OrderedCollection @env0:new.
	"A functional enum built on a foreign-mixin base (``class enum_type(date,
	Enum)'' then enum_type('MinorEnum', (('june', (2021,12,25)), ...))) carries
	member_type(*args) as each value, like the class-syntax builder.  nil for a
	plain Enum-rooted functional enum and for int/str/float storage.  (A bare
	``type=date'' kwarg is still ignored, so that shape stays plain.)"
	foreignMixin := Enum ___grailValueMixinFor: newCls.
	"Per-INSTANCE auto() resolution (mirrors ___grailBuildMembers, slice 5):
	the same GrailEnumAuto marker passed under two names -- the _EnumTests
	functional MainEnum does ``third = auto(); dupe = third'' then
	BaseEnum('MainEnum', dict(..., third=third, dupe=dupe)) -- must resolve
	to ONE value so dupe aliases third (byValue hit) instead of advancing
	the counter to a distinct value.  Identity-keyed: distinct auto() calls
	stay distinct."
	autoResolved := IdentityKeyValueDictionary @env0:new.
	pairs @env0:do: [:pair |
		| nameStr rawValue member effVal |
		nameStr := pair @env0:at: 1.
		rawValue := pair @env0:at: 2.
		"An EMPTY member name is invalid (CPython raises ValueError before building
		anything -- test_empty_string).  Grail would otherwise try to compile an
		accessor with an empty selector and leak a CompileError."
		nameStr @env0:isEmpty ifTrue: [
			^ ValueError ___signal___: 'invalid enum member name: '''''].
		"auto() markers can arrive through the mapping/pairs forms
		(BaseEnum('MainEnum', dict(first=auto(), ...))) -- resolve with
		the same per-class rule as class-body members."
		(rawValue isKindOf: GrailEnumAuto) ifTrue: [
			(autoResolved @env0:includesKey: rawValue)
				ifTrue: [rawValue := autoResolved @env0:at: rawValue]
				ifFalse: [ | resolved |
					resolved := hasGnv
						ifTrue: [Enum ___grailGnvValueFor: newCls name: nameStr
							count: members @env0:size lastValues: (list @env0:withAll: genVals)]
						ifFalse: [(Enum ___grailIsStrEnumClass: newCls)
							ifTrue: [nameStr @env0:asLowercase]
							ifFalse: [isFlag
								ifTrue: [maxInt @env0:<= 0
									ifTrue: [1]
									ifFalse: [1 @env0:bitShift: maxInt @env0:highBit]]
								ifFalse: [lastInt @env0:+ 1]]].
					autoResolved @env0:at: rawValue put: resolved.
					rawValue := resolved]].
		(rawValue isKindOf: Integer) ifTrue: [
			lastInt := rawValue.
			maxInt := maxInt @env0:max: rawValue].
		"Construct the foreign-mixin value up front so alias detection, storage
		and value-lookup all key off the SAME value (see the class-syntax
		builder).  effVal == rawValue for every non-foreign case."
		effVal := Enum ___grailCoerceMemberValue: rawValue
			toMemberType: foreignMixin.
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_])
			ifTrue: [
				"A callable under a DUNDER name is a user method, not a member
				-- store + compile a forwarder (test_overridden_str/format
				Function flavors).  Method-local defs are ExecBlocks."
				(((nameStr @env0:size @env0:>= 5)
					and: [(nameStr @env0:copyFrom: 1 to: 2) @env0:= '__'
					and: [(nameStr @env0:copyFrom: nameStr @env0:size @env0:- 1 to: nameStr @env0:size) @env0:= '__'
					and: [((rawValue isKindOf: BoundMethod)
						or: [(rawValue isKindOf: UnboundMethod)
						or: [rawValue isKindOf: ExecBlock]])]]])
					ifTrue: [
						Enum ___grailStoreOverride: newCls name: nameStr callable: rawValue.
						Enum ___grailCompileOverrideForwarder: newCls name: nameStr])]
			ifFalse: [
			"Thread this member's value as a prior last_value for the next auto()'s
			gnv (the class-syntax builder does the same); a gnv that ignores
			last_values (the date/float fixtures return values[count]) is unaffected."
			genVals @env0:add: rawValue.
			(byValue @env0:includesKey: effVal)
				ifTrue: [member := byValue @env0:at: effVal]
				ifFalse: [ | canonical |
					"A str-storage-rooted enum's member IS a string, so it needs
					CONTENT -- basicNew leaves the indexed characters empty, and
					every member then hashes and compares equal to '' (and to each
					other).  The class-syntax builder has done this since the
					str-storage work; the FUNCTIONAL builder never did, which is
					why ``MinorEnum.june == '1''' was false for the four
					TestMixedStrClass.test_programmatic_function_* cases even once
					_value_ carried the coerced string."
					member := (newCls @env0:inheritsFrom: CharacterCollection)
						ifTrue: [ | s m |
							s := (effVal isKindOf: CharacterCollection)
								ifTrue: [effVal]
								ifFalse: [[effVal __str__]
									@env0:on: AbstractException do: [:e | '']].
							m := newCls @env0:new: s @env0:size.
							s @env0:size @env0:> 0 ifTrue: [
								m @env0:replaceFrom: 1 to: s @env0:size
									with: s startingAt: 1].
							m]
						ifFalse: [newCls @env0:basicNew].
					member @env0:dynamicInstVarAt: #value put: effVal.
					member @env0:dynamicInstVarAt: #name put: nameStr.
					byValue @env0:at: effVal put: member.
					"A Flag member is canonical (iteration/len/reversed/_member_names_)
					ONLY when its value is a SINGLE bit.  A zero-valued member and any
					MULTI-bit member -- a composite ALIAS whose bits are all covered
					(``dupe = 3'' after first=1/second=2) OR an explicit mask whose bits
					are NOT all covered (``MASK = 255'') -- are reachable by name and
					value but excluded from canonical (CPython: ``A, B = OpenAB'' unpacks
					exactly the single-bit members).  Same rule as the class-syntax
					builder."
					canonical := true.
					(isFlag and: [effVal isKindOf: Integer]) ifTrue: [
						((effVal @env0:<= 0)
							or: [(effVal @env0:bitAnd: effVal @env0:- 1) @env0:~= 0])
							ifTrue: [canonical := false]].
					canonical ifTrue: [members @env0:add: member]].
			byName @env0:at: nameStr put: member.
			"Category MUST be Grail-Class Attrs: the class-receiver branch of
		Object's attribute load performs only setter-paired accessors or
		that category, and wraps everything else as a BoundMethod -- any
		other category makes Question.who a callable, not the member."
		"Best-effort: a member NAME that is not a valid Smalltalk selector (a
		digit-leading string like ``2'', ...) cannot be compiled as an accessor and
		used to leak a CompileError that aborted the WHOLE build -- so a valid
		sibling name (the Hebrew alef in ``('א','2','3')'') became unreachable
		(test_non_latin_number_string).  Skip only the un-compilable accessor; the
		member is still registered in byName, so cls['2'] resolves via __getitem__."
		[(newCls @env0:class) ___compileMethod:
				(nameStr @env0:, '
	^ self __getitem__: ''' @env0:, nameStr @env0:, '''')
				category: 'Grail-Class Attrs']
			@env0:on: AbstractException do: [:e | nil]]]] value.
	self ___grailRegistry___ @env0:at: newCls put: (Array @env0:with: byValue with: byName with: members).
	"Record the functional gnv as a staticmethod in the session gnv-static store;
	___classDict___ surfaces it in newCls.__dict__ (functional enums have no
	___dynInstVars___ holder, so the class-syntax holder path can't be used).  A value
	already a staticmethod (BusyGNV passes ``staticmethod(fn)'') is kept; a bare
	function is wrapped."
	gnvFnValue @env0:notNil ifTrue: [ | sm |
		sm := (gnvFnValue isKindOf: PyStaticMethod)
			ifTrue: [gnvFnValue]
			ifFalse: [ | s | s := PyStaticMethod @env0:new.
				s @env0:dynamicInstVarAt: #'__func__' put: gnvFnValue. s ].
		self ___grailGnvStaticStore @env0:at: newCls put: sm].
	"Same class-protocol + repr/str/format installs as the class-syntax builder
	(harmless no-op for the Enum-rooted classes the functional API produces
	today, but correct if a data-mixed functional enum lands here later)."
	[Enum ___grailInstallClassProtocol: newCls] @env0:on: Error do: [:ex | "best effort"].
	[Enum ___grailInstallEnumOutput: newCls] @env0:on: Error do: [:ex | "best effort"].
	"Honor the ``qualname='' kwarg (Enum('Theory', names, qualname='x')):
	object>>__qualname__ otherwise answers the class NAME (positional[1]).  Compile
	a metaclass __qualname__ override returning the given qualname
	(test_enum_function_with_qualname)."
	(keywords ~~ nil and: [keywords @env0:includesKey: 'qualname']) ifTrue: [ | qn src |
		qn := (keywords @env0:at: 'qualname') @env0:asString.
		src := '__qualname__' @env0:, (String @env0:with: Character @env0:lf)
			@env0:, '	^ ''' @env0:, (qn @env0:copyReplaceAll: '''' with: '''''')
			@env0:, ''''.
		[(newCls @env0:class) ___compileMethod: src category: 'Grail-Enum Metaclass']
			@env0:on: Error do: [:ex | "best effort"]].
	^ newCls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailConvert: positional kw: kwargs forType: etype
	"``Enum._convert_(name, module, filter, source=None, *, boundary=None,
	as_global=False)'' -- build a new enum (of THIS type: IntEnum, StrEnum,
	...) from the constants in ``module''s globals whose NAME passes
	``filter'', then return it.  Converts C-style constant modules (socket,
	errno) into enums.  Members are sorted by (value, name) so the
	value->name reverse map is stable -- the first lexicographic name wins
	for a shared value (test_convert_value_lookup_priority); when the values
	are not orderable (complex, tuples) fall back to sorting by name
	(test_convert_uncomparable / _complex).  The old spelling ``_convert''
	is intentionally absent, so it raises AttributeError (test_convert_raise).

	_convert_ EXPORTS as well as builds -- that is its whole purpose, and it
	is the half Grail used to leave out.  CPython finishes with

	    if as_global:  global_enum(cls)          # also updates the globals
	    else:          sys.modules[cls.__module__].__dict__.update(cls.__members__)
	    module_globals[name] = cls

	so after the call the module's plain integer constants ARE the enum's
	members and the enum class is bound under ``name''.  Building the enum
	and dropping it on the floor left ``AF_INET'' as a bare 1 and the name
	``AddressFamily'' undefined, and raised nothing while doing it -- which
	is exactly how CPython's socket.py fails on Grail, four calls in.

	The dir()-equality assertions (test_convert_int / _str, which need the
	blocked enum __dir__ / _new_member_ identity) remain follow-ons."

	"Temps avoid the Grail globals ``module'' (the module class), ``filter''
	and ``sorted'' (builtins)."
	| enumName modName filterFn modInst srcMod srcNs modGlobals memberPairs
	  sortedPairs newEnum |
	enumName := positional @env0:at: 1.
	modName := positional @env0:at: 2.
	"``filter'' is CPython's THIRD POSITIONAL parameter -- _convert_(name,
	module, filter, ...) -- and every real caller passes it that way:
	socket.py's four calls are all positional.  Reading it from kwargs alone
	left filterFn nil, which means ``no filter'', which means every global in
	the module becomes a member.  Accept both spellings, positional first."
	filterFn := positional @env0:size @env0:>= 3
		ifTrue: [positional @env0:at: 3]
		ifFalse: [(kwargs ~~ nil and: [kwargs @env0:includesKey: 'filter'])
			ifTrue: [kwargs @env0:at: 'filter'] ifFalse: [nil]].
	filterFn == None ifTrue: [filterFn := nil].
	"Source MODULE: an explicit ``source'', else the named module in
	sys.modules.  Iterate its ``__dict__'' (a PyModuleDict live view whose
	keysAndValuesDo: yields the global name/value pairs)."
	"The MODULE and the SOURCE are two different things: members are READ from
	source (or the module when there is none) but are always WRITTEN BACK to
	the module's own globals -- CPython's module_globals, fixed to
	sys.modules[module].__dict__ before ``source'' is consulted at all."
	modInst := (Python @env0:at: #importlib) modules @env0:at: modName otherwise: nil.
	srcMod := ((kwargs ~~ nil and: [kwargs @env0:includesKey: 'source'])
		and: [(kwargs @env0:at: 'source') ~~ nil])
		ifTrue: [kwargs @env0:at: 'source']
		ifFalse: [modInst].
	srcMod == nil ifTrue: [
		^ ValueError ___signal___: 'module ''' @env0:, modName @env0:asString @env0:, ''' not found'].
	srcNs := srcMod __dict__.
	modGlobals := modInst == nil ifTrue: [nil] ifFalse: [modInst __dict__].
	"Collect (name, value) pairs whose name passes filter()."
	memberPairs := OrderedCollection @env0:new.
	srcNs @env0:keysAndValuesDo: [:k :v |
		(filterFn == nil
			or: [(filterFn value: (Array @env0:with: k @env0:asString) value: nil) ___isTruthy___])
			ifTrue: [memberPairs @env0:add: (Array @env0:with: k @env0:asString with: v)]].
	"Sort by (value, name); on non-orderable values, sort by name alone.

	Compared through ___cmpEq___/___cmpLt___ -- the OPERATOR level -- and not
	by sending __eq__/__lt__ directly.  A dunder is allowed to answer the
	NotImplemented sentinel, and ``___isTruthy___'' on that SYMBOL is simply
	true, so the ordering silently succeeded on values that cannot be ordered
	at all and the by-name fallback never ran: complex members came out in
	value order (test_convert_complex).  The operator level is what turns the
	sentinel into the TypeError this ``on: AbstractException'' is here to
	catch."
	sortedPairs := [(memberPairs @env0:asSortedCollection: [:a :b |
		((a @env0:at: 2) ___cmpEq___: (b @env0:at: 2)) ___isTruthy___
			ifTrue: [(a @env0:at: 1) @env0:<= (b @env0:at: 1)]
			ifFalse: [((a @env0:at: 2) ___cmpLt___: (b @env0:at: 2)) ___isTruthy___]]) @env0:asArray]
		@env0:on: AbstractException
		do: [:ex |
			(memberPairs @env0:asSortedCollection: [:a :b | (a @env0:at: 1) @env0:<= (b @env0:at: 1)]) @env0:asArray].
	"Build the enum of this type (etype) from the sorted (name, value) pairs."
	newEnum := Enum ___grailFunctional: etype
		positional: (Array @env0:with: enumName @env0:asString with: sortedPairs)
		keywords: nil.
	"as_global=True: CPython injects the members into the source module's globals
	and rewrites member __repr__ to ``module.NAME'' (test_convert_str /
	test_convert_repr_and_str).  The class is built functionally (no __module__
	accessor), so record the source module name explicitly for the repr rewrite."
	((kwargs ~~ nil and: [kwargs @env0:includesKey: 'as_global'])
		and: [(kwargs @env0:at: 'as_global') ___isTruthy___]) ifTrue: [
		Enum ___grailMarkGlobalEnum: newEnum moduleName: modName @env0:asString].

	"EXPORT BACK TO THE MODULE -- the half that was missing.  Both CPython
	branches update the globals with the members (global_enum does it too),
	and then bind the class under ``name''; that order is CPython's, and it
	matters when the enum's name also names a member.

	Guarded on modGlobals: a caller may pass an explicit ``source'' with a
	module name that is not in sys.modules, and building the enum is still
	worth doing there.  Nothing to export to is not an error."
	modGlobals == nil ifFalse: [
		newEnum _member_map_ @env0:keysAndValuesDo: [:k :v |
			modGlobals __setitem__: k @env0:asString _: v].
		modGlobals __setitem__: enumName @env0:asString _: newEnum].
	^ newEnum
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__convert_: positional kw: kwargs
	"``cls._convert_(...)'' -- forward to the shared helper with etype = self,
	so the built enum is of the RECEIVER's type (Enum here)."

	^ Enum ___grailConvert: positional kw: kwargs forType: self
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__convert_: positional kw: kwargs
	"IntEnum._convert_(...) -- the IntEnum metaclass chain is AbstractPyInt-
	rooted and never reaches Enum class, so the forwarder is duplicated here."

	^ Enum ___grailConvert: positional kw: kwargs forType: self
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__convert_: positional kw: kwargs
	"StrEnum._convert_(...) -- duplicated onto the AbstractPyStr-rooted
	StrEnum metaclass (same reason as IntEnum)."

	^ Enum ___grailConvert: positional kw: kwargs forType: self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailStoreOverride: cls name: nm callable: aCallable
	"Record a functional-API dunder method (Enum('N', [('__str__', f)])):
	a callable under a dunder NAME is a method, not a member.  Per-session."

	| tbl per |
	tbl := SessionTemps @env0:current @env0:at: #GrailEnumOverrides otherwise: nil.
	tbl @env0:isNil ifTrue: [
		tbl := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailEnumOverrides put: tbl].
	per := tbl @env0:at: cls otherwise: nil.
	per @env0:isNil ifTrue: [per := KeyValueDictionary @env0:new. tbl @env0:at: cls put: per].
	per @env0:at: nm put: aCallable
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailCompileOverrideForwarder: cls name: nm
	"Compile an env-1 instance forwarder on cls for a functional-API dunder
	override (see ___grailInvokeOverride:args:).  __format__ takes a spec;
	__str__/__repr__ are 0-arg."

	| src |
	nm @env0:= '__format__'
		ifTrue: [src := '__format__: spec
	^ Enum ___grailInvokeOverride: self name: ''__format__'' args: { spec }']
		ifFalse: [src := nm @env0:, '
	^ Enum ___grailInvokeOverride: self name: ''' @env0:, nm @env0:, ''' args: #()'].
	cls ___compileMethod: src category: 'Grail-Enum Override'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailInstallClassDescriptor: cls name: nm descriptor: aDescriptor
	"Install a functional-API DESCRIPTOR member-dict entry (Enum('BaseEnum',
	{'first': enum.property(f)})) as a real descriptor on cls, so it behaves
	exactly like the class-syntax spelling of the same thing.

	The class-syntax path is the model: ``@enum.property def first'' is
	re-classed by the parser and ClassDefAst compiles it as an INSTANCE-side
	unary getter plus a raising 1-arg setter ('Grail-Property-ReadOnly').  That
	PAIR is what object>>___pyAttrLoad___ recognises as a value accessor, and it
	is consulted BEFORE the metaclass member accessor -- which is precisely
	CPython's _proto_member.__set_name__ redirect: a subclass member named
	``first'' answers the MEMBER off the class and the DESCRIPTOR off a member
	instance.  Compiling the same pair here buys that redirect for the
	functional API without a second mechanism.

	The descriptor object itself cannot be written into method source, so it
	lives in a per-session cls -> (name -> descriptor) table that the compiled
	getter reads back."

	| tbl per src |
	tbl := SessionTemps @env0:current @env0:at: #GrailEnumClassDescriptors otherwise: nil.
	tbl @env0:isNil ifTrue: [
		tbl := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailEnumClassDescriptors put: tbl].
	per := tbl @env0:at: cls otherwise: nil.
	per @env0:isNil ifTrue: [per := KeyValueDictionary @env0:new. tbl @env0:at: cls put: per].
	per @env0:at: nm @env0:asString put: aDescriptor.
	"Best-effort, like the member accessors: a name that is not a valid
	Smalltalk selector cannot be compiled, and must not abort the whole build."
	src := nm @env0:asString @env0:, '
	^ Enum ___grailClassDescriptorGet: self name: ''' @env0:, nm @env0:asString @env0:, ''''.
	[cls ___compileMethod: src category: 'Grail-Enum Descriptor']
		@env0:on: AbstractException do: [:e | nil].
	src := nm @env0:asString @env0:, ': ___1
	^ AttributeError ___signal___: ''property ''''' @env0:, nm @env0:asString
		@env0:, ''''' has no setter'''.
	[cls ___compileMethod: src category: 'Grail-Property-ReadOnly']
		@env0:on: AbstractException do: [:e | nil]
%

category: 'Grail-Enum Member'
classmethod: Enum
___grailClassDescriptorGet: instance name: nm
	"Read the descriptor installed by ___grailInstallClassDescriptor: for
	instance's class (or the nearest ancestor that has one) and ask it for the
	value -- Python's ``descriptor.__get__(instance, owner)''.  A CLASS method
	for the same reason ___grailInvokeOverride: is one: a data-mixed member is
	not Enum-rooted in the Smalltalk chain."

	| tbl walker desc |
	tbl := SessionTemps @env0:current @env0:at: #GrailEnumClassDescriptors otherwise: nil.
	desc := nil.
	(tbl ~~ nil) ifTrue: [
		walker := instance @env0:class.
		[walker ~~ nil and: [desc == nil]] @env0:whileTrue: [
			| per |
			per := tbl @env0:at: walker otherwise: nil.
			per == nil ifFalse: [desc := per @env0:at: nm @env0:asString otherwise: nil].
			walker := walker @env0:superClass]].
	desc == nil ifTrue: [
		^ AttributeError ___signal___: ''''
			@env0:, instance @env0:class @env0:name @env0:asString
			@env0:, ''' object has no attribute ''' @env0:, nm @env0:asString @env0:, ''''].
	^ instance ___descriptorGet___: desc
%

category: 'Grail-Enum Member'
classmethod: Enum
___grailInvokeOverride: member name: nm args: argArray
	"Call the functional-API dunder override for member's class (or nearest
	ancestor).  member is the enum member, bound as the callable's first arg.
	A CLASS method (reached via the always-global ``Enum'') so a data-mixed
	member -- IntEnum/IntFlag/StrEnum, whose class does NOT inherit Enum --
	can still invoke it; an instance method on Enum would DNU on such a member
	and get forwarded to its primitive int/str value (a SmallInteger that does
	not understand ___grailInvokeOverride:)."

	| tbl walker callable |
	tbl := SessionTemps @env0:current @env0:at: #GrailEnumOverrides otherwise: nil.
	callable := nil.
	(tbl ~~ nil) ifTrue: [
		walker := member @env0:class.
		[walker ~~ nil and: [callable == nil]] @env0:whileTrue: [
			| per |
			per := tbl @env0:at: walker otherwise: nil.
			per == nil ifFalse: [callable := per @env0:at: nm otherwise: nil].
			walker := walker @env0:superClass]].
	callable == nil ifTrue: [^ member __repr__].
	^ callable value: ({ member } @env0:, argArray) value: nil
%

! ------------------- Enum class: metaclass entry points

category: 'Grail-Class Attrs'
classmethod: Enum
_member_type_
	"The enum's mix-in data type: int for IntEnum-rooted classes,
	float for AbstractPyFloat-rooted, the data base for mixed enums
	(``class E(date, Enum)``), object for plain Enum/Flag.  Category
	MUST be Grail-Class Attrs so ``Cls._member_type_'' attribute reads
	PERFORM this getter instead of wrapping it as a BoundMethod
	(test_enum's _EnumTests.setUp gates on it -- 751 errors)."

	| walker |
	walker := self.
	[walker ~~ nil] @env0:whileTrue: [
		walker == Enum ifTrue: [^ object].
		walker == IntEnum ifTrue: [^ Integer].
		walker == AbstractPyInt ifTrue: [^ Integer].
		walker == AbstractPyFloat ifTrue: [^ Float].
		((walker == PythonInstance) or: [walker == Object]) ifTrue: [^ object].
		"For MI enums (``class E(date, Enum)``) the Smalltalk chain
		never passes Enum -- the first ancestor that is NOT itself an
		enum class (no member record, not Enum-chained) is the data
		base."
		((Enum ___grailRecordFor: walker) @env0:isNil
			and: [(walker @env0:inheritsFrom: Enum) not
			and: [walker ~~ self]]) ifTrue: [
				^ Enum ___grailNormalizeMemberType: walker].
		walker := walker @env0:superclass].
	^ object
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___pyClassDefined___: attrNames
	^ Enum ___grailClassDefinedFor: self names: attrNames
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMetaclassPythonName___
	"CPython's name for an enum's metaclass: type(Color), type(SomeIntEnum) and
	type(SomeStrEnum) are all ``EnumType''.  Grail has three separate metaclass
	roots -- a data-rooted enum's chain reaches IntEnum class or StrEnum class
	and never Enum class -- so each declares it, exactly as each declares its
	own ___pyClassDefined___: and __signature__.

	Read by object >> ___grailPythonMetaclassName___, which is what
	``type(Color).__name__'' and repr(type(Color)) answer."

	^ 'EnumType'
%

category: 'Grail-Enum Metaclass Property'
classmethod: Enum
__signature__
	"CPython's EnumType.__signature__ -- a property on the enum METACLASS, so
	``inspect.signature(Color)'' answers what CALLING the enum takes."
	^ Enum ___grailEnumSignatureFor: self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailEnumSignatureFor: cls
	"The signature of calling enum class cls, CPython's EnumType.__signature__:

	    if cls._member_names_:
	        return Signature([Parameter('values', Parameter.VAR_POSITIONAL)])
	    else:
	        return Signature([Parameter('new_class_name', POSITIONAL_ONLY),
	                          Parameter('names', POSITIONAL_OR_KEYWORD),
	                          Parameter('module', KEYWORD_ONLY, default=None),
	                          ... qualname, type, start=1, boundary=None])

	The split is the two things calling an enum can mean.  A class that HAS
	members is final, so the call is a value lookup -- ``Color(1)'', or
	``Cardinal(1, 0)'' for a multi-value member, hence VAR_POSITIONAL.  A
	MEMBER-LESS one is still open, so the call is the functional API,
	``Enum('Color', 'RED GREEN')''.  Grail's own value:value: draws exactly the
	same distinction, on the same test (see Enum class >> value:value:, which
	settles it by membership); this reports it.

	inspect is imported rather than assumed: the Signature and Parameter classes
	are its, and CPython's version of this method imports them too, at call
	time and for the same reason -- enum must not import inspect at module
	scope.  An import that fails leaves the attribute MISSING rather than
	answering something that is not a Signature, so inspect.signature() falls
	through to its ordinary path instead of raising out of a getattr."

	| insp paramCls sigCls kindOf mk |
	insp := [(importlib @env1:instance) @env1:_import_module: { 'inspect' } kw: nil]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	insp @env0:isNil ifTrue: [
		^ AttributeError ___signal___:
			'__signature__ (inspect is not importable)'].
	paramCls := insp ___pyAttrLoad___: #'Parameter'.
	sigCls := insp ___pyAttrLoad___: #'Signature'.
	kindOf := [:nm | paramCls ___pyAttrLoad___: nm].
	"Grail's Parameter takes ``default'' positionally where CPython's is
	keyword-only; three positionals is the spelling that works in both."
	mk := [:nm :kind :dflt |
		paramCls @env1:value: { nm. (kindOf @env0:value: kind). dflt } value: nil].
	(Enum ___grailMembers: cls) @env0:isEmpty ifFalse: [
		^ sigCls @env1:value: {
			{ paramCls @env1:value: { 'values'. kindOf @env0:value: #'VAR_POSITIONAL' }
				value: nil } } value: nil].
	^ sigCls @env1:value: { {
		paramCls @env1:value: { 'new_class_name'. kindOf @env0:value: #'POSITIONAL_ONLY' }
			value: nil.
		paramCls @env1:value: { 'names'. kindOf @env0:value: #'POSITIONAL_OR_KEYWORD' }
			value: nil.
		mk @env0:value: 'module' value: #'KEYWORD_ONLY' value: None.
		mk @env0:value: 'qualname' value: #'KEYWORD_ONLY' value: None.
		mk @env0:value: 'type' value: #'KEYWORD_ONLY' value: None.
		mk @env0:value: 'start' value: #'KEYWORD_ONLY' value: 1.
		mk @env0:value: 'boundary' value: #'KEYWORD_ONLY' value: None } } value: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailClassDefinedFor: cls names: attrNames
	"The one implementation of the enum ___pyClassDefined___: hook.

	Enum class, IntEnum class and StrEnum class each need their OWN hook -- a
	data-rooted enum's metaclass chain reaches IntEnum class or StrEnum class
	and never Enum class -- but the three had three copies of the same line, and
	adding the deferral below to Enum's only fixed pure enums: test_enum's
	test_extra_member_creation subclasses StrEnum, so it went on answering the
	old two members.  The three hooks now delegate here, as they already do for
	the class-body namespace (___grailNamespaceForClass:), so a change of policy
	cannot reach one root and miss the others.

	Build this enum's members from the class body -- unless a PYTHON metaclass
	is about to run over the class, in which case the build is deferred to the
	moment that metaclass delegates to ``super().__new__''.  That is where
	CPython builds them (EnumType.__new__), and a metaclass is entitled to add
	entries to the classdict first; see ___grailDeferMemberBuild___:names:."

	(Enum ___grailDeferMemberBuild___: cls names: attrNames) ifTrue: [^ cls].
	^ Enum ___grailBuildMembers: cls names: attrNames
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailDeferMemberBuild___: cls names: attrNames
	"Should cls's member build wait for its Python metaclass?  Records the
	deferral and answers true when so.

	CPython's order is metaclass __new__ FIRST, member build inside the
	``super().__new__'' it delegates to:

	    def __new__(metacls, cls, bases, classdict, **kwds):
	        for name in classdict.member_names:            # (1) mutate
	            classdict[f'{name}_DESC'] = ...
	        return super().__new__(metacls, cls, bases, classdict, **kwds)   # (2) build

	Grail's is inverted -- the body is compiled onto a real Smalltalk class
	before any hook can run, so ___pyClassDefined___: (this hook) fires first
	and ___grailDispatchMetaclass___ runs the Python metaclass afterwards.
	Building members here therefore answered the class-body names only, and the
	metaclass's injected entries arrived after the enum was already final:
	test_enum's test_extra_member_creation got ['ID', 'NAME'] where CPython
	gets ['ID', 'NAME', 'ID_DESC', 'NAME_DESC'].

	Re-running the build after the metaclass is NOT the fix.  ___grailBuildMembers:
	opens with CPython's _check_for_existing_members_, so a second pass over a
	now-member-bearing class raises ``cannot extend'' -- the build is
	once-only by construction, which is exactly why the ORDER has to move rather
	than the count of builds.

	The test is the same one ___grailDispatchMetaclass___ applies before it runs
	anything, and deliberately so: defer only when that dispatch is really going
	to happen, or the members would never be built at all.  A Smalltalk-written
	metaclass (Enum class itself) does not qualify -- it reaches the class
	through this hook and never through CPython's protocol."

	| meta st map |
	meta := cls ___grailMetaclass___.
	meta @env0:isNil ifTrue: [^ false].
	(meta @env0:isKindOf: Behavior) ifFalse: [^ false].
	(meta @env0:inheritsFrom: type) ifFalse: [^ false].
	"No pending namespace means ___grailDispatchMetaclass___ answers early and
	nothing will fulfil the deferral."
	(cls ___grailPendingNamespace___) @env0:isNil ifTrue: [^ false].
	"A metaclass with no __new__ of its own never reaches type >> __new__:_:_:_:.
	Its __init__ still runs, but that is after the class is finished in CPython
	too, so there is nothing to wait for."
	([meta ___pyAttrLoad___: #'__new__'] @env0:on: AbstractException do: [:e | e @env0:return: nil])
		@env0:isNil ifTrue: [^ false].
	st := SessionTemps @env0:current.
	map := st @env0:at: #'GrailEnumDeferredBuild' otherwise: nil.
	map @env0:isNil ifTrue: [
		map := IdentityKeyValueDictionary @env0:new.
		st @env0:at: #'GrailEnumDeferredBuild' put: map].
	map @env0:at: cls put: attrNames.
	^ true
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailRunDeferredMemberBuild___: cls namespace: ns
	"Fulfil a deferral recorded by ___grailDeferMemberBuild___:names:, if cls
	has one.  Answers cls either way, so it can sit inline.

	Called from type >> __new__:_:_:_: (the ``super().__new__'' a metaclass
	delegates to -- CPython's own build point) and, as a safety net, from
	___grailDispatchMetaclass___ for a metaclass __new__ that never delegates
	up.  The entry is REMOVED before the build runs, so neither caller can build
	twice and a build that raises does not leave a deferral behind for the next
	class statement to trip over.

	The names come from the NAMESPACE when it is an _EnumDict, not from the
	class-body list recorded at deferral time: the whole point is that the
	metaclass may have added entries, and _EnumDict.__setitem__ appends each one
	to member_names -- so the mapping already holds CPython's answer, in
	CPython's order.  Falls back to the recorded body names for a metaclass that
	replaced the namespace with a plain mapping."

	| st map recorded names |
	st := SessionTemps @env0:current.
	map := st @env0:at: #'GrailEnumDeferredBuild' otherwise: nil.
	map @env0:isNil ifTrue: [^ cls].
	(map @env0:includesKey: cls) ifFalse: [^ cls].
	recorded := map @env0:at: cls.
	map @env0:removeKey: cls ifAbsent: [nil].
	names := recorded.
	"Asked by PROTOCOL rather than by class: EnumDict is compiled in a later
	file than this one, so naming it here is an undefined symbol at install
	time -- and the question that matters is whether the mapping keeps
	member_names, not what it is."
	ns @env0:notNil ifTrue: [
		| mn |
		mn := [ns ___memberNames___] @env0:on: AbstractException do: [:e | e @env0:return: nil].
		"AS SYMBOLS: ___grailBuildMembers:names: indexes the class with them, and
		the codegen's own attrNames arrive that way.  member_names holds Python
		STRINGS, which reached the class-attribute read as ``for ID_DESC expected
		a Symbol''."
		mn @env0:isNil ifFalse: [
			names := (mn @env0:collect: [:n | n @env0:asString @env0:asSymbol])
				@env0:asArray]].
	Enum ___grailBuildMembers: cls names: names.
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailSetClassBoundary___: aBoundary
	"Metaclass-dispatched from ClassDefAst's ``boundary='' emission; record the
	override.  Also on IntEnum/StrEnum class so an IntFlag/data-mixed flag (whose
	metaclass is NOT Enum class) resolves the same setter."
	^ Enum ___grailSetClassBoundary: self to: aBoundary
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__new__: aValue
	^ Enum ___grailLookupValue: self value: aValue
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
value: positional value: keywords
	"Generic class-call path: Color(v) value-lookup, or the functional API --
	Enum('Name', names, **kw) -- when extra arguments arrive.

	CPython also lets a CONCRETE enum be called with several positional VALUES,
	which pack into a tuple: Cardinal(1, 0) looks up the member whose value is
	(1, 0), like Cardinal((1, 0)).  This must NOT be confused with the
	functional API, whose first argument is the new class NAME (a string) and
	which is also used in a subclass form on a member-bearing class
	(BaseEnum('MainEnum', {...})).  So take the value-packing path only when the
	first positional is not a class-name string, the receiver already has
	members, and no kwargs are present; every other call keeps its existing
	route.  Without the packing path, Cardinal(1, 0) went to the functional API,
	which tried to iterate the second positional (a plain int) and leaked a raw
	Smalltalk error (``a SmallInteger does not understand #do:'')."
	"CPython: an enum that already HAS members is final, so a call on it is
	ALWAYS a lookup -- ``Color('Foo', ('pink', 'black'))'' raises ValueError
	rather than defining a new enum (test_extending).  Grail used to ask whether
	the arguments LOOKED like the functional API, first by refusing any string
	name, then (once a multi-value member lookup needed one) by asking whether
	the second argument could be a names spec.  Both readings let the
	member-bearing case slip through to ___grailFunctional:, which happily built
	``<enum 'Foo'>''.  Membership is the whole test now, as it is in CPython;
	the functional API on a MEMBER-LESS class -- BaseEnum('MainEnum', {...}),
	whose only entries are descriptors -- is untouched."
	((positional @env0:size @env0:>= 2)
		and: [(keywords == nil or: [keywords @env0:isEmpty])
		and: [(Enum ___grailMembers: self) @env0:notEmpty]])
		ifTrue: [ | packed mt |
			packed := (Python @env0:at: #tuple otherwise: Array) @env0:withAll: positional.
			^ [Enum ___grailLookupValue: self value: packed]
				@env0:on: AbstractException do: [:e |
					"A MIXED-IN enum stores member_type(*args) as the value, not the
					argument tuple, so the several positionals have to be run through
					the constructor before the lookup can match: ``class NEI(NamedInt,
					Enum): y = ('the-y', 2)'' has _value_ NamedInt('the-y', 2), and
					unpickling a member whose mixin supplies its own __reduce_ex__
					calls NEI('the-y', 2) (test_subclasses_with_reduce_ex).  The tuple
					lookup is tried FIRST so a plain multi-value member -- Cardinal(1,
					0), whose value IS the tuple -- keeps its existing answer."
					mt := Enum ___grailMemberTypeFor: self.
					(mt @env0:notNil and: [mt ~~ object])
						ifTrue: [
							"A member type that cannot take these arguments at all
							(``str('NewSE', [...])'' -> ``decoding str is not supported'')
							means the retry has nothing to say; the ORIGINAL ``not a valid''
							ValueError is still the right answer and must not be replaced by
							the constructor's complaint."
							[Enum ___grailLookupValue: self
								value: (Enum ___grailConstructMemberValueStrict: mt args: packed)]
								@env0:on: AbstractException do: [:ctorErr |
									(ctorErr isKindOf: ValueError)
										ifTrue: [ctorErr @env0:pass]
										ifFalse: [e @env0:pass]]]
						ifFalse: [e @env0:pass]]].
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)
%

category: 'Grail-Flag Member'
classmethod: Flag
___methodDocTable___
	"``__doc__'' for Flag's own instance-side methods, overriding the enum
	metaclass entries Enum's table supplies for the same NAMES.

	Both are needed and neither is redundant.  The table is keyed by name only,
	so ``__contains__'' on a Flag would otherwise report the metaclass's text --
	which is wrong for a Flag member, whose ``__contains__'' really is a
	different method with a different meaning.  CPython answers Flag's text for
	the CLASS reading too (``Flag.__contains__'' finds the instance method on
	Flag's mro before it reaches the metatype), so overriding both readings here
	is not a compromise: it is what CPython does.

	The walk falls back correctly for the names this table omits.
	___methodDocForClass___: continues to the next class in the chain whenever a
	table it finds has no entry, so ``__getitem__'' and ``__len__'' on a Flag
	still reach Enum's table."

	^ (KeyValueDictionary @env0:new)
		@env0:at: '__contains__' put: '
Returns True if self has at least the same flags set as other.
';
		@env0:at: '__iter__' put: '
Returns flags in definition order.
';
		@env0:yourself
%
category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___methodDocTable___
	"IntEnum is a SEPARATE metaclass root -- its Smalltalk chain is rooted at
	AbstractPyInt and never passes Enum -- so it cannot inherit Enum's table and
	has to name it.

	Delegated rather than duplicated, so the two cannot drift.  Correct for all
	four names here because ``int'' defines none of them: CPython's lookup finds
	nothing on IntEnum's mro and falls through to the metatype, which is exactly
	what Enum's table describes.  StrEnum is deliberately NOT given the same
	delegation -- ``str'' DOES define all four, so CPython answers str's
	docstrings there, not the metaclass's; see the fixture, which records that
	as an open gap rather than papering over it with the wrong text."

	^ Enum ___methodDocTable___
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___methodSignatureTable___
	"See ___methodDocTable___ above for why IntEnum names Enum's tables."

	^ Enum ___methodSignatureTable___
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___methodReceiverTable___
	"See ___methodDocTable___ above for why IntEnum names Enum's tables."

	^ Enum ___methodReceiverTable___
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___methodDocTable___
	"``__doc__'' for the enum METACLASS methods, which Grail implements in
	Smalltalk -- so no FunctionDefAst ran for them and ClassDefAst's table, which
	captures the docstring of a class-body def, has nothing to capture.  Declared
	by hand for the same reason builtins_docstrings.gs and functools'
	___methodSignatureTable___ are: a class implemented in Smalltalk has to
	supply the metadata the compiler would otherwise have derived from source.

	Found through the ordinary chain walk BoundMethod >> ___methodDocForClass___:
	does, so nothing else has to know these are special.

	The strings are CPython's own text, transcribed from the running interpreter
	rather than written here -- they are OBSERVABLE BEHAVIOUR (test_enum's
	test_pydoc compares help(Color) byte for byte), so a paraphrase would be a
	different answer that merely looks similar.  The fixture asserts them against
	the host CPython, which is what keeps them honest as CPython edits them
	between releases.

	KEYED BY NAME ONLY, which is the shape of the mechanism and its one sharp
	edge: an instance-side method of the same name on a class BELOW this one
	shares the key.  ``Flag.__contains__'' is exactly that -- a real
	instance-side method with its own CPython docstring -- so Flag declares its
	own table, and the nearest-first walk gives a Flag member Flag's text while a
	plain Enum still gets EnumType's.  What neither can express is a class that
	needs BOTH readings of one name; see the note on Flag's table."

	^ (KeyValueDictionary @env0:new)
		@env0:at: '__contains__' put: 'Return True if `value` is in `cls`.

`value` is in `cls` if:
1) `value` is a member of `cls`, or
2) `value` is the value of one of the `cls`''s members.
3) `value` is a pseudo-member (flags)
';
		@env0:at: '__getitem__' put: '
Return the member matching `name`.
';
		@env0:at: '__iter__' put: '
Return members in definition order.
';
		@env0:at: '__len__' put: '
Return the number of members (no aliases)
';
		@env0:at: '__members__' put: '
Returns a mapping of member name->value.

This mapping lists all enum members, including aliases.  Note that
this is a read-only view of the internal mapping.
';
		@env0:yourself
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___methodSignatureTable___
	"Parameter specs for the enum metaclass methods, in the same triple form
	``(name, kind-index, default-source-text)'' ClassDefAst emits for a
	class-body def and functools hand-declares for cmp_to_key.

	The RECEIVER is deliberately absent -- the table drops it and
	___methodReceiverTable___ puts it back for an unbound read, which is how
	``signature(Cls.method)'' shows ``cls'' while the bound
	``help(Color)'' rendering shows ``__contains__(value)''.  Without this
	every one of them rendered as ``()''."

	^ (KeyValueDictionary @env0:new)
		@env0:at: '__contains__' put: { { 'value' . 1 } };
		@env0:at: '__getitem__' put: { { 'name' . 1 } };
		@env0:at: '__iter__' put: { };
		@env0:at: '__len__' put: { };
		@env0:yourself
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___methodReceiverTable___
	"The receiver name ___methodSignatureTable___ drops, so an UNBOUND read can
	put it back.  CPython calls it ``cls'' for these, not ``self'': they are
	metaclass methods whose receiver is the enum class."

	^ (KeyValueDictionary @env0:new)
		@env0:at: '__contains__' put: 'cls';
		@env0:at: '__getitem__' put: 'cls';
		@env0:at: '__iter__' put: 'cls';
		@env0:at: '__len__' put: 'cls';
		@env0:yourself
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__contains__: aValue
	"``x in Color'': true for a member of this enum, or (3.12
	semantics) a raw value some member wraps.  For Flag classes an int
	whose bits the named members cover is also in (``7 in Perm'' with
	R=1/W=2/X=4)."

	| rec |
	"Any instance of this enum class -- including Flag composites and
	aliases, which are not in the canonical members list -- is in
	(membership by instance, CPython 3.12)."
	(aValue isKindOf: self) ifTrue: [^ true].
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	((aValue isKindOf: Integer)
		and: [Enum ___grailIsFlagClass: self]) ifTrue: [
		| mask |
		mask := Enum ___grailFlagMask: self.
		^ (aValue @env0:bitAnd: mask) @env0:= aValue].
	^ false
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__reversed__
	"reversed(Color) -- members in reverse definition order."

	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__getitem__: aName
	^ Enum ___grailLookupName: self name: aName
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__iter__
	^ (Enum ___grailMembers: self) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___unpackSequence___
	"``R, W, X = Perm'': the unpack codegen indexes with __getitem__:,
	which on an enum CLASS is name lookup (Perm[0] -> KeyError: 0).
	Materialize the canonical members in definition order instead --
	CPython unpacks the class via __iter__."

	^ list @env0:withAll: (Enum ___grailMembers: self)
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__len__
	^ (Enum ___grailMembers: self) @env0:size
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__bool__
	"CPython's EnumType.__bool__: an enum CLASS is always truthy, even
	with zero members.  Without this, bool(cls) fell through to the
	class-side __len__ (PEP-3119 fallback) and an empty enum class was
	falsy -- test_bool_is_true across every enum flavor."

	^ true
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__repr__
	"repr(cls) for an enum class: <enum 'Color'> / <flag 'Color'>
	(CPython EnumType.__repr__)."

	^ ((Enum ___grailIsFlagClass: self)
		ifTrue: ['<flag ''']
		ifFalse: ['<enum '''])
			@env0:, self @env0:name @env0:asString @env0:, '''>'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__str__
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__format__: aSpec
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
mro
	"cls.mro() -- the resolution order as a LIST (CPython type.mro())."

	^ list @env0:withAll: (self __mro__)
%

category: 'Grail-Class Attrs'
classmethod: Enum
_member_names_
	"Canonical (non-alias) member names in definition order.  Category
	Grail-Class Attrs so ``cls._member_names_'' attribute reads PERFORM
	this getter instead of wrapping it as a BoundMethod (same contract
	as _member_type_ above)."

	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ list @env0:withAll: #()].
	^ list @env0:withAll: ((rec @env0:at: 3)
		@env0:collect: [:m | m @env0:dynamicInstVarAt: #name])
%

category: 'Grail-Class Attrs'
classmethod: Enum
__new__
	"``SomeEnum.__new__'' is ALWAYS Enum.__new__ (CPython EnumType.__new__:
	whatever __new__ built the members is stashed as ``_new_member_'' and the
	class's own __new__ is replaced with Enum's, so
	``assertIs(NEI.__new__, Enum.__new__)'' holds even for a data-mixed enum
	whose mix-in defines one -- test_enum's six test_subclasses_with_* cases).

	Answering the handle for ENUM rather than for the receiver is the whole
	point: a BoundMethod is equal by receiver+selector, so every enum class has
	to name the same receiver for the identity to hold.  Calling it still does
	the right thing -- with arguments it dispatches to Enum class>>___new__:kw:,
	the by-value lookup that IS Enum.__new__.

	Category MUST be Grail-Class Attrs: that is the category
	object>>___pyAttrLoad___ PERFORMS on a class receiver rather than wrapping
	as a BoundMethod (same contract as _member_type_ / _member_names_ below).
	___grailInstallClassProtocol: copies this onto the metaclass of a data-mixed
	enum, which does not inherit Enum class."

	^ BoundMethod receiver: Enum selector: #'__new__'
%

category: 'Grail-Class Attrs'
classmethod: Enum
_new_member_
	"The __new__ used to allocate members -- the mix-in data type's __new__
	(int/str/float/... for a data enum) or object.__new__ for a plain enum.
	CPython's EnumType._new_member_; test_enum's enum_dir helper reads it, so
	it must at least RESOLVE.  Category Grail-Class Attrs so ``cls._new_member_''
	PERFORMs this getter rather than wrapping it as a BoundMethod."

	^ (self _member_type_) ___pyAttrLoad___: #'__new__'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__dir__
	"dir(EnumClass) -- CPython EnumType.__dir__.  Built to mirror test_enum's
	``enum_dir'' helper EXACTLY, so ``dir(cls) == enum_dir(cls)'' holds by
	construction (both read the same _member_names_/_member_type_): a fixed set
	of dunders + the canonical member names, __init_subclass__ always, __new__
	only when this enum does not construct members with object's, and for a
	data-mixed enum unioned with dir(member_type).

	__new__ used to be added unconditionally, reasoning that enum_dir's
	``cls._new_member_ is not object.__new__'' was always true because every
	method access minted a fresh handle.  Handles are now interned per (class,
	selector), so that test answers honestly: a PLAIN enum's _new_member_ IS
	object.__new__, enum_dir omits __new__, and adding it here made dir(cls) a
	strict superset.

	The condition is spelled with _member_type_ rather than by comparing
	_new_member_ to object.__new__ directly.  It is the same question -- an enum
	constructs with something other than object.__new__ exactly when a data type
	is mixed in -- and _member_type_ is the probe this method already relies on
	just below, whereas reading _new_member_ from here raises.  A class that
	defines its own __new__ without mixing in a type is covered by the second
	clause.

	__init_subclass__ stays unconditional because it genuinely differs for every
	enum: Enum supplies its own, so enum_dir's identity test against object's is
	false for plain and mixed alike (verified, not assumed)."

	| interesting mt |
	interesting := Set @env0:new.
	#('__class__' '__contains__' '__doc__' '__getitem__' '__iter__' '__len__'
	  '__members__' '__module__' '__name__' '__qualname__' '__init_subclass__')
		@env0:do: [:d | interesting @env0:add: d].
	((self _member_type_) ~~ object
		or: [Enum ___grailUserProvides: self selector: #'__new__'])
			ifTrue: [interesting @env0:add: '__new__'].
	(Enum ___grailMembers: self) @env0:do: [:m |
		interesting @env0:add: (m @env0:dynamicInstVarAt: #name) @env0:asString].
	"CPython EnumType.__dir__ ALSO surfaces __init__/__format__/__repr__/__str__
	when the class OVERRIDES them (getattr(cls, m) is not getattr(Enum, m)).  The
	test's ``enum_dir'' helper omits this loop -- it only matters for a class that
	actually defines its own, which the dir_on_class/dir_on_sub fixtures do not, so
	adding it keeps ``dir == enum_dir'' there while fixing test_dir_with_custom_
	dunders.  (__new__ is handled by the always-added set above.)"
	#('__init__' '__format__' '__repr__' '__str__') @env0:do: [:d |
		| sel |
		"A user __init__ compiles to the Grail init selector ___init__:kw:, not
		#__init__ (the others keep their Python dunder selector)."
		sel := (d @env0:= '__init__') ifTrue: [#'___init__:kw:'] ifFalse: [d @env0:asSymbol].
		(Enum ___grailUserProvides: self selector: sel)
			ifTrue: [interesting @env0:add: d]].
	mt := self _member_type_.
	mt == object ifFalse: [
		(mt @env1:__dir__) @env0:do: [:d | interesting @env0:add: d @env0:asString]].
	^ list @env0:withAll: interesting @env0:asSortedCollection
%

category: 'Grail-Class Attrs'
classmethod: Enum
_member_map_
	"name -> member mapping, aliases included (CPython's __members__
	backing store)."

	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 2
%

category: 'Grail-Enum Metaclass Property'
classmethod: Enum
__members__
	"CPython EnumType.__members__: a read-only (MappingProxyType) view of
	the name -> member map -- ``cls.__members__''.  Grail returns a SNAPSHOT
	copy of _member_map_: the tests only READ it (inspect.getmembers,
	dict(cls.__members__), iteration), and copying keeps a caller from
	mutating the live registry map through what CPython makes read-only."

	^ self _member_map_ @env0:copy
%

category: 'Grail-Class Attrs'
classmethod: Enum
_flag_mask_
	"CPython keeps three masks on every Flag CLASS, built up member by member in
	_proto_member.__set_name__:

	    enum_class._flag_mask_ |= value
	    if _is_single_bit(value):
	        enum_class._singles_mask_ |= value
	    enum_class._all_bits_ = 2 ** ((enum_class._flag_mask_).bit_length()) - 1

	Grail derives them from the registry record instead of accumulating them,
	which answers the same at every point -- the record is live throughout
	construction, so a __new__ or __init__ that reads one mid-build sees the
	members built so far, exactly as CPython's running total does.

	_flag_mask_ is the OR of EVERY named member's value, multi-bit ones
	included; ___grailFlagNamedMask: already computes it for the KEEP invert.

	A non-flag enum has none of the three -- CPython only sets them under
	``if issubclass(enum_class, Flag)'' -- so reading one is an AttributeError
	there, as it is in CPython."

	^ Enum ___grailFlagMaskAttr: self named: #'_flag_mask_'
%

category: 'Grail-Class Attrs'
classmethod: Enum
_singles_mask_
	"OR of the SINGLE-BIT members only -- CPython's _singles_mask_, the space a
	STRICT/CONFORM flag inverts within.  See _flag_mask_ above."

	^ Enum ___grailFlagMaskAttr: self named: #'_singles_mask_'
%

category: 'Grail-Class Attrs'
classmethod: Enum
_all_bits_
	"``2 ** (_flag_mask_.bit_length()) - 1'' -- every bit position up to the
	highest one any member uses, filled in.  A flag whose single member is
	1 << 97 has an _all_bits_ of 2**98 - 1 (test_flag_with_custom_new), so this
	is emphatically NOT the mask itself.  See _flag_mask_ above."

	^ Enum ___grailFlagMaskAttr: self named: #'_all_bits_'
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailFlagMaskAttr: cls named: aName
	"Shared body of _flag_mask_ / _singles_mask_ / _all_bits_: refuse the lot on
	a non-flag enum, then answer the one asked for.

	The refusal matters as much as the values.  CPython sets these three only
	for a Flag subclass, so ``PlainEnum._all_bits_'' is an AttributeError there;
	answering 0 would quietly make every enum look like an empty flag."

	| mask |
	(Enum ___grailIsFlagClass: cls) ifFalse: [
		^ AttributeError ___signal___: 'type object '''
			@env0:, cls @env0:name @env0:asString @env0:, ''' has no attribute '''
			@env0:, aName @env0:asString @env0:, ''''].
	aName @env0:= #'_singles_mask_' ifTrue: [
		^ Enum ___grailFlagSingleBitMask: cls].
	mask := Enum ___grailFlagNamedMask: cls.
	aName @env0:= #'_flag_mask_' ifTrue: [^ mask].
	"bit_length: highBit is 1-based and answers 0 for 0, which is the same
	number Python's bit_length() gives."
	^ (1 @env0:bitShift: mask @env0:highBit) @env0:- 1
%

category: 'Grail-Class Attrs'
classmethod: Enum
_value2member_map_
	"value -> member mapping (canonical members only)."

	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 1
%

category: 'Grail-Class Attrs'
classmethod: Enum
_value_repr_
	"CPython stores the mix-in type's repr function here; Grail's repr
	dispatch doesn't need it, and the tests only pass it along as an
	assertion MESSAGE -- None is faithful enough."

	^ None
%

! ------------------- IntEnum class: thin delegators to Enum's shared logic

category: 'Grail-Class Attrs'
classmethod: IntEnum
_member_type_
	"IntEnum members ARE ints (AbstractPyInt storage)."

	^ Integer
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___grailMetaclassNamespace___
	"""The EnumDict a IntEnum body runs in.  Its own copy, because a data-rooted
	enum's Smalltalk metaclass chain does not pass ``Enum class'' -- the same
	reason ___pyClassDefined___: below is redeclared here."""

	^ Enum ___grailNamespaceForClass: self
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___pyClassDefined___: attrNames
	"Own hook because a data-rooted enum's metaclass chain reaches IntEnum class,
	not Enum class; the policy itself lives in one place."
	^ Enum ___grailClassDefinedFor: self names: attrNames
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___grailMetaclassPythonName___
	"CPython's name for an enum's metaclass: type(Color), type(SomeIntEnum) and
	type(SomeStrEnum) are all ``EnumType''.  Grail has three separate metaclass
	roots -- a data-rooted enum's chain reaches IntEnum class or StrEnum class
	and never Enum class -- so each declares it, exactly as each declares its
	own ___pyClassDefined___: and __signature__.

	Read by object >> ___grailPythonMetaclassName___, which is what
	``type(Color).__name__'' and repr(type(Color)) answer."

	^ 'EnumType'
%

category: 'Grail-Enum Metaclass Property'
classmethod: IntEnum
__signature__
	"Own hook, same reason as ___pyClassDefined___: above -- a data-rooted
	enum's metaclass chain never reaches Enum class."
	^ Enum ___grailEnumSignatureFor: self
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___grailSetClassBoundary___: aBoundary
	"IntFlag's metaclass chains here (IntEnum class), not Enum class -- so an
	``class E(IntFlag, boundary=STRICT)'' resolves the boundary setter."
	^ Enum ___grailSetClassBoundary: self to: aBoundary
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__new__: aValue
	^ Enum ___grailLookupValue: self value: aValue
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
from_bytes: bytesArg _: byteorder
	"int.from_bytes, inherited by IntEnum.  Grail's ``int'' is kernel
	Integer (which owns from_bytes), but IntEnum roots at AbstractPyInt, a
	separate class -- so IntEnum does not inherit it and ``IntStooges.
	from_bytes'' was an AttributeError.  Delegate the byte decoding to
	Integer, then -- as CPython int.from_bytes does for a subclass (calls
	cls(result)) -- resolve the int through this enum, yielding the MEMBER
	(or ValueError for an unknown value)."

	^ self from_bytes: bytesArg _: byteorder _: false
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
from_bytes: bytesArg _: byteorder _: signed
	| raw |
	raw := Integer @env0:perform: #'from_bytes:_:_:' env: 1
		withArguments: { bytesArg. byteorder. signed }.
	^ Enum ___grailLookupValue: self value: raw
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
value: positional value: keywords
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__contains__: aValue
	| rec |
	"Any instance of this enum class -- including Flag composites and
	aliases, which are not in the canonical members list -- is in
	(membership by instance, CPython 3.12)."
	(aValue isKindOf: self) ifTrue: [^ true].
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	((aValue isKindOf: Integer)
		and: [Enum ___grailIsFlagClass: self]) ifTrue: [
		| mask |
		mask := Enum ___grailFlagMask: self.
		^ (aValue @env0:bitAnd: mask) @env0:= aValue].
	^ false
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__reversed__
	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__getitem__: aName
	^ Enum ___grailLookupName: self name: aName
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__iter__
	^ (Enum ___grailMembers: self) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
___unpackSequence___
	"Duplicate of Enum class>>___unpackSequence___ -- the IntEnum
	metaclass chain is AbstractPyInt-rooted and never passes Enum's
	class side (the established duplicate-onto-int-chain idiom)."

	^ list @env0:withAll: (Enum ___grailMembers: self)
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__len__
	^ (Enum ___grailMembers: self) @env0:size
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__bool__
	"An enum class is always truthy (EnumType.__bool__); see Enum side."

	^ true
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__repr__
	^ ((Enum ___grailIsFlagClass: self)
		ifTrue: ['<flag ''']
		ifFalse: ['<enum '''])
			@env0:, self @env0:name @env0:asString @env0:, '''>'
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__str__
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__format__: aSpec
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
mro
	^ list @env0:withAll: (self __mro__)
%

category: 'Grail-Class Attrs'
classmethod: IntEnum
_member_names_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ list @env0:withAll: #()].
	^ list @env0:withAll: ((rec @env0:at: 3)
		@env0:collect: [:m | m @env0:dynamicInstVarAt: #name])
%

category: 'Grail-Class Attrs'
classmethod: IntEnum
_member_map_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 2
%

category: 'Grail-Class Attrs'
classmethod: IntEnum
_value2member_map_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 1
%

category: 'Grail-Class Attrs'
classmethod: IntEnum
_value_repr_
	^ None
%

! ===============================================================================
! Member protocol (instance side)
! ===============================================================================

! ------------------- Enum members: distinct markers, identity equality

category: 'Grail-Enum Member'
method: Enum
name
	^ self @env0:dynamicInstVarAt: #name
%

category: 'Grail-Enum Member'
method: Enum
value
	^ self @env0:dynamicInstVarAt: #value
%

category: 'Grail-Enum Member'
method: Enum
_name_
	"CPython's canonical sunder accessor (member._name_ is the primitive
	behind the .name property; test bodies read it directly)."

	^ self @env0:dynamicInstVarAt: #name
%

category: 'Grail-Enum Member'
method: Enum
_value_
	^ self @env0:dynamicInstVarAt: #value
%

category: 'Grail-Enum Member'
method: Enum
_add_alias_: name
	"CPython Enum._add_alias_ (via EnumType._add_member_): register an
	additional NAME for this member so ``Cls['NAME']'' and ``Cls.NAME''
	both resolve to self.  A name already bound to a DIFFERENT member
	raises NameError; re-binding to the same member is a no-op."

	| cls rec byName nm existing |
	cls := self @env0:class.
	nm := name @env0:asString.
	rec := Enum ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ self].
	byName := rec @env0:at: 2.
	(byName @env0:includesKey: nm) ifTrue: [
		existing := byName @env0:at: nm.
		existing == self ifTrue: [^ self].
		^ NameError ___signal___: nm @env0:printString @env0:, ' is already bound: '
			@env0:, ([existing @env1:__repr__ @env0:asString]
				@env0:on: AbstractException do: [:e | existing @env0:printString])].
	byName @env0:at: nm put: self.
	"Attribute access (``Cls.NAME'') -- store on the class exactly like
	setattr(cls, name, member) (lands in the per-class ___dynInstVars___ holder;
	NAME has no compiled accessor, so this is the only reader path)."
	cls @env0:perform: #'___pyAttrStore___:put:' env: 1 withArguments: { nm. self }.
	^ self
%

category: 'Grail-Enum Member'
method: Enum
_add_value_alias_: value
	"CPython Enum._add_value_alias_: register an additional VALUE that
	resolves to this member -- ``Cls(value)'' -> self.  A value already
	bound to a DIFFERENT member raises ValueError; the same member is a
	no-op.  May be called AFTER creation (the registry record is live) OR
	from inside a member ``__new__'' DURING class build (the record is not
	registered until the whole build loop finishes) -- in the latter case
	the alias is parked on the member and ___grailBuildMembers: drains it
	into the value map once that map is live."

	| cls rec byValue existing |
	cls := self @env0:class.
	rec := Enum ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [ | pend |
		pend := [self @env0:dynamicInstVarAt: #'___grailPendingValueAliases']
			@env0:on: AbstractException do: [:e | nil].
		pend @env0:isNil ifTrue: [
			pend := OrderedCollection @env0:new.
			self @env0:dynamicInstVarAt: #'___grailPendingValueAliases' put: pend].
		pend @env0:add: value.
		^ self].
	byValue := rec @env0:at: 1.
	(byValue @env0:includesKey: value) ifTrue: [
		existing := byValue @env0:at: value.
		existing == self ifTrue: [^ self].
		^ ValueError ___signal___: value @env0:printString @env0:, ' is already bound: '
			@env0:, ([existing @env1:__repr__ @env0:asString]
				@env0:on: AbstractException do: [:e | existing @env0:printString])].
	byValue @env0:at: value put: self.
	^ self
%

category: 'Grail-Enum Member'
method: Enum
__repr__
	| nm val |
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	nm := self @env0:dynamicInstVarAt: #name.
	"CPython Enum.__repr__ renders the value with repr(): <Color.RED: 'red'>,
	<MainEnum.third: datetime.date(2009, 1, 1)>.  Use the value's Python repr,
	not Smalltalk printString (which gives ``aPyDate'' / ``atuple( 1, 2)'').
	A nil (Smalltalk UndefinedObject) value -- a partially reconstructed member
	-- has no Python __repr__ that returns a sane string, so keep printString
	(``nil'') there; fall back to printString on any __repr__ error too."
	val := (self @env0:dynamicInstVarAt: #value).
	val := val @env0:isNil
		ifTrue: ['nil']
		ifFalse: [ | dcRepr |
			"CPython ``v_repr = self.__class__._value_repr_ or repr''.  The one
			answer _find_data_repr_ gives that is not plain repr is the
			dataclass substitute; see ___grailFindDataRepr:."
			dcRepr := ((Enum ___grailFindDataRepr: self @env0:class) == #dataclass)
				ifTrue: [Enum ___grailDataclassRepr: val]
				ifFalse: [nil].
			dcRepr @env0:isNil
				ifFalse: [dcRepr]
				ifTrue: [[val @env1:__repr__ @env0:asString]
					@env0:on: AbstractException do: [:e | val @env0:printString]]].
	"A member can reach here with no stored #name -- e.g. a malformed/partial
	object produced by a reconstruction Grail could not complete (pickle-by-
	name of a mixed-in data-subclass enum whose member_type() construction is
	unimplemented).  repr must still return a Python string; a nil name would
	make `, nm' fail inside Unicode concatenation (`nil doesNotUnderstand
	#do:'), leaking a raw Smalltalk error out of a mere repr -- typically
	while unittest formats an assertion failure.  Fall back to the value repr."
	nm @env0:isNil ifTrue: [ nm := val ].
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, nm @env0:, ': ' @env0:, val @env0:, '>'
%

category: 'Grail-Enum Member'
method: Enum
__str__
	^ self @env0:class @env0:name @env0:asString @env0:, '.' @env0:,
		(self @env0:dynamicInstVarAt: #name)
%

category: 'Grail-Enum Member'
method: Enum
__dir__
	"dir(member) -- delegate to the shared member-dir builder.  Installed on
	every enum class instance-side by ___grailInstallEnumOutput: so IntEnum /
	StrEnum / data-mixed members (which do not inherit Enum's instance side) get
	it too."

	^ Enum ___grailMemberDir: self
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailMemberDir: aMember
	"dir(aMember) -- CPython Enum member __dir__, built to mirror test_enum's
	``member_dir'' helper so ``dir(m) == member_dir(m)'' holds by construction.
	Base: the fixed enum-instance names, plus dir(member_type) for a data-mixed
	member (member_dir's mixed branch bases off dir(m) itself, so the walk below
	is idempotent and any reasonable base matches).  Then, for each class in the
	member's mro, add every non-underscore name in that class's __dict__ that is
	not a member; an enum.property that IS a member with no getter is removed
	instead.  Grail compiles @enum.property to a value-attr method, not a stored
	PropertyDescriptor, so that branch is effectively the non-member ADD path --
	same as member_dir sees.  Non-underscore instance attributes carried by this
	member (obj.description set in a custom __new__) are included
	(test_dir_on_sub_..._instance_dict_on_super)."

	| cls memberType memberMap allowed propClass |
	cls := aMember @env0:class.
	memberType := cls _member_type_.
	memberMap := cls _member_map_.
	propClass := Python @env0:at: #AbstractPropertyDescriptor.
	allowed := Set @env0:new.
	#('__class__' '__doc__' '__eq__' '__hash__' '__module__' 'name' 'value')
		@env0:do: [:n | allowed @env0:add: n].
	memberType == object ifFalse: [
		[(memberType @env1:__dir__) @env0:do: [:n | allowed @env0:add: n @env0:asString]]
			@env0:on: AbstractException do: [:ex | nil]].
	"Non-underscore instance attributes carried by this member."
	[ | pairs i |
	pairs := aMember @env0:dynamicInstVarPairs.
	i := 1.
	[i @env0:< pairs @env0:size] @env0:whileTrue: [ | ds |
		ds := (pairs @env0:at: i) @env0:asString.
		((ds @env0:size @env0:> 0) and: [(ds @env0:at: 1) @env0:~= $_])
			ifTrue: [allowed @env0:add: ds].
		i := i @env0:+ 2] ] @env0:on: AbstractException do: [:ex | nil].
	"mro walk -- member.__class__.mro(), each class's __dict__."
	((Python @env0:at: #importlib) @env0:___mroOf___: cls) @env0:do: [:c | | dict |
		dict := [c ___classDict___] @env0:on: AbstractException do: [:ex | nil].
		dict @env0:isNil ifFalse: [
			dict @env0:keysAndValuesDo: [:aName :obj | | ns |
				ns := aName @env0:asString.
				((ns @env0:size @env0:> 0) and: [(ns @env0:at: 1) @env0:~= $_]) ifTrue: [
					(obj isKindOf: propClass)
						ifTrue: [
							"_rawFget, not fget: the public reader is env 1 ONLY, so
							the env-0 send here was a MessageNotUnderstood for every
							descriptor that reached it.  Latent until Enum carried
							``name'' and ``value'' as real descriptors and put two in
							the very __dict__ this walks -- then 72 test_enum tests
							died in Smalltalk.  Same slot, same nil-when-absent
							meaning, which is what CPython's ``obj.fget is not None''
							asks."
							((obj @env0:_rawFget @env0:notNil)
								or: [(memberMap @env0:includesKey: ns) @env0:not])
								ifTrue: [allowed @env0:add: ns]
								ifFalse: [allowed @env0:remove: ns @env0:ifAbsent: []]]
						ifFalse: [
							(memberMap @env0:includesKey: ns) ifFalse: [allowed @env0:add: ns]]]]]].
	^ list @env0:withAll: allowed @env0:asSortedCollection
%

category: 'Grail-Enum Member'
method: Enum
__format__: aSpec
	"A pure-Enum (or Flag) member formats as its str -- ``ClassName.name''
	-- with the spec applied to that string (CPython Enum.__format__ for a
	non-mixed enum: str.__format__(str(self), spec)).  Mixed enums
	(IntEnum, AbstractPyInt-rooted) do NOT inherit this -- they keep the
	data type's numeric formatting, which is correct.

	A data-rooted ReprEnum member (``class E(float, ReprEnum)'') formats its
	VALUE for a NON-EMPTY spec (numeric right-align) -- the point of ReprEnum
	(_MinimalOutputTests.test_format_specs).  Decided at CALL time: this method
	is MERGED onto the member class at install, when the MI/mro (hence
	___grailIsReprEnumClass:) is not yet reliable, so it cannot be baked in."

	((aSpec @env0:notNil and: [(aSpec @env0:isEmpty) @env0:not])
		and: [(Enum ___grailIsReprEnumClass: self @env0:class)
		and: [(self @env0:class @env0:inheritsFrom: Enum) @env0:not]])
		ifTrue: [^ (self @env0:dynamicInstVarAt: #value) @env1:__format__: aSpec].
	^ (self __str__) __format__: aSpec
%

category: 'Grail-Enum Member'
method: Enum
__eq__: other
	"Enum members compare by IDENTITY, but a NON-match must answer
	NotImplemented (not False) so the operator layer tries the REFLECTED
	__eq__ on the right-hand side -- e.g. ``member == ALWAYS_EQ'' where
	ALWAYS_EQ.__eq__ returns True (test_equality).  Mirrors object.__eq__;
	two distinct members still end up != (both sides punt -> identity)."

	(self @env0:== other) ifTrue: [^ true].
	^ NotImplemented
%

category: 'Grail-Enum Member'
method: Enum
__ne__: other
	"Identity inequality; a non-identical operand punts to the reflected
	__ne__ (NotImplemented) instead of answering True outright, so
	``member != ALWAYS_EQ'' honors ALWAYS_EQ's override.  Mirrors the
	NotImplemented-punting shape of __eq__."

	(self @env0:== other) ifTrue: [^ false].
	^ NotImplemented
%

category: 'Grail-Enum Member'
method: Enum
__hash__
	^ self @env0:identityHash
%

category: 'Grail-Pickle'
method: Enum
__reduce__
	"(cls, (value,)) -- CPython Enum.__reduce_ex__.  object>>__reduce_ex__:
	forwards to __reduce__, so pickling a member serializes its enum class
	plus its value; unpickling calls cls(value), which returns the canonical
	singleton member (so a round-tripped member is `is`-identical, as the
	pickle tests require).  Without this, pickling an enum member fell through
	to object>>__reduce__ and leaked a raw Smalltalk error (`Not yet
	implemented: __reduce__`)."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Pickle'
method: Enum
__reduce_ex__: proto
	"CPython names this one __reduce_ex__, and the distinction MATTERS for a
	mixed-in enum: pickle asks for __reduce_ex__ FIRST, and only falls back to
	__reduce__.

	``class NEI(NamedInt, Enum)'' where NamedInt defines __reduce__ puts
	NamedInt's ahead of Enum's by MRO -- correctly -- so with Enum offering only
	__reduce__ the member pickled as ``(NEI, ('the-y', 2))'', NamedInt's
	constructor arguments, and unpickling called NEI('the-y', 2): two positional
	arguments on an enum class, which is the FUNCTIONAL API and died with
	``'int' object is not iterable'' (test_subclasses_with_reduce).  CPython
	resolves __reduce_ex__ to Enum's, because NamedInt defines only __reduce__,
	and pickles the member by its VALUE.

	__reduce__ stays as it was: a mixin that overrides __reduce_ex__ itself
	(test_subclasses_with_reduce_ex) still wins over this by the same MRO rule.

	The body is CPython's own -- ``return self.__class__, (self._value_, )'' --
	rather than a delegation to self.__reduce__, which would resolve straight
	back to the mixin's override and answer the same wrong thing."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: {
		self @env0:class.
		(tupleClass @env0:withAll: { self @env0:dynamicInstVarAt: #value }) }
%

! ------------------- Flag members: bitwise algebra over member values.
! Results resolve through ___grailLookupValue:, so known combinations
! come back as the SAME cached composite pseudo-member.

category: 'Grail-Flag Member'
method: Flag
___flagOperandOrNil___: other
	"The int value to combine with, or NIL when this class does not accept
	such an operand at all.  CPython's Flag.__or__ opens with exactly two
	admissible cases and answers NotImplemented for everything else:

	    if isinstance(other, self.__class__):        other = other._value_
	    elif self._member_type_ is not object and isinstance(other, self._member_type_):
	                                                 other = other
	    else:                                        return NotImplemented

	So the MEMBER TYPE is what decides.  A plain Flag has none -- _member_type_
	is object -- and takes only its own members: ``PlainA.A | PlainB.TWO'' and
	``PlainA.A | 2'' are both TypeError.  A flag with a data mixin (IntFlag, or
	``class E(int, Flag)'') reaches an operand through that type instead, which
	is what makes an int operand, and the cross-class combination in
	flag_cross_class_repr.py, legal.

	Grail accepted any Flag member and any Integer regardless, so the plain-Flag
	cases above quietly answered <PlainA.A|2: 3>.  The tolerance was not
	arbitrary: this source is COPIED onto MI flag classes (``class E(int, Flag)''
	is AbstractPyInt-rooted, so its members are NOT Flag-kind), and asking
	___grailMemberTypeFor: is what tells the two apart without asking about
	storage -- it answers Integer for the MI flag and object for the plain one.

	NIL rather than a raise so each caller can phrase CPython's message for its
	own operator; ___flagOperand___: keeps the generic one for anything else."

	| mt |
	"Case 1: an instance of the receiver's own class."
	(other @env0:isKindOf: self @env0:class) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	"Case 2: the data mixin, when there is one."
	mt := Enum ___grailMemberTypeFor: self @env0:class.
	(mt @env0:isNil or: [mt == object]) ifTrue: [^ nil].
	((other isKindOf: Flag) or: [other @env0:class == self @env0:class]) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	(other isKindOf: AbstractPyInt) ifTrue: [
		| v |
		v := other @env0:dynamicInstVarAt: #value.
		v @env0:isNil ifFalse: [^ v]].
	(other isKindOf: Integer) ifTrue: [^ other].
	^ nil
%

category: 'Grail-Flag Member'
method: Flag
___flagOperandTypeError___: other op: opString
	"CPython's message for a rejected flag operand, naming both types in
	evaluation order: unsupported operand type(s) for |: 'PlainA' and 'PlainB'."

	^ TypeError ___signal___: ('unsupported operand type(s) for ' @env0:, opString
		@env0:, ': ''' @env0:, (Enum ___grailOperandTypeName: self)
		@env0:, ''' and ''' @env0:, (Enum ___grailOperandTypeName: other)
		@env0:, '''')
%

category: 'Grail-Flag Member'
method: Flag
___flagOperand___: other
	"___flagOperandOrNil___: with the generic raise, for callers that have no
	operator to name."

	| v |
	v := self ___flagOperandOrNil___: other.
	v @env0:isNil ifTrue: [
		^ TypeError ___signal___: 'unsupported operand type(s) for flag operation'].
	^ v
%

category: 'Grail-Flag Member'
method: Flag
___grailNoneCombineStr: other
	"A Flag member written ``E = None'' is CPython's no-combine sentinel: it
	has value None and any |/&/^ with it must raise TypeError, never do bit
	arithmetic.  Answer the ``Cls.name'' of whichever of self/other is such a
	member (self first), else nil (caller proceeds with the normal op).
	Without this, the None value reached #bitOr:/#bitAnd:/#bitXor: as nil and
	leaked a raw Smalltalk ``nil doesNotUnderstand'' error."

	| sv ov |
	sv := self @env0:dynamicInstVarAt: #value.
	(sv @env0:isNil or: [sv == None]) ifTrue: [^ Enum ___grailMemberStr: self].
	((other isKindOf: Flag) or: [other @env0:class == self @env0:class]) ifTrue: [
		ov := other @env0:dynamicInstVarAt: #value.
		(ov @env0:isNil or: [ov == None]) ifTrue: [^ Enum ___grailMemberStr: other]].
	^ nil
%

category: 'Grail-Flag Member'
method: Flag
__or__: other
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with |'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '|'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: ov)
%

category: 'Grail-Flag Member'
method: Flag
__and__: other
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with &'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '&'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: ov)
%

category: 'Grail-Flag Member'
method: Flag
__xor__: other
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with ^'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '^'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: ov)
%

category: 'Grail-Flag Member'
method: Flag
__len__
	"``len(member)'' -- the number of single-bit flags set (CPython 3.11+), so
	len(Color.BLACK) is 0 and len(Color.WHITE) is 3.

	Also what ``Color.__len__(member)'' reaches: the class's own __len__ shadows
	the metaclass one that counts MEMBERS, exactly as CPython's Flag.__len__
	shadows EnumType.__len__ (test_member_length).  Without it the unbound handle
	found the unary metaclass method and reported ``__len__() takes a different
	number of arguments (1 given)''."

	^ (Enum ___grailFlagComponents: self) @env0:size
%

category: 'Grail-Flag Member'
method: Flag
__iter__
	"Iterate a Flag MEMBER: yield its canonical SINGLE-BIT component members in
	definition order (CPython 3.11+: ``list(Color.PURPLE)'' -> [RED, BLUE];
	``list(Color.BLACK)'' -> []; a multi-bit member is decomposed, never
	yielded whole).  Mirrors ___grailMemberStr's decomposition and, like the
	operator methods above, is COPIED onto MI flag classes (class E(int, Flag))
	so IntFlag members iterate too."

	^ (Enum ___grailFlagComponents: self) __iter__
%

category: 'Grail-Flag Member'
method: Flag
__invert__
	"~A: the mask-complement within the class's SINGLE-BIT named flags (CPython
	3.11+ STRICT/CONFORM semantics -- a plain Flag's default boundary).  Uses
	the single-bit mask, not the full one: for ``OpenAB(A=1, B=2, MASK=255)''
	``~A'' is B, not OpenAB(254).  (IntFlag, boundary KEEP, keeps its own
	___grailFlagMask:-based invert below.)  A None-valued member (``E = None'')
	cannot be inverted."

	| mask v |
	v := self @env0:dynamicInstVarAt: #value.
	(v @env0:isNil or: [v == None]) ifTrue: [
		^ TypeError ___signal___: '''' @env0:, (Enum ___grailMemberStr: self) @env0:, ''' cannot be inverted'].
	mask := Enum ___grailFlagSingleBitMask: self @env0:class.
	^ Enum ___grailLookupValue: self @env0:class
		value: (mask @env0:bitXor: (mask @env0:bitAnd: v))
%

category: 'Grail-Flag Member'
method: Flag
__contains__: other
	"``B in (A|B)``: membership by bit coverage.

	Refuses an operand this class does not accept, by the same rule the
	operators use -- CPython's message names the types in the order ``in''
	evaluates them, the contained object first: unsupported operand type(s)
	for 'in': 'PB' and 'PA'."

	| ov v |
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [
		^ TypeError ___signal___: ('unsupported operand type(s) for ''in'': '''
			@env0:, (Enum ___grailOperandTypeName: other)
			@env0:, ''' and ''' @env0:, (Enum ___grailOperandTypeName: self)
			@env0:, '''')].
	v := self @env0:dynamicInstVarAt: #value.
	^ (v @env0:bitAnd: ov) @env0:= ov
%

category: 'Grail-Flag Member'
method: Flag
__bool__
	^ (self @env0:dynamicInstVarAt: #value) @env0:~= 0
%

category: 'Grail-Flag Member'
method: Flag
___isTruthy___
	^ (self @env0:dynamicInstVarAt: #value) @env0:~= 0
%

category: 'Grail-Flag Member'
method: Flag
___compositeName___
	"'first|third' for a composite; the plain name for named members."

	| nm v parts |
	nm := self @env0:dynamicInstVarAt: #name.
	(nm @env0:isNil or: [nm == None]) ifFalse: [^ nm].
	v := self @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(Enum ___grailAllNamedMembers: self @env0:class) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		((mv isKindOf: Integer)
			and: [mv @env0:~= 0
			and: [(v @env0:bitAnd: mv) @env0:= mv]]) ifTrue: [
			parts @env0:add: (m @env0:dynamicInstVarAt: #name)]].
	parts @env0:isEmpty ifTrue: [^ v @env0:printString].
	^ (parts @env0:inject: nil into: [:acc :p |
		acc @env0:isNil ifTrue: [p] ifFalse: [acc @env0:, '|' @env0:, p]])
%

category: 'Grail-Flag Member'
method: Flag
__repr__
	"<Perm.R|X: 5> for named/composite members; the EMPTY flag (value 0,
	no covering members) is <Perm: 0> (CPython 3.11+)."

	| v nm0 |
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	v := self @env0:dynamicInstVarAt: #value.
	nm0 := self @env0:dynamicInstVarAt: #name.
	((nm0 @env0:isNil or: [nm0 == None])
		and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
		^ '<' @env0:, self @env0:class @env0:name @env0:asString
			@env0:, ': 0>'].
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, self ___compositeName___ @env0:, ': '
		@env0:, v @env0:printString @env0:, '>'
%

category: 'Grail-Flag Member'
method: Flag
__str__
	"Perm.R|X; the EMPTY flag is Perm(0) (CPython 3.11+)."

	| v nm0 |
	v := self @env0:dynamicInstVarAt: #value.
	nm0 := self @env0:dynamicInstVarAt: #name.
	((nm0 @env0:isNil or: [nm0 == None])
		and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
		^ self @env0:class @env0:name @env0:asString @env0:, '(0)'].
	^ self @env0:class @env0:name @env0:asString @env0:, '.' @env0:, self ___compositeName___
%

! ------------------- IntEnum members: int-like (inherit AbstractPyInt),
! enum-style repr/str + a .name accessor.

category: 'Grail-Pickle'
method: IntEnum
__reduce__
	"(cls, (value,)) -- AbstractPyInt-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Pickle'
method: IntEnum
__reduce_ex__: proto
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Enum Member'
method: IntEnum
name
	^ self @env0:dynamicInstVarAt: #name
%

category: 'Grail-Enum Member'
method: IntEnum
__repr__
	| nm val |
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	nm := self @env0:dynamicInstVarAt: #name.
	val := self @env0:value @env0:printString.
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, nm @env0:, ': ' @env0:, val @env0:, '>'
%

category: 'Grail-Enum Member'
method: IntEnum
__str__
	"CPython 3.11+ (ReprEnum): IntEnum / IntFlag members str as their INT
	VALUE, not <Class.name> -- str(Size.BIG) is '7'.  repr stays
	enum-style (<Size.BIG: 7>, above).  IntFlag < IntEnum inherits this,
	which is correct (str(anIntFlag) is its int too)."

	^ (self @env0:value) __str__
%

category: 'Grail-Enum Member'
method: IntEnum
__format__: aSpec
	"IntEnum / IntFlag members format as their int value (ReprEnum), so a
	numeric spec (format(Size.BIG, 'd')) works and an empty spec yields the
	int str -- delegate to the int value's __format__."

	^ (self @env0:value) __format__: aSpec
%

! ------------------- IntFlag members: Flag's bitwise algebra over the
! AbstractPyInt root.  IntFlag < IntEnum < AbstractPyInt in Smalltalk (so
! members ARE ints), which means Flag's member methods are NOT inherited --
! without these, ``Perm.R | Perm.W`` fell to AbstractPyInt's env-1 DNU
! int-forward and answered a PLAIN Integer 3 instead of the composite
! member <Perm.R|W: 3>.  Same duplicate-onto-the-int-chain idiom as the
! IntEnum metaclass methods above.  Results resolve through
! ___grailIntFlagValue: -- KEEP boundary (CPython 3.11+ IntFlag default):
! uncovered bits are retained, not rejected.

category: 'Grail-Pickle'
method: IntFlag
__reduce__
	"(cls, (value,)) -- AbstractPyInt-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Pickle'
method: IntFlag
__reduce_ex__: proto
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-IntFlag Member'
method: IntFlag
___flagOperand___: other
	"Tolerant unwrap, mirroring Flag>>___flagOperand___: -- accepts a
	member of any int-enum flavor or a plain int (IntFlag ops interoperate
	with ints in CPython)."

	((other isKindOf: IntFlag)
		or: [other @env0:class == self @env0:class]) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	(other isKindOf: AbstractPyInt) ifTrue: [
		| v |
		v := other @env0:dynamicInstVarAt: #value.
		v @env0:isNil ifFalse: [^ v]].
	(other isKindOf: Integer) ifTrue: [^ other].
	^ TypeError ___signal___: 'unsupported operand type(s) for flag operation'
%

category: 'Grail-IntFlag Member'
method: IntFlag
__or__: other
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: (self ___flagOperand___: other))
		foreign: (self ___foreignFlagClassOf___: other)
%

category: 'Grail-IntFlag Member'
method: IntFlag
__and__: other
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: (self ___flagOperand___: other))
		foreign: (self ___foreignFlagClassOf___: other)
%

category: 'Grail-IntFlag Member'
method: IntFlag
__xor__: other
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: (self ___flagOperand___: other))
		foreign: (self ___foreignFlagClassOf___: other)
%

category: 'Grail-IntFlag Member'
method: IntFlag
___foreignFlagClassOf___: other
	"The flag class of a bitwise operand that belongs to a DIFFERENT enum, or
	nil.  Only an IntFlag can have one: CPython's Flag.__or__ answers
	NotImplemented unless the operand is an instance of its own class, so
	``S.A | I.TWO'' on plain Flags is a TypeError.  IntFlag reaches the operand
	through its int member type instead, and cross-class combination is legal.

	This is Grail's stand-in for the TYPE CPython's _value_ carries.  There,
	``Simple.SINGLE | Iron.TWO'' evaluates ``1 | Iron.TWO'' as an ordinary
	Python operation -- the right operand is an int SUBCLASS, so its __ror__
	wins -- and the answer is <Iron.ONE|TWO: 3>, an IRON composite, which
	becomes the new member's _value_.  The leftover is then computed as
	``value ^ combined'' THROUGH Iron, so it is <Iron.TWO: 2> and repr spells it
	out in full: <Simple.SINGLE|<Iron.TWO: 2>: 3>.

	Grail cannot store that: an int-rooted member's #value slot doubles as its
	int payload (AbstractPyInt), so it must hold a plain Integer -- 74 places
	read it as one.  Recording the CLASS separately keeps the only thing the
	naming path actually needs, which is which enum the uncovered bits came
	from.  ``Simple._value_'' therefore still answers 3 where CPython answers
	<Iron.ONE|TWO: 3>; that difference is recorded in
	tests/python/flag_cross_class_repr.py."

	| cls |
	(other @env0:isKindOf: IntFlag) ifFalse: [^ nil].
	cls := other @env0:class.
	cls == self @env0:class ifTrue: [^ nil].
	^ cls
%

category: 'Grail-IntFlag Member'
method: IntFlag
__ror__: other
	"``int | flag`` (int on the left): kernel Integer's __or__ delegates to
	the right operand's __ror__ via ___binOpFallback___.  |/&/^ are
	commutative, so the reflected form mirrors the forward one -- without
	these ``3 | Perm.R`` raised ``unsupported operand'' (OldTestIntFlag
	test_or/test_and/test_xor exercise both operand orders)."
	^ self __or__: other
%

category: 'Grail-IntFlag Member'
method: IntFlag
__rand__: other
	^ self __and__: other
%

category: 'Grail-IntFlag Member'
method: IntFlag
__rxor__: other
	^ self __xor__: other
%

category: 'Grail-IntFlag Member'
method: IntFlag
__len__
	"``len(member)'' -- the number of single-bit flags set (CPython 3.11+), so
	len(Color.BLACK) is 0 and len(Color.WHITE) is 3.

	Also what ``Color.__len__(member)'' reaches: the class's own __len__ shadows
	the metaclass one that counts MEMBERS, exactly as CPython's Flag.__len__
	shadows EnumType.__len__ (test_member_length).  Without it the unbound handle
	found the unary metaclass method and reported ``__len__() takes a different
	number of arguments (1 given)''."

	^ (Enum ___grailFlagComponents: self) @env0:size
%

category: 'Grail-IntFlag Member'
method: IntFlag
__iter__
	"Iterate an IntFlag MEMBER: yield its canonical SINGLE-BIT component members
	in definition order (CPython 3.11+).  Mirrors Flag>>__iter__ -- the
	decomposition is storage-agnostic (reads the #value dynInstVar), but IntFlag
	is AbstractPyInt-rooted and does not inherit Flag, so it needs its own copy
	(like the operator methods above)."

	^ (Enum ___grailFlagComponents: self) __iter__
%

category: 'Grail-IntFlag Member'
method: IntFlag
__invert__
	"~A: the mask-complement within the class's named bits (CPython 3.11+
	gives IntFlag the same positive-complement invert as Flag).  KEEP boundary
	complements within the FULL named-member mask (including an explicit
	multi-bit ``MASK = 255''), so ``~OpenAB.A'' is OpenAB(254), not B."

	| mask v |
	mask := Enum ___grailFlagNamedMask: self @env0:class.
	v := self @env0:dynamicInstVarAt: #value.
	^ Enum ___grailIntFlagValue: self @env0:class
		value: (mask @env0:bitXor: (mask @env0:bitAnd: v))
%

category: 'Grail-IntFlag Member'
method: IntFlag
__contains__: other
	"``B in (A|B)``: membership by bit coverage (same as Flag)."

	| ov v |
	ov := self ___flagOperand___: other.
	v := self @env0:dynamicInstVarAt: #value.
	^ (v @env0:bitAnd: ov) @env0:= ov
%

category: 'Grail-IntFlag Member'
method: IntFlag
___compositeName___
	"'R|W' for a composite; the plain name for named members; the value
	string when no named bits cover it (KEEP composites of only uncovered
	bits).  Mirrors Flag>>___compositeName___."

	| nm v parts |
	nm := self @env0:dynamicInstVarAt: #name.
	(nm @env0:isNil or: [nm == None]) ifFalse: [^ nm].
	v := self @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(Enum ___grailAllNamedMembers: self @env0:class) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		((mv isKindOf: Integer)
			and: [mv @env0:~= 0
			and: [(v @env0:bitAnd: mv) @env0:= mv]]) ifTrue: [
			parts @env0:add: (m @env0:dynamicInstVarAt: #name)]].
	parts @env0:isEmpty ifTrue: [^ v @env0:printString].
	^ (parts @env0:inject: nil into: [:acc :p |
		acc @env0:isNil ifTrue: [p] ifFalse: [acc @env0:, '|' @env0:, p]])
%

category: 'Grail-IntFlag Member'
method: IntFlag
__repr__
	"<Perm.R|W: 3> for composites (IntEnum's __repr__ above would try to
	concatenate the composite's None name); named members unchanged."

	| v nm0 |
	"A @global_enum IntFlag reprs its members ``module.NAME'' (global_flag_repr),
	like Flag/IntEnum/StrEnum -- IntFlag is AbstractPyInt-rooted and inherits
	NONE of their __repr__, so it needs its own guard (HeadlightsK
	test_global_repr_keep / _conform1)."
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	v := self @env0:dynamicInstVarAt: #value.
	nm0 := self @env0:dynamicInstVarAt: #name.
	((nm0 @env0:isNil or: [nm0 == None])
		and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
		^ '<' @env0:, self @env0:class @env0:name @env0:asString
			@env0:, ': 0>'].
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, self ___compositeName___ @env0:, ': '
		@env0:, v @env0:printString @env0:, '>'
%

set compile_env: 0

! ===============================================================================
! StrEnum class: thin delegators to Enum's shared logic (the duplicate-onto-
! the-str-chain idiom -- StrEnum is AbstractPyStr-rooted and never passes
! Enum's class side, exactly like IntEnum vs AbstractPyInt).  Members ARE
! strings (AbstractPyStr #value); str/__format__/__eq__/methods are inherited
! from AbstractPyStr, so only name + the enum-style __repr__ are defined
! instance-side.  str(member) == value is the ReprEnum contract, satisfied by
! AbstractPyStr>>__str__ (returns #value) for free.
! ===============================================================================

set compile_env: 1

category: 'Grail-Class Attrs'
classmethod: StrEnum
_member_type_
	"StrEnum members ARE strings (AbstractPyStr storage).  Answer the ``str''
	handle, not a concrete Unicode class, so ``StrEnum._member_type_ is str''
	holds like the int/float cases -- see ___grailNormalizeMemberType:."

	^ Enum ___grailStrBuiltin
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___grailMetaclassNamespace___
	"""The EnumDict a StrEnum body runs in.  Its own copy, because a data-rooted
	enum's Smalltalk metaclass chain does not pass ``Enum class'' -- the same
	reason ___pyClassDefined___: below is redeclared here."""

	^ Enum ___grailNamespaceForClass: self
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___pyClassDefined___: attrNames
	"Own hook because a data-rooted enum's metaclass chain reaches StrEnum class,
	not Enum class; the policy itself lives in one place."
	^ Enum ___grailClassDefinedFor: self names: attrNames
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___grailMetaclassPythonName___
	"CPython's name for an enum's metaclass: type(Color), type(SomeIntEnum) and
	type(SomeStrEnum) are all ``EnumType''.  Grail has three separate metaclass
	roots -- a data-rooted enum's chain reaches IntEnum class or StrEnum class
	and never Enum class -- so each declares it, exactly as each declares its
	own ___pyClassDefined___: and __signature__.

	Read by object >> ___grailPythonMetaclassName___, which is what
	``type(Color).__name__'' and repr(type(Color)) answer."

	^ 'EnumType'
%

category: 'Grail-Enum Metaclass Property'
classmethod: StrEnum
__signature__
	"Own hook, same reason as ___pyClassDefined___: above -- a data-rooted
	enum's metaclass chain never reaches Enum class."
	^ Enum ___grailEnumSignatureFor: self
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___grailSetClassBoundary___: aBoundary
	"For symmetry with Enum/IntEnum class -- a data-mixed flag whose metaclass
	chains through StrEnum class still resolves the boundary setter."
	^ Enum ___grailSetClassBoundary: self to: aBoundary
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__new__: aValue
	^ Enum ___grailLookupValue: self value: aValue
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
value: positional value: keywords
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__contains__: aValue
	| rec |
	(aValue isKindOf: self) ifTrue: [^ true].
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	^ false
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__reversed__
	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__getitem__: aName
	^ Enum ___grailLookupName: self name: aName
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__iter__
	^ (Enum ___grailMembers: self) __iter__
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___unpackSequence___
	^ list @env0:withAll: (Enum ___grailMembers: self)
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__len__
	^ (Enum ___grailMembers: self) @env0:size
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__bool__
	^ true
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__repr__
	^ '<enum ''' @env0:, self @env0:name @env0:asString @env0:, '''>'
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__str__
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
__format__: aSpec
	^ self __repr__
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
mro
	^ list @env0:withAll: (self __mro__)
%

category: 'Grail-Class Attrs'
classmethod: StrEnum
_member_names_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ list @env0:withAll: #()].
	^ list @env0:withAll: ((rec @env0:at: 3)
		@env0:collect: [:m | m @env0:dynamicInstVarAt: #name])
%

category: 'Grail-Class Attrs'
classmethod: StrEnum
_member_map_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 2
%

category: 'Grail-Class Attrs'
classmethod: StrEnum
_value2member_map_
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 1
%

category: 'Grail-Class Attrs'
classmethod: StrEnum
_value_repr_
	^ None
%

category: 'Grail-Class Attrs'
classmethod: Flag
_boundary_
	"CPython FlagBoundary: how a Flag handles bits with no named member.  Delegate
	to ___grailFlagBoundaryOf: self so a ``boundary='' class-keyword override on a
	normally-chained Flag subclass (Iron(Flag, boundary=CONFORM)) is honoured;
	with no override this answers the plain-Flag default #STRICT, so
	``enum.Flag._boundary_ is STRICT'' still holds (self is the RECEIVER, so a
	subclass reads its OWN effective boundary).  Read by
	test_open_invert_expectations / test_boundary."

	^ Enum ___grailBoundaryMemberFor: (Enum ___grailFlagBoundaryOf: self)
%

category: 'Grail-Class Attrs'
classmethod: IntFlag
_boundary_
	"IntFlag defaults to KEEP -- out-of-range bits are preserved.  Delegate to
	___grailFlagBoundaryOf: self so a ``boundary='' override
	(Iron(IntFlag, boundary=STRICT)) wins, while a plain IntFlag / override-free
	subclass answers the #KEEP default -- ``enum.IntFlag._boundary_ is KEEP''."

	^ Enum ___grailBoundaryMemberFor: (Enum ___grailFlagBoundaryOf: self)
%

! ------------------- StrEnum members (instance side)

category: 'Grail-Pickle'
method: StrEnum
__reduce__
	"(cls, (value,)) -- AbstractPyStr-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Pickle'
method: StrEnum
__reduce_ex__: proto
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self
%

category: 'Grail-Enum Member'
method: StrEnum
name
	^ self @env0:dynamicInstVarAt: #name
%

category: 'Grail-Enum Member'
method: StrEnum
__repr__
	"<Color.RED: 'red'> -- enum-style, overriding AbstractPyStr's plain
	string repr.  The value is a string, so its Python repr supplies the
	quotes.  str(member) stays the bare value (ReprEnum), inherited from
	AbstractPyStr>>__str__."

	| nm val |
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	nm := self @env0:dynamicInstVarAt: #name.
	val := (self @env0:dynamicInstVarAt: #value) __repr__.
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, nm @env0:asString @env0:, ': ' @env0:, val @env0:asString @env0:, '>'
%

set compile_env: 0

set compile_env: 1

category: 'Grail-Copy'
method: Enum
__copy__
	"An enum MEMBER is a singleton: ``Color.RED'' is the one and only object
	for that member, and code compares members with ``is''.  CPython's enum.Enum
	defines __copy__/__deepcopy__ returning self for exactly this reason --
	without them copy.copy() would hand back a second object that is equal to
	the member but not identical to it, silently breaking every identity test
	(test_enum test_copy_member)."

	^ self
%

category: 'Grail-Copy'
method: Enum
__deepcopy__: memo
	"See __copy__: a member is a singleton, so a deep copy is the member."

	^ self
%

category: 'Grail-Pickling'
method: Enum
___grailReduceExByGlobalName___: proto
	"The body of enum._reduce_ex_by_global_name -- pickle a member BY NAME.

	CPython's is a module-level function that a class assigns over its own
	__reduce_ex__ (``ReplaceGlobalInt.__reduce_ex__ =
	enum._reduce_ex_by_global_name'', test_pickle_by_name), so it must be a
	plain function taking self first.  The enum module exposes it as the
	UnboundMethod for this method, which is exactly that: the class-attribute
	read through a member binds the member as self.

	Handing back the module-level BoundMethod instead does NOT work, and
	correctly so -- ___isDescriptorCallable___ refuses to bind a BoundMethod on
	a Smalltalk-implemented module because that models a C function, which is
	not a descriptor.  This one is pure Python in CPython, so it needs the
	function shape rather than an exception to that rule."

	^ self @env1:___pyAttrLoad___: #'name'
%

category: 'Grail-Pickling'
method: Enum
___grailReduceExByEnumName___: proto
	"The body of enum.pickle_by_enum_name -- pickle a member as
	``getattr(cls, name)''.

	CPython's is a module-level function that a class assigns over its own
	__reduce_ex__ when the default value-based reduction cannot work:

	    NEI.__reduce_ex__ = enum.pickle_by_enum_name

	``class NEI(NamedInt, Enum)'' is exactly that case.  The default reduction
	is (cls, (value,)), and rebuilding the VALUE calls NamedInt.__new__ with the
	value alone -- which raises, because NamedInt demands a name as well.  Going
	by NAME sidesteps the member type's constructor entirely.

	Same function shape as ___grailReduceExByGlobalName___ above, and for the
	same reason: it is assigned onto a class, so it must take self first.

	``getattr'' is read from the builtins MODULE INSTANCE, not from the builtins
	class in the Python dictionary.  The class answers an UnboundMethod, which
	is not the object Python code sees and which pickle cannot name; the module
	instance answers the BoundMethod that ``getattr'' evaluates to, and that one
	pickles by reference as builtins.getattr."

	| tupleClass builtinsMod |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	builtinsMod := importlib @env1:modules @env1:__getitem__: 'builtins'.
	^ tupleClass @env0:withAll: {
		builtinsMod @env1:___pyAttrLoad___: #'getattr'.
		tupleClass @env0:withAll: {
			self @env0:class.
			self @env1:___pyAttrLoad___: #'name' } }
%

category: 'Grail-Pickling'
method: Enum
___grailBreakOnCallReduce___: proto
	"The __reduce_ex__ enum._make_class_unpicklable installs: refuse, with
	CPython's message."

	TypeError @env1:___signal___:
		(self @env1:__repr__) @env0:asString @env0:, ' cannot be pickled'.
	^ nil
%

set compile_env: 0
