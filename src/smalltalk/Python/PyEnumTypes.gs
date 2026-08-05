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
  classInstVars: #()
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
#( #Enum #Flag #IntEnum #IntFlag #StrEnum #GrailEnumAuto #GrailEnumNonmember ) do: [:nm | (Python at: nm) category: 'Grail-Modules'].
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
	class-syntax enums) have no dynInstVars holder to hold the staticmethod, so
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
	named member; ``<short_module>.<ClassName>(<value>)'' for a nameless flag
	member (value 0, or an unnamed composite).  A composite name joins its parts
	with ``|'', each non-digit part module-prefixed."

	| cls modName nm |
	cls := m @env0:class.
	modName := self ___grailGlobalEnumMap @env0:at: cls otherwise: cls @env0:name @env0:asString.
	nm := m @env0:dynamicInstVarAt: #name.
	(Enum ___grailIsFlagClass: cls) ifTrue: [
		| val compName parts out |
		val := m @env0:dynamicInstVarAt: #value.
		(nm @env0:isNil or: [nm == None]) ifTrue: [
			^ modName @env0:, '.' @env0:, cls @env0:name @env0:asString
				@env0:, '(' @env0:, val @env0:printString @env0:, ')'].
		compName := (Enum ___grailCompositeNameFor: m) @env0:asString.
		parts := compName @env0:subStrings: '|'.
		out := WriteStream @env0:on: String @env0:new.
		parts @env0:doWithIndex: [:p :i |
			i @env0:> 1 ifTrue: [out @env0:nextPut: $|].
			((p @env0:size @env0:> 0) and: [(p @env0:at: 1) @env0:isDigit])
				ifTrue: [out @env0:nextPutAll: p]
				ifFalse: [out @env0:nextPutAll: modName @env0:, '.' @env0:, p]].
		^ out @env0:contents].
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
	non-enum subclass, and a direct member_type.__new__, proceed untouched."

	((cls @env0:isKindOf: Behavior)
		and: [Enum ___grailBuildingSet @env0:includes: cls]) ifTrue: [
			^ TypeError ___signal___:
				'do not use `super().__new__; call the appropriate __new__ directly'].
	^ nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBuildMembers: cls names: attrNames
	"Turn each class-body NAME=value on cls into a singleton member (an
	instance of cls).  Equal values alias to the first member (CPython
	semantics).  Members are written back as the class attributes and
	recorded in EnumRegistry."

	| byValue byName members allOrdered lastInt maxInt allNames dynHolder autoResolved hasUserInit hasUserNew newDefClass tupleClass gnvClass gnvStaticClass genValues foreignMixin |
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
	"Names assigned under a class-body ``if`` (the shared test fixture's
	``if issubclass(...): dupe = 3'') never reach classBodyAttributes --
	their stores go through ___pyAttrStore___ into the per-class
	dynInstVars holder BEFORE this hook runs.  Sweep the holder for
	additional member candidates (skipping underscore-prefixed machinery
	such as closure cells) and process them after the declared names."
	allNames := attrNames @env0:asOrderedCollection.
	dynHolder := ((cls @env0:class @env0:whichClassIncludesSelector: #dynInstVars environmentId: 1) notNil)
		ifTrue: [cls @env0:perform: #dynInstVars env: 1]
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
			| dynSym ds |
			dynSym := dynPairs @env0:at: i.
			ds := dynSym @env0:asString.
			((ds @env0:size @env0:> 0)
				and: [((ds @env0:at: 1) @env0:= $_) not
				and: [(allNames @env0:includes: dynSym) not]])
					ifTrue: [allNames @env0:add: dynSym].
			i := i @env0:+ 2]].
	"enum.nonmember(x): x is deliberately NOT a member.  Unwrap it, store the
	raw value as a plain class attribute (Outer.Inner is Inner; MyTypes.f is
	float; Example.ALL == 3, type int), and DROP the name from member building
	so it is excluded from _member_names_ / iteration.  Both the call form
	(f = nonmember(float)) and the decorator form (@nonmember class Inner) land
	here as a NAME bound to a GrailEnumNonmember marker.  Done before the
	reserved-name / member passes so the name is invisible to them."
	[ | dropped |
	dropped := OrderedCollection @env0:new.
	allNames @env0:do: [:nameSym | | raw hasAcc |
		hasAcc := (cls @env0:class @env0:whichClassIncludesSelector:
			(nameSym @env0:asString @env0:, ':') @env0:asSymbol environmentId: 1) notNil.
		raw := hasAcc
			ifTrue: [cls @env0:perform: nameSym env: 1]
			ifFalse: [dynHolder @env0:isNil
				ifTrue: [nil]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym]].
		(raw isKindOf: GrailEnumNonmember) ifTrue: [ | nmVal |
			nmVal := raw @env0:value.
			hasAcc
				ifTrue: [cls @env0:perform: (nameSym @env0:asString @env0:, ':') @env0:asSymbol
					env: 1 withArguments: (Array @env0:with: nmVal)]
				ifFalse: [dynHolder @env0:isNil
					ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym put: nmVal]].
			dropped @env0:add: nameSym]].
	dropped @env0:isEmpty ifFalse: [
		allNames := allNames @env0:reject: [:n | dropped @env0:includes: n]] ] @env0:value.
	"Reserved-name validation (CPython EnumType.__new__): a class-body
	ASSIGNMENT may not rebind ``mro`` (it would shadow type.mro) nor use a
	_sunder_ name outside the supported set -- ValueError at definition
	(test_invalid_names across every enum flavor)."
	allNames @env0:do: [:nameSym | | ns sz |
		ns := nameSym @env0:asString.
		sz := ns @env0:size.
		ns @env0:= 'mro' ifTrue: [
			ValueError ___signal___: 'cannot use ''mro'' as an enum member name'].
		(sz @env0:>= 3
			and: [(ns @env0:at: 1) @env0:= $_
			and: [(ns @env0:at: sz) @env0:= $_
			and: [((ns @env0:at: 2) @env0:= $_ and: [(ns @env0:at: sz @env0:- 1) @env0:= $_]) not]]])
				ifTrue: [
					(#('_ignore_' '_order_' '_missing_' '_generate_next_value_'
						'_value_repr_' '_numeric_repr_' '_name_' '_value_')
						@env0:includes: ns) ifFalse: [
							ValueError ___signal___:
								'_sunder_ names, such as ''' @env0:, ns
									@env0:, ''', are reserved for future Enum use']]].
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
	hasUserInit := (initProvider == cls)
		or: [(initProvider @env0:notNil)
			and: [((Enum ___grailIsEnumBase: initProvider) @env0:not)
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
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	"An MI enum whose storage base is Enum (``cls inheritsFrom: Enum'') but
	which mixes in a FOREIGN data type -- ``class E(date, Enum)'', where date is
	merged as a SECONDARY base -- must carry member_type(*source_args) as each
	member's value (CPython builds each via member_type.__new__(cls, *args)).
	nil for a pure Enum/Flag (no mix-in -> object) and for int/str/float-storage
	enums, whose Smalltalk chain does NOT pass Enum and whose member already IS
	the data type (rawValue is already correct)."
	foreignMixin := (cls @env0:inheritsFrom: Enum)
		ifTrue: [ | mt | mt := Enum ___grailMemberTypeFor: cls.
			mt == object ifTrue: [nil] ifFalse: [mt] ]
		ifFalse: [nil].
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
			| rawValue member built effVal tupleAutoDone |
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
			"A foreign-mixin enum (``class E(date, Enum)'') carries
			member_type(*args) -- date(2023, 12, 1) -- as its canonical value.
			Construct it up front so alias detection, value-lookup and storage
			all key off the SAME value: ``dupe = third'' must still alias third
			(both resolve to date(2009, 1, 1)), which a byValue keyed by the raw
			tuple while the check used the constructed date would miss.  effVal ==
			rawValue for every non-foreign case (int/str/float/plain), so
			behaviour there is unchanged."
			effVal := (foreignMixin @env0:notNil
				and: [(rawValue isKindOf: foreignMixin) not])
					ifTrue: [Enum ___grailConstructMemberValue: foreignMixin args: rawValue]
					ifFalse: [rawValue].
			(byValue @env0:includesKey: effVal)
				ifTrue: [member := byValue @env0:at: effVal]
				ifFalse: [
					"Flag composite-alias (CPython): a class-body value whose
					bits are all covered by the ALREADY-DEFINED members
					(``dupe = 3`` after R=1/W=2) is an ALIAS for the
					composite -- reachable by name and value, but excluded
					from iteration and _member_names_."
					member := nil.
					((rawValue isKindOf: Integer)
						and: [rawValue @env0:> 0
						and: [Enum ___grailIsFlagClass: cls]]) ifTrue: [
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
									newArgs := (rawValue isKindOf: tupleClass)
										ifTrue: [rawValue @env0:asArray]
										ifFalse: [Array @env0:with: rawValue].
									member := (UnboundMethod definingClass: newDefClass selector: #'__new__')
										value: ({ cls } @env0:, newArgs) value: KeyValueDictionary @env0:new.
									"CPython: a member's canonical value is its _value_, set by
									__new__.  When __new__ left it unset, fall back to the raw
									class-body value (a fuller member_type(*args) reconstruction
									is a later refinement)."
									v := [member @env0:dynamicInstVarAt: #'_value_']
								@env0:on: AbstractException do: [:e | nil].
									memberValue := v @env0:isNil ifTrue: [rawValue] ifFalse: [v]]
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
										ifFalse: [member := cls @env0:basicNew].
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
								ifFalse: [members @env0:add: member]]].
			byName @env0:at: nameStr put: member.
			hasAccessor
				ifTrue: [cls @env0:perform: (nameStr @env0:, ':') @env0:asSymbol env: 1
					withArguments: (Array @env0:with: member)]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym put: member].
			"Run a class-body ``def __init__`` on the freshly-built member
			(CPython _proto_member.__set_name__): value tuple -> positional
			args, a scalar -> a 1-tuple.  Aliases (member reused from
			byValue) are NOT re-initialized.  Errors propagate out of the
			class definition (test_init_exception)."
			(hasUserInit and: [built]) ifTrue: [
				| initArgs |
				initArgs := (rawValue isKindOf: tupleClass)
					ifTrue: [rawValue @env0:asArray]
					ifFalse: [Array @env0:with: rawValue].
				member @env0:perform: #'___init__:kw:' env: 1
					withArguments: { initArgs. KeyValueDictionary @env0:new }]]]]
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
	"CPython Enum.__new__: an unknown value gets one last chance through a
	user-defined _missing_ classmethod (compiled class-side as _missing_:)
	before ValueError.  Only a USER _missing_ triggers this -- no base enum
	class defines the selector, so whichClassIncludesSelector finds only an
	override."
	(cls @env0:class @env0:whichClassIncludesSelector: #'_missing_:' environmentId: 1) @env0:notNil
		ifTrue: [^ self ___grailMissing: cls value: aValue].
	^ ValueError ___signal___: aValue @env0:printString @env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString
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
		aValue @env0:printString @env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString }.
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
	keyword; ClassDefAst emits ``E ___grailSetClassBoundary___: enum.KEEP'').  The
	enum module's STRICT/CONFORM/EJECT/KEEP constants ARE the like-named symbols,
	so normalize to one of those and ignore anything else (family default stands)."

	| sym |
	aBoundary @env0:isNil ifTrue: [^ cls].
	sym := (aBoundary isKindOf: Symbol)
		ifTrue: [aBoundary]
		ifFalse: [aBoundary @env0:asString @env0:asSymbol].
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
	member @env0:dynamicInstVarAt: #name put: None.
	member @env0:dynamicInstVarAt: #'_value_' put: intValue.
	"Composite pseudo-members have no name; expose Python None (nil is
	the project's ABSENT marker and would fall through to a method wrap)."
	member @env0:dynamicInstVarAt: #'_name_' put: None.
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
	member @env0:dynamicInstVarAt: #name put: None.
	member @env0:dynamicInstVarAt: #'_value_' put: intValue.
	member @env0:dynamicInstVarAt: #'_name_' put: None.
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
	"OR of only the SINGLE-BIT named members (CPython's _flag_mask_).  A
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
	^ KeyError ___signal___: aName @env0:printString
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

	^ (cls @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:'
			environmentId: 1) @env0:notNil
		or: [(cls @env0:class @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:_:'
			environmentId: 1) @env0:notNil]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailGnvValueFor: cls name: nameStr count: count lastValues: lv
	"Invoke cls's user _generate_next_value_(name, start=1, count, last_values)
	and answer its result.  Prefer the plain-def instance form; fall back to
	the @staticmethod class-side form.  Caller guards with ___grailClassHasGnv:,
	so one of the two selectors always resolves.  Mirrors the class-syntax
	builder's invocation in ___grailBuildMembers:."

	| gnvClass |
	gnvClass := cls @env0:whichClassIncludesSelector: #'_generate_next_value_:_:_:'
		environmentId: 1.
	gnvClass @env0:notNil ifTrue: [
		^ (UnboundMethod definingClass: gnvClass selector: #'_generate_next_value_')
			value: { nameStr. 1. count. lv }
			value: KeyValueDictionary @env0:new].
	^ cls @env0:perform: #'_generate_next_value_:_:_:_:' env: 1
		withArguments: { nameStr. 1. count. lv }
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
___grailConstructMemberValue: memberType args: rawValue
	"Build the mixed-in data value member_type(*args): a scalar rawValue -> a
	1-arg call, a tuple -> its elements spread, mirroring CPython's
	member_type.__new__(cls, *args).  ``class E(date, Enum): d = 2023, 12, 1''
	yields date(2023, 12, 1) as the member's _value_ (Grail stores it as #value
	rather than making the member itself a date, since the storage base is
	Enum).  Best-effort: on any failure keep the raw class-body value."

	| tupleClass args |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	args := (rawValue isKindOf: tupleClass)
		ifTrue: [rawValue @env0:asArray]
		ifFalse: [Array @env0:with: rawValue].
	^ [memberType @env0:perform: #'value:value:' env: 1
		withArguments: { args. KeyValueDictionary @env0:new }]
		@env0:on: AbstractException do: [:e | rawValue]
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailCompositeNameFor: m
	"Composite/plain name for a (possibly flag) member: 'first|third' for a
	composite, the plain name for a named member, the value's printString when
	no named bit covers it.  Storage-agnostic (reads #name/#value dynInstVars),
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

	| cls |
	cls := m @env0:class.
	(Enum ___grailIsFlagClass: cls) ifTrue: [
		| v nm |
		v := m @env0:dynamicInstVarAt: #value.
		nm := m @env0:dynamicInstVarAt: #name.
		((nm @env0:isNil or: [nm == None])
			and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
			^ '<' @env0:, cls @env0:name @env0:asString @env0:, ': 0>'].
		^ '<' @env0:, cls @env0:name @env0:asString @env0:, '.'
			@env0:, (Enum ___grailCompositeNameFor: m) @env0:, ': '
			@env0:, v @env0:printString @env0:, '>'].
	^ '<' @env0:, cls @env0:name @env0:asString @env0:, '.'
		@env0:, (m @env0:dynamicInstVarAt: #name) @env0:asString @env0:, ': '
		@env0:, (m @env0:dynamicInstVarAt: #value) @env0:printString @env0:, '>'
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
___grailShouldForceOutput: cls selector: sel
	"True when cls only inherits the mix-in data type's (or object's) output
	method for sel, so ___grailInstallEnumOutput: should replace it with
	Enum's.  False when a USER class-body definition (category Grail-Class
	Methods / Grail-Method Aliases) or an already-enum-style method (Grail-Enum
	Member / Grail-Flag Member / Grail-IntFlag Member) provides it -- those are
	correct and must be kept."

	| p cat |
	p := cls @env0:whichClassIncludesSelector: sel environmentId: 1.
	p @env0:isNil ifTrue: [^ true].
	"categoryOfSelector: answers a Symbol -- compare against Symbols."
	cat := [p @env0:categoryOfSelector: sel environmentId: 1]
		@env0:on: AbstractException do: [:e | nil].
	^ (#(#'Grail-Class Methods' #'Grail-Method Aliases' #'Grail-Enum Override'
		#'Grail-Property-ReadOnly'
		#'Grail-CachedProperty-Setter' #'Grail-Enum Member' #'Grail-Flag Member'
		#'Grail-IntFlag Member') @env0:includes: cat) @env0:not
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
	fill these (Enum class is not a dynInstVars-bearing Python metaclass), so
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
		#'_value_repr_' #'_new_member_' #'__dir__' #'__bool__')
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
	^ Enum ___grailFlagBoundaryOf: self' category: 'Grail-Class Attrs']
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
			nc := sb ___subclass___: className instVarNames: #() classInstVarNames: #().
			il @env0:___mergeSecondaryBases___: nc bases: baseArray.
			nc]
		ifFalse: [cls ___subclass___: className instVarNames: #() classInstVarNames: #()].
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	[ | lastInt maxInt isFlag autoResolved foreignMixin |
	lastInt := 0.
	maxInt := 0.
	isFlag := self ___grailIsFlagClass: newCls.
	"A functional enum built on a foreign-mixin base (``class enum_type(date,
	Enum)'' then enum_type('MinorEnum', (('june', (2021,12,25)), ...))) carries
	member_type(*args) as each value, like the class-syntax builder.  nil for a
	plain Enum-rooted functional enum and for int/str/float storage.  (A bare
	``type=date'' kwarg is still ignored, so that shape stays plain.)"
	foreignMixin := (newCls @env0:inheritsFrom: Enum)
		ifTrue: [ | mt | mt := Enum ___grailMemberTypeFor: newCls.
			mt == object ifTrue: [nil] ifFalse: [mt] ]
		ifFalse: [nil].
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
		"auto() markers can arrive through the mapping/pairs forms
		(BaseEnum('MainEnum', dict(first=auto(), ...))) -- resolve with
		the same per-class rule as class-body members."
		(rawValue isKindOf: GrailEnumAuto) ifTrue: [
			(autoResolved @env0:includesKey: rawValue)
				ifTrue: [rawValue := autoResolved @env0:at: rawValue]
				ifFalse: [ | resolved |
					resolved := (Enum ___grailIsStrEnumClass: newCls)
						ifTrue: [nameStr @env0:asLowercase]
						ifFalse: [isFlag
							ifTrue: [maxInt @env0:<= 0
								ifTrue: [1]
								ifFalse: [1 @env0:bitShift: maxInt @env0:highBit]]
							ifFalse: [lastInt @env0:+ 1]].
					autoResolved @env0:at: rawValue put: resolved.
					rawValue := resolved]].
		(rawValue isKindOf: Integer) ifTrue: [
			lastInt := rawValue.
			maxInt := maxInt @env0:max: rawValue].
		"Construct the foreign-mixin value up front so alias detection, storage
		and value-lookup all key off the SAME value (see the class-syntax
		builder).  effVal == rawValue for every non-foreign case."
		effVal := (foreignMixin @env0:notNil
			and: [(rawValue isKindOf: foreignMixin) not])
				ifTrue: [Enum ___grailConstructMemberValue: foreignMixin args: rawValue]
				ifFalse: [rawValue].
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
			(byValue @env0:includesKey: effVal)
				ifTrue: [member := byValue @env0:at: effVal]
				ifFalse: [ | canonical |
					member := newCls @env0:basicNew.
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
		(newCls @env0:class) ___compileMethod:
				(nameStr @env0:, '
	^ self __getitem__: ''' @env0:, nameStr @env0:, '''')
				category: 'Grail-Class Attrs']]] value.
	self ___grailRegistry___ @env0:at: newCls put: (Array @env0:with: byValue with: byName with: members).
	"Record the functional gnv as a staticmethod in the session gnv-static store;
	___classDict___ surfaces it in newCls.__dict__ (functional enums have no
	dynInstVars holder, so the class-syntax holder path can't be used).  A value
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

	Grail scope: builds + returns the enum via the functional API.  The
	CPython ``as_global'' repr rewrite (members repr as ``module.NAME'') and
	the dir()-equality assertions (test_convert_int / _str, which need the
	blocked enum __dir__ / _new_member_ identity) are follow-ons."

	"Temps avoid the Grail globals ``module'' (the module class), ``filter''
	and ``sorted'' (builtins)."
	| enumName modName filterFn srcMod srcNs memberPairs sortedPairs newEnum |
	enumName := positional @env0:at: 1.
	modName := positional @env0:at: 2.
	filterFn := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'filter'])
		ifTrue: [kwargs @env0:at: 'filter'] ifFalse: [nil].
	"Source MODULE: an explicit ``source'', else the named module in
	sys.modules.  Iterate its ``__dict__'' (a PyModuleDict live view whose
	keysAndValuesDo: yields the global name/value pairs)."
	srcMod := ((kwargs ~~ nil and: [kwargs @env0:includesKey: 'source'])
		and: [(kwargs @env0:at: 'source') ~~ nil])
		ifTrue: [kwargs @env0:at: 'source']
		ifFalse: [(Python @env0:at: #importlib) modules @env0:at: modName otherwise: nil].
	srcMod == nil ifTrue: [
		^ ValueError ___signal___: 'module ''' @env0:, modName @env0:asString @env0:, ''' not found'].
	srcNs := srcMod __dict__.
	"Collect (name, value) pairs whose name passes filter()."
	memberPairs := OrderedCollection @env0:new.
	srcNs @env0:keysAndValuesDo: [:k :v |
		(filterFn == nil
			or: [(filterFn value: (Array @env0:with: k @env0:asString) value: nil) ___isTruthy___])
			ifTrue: [memberPairs @env0:add: (Array @env0:with: k @env0:asString with: v)]].
	"Sort by (value, name); on non-orderable values, sort by name alone."
	sortedPairs := [(memberPairs @env0:asSortedCollection: [:a :b |
		((a @env0:at: 2) __eq__: (b @env0:at: 2)) ___isTruthy___
			ifTrue: [(a @env0:at: 1) @env0:<= (b @env0:at: 1)]
			ifFalse: [((a @env0:at: 2) __lt__: (b @env0:at: 2)) ___isTruthy___]]) @env0:asArray]
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
			and: [walker ~~ self]]) ifTrue: [^ walker].
		walker := walker @env0:superclass].
	^ object
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___pyClassDefined___: attrNames
	^ Enum ___grailBuildMembers: self names: attrNames
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
	((positional @env0:size @env0:>= 2)
		and: [((positional @env0:at: 1) isKindOf: CharacterCollection) not
		and: [(keywords == nil or: [keywords @env0:isEmpty])
		and: [(Enum ___grailMembers: self) @env0:notEmpty]]])
		ifTrue: [^ Enum ___grailLookupValue: self
			value: ((Python @env0:at: #tuple otherwise: Array) @env0:withAll: positional)].
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)
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
	of dunders + the canonical member names, always with __new__ and
	__init_subclass__ (every BoundMethod access is a fresh object in Grail, so
	enum_dir's ``_new_member_ is not object.__new__'' / ``__init_subclass__ is
	not object.__init_subclass__'' are always true -- see the identity note), and
	for a data-mixed enum unioned with dir(member_type)."

	| interesting mt |
	interesting := Set @env0:new.
	#('__class__' '__contains__' '__doc__' '__getitem__' '__iter__' '__len__'
	  '__members__' '__module__' '__name__' '__qualname__' '__new__'
	  '__init_subclass__')
		@env0:do: [:d | interesting @env0:add: d].
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

category: 'Grail-Class Attrs'
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
___pyClassDefined___: attrNames
	^ Enum ___grailBuildMembers: self names: attrNames
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
	setattr(cls, name, member) (lands in the per-class dynInstVars holder;
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
		ifFalse: [[val @env1:__repr__ @env0:asString]
			@env0:on: AbstractException do: [:e | val @env0:printString]].
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
	propClass := Python @env0:at: #PropertyDescriptor.
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
			dict @env0:keysAndValuesDo: [:name :obj | | ns |
				ns := name @env0:asString.
				((ns @env0:size @env0:> 0) and: [(ns @env0:at: 1) @env0:~= $_]) ifTrue: [
					(obj isKindOf: propClass)
						ifTrue: [
							((obj @env0:fget @env0:notNil)
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
	^ #'___NotImplemented___'
%

category: 'Grail-Enum Member'
method: Enum
__ne__: other
	"Identity inequality; a non-identical operand punts to the reflected
	__ne__ (NotImplemented) instead of answering True outright, so
	``member != ALWAYS_EQ'' honors ALWAYS_EQ's override.  Mirrors the
	NotImplemented-punting shape of __eq__."

	(self @env0:== other) ifTrue: [^ false].
	^ #'___NotImplemented___'
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
	implemented: __reduce__`).  Enum-rooted only (plain Enum + Flag); mixed
	int/str-rooted members do not inherit this."

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
___flagOperand___: other
	"Tolerant across storage roots: this source is COPIED onto MI flag
	classes (class E(int, Flag) is AbstractPyInt-rooted), whose members
	are NOT Flag-kind."

	((other isKindOf: Flag)
		or: [other @env0:class == self @env0:class]) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	(other isKindOf: AbstractPyInt) ifTrue: [
		| v |
		v := other @env0:dynamicInstVarAt: #value.
		v @env0:isNil ifFalse: [^ v]].
	(other isKindOf: Integer) ifTrue: [^ other].
	^ TypeError ___signal___: 'unsupported operand type(s) for flag operation'
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
	| none |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with |'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: (self ___flagOperand___: other))
%

category: 'Grail-Flag Member'
method: Flag
__and__: other
	| none |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with &'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: (self ___flagOperand___: other))
%

category: 'Grail-Flag Member'
method: Flag
__xor__: other
	| none |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with ^'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: (self ___flagOperand___: other))
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

	| v parts |
	v := self @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(v isKindOf: Integer) ifTrue: [
		(Enum ___grailMembers: self @env0:class) @env0:do: [:mm | | mv |
			mv := mm @env0:dynamicInstVarAt: #value.
			((mv isKindOf: Integer)
				and: [mv @env0:~= 0
				and: [(mv @env0:bitAnd: (mv @env0:- 1)) @env0:= 0
				and: [(v @env0:bitAnd: mv) @env0:= mv]]]) ifTrue: [
				parts @env0:add: mm]]].
	^ parts __iter__
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
	"``B in (A|B)``: membership by bit coverage."

	| ov v |
	ov := self ___flagOperand___: other.
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
%

category: 'Grail-IntFlag Member'
method: IntFlag
__and__: other
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: (self ___flagOperand___: other))
%

category: 'Grail-IntFlag Member'
method: IntFlag
__xor__: other
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: (self ___flagOperand___: other))
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
__iter__
	"Iterate an IntFlag MEMBER: yield its canonical SINGLE-BIT component members
	in definition order (CPython 3.11+).  Mirrors Flag>>__iter__ -- the
	decomposition is storage-agnostic (reads the #value dynInstVar), but IntFlag
	is AbstractPyInt-rooted and does not inherit Flag, so it needs its own copy
	(like the operator methods above)."

	| v parts |
	v := self @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(v isKindOf: Integer) ifTrue: [
		(Enum ___grailMembers: self @env0:class) @env0:do: [:mm | | mv |
			mv := mm @env0:dynamicInstVarAt: #value.
			((mv isKindOf: Integer)
				and: [mv @env0:~= 0
				and: [(mv @env0:bitAnd: (mv @env0:- 1)) @env0:= 0
				and: [(v @env0:bitAnd: mv) @env0:= mv]]]) ifTrue: [
				parts @env0:add: mm]]].
	^ parts __iter__
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
	"StrEnum members ARE strings (AbstractPyStr storage)."

	^ Unicode7
%

category: 'Grail-Enum Metaclass'
classmethod: StrEnum
___pyClassDefined___: attrNames
	^ Enum ___grailBuildMembers: self names: attrNames
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

	^ Enum ___grailFlagBoundaryOf: self
%

category: 'Grail-Class Attrs'
classmethod: IntFlag
_boundary_
	"IntFlag defaults to KEEP -- out-of-range bits are preserved.  Delegate to
	___grailFlagBoundaryOf: self so a ``boundary='' override
	(Iron(IntFlag, boundary=STRICT)) wins, while a plain IntFlag / override-free
	subclass answers the #KEEP default -- ``enum.IntFlag._boundary_ is KEEP''."

	^ Enum ___grailFlagBoundaryOf: self
%

! ------------------- StrEnum members (instance side)

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
