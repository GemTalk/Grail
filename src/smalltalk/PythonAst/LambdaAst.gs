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
isVariableIsDeclared: aSymbol
	"A lambda's parameter list IS its scope.  NameAst's load-context
	walk asks every ancestor whether the name is declared so it can
	choose between a local read and the module-symbol fallback.
	Without this override the lambda body falls through to the
	enclosing function's scope; ``lambda p: p[0]`` would treat ``p``
	as a free name, emit ``(self at: #'p' ifAbsent: [NameError ...])``,
	and raise NameError at call time."

	(args args anySatisfy: [:a | a name asSymbol == aSymbol asSymbol])
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
printSmalltalkOn: aStream
	"Generate Smalltalk for a lambda expression.

	`lambda x, y: x + y` compiles to:
	  [:positional :keywords |
	    | x y |
	    x := positional @env0:at: 1.
	    y := positional @env0:at: 2.
	    x __add__: y]

	`lambda self, *args, **kwargs: self(*args, **kwargs)` compiles to:
	  [:positional :keywords |
	    | _self args kwargs |
	    _self := positional @env0:at: 1.
	    args := positional @env0:copyFrom: 2 to: positional @env0:size.
	    kwargs := keywords.
	    _self _call: args kw: kwargs]

	Defaults, keyword-only args, and positional-only args are not yet
	supported; ``*args'' and ``**kwargs'' ARE supported because the
	werkzeug.local upstream uses them in proxy-forwarding lambdas.

	Reserved-name params (``self'', ``super'', ...) are transported as
	``_<name>'' — Smalltalk pseudo-variables can't be temps or
	assignment targets.  NameAst's reserved-param rename makes body
	references read the transport identifier."

	| argList transport varargName kwargName |
	argList := args args.
	transport := argList collect: [:each |
		(NameAst isReservedSmalltalkIdentifier: each name)
			ifTrue: ['_' , each name asString]
			ifFalse: [each name asString]].
	varargName := args vararg ifNotNil: [:v | v name asString].
	kwargName := args kwarg ifNotNil: [:k | k name asString].
	aStream nextPutAll: '[:positional :keywords |'.

	"Declare locals for all parameter names (positional + *args + **kwargs)"
	(transport isEmpty and: [varargName isNil and: [kwargName isNil]])
		ifFalse: [
			aStream nextPutAll: ' | '.
			transport do: [:n | aStream nextPutAll: n; space].
			varargName ifNotNil: [aStream nextPutAll: varargName; space].
			kwargName ifNotNil: [aStream nextPutAll: kwargName; space].
			aStream nextPut: $|.
		].
	aStream lf.

	"Unpack positional args into locals"
	transport doWithIndex: [:n :i |
		aStream
			nextPutAll: n;
			nextPutAll: ' := positional @env0:at: ';
			nextPutAll: i printString;
			nextPut: $.;
			lf.
	].

	"Bind *args to the remaining positional tail (empty Array if none)."
	varargName ifNotNil: [
		aStream
			nextPutAll: varargName;
			nextPutAll: ' := positional @env0:size @env0:> ';
			nextPutAll: transport size printString;
			nextPutAll: ' ifTrue: [positional @env0:copyFrom: ';
			nextPutAll: (transport size + 1) printString;
			nextPutAll: ' to: positional @env0:size] ifFalse: [Array @env0:new].';
			lf.
	].

	"Bind **kwargs — empty dict if no kwargs."
	kwargName ifNotNil: [
		aStream
			nextPutAll: kwargName;
			nextPutAll: ' := keywords @env0:isNil ifTrue: [PyDict @env0:new] ifFalse: [keywords].';
			lf.
	].

	"Emit the body expression (single expression, not a statement list)"
	body printSmalltalkOn: aStream.

	aStream nextPut: $].
%
