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
LambdaAst category: 'Parser'
%

! ------------------- Remove existing behavior from LambdaAst
removeallmethods LambdaAst
removeallclassmethods LambdaAst

set compile_env: 0

category: 'other'
method: LambdaAst
name

	^'<lambda>'
%

category: 'other'
method: LambdaAst
printSmalltalkOn: aStream
	"Generate Smalltalk for a lambda expression.

	`lambda x, y: x + y` compiles to:
	  [:positional :keywords |
	    | x y |
	    x := positional ___at___: 1.
	    y := positional ___at___: 2.
	    x __add__: y]

	Only simple positional args are handled; *args, **kwargs, defaults,
	keyword-only args, and positional-only args are not yet supported."

	| argList |
	argList := args args.
	aStream nextPutAll: '[:positional :keywords |'.

	"Declare locals for all parameter names"
	argList isEmpty ifFalse: [
		aStream nextPutAll: ' | '.
		argList do: [:each | aStream nextPutAll: each name; space].
		aStream nextPut: $|.
	].
	aStream lf.

	"Unpack positional args into locals"
	argList doWithIndex: [:each :i |
		aStream
			nextPutAll: each name;
			nextPutAll: ' := positional ___at___: ';
			nextPutAll: i printString;
			nextPut: $.;
			lf.
	].

	"Emit the body expression (single expression, not a statement list)"
	body printSmalltalkOn: aStream.

	aStream nextPut: $].
%
