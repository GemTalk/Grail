! ===============================================================================
! AST Node Class Definitions and Method Imports
! ===============================================================================
! This file defines all AST node classes used by the Grail Python parser
! and then imports their method implementations.
! ===============================================================================

! ------------------- Class definition for AbstractNode
expectvalue /Class
doit
Object subclass: 'AbstractNode'
  instVarNames: #( parent)
  classVars: #( escapeCharacters)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AbstractNode comment:
'https://docs.python.org/3/library/ast.html#ast.AST

This is the base of all AST node classes. The actual node classes are
derived from the Parser/Python.asdl file. They are defined in the _ast C
module and re-exported in ast.

There is one class defined for each left-hand side symbol in the abstract
grammar (for example, ast.stmt or ast.expr). In addition, there is one class
defined for each constructor on the right-hand side; these classes inherit
from the classes for the left-hand side trees.

Hierarchy:
Object
  AbstractNode
'
%
expectvalue /Class
doit
AbstractNode category: 'Parser'
%
! ------------------- Class definition for AbstractLocationNode
expectvalue /Class
doit
AbstractNode subclass: 'AbstractLocationNode'
  instVarNames: #( beginLine beginColumn endLine
                    endColumn)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AbstractLocationNode comment:
'https://docs.python.org/3/library/ast.html#ast.AST

Base class for AST nodes that include location information.

Instances of ast.expr and ast.stmt subclasses have lineno, col_offset,
end_lineno, and end_col_offset attributes. The lineno and end_lineno are
the first and last line numbers of source text span (1-indexed so the first
line is line 1) and the col_offset and end_col_offset are the corresponding
UTF-8 byte offsets of the first and last tokens that generated the node.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
'
%
expectvalue /Class
doit
AbstractLocationNode category: 'Parser'
%
! ------------------- Class definition for AliasAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'AliasAst'
  instVarNames: #( name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AliasAst comment:
'https://docs.python.org/3/library/ast.html#ast.alias

Import name with optional ''as'' alias.

name is the identifier being imported.
asname is the optional alias (the name after ''as'').

Used in Import and ImportFrom statements.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      AliasAst(name asName)
'
%
expectvalue /Class
doit
AliasAst category: 'Parser'
%
! ------------------- Class definition for ArgAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ArgAst'
  instVarNames: #( arg annotation type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ArgAst comment:
'https://docs.python.org/3/library/ast.html#ast.arg

A single argument in a function argument list.

arg is a raw string of the argument name.
annotation is its annotation, such as a Name node.
type_comment is an optional string with the type annotation as a comment.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ArgAst(arg annotation type_comment)
'
%
expectvalue /Class
doit
ArgAst category: 'Parser'
%
! ------------------- Class definition for ExceptHandlerAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExceptHandlerAst'
  instVarNames: #( type name body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ExceptHandlerAst comment:
'https://docs.python.org/3/library/ast.html#ast.ExceptHandler

An exception handler in a try statement.

type is the exception type to catch (can be None for bare except).
name is the optional identifier to bind the exception to.
body is a list of statements in the exception handler.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExceptHandlerAst(type name body)
'
%
expectvalue /Class
doit
ExceptHandlerAst category: 'Parser'
%
! ------------------- Class definition for ExpressionAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExpressionAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ExpressionAst comment:
'https://docs.python.org/3/library/ast.html#ast.expr

Base class for all expression nodes in the AST.

Expressions are nodes that can be evaluated to produce a value.
All expression nodes inherit from this class.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
'
%
expectvalue /Class
doit
ExpressionAst category: 'Parser'
%
! ------------------- Class definition for AttributeAst
expectvalue /Class
doit
ExpressionAst subclass: 'AttributeAst'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AttributeAst comment:
'https://docs.python.org/3/library/ast.html#ast.Attribute

Attribute access, e.g. d.keys.

value is a node, typically a Name.
attr is a bare string giving the name of the attribute.
ctx is Load, Store or Del according to how the attribute is acted on.

