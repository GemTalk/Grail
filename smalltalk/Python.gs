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
Sys category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Time
expectvalue /Class
doit
BuiltinModule subclass: 'Time'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Time category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Py_List
expectvalue /Class
doit
Array subclass: 'Py_List'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Py_List category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Py_Tuple
expectvalue /Class
doit
Array subclass: 'Py_Tuple'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Py_Tuple category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Py_String
expectvalue /Class
doit
String subclass: 'Py_String'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
Py_String category: 'Builtins'
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
! ------------------- Class definition for PyAstNode
expectvalue /Class
doit
Object subclass: 'PyAstNode'
  instVarNames: #( parent)
  classVars: #( escapeCharacters)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAstNode comment: 
'No class-specific documentation for PyAstNode, hierarchy is:
Object
  PyAstNode
'
%
expectvalue /Class
doit
PyAstNode category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAlias
expectvalue /Class
doit
PyAstNode subclass: 'PyAlias'
  instVarNames: #( assoc name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAlias comment: 
'No class-specific documentation for PyAlias, hierarchy is:
Object
  PyAstNode
    PyAlias( name asName)
'
%
expectvalue /Class
doit
PyAlias category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyArguments
expectvalue /Class
doit
PyAstNode subclass: 'PyArguments'
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
PyArguments comment: 
'No class-specific documentation for PyArguments, hierarchy is: 
Object
  PyAstNode( parent)
    PyArguments( args vararg kwonlyargs kw_defaults kwarg defaults)
'
%
expectvalue /Class
doit
PyArguments category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAstNodeWithLocation
expectvalue /Class
doit
PyAstNode subclass: 'PyAstNodeWithLocation'
  instVarNames: #( line column)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAstNodeWithLocation comment: 
'No class-specific documentation for PyAstNodeWithLocation, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyAstNodeWithLocation
'
%
expectvalue /Class
doit
PyAstNodeWithLocation category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyArg
expectvalue /Class
doit
PyAstNodeWithLocation subclass: 'PyArg'
  instVarNames: #( assoc arg annotation)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyArg comment: 
'No class-specific documentation for PyArg, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyArg( arg annotation)
'
%
expectvalue /Class
doit
PyArg category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExceptHandler
expectvalue /Class
doit
PyAstNodeWithLocation subclass: 'PyExceptHandler'
  instVarNames: #( type name body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyExceptHandler comment: 
'No class-specific documentation for PyExceptHandler, hierarchy is: 
Object
  PyAstNode( parent)
    PyExcepthandler
      PyExceptHandler( type name body)
'
%
expectvalue /Class
doit
PyExceptHandler category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExpression
expectvalue /Class
doit
PyAstNodeWithLocation subclass: 'PyExpression'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyExpression comment: 
'No class-specific documentation for PyExpression, hierarchy is:
Object
  PyAstNode( line column)
    PyExpression
'
%
expectvalue /Class
doit
PyExpression category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAttribute
expectvalue /Class
doit
PyExpression subclass: 'PyAttribute'
  instVarNames: #( value attr ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAttribute comment: 
'No class-specific documentation for PyAttribute, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyExpression
      PyAttribute( value attribute context)
'
%
expectvalue /Class
doit
PyAttribute category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAwait
expectvalue /Class
doit
PyExpression subclass: 'PyAwait'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAwait comment: 
'No class-specific documentation for PyAwait, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyAwait( value)
'
%
expectvalue /Class
doit
PyAwait category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBinOp
expectvalue /Class
doit
PyExpression subclass: 'PyBinOp'
  instVarNames: #( left op right)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBinOp comment: 
'No class-specific documentation for PyBinOp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyBinOp( left op right)
'
%
expectvalue /Class
doit
PyBinOp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBoolOp
expectvalue /Class
doit
PyExpression subclass: 'PyBoolOp'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBoolOp comment: 
'No class-specific documentation for PyBoolOp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyBoolOp( op values)
'
%
expectvalue /Class
doit
PyBoolOp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAnd
expectvalue /Class
doit
PyBoolOp subclass: 'PyAnd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAnd comment: 
'No class-specific documentation for PyAnd, hierarchy is: 
Object
  PyAstNode( parent)
    PyBoolop
      PyAnd
'
%
expectvalue /Class
doit
PyAnd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyOr
expectvalue /Class
doit
PyBoolOp subclass: 'PyOr'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyOr comment: 
'No class-specific documentation for PyOr, hierarchy is: 
Object
  PyAstNode( parent)
    PyBoolop
      PyOr
