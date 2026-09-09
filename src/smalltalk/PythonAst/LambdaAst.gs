! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LambdaAst
expectvalue /Class
doit
ExpressionAst subclass: 'LambdaAst'
  instVarNames: #( args body writes)
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
	and raise NameError at call time.

	The parameter list is not ALL of its scope, though: a walrus binds
	here too (see writes).  Reading params only, a class-body
	``computed = (lambda: (c := 5) + c)()`` declared the temp and then
	emitted a MODULE lookup for the read -- NameError at class-build
	time -- because this walk is what the class-body value-emit branch
	consults before falling back to the module."

	(writes notNil and: [writes includes: aSymbol asSymbol]) ifTrue: [^ true].
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
___bodyHasAFullSpan___
	"Does the body carry all four position numbers?

	Not every expression node does: a bare constant answers a nil ``endLine''
	(``lambda: 1'' emits ``#(5 25 nil 25 ...)''), and the scan that reads a
	position literal back wants four INTEGERS -- it answers nil for anything else,
	so such a store records nothing and merely displaces the enclosing one.  An
	all-or-nothing test rather than a repair, because the same node also reports
	column = endColumn there: the information is absent, not malformed, and a
	zero-width span would be a confidently wrong underline where falling back to
	the enclosing store is merely a coarse one."

	^ body notNil
		and: [body beginLine notNil
		and: [body column notNil
		and: [body endLine notNil
		and: [body endColumn notNil]]]]
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
	  qualified bodyLocals bodyLit outerLit |
	"The lambda's BODY is its frame's ``current statement'': CPython underlines
	``foo(*args)'' in ``(lambda *args: foo(*args))(1,2,3,4)'' for the <lambda>
	frame and the whole call for the frame that made it.  Grail emitted no store
	inside the block at all, so the walk scanned back past the ``['' and gave the
	lambda its CALLER's span -- both frames underlined the outer call.

	Emitted only where a store is meaningful: inside a function or a module body
	(the same test ___emitCurPosBefore:on: uses) and only when the enclosing
	store is known, since the block's store has to be undone afterwards -- see
	the restore after the closing bracket."

	bodyLit := nil.
	outerLit := CallAst curPosLiteralInEffect.
	((CallAst functionBeingCompiled notNil or: [CallAst moduleBodyBeingCompiled])
		and: [outerLit notNil and: [self ___bodyHasAFullSpan___]])
		ifTrue: [
			bodyLit := [body ___pyPositionLiteralArray]
				on: Error do: [:ex | ex return: nil]].
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
	**kwargs) -- for every name the BODY binds, which for a lambda means its
	walrus targets -- and for this lambda's OWN ___curPos___ when one is being
	emitted.

	The body half was missing entirely.  ``lambda: (n := 1) + n'' emitted
	``(n := 1) ___binOpAdd___: (self ___moduleAttrLoad___: #n)'' in a
	block with no ``| n |'' -- a Smalltalk CompileError, uncatchable, and
	fatal to the whole enclosing method.  Where an enclosing function
	happened to have a same-named local the code compiled and was WORSE:
	the lambda wrote the outer temp, so ``n = 99'' before the lambda came
	back 1 instead of 99.  PEP 572 binds in the scope containing the
	walrus, and that scope is the lambda.

	A name that is already a parameter is skipped -- ``lambda n:
	(n := 1)'' rebinds the parameter, and declaring it twice does not
	compile.

	The ___curPos___ declaration SHADOWS the enclosing scope's temp of that name
	rather than assigning through to it, which is what keeps the store below
	from corrupting the enclosing frame's position at run time: the enclosing
	function reads ___curPos___ when it catches (TryAst's ___pushCatchingFrame___),
	and a lambda called from inside its try body would otherwise leave the
	lambda's own span standing there.  GemStone allows a block temp to shadow an
	enclosing block's or method's temp -- verified, both one and two levels
	deep -- so this costs a slot and nothing else."
	bodyLocals := (writes ifNil: [#()]) reject: [:each |
		| name |
		name := NameAst ___transportIdentifierFor___: each.
		(transport includes: name)
			or: [(kwonlyNames includes: name)
			or: [varargName = name or: [kwargName = name]]]].
	bodyLocals := bodyLocals asSortedCollection: [:a :b | a asString <= b asString].
	(transport isEmpty and: [kwonlyNames isEmpty
		and: [varargName isNil and: [kwargName isNil
		and: [bodyLocals isEmpty and: [bodyLit isNil]]]]])
		ifFalse: [
			aStream nextPutAll: ' | '.
			bodyLit ifNotNil: [aStream nextPutAll: '___curPos___'; space].
			transport do: [:n | aStream nextPutAll: n; space].
			kwonlyNames do: [:n | aStream nextPutAll: n; space].
			varargName ifNotNil: [aStream nextPutAll: varargName; space].
			kwargName ifNotNil: [aStream nextPutAll: kwargName; space].
			bodyLocals do: [:n |
				aStream nextPutAll: (NameAst ___transportIdentifierFor___: n); space].
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

	"This lambda's own position, so the <lambda> frame blames the body rather
	than the caller's call site.  Stores into the SHADOWED block temp declared
	above, so it is invisible to the enclosing frame at run time; what the
	traceback walk actually reads is this TEXT, scanned back from the ip."
	bodyLit ifNotNil: [
		CallAst curPosLiteralInEffect: bodyLit.
		aStream nextPutAll: '___curPos___ := '; nextPutAll: bodyLit;
			nextPutAll: '.'; lf].

	"Emit the body expression (single expression, not a statement list)"
	body printSmalltalkOn: aStream.

	"A LINE BREAK before the closing bracket, so the restore below cannot share a
	line with the body.  The scan that recovers a position works at LINE
	granularity -- last store at or above the ip's caret line, and the last one on
	that line -- so a restore sitting after the body on one line is found by the
	body's own ip and undoes the store for the frame it was written for.  Measured
	exactly that way: the emitted text was right and the <lambda> frame still
	showed its caller's span."
	bodyLit ifNotNil: [aStream lf].
	aStream nextPut: $].
	bodyLit ifNotNil: [
		self ___emitCurPosRestoreCommentFor___: outerLit on: aStream.
		CallAst curPosLiteralInEffect: outerLit].
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
method: LambdaAst
writes
	"The names this lambda BINDS in its own scope -- the parser's write
	set for the scope it pushes around the body, which for a lambda can
	only hold walrus targets: a lambda body is one expression, and ``:=''
	is the only binding form an expression has.

	PEP 572 puts that binding in the scope CONTAINING the walrus, and for
	``lambda: (n := 1) + n'' that scope is the lambda.  The set was
	collected all along and then dropped on the floor at popScope, which
	cost both halves of the name: printSmalltalkOn: declared temps for
	PARAMETERS only, so the store had nothing to write to, and
	___functionBindsPythonLocal___: looks for a BlockAst body -- which a
	lambda has not got -- so the load did not see a local either.

	Nil for hand-built nodes that never went through the parser; callers
	treat nil as empty."

	^ writes
%
method: LambdaAst
writes: aCollectionOrNil
	writes := aCollectionOrNil
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irEligibleValueLocals___: localNames
	"A lambda as a VALUE inside an IR-built def or method (cut 65): emittable
	as the text's closure block when ___irLambdaReason___: finds nothing to
	refuse."

	^ (self ___irLambdaReason___: localNames) isNil
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irLambdaReason___: localNames
	"Why this lambda cannot be emitted as a closure block, as a census Symbol
	(``LambdaAst:...''), or nil when it can.  Guarded: eligibility never raises."

	^ [self ___irLambdaReasonUnguarded___: localNames]
		on: Error do: [:ex | #'LambdaAst:probeError']
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irLambdaReasonUnguarded___: localNames
	"printSmalltalkOn:'s shape is a def's closure block with an EXPRESSION body
	and a lighter prologue -- no arg-count guards, no shallowCopy, no
	signature spec or closure cells, and the stamps ``___pyNamed___:
	'<lambda>'; ___pyModuleNamed___:; ___pyQualname___:; ___pyCode___:''
	cascaded onto the block inside the defaults wrapper when there is one:

	    ([| ___lamdef_b_L_C___ | ___lamdef_b_L_C___ := <expr>.
	      [:___positional___ :___kwargs___ | | a b rest kw |
	        <missing-positional check>  a := positional[1] / kwargs['a'] / default / raise.
	        rest := <positional tail as tuple>.  <keyword-only bindings>.
	        kw := <a copy of kwargs minus the bound names>.
	        <body expression>
	      ] ___pyNamed___: '<lambda>'; ...; ___pyCode___: (PyCode ...)] value)

	Admitted: positional / positional-only / keyword-only parameters, defaults
	(evaluated at the lambda's position, in the enclosing scope), *args and
	**kwargs, a body that is an emittable value against the enclosing locals
	plus the parameters.  Refused: a walrus in the body (its target is a block
	temp the text declares -- and NamedExprAst is refused as a value anyway), a
	yield / await in the body (a generator lambda), a pseudo-variable parameter
	(the text's transport rename)."

	| own nestedLocals seed |
	args isNil ifTrue: [^ #'LambdaAst:noArgs'].
	(writes isNil or: [writes isEmpty]) ifFalse: [^ #'LambdaAst:walrus'].
	own := self ___irOwnNames___.
	(own anySatisfy: [:n | FunctionDefAst new isSmalltalkReservedIdentifier: n])
		ifTrue: [^ #'LambdaAst:reservedName'].
	(self ___irBodyHasYieldOrAwait___: body) ifTrue: [^ #'LambdaAst:yield'].
	(args defaults ifNil: [#()]) do: [:d |
		(d ___irEligibleValueLocals___: localNames) ifFalse: [^ #'LambdaAst:defaultExpr']].
	(args kw_defaults ifNil: [#()]) do: [:d |
		(d notNil and: [(d ___irEligibleValueLocals___: localNames) not])
			ifTrue: [^ #'LambdaAst:defaultExpr']].
	nestedLocals := self ___irNestedLocals___: localNames.
	(body ___irEligibleValueLocals___: nestedLocals) ifFalse: [^ #'LambdaAst:body'].
	"Every enclosing local read by the body must be bound at the lambda's
	position -- the enclosing statement's flow rule collects those reads
	through ___irReadLocalNamesInto___:locals: -- and the parameters are bound
	on entry, so no unbound read is possible inside; nothing else to prove."
	^ nil
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irBodyHasYieldOrAwait___: node
	node isNil ifTrue: [^ false].
	node isString ifTrue: [^ false].
	(node isKindOf: SequenceableCollection) ifTrue: [
		^ node anySatisfy: [:each | self ___irBodyHasYieldOrAwait___: each]].
	(node isKindOf: AbstractNode) ifFalse: [^ false].
	((node isKindOf: YieldAst) or: [(node isKindOf: YieldFromAst) or: [node isKindOf: AwaitAst]])
		ifTrue: [^ true].
	((node isKindOf: LambdaAst) and: [node ~~ self]) ifTrue: [^ false].
	node class allInstVarNames doWithIndex: [:nameSym :i |
		nameSym == #parent ifFalse: [
			(self ___irBodyHasYieldOrAwait___: (node instVarAt: i)) ifTrue: [^ true]]].
	^ false
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irOwnNames___
	"Every parameter name, as Strings, in the text's declaration order:
	positional (positional-only first), keyword-only, *vararg, **kwarg."

	| out |
	out := OrderedCollection new.
	(args posonlyargs ifNil: [#()]) do: [:a | out add: a name asString].
	(args args ifNil: [#()]) do: [:a | out add: a name asString].
	(args kwonlyargs ifNil: [#()]) do: [:a | out add: a name asString].
	args vararg ifNotNil: [:v | out add: v name asString].
	args kwarg ifNotNil: [:k | out add: k name asString].
	^ out
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irNestedLocals___: localNames
	| set |
	set := localNames copy.
	self ___irOwnNames___ do: [:n | set add: n].
	^ set
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irChildLocals___: localSet
	"For the census walk: the body is judged against the lambda's own scope."

	^ self ___irNestedLocals___: localSet
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irRefusalDetail___: localSet
	^ (self ___irLambdaReason___: localSet) ifNil: [#'LambdaAst:other']
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irReadLocalNamesInto___: aSet locals: localSet
	"The enclosing locals a lambda READS: its defaults (evaluated where the
	lambda is) and, through the closure, the free variables of its body --
	enclosing locals it does not bind as parameters."

	| own outer |
	(args defaults ifNil: [#()]) do: [:d | d ___irReadLocalNamesInto___: aSet locals: localSet].
	(args kw_defaults ifNil: [#()]) do: [:d |
		d ifNotNil: [d ___irReadLocalNamesInto___: aSet locals: localSet]].
	own := self ___irOwnNames___.
	outer := localSet reject: [:n | own includes: n].
	body ___irReadLocalNamesInto___: aSet locals: outer.
	^ self
%

category: 'Grail-IR Codegen'
method: LambdaAst
___emitIRValueOn___: aBuilder
	"The lambda's function object, printSmalltalkOn:'s shape send for send
	(see ___irLambdaReasonUnguarded___:).  Defaults are evaluated once into
	the ``___lamdef_<p><suffix>___'' temps of an immediately-evaluated wrapper
	block, which the parameter bindings read; the stamps are cascaded onto the
	inner block (inside the wrapper), whose value the cascade answers."

	| defaults kwDefaults hasOuter posNames firstWithDefault suffix inner |
	defaults := args defaults ifNil: [#()].
	kwDefaults := args kw_defaults ifNil: [#()].
	hasOuter := defaults notEmpty or: [kwDefaults anySatisfy: [:d | d notNil]].
	posNames := ((args posonlyargs ifNil: [#()]) , (args args ifNil: [#()])) collect: [:a | a name asString].
	firstWithDefault := posNames size - defaults size + 1.
	suffix := self defaultTempSuffix.
	aBuilder at: self beginPosition.
	hasOuter ifFalse: [^ self ___emitIRLambdaBlockOn___: aBuilder].
	[
		| names exprs outer |
		names := OrderedCollection new.
		exprs := OrderedCollection new.
		defaults doWithIndex: [:d :i |
			names add: ('___lamdef_' , (posNames at: firstWithDefault + i - 1) , suffix) asSymbol.
			exprs add: d].
		(args kwonlyargs ifNil: [#()]) doWithIndex: [:k :i |
			(kwDefaults at: i ifAbsent: [nil]) ifNotNil: [:d |
				names add: ('___lamdef_' , k name asString , suffix) asSymbol.
				exprs add: d]].
		outer := aBuilder blockWithTemps: names asArray do: [:leaves |
			aBuilder withLocals: ((1 to: names size) collect: [:i | (names at: i) -> (leaves at: i)]) do: [
				exprs doWithIndex: [:d :i |
					| v |
					v := d ___emitIRValueOn___: aBuilder.
					aBuilder at: self beginPosition.
					aBuilder add: (aBuilder assign: (leaves at: i) from: v)].
				aBuilder add: (self ___emitIRLambdaBlockOn___: aBuilder)]].
		aBuilder at: self beginPosition.
		^ aBuilder send: #value to: outer with: { } env: 0
	] value
%

category: 'Grail-IR Codegen'
method: LambdaAst
___emitIRLambdaBlockOn___: aBuilder
	"The ``[:___positional___ :___kwargs___ | | params | prologue. body]''
	block with its stamps cascaded on.  Parameters are block temps bound into
	the local table for the block's duration; inNestedFunction is set for
	symmetry with a def's closure (a lambda body has no statements)."

	| tempNames blk qual code specs |
	tempNames := (self ___irOwnNames___ collect: [:n | n asSymbol]) asArray.
	blk := aBuilder blockWithArgs: #(#'___positional___' #'___kwargs___') temps: tempNames
		do: [:argLeaves :tempLeaves |
			aBuilder nestedFunctionDo: [
				aBuilder withLocals: ((1 to: tempNames size) collect: [:i | (tempNames at: i) -> (tempLeaves at: i)]) do: [
					| posLeaf kwLeaf savedGen |
					posLeaf := argLeaves at: 1.
					kwLeaf := argLeaves at: 2.
					aBuilder at: self beginPosition.
					self ___emitIRLambdaPrologueOn___: aBuilder pos: posLeaf kw: kwLeaf.
					savedGen := aBuilder genLeaf.
					aBuilder genLeaf: nil.
					[aBuilder add: (body ___emitIRValueOn___: aBuilder)]
						ensure: [aBuilder genLeaf: savedGen]]]].
	aBuilder at: self beginPosition.
	specs := OrderedCollection new.
	specs add: { #'___pyNamed___:'. { aBuilder obj: '<lambda>' }. 0 }.
	CallAst moduleNameBeingCompiled ifNotNil: [:modName |
		specs add: { #'___pyModuleNamed___:'. { aBuilder obj: modName asString }. 0 }].
	qual := CallAst ___qualnameFor___: self name: '<lambda>'.
	qual = '<lambda>' ifFalse: [
		specs add: { #'___pyQualname___:'. { aBuilder obj: qual asString }. 0 }].
	code := aBuilder
		send: #'name:filename:firstlineno:argcount:posonlyargcount:kwonlyargcount:'
		to: (aBuilder globalNamed: #PyCode)
		with: {
			aBuilder obj: '<lambda>'.
			aBuilder obj: self ___irFileName___ asString.
			aBuilder obj: (self beginLine ifNil: [0]).
			aBuilder obj: (args posonlyargs ifNil: [#()]) size + (args args ifNil: [#()]) size.
			aBuilder obj: (args posonlyargs ifNil: [#()]) size.
			aBuilder obj: (args kwonlyargs ifNil: [#()]) size }
		env: 0.
	specs add: { #'___pyCode___:'. { code }. 0 }.
	^ aBuilder cascade: blk specs: specs
%

category: 'Grail-IR Codegen'
method: LambdaAst
___irFileName___
	"The module's real path, as emitSourceFilenameLiteralOn: spells it -- the
	same answer FunctionDefAst>>___irFileName___ gives."

	^ CallAst sourcePath ifNil: ['<grail>']
%

category: 'Grail-IR Codegen'
method: LambdaAst
___emitIRLambdaPrologueOn___: aBuilder pos: posLeaf kw: kwLeaf
	"printSmalltalkOn:'s parameter binding, statement for statement:

	    ((positional size) < nRequired) ifTrue: [TypeError ___checkMissingPositional___:
	        positional kwargs: kwargs names: #(...) posonly: N qualifiedName: '<lambda>'].
	    a := (positional size >= i) ifTrue: [positional at: i]
	        ifFalse: [(kwargs isNil not and: [kwargs includesKey: 'a'])
	            ifTrue: [kwargs at: 'a'] ifFalse: [<default temp> | <raise>]].
	    rest := tuple withAll: (positional copyFrom: n + 1 to: positional size).
	    TypeError ___checkMissingKeywordOnly___: kwargs defaults: nil names: #(...)
	        qualifiedName: '<lambda>'.                                (required ones)
	    k := (kwargs isNil not and: [kwargs includesKey: 'k'])
	        ifTrue: [kwargs at: 'k'] ifFalse: [<default temp> | <raise>].
	    kw := kwargs isNil ifTrue: [PyDict new] ifFalse: [kwargs copy].
	    kw removeKey: 'a' ifAbsent: [].  ...                         (args + kwonly)

	Unlike a def's closure, every positional parameter -- positional-only
	included -- takes the kwargs gate, and there are no arg-count guards."

	| posArgs posNames defaults kwDefaults firstWithDefault suffix posSize kwGate raise |
	posArgs := (args posonlyargs ifNil: [#()]) , (args args ifNil: [#()]).
	posNames := posArgs collect: [:a | a name asString].
	defaults := args defaults ifNil: [#()].
	kwDefaults := args kw_defaults ifNil: [#()].
	firstWithDefault := posNames size - defaults size + 1.
	suffix := self defaultTempSuffix.
	posSize := [aBuilder send: #size to: (aBuilder var: posLeaf) with: { } env: 0].
	kwGate := [:pname |
		aBuilder
			andValue: (aBuilder send: #not
				to: (aBuilder send: #isNil to: (aBuilder var: kwLeaf) with: { } env: 0)
				with: { } env: 0)
			then: [aBuilder add: (aBuilder send: #includesKey: to: (aBuilder var: kwLeaf)
				with: { aBuilder obj: pname } env: 0)]].
	raise := [:pname :kind |
		aBuilder send: #'___signalMissingArguments___:kind:qualifiedName:'
			to: (aBuilder globalNamed: #TypeError)
			with: { aBuilder obj: (Array with: pname). aBuilder obj: kind. aBuilder obj: '<lambda>' }].
	firstWithDefault > 1 ifTrue: [
		aBuilder if: (aBuilder send: #< to: posSize value with: { aBuilder obj: firstWithDefault - 1 } env: 0)
			then: [
				aBuilder add: (aBuilder
					send: #'___checkMissingPositional___:kwargs:names:posonly:qualifiedName:'
					to: (aBuilder globalNamed: #TypeError)
					with: {
						aBuilder var: posLeaf.
						aBuilder var: kwLeaf.
						aBuilder obj: (posNames copyFrom: 1 to: firstWithDefault - 1) asArray.
						aBuilder obj: ((args posonlyargs ifNil: [#()]) size min: firstWithDefault - 1).
						aBuilder obj: '<lambda>' })]].
	posNames doWithIndex: [:pname :i |
		| fallback gate |
		fallback := [i >= firstWithDefault
			ifTrue: [aBuilder localVar: ('___lamdef_' , pname , suffix) asSymbol]
			ifFalse: [raise value: pname value: 'positional']].
		gate := aBuilder
			ifValue: (aBuilder send: #>= to: posSize value with: { aBuilder obj: i } env: 0)
			then: [aBuilder add: (aBuilder send: #at: to: (aBuilder var: posLeaf)
				with: { aBuilder obj: i } env: 0)]
			else: [aBuilder add: (aBuilder
				ifValue: (kwGate value: pname)
				then: [aBuilder add: (aBuilder send: #at: to: (aBuilder var: kwLeaf)
					with: { aBuilder obj: pname } env: 0)]
				else: [aBuilder add: fallback value])].
		aBuilder add: (aBuilder assign: (aBuilder leafFor: pname asSymbol) from: gate)].
	args vararg ifNotNil: [:v |
		| tail |
		tail := aBuilder send: #copyFrom:to: to: (aBuilder var: posLeaf)
			with: { aBuilder obj: posNames size + 1. posSize value } env: 0.
		aBuilder add: (aBuilder
			assign: (aBuilder leafFor: v name asString asSymbol)
			from: (aBuilder send: #withAll: to: (aBuilder globalNamed: #tuple)
				with: { tail } env: 0))].
	[
		| required |
		required := OrderedCollection new.
		(args kwonlyargs ifNil: [#()]) doWithIndex: [:k :i |
			(kwDefaults at: i ifAbsent: [nil]) isNil ifTrue: [required add: k name asString]].
		required isEmpty ifFalse: [
			aBuilder add: (aBuilder
				send: #'___checkMissingKeywordOnly___:defaults:names:qualifiedName:'
				to: (aBuilder globalNamed: #TypeError)
				with: { aBuilder var: kwLeaf. aBuilder nilLit. aBuilder obj: required asArray. aBuilder obj: '<lambda>' })].
		(args kwonlyargs ifNil: [#()]) doWithIndex: [:k :i |
			| pname def |
			pname := k name asString.
			def := kwDefaults at: i ifAbsent: [nil].
			aBuilder add: (aBuilder
				assign: (aBuilder leafFor: pname asSymbol)
				from: (aBuilder
					ifValue: (kwGate value: pname)
					then: [aBuilder add: (aBuilder send: #at: to: (aBuilder var: kwLeaf)
						with: { aBuilder obj: pname } env: 0)]
					else: [aBuilder add: (def isNil
						ifTrue: [raise value: pname value: 'keyword-only']
						ifFalse: [aBuilder localVar: ('___lamdef_' , pname , suffix) asSymbol])]))]
	] value.
	args kwarg ifNotNil: [:k |
		| leaf |
		leaf := aBuilder leafFor: k name asString asSymbol.
		aBuilder add: (aBuilder assign: leaf from: (aBuilder
			ifValue: (aBuilder send: #isNil to: (aBuilder var: kwLeaf) with: { } env: 0)
			then: [aBuilder add: (aBuilder send: #new to: (aBuilder globalNamed: #PyDict) with: { } env: 0)]
			else: [aBuilder add: (aBuilder send: #copy to: (aBuilder var: kwLeaf) with: { } env: 0)])).
		((args args ifNil: [#()]) , (args kwonlyargs ifNil: [#()])) do: [:each |
			aBuilder add: (aBuilder send: #removeKey:ifAbsent: to: (aBuilder var: leaf)
				with: { aBuilder obj: each name asString. aBuilder inBlockDo: [] } env: 0)]]
%
