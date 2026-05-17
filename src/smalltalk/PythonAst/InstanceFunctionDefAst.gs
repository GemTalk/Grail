! ------------------- Superclass check
run
FunctionDefAst ifNil: [self error: 'FunctionDefAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for InstanceFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'InstanceFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
InstanceFunctionDefAst comment:
'Grail-specific subclass of FunctionDefAst for instance methods.

This is not a standard Python AST node, but a Grail implementation detail for distinguishing instance methods from regular functions and class methods.

Inherits all fields from FunctionDefAst:
- name is the function name as a raw string
- args is an arguments node
- body is a list of nodes
- decorator_list is a list of decorator expressions
- returns is the return annotation (can be None)

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        FunctionDefAst(name args body decorator_list returns type_comment)
          InstanceFunctionDefAst
'
%

expectvalue /Class
doit
InstanceFunctionDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from InstanceFunctionDefAst
removeallmethods InstanceFunctionDefAst
removeallclassmethods InstanceFunctionDefAst
set compile_env: 0
! ------------------- Class methods for InstanceFunctionDefAst
! ------------------- Instance methods for InstanceFunctionDefAst
