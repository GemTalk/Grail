! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExprAst
expectvalue /Class
doit
StatementAst subclass: 'ExprAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ExprAst comment:
'https://docs.python.org/3/library/ast.html#ast.Expr

An expression statement (when an expression is used as a statement).

value holds the expression node (often a Call node).

Example:
>>> print(ast.dump(ast.parse(''print(x)''), indent=4))
Module(
    body=[
        Expr(value=Call(func=Name(id=''print'', ctx=Load()), args=[Name(id=''x'', ctx=Load())]))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ExprAst(value)
'
%

expectvalue /Class
doit
ExprAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ExprAst
removeallmethods ExprAst
removeallclassmethods ExprAst

set compile_env: 0

category: 'Grail-other'
method: ExprAst
messagePrecendence

	
	^3
%

category: 'Grail-accessing'
method: ExprAst
value
	"The wrapped expression node.  Read by FunctionDefAst
	___docString___, which recognises a leading bare string literal as the
	def's docstring."

	^ value
%

category: 'Grail-other'
method: ExprAst
printSmalltalkOn: aStream

	value printSmalltalkOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-IR Codegen'
method: ExprAst
___irEligibleStatementLocals___: localNames
	"An expression statement is emittable when its value is."
	^ value ___irEligibleValueLocals___: localNames
%

category: 'Grail-IR Codegen'
method: ExprAst
___emitIRStatementOn___: aBuilder
	"Evaluate the expression for effect and discard the result."
	| v |
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder at: self beginPosition.
	aBuilder add: v.
	^ self
%
method: ExprAst
value: newValue
	value := newValue
%

category: 'Grail-IR Codegen'
method: ExprAst
___irReadLocalNamesInto___: aSet locals: localSet
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self
%
