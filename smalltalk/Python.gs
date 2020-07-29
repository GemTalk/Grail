! ------- Create dictionary if it is not present
run
| aSymbol names userProfile |
aSymbol := #'Python'.
userProfile := System myUserProfile.
names := userProfile symbolList names.
(names includes: aSymbol) ifFalse: [
	| symbolDictionary |
	symbolDictionary := SymbolDictionary new name: aSymbol; yourself.
	userProfile insertDictionary: symbolDictionary at: names size + 1.
].
%
set compile_env: 0
! ------------------- Class definition for BaseException
expectvalue /Class
doit
AbstractException subclass: 'BaseException'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BaseException comment: 
'https://docs.python.org/3/library/exceptions.html#exception-hierarchy'
%
expectvalue /Class
doit
BaseException category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyException
expectvalue /Class
doit
BaseException subclass: 'PyException'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
PyException category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for AttributeError
expectvalue /Class
doit
PyException subclass: 'AttributeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
AttributeError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for DeprecationWarning
expectvalue /Class
doit
PyException subclass: 'DeprecationWarning'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
DeprecationWarning category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for ImportError
expectvalue /Class
doit
PyException subclass: 'ImportError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ImportError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for ModuleNotFoundError
expectvalue /Class
doit
ImportError subclass: 'ModuleNotFoundError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ModuleNotFoundError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for KeyError
expectvalue /Class
doit
PyException subclass: 'KeyError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
KeyError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyNameError
expectvalue /Class
doit
PyException subclass: 'PyNameError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
PyNameError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for RuntimeError
expectvalue /Class
doit
PyException subclass: 'RuntimeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
RuntimeError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for TypeError
expectvalue /Class
doit
PyException subclass: 'TypeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
TypeError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for ValueError
expectvalue /Class
doit
PyException subclass: 'ValueError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ValueError category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for BreakNotification
expectvalue /Class
doit
Notification subclass: 'BreakNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
BreakNotification category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for CancelNotification
expectvalue /Class
doit
Notification subclass: 'CancelNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
CancelNotification category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for ContinueNotification
expectvalue /Class
doit
Notification subclass: 'ContinueNotification'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ContinueNotification category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for ReturnNotification
expectvalue /Class
doit
Notification subclass: 'ReturnNotification'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ReturnNotification comment: 
'No class-specific documentation for ReturnNotification, hierarchy is: 
Object
  AbstractException( gsResumable gsTrappable gsNumber currGsHandler gsStack gsReason gsDetails tag messageText gsArgs)
    Exception
      Notification
        ReturnNotification
'
%
expectvalue /Class
doit
ReturnNotification category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for AstNode
expectvalue /Class
doit
Object subclass: 'AstNode'
  instVarNames: #( parent)
  classVars: #( escapeCharacters)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AstNode comment: 
'No class-specific documentation for AstNode, hierarchy is:
Object
  AstNode
'
%
expectvalue /Class
doit
AstNode category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AliasAst
expectvalue /Class
doit
AstNode subclass: 'AliasAst'
  instVarNames: #( assoc name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AliasAst comment: 
'No class-specific documentation for AliasAst, hierarchy is:
Object
  AstNode
    AliasAst( name asName)
'
%
expectvalue /Class
doit
AliasAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ArgumentsAst
expectvalue /Class
doit
AstNode subclass: 'ArgumentsAst'
  instVarNames: #( args vararg kwonlyargs
                    kw_defaults kwarg defaults)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArgumentsAst comment: 
'No class-specific documentation for ArgumentsAst, hierarchy is: 
Object
  AstNode( parent)
    ArgumentsAst( args vararg kwonlyargs kw_defaults kwarg defaults)
'
%
expectvalue /Class
doit
ArgumentsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AstNodeWithLocation
expectvalue /Class
doit
AstNode subclass: 'AstNodeWithLocation'
  instVarNames: #( line column)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AstNodeWithLocation comment: 
'No class-specific documentation for PyAstNodeWithLocation, hierarchy is: 
Object
  AstNode( parent line column)
    PyAstNodeWithLocation
'
%
expectvalue /Class
doit
AstNodeWithLocation category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ArgAst
expectvalue /Class
doit
AstNodeWithLocation subclass: 'ArgAst'
  instVarNames: #( assoc arg annotation)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ArgAst comment: 
'No class-specific documentation for ArgAst, hierarchy is: 
Object
  AstNode( parent line column)
    ArgAst( arg annotation)
'
%
expectvalue /Class
doit
ArgAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExceptHandlerAst
expectvalue /Class
doit
AstNodeWithLocation subclass: 'ExceptHandlerAst'
  instVarNames: #( type name body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExceptHandlerAst comment: 
'No class-specific documentation for ExceptHandlerAst, hierarchy is: 
Object
  AstNode( parent)
    ExcepthandlerAst
      ExceptHandlerAst( type name body)
'
%
expectvalue /Class
doit
ExceptHandlerAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExpressionAst
expectvalue /Class
doit
AstNodeWithLocation subclass: 'ExpressionAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExpressionAst comment: 
'No class-specific documentation for ExpressionAst, hierarchy is:
Object
  AstNode( line column)
    ExpressionAst
'
%
expectvalue /Class
doit
ExpressionAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AttributeAst
expectvalue /Class
doit
ExpressionAst subclass: 'AttributeAst'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AttributeAst comment: 
'No class-specific documentation for PyAttribute, hierarchy is: 
Object
  AstNode( parent line column)
    ExpressionAst
      PyAttribute( value attribute context)
'
%
expectvalue /Class
doit
AttributeAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AwaitAst
expectvalue /Class
doit
ExpressionAst subclass: 'AwaitAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AwaitAst comment: 
'No class-specific documentation for PyAwait, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyAwait( value)
'
%
expectvalue /Class
doit
AwaitAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BinOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BinOpAst'
  instVarNames: #( left op right)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BinOpAst comment: 