'
%
expectvalue /Class
doit
PyOr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBytes
expectvalue /Class
doit
PyExpression subclass: 'PyBytes'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBytes comment: 
'No class-specific documentation for PyBytes, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyBytes( s)
'
%
expectvalue /Class
doit
PyBytes category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyCall
expectvalue /Class
doit
PyExpression subclass: 'PyCall'
  instVarNames: #( function arguments keywords)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyCall comment: 
'No class-specific documentation for PyCall, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyExpression
      PyCall( function arguments keywords)
'
%
expectvalue /Class
doit
PyCall category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyCompare
expectvalue /Class
doit
PyExpression subclass: 'PyCompare'
  instVarNames: #( left cmpopList comparatorList)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyCompare comment: 
'No class-specific documentation for PyCompare, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyExpression
      PyCompare( left cmpopList comparatorList)
'
%
expectvalue /Class
doit
PyCompare category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyConstant
expectvalue /Class
doit
PyExpression subclass: 'PyConstant'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyConstant comment: 
'No class-specific documentation for PyConstant, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyConstant( value)
'
%
expectvalue /Class
doit
PyConstant category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyDict
expectvalue /Class
doit
PyExpression subclass: 'PyDict'
  instVarNames: #( keys values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyDict comment: 
'No class-specific documentation for PyDict, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyDict( keys values)
'
%
expectvalue /Class
doit
PyDict category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyDictComp
expectvalue /Class
doit
PyExpression subclass: 'PyDictComp'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyDictComp comment: 
'No class-specific documentation for PyDictComp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyDictComp( key value generators)
'
%
expectvalue /Class
doit
PyDictComp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyEllipsis
expectvalue /Class
doit
PyExpression subclass: 'PyEllipsis'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyEllipsis comment: 
'No class-specific documentation for PyEllipsis, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyEllipsis
'
%
expectvalue /Class
doit
PyEllipsis category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyFormattedValue
expectvalue /Class
doit
PyExpression subclass: 'PyFormattedValue'
  instVarNames: #( value conversion format_spec)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyFormattedValue comment: 
'No class-specific documentation for PyFormattedValue, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyFormattedValue( value conversion format_spec)
'
%
expectvalue /Class
doit
PyFormattedValue category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyGeneratorExp
expectvalue /Class
doit
PyExpression subclass: 'PyGeneratorExp'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyGeneratorExp comment: 
'No class-specific documentation for PyGeneratorExp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyGeneratorExp( elt generators)
'
%
expectvalue /Class
doit
PyGeneratorExp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIfExp
expectvalue /Class
doit
PyExpression subclass: 'PyIfExp'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIfExp comment: 
'No class-specific documentation for PyIfExp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyIfExp( args body)
'
%
expectvalue /Class
doit
PyIfExp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyJoinedStr
expectvalue /Class
doit
PyExpression subclass: 'PyJoinedStr'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyJoinedStr comment: 
'No class-specific documentation for PyJoinedStr, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyJoinedStr( values)
'
%
expectvalue /Class
doit
PyJoinedStr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyLambda
expectvalue /Class
doit
PyExpression subclass: 'PyLambda'
  instVarNames: #( args body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyLambda comment: 
'No class-specific documentation for PyLambda, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyLambda( op values)
'
%
expectvalue /Class
doit
PyLambda category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyList
expectvalue /Class
doit
PyExpression subclass: 'PyList'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyList comment: 
'No class-specific documentation for PyList, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyList( elts ctx)
'
%
expectvalue /Class
doit
PyList category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyListComp
expectvalue /Class
doit
PyExpression subclass: 'PyListComp'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyListComp comment: 
'No class-specific documentation for PyListComp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyListComp( elt generators)
'
%
expectvalue /Class
doit
PyListComp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyName
expectvalue /Class
doit
PyExpression subclass: 'PyName'
  instVarNames: #( assoc id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyName comment: 
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
PyName category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNameConstant
expectvalue /Class
doit
PyExpression subclass: 'PyNameConstant'
  instVarNames: #()
  classVars: #()
  classInstVars: #( singleton)
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNameConstant comment: 
'No class-specific documentation for PyNameConstant, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyNameConstant( value)
'
%
expectvalue /Class
doit
PyNameConstant category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyFalse
expectvalue /Class
doit
PyNameConstant subclass: 'PyFalse'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyFalse comment: 
'No class-specific documentation for PyFalse, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyNameConstant( value)
          PyFalse
'
%
expectvalue /Class
doit
PyFalse category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNone
expectvalue /Class
doit
PyNameConstant subclass: 'PyNone'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNone comment: 
'No class-specific documentation for PyNone, hierarchy is: 
Object
  PyNone
