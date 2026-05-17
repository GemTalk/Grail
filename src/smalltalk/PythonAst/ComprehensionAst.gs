! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComprehensionAst
expectvalue /Class
doit
AbstractNode subclass: 'ComprehensionAst'
  instVarNames: #( target iter ifs
                    is_async)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ComprehensionAst comment:
'https://docs.python.org/3/library/ast.html#ast.comprehension

A single for clause in a comprehension.

target is the variable(s) the comprehension iterates over.
iter is the iterable.
ifs is a list of test expressions.
is_async is 1 if it is an async comprehension, 0 otherwise.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers if x > 0]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[
            comprehension(
                target=Name(id=''x'', ctx=Store()),
                iter=Name(id=''numbers'', ctx=Load()),
                ifs=[Compare(...)])]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ComprehensionAst(target iter ifs is_async)
'
%

expectvalue /Class
doit
ComprehensionAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ComprehensionAst
removeallmethods ComprehensionAst
removeallclassmethods ComprehensionAst
set compile_env: 0
! ------------------- Class methods for ComprehensionAst
! ------------------- Instance methods for ComprehensionAst