'No class-specific documentation for PyBinOp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyBinOp( left op right)
'
%
expectvalue /Class
doit
BinOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BoolOpAst comment: 
'No class-specific documentation for BoolOpAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        BoolOpAst( op values)
'
%
expectvalue /Class
doit
BoolOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AndAst
expectvalue /Class
doit
BoolOpAst subclass: 'AndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AndAst comment: 
'No class-specific documentation for PyAnd, hierarchy is: 
Object
  AstNode( parent)
    PyBoolop
      PyAnd
'
%
expectvalue /Class
doit
AndAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for OrAst
expectvalue /Class
doit
BoolOpAst subclass: 'OrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OrAst comment: 
'No class-specific documentation for PyOr, hierarchy is: 
Object
  AstNode( parent)
    PyBoolop
      PyOr
'
%
expectvalue /Class
doit
OrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BytesAst
expectvalue /Class
doit
ExpressionAst subclass: 'BytesAst'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BytesAst comment: 
'No class-specific documentation for BytesAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        BytesAst( s)
'
%
expectvalue /Class
doit
BytesAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CallAst
expectvalue /Class
doit
ExpressionAst subclass: 'CallAst'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CallAst comment: 
'No class-specific documentation for CallAst, hierarchy is: 
Object
  AstNode( parent line column)
    ExpressionAst
      CallAst( function arguments keywords)
'
%
expectvalue /Class
doit
CallAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CompareAst
expectvalue /Class
doit
ExpressionAst subclass: 'CompareAst'
  instVarNames: #( left cmpopList comparatorList)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CompareAst comment: 
'No class-specific documentation for PyCompare, hierarchy is: 
Object
  AstNode( parent line column)
    ExpressionAst
      PyCompare( left cmpopList comparatorList)
'
%
expectvalue /Class
doit
CompareAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'ConstantAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ConstantAst comment: 
'No class-specific documentation for PyConstant, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyConstant( value)
'
%
expectvalue /Class
doit
ConstantAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DictAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictAst'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DictAst comment: 
'No class-specific documentation for PyDict, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyDict( keys values)
'
%
expectvalue /Class
doit
DictAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DictCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictCompAst'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DictCompAst comment: 
'No class-specific documentation for PyDictComp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyDictComp( key value generators)
'
%
expectvalue /Class
doit
DictCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for EllipsisAst
expectvalue /Class
doit
ExpressionAst subclass: 'EllipsisAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EllipsisAst comment: 
'No class-specific documentation for PyEllipsis, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyEllipsis
'
%
expectvalue /Class
doit
EllipsisAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FormattedValueAst
expectvalue /Class
doit
ExpressionAst subclass: 'FormattedValueAst'
  instVarNames: #( value conversion format_spec)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FormattedValueAst comment: 
'No class-specific documentation for PyFormattedValue, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyFormattedValue( value conversion format_spec)
'
%
expectvalue /Class
doit
FormattedValueAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GeneratorExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'GeneratorExpAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GeneratorExpAst comment: 
'No class-specific documentation for PyGeneratorExp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyGeneratorExp( elt generators)
'
%
expectvalue /Class
doit
GeneratorExpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IfExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'IfExpAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IfExpAst comment: 
'No class-specific documentation for PyIfExp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyIfExp( args body)
'
%
expectvalue /Class
doit
IfExpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for JoinedStrAst
expectvalue /Class
doit
ExpressionAst subclass: 'JoinedStrAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
JoinedStrAst comment: 
'No class-specific documentation for PyJoinedStr, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyJoinedStr( values)
'
%
expectvalue /Class
doit
JoinedStrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LambdaAst
expectvalue /Class
doit
ExpressionAst subclass: 'LambdaAst'
  instVarNames: #( args body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LambdaAst comment: 
'No class-specific documentation for PyLambda, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyLambda( op values)
'
%
expectvalue /Class
doit
LambdaAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ListAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ListAst comment: 
'No class-specific documentation for PyList, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyList( elts ctx)
'
%
expectvalue /Class
doit
ListAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ListCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ListCompAst comment: 
'No class-specific documentation for PyListComp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyListComp( elt generators)
'
%
expectvalue /Class
doit
ListCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NameAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameAst'
  instVarNames: #( assoc id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
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
set compile_env: 0
! ------------------- Class definition for KeywordsAst
expectvalue /Class
doit
NameAst subclass: 'KeywordsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeywordsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NameConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameConstantAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #( singleton)
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NameConstantAst comment: 
'No class-specific documentation for NameConstantAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
'
%
expectvalue /Class
doit
NameConstantAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FalseAst
expectvalue /Class
doit
NameConstantAst subclass: 'FalseAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FalseAst comment: 
'No class-specific documentation for FalseAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
          FalseAst
'
%
expectvalue /Class
doit
FalseAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NoneAst
expectvalue /Class
doit
NameConstantAst subclass: 'NoneAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NoneAst comment: 
'No class-specific documentation for NoneAst, hierarchy is: 
Object
  NoneAst
'
%
expectvalue /Class
doit
NoneAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TrueAst
expectvalue /Class
doit
NameConstantAst subclass: 'TrueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TrueAst comment: 
'No class-specific documentation for TrueAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NameConstantAst( value)
          TrueAst
'
%
expectvalue /Class
doit
TrueAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NamedExprAst
expectvalue /Class
doit
ExpressionAst subclass: 'NamedExprAst'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NamedExprAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NumAst
expectvalue /Class
doit
ExpressionAst subclass: 'NumAst'
  instVarNames: #( n)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NumAst comment: 
'No class-specific documentation for NumAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        NumAst( n)
'
%
expectvalue /Class
doit
NumAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SetAst comment: 
'No class-specific documentation for PySet, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PySet( elts)
'
%
expectvalue /Class
doit
SetAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SetCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SetCompAst comment: 
'No class-specific documentation for PySetComp, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PySetComp( elt generators)
'
%
expectvalue /Class
doit
SetCompAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StarredAst
expectvalue /Class
doit
ExpressionAst subclass: 'StarredAst'
  instVarNames: #( value ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StarredAst comment: 
'No class-specific documentation for PyStarred, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyStarred( value ctx)
'
%
expectvalue /Class
doit
StarredAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StrAst
expectvalue /Class
doit
ExpressionAst subclass: 'StrAst'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StrAst comment: 
'No class-specific documentation for PyString, hierarchy is: 
Object
  AstNode( parent line column)
    ExpressionAst
      PyString( string)
