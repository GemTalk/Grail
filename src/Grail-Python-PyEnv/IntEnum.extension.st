Extension { #name : 'IntEnum' }

{ #category : 'Grail-Metaclass' }
IntEnum class >> ___grailDeclaredMetaclass___ [
	"""EnumType, same as Enum's -- IntEnum cannot inherit that answer.

	It is rooted at AbstractPyInt so its Smalltalk chain never passes Enum, and
	being written in Smalltalk it has no registered MI bases either, so
	___pyMetaclass___'s MRO walk has nothing to find.  StrEnum is the same shape;
	IntFlag inherits this one.  A USER's ``class Mixed(int, Enum)'' is different
	-- it does have registered bases, and the walk finds Enum through them."""

	^ Enum @env0:class

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___grailEnumRecordSlot [
	^ grailEnumRecord

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___grailEnumRecordSlot: aRecord [
	grailEnumRecord := aRecord

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___grailMetaclassNamespace___ [
	"""The EnumDict a IntEnum body runs in.  Its own copy, because a data-rooted
	enum's Smalltalk metaclass chain does not pass ``Enum class'' -- the same
	reason ___pyClassDefined___: below is redeclared here."""

	^ Enum ___grailNamespaceForClass: self

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___grailMetaclassPythonName___ [
	"CPython's name for an enum's metaclass: type(Color), type(SomeIntEnum) and
	type(SomeStrEnum) are all ``EnumType''.  Grail has three separate metaclass
	roots -- a data-rooted enum's chain reaches IntEnum class or StrEnum class
	and never Enum class -- so each declares it, exactly as each declares its
	own ___pyClassDefined___: and __signature__.

	Read by object >> ___grailPythonMetaclassName___, which is what
	``type(Color).__name__'' and repr(type(Color)) answer."

	^ 'EnumType'

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___grailSetClassBoundary___: aBoundary [
	"IntFlag's metaclass chains here (IntEnum class), not Enum class -- so an
	``class E(IntFlag, boundary=STRICT)'' resolves the boundary setter."
	^ Enum ___grailSetClassBoundary: self to: aBoundary

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___methodDocTable___ [
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

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___methodReceiverTable___ [
	"See ___methodDocTable___ above for why IntEnum names Enum's tables."

	^ Enum ___methodReceiverTable___

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___methodSignatureTable___ [
	"See ___methodDocTable___ above for why IntEnum names Enum's tables."

	^ Enum ___methodSignatureTable___

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> ___pyClassDefined___: attrNames [
	"Own hook because a data-rooted enum's metaclass chain reaches IntEnum class,
	not Enum class; the policy itself lives in one place."
	^ Enum ___grailClassDefinedFor: self names: attrNames

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __bool__ [
	"An enum class is always truthy (EnumType.__bool__); see Enum side."

	^ true

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __contains__: aValue [
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

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __convert_: positional kw: kwargs [
	"IntEnum._convert_(...) -- the IntEnum metaclass chain is AbstractPyInt-
	rooted and never reaches Enum class, so the forwarder is duplicated here."

	^ Enum ___grailConvert: positional kw: kwargs forType: self

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __format__: aSpec [
	^ self __repr__

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __getitem__: aName [
	^ Enum ___grailLookupName: self name: aName

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __iter__ [
	^ (Enum ___grailMembers: self) __iter__

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __len__ [
	^ (Enum ___grailMembers: self) @env0:size

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __new__: aValue [
	^ Enum ___grailLookupValue: self value: aValue

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __repr__ [
	^ ((Enum ___grailIsFlagClass: self)
		ifTrue: ['<flag ''']
		ifFalse: ['<enum '''])
			@env0:, self @env0:name @env0:asString @env0:, '''>'

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __reversed__ [
	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) __iter__

]

{ #category : 'Grail-Enum Metaclass Property' }
IntEnum class >> __signature__ [
	"Own hook, same reason as ___pyClassDefined___: above -- a data-rooted
	enum's metaclass chain never reaches Enum class."
	^ Enum ___grailEnumSignatureFor: self

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> __str__ [
	^ self __repr__

]

{ #category : 'Grail-Class Attrs' }
IntEnum class >> _member_map_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 2

]

{ #category : 'Grail-Class Attrs' }
IntEnum class >> _member_names_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ list @env0:withAll: #()].
	^ list @env0:withAll: ((rec @env0:at: 3)
		@env0:collect: [:m | m @env0:dynamicInstVarAt: #name])

]

{ #category : 'Grail-Class Attrs' }
IntEnum class >> _member_type_ [
	"IntEnum members ARE ints (AbstractPyInt storage)."

	^ Integer

]

{ #category : 'Grail-Class Attrs' }
IntEnum class >> _value_repr_ [
	^ None

]

{ #category : 'Grail-Class Attrs' }
IntEnum class >> _value2member_map_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 1

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> from_bytes: bytesArg _: byteorder [
	"int.from_bytes, inherited by IntEnum.  Grail's ``int'' is kernel
	Integer (which owns from_bytes), but IntEnum roots at AbstractPyInt, a
	separate class -- so IntEnum does not inherit it and ``IntStooges.
	from_bytes'' was an AttributeError.  Delegate the byte decoding to
	Integer, then -- as CPython int.from_bytes does for a subclass (calls
	cls(result)) -- resolve the int through this enum, yielding the MEMBER
	(or ValueError for an unknown value).

	AbstractPyInt class now has the general forwarders, for every int
	subclass and every arity, and answers the same member; this pair stays
	because a reinstall cannot delete an env-1 method on 4.0.0.a5 (#1727)."

	^ self from_bytes: bytesArg _: byteorder _: false

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> from_bytes: bytesArg _: byteorder _: signed [
	| raw |
	raw := Integer @env0:perform: #'from_bytes:_:_:' env: 1
		withArguments: { bytesArg. byteorder. signed }.
	^ Enum ___grailLookupValue: self value: raw

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> mro [
	^ list @env0:withAll: (self __mro__)

]

{ #category : 'Grail-Enum Metaclass' }
IntEnum class >> value: positional value: keywords [
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)

]

{ #category : 'Grail-Enum Member' }
IntEnum >> __format__: aSpec [
	"IntEnum / IntFlag members format as their int value (ReprEnum), so a
	numeric spec (format(Size.BIG, 'd')) works and an empty spec yields the
	int str -- delegate to the int value's __format__."

	^ (self @env0:value) __format__: aSpec

]

{ #category : 'Grail-Pickle' }
IntEnum >> __reduce__ [
	"(cls, (value,)) -- AbstractPyInt-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-Pickle' }
IntEnum >> __reduce_ex__: proto [
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-Enum Member' }
IntEnum >> __repr__ [
	| nm val |
	(Enum ___grailIsGlobalEnum: self @env0:class) ifTrue: [^ Enum ___grailGlobalMemberRepr: self].
	nm := self @env0:dynamicInstVarAt: #name.
	val := self @env0:value @env0:printString.
	^ '<' @env0:, self @env0:class @env0:name @env0:asString @env0:, '.'
		@env0:, nm @env0:, ': ' @env0:, val @env0:, '>'

]

{ #category : 'Grail-Enum Member' }
IntEnum >> __str__ [
	"CPython 3.11+ (ReprEnum): IntEnum / IntFlag members str as their INT
	VALUE, not <Class.name> -- str(Size.BIG) is '7'.  repr stays
	enum-style (<Size.BIG: 7>, above).  IntFlag < IntEnum inherits this,
	which is correct (str(anIntFlag) is its int too)."

	^ (self @env0:value) __str__

]

{ #category : 'Grail-Enum Member' }
IntEnum >> name [
	^ self @env0:dynamicInstVarAt: #name

]