'
%
expectvalue /Class
doit
PyNone category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyTrue
expectvalue /Class
doit
PyNameConstant subclass: 'PyTrue'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyTrue comment: 
'No class-specific documentation for PyTrue, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyNameConstant( value)
          PyTrue
'
%
expectvalue /Class
doit
PyTrue category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNamedExpr
expectvalue /Class
doit
PyExpression subclass: 'PyNamedExpr'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNamedExpr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNum
expectvalue /Class
doit
PyExpression subclass: 'PyNum'
  instVarNames: #( n)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNum comment: 
'No class-specific documentation for PyNum, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyNum( n)
'
%
expectvalue /Class
doit
PyNum category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySet
expectvalue /Class
doit
PyExpression subclass: 'PySet'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySet comment: 
'No class-specific documentation for PySet, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PySet( elts)
'
%
expectvalue /Class
doit
PySet category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySetComp
expectvalue /Class
doit
PyExpression subclass: 'PySetComp'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySetComp comment: 
'No class-specific documentation for PySetComp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PySetComp( elt generators)
'
%
expectvalue /Class
doit
PySetComp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyStarred
expectvalue /Class
doit
PyExpression subclass: 'PyStarred'
  instVarNames: #( value ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyStarred comment: 
'No class-specific documentation for PyStarred, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyStarred( value ctx)
'
%
expectvalue /Class
doit
PyStarred category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyStr
expectvalue /Class
doit
PyExpression subclass: 'PyStr'
  instVarNames: #( s)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyStr comment: 
'No class-specific documentation for PyString, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyExpression
      PyString( string)
'
%
expectvalue /Class
doit
PyStr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySubscript
expectvalue /Class
doit
PyExpression subclass: 'PySubscript'
  instVarNames: #( value slice ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySubscript comment: 
'No class-specific documentation for PySubscript, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PySubscript( value slice ctx)
'
%
expectvalue /Class
doit
PySubscript category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyTuple
expectvalue /Class
doit
PyExpression subclass: 'PyTuple'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyTuple comment: 
'No class-specific documentation for PyTuple, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyTuple( elts ctx)
'
%
expectvalue /Class
doit
PyTuple category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUnaryOp
expectvalue /Class
doit
PyExpression subclass: 'PyUnaryOp'
  instVarNames: #( operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyUnaryOp comment: 
'No class-specific documentation for PyUnaryOp, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyUnaryOp( op operand)
'
%
expectvalue /Class
doit
PyUnaryOp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyInvert
expectvalue /Class
doit
PyUnaryOp subclass: 'PyInvert'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyInvert comment: 
'No class-specific documentation for PyInvert, hierarchy is: 
Object
  PyAstNode( parent)
    PyUnaryop
      PyInvert
'
%
expectvalue /Class
doit
PyInvert category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNot
expectvalue /Class
doit
PyUnaryOp subclass: 'PyNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNot comment: 
'No class-specific documentation for PyNot, hierarchy is: 
Object
  PyAstNode( parent)
    PyUnaryop
      PyNot
'
%
expectvalue /Class
doit
PyNot category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUAdd
expectvalue /Class
doit
PyUnaryOp subclass: 'PyUAdd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyUAdd comment: 
'No class-specific documentation for PyUAdd, hierarchy is: 
Object
  PyAstNode( parent)
    PyUnaryop
      PyUAdd
'
%
expectvalue /Class
doit
PyUAdd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUSub
expectvalue /Class
doit
PyUnaryOp subclass: 'PyUSub'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyUSub comment: 
'No class-specific documentation for PyUSub, hierarchy is: 
Object
  PyAstNode( parent)
    PyUnaryop
      PyUSub
'
%
expectvalue /Class
doit
PyUSub category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyYield
expectvalue /Class
doit
PyExpression subclass: 'PyYield'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyYield comment: 
'No class-specific documentation for PyYield, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyYield( value)
'
%
expectvalue /Class
doit
PyYield category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyYieldFrom
expectvalue /Class
doit
PyExpression subclass: 'PyYieldFrom'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyYieldFrom comment: 
'No class-specific documentation for PyYieldFrom, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyYieldFrom( value)
'
%
expectvalue /Class
doit
PyYieldFrom category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyStatement
expectvalue /Class
doit
PyAstNodeWithLocation subclass: 'PyStatement'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyStatement comment: 
'No class-specific documentation for PyStatement, hierarchy is:
Object
  PyAstNode( line column)
    PyStatement