'
%
expectvalue /Class
doit
StrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SubscriptAst
expectvalue /Class
doit
ExpressionAst subclass: 'SubscriptAst'
  instVarNames: #( value slice ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SubscriptAst comment: 
'No class-specific documentation for PySubscript, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PySubscript( value slice ctx)
'
%
expectvalue /Class
doit
SubscriptAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TupleAst
expectvalue /Class
doit
ExpressionAst subclass: 'TupleAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TupleAst comment: 
'No class-specific documentation for PyTuple, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyTuple( elts ctx)
'
%
expectvalue /Class
doit
TupleAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for UnaryOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'UnaryOpAst'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UnaryOpAst comment: 
'No class-specific documentation for UnaryOpAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        UnaryOpAst( op operand)
'
%
expectvalue /Class
doit
UnaryOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InvertAst
expectvalue /Class
doit
UnaryOpAst subclass: 'InvertAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InvertAst comment: 
'No class-specific documentation for PyInvert, hierarchy is: 
Object
  AstNode( parent)
    PyUnaryop
      PyInvert
'
%
expectvalue /Class
doit
InvertAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotAst
expectvalue /Class
doit
UnaryOpAst subclass: 'NotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotAst comment: 
'No class-specific documentation for PyNot, hierarchy is: 
Object
  AstNode( parent)
    PyUnaryop
      PyNot
'
%
expectvalue /Class
doit
NotAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for UAddAst
expectvalue /Class
doit
UnaryOpAst subclass: 'UAddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UAddAst comment: 
'No class-specific documentation for PyUAdd, hierarchy is: 
Object
  AstNode( parent)
    PyUnaryop
      PyUAdd
'
%
expectvalue /Class
doit
UAddAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for USubAst
expectvalue /Class
doit
UnaryOpAst subclass: 'USubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
USubAst comment: 
'No class-specific documentation for PyUSub, hierarchy is: 
Object
  AstNode( parent)
    PyUnaryop
      PyUSub
'
%
expectvalue /Class
doit
USubAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for YieldAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
YieldAst comment: 
'No class-specific documentation for PyYield, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyYield( value)
'
%
expectvalue /Class
doit
YieldAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for YieldFromAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldFromAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
YieldFromAst comment: 
'No class-specific documentation for PyYieldFrom, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      ExpressionAst
        PyYieldFrom( value)
'
%
expectvalue /Class
doit
YieldFromAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StatementAst
expectvalue /Class
doit
AstNodeWithLocation subclass: 'StatementAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StatementAst comment: 
'No class-specific documentation for StatementAst, hierarchy is:
Object
  AstNode( line column)
    StatementAst
'
%
expectvalue /Class
doit
StatementAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AnnAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AnnAssignAst'
  instVarNames: #( target annotation value
                    simple)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AnnAssignAst comment: 
'No class-specific documentation for PyAnnAssign, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      PyAnnAssign( target annotation value simple)
'
%
expectvalue /Class
doit
AnnAssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AssertAst
expectvalue /Class
doit
StatementAst subclass: 'AssertAst'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssertAst comment: 
'No class-specific documentation for PyAssert, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      PyAssert( test msg)
'
%
expectvalue /Class
doit
AssertAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AssignAst comment: 
'No class-specific documentation for PyAssign, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      PyAssign( target value)
'
%
expectvalue /Class
doit
AssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncForAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncForAst'
  instVarNames: #( target iter body
                    orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncForAst comment: 
'No class-specific documentation for AsyncForAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncForAst( target iter body orelse)
'
%
expectvalue /Class
doit
AsyncForAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncFunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncFunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncFunctionDefAst comment: 
'No class-specific documentation for AsyncFunctionDefAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncFunctionDefAst( name args body decorator_list returns)
'
%
expectvalue /Class
doit
AsyncFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AsyncWithAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncWithAst'
  instVarNames: #( items body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AsyncWithAst comment: 
'No class-specific documentation for AsyncWithAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        AsyncWithAst( items body)
'
%
expectvalue /Class
doit
AsyncWithAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AugAssignAst'
  instVarNames: #( target op value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugAssignAst comment: 
'No class-specific documentation for PyAugAssign, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyAugAssign( target op value)
'
%
expectvalue /Class
doit
AugAssignAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BreakAst
expectvalue /Class
doit
StatementAst subclass: 'BreakAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BreakAst comment: 
'No class-specific documentation for PyBreak, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyBreak
'
%
expectvalue /Class
doit
BreakAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ClassDefAst
expectvalue /Class
doit
StatementAst subclass: 'ClassDefAst'
  instVarNames: #( assoc name bases
                    keywords body decorator_list)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassDefAst comment: 
'No class-specific documentation for ClassDefAst, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      ClassDefAst( name bases keywords body decorator_list)
'
%
expectvalue /Class
doit
ClassDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ContinueAst
expectvalue /Class
doit
StatementAst subclass: 'ContinueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ContinueAst comment: 
'No class-specific documentation for PyContinue, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyContinue
'
%
expectvalue /Class
doit
ContinueAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DeleteAst comment: 
'No class-specific documentation for PyDelete, hierarchy is: 
Object
  AstNode( parent line column)
    ExpressionContextAst
      PyDelete
'
%
expectvalue /Class
doit
DeleteAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExprAst
expectvalue /Class
doit
StatementAst subclass: 'ExprAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExprAst comment: 
'No class-specific documentation for ExprAst, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      ExprAst( expression)
'
%
expectvalue /Class
doit
ExprAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ForAst
expectvalue /Class
doit
StatementAst subclass: 'ForAst'
  instVarNames: #( target iter body
                    orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ForAst comment: 
