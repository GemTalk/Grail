! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- SuperBoundMethod class definition
expectvalue /Class
doit
Object subclass: 'SuperBoundMethod'
  instVarNames: #( obj resolver selector )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SuperBoundMethod comment:
'Callable shim returned from ``super().method`` access.

Holds:
  * obj      — the instance/class to substitute as the receiver
  * resolver — a block ``[:nargs :kwOk | <GsNMethod or nil>]`` that
               picks the right arity selector at call time and
               looks it up on the parent class chain.
  * selector — the requested attribute symbol (for error messages).

Dispatches by sending ``GsNMethod >> _executeInContext:`` with an
Array of (receiver, args...).  If the resolver finds no matching
parent method, raises AttributeError.'
%

expectvalue /Class
doit
SuperBoundMethod category: 'Grail-Modules'
%

removeallmethods SuperBoundMethod
removeallclassmethods SuperBoundMethod

set compile_env: 0

category: 'Grail-Private'
method: SuperBoundMethod
_setObj: anObj resolver: aResolver selector: aSym

	obj := anObj.
	resolver := aResolver.
	selector := aSym.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: SuperBoundMethod
obj: anObj resolver: aResolver selector: aSym

	| inst |
	inst := self @env0:new.
	inst @env0:_setObj: anObj resolver: aResolver selector: aSym.
	^ inst
%

