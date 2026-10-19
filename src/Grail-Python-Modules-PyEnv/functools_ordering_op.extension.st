Extension { #name : 'functools_ordering_op' }

{ #category : 'Grail-Instance Creation' }
functools_ordering_op class >> ___bareOpName___: anOpSymbol [
	"``__gt__'' -> ``gt'': the dunder stripped, for building CPython's
	``_gt_from_lt'' style name."

	| s |
	s := anOpSymbol @env0:asString.
	^ s @env0:copyFrom: 3 to: s @env0:size @env0:- 2

]

{ #category : 'Grail-Instance Creation' }
functools_ordering_op class >> ___derived___: derivedOp from: rootOp [
	"The synthesised comparison for ``derivedOp'', computed from ``rootOp''.

	INTERNED per (derived, root) pair and published on the functools module
	under CPython's own name for it -- ``_gt_from_lt'', ``_le_from_ge'', and so
	on.  CPython's total_ordering installs module-level functions
	(``setattr(cls, opname, functools._gt_from_lt)''), so the object in the
	class dictionary IS functools._gt_from_lt.  Two consequences the corpus
	depends on, neither of which holds for a per-class instance:

	  * pickling ``Cls.__gt__'' saves it BY REFERENCE as
	    (functools, _gt_from_lt), and the round-trip is the identical object --
	    test_total_ordering's test_pickle asserts exactly that.
	  * two classes deriving the same operator from the same root share one
	    object, as they do in CPython.

	There are only twelve pairs (three derivables for each of four roots), so
	interning is bounded by construction.  Session-local, because the module
	instance it is published on is."

	| qual st tbl inst modInst |
	qual := '_' @env0:, (self ___bareOpName___: derivedOp)
		@env0:, '_from_' @env0:, (self ___bareOpName___: rootOp).
	st := SessionTemps @env0:current.
	tbl := st @env0:at: #'GrailOrderingOps' ifAbsentPut: [KeyValueDictionary @env0:new].
	inst := tbl @env0:at: qual otherwise: nil.
	inst == nil ifFalse: [^ inst].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #derived put: derivedOp.
	inst @env0:dynamicInstVarAt: #root put: rootOp.
	inst @env0:dynamicInstVarAt: #'__qualname__' put: qual @env0:asUnicodeString.
	tbl @env0:at: qual put: inst.
	"Publish on the module instance so ``getattr(functools, '_gt_from_lt')''
	resolves -- which is what lets pickle save the operator by reference.  The
	dynamic-instVar slot is the first thing module attribute resolution probes."
	modInst := functools @env0:___instance___.
	modInst == nil ifFalse: [
		modInst @env0:dynamicInstVarAt: qual @env0:asSymbol put: inst].
	^ inst

]

{ #category : 'Grail-Callable' }
functools_ordering_op >> ___callRoot___: root on: slf with: other [
	"``type(self).__lt__(self, other)'' -- the root comparison, called
	DIRECTLY so a NotImplemented return comes back as itself instead of being
	turned into a reflected call or a TypeError by the operator machinery.

	A compiled ``def __lt__'' is reached by performing its env-1 selector; a
	root supplied as a class ATTRIBUTE (a ``__lt__ = _cmp'' alias) is reached
	through ___classAttrDunder___, the same lookup ___cmpFallback___ uses."

	| rootSel owner fn |
	rootSel := (root @env0:asString @env0:, ':') @env0:asSymbol.
	owner := slf @env0:class
		@env0:whichClassIncludesSelector: rootSel environmentId: 1.
	(owner @env0:~~ nil and: [owner @env0:~~ object]) ifTrue: [
		^ slf @env0:perform: rootSel env: 1 withArguments: { other }].
	fn := slf ___classAttrDunder___: root.
	fn @env0:== nil ifTrue: [
		"A CLASS operand whose root lives on its recorded ``metaclass=''.  The
		probe above asks slf's own class chain, which for a class is its
		SMALLTALK metaclass -- the Python metaclass is not in that chain, because
		Grail records it rather than building the class through it.  Without this
		the root punted and every DERIVED operator punted with it: ``A < B''
		worked while ``A > B'' raised, which is total_ordering's metaclass case."
		| viaMeta |
		viaMeta := slf ___grailMetaclassCmp___: root with: other.
		viaMeta @env0:== nil ifFalse: [^ viaMeta].
		^ Python @env0:at: #NotImplemented otherwise: nil].
	^ fn ___pyCallValue___: { slf. other } kw: nil

]

{ #category : 'Grail-Attribute Access' }
functools_ordering_op >> ___pyBindsSelf___ [
	"Marker read by object >> ___isDescriptorCallable___:.  This object stands
	in for a plain Python function in a class dict, so reading it through an
	INSTANCE must bind self -- ``ImplementsLessThan(1).__le__(1)'' has to reach
	the synthesised operator with the instance prepended, as a def would."

	^ true

]

{ #category : 'Grail-Callable' }
functools_ordering_op >> ___pyCallValue___: positional kw: kwargs [
	"``derived(self, other)'', computed from the decorated class's own
	``root'' comparison -- the body of CPython's _xx_from_yy helpers."

	| slf other raw ni base sameDir derivedInclusive rootInclusive derived root |
	(positional @env0:== nil or: [positional @env0:size @env0:< 2]) ifTrue: [
		TypeError ___signal___:
			self __name__ @env0:asString @env0:,
				'() missing required argument: other'].
	slf := positional @env0:at: 1.
	other := positional @env0:at: 2.
	derived := self @env0:dynamicInstVarAt: #derived.
	root := self @env0:dynamicInstVarAt: #root.
	ni := Python @env0:at: #NotImplemented otherwise: nil.
	raw := self ___callRoot___: root on: slf with: other.
	"``if op_result is NotImplemented: return op_result'' -- the derived
	operator must punt whenever the root punts, or ``a < 1'' against a
	foreign type would answer a bogus bool instead of letting the caller
	reflect and then raise TypeError (test_notimplemented)."
	"ONE test: ``ni'' IS the NotImplemented singleton, read from the Python
	dictionary.  The second test here was against a distinct internal Symbol
	sentinel that no longer exists."
	(raw @env0:== ni) ifTrue: [^ ni].
	"Direction: __lt__/__le__ both say ``less'', __gt__/__ge__ both say
	``greater''.  Derived in the SAME direction as the root keeps its answer;
	the opposite direction negates it."
	sameDir := (root @env0:== #'__lt__' or: [root @env0:== #'__le__'])
		@env0:== (derived @env0:== #'__lt__' or: [derived @env0:== #'__le__']).
	base := sameDir
		ifTrue: [raw ___isTruthy___]
		ifFalse: [raw ___isTruthy___ @env0:not].
	rootInclusive := root @env0:== #'__le__' or: [root @env0:== #'__ge__'].
	derivedInclusive := derived @env0:== #'__le__' or: [derived @env0:== #'__ge__'].
	"An equality test joins in only where the root's answer cannot settle the
	boundary case:
	    a <= b  from  a <  b   is  (a <  b) or  (a == b)
	    a <  b  from  a <= b   is  (a <= b) and (a != b)
	and is left out where the derived operator is the root's exact negation:
	    a >= b  from  a <  b   is  not (a < b)
	Reading the three combinations off the direction/strictness pair
	reproduces all twelve of CPython's helpers without spelling each out."
	derivedInclusive ifTrue: [
		(sameDir or: [rootInclusive]) ifFalse: [^ base].
		base ifTrue: [^ true].
		^ slf ___cmpEq___: other].
	(sameDir or: [rootInclusive @env0:not]) ifFalse: [^ base].
	base ifFalse: [^ false].
	^ slf ___cmpNe___: other

]

{ #category : 'Grail-Attribute Access' }
functools_ordering_op >> __module__ [
	"``functools'': CPython's total_ordering installs functions defined IN
	functools, so that is the module the operator belongs to.  pickle reads this
	to save the operator by reference."

	^ 'functools' @env0:asUnicodeString

]

{ #category : 'Grail-Attribute Access' }
functools_ordering_op >> __name__ [
	"CPython sets ``opfunc.__name__ = opname'' before installing it."

	^ (self @env0:dynamicInstVarAt: #derived) @env0:asString @env0:asUnicodeString

]

{ #category : 'Grail-Attribute Access' }
functools_ordering_op >> __qualname__ [
	"CPython's name for this derivation -- ``_gt_from_lt'' and friends -- stamped
	when the singleton was interned.  Together with __module__ it is what pickle
	resolves the operator back through."

	^ self @env0:dynamicInstVarAt: #'__qualname__'

]

{ #category : 'Grail-Representation' }
functools_ordering_op >> __repr__ [

	^ ('<function ' @env0:, self __name__ @env0:asString @env0:, '>')
		@env0:asUnicodeString

]
