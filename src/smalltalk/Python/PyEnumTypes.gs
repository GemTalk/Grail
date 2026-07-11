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
#( #Enum #Flag #IntEnum #IntFlag ) do: [:nm | (Python at: nm) category: 'Grail-Modules'].
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
___grailRecordFor: cls
	"The {byValue. byName. members} record for an enum class, or nil."

	EnumRegistry @env0:isNil ifTrue: [^ nil].
	^ EnumRegistry @env0:at: cls otherwise: nil
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailBuildMembers: cls names: attrNames
	"Turn each class-body NAME=value on cls into a singleton member (an
	instance of cls).  Equal values alias to the first member (CPython
	semantics).  Members are written back as the class attributes and
	recorded in EnumRegistry."

	| byValue byName members |
	EnumRegistry @env0:isNil ifTrue: [EnumRegistry := IdentityKeyValueDictionary @env0:new].
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	attrNames @env0:do: [:nameSym | | nameStr |
		nameStr := nameSym @env0:asString.
		((nameStr @env0:size @env0:> 0) and: [(nameStr @env0:at: 1) @env0:= $_]) ifFalse: [
			| rawValue member |
			rawValue := cls @env0:perform: nameSym env: 1.
			(byValue @env0:includesKey: rawValue)
				ifTrue: [member := byValue @env0:at: rawValue]
				ifFalse: [
					member := cls @env0:basicNew.
					member @env0:dynamicInstVarAt: #value put: rawValue.
					member @env0:dynamicInstVarAt: #name put: nameStr.
					byValue @env0:at: rawValue put: member.
					members @env0:add: member].
			byName @env0:at: nameStr put: member.
			cls @env0:perform: (nameStr @env0:, ':') @env0:asSymbol env: 1
				withArguments: (Array @env0:with: member)]].
	EnumRegistry @env0:at: cls put: (Array @env0:with: byValue with: byName with: members).
	"Drop the ClassDefAst-emitted generic instantiation (env-1
	``value:value:``) so calling the class — Color(value) — reaches the
	inherited enum value-lookup instead of trying to build an instance."
	((cls @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'value:value:')
		ifTrue: [
			[cls @env0:class @env0:removeSelector: #'value:value:' environmentId: 1]
				@env0:on: Error do: [:ex |
					"A host extent may hook method removal (e.g. a change-
					notification framework patched into Behavior) and fail
					AFTER the selector is already gone.  Swallow the hook's
					failure when the removal took; anything else passes."
					((cls @env0:class @env0:methodDictForEnv: 1) @env0:includesKey: #'value:value:')
						ifTrue: [ex @env0:pass]]].
	^ cls
%

category: 'Grail-Enum Metaclass'
classmethod: Enum
___grailLookupValue: cls value: aValue
	"Color(value) -> the member with that value."

	| rec |
	rec := self ___grailRecordFor: cls.
	(rec @env0:notNil and: [(rec @env0:at: 1) @env0:includesKey: aValue])
		ifTrue: [^ (rec @env0:at: 1) @env0:at: aValue].
	(aValue @env0:isKindOf: cls) ifTrue: [^ aValue].
	^ ValueError ___signal___: aValue @env0:printString @env0:, ' is not a valid ' @env0:, cls @env0:name @env0:asString
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
		(names @env0:isKindOf: CharacterCollection)
			ifTrue: [
				| cleaned tokens idx |
				cleaned := names @env0:copyReplaceAll: ',' with: ' '.
				tokens := cleaned @env0:asString @env0:subStrings.
				idx := 0.
				tokens @env0:do: [:tok |
					idx := idx @env0:+ 1.
					pairs @env0:add: (Array @env0:with: tok @env0:asString
						with: start @env0:+ idx @env0:- 1)]]
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
								with: start @env0:+ idx @env0:- 1)]
							ifFalse: [pairs @env0:add: (Array @env0:with: (item @env0:at: 1) @env0:asString
								with: (item @env0:at: 2))]]]]].
	newCls := cls ___subclass___: className instVarNames: #() classInstVarNames: #().
	EnumRegistry @env0:isNil ifTrue: [EnumRegistry := IdentityKeyValueDictionary @env0:new].
	byValue := KeyValueDictionary @env0:new.
	byName := KeyValueDictionary @env0:new.
	members := OrderedCollection @env0:new.
	pairs @env0:do: [:pair |
		| nameStr rawValue member |
		nameStr := pair @env0:at: 1.
		rawValue := pair @env0:at: 2.
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
				category: 'Grail-Class Attrs']].
	EnumRegistry @env0:at: newCls put: (Array @env0:with: byValue with: byName with: members).
	^ newCls
%

! ------------------- Enum class: metaclass entry points

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

! ------------------- IntEnum class: thin delegators to Enum's shared logic

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
