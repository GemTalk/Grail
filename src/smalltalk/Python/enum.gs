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
	"enum.EnumDict is a real class (Python dictionary), not plain dict: it
	refuses to let a member name be reused.  Resolved at IMPORT time rather
	than compiled in, since EnumDict.gs files after this one."
	self @env0:at: #EnumDict put: (Python @env0:at: #'EnumDict' otherwise: dict).
	"Enum / IntEnum / IntFlag / StrEnum / Flag are all real classes now
	(see PyEnumTypes.gs): ``class X(IntEnum): A = 1`` builds real members
	via the metaclass hook ``___pyClassDefined___:``.  StrEnum is
	AbstractPyStr-rooted so its members ARE strings (str(member) == value,
	the ReprEnum contract)."
	self @env0:at: #Enum put: Enum.
	self @env0:at: #EnumType put: Enum @env0:class.
	"``enum.property'' is NOT the builtin property: it is the descriptor that
	hides from the CLASS so an enum member can have a ``name'' while the class
	keeps its own meaning for that name (types.DynamicClassAttribute is the
	same object, and types.py imports it from here).  Exporting
	PropertyDescriptor for it made the two one behaviour, and the enum case
	took the property answer -- class access handed back the descriptor where
	CPython raises AttributeError."
	"DynamicClassAttribute is exported under the name ``property'', and it says
	so: install.gs stamps its __module__/__qualname__ once the class exists.
	See object class >> ___stampPythonIdentity___: for why that matters."
	self @env0:at: #property put: DynamicClassAttribute.
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
	self @env0:dynamicInstVarAt: #member put: (BoundMethod receiver: self selector: #member:).
	"``_reduce_ex_by_global_name'' is assigned OVER a class's __reduce_ex__
	(test_pickle_by_name), so it has to be a plain function taking self first --
	an UnboundMethod.  The module-attribute BoundMethod every other helper here
	answers would not bind: ___isDescriptorCallable___ refuses to bind one whose
	receiver is a Smalltalk-implemented module, because that models a C
	function, and a C function is not a descriptor.  CPython's is pure Python."
	self @env0:dynamicInstVarAt: #'_reduce_ex_by_global_name'
		put: (UnboundMethod @env1:definingClass: Enum
			selector: #'___grailReduceExByGlobalName___').
	"``pickle_by_enum_name'' / ``pickle_by_global_name'' -- CPython's two public
	replacement reductions, for a member whose ordinary value-based one cannot
	work.  ``class NEI(NamedInt, Enum)'' is the case test_enum names: the default
	(cls, (value,)) rebuilds the VALUE, and NamedInt.__new__ refuses a value with
	no name, so the class assigns pickle_by_enum_name over its own __reduce_ex__
	and the member travels as (getattr, (cls, name)) instead.

	UnboundMethods for the same reason as the private alias just above: these are
	ASSIGNED onto a class, so they have to take self first."
	self @env0:dynamicInstVarAt: #'pickle_by_enum_name'
		put: (UnboundMethod @env1:definingClass: Enum
			selector: #'___grailReduceExByEnumName___').
	self @env0:dynamicInstVarAt: #'pickle_by_global_name'
		put: (UnboundMethod @env1:definingClass: Enum
			selector: #'___grailReduceExByGlobalName___').
	"``__all__'' -- the module's declared API, which enum simply did not have.
	It is what test.support.check__all__ inspects, and what any consumer asking
	what this module exports reads.

	It does NOT currently drive ``from enum import *'': Grail's star-import walks
	the module's own dict entries and dynamic instVars instead, so it already
	imported most of these and still misses ``unique'' and ``global_enum'',
	which are METHODS rather than stored entries.  Teaching the star-import to
	consult __all__ is a change in the import machinery, not here; the gap is
	pinned in tests/python/enum_module_api.py so this list is not mistaken for a
	fix to it.

	This is what enum ACTUALLY exports, which is not quite CPython's list.
	Absent here, each for its own reason: ``FlagBoundary'' and ``EnumCheck'',
	because Grail models their MEMBERS as opaque symbols and never builds the
	enclosing enum; and the ``global_flag_repr'' / ``global_enum_repr'' /
	``global_str'' / ``pickle_by_global_name'' / ``pickle_by_enum_name'' helpers,
	which Grail has not needed.  A name listed here that the module does not
	define would break ``import *'' outright, so this list tracks reality rather
	than upstream's.

	``show_flag_values'' IS defined and is deliberately unlisted, exactly as
	upstream -- test_enum's own check names it as not_exported."
	self @env0:at: #'__all__' put: (list @env0:withAll: #(
		'EnumType' 'EnumMeta' 'EnumDict'
		'Enum' 'IntEnum' 'StrEnum' 'Flag' 'IntFlag' 'ReprEnum'
		'auto' 'unique' 'verify' 'member' 'nonmember' 'property'
		'STRICT' 'CONFORM' 'EJECT' 'KEEP'
		'CONTINUOUS' 'NAMED_FLAGS' 'UNIQUE'
		'global_enum' 'pickle_by_enum_name' 'pickle_by_global_name'))
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
	powers of two for a flag.  NAMED_FLAGS is enforced as well (test_composite):
	every bit an alias carries must belong to some named member."

	| checksUnique checksContinuous checksNamedFlags |
	checksUnique := positional @env0:includes: (self @env0:at: #UNIQUE).
	checksContinuous := positional @env0:includes: (self @env0:at: #CONTINUOUS).
	checksNamedFlags := positional @env0:includes: (self @env0:at: #NAMED_FLAGS).
	^ [:positional2 :keywords2 |
		| cls |
		cls := positional2 @env0:at: 1.
		checksUnique ifTrue: [self unique: cls].
		checksContinuous ifTrue: [self _continuous: cls].
		checksNamedFlags ifTrue: [self _named_flags: cls].
		cls]
%

category: 'Grail-Built-in Functions'
method: enum
show_flag_values: aValue
	"CPython enum.show_flag_values -- ``list(_iter_bits_lsb(value))'', the set
	bits of value from the least significant up: show_flag_values(3) is [1, 2].
	Named in the ValueError @verify(NAMED_FLAGS) raises, as the way to see which
	bits an alias is made of.

	_iter_bits_lsb takes a member's value when handed a member, and refuses a
	negative number -- ``%r is not a positive integer'' -- which is also why the
	NAMED_FLAGS check skips negative aliases rather than decomposing them."

	| num out |
	num := aValue.
	(num isKindOf: (Python @env0:at: #Enum)) ifTrue: [
		num := num @env0:dynamicInstVarAt: #value].
	((num isKindOf: Integer) and: [num @env0:< 0]) ifTrue: [
		^ ValueError ___signal___: ((Python @env0:at: #Enum) ___grailValueRepr: aValue)
			@env0:, ' is not a positive integer'].
	out := OrderedCollection @env0:new.
	[num @env0:> 0] @env0:whileTrue: [ | b |
		"num & (~num + 1) -- the lowest set bit."
		b := num @env0:bitAnd: (num @env0:bitInvert) @env0:+ 1.
		out @env0:add: b.
		num := num @env0:bitXor: b].
	^ list @env0:withAll: out @env0:asArray
%

category: 'Grail-Built-in Functions'
method: enum
_named_flags: cls
	"``@verify(NAMED_FLAGS)`` -- raise ValueError when an ALIAS carries a bit no
	NAMED member covers (CPython enum.verify NAMED_FLAGS):

	    @verify(NAMED_FLAGS)
	    class Bizarre(Flag):
	        b = 3
	        c = 4
	        d = 6

	Only c is named -- b and d are multi-bit, so they are aliases -- and between
	them they need bits 1 and 2, which nothing names:

	    invalid Flag 'Bizarre': aliases b and d are missing combined values of
	    0x3 [use enum.show_flag_values(value) for details]

	The bits are accumulated across ALL offending aliases, so the reported value
	is a single combined number: ``value 0x%x'' when it is one bit, ``combined
	values of 0x%x'' when it is several.

	ORDER.  CPython walks _member_map_, which is a dict in declaration order, so
	its message lists aliases as they were written.  Grail's _member_map_ is
	hash-ordered (as ``unique'' above also has to work around), so declaration
	order is taken from the record's definition-order roll -- which holds every
	multi-bit and zero member, i.e. exactly the aliases this check is about.  A
	same-VALUE alias (``dupe = 6'' beside ``d = 6'') builds no member of its own
	and so is not in that roll; those are gathered afterwards, which can order
	them differently from CPython when both kinds are present in one class.
	Nothing reachable pins that combination, and the bits reported are the same
	either way."

	| enumClass named namedValues offenders missingValue msg aliasPart valuePart |
	enumClass := Python @env0:at: #Enum.
	(enumClass ___grailIsFlagClass: cls) ifFalse: [^ cls].
	named := enumClass ___grailMembers: cls.
	namedValues := Set @env0:new.
	named @env0:do: [:m | namedValues @env0:add: (m @env0:dynamicInstVarAt: #value)].
	offenders := OrderedCollection @env0:new.
	missingValue := 0.
	"Definition order first: every built member that is NOT canonical."
	(enumClass ___grailAllNamedMembers: cls) @env0:do: [:m |
		(named @env0:includes: m) ifFalse: [
			| missed |
			missed := self ___grailMissingBitsOf: m against: namedValues.
			missed @env0:= 0 ifFalse: [
				offenders @env0:add: (m @env0:dynamicInstVarAt: #name) @env0:asString.
				missingValue := missingValue @env0:bitOr: missed]]].
	"Then any same-value alias -- a NAME bound to a member that carries another."
	cls @env1:_member_map_ @env0:keysAndValuesDo: [:nm :m | | own |
		own := (m @env0:dynamicInstVarAt: #name).
		(own @env0:notNil and: [(nm @env0:asString @env0:= own @env0:asString) not]) ifTrue: [
			| missed |
			missed := self ___grailMissingBitsOf: m against: namedValues.
			missed @env0:= 0 ifFalse: [
				offenders @env0:add: nm @env0:asString.
				missingValue := missingValue @env0:bitOr: missed]]].
	offenders @env0:isEmpty ifTrue: [^ cls].
	aliasPart := offenders @env0:size @env0:= 1
		ifTrue: ['alias ' @env0:, (offenders @env0:at: 1) @env0:, ' is missing']
		ifFalse: [ | head |
			head := WriteStream @env0:on: String @env0:new.
			1 to: offenders @env0:size @env0:- 1 do: [:i |
				i @env0:> 1 ifTrue: [head @env0:nextPutAll: ', '].
				head @env0:nextPutAll: (offenders @env0:at: i)].
			'aliases ' @env0:, head @env0:contents @env0:, ' and '
				@env0:, (offenders @env0:at: offenders @env0:size) @env0:, ' are missing'].
	valuePart := ((missingValue @env0:bitAnd: missingValue @env0:- 1) @env0:= 0)
		ifTrue: ['value 0x' @env0:, (missingValue @env0:printStringRadix: 16) @env0:asLowercase]
		ifFalse: ['combined values of 0x'
			@env0:, (missingValue @env0:printStringRadix: 16) @env0:asLowercase].
	msg := 'invalid Flag ''' @env0:, cls @env0:name @env0:asString @env0:, ''': '
		@env0:, aliasPart @env0:, ' ' @env0:, valuePart
		@env0:, ' [use enum.show_flag_values(value) for details]'.
	^ ValueError ___signal___: msg
%

category: 'Grail-Built-in Functions'
method: enum
___grailMissingBitsOf: aMember against: namedValues
	"The bits of aMember's value that no NAMED member's value equals -- CPython's
	``missed = [v for v in _iter_bits_lsb(alias.value) if v not in member_values]''
	folded into one integer, 0 when nothing is missing.

	A negative alias is skipped (0), because _iter_bits_lsb refuses to decompose
	one; a non-integer value has no bits to check."

	| v missed |
	v := aMember @env0:dynamicInstVarAt: #value.
	((v isKindOf: Integer) and: [v @env0:>= 0]) ifFalse: [^ 0].
	missed := 0.
	[v @env0:> 0] @env0:whileTrue: [ | b |
		b := v @env0:bitAnd: (v @env0:bitInvert) @env0:+ 1.
		(namedValues @env0:includes: b) ifFalse: [missed := missed @env0:bitOr: b].
		v := v @env0:bitXor: b].
	^ missed
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
_continuous: cls
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
_make_class_unpicklable: obj
	"_make_class_unpicklable(obj) -- break pickling for obj, by replacing
	__reduce_ex__ with one that raises and blanking __module__ so the class
	itself cannot be looked up either: test_enum's test_pickle_explodes wants
	TypeError from a MEMBER and PicklingError from the CLASS, and those are the
	two halves.

	CPython also accepts a class-body dict, for use from inside a metaclass;
	Grail has no such caller, so only the object form is implemented.

	The replacement is an UnboundMethod -- a plain function taking self first --
	for the same reason _reduce_ex_by_global_name is one; see
	Enum >> ___grailReduceExByGlobalName___:."

	obj @env1:___pyAttrStore___: #'__reduce_ex__'
		put: (UnboundMethod @env1:definingClass: Enum
			selector: #'___grailBreakOnCallReduce___').
	obj @env1:___pyAttrStore___: #'__module__' put: '<unknown>'.
	^ None
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
