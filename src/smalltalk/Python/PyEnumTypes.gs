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

run
Enum comment: 'Python enum base — see category comment in PyEnumTypes.gs.'.
#( #Enum #Flag #IntEnum #IntFlag #GrailEnumAuto ) do: [:nm | (Python at: nm) category: 'Grail-Modules'].
%

! ------------------- Remove existing behavior (env 0 + env 1)
run
#( #Enum #Flag #IntEnum #IntFlag ) do: [:nm | | c |
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
___grailBuildMembers: cls names: attrNames
	"Turn each class-body NAME=value on cls into a singleton member (an
	instance of cls).  Equal values alias to the first member (CPython
	semantics).  Members are written back as the class attributes and
	recorded in EnumRegistry."

	| byValue byName members lastInt |
	"Reserved-name validation (CPython EnumType.__new__): a class-body
	ASSIGNMENT may not rebind ``mro`` (it would shadow type.mro) nor use a
	_sunder_ name outside the supported set -- ValueError at definition
	(test_invalid_names across every enum flavor)."
	attrNames @env0:do: [:nameSym | | ns sz |
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
	attrNames @env0:do: [:nameSym | | nameStr |
		nameStr := nameSym @env0:asString.
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_]) ifFalse: [
			| rawValue member |
			rawValue := cls @env0:perform: nameSym env: 1.
			"auto() markers resolve to last-integer-value + 1 in
			declaration order -- except Flag-natured classes, where the
			next auto value is the next power of two ABOVE the last
			(CPython Flag._generate_next_value_)."
			(rawValue @env0:isKindOf: GrailEnumAuto) ifTrue: [
				rawValue := (Enum ___grailIsFlagClass: cls)
					ifTrue: [lastInt @env0:<= 0
						ifTrue: [1]
						ifFalse: [1 @env0:bitShift: lastInt @env0:highBit]]
					ifFalse: [lastInt @env0:+ 1]].
			(rawValue @env0:isKindOf: Integer) ifTrue: [lastInt := rawValue].
			(byValue @env0:includesKey: rawValue)
				ifTrue: [member := byValue @env0:at: rawValue]
				ifFalse: [
					member := cls @env0:basicNew.
					member @env0:dynamicInstVarAt: #value put: rawValue.
					member @env0:dynamicInstVarAt: #name put: nameStr.
					"CPython's canonical sunder attributes; stored as dynamic
					instVars so attribute READS see values (the attr-load
					path probes the instance store before wrapping methods)."
					member @env0:dynamicInstVarAt: #'_value_' put: rawValue.
					member @env0:dynamicInstVarAt: #'_name_' put: nameStr.
					byValue @env0:at: rawValue put: member.
					members @env0:add: member].
			byName @env0:at: nameStr put: member.
			cls @env0:perform: (nameStr @env0:, ':') @env0:asSymbol env: 1
				withArguments: (Array @env0:with: member)]].
	self ___grailRegistry___ @env0:at: cls put: (Array @env0:with: byValue with: byName with: members).
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
			@env0:== #'Grail-Enum Metaclass') not])
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
	((prov @env0:== Enum @env0:class)
		or: [(prov @env0:== IntEnum @env0:class)
		or: [(prov @env0:notNil and: [(cls @env0:class @env0:categoryOfSelector: #'value:value:' environmentId: 1) @env0:== #'Grail-Enum Metaclass'])]]) ifFalse: [
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
	(aValue @env0:isKindOf: cls) ifTrue: [^ aValue].
	((aValue @env0:isKindOf: Integer)
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

	((cls @env0:== Flag) or: [cls @env0:inheritsFrom: Flag]) ifTrue: [^ true].
	((cls @env0:== IntFlag) or: [cls @env0:inheritsFrom: IntFlag]) ifTrue: [^ true].
	^ [ (cls @env1:__mro__) @env0:includesIdentical: Flag ]
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
			(mv @env0:isKindOf: Integer) ifTrue: [
				((intValue @env0:bitAnd: mv) @env0:= mv) ifTrue: [
					covered := covered @env0:bitOr: mv]]].
		covered @env0:= intValue ifFalse: [^ nil]].
	member := cls @env0:basicNew.
	member @env0:dynamicInstVarAt: #value put: intValue.
	member @env0:dynamicInstVarAt: #name put: nil.
	member @env0:dynamicInstVarAt: #'_value_' put: intValue.
	"Composite pseudo-members have no name; expose Python None (nil is
	the project's ABSENT marker and would fall through to a method wrap)."
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
		(mv @env0:isKindOf: Integer) ifTrue: [mask := mask @env0:bitOr: mv]].
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
	start := (keywords @env0:~~ nil and: [keywords @env0:includesKey: 'start'])
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
		(names @env0:isKindOf: CharacterCollection)
			ifTrue: [
				| cleaned tokens idx |
				cleaned := names @env0:copyReplaceAll: ',' with: ' '.
				tokens := cleaned @env0:asString @env0:subStrings.
				idx := 0.
				tokens @env0:do: [:tok |
					idx := idx @env0:+ 1.
					pairs @env0:add: (Array @env0:with: tok @env0:asString
						with: (nextAuto @env0:value: idx))]]
			ifFalse: [(names @env0:isKindOf: KeyValueDictionary)
				ifTrue: [
					names @env0:keysAndValuesDo: [:k :v |
						pairs @env0:add: (Array @env0:with: k @env0:asString with: v)]]
				ifFalse: [
					| idx |
					idx := 0.
					names @env0:do: [:item |
						idx := idx @env0:+ 1.
						(item @env0:isKindOf: CharacterCollection)
							ifTrue: [pairs @env0:add: (Array @env0:with: item @env0:asString
								with: (nextAuto @env0:value: idx))]
							ifFalse: [pairs @env0:add: (Array @env0:with: (item @env0:at: 1) @env0:asString
								with: (item @env0:at: 2))]]]]].
	newCls := cls ___subclass___: className instVarNames: #() classInstVarNames: #().
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	[ | lastInt isFlag |
	lastInt := 0.
	isFlag := self ___grailIsFlagClass: newCls.
	pairs @env0:do: [:pair |
		| nameStr rawValue member |
		nameStr := pair @env0:at: 1.
		rawValue := pair @env0:at: 2.
		"auto() markers can arrive through the mapping/pairs forms
		(BaseEnum('MainEnum', dict(first=auto(), ...))) -- resolve with
		the same per-class rule as class-body members."
		(rawValue @env0:isKindOf: GrailEnumAuto) ifTrue: [
			rawValue := isFlag
				ifTrue: [lastInt @env0:<= 0
					ifTrue: [1]
					ifFalse: [1 @env0:bitShift: lastInt @env0:highBit]]
				ifFalse: [lastInt @env0:+ 1]].
		(rawValue @env0:isKindOf: Integer) ifTrue: [lastInt := rawValue].
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_]) ifFalse: [
			(byValue @env0:includesKey: rawValue)
				ifTrue: [member := byValue @env0:at: rawValue]
				ifFalse: [
					member := newCls @env0:basicNew.
					member @env0:dynamicInstVarAt: #value put: rawValue.
					member @env0:dynamicInstVarAt: #name put: nameStr.
					byValue @env0:at: rawValue put: member.
					members @env0:add: member].
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
	[walker @env0:~~ nil] @env0:whileTrue: [
		walker @env0:== Enum ifTrue: [^ object].
		walker @env0:== IntEnum ifTrue: [^ Integer].
		walker @env0:== AbstractPyInt ifTrue: [^ Integer].
		walker @env0:== AbstractPyFloat ifTrue: [^ Float].
		((walker @env0:== PythonInstance) or: [walker @env0:== Object]) ifTrue: [^ object].
		"For MI enums (``class E(date, Enum)``) the Smalltalk chain
		never passes Enum -- the first ancestor that is NOT itself an
		enum class (no member record, not Enum-chained) is the data
		base."
		((Enum ___grailRecordFor: walker) @env0:isNil
			and: [(walker @env0:inheritsFrom: Enum) not
			and: [walker @env0:~~ self]]) ifTrue: [^ walker].
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
		or: [keywords @env0:~~ nil and: [keywords @env0:size @env0:> 0]])
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
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	((aValue @env0:isKindOf: Integer)
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

	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) @env1:__iter__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__getitem__: aName
	^ Enum ___grailLookupName: self name: aName
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__iter__
	^ (Enum ___grailMembers: self) @env1:__iter__
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
	^ self @env1:__repr__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
__format__: aSpec
	^ self @env1:__repr__
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
mro
	"cls.mro() -- the resolution order as a LIST (CPython type.mro())."

	^ list @env0:withAll: (self @env1:__mro__)
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
		or: [keywords @env0:~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__contains__: aValue
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	((aValue @env0:isKindOf: Integer)
		and: [Enum ___grailIsFlagClass: self]) ifTrue: [
		| mask |
		mask := Enum ___grailFlagMask: self.
		^ (aValue @env0:bitAnd: mask) @env0:= aValue].
	^ false
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__reversed__
	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) @env1:__iter__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__getitem__: aName
	^ Enum ___grailLookupName: self name: aName
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__iter__
	^ (Enum ___grailMembers: self) @env1:__iter__
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
	^ self @env1:__repr__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
__format__: aSpec
	^ self @env1:__repr__
%

category: 'Grail-Enum Metaclass'
classmethod: IntEnum
mro
	^ list @env0:withAll: (self @env1:__mro__)
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
__eq__: other
	^ self @env0:== other
%

category: 'Grail-Enum Member'
method: Enum
__ne__: other
	^ (self @env0:== other) @env0:not
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

	((other @env0:isKindOf: Flag)
		or: [other @env0:class @env0:== self @env0:class]) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	(other @env0:isKindOf: AbstractPyInt) ifTrue: [
		| v |
		v := other @env0:dynamicInstVarAt: #value.
		v @env0:isNil ifFalse: [^ v]].
	(other @env0:isKindOf: Integer) ifTrue: [^ other].
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
	nm @env0:isNil ifFalse: [^ nm].
	v := self @env0:dynamicInstVarAt: #value.
	parts := OrderedCollection @env0:new.
	(Enum ___grailMembers: self @env0:class) @env0:do: [:m |
		| mv |
		mv := m @env0:dynamicInstVarAt: #value.
		((mv @env0:isKindOf: Integer)
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

	| v |
	v := self @env0:dynamicInstVarAt: #value.
	((self @env0:dynamicInstVarAt: #name) @env0:isNil
		and: [(v @env0:isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
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

	| v |
	v := self @env0:dynamicInstVarAt: #value.
	((self @env0:dynamicInstVarAt: #name) @env0:isNil
		and: [(v @env0:isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
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
	^ self @env0:class @env0:name @env0:asString @env0:, '.' @env0:,
		(self @env0:dynamicInstVarAt: #name)
%

set compile_env: 0
