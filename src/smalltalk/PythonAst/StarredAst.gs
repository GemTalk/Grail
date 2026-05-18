! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for StarredAst
expectvalue /Class
doit
ExpressionAst subclass: 'StarredAst'
  instVarNames: #( value ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
StarredAst comment:
'https://docs.python.org/3/library/ast.html#ast.Starred

A *var variable reference.

value holds the variable, typically a Name node.
ctx is Store if the variable is on the left side of an assignment, Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''a, *b = it''), indent=4))
Module(
    body=[
        Assign(
            targets=[Tuple(elts=[Name(id=''a'', ctx=Store()), Starred(value=Name(id=''b'', ctx=Store()), ctx=Store())], ctx=Store())],
            value=Name(id=''it'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        StarredAst(value ctx)
'
%

expectvalue /Class
doit
StarredAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from StarredAst
removeallmethods StarredAst
removeallclassmethods StarredAst
set compile_env: 0
! ------------------- Class methods for StarredAst
! ------------------- Instance methods for StarredAst

category: 'Grail-accessing'
method: StarredAst
value

	^value
%

category: 'Grail-accessing'
method: StarredAst
ctx

	^ctx
%

category: 'Grail-other'
method: StarredAst
printSmalltalkOn: aStream
	"GRAIL STUB: `*x` in a call site should splice x's elements
	into the argument list.  Proper handling needs CallAst to
	detect StarredAst arguments and emit a concatenation
	(`{a. b.} , x asArray , {c. d.}`) rather than the brace-array
	literal it uses today.  Until then, emit a TypeError that
	fires at runtime — that lets modules that *declare* methods
	using `*x` in call sites (blinker's send/send_async carry it
	for forwarded kwargs through the keyword-only marker path,
	even though the actual call sites use only `**kwargs`) load
	end-to-end without crashing the codegen with an abstract-node
	error."

	aStream nextPutAll: '(TypeError ___signal___: ''*-unpack in call sites is not yet supported'')'
%