'
%
expectvalue /Class
doit
PyStatement category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAnnAssign
expectvalue /Class
doit
PyStatement subclass: 'PyAnnAssign'
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
PyAnnAssign comment: 
'No class-specific documentation for PyAnnAssign, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyAnnAssign( target annotation value simple)
'
%
expectvalue /Class
doit
PyAnnAssign category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAssert
expectvalue /Class
doit
PyStatement subclass: 'PyAssert'
  instVarNames: #( test msg)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAssert comment: 
'No class-specific documentation for PyAssert, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyAssert( test msg)
'
%
expectvalue /Class
doit
PyAssert category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAssign
expectvalue /Class
doit
PyStatement subclass: 'PyAssign'
  instVarNames: #( targets value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAssign comment: 
'No class-specific documentation for PyAssign, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyAssign( target value)
'
%
expectvalue /Class
doit
PyAssign category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAsyncFor
expectvalue /Class
doit
PyStatement subclass: 'PyAsyncFor'
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
PyAsyncFor comment: 
'No class-specific documentation for PyAsyncFor, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyAsyncFor( target iter body orelse)
'
%
expectvalue /Class
doit
PyAsyncFor category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAsyncFunctionDef
expectvalue /Class
doit
PyStatement subclass: 'PyAsyncFunctionDef'
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
PyAsyncFunctionDef comment: 
'No class-specific documentation for PyAsyncFunctionDef, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyAsyncFunctionDef( name args body decorator_list returns)
'
%
expectvalue /Class
doit
PyAsyncFunctionDef category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAsyncWith
expectvalue /Class
doit
PyStatement subclass: 'PyAsyncWith'
  instVarNames: #( items body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAsyncWith comment: 
'No class-specific documentation for PyAsyncWith, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyAsyncWith( items body)
'
%
expectvalue /Class
doit
PyAsyncWith category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAugAssign
expectvalue /Class
doit
PyStatement subclass: 'PyAugAssign'
  instVarNames: #( target op value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAugAssign comment: 
'No class-specific documentation for PyAugAssign, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyAugAssign( target op value)
'
%
expectvalue /Class
doit
PyAugAssign category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBreak
expectvalue /Class
doit
PyStatement subclass: 'PyBreak'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBreak comment: 
'No class-specific documentation for PyBreak, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyBreak
'
%
expectvalue /Class
doit
PyBreak category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyClassDef
expectvalue /Class
doit
PyStatement subclass: 'PyClassDef'
  instVarNames: #( name bases keywords
                    body decorator_list)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyClassDef comment: 
'No class-specific documentation for PyClassDef, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyClassDef( name bases keywords body decorator_list)
'
%
expectvalue /Class
doit
PyClassDef category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyContinue
expectvalue /Class
doit
PyStatement subclass: 'PyContinue'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyContinue comment: 
'No class-specific documentation for PyContinue, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyContinue
'
%
expectvalue /Class
doit
PyContinue category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyDelete
expectvalue /Class
doit
PyStatement subclass: 'PyDelete'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyDelete comment: 
'No class-specific documentation for PyDelete, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyExpressionContext
      PyDelete
'
%
expectvalue /Class
doit
PyDelete category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExpr
expectvalue /Class
doit
PyStatement subclass: 'PyExpr'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyExpr comment: 
'No class-specific documentation for PyExpr, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyExpr( expression)
'
%
expectvalue /Class
doit
PyExpr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyFor
expectvalue /Class
doit
PyStatement subclass: 'PyFor'
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
PyFor comment: 
'No class-specific documentation for PyFor, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyFor( target iter body orelse)
'
%
expectvalue /Class
doit
PyFor category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyFunctionDef
expectvalue /Class
doit
PyStatement subclass: 'PyFunctionDef'
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
PyFunctionDef comment: 
'No class-specific documentation for PyFunctionDef, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyFunctionDef( name args body decorator_list returns)
'
%
expectvalue /Class
doit
PyFunctionDef category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyGlobal
expectvalue /Class
doit
PyStatement subclass: 'PyGlobal'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyGlobal comment: 
'No class-specific documentation for PyGlobal, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyGlobal( names)
'
%
expectvalue /Class
doit
PyGlobal category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIf
expectvalue /Class
doit
PyStatement subclass: 'PyIf'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIf comment: 
'No class-specific documentation for PyIf, hierarchy is:
Object
  PyAstNode( line column)
    PyIf( test trueCase falseCase)
'
%
expectvalue /Class
doit
PyIf category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyImport
expectvalue /Class
doit
PyStatement subclass: 'PyImport'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyImport comment: 
'No class-specific documentation for PyImport, hierarchy is:
Object
  PyAstNode
    PyImport( aliases)
