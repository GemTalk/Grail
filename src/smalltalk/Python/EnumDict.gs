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
! CONSTRUCTION takes no argument here.  CPython's EnumDict(cls_name) records the
! name so that _is_private can be tested, but Grail's class-call for a
! kernel-collection-rooted class routes to KeyValueDictionary's __new__, which
! reads a positional argument as the mapping to build FROM -- and never runs
! __init__.  The name is only ever supplied by __prepare__, which Grail does not
! call, so the branch it feeds is unreachable regardless; every slot is
! defaulted lazily in __setitem__ instead.
!
! test_enum TestEnumDict.test_enum_dict_standalone.
!
! The sibling test, test_enum_dict_in_metaclass, uses EnumDict as a __prepare__
! namespace, and Grail does not call __prepare__ at all: a class body compiles
! to accessor / dynInstVar stores rather than writes into a mapping, so a
! metaclass returning a tracking dict sees nothing.  That is a class-machinery
! gap well outside enum, and this class is what such support would need to
! have in place first.
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

	| ks sz isPriv clsName memberNames ignoreNames lastValues |
	"Every slot is defaulted lazily here, not merely in __init__.  Grail's
	class-call for a kernel-collection-rooted class does not run __init__ at
	all, so ``EnumDict()'' arrives with nothing set -- and, for the same
	reason, ``EnumDict('Color')'' does not record the name, which is what the
	_is_private branch below would need.  Pinned as a gap in the tests; it is
	unreachable until __prepare__ support exists, since only a class body
	supplies a class name to prepare with."
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
			memberNames @env0:add: ks.
			lastValues @env0:add: value].
	^ super __setitem__: key _: value
%

set compile_env: 0