'No class-specific documentation for ForAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        ForAst( target iter body orelse)
'
%
expectvalue /Class
doit
ForAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( assoc name args
                    body decorator_list returns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FunctionDefAst comment: 
'No class-specific documentation for FunctionDefAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        FunctionDefAst( name args body decorator_list returns)
'
%
expectvalue /Class
doit
FunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ClassFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'ClassFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassFunctionDefAst comment: 
'No class-specific documentation for ClassFunctionDefAst, hierarchy is: 
Object
  AstNode( parent)
    AstNodeWithLocation( line column)
      StatementAst
        FunctionDefAst( assoc name args body decorator_list returns)
          ClassFunctionDefAst
'
%
expectvalue /Class
doit
ClassFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InstanceFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'InstanceFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InstanceFunctionDefAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GlobalAst
expectvalue /Class
doit
StatementAst subclass: 'GlobalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GlobalAst comment: 
'No class-specific documentation for PyGlobal, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyGlobal( names)
'
%
expectvalue /Class
doit
GlobalAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IfAst
expectvalue /Class
doit
StatementAst subclass: 'IfAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IfAst comment: 
'No class-specific documentation for IfAst, hierarchy is:
Object
  AstNode( line column)
    IfAst( test trueCase falseCase)
'
%
expectvalue /Class
doit
IfAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ImportAst
expectvalue /Class
doit
StatementAst subclass: 'ImportAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportAst comment: 
'No class-specific documentation for PyImport, hierarchy is:
Object
  AstNode
    PyImport( aliases)
'
%
expectvalue /Class
doit
ImportAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ImportFromAst
expectvalue /Class
doit
StatementAst subclass: 'ImportFromAst'
  instVarNames: #( module names level)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportFromAst comment: 
'No class-specific documentation for PyImportFrom, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      PyImportFrom( identifier alias int)
'
%
expectvalue /Class
doit
ImportFromAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NonlocalAst
expectvalue /Class
doit
StatementAst subclass: 'NonlocalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NonlocalAst comment: 
'No class-specific documentation for PyNonlocal, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyNonlocal( names)
'
%
expectvalue /Class
doit
NonlocalAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PassAst
expectvalue /Class
doit
StatementAst subclass: 'PassAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PassAst comment: 
'No class-specific documentation for PassAst, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PassAst
'
%
expectvalue /Class
doit
PassAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for RaiseAst
expectvalue /Class
doit
StatementAst subclass: 'RaiseAst'
  instVarNames: #( exc cause)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RaiseAst comment: 
'No class-specific documentation for PyRaise, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyRaise( exc cause)
'
%
expectvalue /Class
doit
RaiseAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ReturnAst
expectvalue /Class
doit
StatementAst subclass: 'ReturnAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ReturnAst comment: 
'No class-specific documentation for ReturnAst, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      ReturnAst( value)
'
%
expectvalue /Class
doit
ReturnAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for TryAst
expectvalue /Class
doit
StatementAst subclass: 'TryAst'
  instVarNames: #( body handlers orelse
                    finalbody)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TryAst comment: 
'No class-specific documentation for PyTry, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyTry( body handlers orelse finalbody)
'
%
expectvalue /Class
doit
TryAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WhileAst
expectvalue /Class
doit
StatementAst subclass: 'WhileAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WhileAst comment: 
'No class-specific documentation for PyWhile, hierarchy is: 
Object
  AstNode( parent line column)
    StatementAst
      PyWhile( test body orElse)
'
%
expectvalue /Class
doit
WhileAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WithAst
expectvalue /Class
doit
StatementAst subclass: 'WithAst'
  instVarNames: #( items body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WithAst comment: 
'No class-specific documentation for PyWith, hierarchy is: 
Object
  AstNode( parent)
    PyAstNodeWithLocation( line column)
      StatementAst
        PyWith( items body)
'
%
expectvalue /Class
doit
WithAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for CmpOpAst
expectvalue /Class
doit
AstNode subclass: 'CmpOpAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CmpOpAst comment: 
'No class-specific documentation for CmpOpAst, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
'
%
expectvalue /Class
doit
CmpOpAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for EqAst
expectvalue /Class
doit
CmpOpAst subclass: 'EqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EqAst comment: 
'No class-specific documentation for PyEq, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyEq
'
%
expectvalue /Class
doit
EqAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GtAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GtAst comment: 
'No class-specific documentation for PyGt, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyGt
'
%
expectvalue /Class
doit
GtAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GtEAst comment: 
'No class-specific documentation for PyGtE, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyGtE
'
%
expectvalue /Class
doit
GtEAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for InAst
expectvalue /Class
doit
CmpOpAst subclass: 'InAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
InAst comment: 
'No class-specific documentation for PyIn, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyIn
'
%
expectvalue /Class
doit
InAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IsAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IsAst comment: 
'No class-specific documentation for PyIs, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyIs
'
%
expectvalue /Class
doit
IsAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IsNotAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsNotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IsNotAst comment: 
'No class-specific documentation for PyIsNot, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyIsNot
'
%
expectvalue /Class
doit
IsNotAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LtAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LtAst comment: 
'No class-specific documentation for PyLt, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyLt
'
%
expectvalue /Class
doit
LtAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LtEAst comment: 
'No class-specific documentation for PyLtE, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyLtE
'
%
expectvalue /Class
doit
LtEAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotEqAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotEqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotEqAst comment: 
'No class-specific documentation for PyNotEq, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyNotEq
'
%
expectvalue /Class
doit
NotEqAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for NotInAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotInAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NotInAst comment: 
'No class-specific documentation for PyNotIn, hierarchy is: 
Object
  AstNode( parent)
    CmpOpAst
      PyNotIn
'
%
expectvalue /Class
doit
NotInAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ComprehensionAst
expectvalue /Class
doit
AstNode subclass: 'ComprehensionAst'
  instVarNames: #( target iter ifs
                    is_async)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ComprehensionAst comment: 
'No class-specific documentation for ComprehensionAst, hierarchy is: 
Object
  AstNode( parent)
    ComprehensionAst( target iter ifs is_async)
'
%
expectvalue /Class
doit
ComprehensionAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExpressionContextAst
expectvalue /Class
doit
AstNode subclass: 'ExpressionContextAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExpressionContextAst comment: 
'No class-specific documentation for ExpressionContextAst, hierarchy is:
Object
  AstNode( line column)
    ExpressionContextAst
