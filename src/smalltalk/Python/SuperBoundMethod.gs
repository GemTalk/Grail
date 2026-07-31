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

	| nargs kwOk method resolvedSel |
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
	method := resolver @env0:value: nargs value: kwOk.
	method ifNil: [
		AttributeError ___signal___:
			'super(): no parent method ''' @env0:, selector @env0:asString @env0:, ''''
	].
	"Varargs parent: dispatch as (positional, kwargs) via the 2-arg
	primitive, regardless of the call-site arity."
	resolvedSel := method @env0:selector.
	(resolvedSel @env0:asString @env0:endsWith: ':kw:') ifTrue: [
		^ obj @env0:with: positional with: (kwargs ifNil: [nil]) performMethod: method
	].
	"Fixed-arity parent: pick the primitive variant matching the
	call-site positional count."
	nargs @env0:= 0 ifTrue: [^ obj @env0:performMethod: method].
	nargs @env0:= 1 ifTrue: [
		^ obj @env0:with: (positional @env0:at: 1) performMethod: method].
	nargs @env0:= 2 ifTrue: [
		^ obj
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			performMethod: method].
	nargs @env0:= 3 ifTrue: [
		^ obj
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			with: (positional @env0:at: 3)
			performMethod: method].
	nargs @env0:= 4 ifTrue: [
		^ obj
			@env0:with: (positional @env0:at: 1)
			with: (positional @env0:at: 2)
			with: (positional @env0:at: 3)
			with: (positional @env0:at: 4)
			performMethod: method].
	"5+ args: no performMethod primitive variant.  Fall through to
	plain perform — works when the parent method doesn't itself
	call super() (which would otherwise re-dispatch through obj's
	override and infinite-recurse)."
	^ obj @env0:perform: resolvedSel env: 1 withArguments: positional
%

set compile_env: 0