'
%
expectvalue /Class
doit
PyImport category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyImportFrom
expectvalue /Class
doit
PyStatement subclass: 'PyImportFrom'
  instVarNames: #( module names level)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyImportFrom comment: 
'No class-specific documentation for PyImportFrom, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyImportFrom( identifier alias int)
'
%
expectvalue /Class
doit
PyImportFrom category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNonlocal
expectvalue /Class
doit
PyStatement subclass: 'PyNonlocal'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNonlocal comment: 
'No class-specific documentation for PyNonlocal, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyNonlocal( names)
'
%
expectvalue /Class
doit
PyNonlocal category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyPass
expectvalue /Class
doit
PyStatement subclass: 'PyPass'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyPass comment: 
'No class-specific documentation for PyPass, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyPass
'
%
expectvalue /Class
doit
PyPass category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyRaise
expectvalue /Class
doit
PyStatement subclass: 'PyRaise'
  instVarNames: #( exc cause)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyRaise comment: 
'No class-specific documentation for PyRaise, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyRaise( exc cause)
'
%
expectvalue /Class
doit
PyRaise category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyReturn
expectvalue /Class
doit
PyStatement subclass: 'PyReturn'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyReturn comment: 
'No class-specific documentation for PyReturn, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyReturn( value)
'
%
expectvalue /Class
doit
PyReturn category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyTry
expectvalue /Class
doit
PyStatement subclass: 'PyTry'
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
PyTry comment: 
'No class-specific documentation for PyTry, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyTry( body handlers orelse finalbody)
'
%
expectvalue /Class
doit
PyTry category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyWhile
expectvalue /Class
doit
PyStatement subclass: 'PyWhile'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyWhile comment: 
'No class-specific documentation for PyWhile, hierarchy is: 
Object
  PyAstNode( parent line column)
    PyStatement
      PyWhile( test body orElse)
'
%
expectvalue /Class
doit
PyWhile category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyWith
expectvalue /Class
doit
PyStatement subclass: 'PyWith'
  instVarNames: #( items body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyWith comment: 
'No class-specific documentation for PyWith, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyStatement
        PyWith( items body)
'
%
expectvalue /Class
doit
PyWith category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyCmpOp
expectvalue /Class
doit
PyAstNode subclass: 'PyCmpOp'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyCmpOp comment: 
'No class-specific documentation for PyCmpOp, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
'
%
expectvalue /Class
doit
PyCmpOp category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyEq
expectvalue /Class
doit
PyCmpOp subclass: 'PyEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyEq comment: 
'No class-specific documentation for PyEq, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyEq
'
%
expectvalue /Class
doit
PyEq category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyGt
expectvalue /Class
doit
PyCmpOp subclass: 'PyGt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyGt comment: 
'No class-specific documentation for PyGt, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyGt
'
%
expectvalue /Class
doit
PyGt category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyGtE
expectvalue /Class
doit
PyCmpOp subclass: 'PyGtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyGtE comment: 
'No class-specific documentation for PyGtE, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyGtE
'
%
expectvalue /Class
doit
PyGtE category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIn
expectvalue /Class
doit
PyCmpOp subclass: 'PyIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIn comment: 
'No class-specific documentation for PyIn, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyIn
'
%
expectvalue /Class
doit
PyIn category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIs
expectvalue /Class
doit
PyCmpOp subclass: 'PyIs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIs comment: 
'No class-specific documentation for PyIs, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyIs
'
%
expectvalue /Class
doit
PyIs category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIsNot
expectvalue /Class
doit
PyCmpOp subclass: 'PyIsNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIsNot comment: 
'No class-specific documentation for PyIsNot, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyIsNot
'
%
expectvalue /Class
doit
PyIsNot category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyLt
expectvalue /Class
doit
PyCmpOp subclass: 'PyLt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyLt comment: 
'No class-specific documentation for PyLt, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyLt
'
%
expectvalue /Class
doit
PyLt category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyLtE
expectvalue /Class
doit
PyCmpOp subclass: 'PyLtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyLtE comment: 
'No class-specific documentation for PyLtE, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyLtE
'
%
expectvalue /Class
doit
PyLtE category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNotEq
expectvalue /Class
doit
PyCmpOp subclass: 'PyNotEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNotEq comment: 
'No class-specific documentation for PyNotEq, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyNotEq
'
%
expectvalue /Class
doit
PyNotEq category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNotIn
expectvalue /Class
doit
PyCmpOp subclass: 'PyNotIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyNotIn comment: 
'No class-specific documentation for PyNotIn, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpOp
      PyNotIn