'
%
expectvalue /Class
doit
ExpressionContextAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugLoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'AugLoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugLoadAst comment: 
'No class-specific documentation for PyAugLoad, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      PyAugLoad
'
%
expectvalue /Class
doit
AugLoadAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AugStoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'AugStoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AugStoreAst comment: 
'No class-specific documentation for PyAugStore, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      PyAugStore
'
%
expectvalue /Class
doit
AugStoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DelAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'DelAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DelAst comment: 
'No class-specific documentation for PyDel, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      PyDel
'
%
expectvalue /Class
doit
DelAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'LoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LoadAst comment: 
'No class-specific documentation for LoadAst, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      LoadAst
'
%
expectvalue /Class
doit
LoadAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ParamAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'ParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ParamAst comment: 
'No class-specific documentation for PyParam, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      PyParam
'
%
expectvalue /Class
doit
ParamAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for StoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'StoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StoreAst comment: 
'No class-specific documentation for StoreAst, hierarchy is: 
Object
  AstNode( parent)
    ExpressionContextAst
      StoreAst
'
%
expectvalue /Class
doit
StoreAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for KeywordAst
expectvalue /Class
doit
AstNode subclass: 'KeywordAst'
  instVarNames: #( arg value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
KeywordAst comment: 
'No class-specific documentation for KeywordAst, hierarchy is: 
Object
  AstNode( parent)
    KeywordAst( arg value)
'
%
expectvalue /Class
doit
KeywordAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ModuleAst
expectvalue /Class
doit
AstNode subclass: 'ModuleAst'
  instVarNames: #( body name path
                    source stream)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ModuleAst comment: 
'A Module is a file containing Python definitions and statements. When a file (''script'') is executed from the command line, (e.g., ''python myFile.py''), the module global variable `__name__` is set to ''__main__''. A Module can be imported into another module using the `Import` command, and the module global variable `__name__` is then the name of the file.

https://docs.python.org/3/tutorial/modules.html?highlight=module'
%
expectvalue /Class
doit
ModuleAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyPackage
expectvalue /Class
doit
ModuleAst subclass: 'PyPackage'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyPackage category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for OperatorAst
expectvalue /Class
doit
AstNode subclass: 'OperatorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OperatorAst comment: 
'No class-specific documentation for OperatorAst, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
'
%
expectvalue /Class
doit
OperatorAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for AddAst
expectvalue /Class
doit
OperatorAst subclass: 'AddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
AddAst comment: 
'No class-specific documentation for PyAdd, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyAdd
'
%
expectvalue /Class
doit
AddAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitAndAst
expectvalue /Class
doit
OperatorAst subclass: 'BitAndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitAndAst comment: 
'No class-specific documentation for PyBitAnd, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyBitAnd
'
%
expectvalue /Class
doit
BitAndAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitOrAst
expectvalue /Class
doit
OperatorAst subclass: 'BitOrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitOrAst comment: 
'No class-specific documentation for PyBitOr, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyBitOr
'
%
expectvalue /Class
doit
BitOrAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BitXorAst
expectvalue /Class
doit
OperatorAst subclass: 'BitXorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BitXorAst comment: 
'No class-specific documentation for PyBitXor, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyBitXor
'
%
expectvalue /Class
doit
BitXorAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for DivAst
expectvalue /Class
doit
OperatorAst subclass: 'DivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DivAst comment: 
'No class-specific documentation for PyDiv, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyDiv
'
%
expectvalue /Class
doit
DivAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for FloorDivAst
expectvalue /Class
doit
OperatorAst subclass: 'FloorDivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
FloorDivAst comment: 
'No class-specific documentation for PyFloorDiv, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyFloorDiv
'
%
expectvalue /Class
doit
FloorDivAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'LShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LShiftAst comment: 
'No class-specific documentation for PyLShift, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyLShift
'
%
expectvalue /Class
doit
LShiftAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for MatMultAst
expectvalue /Class
doit
OperatorAst subclass: 'MatMultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
MatMultAst comment: 
'No class-specific documentation for PyMatMult, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyMatMult
'
%
expectvalue /Class
doit
MatMultAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ModAst
expectvalue /Class
doit
OperatorAst subclass: 'ModAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ModAst comment: 
'No class-specific documentation for PyMod, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyMod
'
%
expectvalue /Class
doit
ModAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for MultAst
expectvalue /Class
doit
OperatorAst subclass: 'MultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
MultAst comment: 
'No class-specific documentation for PyMult, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyMult
'
%
expectvalue /Class
doit
MultAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PowAst
expectvalue /Class
doit
OperatorAst subclass: 'PowAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PowAst comment: 
'No class-specific documentation for PyPow, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyPow
'
%
expectvalue /Class
doit
PowAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for RShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'RShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
RShiftAst comment: 
'No class-specific documentation for PyRShift, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PyRShift
'
%
expectvalue /Class
doit
RShiftAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SubAst
expectvalue /Class
doit
OperatorAst subclass: 'SubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SubAst comment: 
'No class-specific documentation for PySub, hierarchy is: 
Object
  AstNode( parent)
    OperatorAst
      PySub
'
%
expectvalue /Class
doit
SubAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SliceAbstractAst
expectvalue /Class
doit
AstNode subclass: 'SliceAbstractAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SliceAbstractAst comment: 
'No class-specific documentation for SliceAbstractAst, hierarchy is: 
Object
  AstNode( parent)
    SliceAbstractAst
'
%
expectvalue /Class
doit
SliceAbstractAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for ExtSliceAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'ExtSliceAst'
  instVarNames: #( dims)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ExtSliceAst comment: 
'No class-specific documentation for PyExtSlice, hierarchy is: 
Object
  AstNode( parent)
    SliceAbstractAst
      PyExtSlice( dims)
'
%
expectvalue /Class
doit
ExtSliceAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for IndexAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'IndexAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
IndexAst comment: 
'No class-specific documentation for PyIndex, hierarchy is: 
Object
  AstNode( parent)
    SliceAbstractAst
      PyIndex( value)
'
%
expectvalue /Class
doit
IndexAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SliceAst
expectvalue /Class
doit
SliceAbstractAst subclass: 'SliceAst'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SliceAst comment: 
'No class-specific documentation for PySlice, hierarchy is: 
Object
  AstNode( parent)
    SliceAbstractAst
      PySlice( lower upper step)
