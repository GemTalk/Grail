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
	then execute it with obj as the receiver."

	| nargs kwOk method ctx |
	nargs := positional @env0:size.
	kwOk := kwargs == nil or: [kwargs @env0:isEmpty].
	method := resolver @env0:value: nargs value: kwOk.
	method ifNil: [
		AttributeError @env1:___signal___:
			'super(): no parent method ''' @env0:, selector @env0:asString @env0:, ''''
	].
	"Build the args Array: [obj. positional...].  If kwargs present,
	use the varargs convention (obj, positional, kwargs)."
	(kwOk not) ifTrue: [
		ctx := Array @env0:new: 3.
		ctx @env0:at: 1 put: obj.
		ctx @env0:at: 2 put: positional.
		ctx @env0:at: 3 put: kwargs.
		^ method @env0:_executeInContext: ctx
	].
	ctx := Array @env0:new: nargs @env0:+ 1.
	ctx @env0:at: 1 put: obj.
	1 @env0:to: nargs do: [:i |
		ctx @env0:at: i @env0:+ 1 put: (positional @env0:at: i)].
	^ method @env0:_executeInContext: ctx
%

set compile_env: 0
