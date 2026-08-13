! ------------------- Superclass check
run
PyDict ifNil: [self error: 'PyDict is not defined. Check file ordering.'].
%

! ===============================================================================
! EnumDict -- CPython's enum.EnumDict, public since 3.13.
!
! The mapping an enum class body is built in.  It tracks member names in
! declaration order and REFUSES to let one be reused:
!
!     enumdict = EnumDict()
!     enumdict['a'] = 1
!     enumdict['a'] = 'other value'      -- TypeError
!
! Grail bound ``enum.EnumDict'' to plain ``dict'', which accepts everything.
!
! Only the MutableMapping interface is overridden, which CPython's own test
! pins deliberately -- ``enumdict |= {'a': 'other value'}'' goes through
! dict.__ior__ and succeeds, overwriting the value that __setitem__ would have
! refused.  So __ior__/update are NOT overridden here either; that is the
! documented behaviour, not an omission.
!
! CONSTRUCTION takes a class name, as CPython's EnumDict(cls_name) does, so that
! a mangled private name can be told from a reserved sunder.  It needs its own
! __new__: the inherited dict constructor reads a positional argument as the
! mapping to build FROM.  Every other slot is defaulted lazily in __setitem__,
! because Grail's class-call for a kernel-collection-rooted class never runs
! __init__.
!
! This IS the namespace an enum class body now runs in -- Enum class >>
! ___grailMetaclassNamespace___ answers one, and object >>
! ___grailPrepareNamespace___ installs it for the duration of the class
! statement.  So __setitem__ sees each member as it is written, which buys two
! pieces of CPython behaviour that a later pass over the finished class cannot:
! a reused name is refused WHERE IT IS WRITTEN (so the value named in the
! complaint is the one the mapping already holds), and an ``auto()'' is resolved
! AT ASSIGNMENT, so a later statement in the same body sees the number rather
! than an unresolved marker.
!
! test_enum TestEnumDict.test_enum_dict_standalone /
! test_enum_dict_in_metaclass; TestSpecial.test_using_members_as_nonmember.
! ===============================================================================

! ------------------- Class definition for EnumDict
expectvalue /Class
doit
PyDict subclass: 'EnumDict'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
EnumDict category: 'Grail-Python'
%

expectvalue /Metaclass3
doit
EnumDict removeAllMethods: 0.
EnumDict removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: EnumDict
__new__: aClassName
	"""``EnumDict(cls_name)'' -- CPython records the class name so that a
	MANGLED PRIVATE name (``_Color__spam'') can be told from a reserved sunder.

	Overridden because the inherited dict constructor reads a positional
	argument as the mapping to build FROM, so ``EnumDict('Color')'' raised
	``dictionary update sequence element #0 has length 1'' -- which is what a
	__prepare__ returning EnumDict(cls) hit, silently, the moment class-body
	namespaces started calling it.

	A name is the only thing this constructor takes, so anything else is the
	inherited behaviour; that keeps ``EnumDict()'' and any genuine
	build-from-mapping use working."""

	| inst |
	(aClassName isKindOf: CharacterCollection) ifFalse: [
		^ super __new__: aClassName].
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #'_cls_name' put: aClassName @env0:asString.
	^ inst
%

