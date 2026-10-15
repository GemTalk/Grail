Extension { #name : 'Flag' }

{ #category : 'Grail-Flag Member' }
Flag class >> ___methodDocTable___ [
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

]

{ #category : 'Grail-Class Attrs' }
Flag class >> _boundary_ [
	"CPython FlagBoundary: how a Flag handles bits with no named member.  Delegate
	to ___grailFlagBoundaryOf: self so a ``boundary='' class-keyword override on a
	normally-chained Flag subclass (Iron(Flag, boundary=CONFORM)) is honoured;
	with no override this answers the plain-Flag default #STRICT, so
	``enum.Flag._boundary_ is STRICT'' still holds (self is the RECEIVER, so a
	subclass reads its OWN effective boundary).  Read by
	test_open_invert_expectations / test_boundary."

	^ Enum ___grailBoundaryMemberFor: (Enum ___grailFlagBoundaryOf: self)

]

{ #category : 'Grail-Flag Member' }
Flag >> ___compositeName___ [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> ___flagOperand___: other [
	"___flagOperandOrNil___: with the generic raise, for callers that have no
	operator to name."

	| v |
	v := self ___flagOperandOrNil___: other.
	v @env0:isNil ifTrue: [
		^ TypeError ___signal___: 'unsupported operand type(s) for flag operation'].
	^ v

]

{ #category : 'Grail-Flag Member' }
Flag >> ___flagOperandOrNil___: other [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> ___flagOperandTypeError___: other op: opString [
	"CPython's message for a rejected flag operand, naming both types in
	evaluation order: unsupported operand type(s) for |: 'PlainA' and 'PlainB'."

	^ TypeError ___signal___: ('unsupported operand type(s) for ' @env0:, opString
		@env0:, ': ''' @env0:, (Enum ___grailOperandTypeName: self)
		@env0:, ''' and ''' @env0:, (Enum ___grailOperandTypeName: other)
		@env0:, '''')

]

{ #category : 'Grail-Flag Member' }
Flag >> ___grailNoneCombineStr: other [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> ___isTruthy___ [
	^ (self @env0:dynamicInstVarAt: #value) @env0:~= 0

]

{ #category : 'Grail-Flag Member' }
Flag >> __and__: other [
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with &'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '&'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) ___pyBitAnd___: ov)

]

{ #category : 'Grail-Flag Member' }
Flag >> __bool__ [
	^ (self @env0:dynamicInstVarAt: #value) @env0:~= 0

]

{ #category : 'Grail-Flag Member' }
Flag >> __contains__: other [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> __invert__ [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> __iter__ [
	"Iterate a Flag MEMBER: yield its canonical SINGLE-BIT component members in
	definition order (CPython 3.11+: ``list(Color.PURPLE)'' -> [RED, BLUE];
	``list(Color.BLACK)'' -> []; a multi-bit member is decomposed, never
	yielded whole).  Mirrors ___grailMemberStr's decomposition and, like the
	operator methods above, is COPIED onto MI flag classes (class E(int, Flag))
	so IntFlag members iterate too."

	^ (Enum ___grailFlagComponents: self) __iter__

]

{ #category : 'Grail-Flag Member' }
Flag >> __len__ [
	"``len(member)'' -- the number of single-bit flags set (CPython 3.11+), so
	len(Color.BLACK) is 0 and len(Color.WHITE) is 3.

	Also what ``Color.__len__(member)'' reaches: the class's own __len__ shadows
	the metaclass one that counts MEMBERS, exactly as CPython's Flag.__len__
	shadows EnumType.__len__ (test_member_length).  Without it the unbound handle
	found the unary metaclass method and reported ``__len__() takes a different
	number of arguments (1 given)''."

	^ (Enum ___grailFlagComponents: self) @env0:size

]

{ #category : 'Grail-Flag Member' }
Flag >> __or__: other [
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with |'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '|'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) @env0:bitOr: ov)

]

{ #category : 'Grail-Flag Member' }
Flag >> __repr__ [
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

]

{ #category : 'Grail-Flag Member' }
Flag >> __str__ [
	"Perm.R|X; the EMPTY flag is Perm(0) (CPython 3.11+)."

	| v nm0 |
	v := self @env0:dynamicInstVarAt: #value.
	nm0 := self @env0:dynamicInstVarAt: #name.
	((nm0 @env0:isNil or: [nm0 == None])
		and: [(v isKindOf: Integer) and: [v @env0:= 0]]) ifTrue: [
		^ self @env0:class @env0:name @env0:asString @env0:, '(0)'].
	^ self @env0:class @env0:name @env0:asString @env0:, '.' @env0:, self ___compositeName___

]

{ #category : 'Grail-Flag Member' }
Flag >> __xor__: other [
	| none ov |
	(none := self ___grailNoneCombineStr: other) @env0:isNil ifFalse: [
		^ TypeError ___signal___: '''' @env0:, none @env0:, ''' cannot be combined with other flags with ^'].
	ov := self ___flagOperandOrNil___: other.
	ov @env0:isNil ifTrue: [^ self ___flagOperandTypeError___: other op: '^'].
	^ Enum ___grailLookupValue: self @env0:class
		value: ((self @env0:dynamicInstVarAt: #value) ___pyBitXor___: ov)

]