category: 'Grail-Calling'
method: SuperBoundMethod
value: positional value: kwargs
	"Resolve the parent method matching the actual call arity,
	then execute it with ``obj`` substituted as the receiver.

	Dispatch shape is determined by the *resolved method's selector*,
	not the call-site arity, so a varargs parent (e.g.
	``Signal.___init__:kw:`` resolved from ``super().__init__(doc)``)
	is invoked through ``with:with:performMethod:`` with (positional,
	kwargs) — even though the call site passed 1 positional arg.

	Uses ``performMethod:`` / ``with:[with:…]performMethod:`` (env-0
	primitives) so the parent method runs without re-dispatching
	through ``obj``'s class (which would re-fire the override).
	The 0..4-arg variants cover the same range Super >> DNU does."

	| nargs kwOk method resolvedSel recv pair |
	"CPython forbids a member ``def __new__'' from delegating to
	``super().__new__'' while the enum is being built (test_bad_new_super): it
	must call the data type's __new__ directly.  Catch it here, BEFORE the
	parent-method walk resolves to whichever storage __new__ the MRO happens to
	expose (int/str/float differ, so guarding the individual constructors was
	incomplete).  ``obj'' is super()'s substituted receiver -- the enum class
	(cls) inside __new__; the guard no-ops unless it is mid-construction."
	selector == #'__new__' ifTrue: [Enum ___grailSuperNewGuard: obj].
	nargs := positional @env0:size.
	kwOk := kwargs == nil or: [kwargs @env0:isEmpty].
	"The resolver answers { method. cameFromTheClassSide } -- see Super >>
	_lookupMethodAndSideFirstOf:."
	pair := resolver @env0:value: nargs value: kwOk.
	method := pair @env0:isNil ifTrue: [nil] ifFalse: [pair @env0:at: 1].
	method ifNil: [
		AttributeError ___signal___:
			'super(): no parent method ''' @env0:, selector @env0:asString @env0:, ''''
	].
	"A CLASS-SIDE parent method takes the CLASS as its receiver.  Grail compiles
	a Python @classmethod onto the metaclass, so when super() from an instance
	method reaches one -- ``def cm(cls): return super().cm()'' whose MRO
	successors are all @classmethods -- performing it with the instance would
	bind ``cls'' to the instance.  Substituting obj's class is what CPython's
	classmethod descriptor does when reached through super().

	Only when obj is not already a class: ``super(D, cls)'' inside __new__ has
	the right receiver to begin with.

	Decided by the LOOKUP, not re-derived here.  ``the method lives on a
	metaclass'' is not the same question and was wrong twice over: Grail
	resolves plenty of ordinary inherited methods through the class-side dict,
	and substituting the class for those ran KeyValueDictionary's __setitem__
	with the CLASS as receiver (180 SUnit errors, then 48 after a narrower but
	still-derived guess).  The lookup knows which dict it hit; it now says so."
	recv := ((pair @env0:at: 2) and: [(obj @env0:isKindOf: Behavior) @env0:not])
		ifTrue: [obj @env0:class]
		ifFalse: [obj].
	"Varargs parent: dispatch as (positional, kwargs) via the 2-arg
	primitive, regardless of the call-site arity."
	resolvedSel := method @env0:selector.
	(resolvedSel @env0:asString @env0:endsWith: ':kw:') ifTrue: [
		^ recv @env0:with: positional with: (kwargs ifNil: [nil]) performMethod: method
	].
	"Fixed-arity parent: pick the primitive variant matching the
	call-site positional count."
	nargs @env0:= 0 ifTrue: [^ recv @env0:performMethod: method].
	nargs @env0:= 1 ifTrue: [
		^ recv @env0:with: (positional @env0:at: 1) performMethod: method].
	nargs @env0:= 2 ifTrue: [
		^ recv
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			performMethod: method].
	nargs @env0:= 3 ifTrue: [
		^ recv
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			with: (positional @env0:at: 3)
			performMethod: method].
	nargs @env0:= 4 ifTrue: [
		^ recv
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			with: (positional @env0:at: 3)
			with: (positional @env0:at: 4)
			performMethod: method].
	"5+ args: no performMethod primitive variant.  Fall through to
	plain perform — works when the parent method doesn't itself
	call super() (which would otherwise re-dispatch through obj's
	override and infinite-recurse)."
	^ recv @env0:perform: resolvedSel env: 1 withArguments: positional
%

set compile_env: 0

category: 'Grail-Private'
method: SuperBoundMethod
_obj
	"env-0, like _setObj:resolver:selector: above -- __eq__ reaches these with
	@env0: sends, and compiling them under env 1 (which the surrounding section
	selects) left them unreachable from there: ``a SuperBoundMethod does not
	understand #'_obj''', escaping as an uncatchable Smalltalk error rather than
	a Python one."

	^ obj
%

category: 'Grail-Private'
method: SuperBoundMethod
_selector
	^ selector
%

set compile_env: 1

category: 'Grail-Comparison'
method: SuperBoundMethod
__eq__: other
	"``super(C, e).__reduce__ == e.__reduce__''.

	CPython compares bound methods by (__func__, __self__), and a method reached
	through a super proxy is an ORDINARY bound method there -- so when nothing
	between C and object overrides the name, the two are the same object pair and
	compare equal.  test_super's test_special_methods asserts exactly that for
	__reduce__, __reduce_ex__ and __getstate__: a super object must not make the
	pickling protocol look different from the object's own.

	Grail hands back a SuperBoundMethod, which defined no equality at all, so the
	comparison fell to identity and was False for every name.

	Keyed on the receiver's IDENTITY and the selector, which is BoundMethod's own
	convention rather than a new one -- see BoundMethod >> __eq__, where the
	reasoning (a Symbol uniquely names the method reached on that receiver, and
	each attribute access mints a fresh handle) and its limitation are already
	written down.  The limitation is worth restating because a super proxy makes
	it easier to hit: resolution starts AFTER cls, so if a class between cls and
	the owner overrides the name, CPython compares the two __func__s and answers
	False where this answers True.  Nothing in the corpus overrides the pickling
	dunders, which is the case the test is about."

	(other @env0:isKindOf: BoundMethod) @env0:ifTrue: [
		^ (obj == (other @env0:receiver))
			@env0:and: [selector @env0:asSymbol == (other @env0:selector) @env0:asSymbol]].
	"An UNBOUND handle, which is what the CLASS form compares against.
	test_special_methods runs its whole body twice -- ``for e in E(), E'' -- and
	the second pass asks whether ``super(C, E).__reduce__ == E.__reduce__''.
	CPython answers True because both are the very same unbound descriptor
	(``<method '__reduce__' of 'object' objects>''): accessing the name on a
	CLASS does not bind, and neither does a super whose __self__ is that class.
	Grail spells the two differently -- SuperBoundMethod here, UnboundMethod
	there -- so the comparison has to bridge them.  Keyed the analogous way:
	super's obj IS the class, and the unbound handle names it as its
	definingClass."
	(other @env0:isKindOf: UnboundMethod) @env0:ifTrue: [
		^ (obj == (other @env0:definingClass))
			@env0:and: [selector @env0:asSymbol == (other @env0:selector) @env0:asSymbol]].
	(other @env0:isKindOf: SuperBoundMethod) @env0:ifTrue: [
		^ (obj == (other @env0:_obj))
			@env0:and: [selector @env0:asSymbol == (other @env0:_selector) @env0:asSymbol]].
	^ false
%

category: 'Grail-Comparison'
method: SuperBoundMethod
__ne__: other
	^ (self __eq__: other) @env0:not
%

set compile_env: 0
