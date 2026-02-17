! ------------------- Superclass check
run
FunctionDefAst ifNil: [self error: 'FunctionDefAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'ClassFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ClassFunctionDefAst comment:
'Grail-specific subclass of FunctionDefAst for class methods.

This is not a standard Python AST node, but a Grail implementation detail for distinguishing class methods (decorated with @classmethod) from regular functions and instance methods.

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
          ClassFunctionDefAst
'
%

expectvalue /Class
doit
ClassFunctionDefAst category: 'Parser'
%

! ------------------- Remove existing behavior from ClassFunctionDefAst
removeallmethods ClassFunctionDefAst
removeallclassmethods ClassFunctionDefAst
set compile_env: 0
! ------------------- Class methods for ClassFunctionDefAst
! ------------------- Instance methods for ClassFunctionDefAst