'
%
expectvalue /Class
doit
SliceAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for SuiteAst
expectvalue /Class
doit
AstNode subclass: 'SuiteAst'
  instVarNames: #( body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SuiteAst comment: 
'No class-specific documentation for SuiteAst, hierarchy is: 
Object
  AstNode( parent)
    SuiteAst( body variables)
'
%
expectvalue /Class
doit
SuiteAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BlockAst
expectvalue /Class
doit
SuiteAst subclass: 'BlockAst'
  instVarNames: #( variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BlockAst comment: 
'A Python program is constructed from code blocks. A block is a piece of Python program text that is executed as a unit. The following are blocks: a module, a function body, and a class definition. Each command typed interactively is a block. A script file (a file given as standard input to the interpreter or specified as a command line argument to the interpreter) is a code block. A script command (a command specified on the interpreter command line with the -c option) is a code block. The string argument passed to the built-in functions eval() and exec() is a code block.

A code block is executed in an execution frame. A frame contains some administrative information (used for debugging) and determines where and how execution continues after the code block’s execution has completed.


https://docs.python.org/3/reference/executionmodel.html'
%
expectvalue /Class
doit
BlockAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GlobalScope
expectvalue /Class
doit
BlockAst subclass: 'GlobalScope'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
GlobalScope category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for LocalScope
expectvalue /Class
doit
BlockAst subclass: 'LocalScope'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
LocalScope category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for WithItemAst
expectvalue /Class
doit
AstNode subclass: 'WithItemAst'
  instVarNames: #( context_expr optional_vars)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
WithItemAst comment: 
'No class-specific documentation for WithItemAst, hierarchy is: 
Object
  AstNode( parent)
    WithItemAst( context_expr optional_vars)
'
%
expectvalue /Class
doit
WithItemAst category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for BuiltinModule
expectvalue /Class
doit
Object subclass: 'BuiltinModule'
  instVarNames: #( dictionary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BuiltinModule category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for _Imp
expectvalue /Class
doit
BuiltinModule subclass: '_Imp'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
_Imp comment: 
'https://docs.python.org/3/library/importlib.html
cpython/Python/import.c

dir(sys.modules[''_imp''])
[
    ''__doc__, 
    ''__loader__, 
    ''__name__, 
    ''__package__, 
    ''__spec__, 
    ''_fix_co_filename, 
    ''acquire_lock, 
    ''check_hash_based_pycs, 
    ''create_builtin, 
    ''create_dynamic, 
    ''exec_builtin, 
    ''exec_dynamic, 
    ''extension_suffixes, 
    ''get_frozen_object, 
    ''init_frozen, 
    ''is_builtin, 
    ''is_frozen, 
    ''is_frozen_package, 
    ''lock_held, 
    ''release_lock, 
    ''source_hash''
]'
%
expectvalue /Class
doit
_Imp category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Builtins
expectvalue /Class
doit
BuiltinModule subclass: 'Builtins'
  instVarNames: #( stdout)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Builtins comment: 
'No class-specific documentation for Builtins, hierarchy is: 
Object
  Builtins
'
%
expectvalue /Class
doit
Builtins category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyTime
expectvalue /Class
doit
BuiltinModule subclass: 'PyTime'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyTime category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Sys
expectvalue /Class
doit
BuiltinModule subclass: 'Sys'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Sys comment: 
'https://docs.python.org/3/library/sys.html'
%
expectvalue /Class
doit
Sys category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for List
expectvalue /Class
doit
Array subclass: 'List'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
List category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Tuple
expectvalue /Class
doit
Array subclass: 'Tuple'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Tuple category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyString
expectvalue /Class
doit
String subclass: 'PyString'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyString category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Complex
expectvalue /Class
doit
Number subclass: 'Complex'
  instVarNames: #( real imaginary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Complex comment: 
'No class-specific documentation for Complex, hierarchy is: 
Object
  Complex( real imaginary)
'
%
expectvalue /Class
doit
Complex category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyObject
expectvalue /Class
doit
Object subclass: 'PyObject'
  instVarNames: #( classAst variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyObject comment: 
'No class-specific documentation for PythonObject, hierarchy is: 
Object
  PythonObject( classAst dictionary)
'
%
expectvalue /Class
doit
PyObject category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PythonTestCase
expectvalue /Class
doit
TestCase subclass: 'PythonTestCase'
  instVarNames: #( module stdout)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PythonTestCase comment: 
