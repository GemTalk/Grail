! ------------------- Superclass check
run
WithAst ifNil: [self error: 'WithAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncWithAst
! Inherits all fields + the standard ``printSmalltalkOn:`` codegen from
! WithAst, and overrides only WHICH HALF of the context-manager protocol it
! drives: __aenter__/__aexit__ rather than __enter__/__exit__.
!
! It used to emit a plain ``with'', which is why ``async with obj:'' on an
! object with only __aenter__/__aexit__ reported ``does not support the CONTEXT
! MANAGER protocol (missed __exit__ method)'' -- naming the wrong protocol and
! the wrong method -- and why a SYNC manager under ``async with'' succeeded
! silently instead of raising.
!
! The two calls are coroutines, so the shared emit drives them through
! ___grailAwait___: (CPython's ``await mgr.__aenter__()''); that helper passes a
! non-coroutine through unchanged, so the synchronous path is untouched.
expectvalue /Class
doit
WithAst subclass: 'AsyncWithAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncWithAst comment:
'https://docs.python.org/3/library/ast.html#ast.AsyncWith

An async with statement.

items is a list of WithItem nodes.
body is a list of nodes.
type_comment is an optional string with the type comment.

Example:
>>> print(ast.dump(ast.parse(''async with x:\\n    ...''), indent=4))
Module(
    body=[
        AsyncWith(
            items=[WithItem(context_expr=Name(id=''x'', ctx=Load()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AsyncWithAst(items body type_comment)
'
%

expectvalue /Class
doit
AsyncWithAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncWithAst
removeallmethods AsyncWithAst
removeallclassmethods AsyncWithAst
set compile_env: 0
! ------------------- Class methods for AsyncWithAst
! ------------------- Instance methods for AsyncWithAst

set compile_env: 0

category: 'Grail-Code Generation'
method: AsyncWithAst
___enterSelector___
	^ '__aenter__'
%

category: 'Grail-Code Generation'
method: AsyncWithAst
___exitSelector___
	^ '__aexit__'
%
