! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LambdaAst
expectvalue /Class
doit
ExpressionAst subclass: 'LambdaAst'
  instVarNames: #( args body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
LambdaAst comment:
'https://docs.python.org/3/library/ast.html#ast.Lambda

lambda is a minimal function definition that can be used inside an expression.

args is an arguments node.
body holds a single node (unlike FunctionDef which has a list of statements).

Example:
>>> print(ast.dump(ast.parse(''lambda x,y: ...''), indent=4))
Module(
    body=[
        Expr(
            value=Lambda(
                args=arguments(args=[arg(arg=''x''), arg(arg=''y'')]),
                body=Constant(value=Ellipsis)))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        LambdaAst(args body)
'
%

expectvalue /Class
doit
LambdaAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from LambdaAst
removeallmethods LambdaAst
removeallclassmethods LambdaAst

set compile_env: 0

category: 'Grail-other'
method: LambdaAst
name

	^'<lambda>'
%

category: 'Grail-other'
method: LambdaAst
deletedNamesInSubtree
	"Always empty: a lambda's body is a single EXPRESSION, and ``del''
	is a statement, so no lambda can unbind one of its own parameters.
	Answered so NameAst's parameter-guard analysis can treat lambdas
	and defs uniformly (see FunctionDefAst >> deletedNamesInSubtree).

	A ``del'' in a def NESTED inside a lambda is impossible for the same
	reason -- a lambda body cannot contain a def."

	^ IdentitySet new
%

category: 'Grail-other'
method: LambdaAst
isVariableIsDeclared: aSymbol
	"A lambda's parameter list IS its scope.  NameAst's load-context
	walk asks every ancestor whether the name is declared so it can
	choose between a local read and the module-symbol fallback.
	Without this override the lambda body falls through to the
	enclosing function's scope; ``lambda p: p[0]`` would treat ``p``
	as a free name, emit ``(self at: #'p' ifAbsent: [NameError ...])``,
	and raise NameError at call time."

	((args posonlyargs , args args)
		anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
		ifTrue: [^ true].
	args vararg ifNotNil: [
		args vararg name asSymbol == aSymbol asSymbol ifTrue: [^ true]].
	(args kwonlyargs anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
		ifTrue: [^ true].
	args kwarg ifNotNil: [
		args kwarg name asSymbol == aSymbol asSymbol ifTrue: [^ true]].
	^ super isVariableIsDeclared: aSymbol
%

category: 'Grail-other'
method: LambdaAst
isVariableIsDeclaredFromMethod: aSymbol
	"Same scope test as ``isVariableIsDeclared:`` — a lambda hides
	its params from the enclosing-method walk too."

	^ self isVariableIsDeclared: aSymbol
%


category: 'Grail-other'
method: LambdaAst
defaultTempSuffix
	"Suffix that makes this lambda's def-time default temps unique: its
	SOURCE POSITION.  Without it, ``def f(a=1): return lambda a=2: a'' would
	have the lambda's outer block redeclare the enclosing method's
	``___lamdef_a...'' temp, which is a Smalltalk compile error rather than
	shadowing.  Two lambdas cannot share a begin position, so the suffix is
	unique and stable across recompiles.  ``line''/``column'' (the
	AbstractLocationNode accessors for beginLine/beginColumn -- note there is
	no ``beginColumn'' reader) are nil for synthesised nodes, hence the
	guards."

	^ '_' , (self line ifNil: [0]) printString , '_'
		, (self column ifNil: [0]) printString , '___'
%

category: 'Grail-other'
method: LambdaAst
transportNamesFor: argNodes
	"Reserved-name params (``self'', ``super'', ...) are transported as
	``_<name>'' — Smalltalk pseudo-variables can't be temps or assignment
	targets.  NameAst's reserved-param rename makes body references read the
	transport identifier."

	^ argNodes collect: [:each |
		(NameAst isReservedSmalltalkIdentifier: each name)
			ifTrue: ['_' , each name asString]
			ifFalse: [each name asString]]
%

category: 'Grail-other'
method: LambdaAst
printSmalltalkOn: aStream
	"Generate Smalltalk for a lambda expression.

	`lambda x, y: x + y` compiles to:
	  [:___positional___ :___kwargs___ |
	    | x y |
	    x := (___positional___ @env0:size @env0:>= 1)
	      ifTrue: [___positional___ @env0:at: 1]
	      ifFalse: [(___kwargs___ @env0:isNil @env0:not
	          and: [___kwargs___ @env0:includesKey: 'x'])
	        ifTrue: [___kwargs___ @env0:at: 'x']
	        ifFalse: [TypeError ___signal___: '... missing required argument: x']].
	    ...
	    x __add__: y]

	`lambda self, *args, **kwargs: self(*args, **kwargs)` compiles to the same
	shape plus the *args tail and the **kwargs dict.

	A lambda WITH DEFAULTS wraps all of that in an immediately-invoked OUTER
	block that evaluates each default expression exactly ONCE:
	  ([ | ___lamdef_x_3_11___ |
	     ___lamdef_x_3_11___ := <expr>.
	     [:___positional___ :___kwargs___ | ... ] ] value)

	HISTORY.  Defaults and keyword matching were previously UNSUPPORTED, and
	the failure mode was not a diagnostic: every named parameter was bound
	with a bare ``___positional___ at: i'', so an argument the caller did not
	pass POSITIONALLY indexed past the end of the Array and raised an
	OffsetError (error 2003).  That is a Smalltalk error — uncatchable from
	Python and fatal to the whole module load.  Both ``(lambda x=1: x)()'' and
	``(lambda x: x)(x=5)'' hit it, and ``lambda m=make: ...'' is THE idiom for
	capturing a loop variable by value, so it was reachable from ordinary
	Python code (it took a bisect to find while writing an unrelated fixture).

	WHY THE OUTER BLOCK.  Python evaluates a default ONCE, in the enclosing
	scope, when the lambda is created — that is the whole point of
	``lambda m=make:'' (capture the binding as it is NOW, not at call time),
	and it is what makes a mutable default shared across calls.  Evaluating
	the expression inside the inner block would re-run it per call and read
	the wrong binding.  See defaultTempSuffix for why the temps carry a
	source position.

	The unpacking mirrors FunctionDefAst's printPositionalUnpackingOn:... and
	its keyword-only sibling, deliberately duplicated rather than shared:
	those also carry the module-level-def and class-body cases (caching a
	default on the module instance, ``self isModuleLevelDef''), none of which
	a lambda has.  The two must stay in step.

	STILL NOT DONE, pre-existing and unrelated to the crash: the
	too-many-positional / unexpected-keyword arg-count guards FunctionDefAst
	emits, so a lambda still silently ignores extra arguments.  Adding them
	makes every lambda call site stricter, which is its own change."

	| posArgs transport kwonlyNames varargName kwargName
	  defaults kwDefaults firstWithDefault suffix hasOuter requiredKwonly
	  qualified |
	posArgs := args posonlyargs , args args.
	transport := self transportNamesFor: posArgs.
	kwonlyNames := self transportNamesFor: args kwonlyargs.
	varargName := args vararg ifNotNil: [:v | v name asString].
	kwargName := args kwarg ifNotNil: [:k | k name asString].
	"``defaults'' is right-aligned across the combined posonly + regular
	positional sequence (CPython semantics): the LAST n parameters have
	defaults, the earlier ones are required."
	defaults := args defaults ifNil: [#()].
	kwDefaults := args kw_defaults ifNil: [#()].
	firstWithDefault := transport size - defaults size + 1.
	suffix := self defaultTempSuffix.
	hasOuter := defaults notEmpty
		or: [kwDefaults anySatisfy: [:d | d notNil]].

	"Def-time default capture: an outer block that evaluates every default
	once and answers the inner block.  Parenthesised so the trailing
	``value'' send can't be captured by a surrounding binary/keyword message."
	hasOuter ifTrue: [
		aStream nextPutAll: '(['; lf; nextPutAll: '| '.
		1 to: defaults size do: [:i |
			aStream nextPutAll: '___lamdef_';
				nextPutAll: (transport at: firstWithDefault + i - 1);
				nextPutAll: suffix; space].
		1 to: kwonlyNames size do: [:i |
			(kwDefaults at: i ifAbsent: [nil]) ifNotNil: [
				aStream nextPutAll: '___lamdef_';
					nextPutAll: (kwonlyNames at: i);
					nextPutAll: suffix; space]].
		aStream nextPut: $|; lf.
		1 to: defaults size do: [:i |
			aStream nextPutAll: '___lamdef_';
				nextPutAll: (transport at: firstWithDefault + i - 1);
				nextPutAll: suffix; nextPutAll: ' := '.
			(defaults at: i) printSmalltalkOn: aStream.
			aStream nextPut: $.; lf].
		1 to: kwonlyNames size do: [:i |
			| def |
			def := kwDefaults at: i ifAbsent: [nil].
			def ifNotNil: [
				aStream nextPutAll: '___lamdef_';
					nextPutAll: (kwonlyNames at: i);
					nextPutAll: suffix; nextPutAll: ' := '.
				def printSmalltalkOn: aStream.
				aStream nextPut: $.; lf]]].

	"Underscored sentinels, not bare ``positional''/``keywords'': a lambda
	parameter spelled like the dispatch temp would otherwise collide with it."
	"Open a paren when there is no defaults wrapper to supply one: unlike a
	def -- which is a STATEMENT -- a lambda is an expression in arbitrary
	positions, and the trailing ``___pyCode___:'' keyword send below would
	otherwise be absorbed by a surrounding keyword message."
	hasOuter ifFalse: [aStream nextPut: $(].
	aStream nextPutAll: '[:___positional___ :___kwargs___ |'.

	"Declare locals for every parameter name (positional + kwonly + *args +
	**kwargs)."
	(transport isEmpty and: [kwonlyNames isEmpty
		and: [varargName isNil and: [kwargName isNil]]])
		ifFalse: [
			aStream nextPutAll: ' | '.
			transport do: [:n | aStream nextPutAll: n; space].
			kwonlyNames do: [:n | aStream nextPutAll: n; space].
			varargName ifNotNil: [aStream nextPutAll: varargName; space].
			kwargName ifNotNil: [aStream nextPutAll: kwargName; space].
			aStream nextPut: $|.
		].
	aStream lf.

	"Bind each named positional: the positional slot, else the same-named
	keyword, else the def-time default, else a catchable TypeError.  The
	keyword LOOKUP uses the Python name while the temp uses the transport
	name, so a reserved-name param (``lambda self=x: ...'') is still passable
	as ``self=''.  Keys are Python str (Smalltalk String) to match the dict
	CallAst>>printKeywordsDictOn: builds."
	"All-at-once missing-parameter report, before the binding loop, which sees
	one parameter at a time -- as in FunctionDefAst.  A lambda's __qualname__ is
	``<lambda>'', which is what CPython names in the message.  Guarded on the
	positional count so an ordinary call pays a compare and no send."
	firstWithDefault > 1 ifTrue: [
		aStream
			nextPutAll: '((___positional___ @env0:size) @env0:< ';
			nextPutAll: (firstWithDefault - 1) printString;
			nextPutAll: ') ifTrue: [TypeError ___checkMissingPositional___: ___positional___ kwargs: ___kwargs___ names: #( '.
		1 to: firstWithDefault - 1 do: [:i |
			aStream nextPut: $'; nextPutAll: (posArgs at: i) name asString;
				nextPutAll: ''' '].
		aStream
			nextPutAll: ') posonly: ';
			nextPutAll: ((args posonlyargs size) min: firstWithDefault - 1) printString;
			nextPutAll: ' qualifiedName: ''<lambda>''].'; lf].
	transport doWithIndex: [:n :i |
		| pyName |
		pyName := (posArgs at: i) name asString.
		aStream
			nextPutAll: n;
			nextPutAll: ' := (___positional___ @env0:size @env0:>= ';
			nextPutAll: i printString;
			nextPutAll: ') ifTrue: [___positional___ @env0:at: ';
			nextPutAll: i printString;
			nextPutAll: '] ifFalse: [(___kwargs___ @env0:isNil @env0:not and: [';
			nextPutAll: '___kwargs___ @env0:includesKey: ''';
			nextPutAll: pyName;
			nextPutAll: ''']) ifTrue: [___kwargs___ @env0:at: ''';
			nextPutAll: pyName;
			nextPutAll: '''] ifFalse: ['.
		i >= firstWithDefault
			ifTrue: [
				aStream nextPutAll: '___lamdef_'; nextPutAll: n;
					nextPutAll: suffix]
			ifFalse: [
				"Unreachable once the pre-pass above has run; kept as the
				binding's own last word, in the same wording."
				aStream
					nextPutAll: 'TypeError ___signalMissingArguments___: #( ''';
					nextPutAll: pyName;
					nextPutAll: ''' ) kind: ''positional'' qualifiedName: ''<lambda>'''].
		aStream nextPutAll: ']].'; lf.
	].

	"Bind *args to the remaining positional tail, wrapped as a TUPLE — the
	same expression FunctionDefAst uses.  It used to be a bare Array copy, so
	``(lambda *a: a)(1, 2)'' answered [1, 2] and isinstance(a, tuple) was
	False; splatting it back out worked, which is why the werkzeug proxy
	lambdas never noticed.  Empty tuple when the call passed exactly the fixed
	args."
	varargName ifNotNil: [
		aStream
			nextPutAll: varargName;
			nextPutAll: ' := tuple perform: #withAll: env: 0 withArguments: { ___positional___ @env0:copyFrom: ';
			nextPutAll: (transport size + 1) printString;
			nextPutAll: ' to: ___positional___ @env0:size }.';
			lf.
	].

	"Bind keyword-only args from the kwargs dict, else their default, else a
	catchable TypeError (a nil kw_defaults entry means the arg is required)."
	"Required keyword-only parameters, reported together and after the positional
	ones -- CPython's order.  Unguarded: a keyword-only parameter is filled by
	name, so there is no count that proves them all present."
	requiredKwonly := OrderedCollection new.
	kwonlyNames doWithIndex: [:n :i |
		(kwDefaults at: i ifAbsent: [nil]) isNil ifTrue: [
			requiredKwonly add: (args kwonlyargs at: i) name asString]].
	requiredKwonly isEmpty ifFalse: [
		aStream nextPutAll: 'TypeError ___checkMissingKeywordOnly___: ___kwargs___ defaults: nil names: #( '.
		requiredKwonly do: [:each |
			aStream nextPut: $'; nextPutAll: each; nextPutAll: ''' '].
		aStream nextPutAll: ') qualifiedName: ''<lambda>''.'; lf].
	kwonlyNames doWithIndex: [:n :i |
		| pyName def |
		pyName := (args kwonlyargs at: i) name asString.
		def := kwDefaults at: i ifAbsent: [nil].
		aStream
			nextPutAll: n;
			nextPutAll: ' := (___kwargs___ @env0:isNil @env0:not and: [';
			nextPutAll: '___kwargs___ @env0:includesKey: ''';
			nextPutAll: pyName;
			nextPutAll: ''']) ifTrue: [___kwargs___ @env0:at: ''';
			nextPutAll: pyName;
			nextPutAll: '''] ifFalse: ['.
		def isNil
			ifTrue: [
				aStream
					nextPutAll: 'TypeError ___signalMissingArguments___: #( ''';
					nextPutAll: pyName;
					nextPutAll: ''' ) kind: ''keyword-only'' qualifiedName: ''<lambda>''']
			ifFalse: [
				aStream nextPutAll: '___lamdef_'; nextPutAll: n;
					nextPutAll: suffix].
		aStream nextPutAll: '].'; lf.
	].

	"Bind **kwargs.  Python's ``**kwargs'' collects only the keywords that did
	NOT match a named parameter, and the incoming dict belongs to the caller
	— so COPY, then drop every name bound above.  Without the drop,
	``(lambda x, **kw: kw)(x=1)'' would report {'x': 1}.  posonlyargs are
	deliberately NOT dropped: a keyword spelled like a positional-only
	parameter legitimately lands in **kwargs (same rule as FunctionDefAst)."
	kwargName ifNotNil: [
		aStream
			nextPutAll: kwargName;
			nextPutAll: ' := ___kwargs___ @env0:isNil ifTrue: [PyDict @env0:new] ifFalse: [___kwargs___ @env0:copy].';
			lf.
		(args args , args kwonlyargs) do: [:each |
			aStream
				nextPutAll: kwargName;
				nextPutAll: ' @env0:removeKey: ''';
				nextPutAll: each name asString;
				nextPutAll: ''' ifAbsent: [].';
				lf].
	].

	"Emit the body expression (single expression, not a statement list)"
	body printSmalltalkOn: aStream.

	aStream nextPut: $].
	"Stamp lambda.__code__, the same def-time PyCode cascade FunctionDefAst
	emits -- a lambda IS a function in Python and ``f.__code__'' is how
	introspection reaches its name, file and line.  Without it every lambda
	raised AttributeError there (test_scope testEvalExecFreeVars).  co_name is
	``<lambda>'', as in CPython.  ___pyCode___: answers the receiver, so the
	block stays the value of the expression.
	Emitted INSIDE the defaults wrapper when there is one, so the stamp lands
	on the inner callable block rather than on the outer setup block."
	"__name__, __module__ and __qualname__, none of which a lambda ever got.
	Without the ___pyNamed___ stamp all three answered the ``<closure>''
	placeholder, so ``(lambda: 1).__name__'' was '<closure>' where CPython says
	'<lambda>', and test_funcattrs' test___qualname__ compared '<closure>'
	against 'global_function.<locals>.<lambda>'.  co_name was ALREADY right (the
	PyCode below stamps it), which is why this read as a rendering problem rather
	than as a missing stamp -- the code object knew the name and the function
	object did not.

	A KEYWORD SEND for ___pyNamed___: and CASCADES for the rest, which is the
	rule FunctionDefAst records beside its own copy of this: two chained keyword
	sends parse as one combined selector that does not exist.  All three stamps
	answer self, so the cascade's value stays the block.

	___pyModuleNamed___: unconditionally, for the reason the def path gives: a
	module-level def forwards __module__ to its receiving module, and a block has
	no receiver to forward to, so without this a lambda's __module__ is the
	placeholder too.

	The qualname is SKIPPED when it equals the bare name.  A module-level lambda
	is simply ``<lambda>'' in CPython, and ExecBlock >> __qualname__ already falls
	back to __name__, so emitting it would only restate what the name says.

	THE PREFIX COMES FROM THE SCOPE STACK, and a lambda never pushes onto it --
	which is not an oversight to work around but exactly what makes this correct:
	the walk stops at its argument's own frame, finds none, and so consumes every
	enclosing scope, which IS a lambda's prefix.  Verified against CPython 3.14.6
	for the four shapes: '<lambda>' at module level, 'f.<locals>.<lambda>' inside
	a function, 'K.<lambda>' in a class body (no ``<locals>'' -- a class body is
	not a function scope), and two lambdas in one scope sharing one qualname."
	aStream nextPutAll: ' @env0:___pyNamed___: ''<lambda>'''.
	CallAst moduleNameBeingCompiled ifNotNil: [:modName |
		aStream
			nextPutAll: '; @env0:___pyModuleNamed___: ''';
			nextPutAll: modName asString;
			nextPutAll: ''''].
	qualified := CallAst ___qualnameFor___: self name: '<lambda>'.
	qualified = '<lambda>' ifFalse: [
		aStream
			nextPutAll: '; @env0:___pyQualname___: ''';
			nextPutAll: qualified;
			nextPutAll: ''''].
	aStream
		nextPutAll: '; @env0:___pyCode___: (PyCode @env0:name: ''<lambda>'' filename: '.
	self emitSourceFilenameLiteralOn: aStream.
	aStream
		nextPutAll: ' firstlineno: '; nextPutAll: (self beginLine ifNil: [0]) printString;
		nextPutAll: ' argcount: '; nextPutAll: (posArgs size) printString;
		nextPutAll: ' posonlyargcount: '; nextPutAll: (args posonlyargs ifNil: [#()]) size printString;
		nextPutAll: ' kwonlyargcount: '; nextPutAll: (args kwonlyargs ifNil: [#()]) size printString;
		nextPutAll: ')'.
	hasOuter
		ifTrue: [aStream nextPutAll: '] value)']
		ifFalse: [aStream nextPut: $)].
%
method: LambdaAst
args
	^args
%
method: LambdaAst
args: newValue
	args := newValue
%
method: LambdaAst
body
	^body
%
method: LambdaAst
body: newValue
	body := newValue
%