'No class-specific documentation for PythonTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase
'
%
expectvalue /Class
doit
PythonTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for BuiltinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
BuiltinsTestCase comment: 
'No class-specific documentation for BuiltinsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        BuiltinsTestCase
'
%
expectvalue /Class
doit
BuiltinsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ByteLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ByteLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ByteLiteralsTestCase comment: 
'No class-specific documentation for ByteLiteralsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        ByteLiteralsTestCase
'
%
expectvalue /Class
doit
ByteLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ClassesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ClassesTestCase comment: 
'Module([
	Assign([Name(''g'', Store(), lineno=4, col_offset=0)], Str(''G'', lineno=4, col_offset=4), lineno=4, col_offset=0), 
	ClassDef(''MyClass'', [], [], [
		Assign([Name(''iv1'', Store(), lineno=7, col_offset=4)], Str(''1'', lineno=7, col_offset=10), lineno=7, col_offset=4), 
		FunctionDef(''__init__'', arguments([arg(''self'', None, lineno=9, col_offset=17), arg(''p'', None, lineno=9, col_offset=23)], None, [], [], None, []), [
			Assign([Attribute(Name(''self'', Load(), lineno=10, col_offset=8), ''iv2'', Store(), lineno=10, col_offset=8)], Name(''p'', Load(), lineno=10, col_offset=19), lineno=10, col_offset=8)], [], None, lineno=9, col_offset=4), 
		FunctionDef(''foo'', arguments([arg(''self'', None, lineno=12, col_offset=12), arg(''p'', None, lineno=12, col_offset=18)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>foo('', lineno=13, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=13, col_offset=33), [Name(''self'', Load(), lineno=13, col_offset=37)], [], lineno=13, col_offset=33), lineno=13, col_offset=15), Add(), 
				Str('', '', lineno=13, col_offset=45), lineno=13, col_offset=43), Add(), 
				Name(''p'', Load(), lineno=13, col_offset=52), lineno=13, col_offset=50), Add(), 
				Str('') - '', lineno=13, col_offset=56), lineno=13, col_offset=54), Add(), 
				Attribute(Name(''self'', Load(), lineno=13, col_offset=65), ''iv1'', Load(), lineno=13, col_offset=65), lineno=13, col_offset=63), Add(), 
				Str('' - '', lineno=13, col_offset=76), lineno=13, col_offset=74), Add(), 
				Attribute(Name(''self'', Load(), lineno=13, col_offset=84), ''iv2'', Load(), lineno=13, col_offset=84), lineno=13, col_offset=82), lineno=13, col_offset=8)], [], None, lineno=12, col_offset=4), 
		FunctionDef(''bar1'', arguments([arg(''self'', None, lineno=15, col_offset=13), arg(''p'', None, lineno=15, col_offset=19)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>bar1('', lineno=16, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=16, col_offset=34), [Name(''self'', Load(), lineno=16, col_offset=38)], [], lineno=16, col_offset=34), lineno=16, col_offset=15), Add(), 
				Str('', '', lineno=16, col_offset=46), lineno=16, col_offset=44), Add(), Name(''p'', Load(), lineno=16, col_offset=53), lineno=16, col_offset=51), Add(), 
				Str('')'', lineno=16, col_offset=57), lineno=16, col_offset=55), lineno=16, col_offset=8)], [], None, lineno=15, col_offset=4), 
		Assign([Name(''bar2'', Store(), lineno=18, col_offset=4)], Call(Name(''classmethod'', Load(), lineno=18, col_offset=11), [Name(''bar1'', Load(), lineno=18, col_offset=23)], [], lineno=18, col_offset=11), lineno=18, col_offset=4), 
		FunctionDef(''bar3'', arguments([arg(''self'', None, lineno=21, col_offset=13), arg(''p'', None, lineno=21, col_offset=19)], None, [], [], None, []), [
			Return(BinOp(BinOp(BinOp(BinOp(Str(''MyClass>>bar3('', lineno=22, col_offset=15), Add(), 
				Call(Name(''str'', Load(), lineno=22, col_offset=34), [Name(''self'', Load(), lineno=22, col_offset=38)], [], lineno=22, col_offset=34), lineno=22, col_offset=15), Add(), 
				Str('', '', lineno=22, col_offset=46), lineno=22, col_offset=44), Add(), 
				Name(''p'', Load(), lineno=22, col_offset=53), lineno=22, col_offset=51), Add(), 
				Str('')'', lineno=22, col_offset=57), lineno=22, col_offset=55), lineno=22, col_offset=8)], 
			[Name(''classmethod'', Load(), lineno=20, col_offset=5)], None, lineno=20, col_offset=4)
	], [], lineno=6, col_offset=0), 
	Assign([Name(''o'', Store(), lineno=24, col_offset=0)], Call(Name(''MyClass'', Load(), lineno=24, col_offset=4), [Str(''A'', lineno=24, col_offset=12)], [], lineno=24, col_offset=4), lineno=24, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=25, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=25, col_offset=6), ''foo'', Load(), lineno=25, col_offset=6), [Str(''B'', lineno=25, col_offset=12)], [], lineno=25, col_offset=6)], [], lineno=25, col_offset=0), lineno=25, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=26, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=26, col_offset=6), ''bar1'', Load(), lineno=26, col_offset=6), [Str(''B'', lineno=26, col_offset=13)], [], lineno=26, col_offset=6)], [], lineno=26, col_offset=0), lineno=26, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=27, col_offset=0), [
		Call(Attribute(Name(''o'', Load(), lineno=27, col_offset=6), ''bar2'', Load(), lineno=27, col_offset=6), [Str(''C'', lineno=27, col_offset=13)], [], lineno=27, col_offset=6)], [], lineno=27, col_offset=0), lineno=27, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=28, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=28, col_offset=6), ''bar1'', Load(), lineno=28, col_offset=6), [Str(''C'', lineno=28, col_offset=19), Str(''D'', lineno=28, col_offset=24)], [], lineno=28, col_offset=6)], [], lineno=28, col_offset=0), lineno=28, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=29, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=29, col_offset=6), ''bar2'', Load(), lineno=29, col_offset=6), [Str(''C'', lineno=29, col_offset=19)], [], lineno=29, col_offset=6)], [], lineno=29, col_offset=0), lineno=29, col_offset=0), 
	Expr(Call(Name(''print'', Load(), lineno=30, col_offset=0), [
		Call(Attribute(Name(''MyClass'', Load(), lineno=30, col_offset=6), ''bar3'', Load(), lineno=30, col_offset=6), [Str(''C'', lineno=30, col_offset=19)], [], lineno=30, col_offset=6)], [], lineno=30, col_offset=0), lineno=30, col_offset=0)])'
%
expectvalue /Class
doit
ClassesTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for CompoundStatementsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CompoundStatementsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
CompoundStatementsTestCase comment: 
'No class-specific documentation for CompoundStatementsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        CompoundStatementsTestCase
'
%
expectvalue /Class
doit
CompoundStatementsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for DelimitersTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DelimitersTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
DelimitersTestCase comment: 
'No class-specific documentation for DelimitersTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        DelimitersTestCase
'
%
expectvalue /Class
doit
DelimitersTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for EvaluateTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvaluateTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
EvaluateTestCase comment: 
'No class-specific documentation for EvaluateTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        EvaluateTestCase
'
%
expectvalue /Class
doit
EvaluateTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for ImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
ImportTestCase comment: 
'This is the wrapper for Python''s built-in regression test suite.'
%
expectvalue /Class
doit
ImportTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for NumericLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumericLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
NumericLiteralsTestCase comment: 
'No class-specific documentation for NumericLiteralsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        NumericLiteralsTestCase
'
%
expectvalue /Class
doit
NumericLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for OperatorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
OperatorsTestCase comment: 
'No class-specific documentation for OperatorsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        OperatorsTestCase
'
%
expectvalue /Class
doit
OperatorsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for SimpleStatementsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SimpleStatementsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SimpleStatementsTestCase comment: 
'No class-specific documentation for SimpleStatementsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        SimpleStatementsTestCase
'
%
expectvalue /Class
doit
SimpleStatementsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for StringLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StringLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
StringLiteralsTestCase comment: 
'No class-specific documentation for StringLiteralsTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase
        StringLiteralsTestCase( statements)