'
%
expectvalue /Class
doit
PyNotIn category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyComprehension
expectvalue /Class
doit
PyAstNode subclass: 'PyComprehension'
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
PyComprehension comment: 
'No class-specific documentation for PyComprehension, hierarchy is: 
Object
  PyAstNode( parent)
    PyComprehension( target iter ifs is_async)
'
%
expectvalue /Class
doit
PyComprehension category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExpressionContext
expectvalue /Class
doit
PyAstNode subclass: 'PyExpressionContext'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyExpressionContext comment: 
'No class-specific documentation for PyExpressionContext, hierarchy is:
Object
  PyAstNode( line column)
    PyExpressionContext
'
%
expectvalue /Class
doit
PyExpressionContext category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAugLoad
expectvalue /Class
doit
PyExpressionContext subclass: 'PyAugLoad'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAugLoad comment: 
'No class-specific documentation for PyAugLoad, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyAugLoad
'
%
expectvalue /Class
doit
PyAugLoad category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAugStore
expectvalue /Class
doit
PyExpressionContext subclass: 'PyAugStore'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAugStore comment: 
'No class-specific documentation for PyAugStore, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyAugStore
'
%
expectvalue /Class
doit
PyAugStore category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyDel
expectvalue /Class
doit
PyExpressionContext subclass: 'PyDel'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyDel comment: 
'No class-specific documentation for PyDel, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyDel
'
%
expectvalue /Class
doit
PyDel category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyLoad
expectvalue /Class
doit
PyExpressionContext subclass: 'PyLoad'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyLoad comment: 
'No class-specific documentation for PyLoad, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyLoad
'
%
expectvalue /Class
doit
PyLoad category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyParam
expectvalue /Class
doit
PyExpressionContext subclass: 'PyParam'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyParam comment: 
'No class-specific documentation for PyParam, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyParam
'
%
expectvalue /Class
doit
PyParam category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyStore
expectvalue /Class
doit
PyExpressionContext subclass: 'PyStore'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyStore comment: 
'No class-specific documentation for PyStore, hierarchy is: 
Object
  PyAstNode( parent)
    PyExpressionContext
      PyStore
'
%
expectvalue /Class
doit
PyStore category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyKeyword
expectvalue /Class
doit
PyAstNode subclass: 'PyKeyword'
  instVarNames: #( arg value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyKeyword comment: 
'No class-specific documentation for PyKeyword, hierarchy is: 
Object
  PyAstNode( parent)
    PyKeyword( arg value)
'
%
expectvalue /Class
doit
PyKeyword category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyModule
expectvalue /Class
doit
PyAstNode subclass: 'PyModule'
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
PyModule comment: 
'A Module is a file containing Python definitions and statements. When a file (''script'') is executed from the command line, (e.g., ''python myFile.py''), the module global variable `__name__` is set to ''__main__''. A Module can be imported into another module using the `Import` command, and the module global variable `__name__` is then the name of the file.

https://docs.python.org/3/tutorial/modules.html?highlight=module'
%
expectvalue /Class
doit
PyModule category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyRandom
expectvalue /Class
doit
PyModule subclass: 'PyRandom'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyRandom comment: 
'No class-specific documentation for PyRandom, hierarchy is: 
Object
  PyAstNode( parent)
    PyModule( globals name path source statements stream)
      PyRandom
