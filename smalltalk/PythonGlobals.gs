! ------- Create dictionary if it is not present
run
| aSymbol names userProfile |
aSymbol := #'PythonGlobals'.
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #( disallowGciStore)

%
expectvalue /Class
doit
ContinueNotification category: 'Builtins'
%
set compile_env: 0
! ------------------- Class definition for Builtins
expectvalue /Class
doit
Object subclass: 'Builtins'
  instVarNames: #()
  classVars: #()
  classInstVars: #( current default)
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
Builtins category: 'Builtins'
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
  instVarNames: #( name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  instVarNames: #( arg annotation)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( op values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyBoolOp category: 'Parser'
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNameConstant category: 'Parser'
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( op operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyUnaryOp category: 'Parser'
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( name args body
                    decorator_list returns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyWith category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyBoolop
expectvalue /Class
doit
PyAstNode subclass: 'PyBoolop'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyBoolop category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyAnd
expectvalue /Class
doit
PyBoolop subclass: 'PyAnd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyAnd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyOr
expectvalue /Class
doit
PyBoolop subclass: 'PyOr'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyOr category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyCmpop
expectvalue /Class
doit
PyAstNode subclass: 'PyCmpop'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyCmpop category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyEq
expectvalue /Class
doit
PyCmpop subclass: 'PyEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyEq comment: 
'No class-specific documentation for PyEq, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyGt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGt comment: 
'No class-specific documentation for PyGt, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyGtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGtE comment: 
'No class-specific documentation for PyGtE, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIn comment: 
'No class-specific documentation for PyIn, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyIs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIs comment: 
'No class-specific documentation for PyIs, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyIsNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIsNot comment: 
'No class-specific documentation for PyIsNot, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyLt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLt comment: 
'No class-specific documentation for PyLt, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyLtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLtE comment: 
'No class-specific documentation for PyLtE, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
PyCmpop subclass: 'PyNotEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNotEq category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNotIn
expectvalue /Class
doit
PyCmpop subclass: 'PyNotIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNotIn comment: 
'No class-specific documentation for PyNotIn, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  instVarNames: #( globals name path
                    source statements stream)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyModule comment: 
'A Module is a file containing PythonGlobals definitions and statements. When a file (''script'') is executed from the command line, (e.g., ''python myFile.py''), the module global variable `__name__` is set to ''__main__''. A Module can be imported into another module using the `Import` command, and the module global variable `__name__` is then the name of the file.

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PySub category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for Pyslice
expectvalue /Class
doit
PyAstNode subclass: 'Pyslice'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
Pyslice category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyExtSlice
expectvalue /Class
doit
Pyslice subclass: 'PyExtSlice'
  instVarNames: #( dims)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyExtSlice category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyIndex
expectvalue /Class
doit
Pyslice subclass: 'PyIndex'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIndex category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PySlice
expectvalue /Class
doit
Pyslice subclass: 'PySlice'
  instVarNames: #( lower upper step)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PySlice category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUnaryop
expectvalue /Class
doit
PyAstNode subclass: 'PyUnaryop'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyUnaryop category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyInvert
expectvalue /Class
doit
PyUnaryop subclass: 'PyInvert'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyInvert category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyNot
expectvalue /Class
doit
PyUnaryop subclass: 'PyNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNot category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUAdd
expectvalue /Class
doit
PyUnaryop subclass: 'PyUAdd'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyUAdd category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyUSub
expectvalue /Class
doit
PyUnaryop subclass: 'PyUSub'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyUSub category: 'Parser'
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
  inDictionary: PythonGlobals
  options: #()

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
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PySystem category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PyToken
expectvalue /Class
doit
Object subclass: 'PyToken'
  instVarNames: #( startLine startColumn stopLine
                    stopColumn name string)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyToken comment: 
'No class-specific documentation for Token, hierarchy is:
Object
  Token( start stop name string)
