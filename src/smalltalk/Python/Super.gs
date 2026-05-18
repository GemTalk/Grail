! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- Super class definition
expectvalue /Class
doit
Object subclass: 'Super'
  instVarNames: #( cls obj )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Super comment:
'Runtime proxy for Python''s zero-arg ``super()`` call.

Given the lexically-enclosing class C and the first method argument
(``self`` for instance methods, ``cls`` for class methods), method
lookup starts at ``C`` and walks the superclass chain looking for the
first env-1 method matching the requested selector.  The method is
then executed with ``obj`` substituted as the receiver — bypassing
the override on ``C`` (or any subclass) that triggered the super()
call in the first place.

Two callable shapes are supported on the proxy:
  * Unary attribute access (``___pyAttrLoad___:``) returns a
    ``Super`` instance carrying the same (cls, obj) but with the
    requested attribute name baked in — i.e. an unbound proxy
    for the resolved parent method.  Calling it via
    ``value: positional value: kwargs`` then dispatches.
  * For the common ``super().method(args)`` chain, AttributeAst
    emits an attribute load followed by a CallAst; both steps
    funnel through ``___pyAttrLoad___:`` → ``value:value:``.

Limitations:
  * Walks the GemStone class hierarchy (``superClass``), not a
    Python C3 MRO.  Single-inheritance Python idioms (e.g.
    blinker.NamedSignal, collections.defaultdict) work; diamond
    hierarchies need a real MRO.
  * Only the zero-arg ``super()`` form is supported (rewritten by
    codegen in CallAst).  Explicit ``super(C, obj)`` is not yet.
'
%

expectvalue /Class
doit
Super category: 'Grail-Modules'
%

removeallmethods Super
removeallclassmethods Super

set compile_env: 0

category: 'Grail-Private'
method: Super
_setCls: aClass obj: anObject

	cls := aClass.
	obj := anObject.
%

category: 'Grail-Private'
method: Super
_lookupMethod: aSym
	"Walk the superClass chain starting from cls's parent, looking for
	the first class whose env-1 methodDict has aSym.  Returns the
	GsNMethod, or nil if not found."

	| walker |
	walker := cls @env0:superClass.
	[walker notNil] whileTrue: [
		| md |
		md := walker @env0:methodDictForEnv: 1.
		(md @env0:includesKey: aSym) ifTrue: [^ md @env0:at: aSym].
		walker := walker @env0:superClass].
	^ nil
%

category: 'Python-Dispatch'
method: Super
doesNotUnderstand: aSelector args: anArray envId: envId
	"Direct sends to a Super proxy (e.g. ``super().__init__(x)``
	codegen'd as ``(super-proxy) __init__: x``) are routed here:
	walk the parent-class chain for the selector and execute the
	matching method with `obj` substituted as the receiver.

	Dispatch uses ``performMethod:`` / ``with:performMethod:`` —
	the only stock GemStone primitives that invoke a *specific*
	GsNMethod with a substituted receiver (bypassing override).
	Arity > 1 hits the no-bypass perform fallback, which works
	when the parent method doesn't itself call super (the common
	Python idiom for ``object.__init__`` / leaf-class init).

	envId 0 falls through to default DNU — Smalltalk-side sends to
	the proxy aren't part of the Python protocol."

	| method nargs |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	method := self _lookupMethod: aSelector.
	method ifNil: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	nargs := anArray size.
	nargs = 0 ifTrue: [^ obj performMethod: method].
	nargs = 1 ifTrue: [^ obj with: (anArray at: 1) performMethod: method].
	"Fallback for 2+ args — relies on parent method not recursing
	through super() to dispatch correctly via normal lookup."
	^ obj perform: aSelector env: 1 withArguments: anArray
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: Super
cls: aClass obj: anObject
	"Construct a Super proxy bound to the lexical class and the
	current method's first argument."

	| inst |
	inst := self @env0:new.
	inst @env0:_setCls: aClass obj: anObject.
	^ inst
%

category: 'Grail-Attribute'
method: Super
___pyAttrLoad___: aSym
	"super().<aSym> — return a BoundMethod-equivalent that, when
	invoked, executes the parent class''s method with obj as the
	receiver.

	Strategy: find the GsNMethod by walking cls''s superClass chain,
	then return a closure that calls ``method _executeInContext: ...``
	bound to obj.  We piggy-back on BoundMethod for arity dispatch
	via a thin _Super-bound shim that exposes ``value:value:``."

	| s sym1 sym2 sym3 symVA pickMethod |
	s := aSym @env0:asString.
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	pickMethod := [:nargs :kwOk |
		| candidate |
		(kwOk and: [nargs @env0:= 0])
			ifTrue: [
				candidate := self @env0:_lookupMethod: aSym.
				candidate ifNotNil: [candidate]
				ifNil: [self @env0:_lookupMethod: symVA]
			] ifFalse: [
				nargs @env0:= 0 ifTrue: [candidate := self @env0:_lookupMethod: aSym].
				nargs @env0:= 1 ifTrue: [candidate := self @env0:_lookupMethod: sym1].
				nargs @env0:= 2 ifTrue: [candidate := self @env0:_lookupMethod: sym2].
				nargs @env0:= 3 ifTrue: [candidate := self @env0:_lookupMethod: sym3].
				candidate ifNil: [candidate := self @env0:_lookupMethod: symVA].
				candidate
			]].
	"Wrap (obj, pickMethod) in a callable proxy that resolves the
	method at call time once arity is known."
	^ SuperBoundMethod @env1:obj: obj resolver: pickMethod selector: aSym
%

set compile_env: 0