'
%
expectvalue /Class
doit
PyRandom category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for PyOperator
expectvalue /Class
doit
PyAstNode subclass: 'PyOperator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyOperator comment: 
'No class-specific documentation for PyOperator, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
'
%
expectvalue /Class
doit
PyOperator category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAdd
expectvalue /Class
doit
PyOperator subclass: 'PyAdd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyAdd comment: 
'No class-specific documentation for PyAdd, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyAdd
'
%
expectvalue /Class
doit
PyAdd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBitAnd
expectvalue /Class
doit
PyOperator subclass: 'PyBitAnd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBitAnd comment: 
'No class-specific documentation for PyBitAnd, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyBitAnd
'
%
expectvalue /Class
doit
PyBitAnd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBitOr
expectvalue /Class
doit
PyOperator subclass: 'PyBitOr'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBitOr comment: 
'No class-specific documentation for PyBitOr, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyBitOr
'
%
expectvalue /Class
doit
PyBitOr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBitXor
expectvalue /Class
doit
PyOperator subclass: 'PyBitXor'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBitXor comment: 
'No class-specific documentation for PyBitXor, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyBitXor
'
%
expectvalue /Class
doit
PyBitXor category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyDiv
expectvalue /Class
doit
PyOperator subclass: 'PyDiv'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyDiv comment: 
'No class-specific documentation for PyDiv, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyDiv
'
%
expectvalue /Class
doit
PyDiv category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyFloorDiv
expectvalue /Class
doit
PyOperator subclass: 'PyFloorDiv'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyFloorDiv comment: 
'No class-specific documentation for PyFloorDiv, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyFloorDiv
'
%
expectvalue /Class
doit
PyFloorDiv category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyLShift
expectvalue /Class
doit
PyOperator subclass: 'PyLShift'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyLShift comment: 
'No class-specific documentation for PyLShift, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyLShift
'
%
expectvalue /Class
doit
PyLShift category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyMatMult
expectvalue /Class
doit
PyOperator subclass: 'PyMatMult'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyMatMult comment: 
'No class-specific documentation for PyMatMult, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyMatMult
'
%
expectvalue /Class
doit
PyMatMult category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyMod
expectvalue /Class
doit
PyOperator subclass: 'PyMod'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyMod comment: 
'No class-specific documentation for PyMod, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyMod
'
%
expectvalue /Class
doit
PyMod category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyMult
expectvalue /Class
doit
PyOperator subclass: 'PyMult'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyMult comment: 
'No class-specific documentation for PyMult, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyMult
'
%
expectvalue /Class
doit
PyMult category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyPow
expectvalue /Class
doit
PyOperator subclass: 'PyPow'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyPow comment: 
'No class-specific documentation for PyPow, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyPow
'
%
expectvalue /Class
doit
PyPow category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyRShift
expectvalue /Class
doit
PyOperator subclass: 'PyRShift'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyRShift comment: 
'No class-specific documentation for PyRShift, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PyRShift
'
%
expectvalue /Class
doit
PyRShift category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySub
expectvalue /Class
doit
PyOperator subclass: 'PySub'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySub comment: 
'No class-specific documentation for PySub, hierarchy is: 
Object
  PyAstNode( parent)
    PyOperator
      PySub
'
%
expectvalue /Class
doit
PySub category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySliceAbstract
expectvalue /Class
doit
PyAstNode subclass: 'PySliceAbstract'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySliceAbstract comment: 
'No class-specific documentation for PySliceAbstract, hierarchy is: 
Object
  PyAstNode( parent)
    PySliceAbstract
'
%
expectvalue /Class
doit
PySliceAbstract category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExtSlice
expectvalue /Class
doit
PySliceAbstract subclass: 'PyExtSlice'
  instVarNames: #( dims)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyExtSlice comment: 
'No class-specific documentation for PyExtSlice, hierarchy is: 
Object
  PyAstNode( parent)
    PySliceAbstract
      PyExtSlice( dims)
'
%
expectvalue /Class
doit
PyExtSlice category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIndex
expectvalue /Class
doit
PySliceAbstract subclass: 'PyIndex'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyIndex comment: 
'No class-specific documentation for PyIndex, hierarchy is: 
Object
  PyAstNode( parent)
    PySliceAbstract
      PyIndex( value)
'
%
expectvalue /Class
doit
PyIndex category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySlice
expectvalue /Class
doit
PySliceAbstract subclass: 'PySlice'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySlice comment: 
'No class-specific documentation for PySlice, hierarchy is: 
Object
  PyAstNode( parent)
    PySliceAbstract
      PySlice( lower upper step)
'
%
expectvalue /Class
doit
PySlice category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySuite
expectvalue /Class
doit
PyAstNode subclass: 'PySuite'
  instVarNames: #( body)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySuite comment: 
'No class-specific documentation for PySuite, hierarchy is: 
Object
  PyAstNode( parent)
    PySuite( body variables)
'
%
expectvalue /Class
doit
PySuite category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBlock
expectvalue /Class
doit
PySuite subclass: 'PyBlock'
  instVarNames: #( variables)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyBlock comment: 
'A Python program is constructed from code blocks. A block is a piece of Python program text that is executed as a unit. The following are blocks: a module, a function body, and a class definition. Each command typed interactively is a block. A script file (a file given as standard input to the interpreter or specified as a command line argument to the interpreter) is a code block. A script command (a command specified on the interpreter command line with the -c option) is a code block. The string argument passed to the built-in functions eval() and exec() is a code block.

A code block is executed in an execution frame. A frame contains some administrative information (used for debugging) and determines where and how execution continues after the code block’s execution has completed.