Example:
>>> print(ast.dump(ast.parse(''snake.colour'', mode=''eval''), indent=4))
Expression(
    body=Attribute(
        value=Name(id=''snake'', ctx=Load()),
        attr=''colour'',
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AttributeAst(value attr ctx)
'
%
expectvalue /Class
doit
AttributeAst category: 'Parser'
%
! ------------------- Class definition for AwaitAst
expectvalue /Class
doit
ExpressionAst subclass: 'AwaitAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AwaitAst comment:
'https://docs.python.org/3/library/ast.html#ast.Await

An await expression.

value is what it waits for.
Only valid in the body of an AsyncFunctionDef.

Example:
>>> print(ast.dump(ast.parse("""
... async def f():
...     await other_func()
... """), indent=4))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AwaitAst(value)
'
%
expectvalue /Class
doit
AwaitAst category: 'Parser'
%
! ------------------- Class definition for BinOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BinOpAst'
  instVarNames: #( left op right)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BinOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BinOp

A binary operation (like addition or division).

op is the operator.
left and right are any expression nodes.

Example:
>>> print(ast.dump(ast.parse(''x + y'', mode=''eval''), indent=4))
Expression(
    body=BinOp(
        left=Name(id=''x'', ctx=Load()),
        op=Add(),
        right=Name(id=''y'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BinOpAst(left op right)
'
%
expectvalue /Class
doit
BinOpAst category: 'Parser'
%
! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BoolOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BoolOp

A boolean operation, ''or'' or ''and''.

op is Or or And.
values are the values involved. Consecutive operations with the same
operator, such as a or b or c, are collapsed into one node with several values.

This doesn''t include not, which is a UnaryOp.

Example:
>>> print(ast.dump(ast.parse(''x or y'', mode=''eval''), indent=4))
Expression(
    body=BoolOp(
        op=Or(),
        values=[
            Name(id=''x'', ctx=Load()),
            Name(id=''y'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
'
%
expectvalue /Class
doit
BoolOpAst category: 'Parser'
%
! ------------------- Class definition for AndAst
expectvalue /Class
doit
BoolOpAst subclass: 'AndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AndAst comment:
'https://docs.python.org/3/library/ast.html#ast.And

Boolean operator token for ''and''.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          AndAst
'
%
expectvalue /Class
doit
AndAst category: 'Parser'
%
! ------------------- Class definition for OrAst
expectvalue /Class
doit
BoolOpAst subclass: 'OrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
OrAst comment:
'https://docs.python.org/3/library/ast.html#ast.Or

Boolean operator token for ''or''.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          OrAst
'
%
expectvalue /Class
doit
OrAst category: 'Parser'
%
! ------------------- Class definition for CallAst
expectvalue /Class
doit
ExpressionAst subclass: 'CallAst'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
CallAst comment:
'https://docs.python.org/3/library/ast.html#ast.Call

A function call.

func is the function, which will often be a Name or Attribute object.
args holds a list of the arguments passed by position.
keywords holds a list of keyword objects representing arguments passed by keyword.

Example:
>>> print(ast.dump(ast.parse(''func(a, b=c, *d, **e)'', mode=''eval''), indent=4))
Expression(
    body=Call(
        func=Name(id=''func'', ctx=Load()),
        args=[Name(id=''a'', ctx=Load()), Starred(...)],
        keywords=[keyword(arg=''b'', value=Name(id=''c'', ctx=Load())), ...]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CallAst(func args keywords)
'
%
expectvalue /Class
doit
CallAst category: 'Parser'
%
! ------------------- Class definition for CompareAst
expectvalue /Class
doit
ExpressionAst subclass: 'CompareAst'
  instVarNames: #( left cmpopList comparatorList)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
CompareAst comment:
'https://docs.python.org/3/library/ast.html#ast.Compare

A comparison of two or more values.

left is the first value in the comparison.
ops is the list of operators.
comparators is the list of values after the first element in the comparison.

Example:
>>> print(ast.dump(ast.parse(''1 <= a < 10'', mode=''eval''), indent=4))
Expression(
    body=Compare(
        left=Constant(value=1),
        ops=[LtE(), Lt()],
        comparators=[Name(id=''a'', ctx=Load()), Constant(value=10)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CompareAst(left ops comparators)
'
%
expectvalue /Class
doit
CompareAst category: 'Parser'
%
! ------------------- Class definition for ConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'ConstantAst'
  instVarNames: #( value kind)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ConstantAst comment: 
'Constant(constant value, string? kind)

A constant value. The value attribute of the Constant literal contains the Python object it represents.
The values represented can be simple types such as a number, string or None, but also immutable
container types (tuples and frozensets) if all of their elements are constant."'
%
expectvalue /Class
doit
ConstantAst category: 'Parser'
%
! ------------------- Class definition for DictAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictAst'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
DictAst comment:
'https://docs.python.org/3/library/ast.html#ast.Dict

A dictionary.

keys and values hold lists of nodes representing the keys and the values respectively,
in matching order (what would be returned when calling dictionary.keys() and dictionary.values()).

When doing dictionary unpacking using dictionary literals the expression to be expanded
goes in the values list, with a None at the corresponding position in keys.

Example:
>>> print(ast.dump(ast.parse(''{"a":1, **d}'', mode=''eval''), indent=4))
Expression(
    body=Dict(
        keys=[Constant(value=''a''), None],
        values=[Constant(value=1), Name(id=''d'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictAst(keys values)
'
%
expectvalue /Class
doit
DictAst category: 'Parser'
%
! ------------------- Class definition for DictCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictCompAst'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
DictCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.DictComp

A dictionary comprehension.

key and value are single nodes representing the parts that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x: x**2 for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=DictComp(
        key=Name(id=''x'', ctx=Load()),
        value=BinOp(left=Name(id=''x'', ctx=Load()), op=Pow(), right=Constant(value=2)),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictCompAst(key value generators)
'
%
expectvalue /Class
doit
DictCompAst category: 'Parser'
%
! ------------------- Class definition for FormattedValueAst
expectvalue /Class
doit
ExpressionAst subclass: 'FormattedValueAst'
  instVarNames: #( value conversion format_spec)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
FormattedValueAst comment:
'https://docs.python.org/3/library/ast.html#ast.FormattedValue

Node representing a single formatting field in an f-string.

value is any expression node (such as a literal, a variable, or a function call).
conversion is an integer:
  -1: no formatting
  97 (ord(''a'')): !a ASCII formatting
  114 (ord(''r'')): !r repr() formatting
  115 (ord(''s'')): !s string formatting
format_spec is a JoinedStr node representing the formatting of the value, or None if no format was specified.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        FormattedValueAst(value conversion format_spec)
'
%
expectvalue /Class
doit
FormattedValueAst category: 'Parser'
%
! ------------------- Class definition for GeneratorExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'GeneratorExpAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
GeneratorExpAst comment:
'https://docs.python.org/3/library/ast.html#ast.GeneratorExp

A generator expression.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''(x for x in numbers)'', mode=''eval''), indent=4))
Expression(
    body=GeneratorExp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        GeneratorExpAst(elt generators)
'
%
expectvalue /Class
doit
GeneratorExpAst category: 'Parser'
%
! ------------------- Class definition for IfExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'IfExpAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
IfExpAst comment:
'https://docs.python.org/3/library/ast.html#ast.IfExp

An expression such as a if b else c.

test is the condition.
body is the value if the condition is true.
orelse is the value if the condition is false.

Example:
>>> print(ast.dump(ast.parse(''a if b else c'', mode=''eval''), indent=4))
Expression(
    body=IfExp(
        test=Name(id=''b'', ctx=Load()),
        body=Name(id=''a'', ctx=Load()),
        orelse=Name(id=''c'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        IfExpAst(test body orelse)
'
%
expectvalue /Class
doit
IfExpAst category: 'Parser'
%
! ------------------- Class definition for JoinedStrAst
expectvalue /Class
doit
ExpressionAst subclass: 'JoinedStrAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
JoinedStrAst comment:
'https://docs.python.org/3/library/ast.html#ast.JoinedStr

An f-string, comprising a series of FormattedValue and Constant nodes.

values is a list of nodes that make up the f-string.

Example:
>>> print(ast.dump(ast.parse(''f"sin({a}) is {sin(a):.3}"'', mode=''eval''), indent=4))
Expression(
    body=JoinedStr(
        values=[
            Constant(value=''sin(''),
            FormattedValue(value=Name(id=''a'', ctx=Load()), conversion=-1),
            Constant(value='') is ''),
            FormattedValue(value=Call(...), conversion=-1, format_spec=...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        JoinedStrAst(values)
'
%
expectvalue /Class
doit
JoinedStrAst category: 'Parser'
%
! ------------------- Class definition for LambdaAst
expectvalue /Class
doit
ExpressionAst subclass: 'LambdaAst'
  instVarNames: #( args body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
! ------------------- Class definition for ListAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ListAst comment:
'https://docs.python.org/3/library/ast.html#ast.List

A list.

elts holds a list of nodes representing the elements.
ctx is Store if the container is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''[1, 2, 3]'', mode=''eval''), indent=4))
Expression(
    body=List(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)],
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListAst(elts ctx)
'
%
expectvalue /Class
doit
ListAst category: 'Parser'
%
! ------------------- Class definition for ListCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ListCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.ListComp

A list comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListCompAst(elt generators)
'
%
expectvalue /Class
doit
ListCompAst category: 'Parser'
%
! ------------------- Class definition for NameAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameAst'
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NameAst comment: 
'Names refer to objects. Names are introduced by name binding operations.

The following constructs bind names: formal parameters to functions, import statements, class and function definitions (these bind the class or function name in the defining block), and targets that are identifiers if occurring in an assignment, for loop header, or after as in a with statement or except clause. The import statement of the form from ... import * binds all names defined in the imported module, except those beginning with an underscore. This form may only be used at the module level.

A target occurring in a del statement is also considered bound for this purpose (though the actual semantics are to unbind the name).

Each assignment or import statement occurs within a block defined by a class or function definition or at the module level (the top-level code block).

If a name is bound in a block, it is a local variable of that block, unless declared as nonlocal or global. If a name is bound at the module level, it is a global variable. (The variables of the module code block are local and global.) If a variable is used in a code block but not defined there, it is a free variable.

Each occurrence of a name in the program text refers to the binding of that name established by certain name resolution rules.




https://docs.python.org/3/reference/executionmodel.html#naming-and-binding'
%
expectvalue /Class
doit
NameAst category: 'Parser'
%
! ------------------- Class definition for KeywordsAst
expectvalue /Class
doit
NameAst subclass: 'KeywordsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
KeywordsAst comment:
'Grail-specific helper class for managing keyword arguments.

This is not a standard Python AST node, but a Grail implementation detail for managing collections of keyword arguments in function calls.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        NameAst(assoc id ctx)
          KeywordsAst
'
%
expectvalue /Class
doit
KeywordsAst category: 'Parser'
%
! ------------------- Class definition for NamedExprAst
expectvalue /Class
doit
ExpressionAst subclass: 'NamedExprAst'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NamedExprAst category: 'Parser'
%
! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SetAst comment:
'https://docs.python.org/3/library/ast.html#ast.Set

A set.

elts holds a list of nodes representing the set''s elements.

Example:
>>> print(ast.dump(ast.parse(''{1, 2, 3}'', mode=''eval''), indent=4))
Expression(
    body=Set(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetAst(elts)
'
%
expectvalue /Class
doit
SetAst category: 'Parser'
%
! ------------------- Class definition for SetCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SetCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.SetComp

A set comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=SetComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetCompAst(elt generators)
'
%
expectvalue /Class
doit
SetCompAst category: 'Parser'
%
! ------------------- Class definition for StarredAst
expectvalue /Class
doit
ExpressionAst subclass: 'StarredAst'
  instVarNames: #( value ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
StarredAst category: 'Parser'
%
! ------------------- Class definition for SubscriptAst
expectvalue /Class
doit
ExpressionAst subclass: 'SubscriptAst'
  instVarNames: #( value slice ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SubscriptAst comment:
'https://docs.python.org/3/library/ast.html#ast.Subscript

A subscript, such as l[1].

value is the subscripted object (usually sequence or mapping).
slice is an index, slice or key. It can be a Tuple and contain a Slice.
ctx is Load for subscript lookup, Store for subscript assignment, Del for subscript deletion.

Example:
>>> print(ast.dump(ast.parse(''l[1:2, 3]'', mode=''eval''), indent=4))
Expression(
    body=Subscript(
        value=Name(id=''l'', ctx=Load()),
        slice=Tuple(elts=[Slice(lower=Constant(value=1), upper=Constant(value=2)), Constant(value=3)], ctx=Load()),
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SubscriptAst(value slice ctx)'
%
expectvalue /Class
doit
SubscriptAst category: 'Parser'
%
! ------------------- Class definition for TupleAst
expectvalue /Class
doit
ExpressionAst subclass: 'TupleAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
TupleAst comment:
'https://docs.python.org/3/library/ast.html#ast.Tuple

A tuple.

elts holds a list of nodes representing the elements.
ctx is Store if the tuple is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''(1, 2, 3)'', mode=''eval''), indent=4))
Expression(
    body=Tuple(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)],
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        TupleAst(elts ctx)
'
%
expectvalue /Class
doit
TupleAst category: 'Parser'
%
! ------------------- Class definition for UnaryOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'UnaryOpAst'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
UnaryOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.UnaryOp

A unary operation.

op is the operator (UAdd, USub, Not, or Invert).
operand is the operand.

Example:
>>> print(ast.dump(ast.parse(''-1'', mode=''eval''), indent=4))
Expression(
    body=UnaryOp(
        op=USub(),
        operand=Constant(value=1)))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        UnaryOpAst(op operand)
'
%
expectvalue /Class
doit
UnaryOpAst category: 'Parser'
%
! ------------------- Class definition for InvertAst
expectvalue /Class
doit
UnaryOpAst subclass: 'InvertAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
InvertAst comment:
'https://docs.python.org/3/library/ast.html#ast.Invert

Unary operator token for bitwise inversion (~).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        InvertAst
'
%
expectvalue /Class
doit
InvertAst category: 'Parser'
%
! ------------------- Class definition for NotAst
expectvalue /Class
doit
UnaryOpAst subclass: 'NotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NotAst comment:
'https://docs.python.org/3/library/ast.html#ast.Not

Unary operator token for logical negation (not).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        NotAst
'
%
expectvalue /Class
doit
NotAst category: 'Parser'
%
! ------------------- Class definition for UAddAst
expectvalue /Class
doit
UnaryOpAst subclass: 'UAddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
UAddAst comment:
'https://docs.python.org/3/library/ast.html#ast.UAdd

Unary operator token for unary positive (+).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        UAddAst
'
%
expectvalue /Class
doit
UAddAst category: 'Parser'
%
! ------------------- Class definition for USubAst
expectvalue /Class
doit
UnaryOpAst subclass: 'USubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
USubAst comment:
'https://docs.python.org/3/library/ast.html#ast.USub

Unary operator token for unary negation (-).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        USubAst
'
%
expectvalue /Class
doit
USubAst category: 'Parser'
%
! ------------------- Class definition for YieldAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
YieldAst comment:
'https://docs.python.org/3/library/ast.html#ast.Yield

A yield expression.

value is what is yielded (can be None).

Example:
>>> print(ast.dump(ast.parse(''yield x'', mode=''eval''), indent=4))
Expression(
    body=Yield(value=Name(id=''x'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        YieldAst(value)
'
%
expectvalue /Class
doit
YieldAst category: 'Parser'
%
! ------------------- Class definition for YieldFromAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldFromAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
YieldFromAst comment:
'https://docs.python.org/3/library/ast.html#ast.YieldFrom

A yield from expression.

value is what is yielded from.

Example:
>>> print(ast.dump(ast.parse(''yield from x'', mode=''eval''), indent=4))
Expression(
    body=YieldFrom(value=Name(id=''x'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        YieldFromAst(value)
'
%
expectvalue /Class
doit
YieldFromAst category: 'Parser'
%
! ------------------- Class definition for KeywordAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'KeywordAst'
  instVarNames: #( arg value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
KeywordAst comment:
'https://docs.python.org/3/library/ast.html#ast.keyword

A keyword argument to a function call or class definition.

arg is a raw string of the parameter name (can be None for **kwargs).
value is the expression passed for the argument.

Example:
>>> print(ast.dump(ast.parse(''func(a=1, **kwargs)'', mode=''eval''), indent=4))
Expression(
    body=Call(
        func=Name(id=''func'', ctx=Load()),
        args=[],
        keywords=[
            keyword(arg=''a'', value=Constant(value=1)),
            keyword(arg=None, value=Name(id=''kwargs'', ctx=Load()))]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      KeywordAst(arg value)
'
%
expectvalue /Class
doit
KeywordAst category: 'Parser'
%
! ------------------- Class definition for SliceAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'SliceAst'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SliceAst comment:
'https://docs.python.org/3/library/ast.html#ast.Slice

Regular slicing (on the form lower:upper or lower:upper:step).

Can occur only inside the slice field of Subscript, either directly or as an element of Tuple.

lower is the lower bound (None if omitted).
upper is the upper bound (None if omitted).
step is the step value (None if omitted).

Example:
>>> print(ast.dump(ast.parse(''a[1:2]'', mode=''eval''), indent=4))
Expression(
    body=Subscript(
        value=Name(id=''a'', ctx=Load()),
        slice=Slice(lower=Constant(value=1), upper=Constant(value=2)),
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      SliceAbstractAst
        SliceAst(lower upper step)
'
%
expectvalue /Class
doit
SliceAst category: 'Parser'
%
! ------------------- Class definition for StatementAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'StatementAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
StatementAst comment:
'https://docs.python.org/3/library/ast.html#ast.stmt

Statement base class.

This is an abstract base class for all statement nodes in the Python AST. Statements are nodes that can appear in the body of a module, function, class, or control structure.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
'
%
expectvalue /Class
doit
StatementAst category: 'Parser'
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
  inDictionary: PythonAST
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
AnnAssignAst category: 'Parser'
%
! ------------------- Class definition for AssertAst
expectvalue /Class
doit
StatementAst subclass: 'AssertAst'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AssertAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assert

An assertion.

test holds the condition, such as a Compare node.
msg holds the failure message (can be None).

Example:
>>> print(ast.dump(ast.parse(''assert x, "error"''), indent=4))
Module(
    body=[
        Assert(
            test=Name(id=''x'', ctx=Load()),
            msg=Constant(value=''error''))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssertAst(test msg)
'
%
expectvalue /Class
doit
AssertAst category: 'Parser'
%
! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assign

An assignment.

targets is a list of nodes (Name, Tuple, List, Attribute, or Subscript).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x = y = z = 1''), indent=4))
Module(
    body=[
        Assign(
            targets=[Name(id=''x'', ctx=Store()), Name(id=''y'', ctx=Store()), Name(id=''z'', ctx=Store())],
            value=Constant(value=1))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssignAst(targets value type_comment)'
%
expectvalue /Class
doit
AssignAst category: 'Parser'
%
! ------------------- Class definition for AsyncForAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AsyncForAst comment: 
'AsyncFor(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)'
%
expectvalue /Class
doit
AsyncForAst category: 'Parser'
%
! ------------------- Class definition for AsyncFunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncFunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AsyncFunctionDefAst comment: 
'AsyncFunctionDef(identifier name, arguments args,
                             stmt* body, expr* decorator_list, expr? returns,
                             string? type_comment)'
%
expectvalue /Class
doit
AsyncFunctionDefAst category: 'Parser'
%
! ------------------- Class definition for AsyncWithAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncWithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
AsyncWithAst category: 'Parser'
%
! ------------------- Class definition for AugAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AugAssignAst'
  instVarNames: #( target op value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AugAssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.AugAssign

Augmented assignment, such as a += 1.

target is a single node (Name, Attribute, or Subscript).
op is the operator (Add, Sub, Mult, MatMult, Div, Mod, Pow, LShift, RShift, BitOr, BitXor, BitAnd, FloorDiv).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x += 2''), indent=4))
Module(
    body=[
        AugAssign(
            target=Name(id=''x'', ctx=Store()),
            op=Add(),
            value=Constant(value=2))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AugAssignAst(target op value)
'
%
expectvalue /Class
doit
AugAssignAst category: 'Parser'
%
! ------------------- Class definition for BreakAst
expectvalue /Class
doit
StatementAst subclass: 'BreakAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BreakAst comment:
'https://docs.python.org/3/library/ast.html#ast.Break

A break statement.

Example:
>>> print(ast.dump(ast.parse(''break''), indent=4))
Module(
    body=[Break()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        BreakAst
'
%
expectvalue /Class
doit
BreakAst category: 'Parser'
%
! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( name bases keywords
                    body decorator_list type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ClassDefAst comment: 
'ClassDef(identifier name,
		 expr* bases,
		 keyword* keywords,
		 stmt* body,
		 expr* decorator_list,
		 type_param* type_params)'
%
expectvalue /Class
doit
ClassDefAst category: 'Parser'
%
! ------------------- Class definition for ContinueAst
expectvalue /Class
doit
StatementAst subclass: 'ContinueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ContinueAst comment:
'https://docs.python.org/3/library/ast.html#ast.Continue

A continue statement.

Example:
>>> print(ast.dump(ast.parse(''continue''), indent=4))
Module(
    body=[Continue()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ContinueAst
'
%
expectvalue /Class
doit
ContinueAst category: 'Parser'
%
! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
DeleteAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deletion (del statement).

Used as the ctx field in Name, Attribute, and Subscript nodes when they appear in a del statement.

Example:
>>> print(ast.dump(ast.parse(''del x''), indent=4))
Module(
    body=[
        Delete(
            targets=[Name(id=''x'', ctx=Del())])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DeleteAst
'
%
expectvalue /Class
doit
DeleteAst category: 'Parser'
%
! ------------------- Class definition for ExprAst
expectvalue /Class
doit
StatementAst subclass: 'ExprAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
ExprAst category: 'Parser'
%
! ------------------- Class definition for ForAst
expectvalue /Class
doit
StatementAst subclass: 'ForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ForAst comment: 
'For(expr target, expr iter, stmt* body, stmt* orelse) 									// 3.7
For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)	// 3.8'
%
expectvalue /Class
doit
ForAst category: 'Parser'
%
! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
FunctionDefAst comment: 
'FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment)'
%
expectvalue /Class
doit
FunctionDefAst category: 'Parser'
%
! ------------------- Class definition for ClassFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'ClassFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
! ------------------- Class definition for InstanceFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'InstanceFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
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
InstanceFunctionDefAst category: 'Parser'
%
! ------------------- Class definition for StaticFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'StaticFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
StaticFunctionDefAst category: 'Parser'
%
! ------------------- Class definition for GlobalAst
expectvalue /Class
doit
StatementAst subclass: 'GlobalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
GlobalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Global

A global statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''global x, y''), indent=4))
Module(
    body=[
        Global(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        GlobalAst(names)
'
%
expectvalue /Class
doit
GlobalAst category: 'Parser'
%
! ------------------- Class definition for IfAst
expectvalue /Class
doit
StatementAst subclass: 'IfAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
IfAst comment:
'https://docs.python.org/3/library/ast.html#ast.If

An if statement.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''if x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        If(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        IfAst(test body orelse)
'
%
expectvalue /Class
doit
IfAst category: 'Parser'
%
! ------------------- Class definition for ImportAst
expectvalue /Class
doit
StatementAst subclass: 'ImportAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ImportAst comment:
'https://docs.python.org/3/library/ast.html#ast.Import

An import statement.

names is a list of alias nodes.

Example:
>>> print(ast.dump(ast.parse(''import x''), indent=4))
Module(
    body=[
        Import(
            names=[alias(name=''x'')])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ImportAst(names)
'
%
expectvalue /Class
doit
ImportAst category: 'Parser'
%
! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ImportFromAst comment:
'https://docs.python.org/3/library/ast.html#ast.ImportFrom

A from x import y statement.

module is a raw string of the ''from'' name, without any leading dots, or None for statements such as from . import foo.
names is a list of alias nodes.
level is an integer holding the level of the relative import (0 means absolute import).

Example:
>>> print(ast.dump(ast.parse(''from y import x, w as z''), indent=4))
Module(
    body=[
        ImportFrom(
            module=''y'',
            names=[alias(name=''x''), alias(name=''w'', asname=''z'')],
            level=0)])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ImportFromAst(module names level)
'
%
expectvalue /Class
doit
ImportFromAst category: 'Parser'
%
! ------------------- Class definition for NonlocalAst
expectvalue /Class
doit
StatementAst subclass: 'NonlocalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NonlocalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Nonlocal

A nonlocal statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''nonlocal x, y''), indent=4))
Module(
    body=[
        Nonlocal(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        NonlocalAst(names)
'
%
expectvalue /Class
doit
NonlocalAst category: 'Parser'
%
! ------------------- Class definition for PassAst
expectvalue /Class
doit
StatementAst subclass: 'PassAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
PassAst comment:
'https://docs.python.org/3/library/ast.html#ast.Pass

A pass statement.

Example:
>>> print(ast.dump(ast.parse(''pass''), indent=4))
Module(
    body=[Pass()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        PassAst
'
%
expectvalue /Class
doit
PassAst category: 'Parser'
%
! ------------------- Class definition for RaiseAst
expectvalue /Class
doit
StatementAst subclass: 'RaiseAst'
  instVarNames: #( exc cause)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
RaiseAst comment:
'https://docs.python.org/3/library/ast.html#ast.Raise

A raise statement.

exc is the exception object to be raised (can be None for a standalone raise).
cause is the optional part for y in raise x from y (can be None).

Example:
>>> print(ast.dump(ast.parse(''raise x from y''), indent=4))
Module(
    body=[
        Raise(
            exc=Name(id=''x'', ctx=Load()),
            cause=Name(id=''y'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        RaiseAst(exc cause)
'
%
expectvalue /Class
doit
RaiseAst category: 'Parser'
%
! ------------------- Class definition for ReturnAst
expectvalue /Class
doit
StatementAst subclass: 'ReturnAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ReturnAst comment:
'https://docs.python.org/3/library/ast.html#ast.Return

A return statement.

value is what is returned (can be None).

Example:
>>> print(ast.dump(ast.parse(''return x''), indent=4))
Module(
    body=[
        Return(value=Name(id=''x'', ctx=Load()))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ReturnAst(value)
'
%
expectvalue /Class
doit
ReturnAst category: 'Parser'
%
! ------------------- Class definition for TryAst
expectvalue /Class
doit
StatementAst subclass: 'TryAst'
  instVarNames: #( body handlers orelse
                    finalbody)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
TryAst comment:
'https://docs.python.org/3/library/ast.html#ast.Try

A try statement.

body is a list of nodes.
handlers is a list of ExceptHandler nodes.
orelse is a list of nodes for the else clause.
finalbody is a list of nodes for the finally clause.

Example:
>>> print(ast.dump(ast.parse(''try:\\n    ...\\nexcept Exception:\\n    ...\\nelse:\\n    ...\\nfinally:\\n    ...''), indent=4))
Module(
    body=[
        Try(
            body=[Expr(value=Constant(value=Ellipsis))],
            handlers=[ExceptHandler(type=Name(id=''Exception'', ctx=Load()), body=[...])],
            orelse=[...],
            finalbody=[...])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        TryAst(body handlers orelse finalbody)
'
%
expectvalue /Class
doit
TryAst category: 'Parser'
%
! ------------------- Class definition for WhileAst
expectvalue /Class
doit
StatementAst subclass: 'WhileAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
WhileAst comment:
'https://docs.python.org/3/library/ast.html#ast.While

A while loop.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''while x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        While(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        WhileAst(test body orelse)
'
%
expectvalue /Class
doit
WhileAst category: 'Parser'
%
! ------------------- Class definition for WithAst
expectvalue /Class
doit
StatementAst subclass: 'WithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
WithAst comment: 
'AsyncWith(withitem* items, stmt* body, string? type_comment)'
%
expectvalue /Class
doit
WithAst category: 'Parser'
%
! ------------------- Class definition for ArgumentsAst
expectvalue /Class
doit
AbstractNode subclass: 'ArgumentsAst'
  instVarNames: #( posonlyargs args vararg
                    kwonlyargs kw_defaults kwarg defaults)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ArgumentsAst comment: 
'arguments = (arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
                 expr* kw_defaults, arg? kwarg, expr* defaults)'
%
expectvalue /Class
doit
ArgumentsAst category: 'Parser'
%
! ------------------- Class definition for CmpOpAst
expectvalue /Class
doit
AbstractNode subclass: 'CmpOpAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
CmpOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.cmpop

Comparison operator base class.

This is an abstract base class for all comparison operator tokens (Eq, NotEq, Lt, LtE, Gt, GtE, Is, IsNot, In, NotIn).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
'
%
expectvalue /Class
doit
CmpOpAst category: 'Parser'
%
! ------------------- Class definition for EqAst
expectvalue /Class
doit
CmpOpAst subclass: 'EqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
EqAst comment:
'https://docs.python.org/3/library/ast.html#ast.Eq

Comparison operator token for equality (==).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        EqAst
'
%
expectvalue /Class
doit
EqAst category: 'Parser'
%
! ------------------- Class definition for GtAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
GtAst comment:
'https://docs.python.org/3/library/ast.html#ast.Gt

Comparison operator token for greater than (>).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtAst
'
%
expectvalue /Class
doit
GtAst category: 'Parser'
%
! ------------------- Class definition for GtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
GtEAst comment:
'https://docs.python.org/3/library/ast.html#ast.GtE

Comparison operator token for greater than or equal (>=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtEAst
'
%
expectvalue /Class
doit
GtEAst category: 'Parser'
%
! ------------------- Class definition for InAst
expectvalue /Class
doit
CmpOpAst subclass: 'InAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
InAst comment:
'https://docs.python.org/3/library/ast.html#ast.In

Comparison operator token for membership test (in).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        InAst
'
%
expectvalue /Class
doit
InAst category: 'Parser'
%
! ------------------- Class definition for IsAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
IsAst comment:
'https://docs.python.org/3/library/ast.html#ast.Is

Comparison operator token for identity test (is).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsAst
'
%
expectvalue /Class
doit
IsAst category: 'Parser'
%
! ------------------- Class definition for IsNotAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsNotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
IsNotAst comment:
'https://docs.python.org/3/library/ast.html#ast.IsNot

Comparison operator token for negative identity test (is not).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsNotAst
'
%
expectvalue /Class
doit
IsNotAst category: 'Parser'
%
! ------------------- Class definition for LtAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
LtAst comment:
'https://docs.python.org/3/library/ast.html#ast.Lt

Comparison operator token for less than (<).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtAst
'
%
expectvalue /Class
doit
LtAst category: 'Parser'
%
! ------------------- Class definition for LtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
LtEAst comment:
'https://docs.python.org/3/library/ast.html#ast.LtE

Comparison operator token for less than or equal (<=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtEAst
'
%
expectvalue /Class
doit
LtEAst category: 'Parser'
%
! ------------------- Class definition for NotEqAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotEqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NotEqAst comment:
'https://docs.python.org/3/library/ast.html#ast.NotEq

Comparison operator token for inequality (!=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        NotEqAst
'
%
expectvalue /Class
doit
NotEqAst category: 'Parser'
%
! ------------------- Class definition for NotInAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotInAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
NotInAst comment:
'https://docs.python.org/3/library/ast.html#ast.NotIn

Comparison operator token for negative membership test (not in).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        NotInAst
'
%
expectvalue /Class
doit
NotInAst category: 'Parser'
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
  inDictionary: PythonAST
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
ComprehensionAst category: 'Parser'
%
! ------------------- Class definition for ExpressionContextAst
expectvalue /Class
doit
AbstractNode subclass: 'ExpressionContextAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ExpressionContextAst comment:
'https://docs.python.org/3/library/ast.html#ast.expr_context

Expression context base class. The context indicates whether the expression is being read (Load), written to (Store), or deleted (Del).

This is an abstract base class. The concrete subclasses are Load, Store, Del, and Param.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
'
%
expectvalue /Class
doit
ExpressionContextAst category: 'Parser'
%
! ------------------- Class definition for DelAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'DelAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
DelAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deleting a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being deleted.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DelAst
'
%
expectvalue /Class
doit
DelAst category: 'Parser'
%
! ------------------- Class definition for LoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'LoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
LoadAst comment:
'https://docs.python.org/3/library/ast.html#ast.Load

Expression context for reading/loading a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being read.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        LoadAst
'
%
expectvalue /Class
doit
LoadAst category: 'Parser'
%
! ------------------- Class definition for ParamAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'ParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ParamAst comment:
'https://docs.python.org/3/library/ast.html#ast.Param

Expression context for function parameters.

Used as the ctx field in Name nodes when the name is a function parameter.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        ParamAst
'
%
expectvalue /Class
doit
ParamAst category: 'Parser'
%
! ------------------- Class definition for StoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'StoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
StoreAst comment:
'https://docs.python.org/3/library/ast.html#ast.Store

Expression context for writing/storing a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being assigned to.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        StoreAst
'
%
expectvalue /Class
doit
StoreAst category: 'Parser'
%
! ------------------- Class definition for ModuleAst
expectvalue /Class
doit
AbstractNode subclass: 'ModuleAst'
  instVarNames: #( body name path
                    source stream scope type_ignore)
  classVars: #()
  classInstVars: #( pprintast)
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ModuleAst comment:
'https://docs.python.org/3/library/ast.html#ast.Module

A Python module, as with file input.
Node type generated by ast.parse() in the default "exec" mode.

body is a list of the module''s Statements.
type_ignores is a list of the module''s type ignore comments.

Example:
>>> print(ast.dump(ast.parse(''x = 1''), indent=4))
Module(
    body=[
        Assign(
            targets=[
                Name(id=''x'', ctx=Store())],
            value=Constant(value=1))])
'
%
expectvalue /Class
doit
ModuleAst category: 'Parser'
%
! ------------------- Class definition for Package
expectvalue /Class
doit
ModuleAst subclass: 'Package'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
Package comment: 
'Packages are a way of structuring Python’s module namespace by using “dotted module names”.
See https://docs.python.org/3/tutorial/modules.html#packages for details.'
%
expectvalue /Class
doit
Package category: 'Parser'
%
! ------------------- Class definition for OperatorAst
expectvalue /Class
doit
AbstractNode subclass: 'OperatorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
OperatorAst comment:
'https://docs.python.org/3/library/ast.html#ast.operator

Binary operator base class.

This is an abstract base class for all binary operator tokens (Add, Sub, Mult, Div, Mod, Pow, LShift, RShift, BitOr, BitXor, BitAnd, FloorDiv, MatMult).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
'
%
expectvalue /Class
doit
OperatorAst category: 'Parser'
%
! ------------------- Class definition for AddAst
expectvalue /Class
doit
OperatorAst subclass: 'AddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
AddAst comment:
'https://docs.python.org/3/library/ast.html#ast.Add

Binary operator token for addition (+).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        AddAst
'
%
expectvalue /Class
doit
AddAst category: 'Parser'
%
! ------------------- Class definition for BitAndAst
expectvalue /Class
doit
OperatorAst subclass: 'BitAndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BitAndAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitAnd

Binary operator token for bitwise AND (&).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitAndAst
'
%
expectvalue /Class
doit
BitAndAst category: 'Parser'
%
! ------------------- Class definition for BitOrAst
expectvalue /Class
doit
OperatorAst subclass: 'BitOrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BitOrAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitOr

Binary operator token for bitwise OR (|).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitOrAst
'
%
expectvalue /Class
doit
BitOrAst category: 'Parser'
%
! ------------------- Class definition for BitXorAst
expectvalue /Class
doit
OperatorAst subclass: 'BitXorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BitXorAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitXor

Binary operator token for bitwise XOR (^).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitXorAst
'
%
expectvalue /Class
doit
BitXorAst category: 'Parser'
%
! ------------------- Class definition for DivAst
expectvalue /Class
doit
OperatorAst subclass: 'DivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
DivAst comment:
'https://docs.python.org/3/library/ast.html#ast.Div

Binary operator token for division (/).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        DivAst
'
%
expectvalue /Class
doit
DivAst category: 'Parser'
%
! ------------------- Class definition for FloorDivAst
expectvalue /Class
doit
OperatorAst subclass: 'FloorDivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
FloorDivAst comment:
'https://docs.python.org/3/library/ast.html#ast.FloorDiv

Binary operator token for floor division (//).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        FloorDivAst
'
%
expectvalue /Class
doit
FloorDivAst category: 'Parser'
%
! ------------------- Class definition for LShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'LShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
LShiftAst comment:
'https://docs.python.org/3/library/ast.html#ast.LShift

Binary operator token for left bit shift (<<).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        LShiftAst
'
%
expectvalue /Class
doit
LShiftAst category: 'Parser'
%
! ------------------- Class definition for MatMultAst
expectvalue /Class
doit
OperatorAst subclass: 'MatMultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
MatMultAst comment:
'https://docs.python.org/3/library/ast.html#ast.MatMult

Binary operator token for matrix multiplication (@).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MatMultAst
'
%
expectvalue /Class
doit
MatMultAst category: 'Parser'
%
! ------------------- Class definition for ModAst
expectvalue /Class
doit
OperatorAst subclass: 'ModAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
ModAst comment:
'https://docs.python.org/3/library/ast.html#ast.Mod

Binary operator token for modulo (%).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        ModAst
'
%
expectvalue /Class
doit
ModAst category: 'Parser'
%
! ------------------- Class definition for MultAst
expectvalue /Class
doit
OperatorAst subclass: 'MultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
MultAst comment:
'https://docs.python.org/3/library/ast.html#ast.Mult

Binary operator token for multiplication (*).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MultAst
'
%
expectvalue /Class
doit
MultAst category: 'Parser'
%
! ------------------- Class definition for PowAst
expectvalue /Class
doit
OperatorAst subclass: 'PowAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
PowAst comment:
'https://docs.python.org/3/library/ast.html#ast.Pow

Binary operator token for exponentiation (**).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        PowAst
'
%
expectvalue /Class
doit
PowAst category: 'Parser'
%
! ------------------- Class definition for RShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'RShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
RShiftAst comment:
'https://docs.python.org/3/library/ast.html#ast.RShift

Binary operator token for right bit shift (>>).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        RShiftAst
'
%
expectvalue /Class
doit
RShiftAst category: 'Parser'
%
! ------------------- Class definition for SubAst
expectvalue /Class
doit
OperatorAst subclass: 'SubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SubAst comment:
'https://docs.python.org/3/library/ast.html#ast.Sub

Binary operator token for subtraction (-).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        SubAst
'
%
expectvalue /Class
doit
SubAst category: 'Parser'
%
! ------------------- Class definition for SuiteAst
expectvalue /Class
doit
AbstractNode subclass: 'SuiteAst'
  instVarNames: #( body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
SuiteAst comment:
'Grail-specific helper class for managing statement suites.

This is not a standard Python AST node, but a Grail implementation detail for managing collections of statements and their associated variables.

body is a list of statement nodes.
variables tracks variable declarations in the suite.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      SuiteAst(body variables)
'
%
expectvalue /Class
doit
SuiteAst category: 'Parser'
%
! ------------------- Class definition for BlockAst
expectvalue /Class
doit
SuiteAst subclass: 'BlockAst'
  instVarNames: #( variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
BlockAst category: 'Parser'
%
! ------------------- Class definition for TypeIgnoreAst
expectvalue /Class
doit
AbstractNode subclass: 'TypeIgnoreAst'
  instVarNames: #( lineno tag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
TypeIgnoreAst category: 'Parser'
%
! ------------------- Class definition for TypeParamAst
expectvalue /Class
doit
AbstractNode subclass: 'TypeParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
TypeParamAst category: 'Parser'
%
! ------------------- Class definition for WithItemAst
expectvalue /Class
doit
AbstractNode subclass: 'WithItemAst'
  instVarNames: #( context_expr optional_vars)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
WithItemAst comment:
'https://docs.python.org/3/library/ast.html#ast.withitem

A single context manager in a with statement.

context_expr is the context manager expression.
optional_vars is a Name, Tuple, or other node for the as clause (can be None).

Example:
>>> print(ast.dump(ast.parse(''with x as y:\\n    ...''), indent=4))
Module(
    body=[
        With(
            items=[
                withitem(
                    context_expr=Name(id=''x'', ctx=Load()),
                    optional_vars=Name(id=''y'', ctx=Store()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      WithItemAst(context_expr optional_vars)
'
%
expectvalue /Class
doit
WithItemAst category: 'Parser'
%

! ------------------- Class definition for PrettyWriteStream
expectvalue /Class
doit
WriteStream subclass: 'PrettyWriteStream'
  instVarNames: #( indentCount)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAST
  options: #()

%
expectvalue /Class
doit
PrettyWriteStream category: 'Tools'
%

! ===============================================================================
! Method Implementations
! ===============================================================================
! Load method implementations for all AST node classes
! ===============================================================================

! Abstract base classes (must be loaded first)
input smalltalk/ast/AbstractNode.gs
input smalltalk/ast/AbstractLocationNode.gs

! Concrete AST node classes (alphabetical order)
input smalltalk/ast/AddAst.gs
input smalltalk/ast/AliasAst.gs
input smalltalk/ast/AndAst.gs
input smalltalk/ast/AnnAssignAst.gs
input smalltalk/ast/ArgAst.gs
input smalltalk/ast/ArgumentsAst.gs
input smalltalk/ast/AssertAst.gs
input smalltalk/ast/AssignAst.gs
input smalltalk/ast/AsyncForAst.gs
input smalltalk/ast/AsyncFunctionDefAst.gs
input smalltalk/ast/AsyncWithAst.gs
input smalltalk/ast/AttributeAst.gs
input smalltalk/ast/AugAssignAst.gs
input smalltalk/ast/AwaitAst.gs
input smalltalk/ast/BinOpAst.gs
input smalltalk/ast/BitAndAst.gs
input smalltalk/ast/BitOrAst.gs
input smalltalk/ast/BitXorAst.gs
input smalltalk/ast/BlockAst.gs
input smalltalk/ast/BoolOpAst.gs
input smalltalk/ast/BreakAst.gs
input smalltalk/ast/CallAst.gs
input smalltalk/ast/ClassDefAst.gs
input smalltalk/ast/ClassFunctionDefAst.gs
input smalltalk/ast/CmpOpAst.gs
input smalltalk/ast/CompareAst.gs
input smalltalk/ast/ComprehensionAst.gs
input smalltalk/ast/ConstantAst.gs
input smalltalk/ast/ContinueAst.gs
input smalltalk/ast/DelAst.gs
input smalltalk/ast/DeleteAst.gs
input smalltalk/ast/DictAst.gs
input smalltalk/ast/DictCompAst.gs
input smalltalk/ast/DivAst.gs
input smalltalk/ast/EqAst.gs
input smalltalk/ast/ExceptHandlerAst.gs
input smalltalk/ast/ExprAst.gs
input smalltalk/ast/ExpressionAst.gs
input smalltalk/ast/ExpressionContextAst.gs
input smalltalk/ast/FloorDivAst.gs
input smalltalk/ast/ForAst.gs
input smalltalk/ast/FormattedValueAst.gs
input smalltalk/ast/FunctionDefAst.gs
input smalltalk/ast/GeneratorExpAst.gs
input smalltalk/ast/GlobalAst.gs
input smalltalk/ast/GtAst.gs
input smalltalk/ast/GtEAst.gs
input smalltalk/ast/IfAst.gs
input smalltalk/ast/IfExpAst.gs
input smalltalk/ast/ImportAst.gs
input smalltalk/ast/ImportFromAst.gs
input smalltalk/ast/InAst.gs
input smalltalk/ast/InstanceFunctionDefAst.gs
input smalltalk/ast/InvertAst.gs
input smalltalk/ast/IsAst.gs
input smalltalk/ast/IsNotAst.gs
input smalltalk/ast/JoinedStrAst.gs
input smalltalk/ast/KeywordAst.gs
input smalltalk/ast/KeywordsAst.gs
input smalltalk/ast/LShiftAst.gs
input smalltalk/ast/LambdaAst.gs
input smalltalk/ast/ListAst.gs
input smalltalk/ast/ListCompAst.gs
input smalltalk/ast/LoadAst.gs
input smalltalk/ast/LtAst.gs
input smalltalk/ast/LtEAst.gs
input smalltalk/ast/MatMultAst.gs
input smalltalk/ast/ModAst.gs
input smalltalk/ast/ModuleAst.gs
input smalltalk/ast/MultAst.gs
input smalltalk/ast/NameAst.gs
input smalltalk/ast/NamedExprAst.gs
input smalltalk/ast/NonlocalAst.gs
input smalltalk/ast/NotAst.gs
input smalltalk/ast/NotEqAst.gs
input smalltalk/ast/NotInAst.gs
input smalltalk/ast/OperatorAst.gs
input smalltalk/ast/OrAst.gs
input smalltalk/ast/ParamAst.gs
input smalltalk/ast/PassAst.gs
input smalltalk/ast/PowAst.gs
input smalltalk/ast/PrettyWriteStream.gs
input smalltalk/ast/RShiftAst.gs
input smalltalk/ast/RaiseAst.gs
input smalltalk/ast/ReturnAst.gs
input smalltalk/ast/SetAst.gs
input smalltalk/ast/SetCompAst.gs
input smalltalk/ast/SliceAst.gs
input smalltalk/ast/StarredAst.gs
input smalltalk/ast/StatementAst.gs
input smalltalk/ast/StaticFunctionDefAst.gs
input smalltalk/ast/StoreAst.gs
input smalltalk/ast/SubAst.gs
input smalltalk/ast/SubscriptAst.gs
input smalltalk/ast/SuiteAst.gs
input smalltalk/ast/TryAst.gs
input smalltalk/ast/TupleAst.gs
input smalltalk/ast/TypeIgnoreAst.gs
input smalltalk/ast/TypeParamAst.gs
input smalltalk/ast/UAddAst.gs
input smalltalk/ast/USubAst.gs
input smalltalk/ast/UnaryOpAst.gs
input smalltalk/ast/WhileAst.gs
input smalltalk/ast/WithAst.gs
input smalltalk/ast/WithItemAst.gs
input smalltalk/ast/YieldAst.gs
input smalltalk/ast/YieldFromAst.gs