'
%
expectvalue /Class
doit
PyToken category: 'Parser'
%
set compile_env: 0
! ------------------- Class definition for PythonTestCase
expectvalue /Class
doit
TestCase subclass: 'PythonTestCase'
  instVarNames: #( statements)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
! ------------------- Class definition for NumericLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumericLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
NumericLiteralsTestCase category: 'Tests'
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
  inDictionary: PythonGlobals
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
! ------------------- Class definition for UserInteraction
expectvalue /Class
doit
Object subclass: 'UserInteraction'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
UserInteraction category: 'Builtins'
%

input BreakNotification.gs
input CancelNotification.gs
input ContinueNotification.gs
input Builtins.gs
input Py_List.gs
input Py_Tuple.gs
input Py_String.gs
input Complex.gs
input PyAstNode.gs
input PyAlias.gs
input PyArguments.gs
input PyAstNodeWithLocation.gs
input PyArg.gs
input PyExceptHandler.gs
input PyExpression.gs
input PyAttribute.gs
input PyAwait.gs
input PyBinOp.gs
input PyBoolOp.gs
input PyBytes.gs
input PyCall.gs
input PyCompare.gs
input PyConstant.gs
input PyDict.gs
input PyDictComp.gs
input PyEllipsis.gs
input PyFormattedValue.gs
input PyGeneratorExp.gs
input PyIfExp.gs
input PyJoinedStr.gs
input PyLambda.gs
input PyList.gs
input PyListComp.gs
input PyName.gs
input PyNameConstant.gs
input PyNum.gs
input PySet.gs
input PySetComp.gs
input PyStarred.gs
input PyStr.gs
input PySubscript.gs
input PyTuple.gs
input PyUnaryOp.gs
input PyYield.gs
input PyYieldFrom.gs
input PyStatement.gs
input PyAnnAssign.gs
input PyAssert.gs
input PyAssign.gs
input PyAsyncFor.gs
input PyAsyncFunctionDef.gs
input PyAsyncWith.gs
input PyAugAssign.gs
input PyBreak.gs
input PyClassDef.gs
input PyContinue.gs
input PyDelete.gs
input PyExpr.gs
input PyFor.gs
input PyFunctionDef.gs
input PyGlobal.gs
input PyIf.gs
input PyImport.gs
input PyImportFrom.gs
input PyNonlocal.gs
input PyPass.gs
input PyRaise.gs
input PyReturn.gs
input PyTry.gs
input PyWhile.gs
input PyWith.gs
input PyBoolop.gs
input PyAnd.gs
input PyOr.gs
input PyCmpop.gs
input PyEq.gs
input PyGt.gs
input PyGtE.gs
input PyIn.gs
input PyIs.gs
input PyIsNot.gs
input PyLt.gs
input PyLtE.gs
input PyNotEq.gs
input PyNotIn.gs
input PyComprehension.gs
input PyExpressionContext.gs
input PyAugLoad.gs
input PyAugStore.gs
input PyDel.gs
input PyLoad.gs
input PyParam.gs
input PyStore.gs
input PyKeyword.gs
input PyModule.gs
input PyRandom.gs
input PyOperator.gs
input PyAdd.gs
input PyBitAnd.gs
input PyBitOr.gs
input PyBitXor.gs
input PyDiv.gs
input PyFloorDiv.gs
input PyLShift.gs
input PyMatMult.gs
input PyMod.gs
input PyMult.gs
input PyPow.gs
input PyRShift.gs
input PySub.gs
input Pyslice.gs
input PyExtSlice.gs
input PyIndex.gs
input PySlice.gs
input PyUnaryop.gs
input PyInvert.gs
input PyNot.gs
input PyUAdd.gs
input PyUSub.gs
input PyWithItem.gs
input PySystem.gs
input PyToken.gs
input PythonTestCase.gs
input NumericLiteralsTestCase.gs
input StringLiteralsTestCase.gs
input UserInteraction.gs
