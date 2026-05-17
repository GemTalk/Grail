! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AnnAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AnnAssignAst'
  instVarNames: #( target annotation value
                    simple)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AnnAssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.AnnAssign

An assignment with a type annotation.

target is a single node (Name, Attribute or Subscript).
annotation is the annotation, such as a Constant or Name node.
value is a single optional node.
simple is an integer set to 1 for a Name node in target that do not appear in between parenthesis.

Example:
>>> print(ast.dump(ast.parse(''x: int = 3''), indent=4))
Module(
    body=[
        AnnAssign(
            target=Name(id=''x'', ctx=Store()),
            annotation=Name(id=''int'', ctx=Load()),
            value=Constant(value=3),
            simple=1)])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AnnAssignAst(target annotation value simple)
'
%

expectvalue /Class
doit
AnnAssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AnnAssignAst
removeallmethods AnnAssignAst
removeallclassmethods AnnAssignAst
set compile_env: 0
! ------------------- Class methods for AnnAssignAst
! ------------------- Instance methods for AnnAssignAst