'
%
expectvalue /Class
doit
StringLiteralsTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for SysTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SysTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
SysTestCase comment: 
'No class-specific documentation for SysTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements stdout)
        SysTestCase
'
%
expectvalue /Class
doit
SysTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for TimeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TimeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
TimeTestCase comment: 
'No class-specific documentation for TimeTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements stdout)
        TimeTestCase
'
%
expectvalue /Class
doit
TimeTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for VariableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'VariableTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
VariableTestCase comment: 
'No class-specific documentation for VariableTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      PythonTestCase( statements)
        VariableTestCase
'
%
expectvalue /Class
doit
VariableTestCase category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for PythonTestResource
expectvalue /Class
doit
TestResource subclass: 'PythonTestResource'
  instVarNames: #( path module statements)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PythonTestResource comment: 
'No class-specific documentation for PythonTestResource, hierarchy is: 
Object
  TestAsserter
    TestResource( name description)
      PythonTestResource( statements)
'
%
expectvalue /Class
doit
PythonTestResource category: 'Tests'
%
set compile_env: 0
! ------------------- Class definition for UserInteraction
expectvalue /Class
doit
Object subclass: 'UserInteraction'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
UserInteraction category: 'Builtins'
%

input _Imp.gs
input AddAst.gs
input AliasAst.gs
input AndAst.gs
input AnnAssignAst.gs
input ArgAst.gs
input ArgumentsAst.gs
input AssertAst.gs
input AssignAst.gs
input AstNode.gs
input AstNodeWithLocation.gs
input AsyncForAst.gs
input AsyncFunctionDefAst.gs
input AsyncWithAst.gs
input AttributeAst.gs
input AttributeError.gs
input AugAssignAst.gs
input AugLoadAst.gs
input AugStoreAst.gs
input AwaitAst.gs
input BaseException.gs
input BinOpAst.gs
input BitAndAst.gs
input BitOrAst.gs
input BitXorAst.gs
input BlockAst.gs
input BoolOpAst.gs
input BreakAst.gs
input BreakNotification.gs
input BuiltinModule.gs
input Builtins.gs
input BuiltinsTestCase.gs
input ByteLiteralsTestCase.gs
input BytesAst.gs
input CallAst.gs
input CancelNotification.gs
input ClassDefAst.gs
input ClassesTestCase.gs
input ClassFunctionDefAst.gs
input CmpOpAst.gs
input CompareAst.gs
input Complex.gs
input CompoundStatementsTestCase.gs
input ComprehensionAst.gs
input ConstantAst.gs
input ContinueAst.gs
input ContinueNotification.gs
input DelAst.gs
input DeleteAst.gs
input DelimitersTestCase.gs
input DeprecationWarning.gs
input DictAst.gs
input DictCompAst.gs
input DivAst.gs
input EllipsisAst.gs
input EqAst.gs
input EvaluateTestCase.gs
input ExceptHandlerAst.gs
input ExprAst.gs
input ExpressionAst.gs
input ExpressionContextAst.gs
input ExtSliceAst.gs
input FalseAst.gs
input FloorDivAst.gs
input ForAst.gs
input FormattedValueAst.gs
input FunctionDefAst.gs
input GeneratorExpAst.gs
input GlobalAst.gs
input GlobalScope.gs
input GtAst.gs
input GtEAst.gs
input IfAst.gs
input IfExpAst.gs
input ImportAst.gs
input ImportError.gs
input ImportFromAst.gs
input ImportTestCase.gs
input InAst.gs
input IndexAst.gs
input InstanceFunctionDefAst.gs
input InvertAst.gs
input IsAst.gs
input IsNotAst.gs
input JoinedStrAst.gs
input KeyError.gs
input KeywordAst.gs
input KeywordsAst.gs
input LambdaAst.gs
input List.gs
input ListAst.gs
input ListCompAst.gs
input LoadAst.gs
input LocalScope.gs
input LShiftAst.gs
input LtAst.gs
input LtEAst.gs
input MatMultAst.gs
input ModAst.gs
input ModuleAst.gs
input ModuleNotFoundError.gs
input MultAst.gs
input NameAst.gs
input NameConstantAst.gs
input NamedExprAst.gs
input NoneAst.gs
input NonlocalAst.gs
input NotAst.gs
input NotEqAst.gs
input NotInAst.gs
input NumAst.gs
input NumericLiteralsTestCase.gs
input OperatorAst.gs
input OperatorsTestCase.gs
input OrAst.gs
input ParamAst.gs
input PassAst.gs
input PowAst.gs
input PyException.gs
input PyNameError.gs
input PyObject.gs
input PyPackage.gs
input PyString.gs
input PythonTestCase.gs
input PythonTestResource.gs
input PyTime.gs
input RaiseAst.gs
input ReturnAst.gs
input ReturnNotification.gs
input RShiftAst.gs
input RuntimeError.gs
input SetAst.gs
input SetCompAst.gs
input SimpleStatementsTestCase.gs
input SliceAbstractAst.gs
input SliceAst.gs
input StarredAst.gs
input StatementAst.gs
input StoreAst.gs
input StrAst.gs
input StringLiteralsTestCase.gs
input SubAst.gs
input SubscriptAst.gs
input SuiteAst.gs
input Sys.gs
input SysTestCase.gs
input TimeTestCase.gs
input TrueAst.gs
input TryAst.gs
input Tuple.gs
input TupleAst.gs
input TypeError.gs
input UAddAst.gs
input UnaryOpAst.gs
input UserInteraction.gs
input USubAst.gs
input ValueError.gs
input VariableTestCase.gs
input WhileAst.gs
input WithAst.gs
input WithItemAst.gs
input YieldAst.gs
input YieldFromAst.gs