category: 'Grail-Python Protocol'
method: EnumDict
__setitem__: key _: value
	"CPython EnumDict.__setitem__ -- ``changes anything not sundered, dundered,
	nor a descriptor''.  The branches are CPython's, in CPython's order, because
	the order is what decides which complaint a name gets: _is_private is tested
	BEFORE _is_sunder (a mangled private name opens and closes with a single
	underscore and would otherwise read as a reserved sunder), and the
	member-name clash is tested before the descriptor rule so that redefining a
	member is a TypeError rather than silently becoming an attribute."

	| ks sz isPriv clsName memberNames ignoreNames lastValues cls needsLastValue val |
	needsLastValue := true.
	"``value'' is a method parameter and so not assignable; resolution below may
	replace it (an auto() becomes its number), and what is finally stored is
	val."
	val := value.
	"Every slot is defaulted lazily here, not merely in __init__: Grail's
	class-call for a kernel-collection-rooted class does not run __init__ at
	all, so ``EnumDict()'' arrives with nothing set.  The class NAME is the
	exception, recorded by __new__: -- the _is_private branch below needs it,
	and a class body supplies it through __prepare__."
	(self @env0:dynamicInstVarAt: #'_cls_name') @env0:isNil ifTrue: [
		self @env0:dynamicInstVarAt: #'_cls_name' put: None].
	clsName := self @env0:dynamicInstVarAt: #'_cls_name'.
	(clsName == None) ifTrue: [clsName := nil].
	memberNames := self @env0:dynamicInstVarAt: #'_member_names'.
	memberNames @env0:isNil ifTrue: [
		memberNames := OrderedCollection @env0:new.
		self @env0:dynamicInstVarAt: #'_member_names' put: memberNames].
	ignoreNames := self @env0:dynamicInstVarAt: #'_ignore'.
	ignoreNames @env0:isNil ifTrue: [
		ignoreNames := OrderedCollection @env0:new.
		self @env0:dynamicInstVarAt: #'_ignore' put: ignoreNames].
	lastValues := self @env0:dynamicInstVarAt: #'_last_values'.
	lastValues @env0:isNil ifTrue: [
		lastValues := OrderedCollection @env0:new.
		self @env0:dynamicInstVarAt: #'_last_values' put: lastValues].
	ks := key @env0:asString.
	sz := ks @env0:size.
	isPriv := false.
	clsName @env0:isNil ifFalse: [ | pat |
		pat := '_' @env0:, clsName @env0:asString @env0:, '__'.
		isPriv := (sz @env0:> pat @env0:size)
			and: [(ks @env0:copyFrom: 1 to: pat @env0:size) @env0:= pat
			and: [((ks @env0:at: sz) @env0:= $_
				and: [(ks @env0:at: sz @env0:- 1) @env0:= $_]) not]]].
	isPriv ifTrue: [
		"A normal attribute; nothing tracked."
		^ super __setitem__: key _: value].
	"_is_sunder: one leading underscore and one trailing one, so the SECOND and
	second-to-last characters must both be something else."
	((sz @env0:>= 3)
		and: [(ks @env0:at: 1) @env0:= $_
		and: [(ks @env0:at: sz) @env0:= $_
		and: [((ks @env0:at: 2) @env0:= $_) not
		and: [((ks @env0:at: sz @env0:- 1) @env0:= $_) not]]]])
		ifTrue: [
			(#('_order_' '_generate_next_value_' '_numeric_repr_' '_missing_'
				'_ignore_' '_iter_member_' '_iter_member_by_value_'
				'_iter_member_by_def_' '_add_alias_' '_add_value_alias_')
				@env0:includes: ks) ifFalse: [
					^ ValueError ___signal___:
						'_sunder_ names, such as ''' @env0:, ks
							@env0:, ''', are reserved for future Enum use'].
			ks @env0:= '_ignore_' ifTrue: [
				"``_ignore_ = 'a b''' or a list of names -- those names are then
				skipped rather than becoming members."
				ignoreNames := OrderedCollection @env0:new.
				[(value isKindOf: CharacterCollection)
					ifTrue: [value @env0:asString @env0:subStrings @env0:do: [:n |
						ignoreNames @env0:add: (n @env0:copyReplaceAll: ',' with: '')]]
					ifFalse: [value @env0:do: [:n | ignoreNames @env0:add: n @env0:asString]]]
					@env0:on: AbstractException do: [:e | nil]].
			^ super __setitem__: key _: value].
	"_is_dunder, with CPython's __order__ -> _order_ rename."
	((sz @env0:>= 5)
		and: [(ks @env0:at: 1) @env0:= $_ and: [(ks @env0:at: 2) @env0:= $_
		and: [(ks @env0:at: sz) @env0:= $_ and: [(ks @env0:at: sz @env0:- 1) @env0:= $_]]]])
		ifTrue: [
			ks @env0:= '__order__' ifTrue: [
				^ super __setitem__: '_order_' _: value].
			^ super __setitem__: key _: value].
	"A name already taken by a member may not be rebound, however it is spelled
	-- this is the whole point of the class."
	(memberNames @env0:includes: ks) ifTrue: [
		^ TypeError ___signal___: '''' @env0:, ks @env0:, ''' already defined as '
			@env0:, (Enum ___grailValueRepr: (self __getitem__: key))].
	(ignoreNames @env0:includes: ks) ifTrue: [
		^ super __setitem__: key _: value].
	"Descriptors and classes DEFINED in the body are not members (see
	Enum ___grailBuildMembers: for both rules); everything else is."
	((self ___isValueDescriptor___: value)
		or: [Enum ___grailIsInternalClass: value
			inClassNamed: (clsName @env0:isNil ifTrue: [''] ifFalse: [clsName @env0:asString])])
		ifFalse: [
			"An enum overwriting a plain entry is the mirror complaint."
			(self @env0:includesKey: key) ifTrue: [
				^ TypeError ___signal___: '''' @env0:, ks @env0:, ''' already defined as '
					@env0:, (Enum ___grailValueRepr: (self __getitem__: key))].
			"An auto() is resolved HERE, as it is assigned, so the next statement
			in the same body sees a number.  Answers the resolved value and
			whether it still needs appending to _last_values -- a marker's
			generated value is appended during resolution, between markers."
			cls := self @env0:dynamicInstVarAt: #'_cls'.
			cls @env0:notNil ifTrue: [ | pair |
				pair := self ___grailResolveAutos___: value forName: ks class: cls
					count: memberNames @env0:size lastValues: lastValues.
				val := pair @env0:at: 1.
				(pair @env0:at: 2) ifFalse: [needsLastValue := false]].
			memberNames @env0:add: ks.
			needsLastValue ifTrue: [lastValues @env0:add: val]].
	^ super __setitem__: key _: val
%

category: 'Grail-Private'
method: EnumDict
___grailResolveAutos___: aValue forName: nameStr class: cls count: count lastValues: lastValues
	"""CPython's _EnumDict.__setitem__ resolves an ``auto()'' AS IT IS ASSIGNED:

	    class Example(Flag):
	        A = auto()
	        B = auto()
	        ALL = nonmember(A | B)

	Grail resolved every marker in a LATER pass, over the finished class, so
	``A | B'' here saw two unresolved markers and the operator failed
	(test_enum test_using_members_as_nonmember).

	The marker is MUTATED -- its ``value'' slot filled in, CPython's ``v.value =
	self._generate_next_value(...)'' -- and the mapping stores the number.  The
	mutation is what keeps ``dupe = third'' an ALIAS rather than a second call to
	the generator: the same marker object under a second name now answers a
	value, so nothing is generated for it.

	Answers { the resolved value. whether it still needs appending to
	_last_values }.  A generated value is appended during resolution instead, so
	that a tuple of autos advances the default generator element by element and
	the whole tuple never lands in last_values (sorted([1, (2,3)]) raises).

	A NAMEDTUPLE carrying markers is deliberately left alone: Enum class >>
	___grailBuildMembers: unwraps and rebuilds it, and putting the same
	resolution in two places is worse than the value reaching the builder
	unresolved, exactly as it did before."""

	| tupleClass resolvedEls |
	(aValue isKindOf: GrailEnumAuto) ifTrue: [
		^ Array @env0:with: (self ___grailResolveOneAuto___: aValue forName: nameStr
			class: cls count: count lastValues: lastValues) with: false].
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	((aValue isKindOf: tupleClass)
		and: [aValue @env0:anySatisfy: [:el | el isKindOf: GrailEnumAuto]])
		ifFalse: [^ Array @env0:with: aValue with: true].
	resolvedEls := OrderedCollection @env0:new.
	aValue @env0:do: [:el |
		resolvedEls @env0:add: ((el isKindOf: GrailEnumAuto)
			ifTrue: [self ___grailResolveOneAuto___: el forName: nameStr
				class: cls count: count lastValues: lastValues]
			ifFalse: [el])].
	^ Array @env0:with: (tupleClass @env0:withAll: resolvedEls) with: false
%

category: 'Grail-Private'
method: EnumDict
___grailResolveOneAuto___: aMarker forName: nameStr class: cls count: count lastValues: lastValues
	"""One auto() marker.

	An auto() whose ``value'' was set OUTSIDE the body is used verbatim and the
	generator is not called -- CPython's ``if v.value == _auto_null'' -- which is
	what keeps test_auto_order_wierd legal.  Only a marker this actually had to
	generate for is recorded in _auto_named, and that record is what
	___grailBuildMembers: reads to enforce CPython's rule that a class-body
	_generate_next_value_ must come BEFORE any member needing it: once resolution
	moved here, the marker is no longer on the class for the builder to find."""

	| hasExplicit explicitVal resolved autoNamed |
	hasExplicit := true.
	explicitVal := [aMarker ___pyAttrLoad___: #'value']
		@env0:on: AbstractException do: [:ex | hasExplicit := false. nil].
	hasExplicit
		ifTrue: [resolved := explicitVal]
		ifFalse: [
			resolved := Enum ___grailNamespaceAutoValueFor: nameStr class: cls
				count: count lastValues: lastValues.
			aMarker ___pyAttrStore___: #'value' put: resolved.
			autoNamed := self @env0:dynamicInstVarAt: #'_auto_named'.
			autoNamed @env0:isNil ifTrue: [
				autoNamed := OrderedCollection @env0:new.
				self @env0:dynamicInstVarAt: #'_auto_named' put: autoNamed].
			autoNamed @env0:add: nameStr].
	lastValues @env0:add: resolved.
	^ resolved
%

set compile_env: 0