https://docs.python.org/3/reference/executionmodel.html'
%
expectvalue /Class
doit
PyBlock category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for GlobalScope
expectvalue /Class
doit
PyBlock subclass: 'GlobalScope'
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
PyBlock subclass: 'LocalScope'
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
! ------------------- Class definition for PyWithItem
expectvalue /Class
doit
PyAstNode subclass: 'PyWithItem'
  instVarNames: #( context_expr optional_vars)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PyWithItem comment: 
'No class-specific documentation for PyWithItem, hierarchy is: 
Object
  PyAstNode( parent)
    PyWithItem( context_expr optional_vars)
'
%
expectvalue /Class
doit
PyWithItem category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySystem
expectvalue /Class
doit
Object subclass: 'PySystem'
  instVarNames: #( modules)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%
expectvalue /Class
doit
PySystem category: 'Parser'
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

input BreakNotification.gs
input BuiltinModule.gs
input Builtins.gs
input BuiltinsTestCase.gs
input ByteLiteralsTestCase.gs
input CancelNotification.gs
input Complex.gs
input CompoundStatementsTestCase.gs
input ContinueNotification.gs
input DelimitersTestCase.gs
input EvaluateTestCase.gs
input GlobalScope.gs
input LocalScope.gs
input NumericLiteralsTestCase.gs
input OperatorsTestCase.gs
input Py_List.gs
input Py_String.gs
input Py_Tuple.gs
input PyAdd.gs
input PyAlias.gs
input PyAnd.gs
input PyAnnAssign.gs
input PyArg.gs
input PyArguments.gs
input PyAssert.gs
input PyAssign.gs
input PyAstNode.gs
input PyAstNodeWithLocation.gs
input PyAsyncFor.gs
input PyAsyncFunctionDef.gs
input PyAsyncWith.gs
input PyAttribute.gs
input PyAugAssign.gs
input PyAugLoad.gs
input PyAugStore.gs
input PyAwait.gs
input PyBinOp.gs
input PyBitAnd.gs
input PyBitOr.gs
input PyBitXor.gs
input PyBlock.gs
input PyBoolOp.gs
input PyBreak.gs
input PyBytes.gs
input PyCall.gs
input PyClassDef.gs
input PyCmpOp.gs
input PyCompare.gs
input PyComprehension.gs
input PyConstant.gs
input PyContinue.gs
input PyDel.gs
input PyDelete.gs
input PyDict.gs
input PyDictComp.gs
input PyDiv.gs
input PyEllipsis.gs
input PyEq.gs
input PyExceptHandler.gs
input PyExpr.gs
input PyExpression.gs
input PyExpressionContext.gs
input PyExtSlice.gs
input PyFalse.gs
input PyFloorDiv.gs
input PyFor.gs
input PyFormattedValue.gs
input PyFunctionDef.gs
input PyGeneratorExp.gs
input PyGlobal.gs
input PyGt.gs
input PyGtE.gs
input PyIf.gs
input PyIfExp.gs
input PyImport.gs
input PyImportFrom.gs
input PyIn.gs
input PyIndex.gs
input PyInvert.gs
input PyIs.gs
input PyIsNot.gs
input PyJoinedStr.gs
input PyKeyword.gs
input PyLambda.gs
input PyList.gs
input PyListComp.gs
input PyLoad.gs
input PyLShift.gs
input PyLt.gs
input PyLtE.gs
input PyMatMult.gs
input PyMod.gs
input PyModule.gs
input PyMult.gs
input PyName.gs
input PyNameConstant.gs
input PyNamedExpr.gs
input PyNone.gs
input PyNonlocal.gs
input PyNot.gs
input PyNotEq.gs
input PyNotIn.gs
input PyNum.gs
input PyOperator.gs
input PyOr.gs
input PyParam.gs
input PyPass.gs
input PyPow.gs
input PyRaise.gs
input PyRandom.gs
input PyReturn.gs
input PyRShift.gs
input PySet.gs
input PySetComp.gs
input PySlice.gs
input PySliceAbstract.gs
input PyStarred.gs
input PyStatement.gs
input PyStore.gs
input PyStr.gs
input PySub.gs
input PySubscript.gs
input PySuite.gs
input PySystem.gs
input PythonTestCase.gs
input PythonTestResource.gs
input PyTrue.gs
input PyTry.gs
input PyTuple.gs
input PyUAdd.gs
input PyUnaryOp.gs
input PyUSub.gs
input PyWhile.gs
input PyWith.gs
input PyWithItem.gs
input PyYield.gs
input PyYieldFrom.gs
input SimpleStatementsTestCase.gs
input StringLiteralsTestCase.gs
input Sys.gs
input SysTestCase.gs
input Time.gs
input TimeTestCase.gs
input UserInteraction.gs
input VariableTestCase.gs
