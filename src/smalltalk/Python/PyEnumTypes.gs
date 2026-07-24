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
#( #Enum #Flag #IntEnum #IntFlag #StrEnum #GrailEnumAuto ) do: [:nm | (Python at: nm) category: 'Grail-Modules'].
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

	(Enum ___grailBuildingSet @env0:includes: self) ifTrue: [
		^ TypeError ___signal___:
			'do not use `super().__new__; call the appropriate __new__ directly'].
	^ Enum ___grailLookupValue: self value: (args @env0:at: args @env0:size)
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBuildMembers: cls names: attrNames
	"Turn each class-body NAME=value on cls into a singleton member (an
	instance of cls).  Equal values alias to the first member (CPython
	semantics).  Members are written back as the class attributes and
	recorded in EnumRegistry."

	| byValue byName members lastInt maxInt allNames dynHolder autoResolved hasUserInit hasUserNew tupleClass |
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
	hasUserInit := (cls @env0:whichClassIncludesSelector: #'___init__:kw:'
		environmentId: 1) == cls.
	"A class-body ``def __new__(cls, ...)'' likewise compiles to an env-1
	INSTANCE method ON cls (self-param bound to cls).  When present, CPython
	builds each member by running it (member_type construction + user slots)
	rather than a bare allocation; a __new__ that delegates to
	``super().__new__'' trips the guard in Enum>>___new__:kw:."
	hasUserNew := (cls @env0:whichClassIncludesSelector: #'___new__:kw:'
		environmentId: 1) == cls.
	tupleClass := Python @env0:at: #tuple otherwise: Array.
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
	"Members build while cls is in the building set: a member __new__
	that delegates to super().__new__ hits the guard in
	Enum>>___new__:kw:.  ensure: clears it even when that guard (or a
	user __new__/__init__) raises out of the loop."
	Enum ___grailBuildingSet @env0:add: cls.
	[
	allNames @env0:do: [:nameSym | | nameStr hasAccessor |
		nameStr := nameSym @env0:asString.
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_]) ifFalse: [
			| rawValue member built |
			built := false.
			"Declared names read through their compiled accessor pair;
			dyn-swept names (class-body ``if`` stores) read from the holder."
			hasAccessor := (cls @env0:class
				@env0:whichClassIncludesSelector: (nameStr @env0:, ':') @env0:asSymbol
				environmentId: 1) notNil.
			rawValue := hasAccessor
				ifTrue: [cls @env0:perform: nameSym env: 1]
				ifFalse: [dynHolder @env0:dynamicInstVarAt: nameSym].
			"auto() markers resolve to last-integer-value + 1 in
			declaration order -- except Flag-natured classes, where the
			next auto value is the next power of two ABOVE the last
			(CPython Flag._generate_next_value_)."
			(rawValue isKindOf: GrailEnumAuto) ifTrue: [
				(autoResolved @env0:includesKey: rawValue)
					ifTrue: [rawValue := autoResolved @env0:at: rawValue]
					ifFalse: [ | resolved |
						resolved := (Enum ___grailIsStrEnumClass: cls)
							ifTrue: [nameStr @env0:asLowercase]
							ifFalse: [(Enum ___grailIsFlagClass: cls)
								ifTrue: [maxInt @env0:<= 0
									ifTrue: [1]
									ifFalse: [1 @env0:bitShift: maxInt @env0:highBit]]
								ifFalse: [lastInt @env0:+ 1]].
						autoResolved @env0:at: rawValue put: resolved.
						rawValue := resolved]].
			(rawValue isKindOf: Integer) ifTrue: [
				lastInt := rawValue.
				maxInt := maxInt @env0:max: rawValue].
			(byValue @env0:includesKey: rawValue)
				ifTrue: [member := byValue @env0:at: rawValue]
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
									member := (UnboundMethod definingClass: cls selector: #'__new__')
										value: ({ cls } @env0:, newArgs) value: KeyValueDictionary @env0:new.
									"CPython: a member's canonical value is its _value_, set by
									__new__.  When __new__ left it unset, fall back to the raw
									class-body value (a fuller member_type(*args) reconstruction
									is a later refinement)."
									v := [member @env0:dynamicInstVarAt: #'_value_']
								@env0:on: AbstractException do: [:e | nil].
									memberValue := v @env0:isNil ifTrue: [rawValue] ifFalse: [v]]
								ifFalse: [
									member := cls @env0:basicNew.
									memberValue := rawValue].
							built := true.
							member @env0:dynamicInstVarAt: #value put: memberValue.
							member @env0:dynamicInstVarAt: #name put: nameStr.
							"CPython's canonical sunder attributes; stored as dynamic
							instVars so attribute READS see values (the attr-load path
							probes the instance store before wrapping methods)."
							member @env0:dynamicInstVarAt: #'_value_' put: memberValue.
							member @env0:dynamicInstVarAt: #'_name_' put: nameStr.
							byValue @env0:at: memberValue put: member.
							"A ZERO-valued Flag member (``BLACK = 0``) is reachable by
							name, by value -- Color(0) -- and as a class attribute, but is
							NOT canonical: CPython excludes it from iteration, len,
							reversed and _member_names_.  Plain Enum keeps zero canonical."
							((memberValue isKindOf: Integer)
								and: [memberValue @env0:= 0
								and: [Enum ___grailIsFlagClass: cls]])
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
	self ___grailRegistry___ @env0:at: cls put: (Array @env0:with: byValue with: byName with: members).
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
		| comp |
		comp := self ___grailFlagComposite: cls value: aValue.
		comp @env0:isNil ifFalse: [^ comp]].
	"A member-less enum class cannot be CALLED at all -- CPython raises
	TypeError ``<enum 'X'> has no members'' (a ValueError here would let
	assertRaises(TypeError) tests fail; test_empty_enum_has_no_values)."
	(rec @env0:isNil or: [(rec @env0:at: 3) @env0:isEmpty]) ifTrue: [
		^ TypeError ___signal___: ((Enum ___grailIsFlagClass: cls)
			ifTrue: ['<flag ''']
			ifFalse: ['<enum '''])
				@env0:, cls @env0:name @env0:asString @env0:, '''> has no members'].
	^ ValueError ___signal___: aValue @env0:printString @env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString
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
	"OR of every named member's int value."

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
	"Ordered members (for iteration / len)."

	| rec |
	rec := self ___grailRecordFor: cls.
	rec @env0:isNil ifTrue: [^ OrderedCollection @env0:new].
	^ rec @env0:at: 3
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

	| className names start pairs newCls byValue byName members |
	className := (positional @env0:at: 1) @env0:asSymbol.
	names := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	start := (keywords ~~ nil and: [keywords @env0:includesKey: 'start'])
		ifTrue: [keywords @env0:at: 'start'] ifFalse: [1].
	pairs := OrderedCollection @env0:new.
	names @env0:isNil ifFalse: [
		| isFlag autoVal nextAuto |
		"Flag-natured classes number auto members by DOUBLING (1,2,4...
		or start,2*start,... when start= is given) -- CPython Flag
		semantics; plain enums count sequentially from start."
		isFlag := self ___grailIsFlagClass: cls.
		autoVal := nil.
		nextAuto := [:idx |
			isFlag
				ifTrue: [autoVal := autoVal @env0:isNil
					ifTrue: [start @env0:max: 1]
					ifFalse: [autoVal @env0:* 2]]
				ifFalse: [autoVal := start @env0:+ idx @env0:- 1].
			autoVal].
		(names isKindOf: CharacterCollection)
			ifTrue: [
				| cleaned tokens idx |
				cleaned := names @env0:copyReplaceAll: ',' with: ' '.
				tokens := cleaned @env0:asString @env0:subStrings.
				idx := 0.
				tokens @env0:do: [:tok |
					idx := idx @env0:+ 1.
					pairs @env0:add: (Array @env0:with: tok @env0:asString
						with: (nextAuto @env0:value: idx))]]
			ifFalse: [(names isKindOf: KeyValueDictionary)
				ifTrue: [
					names @env0:keysAndValuesDo: [:k :v |
						pairs @env0:add: (Array @env0:with: k @env0:asString with: v)]]
				ifFalse: [
					| idx |
					idx := 0.
					names @env0:do: [:item |
						idx := idx @env0:+ 1.
						(item isKindOf: CharacterCollection)
							ifTrue: [pairs @env0:add: (Array @env0:with: item @env0:asString
								with: (nextAuto @env0:value: idx))]
							ifFalse: [pairs @env0:add: (Array @env0:with: (item @env0:at: 1) @env0:asString
								with: (item @env0:at: 2))]]]]].
	newCls := cls ___subclass___: className instVarNames: #() classInstVarNames: #().
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	[ | lastInt maxInt isFlag autoResolved |
	lastInt := 0.
	maxInt := 0.
	isFlag := self ___grailIsFlagClass: newCls.
	"Per-INSTANCE auto() resolution (mirrors ___grailBuildMembers, slice 5):
	the same GrailEnumAuto marker passed under two names -- the _EnumTests
	functional MainEnum does ``third = auto(); dupe = third'' then
	BaseEnum('MainEnum', dict(..., third=third, dupe=dupe)) -- must resolve
	to ONE value so dupe aliases third (byValue hit) instead of advancing
	the counter to a distinct value.  Identity-keyed: distinct auto() calls
	stay distinct."
	autoResolved := IdentityKeyValueDictionary @env0:new.
	pairs @env0:do: [:pair |
		| nameStr rawValue member |
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
			(byValue @env0:includesKey: rawValue)
				ifTrue: [member := byValue @env0:at: rawValue]
				ifFalse: [
					member := newCls @env0:basicNew.
					member @env0:dynamicInstVarAt: #value put: rawValue.
					member @env0:dynamicInstVarAt: #name put: nameStr.
					byValue @env0:at: rawValue put: member.
					"Zero-valued Flag members are non-canonical -- excluded
					from iteration/len/_member_names_ (same rule as the
					class-syntax builder)."
					((rawValue isKindOf: Integer)
						and: [rawValue @env0:= 0 and: [isFlag]])
						ifFalse: [members @env0:add: member]].
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
	| enumName modName filterFn srcMod srcNs memberPairs sortedPairs |
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
	^ Enum ___grailFunctional: etype
		positional: (Array @env0:with: enumName @env0:asString with: sortedPairs)
		keywords: nil
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
	^ self ___grailInvokeOverride: ''__format__'' args: { spec }']
		ifFalse: [src := nm @env0:, '
	^ self ___grailInvokeOverride: ''' @env0:, nm @env0:, ''' args: #()'].
	cls ___compileMethod: src category: 'Grail-Enum Member'
%

category: 'Grail-Enum Member'
method: Enum
___grailInvokeOverride: nm args: argArray
	"Call the functional-API dunder override for self's class (or nearest
	ancestor).  self is the enum member, bound as the callable's first arg."

	| tbl walker callable |
	tbl := SessionTemps @env0:current @env0:at: #GrailEnumOverrides otherwise: nil.
	callable := nil.
	(tbl ~~ nil) ifTrue: [
		walker := self @env0:class.
		[walker ~~ nil and: [callable == nil]] @env0:whileTrue: [
			| per |
			per := tbl @env0:at: walker otherwise: nil.
			per == nil ifFalse: [callable := per @env0:at: nm otherwise: nil].
			walker := walker @env0:superClass]].
	callable == nil ifTrue: [^ self __repr__].
	^ callable value: ({ self } @env0:, argArray) value: nil
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
__new__: aValue
	^ Enum ___grailLookupValue: self value: aValue
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
value: positional value: keywords
	"Generic class-call path: Color(v) value-lookup, or the functional
	API -- Enum('Name', names, **kw) -- when extra arguments arrive."
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
__new__: aValue
	^ Enum ___grailLookupValue: self value: aValue
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
__repr__
	| nm val |
	nm := self @env0:dynamicInstVarAt: #name.
	val := (self @env0:dynamicInstVarAt: #value) @env0:printString.
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
__format__: aSpec
	"A pure-Enum (or Flag) member formats as its str -- ``ClassName.name''
	-- with the spec applied to that string (CPython Enum.__format__ for a
	non-mixed enum: str.__format__(str(self), spec)).  Mixed enums
	(IntEnum, AbstractPyInt-rooted) do NOT inherit this -- they keep the
	data type's numeric formatting, which is correct."

	^ (self __str__) __format__: aSpec
%

category: 'Grail-Enum Member'
method: Enum
__eq__: other
	^ self == other
%

category: 'Grail-Enum Member'
method: Enum
__ne__: other
	^ (self == other) @env0:not
%

category: 'Grail-Enum Member'
method: Enum
__hash__
	^ self @env0:identityHash
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
__or__: other
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: (self ___flagOperand___: other))
%

category: 'Grail-Flag Member'
method: Flag
__and__: other
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: (self ___flagOperand___: other))
%

category: 'Grail-Flag Member'
method: Flag
__xor__: other
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: (self ___flagOperand___: other))
%

category: 'Grail-Flag Member'
method: Flag
__invert__
	"~A: the mask-complement within the class's named bits (CPython
	3.11+ semantics)."

	| mask v |
	mask := Enum ___grailFlagMask: self @env0:class.
	v := self @env0:dynamicInstVarAt: #value.
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
	(Enum ___grailMembers: self @env0:class) @env0:do: [:m |
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
__invert__
	"~A: the mask-complement within the class's named bits (CPython 3.11+
	gives IntFlag the same positive-complement invert as Flag)."

	| mask v |
	mask := Enum ___grailFlagMask: self @env0:class.
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
	(Enum ___grailMembers: self @env0:class) @env0:do: [:m |
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
	nm := self @env0:dynamicInstVarAt: #name.
	val := (self @env0:dynamicInstVarAt: #value) __repr__.
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, nm @env0:asString @env0:, ': ' @env0:, val @env0:asString @env0:, '>'
%

set compile_env: 0
