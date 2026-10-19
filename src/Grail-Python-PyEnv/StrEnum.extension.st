Extension { #name : 'StrEnum' }

{ #category : 'Grail-Metaclass' }
StrEnum class >> ___grailDeclaredMetaclass___ [
	"""EnumType -- see IntEnum's, which this mirrors for the AbstractPyStr root."""

	^ Enum @env0:class

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> ___grailEnumRecordSlot [
	^ grailEnumRecord

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> ___grailEnumRecordSlot: aRecord [
	grailEnumRecord := aRecord

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> ___grailMetaclassNamespace___ [
	"""The EnumDict a StrEnum body runs in.  Its own copy, because a data-rooted
	enum's Smalltalk metaclass chain does not pass ``Enum class'' -- the same
	reason ___pyClassDefined___: below is redeclared here."""

	^ Enum ___grailNamespaceForClass: self

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> ___grailMetaclassPythonName___ [
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
StrEnum class >> ___grailSetClassBoundary___: aBoundary [
	"For symmetry with Enum/IntEnum class -- a data-mixed flag whose metaclass
	chains through StrEnum class still resolves the boundary setter."
	^ Enum ___grailSetClassBoundary: self to: aBoundary

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> ___pyClassDefined___: attrNames [
	"Own hook because a data-rooted enum's metaclass chain reaches StrEnum class,
	not Enum class; the policy itself lives in one place."
	^ Enum ___grailClassDefinedFor: self names: attrNames

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __bool__ [
	^ true

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __contains__: aValue [
	| rec |
	(aValue isKindOf: self) ifTrue: [^ true].
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ false].
	((rec @env0:at: 3) @env0:includesIdentical: aValue) ifTrue: [^ true].
	((rec @env0:at: 1) @env0:includesKey: aValue) ifTrue: [^ true].
	^ false

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __convert_: positional kw: kwargs [
	"StrEnum._convert_(...) -- duplicated onto the AbstractPyStr-rooted
	StrEnum metaclass (same reason as IntEnum)."

	^ Enum ___grailConvert: positional kw: kwargs forType: self

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __format__: aSpec [
	^ self __repr__

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __getitem__: aName [
	^ Enum ___grailLookupName: self name: aName

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __iter__ [
	^ (Enum ___grailMembers: self) __iter__

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __len__ [
	^ (Enum ___grailMembers: self) @env0:size

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __new__: aValue [
	^ Enum ___grailLookupValue: self value: aValue

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __repr__ [
	^ '<enum ''' @env0:, self @env0:name @env0:asString @env0:, '''>'

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __reversed__ [
	^ (list @env0:withAll: (Enum ___grailMembers: self) @env0:reverse) __iter__

]

{ #category : 'Grail-Enum Metaclass Property' }
StrEnum class >> __signature__ [
	"Own hook, same reason as ___pyClassDefined___: above -- a data-rooted
	enum's metaclass chain never reaches Enum class."
	^ Enum ___grailEnumSignatureFor: self

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> __str__ [
	^ self __repr__

]

{ #category : 'Grail-Class Attrs' }
StrEnum class >> _member_map_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 2

]

{ #category : 'Grail-Class Attrs' }
StrEnum class >> _member_names_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ list @env0:withAll: #()].
	^ list @env0:withAll: ((rec @env0:at: 3)
		@env0:collect: [:m | m @env0:dynamicInstVarAt: #name])

]

{ #category : 'Grail-Class Attrs' }
StrEnum class >> _member_type_ [
	"StrEnum members ARE strings (AbstractPyStr storage).  Answer the ``str''
	handle, not a concrete Unicode class, so ``StrEnum._member_type_ is str''
	holds like the int/float cases -- see ___grailNormalizeMemberType:."

	^ Enum ___grailStrBuiltin

]

{ #category : 'Grail-Class Attrs' }
StrEnum class >> _value_repr_ [
	^ None

]

{ #category : 'Grail-Class Attrs' }
StrEnum class >> _value2member_map_ [
	| rec |
	rec := Enum ___grailRecordFor: self.
	rec @env0:isNil ifTrue: [^ KeyValueDictionary @env0:new].
	^ rec @env0:at: 1

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> mro [
	^ list @env0:withAll: (self __mro__)

]

{ #category : 'Grail-Enum Metaclass' }
StrEnum class >> value: positional value: keywords [
	((positional @env0:size @env0:>= 2)
		or: [keywords ~~ nil and: [keywords @env0:size @env0:> 0]])
		ifTrue: [^ Enum ___grailFunctional: self positional: positional keywords: keywords].
	^ Enum ___grailLookupValue: self value: (positional @env0:at: 1)

]

{ #category : 'Grail-Pickle' }
StrEnum >> __reduce__ [
	"(cls, (value,)) -- AbstractPyStr-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-Pickle' }
StrEnum >> __reduce_ex__: proto [
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-Enum Member' }
StrEnum >> __repr__ [
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

]

{ #category : 'Grail-Enum Member' }
StrEnum >> name [
	^ self @env0:dynamicInstVarAt: #name

]
