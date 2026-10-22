Extension { #name : 'IntFlag' }

{ #category : 'Grail-Class Attrs' }
IntFlag class >> _boundary_ [
	"IntFlag defaults to KEEP -- out-of-range bits are preserved.  Delegate to
	___grailFlagBoundaryOf: self so a ``boundary='' override
	(Iron(IntFlag, boundary=STRICT)) wins, while a plain IntFlag / override-free
	subclass answers the #KEEP default -- ``enum.IntFlag._boundary_ is KEEP''."

	^ Enum ___grailBoundaryMemberFor: (Enum ___grailFlagBoundaryOf: self)

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> ___compositeName___ [
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

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> ___flagOperand___: other [
	"___flagOperandOrNil___: with the generic raise, mirroring
	Flag>>___flagOperand___:."

	| v |
	v := self ___flagOperandOrNil___: other.
	v @env0:isNil ifTrue: [
		^ TypeError ___signal___: 'unsupported operand type(s) for flag operation'].
	^ v

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> ___flagOperandOrNil___: other [
	"The int to combine with, or NIL for an operand that is not an int --
	CPython's Flag._get_value with int as the member type: a member of any
	int-enum flavor, any int subclass, a plain int, or a bool (Lib/enum.py).

	NIL so the operators answer NotImplemented, as CPython's do: ``F.A | 'x'''
	then raises ``unsupported operand type(s) for |: 'F' and 'str''' from the
	binary fallback, after the operand's own __ror__ has had its turn.  The
	operators raised Grail's ``unsupported operand type(s) for flag
	operation'' instead, for a bool as well (``F.A | True'' is <F.A: 1>)."

	((other isKindOf: IntFlag)
		or: [other @env0:class == self @env0:class]) ifTrue: [
		^ other @env0:dynamicInstVarAt: #value].
	(other isKindOf: AbstractPyInt) ifTrue: [
		| v |
		v := other @env0:dynamicInstVarAt: #value.
		v @env0:isNil ifFalse: [^ v]].
	(other isKindOf: Integer) ifTrue: [^ other].
	(other isKindOf: Boolean) ifTrue: [^ other __int__].
	^ nil

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> ___foreignFlagClassOf___: other [
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

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __and__: other [
	| ov |
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ NotImplemented].
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitAnd: ov)
		foreign: (self ___foreignFlagClassOf___: other)

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __contains__: other [
	"``B in (A|B)``: membership by bit coverage.  Only a member of the
	receiver's own class, as Flag>>__contains__: has it: ``2 in F.B'' is a
	TypeError in CPython, though ``F.A | 2'' is legal."

	| ov v |
	(other @env0:isKindOf: self @env0:class) ifFalse: [
		^ Enum ___grailSignalUnsupportedIn: other flag: self].
	ov := other @env0:dynamicInstVarAt: #value.
	v := self @env0:dynamicInstVarAt: #value.
	^ (v @env0:bitAnd: ov) @env0:= ov

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __invert__ [
	"~A: the mask-complement within the class's named bits (CPython 3.11+
	gives IntFlag the same positive-complement invert as Flag).  KEEP boundary
	complements within the FULL named-member mask (including an explicit
	multi-bit ``MASK = 255''), so ``~OpenAB.A'' is OpenAB(254), not B."

	| mask v |
	mask := Enum ___grailFlagNamedMask: self @env0:class.
	v := self @env0:dynamicInstVarAt: #value.
	^ Enum ___grailIntFlagValue: self @env0:class
		value: (mask @env0:bitXor: (mask @env0:bitAnd: v))

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __iter__ [
	"Iterate an IntFlag MEMBER: yield its canonical SINGLE-BIT component members
	in definition order (CPython 3.11+).  Mirrors Flag>>__iter__ -- the
	decomposition is storage-agnostic (reads the #value dynInstVar), but IntFlag
	is AbstractPyInt-rooted and does not inherit Flag, so it needs its own copy
	(like the operator methods above)."

	^ (Enum ___grailFlagComponents: self) __iter__

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __len__ [
	"``len(member)'' -- the number of single-bit flags set (CPython 3.11+), so
	len(Color.BLACK) is 0 and len(Color.WHITE) is 3.

	Also what ``Color.__len__(member)'' reaches: the class's own __len__ shadows
	the metaclass one that counts MEMBERS, exactly as CPython's Flag.__len__
	shadows EnumType.__len__ (test_member_length).  Without it the unbound handle
	found the unary metaclass method and reported ``__len__() takes a different
	number of arguments (1 given)''."

	^ (Enum ___grailFlagComponents: self) @env0:size

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __or__: other [
	| ov |
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ NotImplemented].
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: ov)
		foreign: (self ___foreignFlagClassOf___: other)

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __rand__: other [
	^ self __and__: other

]

{ #category : 'Grail-Pickle' }
IntFlag >> __reduce__ [
	"(cls, (value,)) -- AbstractPyInt-rooted, so Enum's is not inherited."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-Pickle' }
IntFlag >> __reduce_ex__: proto [
	"pickle asks for this one FIRST; see Enum >> __reduce_ex__:."

	^ Enum ___grailReduceOf: self

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __repr__ [
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

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __ror__: other [
	"``int | flag`` (int on the left): kernel Integer's __or__ delegates to
	the right operand's __ror__ via ___binOpFallback___.  |/&/^ are
	commutative, so the reflected form mirrors the forward one -- without
	these ``3 | Perm.R`` raised ``unsupported operand'' (OldTestIntFlag
	test_or/test_and/test_xor exercise both operand orders)."
	^ self __or__: other

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __rxor__: other [
	^ self __xor__: other

]

{ #category : 'Grail-IntFlag Member' }
IntFlag >> __xor__: other [
	| ov |
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ NotImplemented].
	^ Enum ___grailIntFlagValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitXor: ov)
		foreign: (self ___foreignFlagClassOf___: other)

]
