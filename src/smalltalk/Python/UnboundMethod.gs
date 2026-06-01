! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- UnboundMethod class definition
expectvalue /Class
doit
Object subclass: 'UnboundMethod'
  instVarNames: #( definingClass selector )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnboundMethod comment:
'Callable shim for ``SomeClass.instance_method'' accessed via the class —
an *unbound* method (a plain function in Python 3).  Returned by
``object >> ___pyAttrLoad___'' when a Behavior (class) receiver loads a name
that resolves to an *instance* method.

Holds:
  * definingClass — the class whose method to run (looked up INCLUSIVE of
                    itself and its superclass chain — unlike ``Super'',
                    which starts at the parent).
  * selector      — the requested attribute symbol (Python name).

``value:value:'' substitutes the FIRST positional argument as the receiver
(the explicit ``self'') and runs definingClass''s own method on it via the
env-0 ``performMethod:'' primitives — i.e. ``ParentClass.__init__(self,
*args, **kwargs)'' invokes ParentClass''s ``__init__'' on ``self''
NON-virtually (no re-dispatch through ``self''''s class, which would
re-fire an override).  This is the explicit-super-init / unbound-method
pattern (flask''s ``Environment.__init__'' calls
``BaseEnvironment.__init__(self, **options)'').'
%

expectvalue /Class
doit
UnboundMethod category: 'Grail-Modules'
%

removeallmethods UnboundMethod
removeallclassmethods UnboundMethod

set compile_env: 0

category: 'Grail-Private'
method: UnboundMethod
_setClass: aClass selector: aSym

	definingClass := aClass.
	selector := aSym.
%

category: 'Grail-Private'
method: UnboundMethod
_resolveMethodNargs: nargs kwOk: kwOk
	"Walk definingClass's chain INCLUSIVE and return the method from the
	CLOSEST class that publishes a usable form.  Checking per-class (rather
	than scanning the whole chain for the fixed form, then the whole chain
	for varargs) keeps a class's own varargs ``_name:kw:'' from being
	shadowed by an inherited fixed-arity default — notably the env-1 no-op
	``object >> __init__'', which would otherwise swallow a subclass's real
	``___init__:kw:''.  Within a class: when kwargs are present only varargs
	can accept them, so try it first; otherwise prefer the exact fixed
	arity, then fall back to varargs."

	| fixedSel vaSel walker |
	fixedSel := nargs = 0 ifTrue: [selector]
		ifFalse: [nargs = 1 ifTrue: [(selector asString , ':') asSymbol]
		ifFalse: [nargs = 2 ifTrue: [(selector asString , ':_:') asSymbol]
		ifFalse: [nargs = 3 ifTrue: [(selector asString , ':_:_:') asSymbol]
		ifFalse: [nil]]]].
	vaSel := ('_' , selector asString , ':kw:') asSymbol.
	walker := definingClass.
	[walker notNil] whileTrue: [
		| md |
		md := walker methodDictForEnv: 1.
		kwOk
			ifTrue: [
				(fixedSel notNil and: [md includesKey: fixedSel]) ifTrue: [^ md at: fixedSel].
				(md includesKey: vaSel) ifTrue: [^ md at: vaSel].
			]
			ifFalse: [
				(md includesKey: vaSel) ifTrue: [^ md at: vaSel].
				(fixedSel notNil and: [md includesKey: fixedSel]) ifTrue: [^ md at: fixedSel].
			].
		walker := walker superClass].
	^ nil
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: UnboundMethod
definingClass: aClass selector: aSym

	| inst |
	inst := self @env0:new.
	inst @env0:_setClass: aClass selector: aSym.
	^ inst
%

category: 'Grail-Calling'
method: UnboundMethod
value: positional value: kwargs
	"``Cls.method(instance, *args, **kwargs)'' — first positional is the
	receiver (Python ``self''); the rest are the actual args.  Resolve the
	closest-class form for the arity and run it NON-virtually via
	``performMethod:''.  A varargs (``_name:kw:'') parent takes ``self'' as
	the Smalltalk receiver and ``positional'' as the args after self, so it
	gets ``rest'' — same as a fixed-arity parent."

	| obj rest nargs kwOk method resolvedSel |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		^ TypeError @env1:___signal___:
			('unbound method ''' @env0:, selector @env0:asString
				@env0:, ''' must be called with an instance as the first argument')
	].
	obj := positional @env0:at: 1.
	rest := (positional @env0:size @env0:> 1)
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	nargs := rest @env0:size.
	kwOk := kwargs == nil or: [kwargs @env0:isEmpty].
	method := self @env0:_resolveMethodNargs: nargs kwOk: kwOk.
	method ifNil: [
		^ AttributeError @env1:___signal___:
			('type object ''' @env0:, definingClass @env0:name @env0:asString
				@env0:, ''' has no method ''' @env0:, selector @env0:asString @env0:, '''')
	].
	resolvedSel := method @env0:selector.
	(resolvedSel @env0:asString @env0:endsWith: ':kw:') ifTrue: [
		^ obj @env0:with: rest with: kwargs performMethod: method
	].
	nargs @env0:= 0 ifTrue: [^ obj @env0:performMethod: method].
	nargs @env0:= 1 ifTrue: [
		^ obj @env0:with: (rest @env0:at: 1) performMethod: method].
	nargs @env0:= 2 ifTrue: [
		^ obj @env0:with: (rest @env0:at: 1) with: (rest @env0:at: 2) performMethod: method].
	nargs @env0:= 3 ifTrue: [
		^ obj
			@env0:with: (rest @env0:at: 1)
			with: (rest @env0:at: 2)
			with: (rest @env0:at: 3)
			performMethod: method].
	nargs @env0:= 4 ifTrue: [
		^ obj
			@env0:with: (rest @env0:at: 1)
			with: (rest @env0:at: 2)
			with: (rest @env0:at: 3)
			with: (rest @env0:at: 4)
			performMethod: method].
	"5+ args: no performMethod primitive variant — fall through to plain
	perform (works unless the parent method itself calls super())."
	^ obj @env0:perform: resolvedSel env: 1 withArguments: rest
%

set compile_env: 0
