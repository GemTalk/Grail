! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- BoundMethod class definition
expectvalue /Class
doit
Object subclass: 'BoundMethod'
  instVarNames: #( receiver selector
                    sel0 sel1 sel2 sel3 selVarargs )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BoundMethod comment:
'A first-class handle to a Smalltalk method on a specific receiver, used to
support Python "function as value" semantics in the dispatch model.

Background. Python lets you read a function as a value:

    f = abs
    f(-5)              # 5

In the current dispatch model (see docs/Rewrite_Dispatch_Model.md), the
direct call `abs(-5)` compiles to a fast-path Smalltalk method send
`(builtins instance) abs: -5`. But the assignment `f = abs` requires
something callable to be stored in the local `f`. We can''t store a
CompiledMethod and send `value:` to it directly (current GemStone does
not allow that), so we wrap it in a small object that knows its receiver
and selector.

Selectors for common arities (0..3 positional args) are precomputed at
construction time, avoiding the ~230 ns per-call cost of building them
dynamically via WriteStream + asSymbol. The dispatch path tries the
precomputed fixed-arity selector first; if that selector has no matching
method, it falls back to the `_name:kw:` varargs convention (also
precomputed).
'
%

expectvalue /Class
doit
BoundMethod category: 'Grail-Modules'
%

! ------------------- Remove existing behavior from BoundMethod
removeallmethods BoundMethod
removeallclassmethods BoundMethod

set compile_env: 0

! ------------------- Instance methods (env 0 — internal setup and accessors)

category: 'Grail-Private'
method: BoundMethod
_setReceiver: aReceiver selector: aSymbol
	"Initialize and precompute arity-resolved selectors for arities 0..3
	plus the varargs `_name:kw:` selector. Selector building happens ONCE
	at construction time, not on every call."

	| s |
	receiver := aReceiver.
	selector := aSymbol.
	s := aSymbol asString.
	sel0 := aSymbol.
	sel1 := (s , ':') asSymbol.
	sel2 := (s , ':_:') asSymbol.
	sel3 := (s , ':_:_:') asSymbol.
	selVarargs := ('_' , s , ':kw:') asSymbol.
%

category: 'Grail-Accessing'
method: BoundMethod
receiver
	^ receiver
%

category: 'Grail-Accessing'
method: BoundMethod
selector
	^ selector
%

category: 'Grail-Private'
method: BoundMethod
_selectorForArgCount: nargs
	"Return the precomputed selector for the given arity, or nil if
	nargs > 3 (caller should use the varargs form)."

	nargs == 0 ifTrue: [^ sel0].
	nargs == 1 ifTrue: [^ sel1].
	nargs == 2 ifTrue: [^ sel2].
	nargs == 3 ifTrue: [^ sel3].
	^ nil
%

category: 'Grail-Private'
method: BoundMethod
_receiverHasSelector: aSymbol
	"True if the receiver's class chain implements `aSymbol` in env 1.
	Walks ``whichClassIncludesSelector:environmentId:`` so inherited
	methods (e.g. ``values`` on KeyValueDictionary, invoked through
	an IdentityKeyValueDictionary instance) are visible."

	^ ((receiver class) whichClassIncludesSelector: aSymbol environmentId: 1) notNil
%

set compile_env: 1

! ------------------- Class methods (env 1 — called from generated Python code)

category: 'Grail-Instance Creation'
classmethod: BoundMethod
receiver: aReceiver selector: aSymbol
	"Create a BoundMethod that, when called, will send `aSymbol` to
	`aReceiver` with the call''s arguments. Precomputes arity-resolved
	selectors for fast dispatch."

	| inst |
	inst := self @env0:new.
	inst @env0:_setReceiver: aReceiver selector: aSymbol.
	^ inst
%

set compile_env: 0

! ------------------- Instance methods (env 1 — call protocol)

set compile_env: 1

category: 'Grail-Calling'
method: BoundMethod
value: positional value: kwargs
	"Forward an indirect call to the underlying receiver/selector.

	Dispatch order (using precomputed selectors — no per-call string building):
	  1. No kwargs and positional count is 0..3: use the precomputed
	     fixed-arity selector (sel0/sel1/sel2/sel3) if the receiver has it.
	  2. Otherwise fall back to the precomputed varargs `_name:kw:`.
	  3. If neither exists, raise via the receiver''s normal DNU path.

	Unbound form (receiver isNil): the BoundMethod represents a bare
	class-body function reference (``class C: def f(self): ...; pair =
	(f,)'') where the eventual call must supply the receiver as the
	first positional arg.  Pop positional[1] as the receiver and
	dispatch with the remaining args.  Matches CPython's unbound-
	function semantics: ``C.__dict__['f'](instance, ...)''."

	| actualReceiver actualArgs nargs fixedSel |
	receiver @env0:isNil
		ifTrue: [
			actualReceiver := positional @env0:at: 1.
			actualArgs := positional @env0:size @env0:> 1
				ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
				ifFalse: [Array @env0:new].
		]
		ifFalse: [
			actualReceiver := receiver.
			actualArgs := positional.
		].
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifTrue: [
		nargs := actualArgs @env0:size.
		fixedSel := self @env0:_selectorForArgCount: nargs.
		fixedSel ifNotNil: [
			((actualReceiver @env0:class) @env0:whichClassIncludesSelector: fixedSel environmentId: 1) @env0:notNil ifTrue: [
				^ actualReceiver perform: fixedSel env: 1 withArguments: actualArgs
			].
		].
	].
	^ actualReceiver perform: selVarargs env: 1 withArguments: { actualArgs. kwargs }
%

category: 'Grail-Callable'
method: BoundMethod
__call__: positional
	"Make BoundMethod respond to Python's `callable(...)` protocol.
	Forwards to the standard varargs entry point with empty kwargs."

	^ self value: positional value: nil
%

category: 'Grail-Callable'
method: BoundMethod
___pyCallValue___: positional kw: kwargs
	"Forward the Python ``f(args, **kw)'' call to the bound receiver/
	selector via the standard ``value:value:'' entry point.  Overrides
	the default Object>>___pyCallValue___:kw: which raises TypeError —
	BoundMethod IS the canonical callable wrapper."

	^ self @env1:value: positional value: kwargs
%

set compile_env: 0
