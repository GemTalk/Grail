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
  classVars: #( escapeCharacters)
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
  inDictionary: PythonGlobals
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
  instVarNames: #( op values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyName comment: 
'No class-specific documentation for PyName, hierarchy is: 
Object
  PyAstNode( parent)
    PyAstNodeWithLocation( line column)
      PyExpression
        PyName( id ctx)
'
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  instVarNames: #( op operand)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
PyBoolop comment: 
'No class-specific documentation for PyBoolop, hierarchy is: 
Object
  PyAstNode( parent)
    PyBoolop
'
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
PyCmpop comment: 
'No class-specific documentation for PyCmpop, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
'
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
PyNotEq comment: 
'No class-specific documentation for PyNotEq, hierarchy is: 
Object
  PyAstNode( parent)
    PyCmpop
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
  inDictionary: PythonGlobals
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
Pyslice comment: 
'No class-specific documentation for Pyslice, hierarchy is: 
Object
  PyAstNode( parent)
    Pyslice
'
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
PyExtSlice comment: 
'No class-specific documentation for PyExtSlice, hierarchy is: 
Object
  PyAstNode( parent)
    Pyslice
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
PyIndex comment: 
'No class-specific documentation for PyIndex, hierarchy is: 
Object
  PyAstNode( parent)
    Pyslice
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
PySlice comment: 
'No class-specific documentation for PySlice, hierarchy is: 
Object
  PyAstNode( parent)
    Pyslice
      PySlice( lower upper step)
'
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
PyUnaryop comment: 
'No class-specific documentation for PyUnaryop, hierarchy is: 
Object
  PyAstNode( parent)
    PyUnaryop
'
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
! ------------------- Class definition for ByteLiteralsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ByteLiteralsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
ByteLiteralsTestCase category: 'Tests'
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
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
DelimitersTestCase category: 'Tests'
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
! ------------------- Class definition for OperatorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OperatorsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
OperatorsTestCase category: 'Tests'
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

! ------------------- Remove existing behavior from BreakNotification
expectvalue /Metaclass3       
doit
BreakNotification removeAllMethods.
BreakNotification class removeAllMethods.
%
! ------------------- Class methods for BreakNotification
! ------------------- Instance methods for BreakNotification

! ------------------- Remove existing behavior from CancelNotification
expectvalue /Metaclass3       
doit
CancelNotification removeAllMethods.
CancelNotification class removeAllMethods.
%
! ------------------- Class methods for CancelNotification
! ------------------- Instance methods for CancelNotification

! ------------------- Remove existing behavior from ContinueNotification
expectvalue /Metaclass3       
doit
ContinueNotification removeAllMethods.
ContinueNotification class removeAllMethods.
%
! ------------------- Class methods for ContinueNotification
! ------------------- Instance methods for ContinueNotification

! ------------------- Remove existing behavior from Builtins
expectvalue /Metaclass3       
doit
Builtins removeAllMethods.
Builtins class removeAllMethods.
%
! ------------------- Class methods for Builtins
set compile_env: 0
category: 'other'
classmethod: Builtins
current

	current ifNil: [current := self default].
	^current
%
category: 'other'
classmethod: Builtins
current: anObject

	current := anObject.
%
category: 'other'
classmethod: Builtins
default

	default ifNil: [default := self new].
	^default
%
! ------------------- Instance methods for Builtins
set compile_env: 0
category: 'functions'
method: Builtins
__import__: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
__import__(name, globals=None, locals=None, fromlist=(), level=0)
Note This is an advanced function that is not needed in everyday 
Python programming, unlike importlib.import_module().
This function is invoked by the import statement. It can be replaced
 (by importing the builtins module and assigning to builtins.__import__) 
in order to change semantics of the import statement, but doing so is 
strongly discouraged as it is usually simpler to use import hooks (see PEP 302)
 to attain the same goals and does not cause issues with code which assumes 
the default import implementation is in use. Direct use of __import__() is 
also discouraged in favor of importlib.import_module().

The function imports the module name, potentially using the given globals
 and locals to determine how to interpret the name in a package context.
 The fromlist gives the names of objects or submodules that should be
 imported from the module given by name. The standard implementation
 does not use its locals argument at all, and uses its globals only to determine
\ the package context of the import statement.

level specifies whether to use absolute or relative imports. 0 (the default) 
means only perform absolute imports. Positive values for level indicate the 
number of parent directories to search relative to the directory of the module 
calling __import__() (see PEP 328 for the details).


When the name variable is of the form package.module, normally, the top
-level package (the name up till the first dot) is returned, not the module 
named by name. However, when a non-empty fromlist argument is given,
 the module named by name is returned.

For example, the statement import spam results in bytecode resembling 
the following code:

spam = __import__('spam', globals(), locals(), [], 0)
The statement import spam.ham results in this call:

spam = __import__('spam.ham', globals(), locals(), [], 0)
Note how __import__() returns the toplevel module here because 
this is the object that is bound to a name by the import statement.

On the other hand, the statement from spam.ham import eggs, sausage as saus results in

_temp = __import__('spam.ham', globals(), locals(), ['eggs', 'sausage'], 0)
eggs = _temp.eggs
saus = _temp.sausage
Here, the spam.ham module is returned from __import__(). From this 
object, the names to import are retrieved and assigned to their respective names.

If you simply want to import a module (potentially within a package) 
by name, use importlib.import_module().

Changed in version 3.3: Negative values for level are no longer 
supported (which also changes the default value to 0).
"
self halt.
%
category: 'functions'
method: Builtins
abs: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html#abs"
	
	^arguments first abs
%
category: 'functions'
method: Builtins
all: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
all(iterable)
Return True if all elements of the iterable are true (or if the iterable is empty). Equivalent to:

def all(iterable):
    for element in iterable:
        if not element:
            return False
    return True
"
	^arguments allSatisfy: [:each | each]
%
category: 'functions'
method: Builtins
any: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
any(iterable)
Return True if any element of the iterable is true. If the iterable is empty, return False. Equivalent to:

def any(iterable):
    for element in iterable:
        if element:
            return True
    return False
"
	^arguments anySatisfy: [:each | each]
%
category: 'functions'
method: Builtins
ascii: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
ascii(object)
As repr(), return a string containing a printable representation of an object, 
but escape the non-ASCII characters in the string returned by repr() using 
\x, \u or \U escapes. This generates a string similar to that returned by repr() in Python 2.
"
self halt.
%
category: 'functions'
method: Builtins
bin: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
bin(x)
Convert an integer number to a binary string prefixed with “0b”. 
The result is a valid Python expression. If x is not a Python int object,
 it has to define an __index__() method that returns an integer. Some examples:

>>> bin(3)
'0b11'
>>> bin(-10)
'-0b1010'
If prefix “0b” is desired or not, you can use either of the following ways.

>>> format(14, '#b'), format(14, 'b')
('0b1110', '1110')
>>> f'{14:#b}', f'{14:b}'
('0b1110', '1110')
See also format() for more information.
"
	^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0b' , (arguments first abs printStringRadix: 2)
%
category: 'functions'
method: Builtins
bool: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class bool([x])
Return a Boolean value, i.e. one of True or False. 
x is converted using the standard truth testing procedure. 
If x is false or omitted, this returns False; otherwise it returns True.
The bool class is a subclass of int (see Numeric Types — int, float, complex). 
It cannot be subclassed further. Its only instances are False and True (see Boolean Values).

Changed in version 3.7: x is now a positional-only parameter.
"
self halt.
%
category: 'functions'
method: Builtins
breakpoint: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
breakpoint(*args, **kws)
This function drops you into the debugger at the call site. 
Specifically, it calls sys.breakpointhook(), passing args and
 kws straight through. By default, sys.breakpointhook() 
calls pdb.set_trace() expecting no arguments. In this case, 
it is purely a convenience function so you don’t 
have to explicitly import pdb or type as much code to enter the
 debugger. However, sys.breakpointhook() can be set
 to some other function and breakpoint() will automatically 
call that, allowing you to drop into the debugger of choice.

New in version 3.7.
"
self halt.
%
category: 'functions'
method: Builtins
bytearray: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class bytearray([source[, encoding[, errors]]])
Return a new array of bytes. The bytearray class is a 
mutable sequence of integers in the range 0 <= x < 256.
 It has most of the usual methods of mutable sequences, 
described in Mutable Sequence Types, as well as most methods
 that the bytes type has, see Bytes and Bytearray Operations.

The optional source parameter can be used to initialize the array in a few different ways:

If it is a string, you must also give the encoding (and optionally, errors) 
parameters; bytearray() then converts the string to bytes using str.encode().
If it is an integer, the array will have that size and will be initialized with null bytes.
If it is an object conforming to the buffer interface, a read-only buffer of the object
 will be used to initialize the bytes array.
If it is an iterable, it must be an iterable of integers in the range 0 <= x < 256, 
which are used as the initial contents of the array.
Without an argument, an array of size 0 is created.

See also Binary Sequence Types — bytes, bytearray, memoryview and Bytearray Objects.
"
self halt.
%
category: 'functions'
method: Builtins
bytes: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class bytes([source[, encoding[, errors]]])
Return a new “bytes” object, which is an immutable
 sequence of integers in the range 0 <= x < 256. bytes is 
an immutable version of bytearray – it has the same
 non-mutating methods and the same indexing and slicing behavior.

Accordingly, constructor arguments are interpreted as for bytearray().

Bytes objects can also be created with literals, see String and Bytes literals.

See also Binary Sequence Types — bytes, bytearray, memoryview,
 Bytes Objects, and Bytes and Bytearray Operations.
"
self halt.
%
category: 'functions'
method: Builtins
call: mySelector arguments: myArguments keywords: myKeywords

	^self perform: mySelector with: myArguments with: myKeywords.
%
category: 'functions'
method: Builtins
callable: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
callable(object)
Return True if the object argument appears callable, 
False if not. If this returns true, it is still possible that a
 call fails, but if it is false, calling object will never succeed. 
Note that classes are callable (calling a class returns a new instance);
 instances are callable if their class has a __call__() method.

New in version 3.2: This function was first removed in Python 3.0 
and then brought back in Python 3.2.
"
self halt.
%
category: 'functions'
method: Builtins
chr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
chr(i)
Return the string representing a character whose Unicode code point is the integer i. 
For example, chr(97) returns the string 'a', while chr(8364) returns the string '€'. 
This is the inverse of ord().

The valid range for the argument is from 0 through 1,114,111 (0x10FFFF in base 16).
 ValueError will be raised if i is outside that range.
"
	^(Character codePoint: arguments first) asString
%
category: 'functions'
method: Builtins
classmethod: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
@classmethod
Transform a method into a class method.

A class method receives the class as implicit first argument,
 just like an instance method receives the instance. To declare a class method, use this idiom:

class C:
    @classmethod
    def f(cls, arg1, arg2, ...): ...
The @classmethod form is a function decorator – see Function definitions for details.

A class method can be called either on the class 
(such as C.f()) or on an instance (such as C().f()). 
The instance is ignored except for its class. 
If a class method is called for a derived class, the derived class object is passed as the implied first argument.

Class methods are different than C++ or Java static methods. If you want those, see staticmethod().

For more information on class methods, see The standard type hierarchy.
"
self halt.
%
category: 'functions'
method: Builtins
compile: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
compile(source, filename, mode, flags=0, dont_inherit=False, optimize=-1)
Compile the source into a code or AST object. Code objects can be executed by exec() or 
eval(). source can either be a normal string, a byte string, or an AST object. Refer to the
 ast module documentation for information on how to work with AST objects.

The filename argument should give the file from which the code was read; 
pass some recognizable value if it wasn’t read from a file ('<string>' is commonly used).

The mode argument specifies what kind of code must be compiled; it can be 'exec' 
if source consists of a sequence of statements, 'eval' if it consists of a single expression, 
or 'single' if it consists of a single interactive statement (in the latter case, expression 
statements that evaluate to something other than None will be printed).

The optional arguments flags and dont_inherit control which future statements 
affect the compilation of source. If neither is present (or both are zero) the code 
is compiled with those future statements that are in effect in the code that is calling 
compile(). If the flags argument is given and dont_inherit is not (or is zero) 
then the future statements specified by the flags argument are used in addition 
to those that would be used anyway. If dont_inherit is a non-zero integer then 
the flags argument is it – the future statements in effect around the call to compile are ignored.

Future statements are specified by bits which can be bitwise ORed together 
to specify multiple statements. The bitfield required to specify a given feature
 can be found as the compiler_flag attribute on the _Feature instance in the __future__ module.

The argument optimize specifies the optimization level of the compiler; 
the default value of -1 selects the optimization level of the interpreter as 
given by -O options. Explicit levels are 0 (no optimization; __debug__ is true), 
1 (asserts are removed, __debug__ is false) or 2 (docstrings are removed too).

This function raises SyntaxError if the compiled source is invalid, and ValueError
 if the source contains null bytes.

If you want to parse Python code into its AST representation, see ast.parse().

Note When compiling a string with multi-line code in 'single' or 'eval' mode, input 
must be terminated by at least one newline character. 
This is to facilitate detection of incomplete and complete statements in the code module.
Warning It is possible to crash the Python interpreter with a
 sufficiently large/complex string when compiling to an AST object 
due to stack depth limitations in Python’s AST compiler.
Changed in version 3.2: Allowed use of Windows and Mac newlines. 
Also input in 'exec' mode does not have to end in a newline anymore. Added the optimize parameter.

Changed in version 3.5: Previously, TypeError was raised when null bytes were encountered in source.
"
self halt.
%
category: 'functions'
method: Builtins
complex: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class complex([real[, imag]])
Return a complex number with the value real + imag*1j or
 convert a string or number to a complex number. If the first 
parameter is a string, it will be interpreted as a complex number 
and the function must be called without a second parameter. 
The second parameter can never be a string. Each argument 
may be any numeric type (including complex). If imag is omitted, 
it defaults to zero and the constructor serves as a numeric conversion
 like int and float. If both arguments are omitted, returns 0j.

Note When converting from a string, the string must not contain
 whitespace around the central + or - operator. For example, 
complex('1+2j') is fine, but complex('1 + 2j') raises ValueError.
The complex type is described in Numeric Types — int, float, complex.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.
"

^Complex real: arguments first imag: arguments second.
%
category: 'functions'
method: Builtins
delattr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
delattr(object, name)
This is a relative of setattr(). The arguments are an object and a string. 
The string must be the name of one of the object’s attributes. The function 
deletes the named attribute, provided the object allows it. 
For example, delattr(x, 'foobar') is equivalent to del x.foobar.
"
self halt.
%
category: 'functions'
method: Builtins
dict: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class dict(**kwarg)
class dict(mapping, **kwarg)
class dict(iterable, **kwarg)
Create a new dictionary. The dict object is the dictionary class.
 See dict and Mapping Types — dict for documentation about this class.

For other containers see the built-in list, set, and tuple classes, as well as the collections module.
"

	arguments notEmpty ifTrue: [
		(arguments first isKindOf: Dictionary) ifTrue: [
			arguments first keysAndValuesDo: [:eachKey :eachValue | 
				keywords at: eachKey evaluate put: eachValue evaluate.
			]
		] ifFalse: [
			arguments first do: [ :each | 
				keywords at: (each at: 1) put: (each at: 2).
			]
		].
	].
	^keywords
%
category: 'functions'
method: Builtins
dir: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
dir([object])
Without arguments, return the list of names in the current local scope. 
With an argument, attempt to return a list of valid attributes for that object.

If the object has a method named __dir__(), this method will be called 
and must return the list of attributes. This allows objects that implement 
a custom __getattr__() or __getattribute__() function to customize
 the way dir() reports their attributes.

If the object does not provide __dir__(), the function tries its best 
to gather information from the object’s __dict__ attribute, if defined, 
and from its type object. The resulting list is not necessarily complete,
 and may be inaccurate when the object has a custom __getattr__().

The default dir() mechanism behaves differently with different types of 
objects, as it attempts to produce the most relevant, rather than complete, information:

If the object is a module object, the list contains the names of the module’s attributes.
If the object is a type or class object, the list contains the names of its attributes, 
and recursively of the attributes of its bases.
Otherwise, the list contains the object’s attributes’ names, the names 
of its class’s attributes, and recursively of the attributes of its class’s base classes.
The resulting list is sorted alphabetically. For example:

>>> import struct
>>> dir()   # show the names in the module namespace  # doctest: +SKIP
['__builtins__', '__name__', 'struct']
>>> dir(struct)   # show the names in the struct module # doctest: +SKIP
['Struct', '__all__', '__builtins__', '__cached__', '__doc__', '__file__',
 '__initializing__', '__loader__', '__name__', '__package__',
 '_clearcache', 'calcsize', 'error', 'pack', 'pack_into',
 'unpack', 'unpack_from']
>>> class Shape:
...     def __dir__(self):
...         return ['area', 'perimeter', 'location']
>>> s = Shape()
>>> dir(s)
['area', 'location', 'perimeter']
Note Because dir() is supplied primarily as a convenience for use 
at an interactive prompt, it tries to supply an interesting set of
 names more than it tries to supply a rigorously or consistently 
defined set of names, and its detailed behavior may change across
 releases. For example, metaclass attributes are not in the result list 
when the argument is a class.

"
self halt.
%
category: 'functions'
method: Builtins
divmod: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
divmod(a, b)
Take two (non complex) numbers as arguments and return 
a pair of numbers consisting of their quotient and remainder 
when using integer division. With mixed operand types,
 the rules for binary arithmetic operators apply. For integers, 
the result is the same as (a // b, a % b). For floating point numbers 
the result is (q, a % b), where q is usually math.floor(a / b) but may be 
1 less than that. In any case q * b + a % b is very close to a, if a % b is 
non-zero it has the same sign as b, and 0 <= abs(a % b) < abs(b).
"

"May need some improvements for floating point or negative numbers"
| a b q r |
a := arguments first.
b := arguments second.
q := (a / b) floor.
r := a - (b * q).
^(Array with: q with: r) immediateInvariant
%
category: 'functions'
method: Builtins
enumerate: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
enumerate(iterable, start=0)
Return an enumerate object. iterable must be a 
sequence, an iterator, or some other object which 
supports iteration. The __next__() method of the
 iterator returned by enumerate() returns a tuple 
containing a count (from start which defaults to 0) 
and the values obtained from iterating over iterable.

>>> seasons = ['Spring', 'Summer', 'Fall', 'Winter']
>>> list(enumerate(seasons))
[(0, 'Spring'), (1, 'Summer'), (2, 'Fall'), (3, 'Winter')]
>>> list(enumerate(seasons, start=1))
[(1, 'Spring'), (2, 'Summer'), (3, 'Fall'), (4, 'Winter')]
Equivalent to:

def enumerate(sequence, start=0):
    n = start
    for elem in sequence:
        yield n, elem
        n += 1
"
self halt.
%
category: 'functions'
method: Builtins
eval: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
eval(expression, globals=None, locals=None)
The arguments are a string and optional globals and locals.
 If provided, globals must be a dictionary. If provided, locals can be any mapping object.

The expression argument is parsed and evaluated as a Python
 expression (technically speaking, a condition list) using the
 globals and locals dictionaries as global and local namespace. 
If the globals dictionary is present and does not contain a value
 for the key __builtins__, a reference to the dictionary of the built-in
 module builtins is inserted under that key before expression is parsed. 
This means that expression normally has full access to the standard 
builtins module and restricted environments are propagated. 
If the locals dictionary is omitted it defaults to the globals dictionary.
 If both dictionaries are omitted, the expression is executed in the 
environment where eval() is called. The return value is the result of
 the evaluated expression. Syntax errors are reported as exceptions. Example:

>>> x = 1
>>> eval('x+1')
2
This function can also be used to execute arbitrary code objects
 (such as those created by compile()). In this case pass a code object 
instead of a string. If the code object has been compiled with 'exec' as 
the mode argument, eval()’s return value will be None.

Hints: dynamic execution of statements is supported by the exec() function. 
The globals() and locals() functions returns the current global and local dictionary, 
respectively, which may be useful to pass around for use by eval() or exec().

See ast.literal_eval() for a function that can safely evaluate strings with expressions containing only literals.
"
self halt.
%
category: 'functions'
method: Builtins
exec: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
exec(object[, globals[, locals]])
This function supports dynamic execution of Python code. 
object must be either a string or a code object. If it is a string,
 the string is parsed as a suite of Python statements which is
 then executed (unless a syntax error occurs). 1 If it is a code
 object, it is simply executed. In all cases, the code that’s 
executed is expected to be valid as file input (see the section
 “File input” in the Reference Manual). Be aware that the return 
and yield statements may not be used outside of function definitions 
even within the context of code passed to the exec() function. The return value is None.

In all cases, if the optional parts are omitted, the code is executed 
in the current scope. If only globals is provided, it must be a dictionary,
 which will be used for both the global and the local variables. 
If globals and locals are given, they are used for the global and
 local variables, respectively. If provided, locals can be any mapping object.
 Remember that at module level, globals and locals are the same dictionary.
 If exec gets two separate objects as globals and locals, the code will be
 executed as if it were embedded in a class definition.

If the globals dictionary does not contain a value for the key
 __builtins__, a reference to the dictionary of the built-in module
 builtins is inserted under that key. That way you can control
 what builtins are available to the executed code by inserting 
your own __builtins__ dictionary into globals before passing it to exec().

Note The built-in functions globals() and locals() return the 
current global and local dictionary, respectively, which may
 be useful to pass around for use as the second and third argument to exec().
Note The default locals act as described for function locals() 
below: modifications to the default locals dictionary should not
 be attempted. Pass an explicit locals dictionary if you need to
 see effects of the code on locals after function exec() returns.
"
self halt.
%
category: 'functions'
method: Builtins
filter: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
filter(function, iterable)
Construct an iterator from those
 elements of iterable for which function 
returns true. iterable may be either a sequence, 
a container which supports iteration, or an iterator.
 If function is None, the identity function is assumed,
 that is, all elements of iterable that are false are removed.

Note that filter(function, iterable) is equivalent to the
 generator expression (item for item in iterable if function(item)) 
if function is not None and (item for item in iterable if item) if function is None.

See itertools.filterfalse() for the complementary function that 
returns elements of iterable for which function returns false.
"
self halt.
%
category: 'functions'
method: Builtins
float: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class float([x])
Return a floating point number constructed from a number or string x.

If the argument is a string, it should contain a decimal number,
 optionally preceded by a sign, and optionally embedded in whitespace.
 The optional sign may be '+' or '-'; a '+' sign has no effect on the value produced.
 The argument may also be a string representing a NaN (not-a-number),
 or a positive or negative infinity. More precisely, the input must conform 
to the following grammar after leading and trailing whitespace characters are removed:

sign           ::=  + | - (Got rid of ''')
infinity       ::=  Infinity | inf (I got rid of "")
nan            ::=  nan
numeric_value  ::=  floatnumber | infinity | nan
numeric_string ::=  [sign] numeric_value
Here floatnumber is the form of a Python floating-point literal,
 described in Floating point literals. Case is not significant, so, 
for example, “inf”, “Inf”, “INFINITY” and “iNfINity” are all acceptable spellings for positive infinity.

Otherwise, if the argument is an integer or a floating point number, 
a floating point number with the same value 
(within Python’s floating point precision) is returned. If the 
argument is outside the range of a Python float, an OverflowError will be raised.

For a general Python object x, float(x) delegates to x.__float__().

If no argument is given, 0.0 is returned.

Examples:

>>>
>>> float('+1.23')
1.23
>>> float('   -12345\n')
-12345.0
>>> float('1e-003')
0.001
>>> float('+1E6')
1000000.0
>>> float('-Infinity')
-inf
The float type is described in Numeric Types — int, float, complex.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.

Changed in version 3.7: x is now a positional-only parameter.
"
self halt.
%
category: 'functions'
method: Builtins
format: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
format(value[, format_spec])
Convert a value to a “formatted” representation,
 as controlled by format_spec. The interpretation 
of format_spec will depend on the type of the value 
argument, however there is a standard formatting
 syntax that is used by most built-in types: Format
 Specification Mini-Language.

The default format_spec is an empty string which 
usually gives the same effect as calling str(value).

A call to format(value, format_spec) is translated to
 type(value).__format__(value, format_spec) which 
bypasses the instance dictionary when searching for 
the value’s __format__() method. A TypeError exception
 is raised if the method search reaches object and the
 format_spec is non-empty, or if either the format_spec
 or the return value are not strings.

Changed in version 3.4: object().__format__(format_spec)
 raises TypeError if format_spec is not an empty string.
"
self halt.
%
category: 'functions'
method: Builtins
frozenset: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class frozenset([iterable])
Return a new frozenset object, optionally with 
\elements taken from iterable. frozenset is a
 built-in class. See frozenset and Set Types — 
set, frozenset for documentation about this class.

For other containers see the built-in set, list, tuple,
\ and dict classes, as well as the collections module.
"
self halt.
%
category: 'functions'
method: Builtins
getattr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
getattr(object, name[, default])
Return the value of the named attribute of object.
 name must be a string. If the string is the name 
of one of the object’s attributes, the result is the 
value of that attribute. For example, getattr(x, 'foobar')
 is equivalent to x.foobar. If the named attribute does not exist, 
default is returned if provided, otherwise AttributeError is raised.
"
self halt.
%
category: 'functions'
method: Builtins
globals: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
globals()
Return a dictionary representing the current global symbol table. 
This is always the dictionary of the current module (inside a function or method,
 this is the module where it is defined, not the module from which it is called).
"
self halt.
%
category: 'functions'
method: Builtins
hasattr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
hasattr(object, name)
The arguments are an object and a string. 
The result is True if the string is the name of one 
of the object’s attributes, False if not.
 (This is implemented by calling getattr(object, name) 
and seeing whether it raises an AttributeError or not.)
"
self halt.
%
category: 'functions'
method: Builtins
hash: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
hash(object)
Return the hash value of the object (if it has one). Hash values are integers. 
They are used to quickly compare dictionary keys during a dictionary lookup.
 Numeric values that compare equal have the same hash value 
(even if they are of different types, as is the case for 1 and 1.0).

Note For objects with custom __hash__() methods, note that hash() 
truncates the return value based on the bit width of the host machine. 
See __hash__() for details.
"
	^arguments first hash
%
category: 'functions'
method: Builtins
help: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
help([object])
Invoke the built-in help system. 
(This function is intended for interactive use.) 
If no argument is given, the interactive help system starts 
on the interpreter console. If the argument is a string, then 
the string is looked up as the name of a module, function, class,
 method, keyword, or documentation topic, and a help page is 
printed on the console. If the argument is any other kind of object, 
a help page on the object is generated.

Note that if a slash(/) appears in the parameter list of a function, 
when invoking help(), it means that the parameters prior to the
 slash are positional-only. For more info, see the FAQ entry on positional-only parameters.

This function is added to the built-in namespace by the site module.

Changed in version 3.4: Changes to pydoc and inspect mean that
 the reported signatures for callables are now more comprehensive and consistent.
"
self halt.
%
category: 'functions'
method: Builtins
hex: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
hex(x)
Convert an integer number to a lowercase hexadecimal 
string prefixed with “0x”. If x is not a Python int object, it has to define an __index__() method that returns an integer. Some examples:

>>> hex(255)
'0xff'
>>> hex(-42)
'-0x2a'
If you want to convert an integer number to an uppercase or
 lower hexadecimal string with prefix or not, you can use either of the following ways:

>>> '%#x' % 255, '%x' % 255, '%X' % 255
('0xff', 'ff', 'FF')
>>> format(255, '#x'), format(255, 'x'), format(255, 'X')
('0xff', 'ff', 'FF')
>>> f'{255:#x}', f'{255:x}', f'{255:X}'
('0xff', 'ff', 'FF')
See also format() for more information.

See also int() for converting a hexadecimal string to
 an integer using a base of 16.

Note To obtain a hexadecimal string representation
 for a float, use the float.hex() method.
"

^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0x' , (arguments first abs asHexString)
%
category: 'functions'
method: Builtins
id: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
id(object)
Return the “identity” of an object. This is an integer which is guaranteed to 
be unique and constant for this object during its lifetime. Two objects with 
non-overlapping lifetimes may have the same id() value.

CPython implementation detail: This is the address of the object in memory.
"
self halt.
%
category: 'functions'
method: Builtins
input: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
input([prompt])
If the prompt argument is present, it is written to standard output 
without a trailing newline. The function then reads a line from input, 
converts it to a string (stripping a trailing newline), and returns that. 
When EOF is read, EOFError is raised. Example:

>>>
>>> s = input('--> ')  
--> Monty Python's Flying Circus
>>> s  
Monty Python's Flying Circus (took out qoutations)
If the readline module was loaded, then input() will use it to provide
 elaborate line editing and history features.
"
	| prompt result |
	prompt := arguments notEmpty
		ifTrue: [String withAll: arguments first]
		ifFalse: [''].
	result := UserInteraction new prompt: prompt.
	result ifNil: [CancelNotification signal].
	result := result decodeToString.
	self print: (Array with: arguments first with: (Py_String withAll: result)) keywords: keywords.
	^Py_String withAll: result
%
category: 'functions'
method: Builtins
int: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class int([x])
class int(x, base=10)
Return an integer object constructed from a number 
or string x, or return 0 if no arguments are given. If 
x defines __int__(), int(x) returns x.__int__(). If x 
defines __trunc__(), it returns x.__trunc__(). For 
floating point numbers, this truncates towards zero.

If x is not a number or if base is given, then x must be a 
string, bytes, or bytearray instance representing an integer
 literal in radix base. Optionally, the literal can be preceded 
by + or - (with no space in between) and surrounded by 
whitespace. A base-n literal consists of the digits 0 to n-1, 
with a to z (or A to Z) having values 10 to 35. The default base is 10. 
The allowed values are 0 and 2–36. Base-2, -8, and -16 literals can 
be optionally prefixed with 0b/0B, 0o/0O, or 0x/0X, as with integer 
literals in code. Base 0 means to interpret exactly as a code literal, 
so that the actual base is 2, 8, 10, or 16, and so that int('010', 0)
 is not legal, while int('010') is, as well as int('010', 8).

The integer type is described in Numeric Types — int, float, complex.

Changed in version 3.4: If base is not an instance of int and the 
base object has a base.__index__ method, that method is called 
to obtain an integer for the base. Previous versions used base.__int__ 
instead of base.__index__.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.

Changed in version 3.7: x is now a positional-only parameter.
"
	arguments isEmpty ifTrue: [^0].
	arguments size == 1 ifTrue: [
		| arg stream int |
		arg := arguments first.
		(arg isKindOf: Number) ifTrue: [^arg truncated].
		stream := ReadStream on: arg trimWhiteSpace.
		int := Integer fromStream: stream.
		stream position == stream contents size ifFalse: [self error: 'Invalid Literal'].
		^int
	].
	arguments size == 2 ifTrue: [
		| num rad |
		num := arguments first.
		rad := arguments second.
		rad == 0 ifTrue: [
			num first == $0 ifFalse: [self error: 'Number must begin with 0'].
			rad := #(2 8 16) at: ('BOX' indexOf: num second asUppercase).
			num := num copyFrom: 3 to: num size.
		].
		^Integer fromString: rad asString, 'r', num trimWhiteSpace.
	].
	self error: 'Too many arguments'.
%
category: 'functions'
method: Builtins
isinstance: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
isinstance(object, classinfo)¶
Return true if the object argument is an instance of the 
classinfo argument, or of a (direct, indirect or virtual) subclass
 thereof. If object is not an object of the given type, the function
 always returns false. If classinfo is a tuple of type objects 
(or recursively, other such tuples), return true if object is an
 instance of any of the types. If classinfo is not a type 
or tuple of types and such tuples, a TypeError exception is raised.
"
self halt.
%
category: 'functions'
method: Builtins
issubclass: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
issubclass(class, classinfo)
Return true if class is a subclass (direct, indirect or virtual) of classinfo.
 A class is considered a subclass of itself. classinfo may be a tuple of class 
objects, in which case every entry in classinfo will be checked. In any other
 case, a TypeError exception is raised.
"
self halt.
%
category: 'functions'
method: Builtins
iter: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
iter(object[, sentinel])
Return an iterator object. The first argument is interpreted 
very differently depending on the presence of the second argument. 
Without a second argument, object must be a collection object which
 supports the iteration protocol (the __iter__() method), or it must
 support the sequence protocol (the __getitem__() method with integer
 arguments starting at 0). If it does not support either of those protocols, 
TypeError is raised. If the second argument, sentinel, is given, then
 object must be a callable object. The iterator created in this case 
will call object with no arguments for each call to its __next__() method; 
if the value returned is equal to sentinel, StopIteration will be raised, 
otherwise the value will be returned.

See also Iterator Types.

One useful application of the second form of iter() is to build a 
block-reader. For example, reading fixed-width blocks from a 
binary database file until the end of file is reached:

from functools import partial
with open('mydata.db', 'rb') as f:
    for block in iter(partial(f.read, 64), b''):
        process_block(block)
"
self halt.
%
category: 'functions'
method: Builtins
len: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
len(s)
Return the length (the number of items) of an object. 
The argument may be a sequence (such as a string, bytes, tuple,
 list, or range) or a collection (such as a dictionary, set, or frozen set).

class list([iterable])
Rather than being a function, list is actually a mutable sequence 
type, as documented in Lists and Sequence Types — list, tuple, range.
"
self halt.
%
category: 'functions'
method: Builtins
list: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class list([iterable])
Rather than being a function, list is actually a 
mutable sequence type, as documented in Lists and 
Sequence Types — list, tuple, range.
"
	^Py_List withAll: arguments first
%
category: 'functions'
method: Builtins
locals: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
locals()
Update and return a dictionary representing the current local symbol table. 
Free variables are returned by locals() when it is called in function blocks, 
but not in class blocks. Note that at the module level, locals() and globals()
 are the same dictionary.

Note The contents of this dictionary should not be modified; 
changes may not affect the values of local and free variables 
used by the interpreter.
"
self halt.
%
category: 'functions'
method: Builtins
map: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
map(function, iterable, ...)
Return an iterator that applies function to every item of iterable,
 yielding the results. If additional iterable arguments are passed,
 function must take that many arguments and is applied to the 
items from all iterables in parallel. With multiple iterables, the iterator 
stops when the shortest iterable is exhausted. For cases where the
 function inputs are already arranged into argument tuples, see itertools.starmap().
"
^arguments second collect: [:each | arguments first value: (Array with: each) value: Dictionary new]
%
category: 'functions'
method: Builtins
max: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
max(iterable, *[, key, default])
max(arg1, arg2, *args[, key])
Return the largest item in an iterable or the largest of two or more arguments.

If one positional argument is provided, it should be an iterable. 
The largest item in the iterable is returned. 
If two or more positional arguments are provided, 
the largest of the positional arguments is returned.

There are two optional keyword-only arguments. 
The key argument specifies a one-argument ordering function like that used for list.sort(). 
The default argument specifies an object to return if the provided iterable is empty. 
If the iterable is empty and default is not provided, a ValueError is raised.

If multiple items are maximal, the function returns the first one encountered. 
This is consistent with other sort-stability preserving tools such as sorted
(iterable, key=keyfunc, reverse=True)[0] and heapq.nlargest(1, iterable, key=keyfunc).

New in version 3.4: The default keyword-only argument.
"
arguments size == 1 ifTrue: [ 
	"key"
	arguments first size == 0 ifTrue: [^keywords at: 'default' ifAbsent: [self error: 'value error']].
	^arguments first
		inject: arguments first first 
		into: [:last :each | last max: each]
].

^arguments
		"key"
		inject: arguments first
		into: [:last :each | last max: each]
%
category: 'functions'
method: Builtins
memoryview: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
memoryview(obj)
Return a “memory view” object created from the given argument.
 See Memory Views for more information.
"
self halt.
%
category: 'functions'
method: Builtins
min: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
min(iterable, *[, key, default])
min(arg1, arg2, *args[, key])
Return the smallest item in an iterable or the smallest of two or more arguments.

If one positional argument is provided, it should be an iterable. 
The smallest item in the iterable is returned. 
If two or more positional arguments are provided, 
the smallest of the positional arguments is returned.

There are two optional keyword-only arguments. 
The key argument specifies a one-argument ordering function like that used for list.sort(). 
The default argument specifies an object to return
 if the provided iterable is empty. 
If the iterable is empty and default is not provided, a ValueError is raised.

If multiple items are minimal, the function returns the first one encountered. 
This is consistent with other sort-stability preserving tools such as 
sorted(iterable, key=keyfunc)[0] and heapq.nsmallest(1, iterable, key=keyfunc).

New in version 3.4: The default keyword-only argument.
"
arguments size == 1 ifTrue: [ 
	"key"
	arguments first size == 0 ifTrue: [^keywords at: 'default' ifAbsent: [self error: 'value error']].
	^arguments first
		inject: arguments first first 
		into: [:last :each | last min: each]
].

^arguments
		"key"
		inject: arguments first
		into: [:last :each | last min: each]
%
category: 'functions'
method: Builtins
next: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
next(iterator[, default])¶
Retrieve the next item from the iterator by calling its __next__() 
method. If default is given, it is returned if the iterator is exhausted,
 otherwise StopIteration is raised.
"
self halt.
%
category: 'functions'
method: Builtins
object: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class object
Return a new featureless object. object is a base for all classes. 
It has the methods that are common to all instances of Python classes. 
This function does not accept any arguments.

Note object does not have a __dict__, so you can’t assign arbitrary 
attributes to an instance of the object class.
"
self halt.
%
category: 'functions'
method: Builtins
oct: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
oct(x)¶
Convert an integer number to an octal string prefixed with “0o”. 
The result is a valid Python expression. If x is not a Python int object,
 it has to define an __index__() method that returns an integer. For example:

>>> oct(8)
'0o10'
>>> oct(-56)
'-0o70'
If you want to convert an integer number to octal string either 
with prefix “0o” or not, you can use either of the following ways.

>>> '%#o' % 10, '%o' % 10
('0o12', '12')
>>> format(10, '#o'), format(10, 'o')
('0o12', '12')
>>> f'{10:#o}', f'{10:o}'
('0o12', '12')
See also format() for more information.
"
^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0o' , (arguments first abs printStringRadix: 8)
%
category: 'functions'
method: Builtins
open: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
see documentation for more details
"
self halt.
%
category: 'functions'
method: Builtins
ord: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
ord(c)
Given a string representing one Unicode character,
 return an integer representing the Unicode code point of that character. 
For example, ord('a') returns the integer 97 and ord('€') (Euro sign) returns 8364. 
This is the inverse of chr().
"

^(arguments first _decodeFromUtf8: true maxSize: 1) first codePoint
%
category: 'functions'
method: Builtins
pow: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"	pow(x, y[, z])
Return x to the power y; if z is present, return x to the power y, 
modulo z (computed more efficiently than pow(x, y) % z). 
The two-argument form pow(x, y) is equivalent to using the power operator: x**y.

The arguments must have numeric types. With mixed operand types, 
the coercion rules for binary arithmetic operators apply. 
For int operands, the result has the same type as the operands 
(after coercion) unless the second argument is negative;
 in that case, all arguments are converted to float and a float result is delivered. 
For example, 10**2 returns 100, but 10**-2 returns 0.01.
 If the second argument is negative, the third argument must be omitted.
 If z is present, x and y must be of integer types, and y must be non-negative.
"

	| result |
	result := arguments first raisedTo: (arguments at: 2).
	^arguments size == 2
		ifTrue: [result]
		ifFalse:[result rem: (arguments at: 3)]
%
category: 'functions'
method: Builtins
print: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html#print"

	| separator stream terminator |
	separator := keywords at: 'sep' ifAbsent: [' '].
	terminator := keywords at: 'end' ifAbsent: [Character lf asString].
	"We should default to stdout, but Transcript is easier (and more useful) for now"
	stream := keywords at: 'file' ifAbsent: [Transcript].
	arguments do: [:each | 
		| string |
		"https://docs.python.org/3/library/stdtypes.html#str"
		string := (each isKindOf: Py_String) 
			ifTrue: [String withAll: each]
			ifFalse: [each printString].
		stream nextPutAll: string; nextPutAll: separator.
	].
	stream nextPutAll: terminator.
	(keywords at: 'flush' ifAbsent: [false]) ifTrue: [stream flush].
%
category: 'functions'
method: Builtins
property: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
see documentation for more details
"
self halt.
%
category: 'functions'
method: Builtins
range: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
range(stop)
range(start, stop[, step])
Rather than being a function, range is actually an immutable sequence type, as documented 
in Ranges and Sequence Types — list, tuple, range.
"

arguments size == 1 ifTrue: [^Interval from: 0 to: arguments first - 1].
arguments size == 2 ifTrue: [^Interval from: arguments first to: arguments second - 1].
^Interval from: arguments first to: arguments second - 1 by: (arguments at: 3).
%
category: 'functions'
method: Builtins
repr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
repr(object)
Return a string containing a printable representation of an object. 
For many types, this function makes an attempt to return a string
 that would yield an object with the same value when passed to eval(), 
otherwise the representation is a string enclosed in angle brackets that 
contains the name of the type of the object together with additional
 information often including the name and address of the object. 
A class can control what this function returns for its instances by defining a __repr__() method.
"
self halt.
%
category: 'functions'
method: Builtins
reversed: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
reversed(seq)
Return a reverse iterator. seq must be an object which has 
a __reversed__() method or supports the sequence protocol 
(the __len__() method and the __getitem__() method with 
integer arguments starting at 0).
"

^arguments first reverse
%
category: 'functions'
method: Builtins
round: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
Return number rounded to ndigits precision after the decimal point. 
If ndigits is omitted or is None, it returns the nearest integer to its input.

For the built-in types supporting round(), values are rounded to the closest 
multiple of 10 to the power minus ndigits; if two multiples are equally close, 
rounding is done toward the even choice (so, for example, both round(0.5) 
and round(-0.5) are 0, and round(1.5) is 2). Any integer value is valid for ndigits 
(positive, zero, or negative). The return value is an integer if ndigits is omitted or None. 
Otherwise the return value has the same type as number.

For a general Python object number, round delegates to number.__round__.

Note The behavior of round() for floats can be surprising: for example, 
round(2.675, 2) gives 2.67 instead of the expected 2.68. This is not a bug: 
it’s a result of the fact that most decimal fractions can’t be represented exactly as a float. 
See Floating Point Arithmetic: Issues and Limitations for more information.
"
	| number |
	arguments size == 1 ifTrue: [^arguments first roundedHalfToEven].
	number := 10 raisedTo: (arguments at: 2).
	^((arguments first * number) roundedHalfToEven / number) asFloat
%
category: 'functions'
method: Builtins
set: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class set([iterable])
Return a new set object, optionally with elements taken from iterable.
 set is a built-in class. See set and Set Types — set, frozenset for documentation about this class.

For other containers see the built-in frozenset, list, tuple, and 
dict classes, as well as the collections module.
"
self halt.
%
category: 'functions'
method: Builtins
setattr: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
setattr(object, name, value)
This is the counterpart of getattr(). The arguments are an 
object, a string and an arbitrary value. The string may name 
an existing attribute or a new attribute. The function assigns the value to the attribute, 
provided the object allows it. For example, setattr(x, 'foobar', 123) 
is equivalent to x.foobar = 123.
"
self halt.
%
category: 'functions'
method: Builtins
slice: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class slice(stop)¶
class slice(start, stop[, step])
Return a slice object representing the set of indices specified 
by range(start, stop, step). The start and step arguments default 
to None. Slice objects have read-only data attributes start, stop 
and step which merely return the argument values (or their default).
 They have no other explicit functionality; however they are used by
 Numerical Python and other third party extensions. Slice objects are 
also generated when extended indexing syntax is used.
 For example: a[start:stop:step] or a[start:stop, i].
 See itertools.islice() for an alternate version that returns an iterator.
"
self halt.
%
category: 'functions'
method: Builtins
staticmethod: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
@staticmethod¶
Transform a method into a static method.

A static method does not receive an implicit first argument. 
To declare a static method, use this idiom:

class C:
    @staticmethod
    def f(arg1, arg2, ...): ...
The @staticmethod form is a function decorator – see Function 
definitions for details.

A static method can be called either on the class (such as C.f()) 
or on an instance (such as C().f()).

Static methods in Python are similar to those found in Java or C++.
 Also see classmethod() for a variant that is useful for creating alternate class constructors.

Like all decorators, it is also possible to call staticmethod as a regular
 function and do something with its result. This is needed in some cases 
where you need a reference to a function from a class body and you 
want to avoid the automatic transformation to instance method. For 
these cases, use this idiom:

class C:
    builtin_open = staticmethod(open)
For more information on static methods, see The standard type hierarchy.
"
self halt.
%
category: 'functions'
method: Builtins
str: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class str(object='')
class str(object=b'', encoding='utf-8', errors='strict')
Return a str version of object. See str() for details.

str is the built-in string class. For general
 information about strings, see Text Sequence Type — str.
"
self halt.
%
category: 'functions'
method: Builtins
sum: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
Sums start and the items of an iterable from left to right and returns the total. 
start defaults to 0. The iterable’s items are normally numbers, and the start 
value is not allowed to be a string.

For some use cases, there are good alternatives to sum(). 
The preferred, fast way to concatenate a sequence of strings is by calling ''.
join(sequence). To add floating point values with extended precision, see math.fsum(). 
To concatenate a series of iterables, consider using itertools.chain().
"

	^arguments first
		inject: (arguments size > 1 ifTrue: [arguments at: 2] ifFalse: [0]) 
		into: [:sum :each | sum + each]
%
category: 'functions'
method: Builtins
super: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
super([type[, object-or-type]])
Return a proxy object that delegates method calls to a parent 
or sibling class of type. This is useful for accessing inherited methods 
that have been overridden in a class. The search order is same as 
that used by getattr() except that the type itself is skipped.

The __mro__ attribute of the type lists the method resolution search 
order used by both getattr() and super(). The attribute is dynamic and 
can change whenever the inheritance hierarchy is updated.

If the second argument is omitted, the super object returned is unbound.
 If the second argument is an object, isinstance(obj, type) must be true. 
If the second argument is a type, issubclass(type2, type) must be true 
(this is useful for classmethods).

There are two typical use cases for super. In a class hierarchy with single
 inheritance, super can be used to refer to parent classes without naming
 them explicitly, thus making the code more maintainable. This use closely
 parallels the use of super in other programming languages.

The second use case is to support cooperative multiple inheritance in a
 dynamic execution environment. This use case is unique to Python and 
is not found in statically compiled languages or languages that only support 
single inheritance. This makes it possible to implement “diamond diagrams”
 where multiple base classes implement the same method. Good design 
dictates that this method have the same calling signature in every case 
(because the order of calls is determined at runtime, because that order 
adapts to changes in the class hierarchy, and because that order can 
include sibling classes that are unknown prior to runtime).

For both use cases, a typical superclass call looks like this:

class C(B):
    def method(self, arg):
        super().method(arg)    # This does the same thing as:
                               # super(C, self).method(arg)
Note that super() is implemented as part of the binding process for
 explicit dotted attribute lookups such as super().__getitem__(name).
 It does so by implementing its own __getattribute__() method for 
searching classes in a predictable order that supports cooperative
 multiple inheritance. Accordingly, super() is undefined for implicit 
lookups using statements or operators such as super()[name].

Also note that, aside from the zero argument form, super() is not
 limited to use inside methods. The two argument form specifies 
the arguments exactly and makes the appropriate references.
 The zero argument form only works inside a class definition,
 as the compiler fills in the necessary details to correctly 
retrieve the class being defined, as well as accessing the 
current instance for ordinary methods.

For practical suggestions on how to design cooperative
 classes using super(), see guide to using super().
"
self halt.
%
category: 'functions'
method: Builtins
tuple: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
tuple([iterable])
Rather than being a function, tuple is actually an immutable sequence type, 
as documented in Tuples and Sequence Types — list, tuple, range.
"
	^arguments first asArray copy immediateInvariant
%
category: 'functions'
method: Builtins
type: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class type(object)
class type(name, bases, dict)
With one argument, return the type of an object. 
The return value is a type object and generally the same object as returned by object.__class__.

The isinstance() built-in function is recommended 
for testing the type of an object, because it takes subclasses into account.

With three arguments, return a new type object. 
This is essentially a dynamic form of the class statement. 
The name string is the class name and becomes the __name__ 
attribute; the bases tuple itemizes the base classes and becomes 
the __bases__ attribute; and the dict dictionary is the namespace
 containing definitions for class body and is copied to a standard 
dictionary to become the __dict__ attribute. For example, the following 
two statements create identical type objects:

>>> class X:
...     a = 1
...
>>> X = type('X', (object,), dict(a=1))
See also Type Objects.

Changed in version 3.6: Subclasses of type which don’t override
 type.__new__ may no longer use the one-argument form to get the type of an object.
"
self halt.
%
category: 'functions'
method: Builtins
vars: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
vars([object])
Return the __dict__ attribute for a module, class, instance, 
or any other object with a __dict__ attribute.

Objects such as modules and instances have an updateable
 __dict__ attribute; however, other objects may have write
 restrictions on their __dict__ attributes (for example,
 classes use a types.MappingProxyType to prevent direct dictionary updates).

Without an argument, vars() acts like locals(). Note,
 the locals dictionary is only useful for reads since
 updates to the locals dictionary are ignored.
"
self halt.
%
category: 'functions'
method: Builtins
zip: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
zip(*iterables)
Make an iterator that aggregates elements from each of the iterables.

Returns an iterator of tuples, where the i-th tuple contains 
the i-th element from each of the argument sequences or iterables. 
The iterator stops when the shortest input iterable is exhausted. 
With a single iterable argument, it returns an iterator of 1-tuples.
 With no arguments, it returns an empty iterator. Equivalent to:

def zip(*iterables):
    # zip('ABCD', 'xy') --> Ax By
    sentinel = object()
    iterators = [iter(it) for it in iterables]
    while iterators:
        result = []
        for it in iterators:
            elem = next(it, sentinel)
            if elem is sentinel:
                return
            result.append(elem)
        yield tuple(result)
The left-to-right evaluation order of the iterables is guaranteed. 
This makes possible an idiom for clustering a data series into n-length 
groups using zip(*[iter(s)]*n). This repeats the same iterator n times
 so that each output tuple has the result of n calls to the iterator. This 
has the effect of dividing the input into n-length chunks.

zip() should only be used with unequal length inputs when you don’t care
 about trailing, unmatched values from the longer iterables. If those values 
are important, use itertools.zip_longest() instead.

zip() in conjunction with the * operator can be used to unzip a list:

>>>
>>> x = [1, 2, 3]
>>> y = [4, 5, 6]
>>> zipped = zip(x, y)
>>> list(zipped)
[(1, 4), (2, 5), (3, 6)]
>>> x2, y2 = zip(*zip(x, y))
>>> x == list(x2) and y == list(y2)
True
"
self halt.
%
set compile_env: 0
category: 'other'
method: Builtins
__import__: name _: globals _: locals _: fromList _: level
	"(name, globals=None, locals=None, fromlist=(), level=0)"

	self halt.
%
category: 'other'
method: Builtins
call: aPyCall

	| arguments keywords selector |
	selector := (aPyCall functionName , ':keywords:') asSymbol.
	arguments := aPyCall arguments collect: [:each | each evaluate].
	keywords := Dictionary new.
	aPyCall keywords do: [:each | 
		keywords at: each name put: each value evaluate.
	].
	^self perform: selector with: arguments with: keywords.
%
category: 'other'
method: Builtins
variableAt: aName
	
	| selector |
	aName assertContextIsLoad.
	selector := (aName id , ':keywords:') asSymbol.
	^[:arguments :keywords | self perform: selector with: arguments with: keywords]

"
	| arguments keywords selector |
	selector := (aPyCall functionName , ':keywords:') asSymbol.
	arguments := aPyCall arguments collect: [:each | each evaluate].
	keywords := Dictionary new.
	aPyCall keywords do: [:each | 
		keywords at: each name put: each value evaluate.
	].
	^self perform: selector with: arguments with: keywords.
"
%

! ------------------- Remove existing behavior from Py_List
expectvalue /Metaclass3       
doit
Py_List removeAllMethods.
Py_List class removeAllMethods.
%
! ------------------- Class methods for Py_List
! ------------------- Instance methods for Py_List
set compile_env: 0
category: 'other'
method: Py_List
append: arguments keywords: keywords

^self add: arguments first
%

! ------------------- Remove existing behavior from Py_Tuple
expectvalue /Metaclass3       
doit
Py_Tuple removeAllMethods.
Py_Tuple class removeAllMethods.
%
! ------------------- Class methods for Py_Tuple
! ------------------- Instance methods for Py_Tuple

! ------------------- Remove existing behavior from Py_String
expectvalue /Metaclass3       
doit
Py_String removeAllMethods.
Py_String class removeAllMethods.
%
! ------------------- Class methods for Py_String
! ------------------- Instance methods for Py_String
set compile_env: 0
category: 'other'
method: Py_String
split: arguments keywords: keywords
	"string.split(separator, max)

		The split() method splits a string into a list.

		You can specify the separator, default separator is any whitespace.

		Note: When max is specified, the list will contain the specified number of elements plus one.

		separator	Optional. Specifies the separator to use when splitting the string. Default value is a whitespace
		max	Optional. Specifies how many splits to do. Default value is -1, which is ""all occurrences"""
	
^Py_List withAll: self subStrings
%

! ------------------- Remove existing behavior from Complex
expectvalue /Metaclass3       
doit
Complex removeAllMethods.
Complex class removeAllMethods.
%
! ------------------- Class methods for Complex
set compile_env: 0
category: 'other'
classmethod: Complex
real: newValue imag: newImag
	^self basicNew real: newValue imag: newImag
%
! ------------------- Instance methods for Complex
set compile_env: 0
category: 'Accessing'
method: Complex
imag
	^imaginary
%
category: 'Accessing'
method: Complex
imaginary
	^imaginary
%
category: 'Accessing'
method: Complex
real
	^real
%
set compile_env: 0
category: 'Arithmetic'
method: Complex
- aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: self real - aNumber real imag: self imaginary - aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
* aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #* coercing: aNumber
%
category: 'Arithmetic'
method: Complex
/ aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: (self real * aNumber real) + (self imaginary * aNumber imaginary)negated
		imag: (self real * aNumber imaginary) + (self imaginary * aNumber real)
	].
	^self _retry: #/ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
+ aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^Complex real: self real + aNumber real imag: self imaginary + aNumber imaginary
	].
	^self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: Complex
= aNumber
	(aNumber isKindOf: Complex) ifTrue: [
		^(self real = aNumber real) and: [self imag = aNumber imag]
	].
	^self _retry: #= coercing: aNumber
%
set compile_env: 0
category: 'other'
method: Complex
_coerce: aNumber
	^Complex real: aNumber imag: 0
%
category: 'other'
method: Complex
_generality
	^150
%
set compile_env: 0
category: 'Printing'
method: Complex
asString

	| stream |
	stream := WriteStream on: String new.
	self printOn: stream.
	^stream contents
%
category: 'Printing'
method: Complex
printOn: aStream

	real ~= 0 ifTrue: [
		aStream 
			print: real;
			nextPut: $+.
	].

	aStream 
		print: imaginary;
		nextPut: $j.
%
set compile_env: 0
category: 'Updating'
method: Complex
imaginary: newValue
	imaginary := newValue
%
category: 'Updating'
method: Complex
real: newValue
	real := newValue
%
category: 'Updating'
method: Complex
real: newValue imag: newImag
	real := newValue.
	imaginary := newImag.
%

! ------------------- Remove existing behavior from PyAstNode
expectvalue /Metaclass3       
doit
PyAstNode removeAllMethods.
PyAstNode class removeAllMethods.
%
! ------------------- Class methods for PyAstNode
set compile_env: 0
category: 'other'
classmethod: PyAstNode
escapeCharacters

	escapeCharacters ifNil: [ 
		escapeCharacters := IdentityKeyValueDictionary new
			at: $\		put: 92;
			at: $'		put: 39;
			at: $"		put: 34;
			at: $a		put: 7;
			at: $b		put: 8;
			at: $f		put: 12;
			at: $n		put: 10;
			at: $r		put: 13;
			at: $t		put: 9;
			at: $v		put: 11;
			yourself. 
	].
	^ escapeCharacters
%
category: 'other'
classmethod: PyAstNode
parent: aNode

	(aNode isKindOf: PyAstNode) ifFalse: [self error: 'Not a valid parent!'].
	^self basicNew
		initialize: aNode;
		yourself
%
! ------------------- Instance methods for PyAstNode
set compile_env: 0
category: 'builtins'
method: PyAstNode
globals

	^self module globals
%
set compile_env: 0
category: 'other'
method: PyAstNode
addMissingPositions
"
	| token |
	token := self stream peek.
	line ifNil: [token halt].
	[
		token line < line or: [token line == line and: [token column <= column]].
	] whileTrue: [
		token := self stream next; peek.
	]."
%
category: 'other'
method: PyAstNode
alias

	| string |
	string := self stream upTo: $(.
	string = 'alias' ifFalse: [self error].
	^PyAlias parent: self.
%
category: 'other'
method: PyAstNode
arg
	| string |
	string := self stream upTo: $(.
	string = 'arg' ifFalse: [self error].
	^PyArg parent: self.
%
category: 'other'
method: PyAstNode
collectAst: aBlock

	| list stream char |
	stream := self stream.
	stream peekFor: Character space.
	char := stream peek.
	(stream peekFor: $[) ifFalse: [self error].
	list := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		list add: aBlock value.
		(stream peekFor: $,) ifTrue: [stream skipSeparators].
	].
	^list
%
category: 'other'
method: PyAstNode
commaSpace

	| stream |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(stream peekFor: Character space) ifFalse: [self error].
%
category: 'other'
method: PyAstNode
error

	self error: 'Invalid ' , self class name , ' node: ' , (self stream next: 10) printString.
%
category: 'other'
method: PyAstNode
expression

	^PyExpression expressionFrom: self
%
category: 'other'
method: PyAstNode
initialize

	self subclassResponsibility
%
category: 'other'
method: PyAstNode
initialize: aNode

	parent := aNode.
	self initialize.
%
category: 'other'
method: PyAstNode
interpretEscapeSequence: aStream

	| aSymbol | 
	aSymbol := aStream next.
	"it seems Python AST never dumps octal values, so this case is useless" 
	(aSymbol = $o) ifTrue: [
		^ aSymbol asString, (aStream next: 2)
	].
	(aSymbol = $x) ifTrue: [
		^ (Character withValue: ('16r', (aStream next: 2)) asInteger) asString
	].
	^ (Character withValue: (self class escapeCharacters at: aSymbol)) asString.
%
category: 'other'
method: PyAstNode
module

	^parent module
%
category: 'other'
method: PyAstNode
optionalExpression

	| stream string position |
	stream := self stream.
	position := stream position.
	string := stream next: 4.
	string = 'None' ifTrue: [^nil].
	stream position: position.
	^self expression.
%
category: 'other'
method: PyAstNode
readPosition
"
	| stream string |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
	(string := stream upTo: $=) = ' lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
"
%
category: 'other'
method: PyAstNode
stream

	^parent stream
%
category: 'other'
method: PyAstNode
string

	| stream char s next isByte |
	stream := self stream.
	char := stream next.
	isByte := false.
	(char asUppercase == $B) ifTrue: [ 
		char := stream next. 
		isByte := true.
	].
	(char == $' or: [char == $"]) ifFalse: [self error].
	s := String new.
	[ 
		stream peekFor: char.
	] whileFalse: [
		next := stream next.
		(next = $\) ifTrue: [
			next := self interpretEscapeSequence: stream.  
		].
		s := s, next. 
	].
	isByte ifTrue: [
		^ s asByteArray
	] ifFalse: [
		^ s
	].
%
category: 'other'
method: PyAstNode
suite

	| stream suite node |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	suite := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		node := PyStatement statementFrom: self.
		suite add: node.
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
	^suite
%
category: 'other'
method: PyAstNode
sys

	^parent sys
%
category: 'other'
method: PyAstNode
variableAt: aName 
	^parent variableAt: aName
%
category: 'other'
method: PyAstNode
variableAt: aTarget put: aValue
	^parent variableAt: aTarget put: aValue
%

! ------------------- Remove existing behavior from PyAlias
expectvalue /Metaclass3       
doit
PyAlias removeAllMethods.
PyAlias class removeAllMethods.
%
! ------------------- Class methods for PyAlias
! ------------------- Instance methods for PyAlias
set compile_env: 0
category: 'other'
method: PyAlias
asName

	^asName
%
category: 'other'
method: PyAlias
assign: aValue in: globals
	globals at: self name put: aValue.
%
category: 'other'
method: PyAlias
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := stream upTo: $'.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
	].
%
category: 'other'
method: PyAlias
name

	^name
%

! ------------------- Remove existing behavior from PyArguments
expectvalue /Metaclass3       
doit
PyArguments removeAllMethods.
PyArguments class removeAllMethods.
%
! ------------------- Class methods for PyArguments
! ------------------- Instance methods for PyArguments
set compile_env: 0
category: 'other'
method: PyArguments
initialize
"arguments(arg* args, arg? vararg, arg* kwonlyargs, expr* kw_defaults,
                 arg? kwarg, expr* defaults)"

	| next stream|
	stream := self stream.
	next := stream next: 10.
	next ~= 'arguments(' ifTrue: [self error.].
	args := self collectAst: [self arg].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		vararg := self arg.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	kwonlyargs := self collectAst: [self arg].
	self commaSpace.
	kw_defaults := self collectAst: [self expression].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		kwarg := self arg.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	defaults := self collectAst: [self expression].
	(stream peekFor: $)) ifFalse: [self error].
%

! ------------------- Remove existing behavior from PyAstNodeWithLocation
expectvalue /Metaclass3       
doit
PyAstNodeWithLocation removeAllMethods.
PyAstNodeWithLocation class removeAllMethods.
%
! ------------------- Class methods for PyAstNodeWithLocation
! ------------------- Instance methods for PyAstNodeWithLocation
set compile_env: 0
category: 'accessors'
method: PyAstNodeWithLocation
column
	^column
%
category: 'accessors'
method: PyAstNodeWithLocation
line
	^line
%
set compile_env: 0
category: 'other'
method: PyAstNodeWithLocation
addMissingPositions

	| token |
	token := self stream peek.
	line ifNil: [token halt].
	[
		token line < line or: [token line == line and: [token column <= column]].
	] whileTrue: [
		token := self stream next; peek.
	].
%
category: 'other'
method: PyAstNodeWithLocation
readPosition

	(self stream peekFor: $,) ifFalse: [self error].
	self readPositionOnly
%
category: 'other'
method: PyAstNodeWithLocation
readPositionOnly

	| stream string |
	stream := self stream.
	(string := stream upTo: $=) = ' lineno' ifFalse: [self error].
	line := (stream upTo: $,) asNumber.
	(string := stream upTo: $=) = ' col_offset' ifFalse: [self error].
	column := (stream upTo: $)) asNumber.
%

! ------------------- Remove existing behavior from PyArg
expectvalue /Metaclass3       
doit
PyArg removeAllMethods.
PyArg class removeAllMethods.
%
! ------------------- Class methods for PyArg
! ------------------- Instance methods for PyArg
set compile_env: 0
category: 'other'
method: PyArg
initialize

"arg = (identifier arg, expr? annotation)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	arg := stream upTo: $'.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		annotation := self expression.
	] ifFalse: [
		next := stream next: 4.
			next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
category: 'other'
method: PyArg
newMethod: argument
		"Method comment."

	^self yourself.
%

! ------------------- Remove existing behavior from PyExceptHandler
expectvalue /Metaclass3       
doit
PyExceptHandler removeAllMethods.
PyExceptHandler class removeAllMethods.
%
! ------------------- Class methods for PyExceptHandler
! ------------------- Instance methods for PyExceptHandler
set compile_env: 0
category: 'other'
method: PyExceptHandler
initialize
	"ExceptHandler(expr? type, identifier? name, stmt* body)"
	
	| stream next |
	stream := self stream.
	next := stream upTo: $(.
	next = 'ExceptHandler' ifFalse: [self error.].
	type := self optionalExpression.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		name := stream upTo: $'.
		(stream peekFor: $,) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $,.
		string = 'None' ifFalse: [self error].
	].
	stream skip: -1.
	self commaSpace.
	body := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyExpression
expectvalue /Metaclass3       
doit
PyExpression removeAllMethods.
PyExpression class removeAllMethods.
%
! ------------------- Class methods for PyExpression
set compile_env: 0
category: 'other'
classmethod: PyExpression
expressionFrom: aNode

| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for PyExpression
set compile_env: 0
category: 'other'
method: PyExpression
evaluate

	self subclassResponsibility.
%

! ------------------- Remove existing behavior from PyAttribute
expectvalue /Metaclass3       
doit
PyAttribute removeAllMethods.
PyAttribute class removeAllMethods.
%
! ------------------- Class methods for PyAttribute
! ------------------- Instance methods for PyAttribute
set compile_env: 0
category: 'other'
method: PyAttribute
addMissingPositions

	value addMissingPositions.
%
category: 'other'
method: PyAttribute
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: PyAttribute
call: aPyCall
	| receiver |
	receiver := value evaluate.
	self halt.
	self assertContextIsLoad.
	^Builtins current call: aPyCall
%
category: 'other'
method: PyAttribute
call: mySelector arguments: myArguments keywords: myKeywords
	| receiver |
	self assertContextIsLoad.
	receiver := value evaluate.
	^receiver perform: mySelector with: myArguments with: myKeywords.
%
category: 'other'
method: PyAttribute
id
	^attr
%
category: 'other'
method: PyAttribute
initialize
	"Attribute(expr value, identifier attr, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	attr := self string.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAwait
expectvalue /Metaclass3       
doit
PyAwait removeAllMethods.
PyAwait class removeAllMethods.
%
! ------------------- Class methods for PyAwait
! ------------------- Instance methods for PyAwait
set compile_env: 0
category: 'other'
method: PyAwait
initialize
	"Await(expr value)"

	value := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyBinOp
expectvalue /Metaclass3       
doit
PyBinOp removeAllMethods.
PyBinOp class removeAllMethods.
%
! ------------------- Class methods for PyBinOp
! ------------------- Instance methods for PyBinOp
set compile_env: 0
category: 'other'
method: PyBinOp
_left
	^ left
%
category: 'other'
method: PyBinOp
_op
	^ op
%
category: 'other'
method: PyBinOp
_right
	^ right
%
category: 'other'
method: PyBinOp
assertContextIsLoad

	self halt
%
category: 'other'
method: PyBinOp
evaluate
	^op left: left evaluate right: right evaluate
%
category: 'other'
method: PyBinOp
initialize
	"BinOp(expr left, operator op, expr right)"

	left := self expression.
	self commaSpace.
	op := PyOperator parent: self.
	self commaSpace.
	right := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyBoolOp
expectvalue /Metaclass3       
doit
PyBoolOp removeAllMethods.
PyBoolOp class removeAllMethods.
%
! ------------------- Class methods for PyBoolOp
! ------------------- Instance methods for PyBoolOp
set compile_env: 0
category: 'other'
method: PyBoolOp
evaluate
	^op values: values
%
category: 'other'
method: PyBoolOp
initialize
	"BoolOp(boolop op, expr* values)"

	op := PyBoolop parent: self.
	self commaSpace.
	values := self collectAst:[self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PyBytes
expectvalue /Metaclass3       
doit
PyBytes removeAllMethods.
PyBytes class removeAllMethods.
%
! ------------------- Class methods for PyBytes
! ------------------- Instance methods for PyBytes
set compile_env: 0
category: 'other'
method: PyBytes
_s
	^s
%
category: 'other'
method: PyBytes
initialize
	"Bytes(bytes s)"

	s := self string.
	self readPosition.
%

! ------------------- Remove existing behavior from PyCall
expectvalue /Metaclass3       
doit
PyCall removeAllMethods.
PyCall class removeAllMethods.
%
! ------------------- Class methods for PyCall
! ------------------- Instance methods for PyCall
set compile_env: 0
category: 'Accessing'
method: PyCall
arguments
	^arguments
%
category: 'Accessing'
method: PyCall
functionName
	^function id
%
category: 'Accessing'
method: PyCall
keywords
	^keywords
%
set compile_env: 0
category: 'other'
method: PyCall
addMissingPositions

	function addMissingPositions.
	arguments do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCall
evaluate
	"https://docs.python.org/3/reference/expressions.html#calls"
	"We should do an elaborate name lookup, but we'll just start with built-in functions"

	| myArguments myKeywords mySelector |
	mySelector := (self functionName , ':keywords:') asSymbol.
	myArguments := self arguments collect: [:each | each evaluate].
	myKeywords := Dictionary new.
	self keywords do: [:each | 
		myKeywords at: each name put: each value evaluate.
	].
	^function call: mySelector arguments: myArguments keywords: myKeywords.
%
category: 'other'
method: PyCall
initialize
	"Call(expr func, expr* args, keyword* keywords)"
	
	function := self expression.
	self commaSpace.
	arguments := self collectAst: [self expression].
	self commaSpace.
	keywords := self collectAst: [PyKeyword parent: self].
	self readPosition.
%

! ------------------- Remove existing behavior from PyCompare
expectvalue /Metaclass3       
doit
PyCompare removeAllMethods.
PyCompare class removeAllMethods.
%
! ------------------- Class methods for PyCompare
! ------------------- Instance methods for PyCompare
set compile_env: 0
category: 'other'
method: PyCompare
_cmpopList
	^ cmpopList
%
category: 'other'
method: PyCompare
_comparatorList
	^ comparatorList
%
category: 'other'
method: PyCompare
_left
	^ left
%
category: 'other'
method: PyCompare
addMissingPositions

	super addMissingPositions.
	left addMissingPositions.
	cmpopList do: [:each | each addMissingPositions].
	comparatorList do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCompare
evaluate
	| temp |
	temp := left evaluate.
	1 to: cmpopList size do: [:i |
		| op operand |
		op := cmpopList at: i.
		operand := (comparatorList at: i) evaluate.
		(op left: temp right: operand) ifFalse: [^false].
		temp := operand.
	].
	^true
%
category: 'other'
method: PyCompare
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	cmpopList := self collectAst: [PyCmpop parent: self].
	self commaSpace.
	comparatorList := self collectAst: [self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PyConstant
expectvalue /Metaclass3       
doit
PyConstant removeAllMethods.
PyConstant class removeAllMethods.
%
! ------------------- Class methods for PyConstant
! ------------------- Instance methods for PyConstant
set compile_env: 0
category: 'other'
method: PyConstant
intialize
	"Constant(constant value)"
%

! ------------------- Remove existing behavior from PyDict
expectvalue /Metaclass3       
doit
PyDict removeAllMethods.
PyDict class removeAllMethods.
%
! ------------------- Class methods for PyDict
! ------------------- Instance methods for PyDict
set compile_env: 0
category: 'other'
method: PyDict
evaluate

	| dict |
	dict := Dictionary new.
	1 to: keys size do: [:i | 
		dict at: (keys at: i) put: (values at: i).
	].
	^dict
%
category: 'other'
method: PyDict
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst:[self expression].
	self commaSpace.
	values := self collectAst:[self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PyDictComp
expectvalue /Metaclass3       
doit
PyDictComp removeAllMethods.
PyDictComp class removeAllMethods.
%
! ------------------- Class methods for PyDictComp
! ------------------- Instance methods for PyDictComp
set compile_env: 0
category: 'other'
method: PyDictComp
initialize
	"DictComp(expr key, expr value, comprehension* generators)"

	key := self expression.
	self commaSpace.
	value := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%

! ------------------- Remove existing behavior from PyEllipsis
expectvalue /Metaclass3       
doit
PyEllipsis removeAllMethods.
PyEllipsis class removeAllMethods.
%
! ------------------- Class methods for PyEllipsis
! ------------------- Instance methods for PyEllipsis
set compile_env: 0
category: 'other'
method: PyEllipsis
initialize
	"Ellipsis"
%

! ------------------- Remove existing behavior from PyFormattedValue
expectvalue /Metaclass3       
doit
PyFormattedValue removeAllMethods.
PyFormattedValue class removeAllMethods.
%
! ------------------- Class methods for PyFormattedValue
! ------------------- Instance methods for PyFormattedValue
set compile_env: 0
category: 'other'
method: PyFormattedValue
_value 
	^ value
%
category: 'other'
method: PyFormattedValue
initialize
	"FormattedValue(expr value, int? conversion, expr? format_spec)"

	| stream next |
	stream := self stream.
	value := self expression.
	self commaSpace.
	conversion := (stream upTo: $,) asNumber.
	stream skip: -1.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		format_spec:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyGeneratorExp
expectvalue /Metaclass3       
doit
PyGeneratorExp removeAllMethods.
PyGeneratorExp class removeAllMethods.
%
! ------------------- Class methods for PyGeneratorExp
! ------------------- Instance methods for PyGeneratorExp
set compile_env: 0
category: 'other'
method: PyGeneratorExp
initialize
	"GeneratorExp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%

! ------------------- Remove existing behavior from PyIfExp
expectvalue /Metaclass3       
doit
PyIfExp removeAllMethods.
PyIfExp class removeAllMethods.
%
! ------------------- Class methods for PyIfExp
! ------------------- Instance methods for PyIfExp
set compile_env: 0
category: 'other'
method: PyIfExp
initialize
	"IfExp(expr test, expr body, expr orelse)"

	test := self expression.
	self commaSpace.
	body := self expression.
	self commaSpace.
	orelse := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyJoinedStr
expectvalue /Metaclass3       
doit
PyJoinedStr removeAllMethods.
PyJoinedStr class removeAllMethods.
%
! ------------------- Class methods for PyJoinedStr
! ------------------- Instance methods for PyJoinedStr
set compile_env: 0
category: 'other'
method: PyJoinedStr
_values
	^ values
%
category: 'other'
method: PyJoinedStr
initialize
	"JoinedStr(expr* values)"

	values := self collectAst:[self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PyLambda
expectvalue /Metaclass3       
doit
PyLambda removeAllMethods.
PyLambda class removeAllMethods.
%
! ------------------- Class methods for PyLambda
! ------------------- Instance methods for PyLambda
set compile_env: 0
category: 'other'
method: PyLambda
initialize
	"Lambda(arguments args, expr body)"

	args := PyArguments parent: self.
	self commaSpace.
	body := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyList
expectvalue /Metaclass3       
doit
PyList removeAllMethods.
PyList class removeAllMethods.
%
! ------------------- Class methods for PyList
! ------------------- Instance methods for PyList
set compile_env: 0
category: 'other'
method: PyList
_ctx
	^ ctx
%
category: 'other'
method: PyList
_elts
	^ elts
%
category: 'other'
method: PyList
evaluate
	"May wish to revisit context"
	^Py_List withAll: (elts collect: [:each | each evaluate])
%
category: 'other'
method: PyList
initialize
	"List(expr* elts, expr_context ctx)"
	
	elts := self collectAst:[self expression].
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyListComp
expectvalue /Metaclass3       
doit
PyListComp removeAllMethods.
PyListComp class removeAllMethods.
%
! ------------------- Class methods for PyListComp
! ------------------- Instance methods for PyListComp
set compile_env: 0
category: 'other'
method: PyListComp
initialize
	"ListComp(expr elt, comprehension* generators)"
	| stream |
	stream := self stream.
	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%

! ------------------- Remove existing behavior from PyName
expectvalue /Metaclass3       
doit
PyName removeAllMethods.
PyName class removeAllMethods.
%
! ------------------- Class methods for PyName
! ------------------- Instance methods for PyName
set compile_env: 0
category: 'other'
method: PyName
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: PyName
assertContextIsStore

	ctx assertIsStore.
%
category: 'other'
method: PyName
assign: aValue in: globals

	globals at: self id put: aValue.
%
category: 'other'
method: PyName
call: aPyCall
	self assertContextIsLoad.
	^Builtins current call: aPyCall
%
category: 'other'
method: PyName
call: mySelector arguments: myArguments keywords: myKeywords
	self assertContextIsLoad.
	^Builtins current call: mySelector arguments: myArguments keywords: myKeywords
%
category: 'other'
method: PyName
evaluate
	self assertContextIsLoad.
	^parent variableAt: self
%
category: 'other'
method: PyName
id

	^id
%
category: 'other'
method: PyName
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PyName
printOn: aStream
	super printOn: aStream.
	aStream nextPut: $(; 
		nextPutAll: id;
		nextPut: $).
%

! ------------------- Remove existing behavior from PyNameConstant
expectvalue /Metaclass3       
doit
PyNameConstant removeAllMethods.
PyNameConstant class removeAllMethods.
%
! ------------------- Class methods for PyNameConstant
! ------------------- Instance methods for PyNameConstant
set compile_env: 0
category: 'other'
method: PyNameConstant
evaluate
	^value
%
category: 'other'
method: PyNameConstant
initialize
	"NameConstant(singleton value)"

	|stream next |
	stream := self stream.
	next := stream upTo: $,.
	next = 'None' ifTrue: [value := nil] ifFalse: [
	next = 'True' ifTrue: [value := true] ifFalse: [
	next = 'False' ifTrue: [value := false] ifFalse: [self error: 'unrecognized constant: ', next]]].
	stream skip: -1.
	self readPosition.
%

! ------------------- Remove existing behavior from PyNum
expectvalue /Metaclass3       
doit
PyNum removeAllMethods.
PyNum class removeAllMethods.
%
! ------------------- Class methods for PyNum
! ------------------- Instance methods for PyNum
set compile_env: 0
category: 'other'
method: PyNum
evaluate
	^n
%
category: 'other'
method: PyNum
initialize
	"Num(object n) -- a number as a PyObject."
	| stream string |
	stream := self stream.
	string := stream upTo: $,.
	stream skip: -1.
	n := (string notEmpty and: [string last == $j]) ifTrue: [
		Complex real: 0 imag: (string copyFrom: 1 to: string size - 1) asNumber.
	] ifFalse: [
		string asNumber.
	].
	self readPosition.
%
category: 'other'
method: PyNum
printOn: aStream
	super printOn: aStream.
	aStream nextPut: $(; 
		print: n;
		nextPut: $).
%
set compile_env: 0
category: 'testing support'
method: PyNum
_n

	^n
%

! ------------------- Remove existing behavior from PySet
expectvalue /Metaclass3       
doit
PySet removeAllMethods.
PySet class removeAllMethods.
%
! ------------------- Class methods for PySet
! ------------------- Instance methods for PySet
set compile_env: 0
category: 'other'
method: PySet
evaluate
	^(elts collect: [:each | each evaluate]) asSet
%
category: 'other'
method: PySet
initialize
	"Set(expr* elts)"

	elts := self collectAst:[self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PySetComp
expectvalue /Metaclass3       
doit
PySetComp removeAllMethods.
PySetComp class removeAllMethods.
%
! ------------------- Class methods for PySetComp
! ------------------- Instance methods for PySetComp
set compile_env: 0
category: 'other'
method: PySetComp
initialize
	"SetComp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%

! ------------------- Remove existing behavior from PyStarred
expectvalue /Metaclass3       
doit
PyStarred removeAllMethods.
PyStarred class removeAllMethods.
%
! ------------------- Class methods for PyStarred
! ------------------- Instance methods for PyStarred
set compile_env: 0
category: 'other'
method: PyStarred
initialize
	"Starred(expr value, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyStr
expectvalue /Metaclass3       
doit
PyStr removeAllMethods.
PyStr class removeAllMethods.
%
! ------------------- Class methods for PyStr
! ------------------- Instance methods for PyStr
set compile_env: 0
category: 'other'
method: PyStr
evaluate
	^Py_String withAll: s
%
category: 'other'
method: PyStr
initialize
	"Str(string s) -- need to specify raw, unicode, etc?"

	s := self string.
	self readPosition.
%
set compile_env: 0
category: 'testing support'
method: PyStr
_s

	^s
%

! ------------------- Remove existing behavior from PySubscript
expectvalue /Metaclass3       
doit
PySubscript removeAllMethods.
PySubscript class removeAllMethods.
%
! ------------------- Class methods for PySubscript
! ------------------- Instance methods for PySubscript
set compile_env: 0
category: 'other'
method: PySubscript
_ctx
	^ ctx
%
category: 'other'
method: PySubscript
_slice
	^ slice
%
category: 'other'
method: PySubscript
_value
	^ value
%
category: 'other'
method: PySubscript
assertContextIsStore
	value assertContextIsStore.
%
category: 'other'
method: PySubscript
assign: aValue in: globals 

	slice assign: aValue to: value
%
category: 'other'
method: PySubscript
evaluate
	| x |
	value assertContextIsLoad.
	x := self variableAt: value.
	^slice evaluate: x
	
%
category: 'other'
method: PySubscript
initialize
	"Subscript(expr value, slice slice, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	slice := Pyslice sliceFrom: self.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyTuple
expectvalue /Metaclass3       
doit
PyTuple removeAllMethods.
PyTuple class removeAllMethods.
%
! ------------------- Class methods for PyTuple
! ------------------- Instance methods for PyTuple
set compile_env: 0
category: 'other'
method: PyTuple
_ctx
	^ ctx
%
category: 'other'
method: PyTuple
_elts
	^ elts
%
category: 'other'
method: PyTuple
evaluate
	"May wish to revisit context"
	^Py_Tuple withAll: (elts collect: [:each | each evaluate]) immediateInvariant
%
category: 'other'
method: PyTuple
initialize
	"Tuple(expr* elts, expr_context ctx)"

	elts := self collectAst:[self expression].
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyUnaryOp
expectvalue /Metaclass3       
doit
PyUnaryOp removeAllMethods.
PyUnaryOp class removeAllMethods.
%
! ------------------- Class methods for PyUnaryOp
! ------------------- Instance methods for PyUnaryOp
set compile_env: 0
category: 'other'
method: PyUnaryOp
_op
	^ op
%
category: 'other'
method: PyUnaryOp
_operand
	^ operand
%
category: 'other'
method: PyUnaryOp
evaluate
	^ op operand: operand.
%
category: 'other'
method: PyUnaryOp
initialize
	"UnaryOp(unaryop op, expr operand)"

	op := PyUnaryop parent: self.
	self commaSpace.
	operand := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyYield
expectvalue /Metaclass3       
doit
PyYield removeAllMethods.
PyYield class removeAllMethods.
%
! ------------------- Class methods for PyYield
! ------------------- Instance methods for PyYield
set compile_env: 0
category: 'other'
method: PyYield
initialize
	"Yield(expr? value)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		value:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyYieldFrom
expectvalue /Metaclass3       
doit
PyYieldFrom removeAllMethods.
PyYieldFrom class removeAllMethods.
%
! ------------------- Class methods for PyYieldFrom
! ------------------- Instance methods for PyYieldFrom
set compile_env: 0
category: 'other'
method: PyYieldFrom
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyStatement
expectvalue /Metaclass3       
doit
PyStatement removeAllMethods.
PyStatement class removeAllMethods.
%
! ------------------- Class methods for PyStatement
set compile_env: 0
category: 'other'
classmethod: PyStatement
statementFrom: aNode

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for PyStatement
set compile_env: 0
category: 'other'
method: PyStatement
evaluate

	self subclassResponsibility.
%

! ------------------- Remove existing behavior from PyAnnAssign
expectvalue /Metaclass3       
doit
PyAnnAssign removeAllMethods.
PyAnnAssign class removeAllMethods.
%
! ------------------- Class methods for PyAnnAssign
! ------------------- Instance methods for PyAnnAssign
set compile_env: 0
category: 'other'
method: PyAnnAssign
addMissingPositions
%
category: 'other'
method: PyAnnAssign
initialize
	"AnnAssign(expr target, expr annotation, expr? value, int simple)"

	| stream next | 
	stream := self stream.
	target := self expression.
	self commaSpace.
	annotation := self expression. 
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		value := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	simple := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAssert
expectvalue /Metaclass3       
doit
PyAssert removeAllMethods.
PyAssert class removeAllMethods.
%
! ------------------- Class methods for PyAssert
! ------------------- Instance methods for PyAssert
set compile_env: 0
category: 'other'
method: PyAssert
addMissingPositions
%
category: 'other'
method: PyAssert
initialize
	"Assert(expr test, expr? msg)"

	| stream next |
	stream := self stream.
	test := self expression. 
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		msg:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyAssign
expectvalue /Metaclass3       
doit
PyAssign removeAllMethods.
PyAssign class removeAllMethods.
%
! ------------------- Class methods for PyAssign
! ------------------- Instance methods for PyAssign
set compile_env: 0
category: 'other'
method: PyAssign
addMissingPositions
%
category: 'other'
method: PyAssign
evaluate
	| x |
	x := value evaluate.
	targets do: [:each | parent variableAt: each put: x].
%
category: 'other'
method: PyAssign
initialize
	"Assign(expr* targets, expr value)"

	targets := self collectAst: [ self expression].
	self commaSpace.
	value := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAsyncFor
expectvalue /Metaclass3       
doit
PyAsyncFor removeAllMethods.
PyAsyncFor class removeAllMethods.
%
! ------------------- Class methods for PyAsyncFor
! ------------------- Instance methods for PyAsyncFor
set compile_env: 0
category: 'other'
method: PyAsyncFor
addMissingPositions
%
category: 'other'
method: PyAsyncFor
initialize
	"AsyncFor(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace.
	iter := self expression.
	self commaSpace.
	body := self suite.
	self commaSpace.
	orelse := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAsyncFunctionDef
expectvalue /Metaclass3       
doit
PyAsyncFunctionDef removeAllMethods.
PyAsyncFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyAsyncFunctionDef
! ------------------- Instance methods for PyAsyncFunctionDef
set compile_env: 0
category: 'other'
method: PyAsyncFunctionDef
addMissingPositions
%
category: 'other'
method: PyAsyncFunctionDef
initialize
	"AsyncFunctionDef(identifier name, arguments args,
							  stmt* body, expr* decorator_list, 
							  expr? returns)"

	| stream next |
	stream := self stream.
	name := stream upTo: $'.
	(stream peekFor: $,) ifFalse: [self error].
	self commaSpace.
	args := PyArguments parent: self.
	body := self suite.
	self commaSpace.
	decorator_list := self collectAst: [ self expression ].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		returns:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyAsyncWith
expectvalue /Metaclass3       
doit
PyAsyncWith removeAllMethods.
PyAsyncWith class removeAllMethods.
%
! ------------------- Class methods for PyAsyncWith
! ------------------- Instance methods for PyAsyncWith
set compile_env: 0
category: 'other'
method: PyAsyncWith
addMissingPositions
%
category: 'other'
method: PyAsyncWith
initialize
	"AsyncWith(withitem* items, stmt* body)"

	items := self collectAst: [ PyWithItem parent: self].
	self commaSpace.
	body := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyAugAssign
expectvalue /Metaclass3       
doit
PyAugAssign removeAllMethods.
PyAugAssign class removeAllMethods.
%
! ------------------- Class methods for PyAugAssign
! ------------------- Instance methods for PyAugAssign
set compile_env: 0
category: 'other'
method: PyAugAssign
addMissingPositions
%
category: 'other'
method: PyAugAssign
evaluate
	
	| x |
	x := op left: (parent variableAt: target) right: value evaluate.
	parent variableAt: target put: x.
%
category: 'other'
method: PyAugAssign
initialize
	"AugAssign(expr target, operator op, expr value)"

	target := self expression.
	self commaSpace.
	op := PyOperator parent: self.
	self commaSpace.
	value := self expression.
	self readPosition.
%

! ------------------- Remove existing behavior from PyBreak
expectvalue /Metaclass3       
doit
PyBreak removeAllMethods.
PyBreak class removeAllMethods.
%
! ------------------- Class methods for PyBreak
! ------------------- Instance methods for PyBreak
set compile_env: 0
category: 'other'
method: PyBreak
evaluate
	BreakNotification signal.
%
category: 'other'
method: PyBreak
initialize

self readPositionOnly
%

! ------------------- Remove existing behavior from PyClassDef
expectvalue /Metaclass3       
doit
PyClassDef removeAllMethods.
PyClassDef class removeAllMethods.
%
! ------------------- Class methods for PyClassDef
! ------------------- Instance methods for PyClassDef
set compile_env: 0
category: 'other'
method: PyClassDef
initialize
	"ClassDef(identifier name, expr* bases, 
		keyword* keywords, stmt* body, expr* decorator_list)"

	| stream |
	stream := self stream.
	name := stream upTo: $'.
	(stream peekFor: $,) ifFalse: [self error].
	self commaSpace.
	bases := self collectAst:[self expression].
	self commaSpace.
	keywords := self collectAst: [PyKeyword parent: self].
	self commaSpace.
	body := self suite.
	self commaSpace.
	decorator_list := self collectAst:[self expression].
	self readPosition.
%

! ------------------- Remove existing behavior from PyContinue
expectvalue /Metaclass3       
doit
PyContinue removeAllMethods.
PyContinue class removeAllMethods.
%
! ------------------- Class methods for PyContinue
! ------------------- Instance methods for PyContinue
set compile_env: 0
category: 'other'
method: PyContinue
addMissingPositions
%
category: 'other'
method: PyContinue
evaluate
	ContinueNotification signal
%
category: 'other'
method: PyContinue
initialize
"continue"
%

! ------------------- Remove existing behavior from PyDelete
expectvalue /Metaclass3       
doit
PyDelete removeAllMethods.
PyDelete class removeAllMethods.
%
! ------------------- Class methods for PyDelete
! ------------------- Instance methods for PyDelete
set compile_env: 0
category: 'other'
method: PyDelete
addMissingPositions
%
category: 'other'
method: PyDelete
initialize
	"Delete(expr* targets)"

	targets := self collectAst: [ self expression ].
	self readPosition.
%

! ------------------- Remove existing behavior from PyExpr
expectvalue /Metaclass3       
doit
PyExpr removeAllMethods.
PyExpr class removeAllMethods.
%
! ------------------- Class methods for PyExpr
! ------------------- Instance methods for PyExpr
set compile_env: 0
category: 'other'
method: PyExpr
addMissingPositions
%
category: 'other'
method: PyExpr
evaluate
	^value evaluate
%
category: 'other'
method: PyExpr
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
set compile_env: 0
category: 'testing support'
method: PyExpr
_value

	^value
%

! ------------------- Remove existing behavior from PyFor
expectvalue /Metaclass3       
doit
PyFor removeAllMethods.
PyFor class removeAllMethods.
%
! ------------------- Class methods for PyFor
! ------------------- Instance methods for PyFor
set compile_env: 0
category: 'other'
method: PyFor
addMissingPositions

	super addMissingPositions. 
	target addMissingPositions.
	iter addMissingPositions.
	body do: [:each | each addMissingPositions].
	orelse do: [:each | each addMissingPositions].
%
category: 'other'
method: PyFor
evaluate

	[
		iter evaluate do: [:i | 
			[
				parent variableAt: target put: i.
				body do: [:each | each evaluate].
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification do: [:ex |
		ex return.
	].
	orelse do: [:each | each evaluate].
%
category: 'other'
method: PyFor
initialize
	"For(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace. 
	iter := self expression. 
	self commaSpace.
	body := self suite. 
	self commaSpace. 
	orelse := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyFunctionDef
expectvalue /Metaclass3       
doit
PyFunctionDef removeAllMethods.
PyFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyFunctionDef
! ------------------- Instance methods for PyFunctionDef
set compile_env: 0
category: 'other'
method: PyFunctionDef
addMissingPositions
%
category: 'other'
method: PyFunctionDef
initialize
	"FunctionDef(identifier name, arguments args, stmt* body, expr* decorator_list, expr? returns)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	args := PyArguments parent: self.
	self commaSpace.
	body := self suite. 
	self commaSpace.
	decorator_list :=  self collectAst: [self expression.].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		returns := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyGlobal
expectvalue /Metaclass3       
doit
PyGlobal removeAllMethods.
PyGlobal class removeAllMethods.
%
! ------------------- Class methods for PyGlobal
! ------------------- Instance methods for PyGlobal
set compile_env: 0
category: 'other'
method: PyGlobal
addMissingPositions

	super addMissingPositions.
	names do: [:each | each addMissingPositions].
%
category: 'other'
method: PyGlobal
initialize
	"Global(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		self stream upTo: $'.].
	self readPosition.
%

! ------------------- Remove existing behavior from PyIf
expectvalue /Metaclass3       
doit
PyIf removeAllMethods.
PyIf class removeAllMethods.
%
! ------------------- Class methods for PyIf
! ------------------- Instance methods for PyIf
set compile_env: 0
category: 'other'
method: PyIf
addMissingPositions
%
category: 'other'
method: PyIf
evaluate
	test evaluate
		ifTrue: [body do: [:each | each evaluate]]
		ifFalse: [orelse do: [:each | each evaluate]].
%
category: 'other'
method: PyIf
initialize
	"If(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := self suite.
	self commaSpace.
	orelse := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyImport
expectvalue /Metaclass3       
doit
PyImport removeAllMethods.
PyImport class removeAllMethods.
%
! ------------------- Class methods for PyImport
! ------------------- Instance methods for PyImport
set compile_env: 0
category: 'other'
method: PyImport
addMissingPositions

	super addMissingPositions.
	names do: [:each | each addMissingPositions].
%
category: 'other'
method: PyImport
evaluate
	(names size == 1 and: [names first name = 'random']) ifTrue: [
		parent variableAt: names first put: PyRandom new.
		^self
	].
	self halt.
"
	names do: [:each |
		| module |
		module := Builtins current
			__import__: each name
			_: self globals
			_: self locals
			_: #()
			_: 0.
		module halt.
	].
"
%
category: 'other'
method: PyImport
initialize
	"Import(alias* names)"

	names := self collectAst: [ self alias ].
	self readPosition.
%

! ------------------- Remove existing behavior from PyImportFrom
expectvalue /Metaclass3       
doit
PyImportFrom removeAllMethods.
PyImportFrom class removeAllMethods.
%
! ------------------- Class methods for PyImportFrom
! ------------------- Instance methods for PyImportFrom
set compile_env: 0
category: 'other'
method: PyImportFrom
addMissingPositions

	super addMissingPositions.
	names do: [:each | each addMissingPositions].
	"need to handle optional level"
%
category: 'other'
method: PyImportFrom
evaluate
	self halt.
%
category: 'other'
method: PyImportFrom
initialize
	"ImportFrom(identifier? module, alias* names, int? level)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		module := stream upTo: $'.
		(stream peekFor: $,) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $,.
		string = 'None' ifFalse: [self error].
	].
	names := self collectAst: [ self alias ].
	self commaSpace.
	level := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%

! ------------------- Remove existing behavior from PyNonlocal
expectvalue /Metaclass3       
doit
PyNonlocal removeAllMethods.
PyNonlocal class removeAllMethods.
%
! ------------------- Class methods for PyNonlocal
! ------------------- Instance methods for PyNonlocal
set compile_env: 0
category: 'other'
method: PyNonlocal
addMissingPositions
%
category: 'other'
method: PyNonlocal
initialize
	"Nonlocal(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		self stream upTo: $'.].
	self readPosition.
%

! ------------------- Remove existing behavior from PyPass
expectvalue /Metaclass3       
doit
PyPass removeAllMethods.
PyPass class removeAllMethods.
%
! ------------------- Class methods for PyPass
! ------------------- Instance methods for PyPass
set compile_env: 0
category: 'other'
method: PyPass
addMissingPositions
%
category: 'other'
method: PyPass
evaluate
	"This is a NULL operation"
%
category: 'other'
method: PyPass
initialize
	"pass"
%

! ------------------- Remove existing behavior from PyRaise
expectvalue /Metaclass3       
doit
PyRaise removeAllMethods.
PyRaise class removeAllMethods.
%
! ------------------- Class methods for PyRaise
! ------------------- Instance methods for PyRaise
set compile_env: 0
category: 'other'
method: PyRaise
addMissingPositions
%
category: 'other'
method: PyRaise
initialize
	"Raise(expr? exc, expr? cause)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		exc := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		cause:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyReturn
expectvalue /Metaclass3       
doit
PyReturn removeAllMethods.
PyReturn class removeAllMethods.
%
! ------------------- Class methods for PyReturn
! ------------------- Instance methods for PyReturn
set compile_env: 0
category: 'other'
method: PyReturn
addMissingPositions
%
category: 'other'
method: PyReturn
initialize
	"Return(expr? value)"
	
	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	] ifFalse: [
		value := self expression.
	].
	self readPosition.
%

! ------------------- Remove existing behavior from PyTry
expectvalue /Metaclass3       
doit
PyTry removeAllMethods.
PyTry class removeAllMethods.
%
! ------------------- Class methods for PyTry
! ------------------- Instance methods for PyTry
set compile_env: 0
category: 'other'
method: PyTry
addMissingPositions
%
category: 'other'
method: PyTry
initialize
	"Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)"

	body := self suite.
	self commaSpace.
	handlers := self collectAst: [PyExceptHandler parent: self].
	self commaSpace.
	orelse := self suite.
	self commaSpace.
	finalbody := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyWhile
expectvalue /Metaclass3       
doit
PyWhile removeAllMethods.
PyWhile class removeAllMethods.
%
! ------------------- Class methods for PyWhile
! ------------------- Instance methods for PyWhile
set compile_env: 0
category: 'other'
method: PyWhile
addMissingPositions
%
category: 'other'
method: PyWhile
evaluate
	[
		[
			test evaluate.
		] whileTrue: [
			[
				body do: [:each | each evaluate].
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification do: [:ex | 
		ex return.
	].
	orelse do: [:each | each evaluate].
%
category: 'other'
method: PyWhile
initialize
	"While(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := self suite.
	self commaSpace.
	orelse := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyWith
expectvalue /Metaclass3       
doit
PyWith removeAllMethods.
PyWith class removeAllMethods.
%
! ------------------- Class methods for PyWith
! ------------------- Instance methods for PyWith
set compile_env: 0
category: 'other'
method: PyWith
addMissingPositions
%
category: 'other'
method: PyWith
initialize
	"With(withitem* items, stmt* body)"

	items := self collectAst: [PyWithItem parent: self].
	self commaSpace.
	body := self suite.
	self readPosition.
%

! ------------------- Remove existing behavior from PyBoolop
expectvalue /Metaclass3       
doit
PyBoolop removeAllMethods.
PyBoolop class removeAllMethods.
%
! ------------------- Class methods for PyBoolop
set compile_env: 0
category: 'other'
classmethod: PyBoolop
parent: aNode
	"boolop = And | Or"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyBoolop
set compile_env: 0
category: 'other'
method: PyBoolop
initialize
	"override to do nothing!"
%

! ------------------- Remove existing behavior from PyAnd
expectvalue /Metaclass3       
doit
PyAnd removeAllMethods.
PyAnd class removeAllMethods.
%
! ------------------- Class methods for PyAnd
! ------------------- Instance methods for PyAnd
set compile_env: 0
category: 'other'
method: PyAnd
values: anArray
	^anArray allSatisfy: [:each | each evaluate].
%

! ------------------- Remove existing behavior from PyOr
expectvalue /Metaclass3       
doit
PyOr removeAllMethods.
PyOr class removeAllMethods.
%
! ------------------- Class methods for PyOr
! ------------------- Instance methods for PyOr
set compile_env: 0
category: 'other'
method: PyOr
values: anArray
	^anArray anySatisfy: [:each | each evaluate].
%

! ------------------- Remove existing behavior from PyCmpop
expectvalue /Metaclass3       
doit
PyCmpop removeAllMethods.
PyCmpop class removeAllMethods.
%
! ------------------- Class methods for PyCmpop
set compile_env: 0
category: 'other'
classmethod: PyCmpop
parent: aNode
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyCmpop
set compile_env: 0
category: 'other'
method: PyCmpop
initialize
	"override to do nothing!"
%
category: 'other'
method: PyCmpop
left: leftOperand right: rightOperand

	^leftOperand evaluate + rightOperand evaluate
%

! ------------------- Remove existing behavior from PyEq
expectvalue /Metaclass3       
doit
PyEq removeAllMethods.
PyEq class removeAllMethods.
%
! ------------------- Class methods for PyEq
! ------------------- Instance methods for PyEq
set compile_env: 0
category: 'other'
method: PyEq
left: leftOperand right: rightOperand

	^leftOperand = rightOperand
%

! ------------------- Remove existing behavior from PyGt
expectvalue /Metaclass3       
doit
PyGt removeAllMethods.
PyGt class removeAllMethods.
%
! ------------------- Class methods for PyGt
! ------------------- Instance methods for PyGt
set compile_env: 0
category: 'other'
method: PyGt
left: left right: right
	^left > right
%

! ------------------- Remove existing behavior from PyGtE
expectvalue /Metaclass3       
doit
PyGtE removeAllMethods.
PyGtE class removeAllMethods.
%
! ------------------- Class methods for PyGtE
! ------------------- Instance methods for PyGtE
set compile_env: 0
category: 'other'
method: PyGtE
left: leftOperand right: rightOperand

	^leftOperand >= rightOperand
%

! ------------------- Remove existing behavior from PyIn
expectvalue /Metaclass3       
doit
PyIn removeAllMethods.
PyIn class removeAllMethods.
%
! ------------------- Class methods for PyIn
! ------------------- Instance methods for PyIn

! ------------------- Remove existing behavior from PyIs
expectvalue /Metaclass3       
doit
PyIs removeAllMethods.
PyIs class removeAllMethods.
%
! ------------------- Class methods for PyIs
! ------------------- Instance methods for PyIs
set compile_env: 0
category: 'other'
method: PyIs
left: leftOperand right: rightOperand

	^leftOperand == rightOperand
%

! ------------------- Remove existing behavior from PyIsNot
expectvalue /Metaclass3       
doit
PyIsNot removeAllMethods.
PyIsNot class removeAllMethods.
%
! ------------------- Class methods for PyIsNot
! ------------------- Instance methods for PyIsNot
set compile_env: 0
category: 'other'
method: PyIsNot
left: leftOperand right: rightOperand

	^(leftOperand == rightOperand) not
%

! ------------------- Remove existing behavior from PyLt
expectvalue /Metaclass3       
doit
PyLt removeAllMethods.
PyLt class removeAllMethods.
%
! ------------------- Class methods for PyLt
! ------------------- Instance methods for PyLt
set compile_env: 0
category: 'other'
method: PyLt
left: left right: right
	^left < right
%

! ------------------- Remove existing behavior from PyLtE
expectvalue /Metaclass3       
doit
PyLtE removeAllMethods.
PyLtE class removeAllMethods.
%
! ------------------- Class methods for PyLtE
! ------------------- Instance methods for PyLtE
set compile_env: 0
category: 'other'
method: PyLtE
left: leftOperand right: rightOperand

	^leftOperand <= rightOperand
%

! ------------------- Remove existing behavior from PyNotEq
expectvalue /Metaclass3       
doit
PyNotEq removeAllMethods.
PyNotEq class removeAllMethods.
%
! ------------------- Class methods for PyNotEq
! ------------------- Instance methods for PyNotEq
set compile_env: 0
category: 'other'
method: PyNotEq
left: leftOperand right: rightOperand

	^(leftOperand = rightOperand) not
%

! ------------------- Remove existing behavior from PyNotIn
expectvalue /Metaclass3       
doit
PyNotIn removeAllMethods.
PyNotIn class removeAllMethods.
%
! ------------------- Class methods for PyNotIn
! ------------------- Instance methods for PyNotIn
set compile_env: 0
category: 'other'
method: PyNotIn
left: leftOperand right: rightOperand
	self error.
	^self subclassResponsibility
%

! ------------------- Remove existing behavior from PyComprehension
expectvalue /Metaclass3       
doit
PyComprehension removeAllMethods.
PyComprehension class removeAllMethods.
%
! ------------------- Class methods for PyComprehension
! ------------------- Instance methods for PyComprehension
set compile_env: 0
category: 'other'
method: PyComprehension
initialize
	"comprehension = (expr target, expr iter, expr* ifs, int is_async)"

	| stream x |
	stream := self stream.
	x := stream upTo: $(.
	x ~= 'comprehension' ifTrue: [self error].
	target := self expression.
	self commaSpace.
	iter := self expression.
	self commaSpace.
	ifs := self collectAst:[self expression].
	self commaSpace.
	is_async := (stream upTo: $)) asNumber.
%

! ------------------- Remove existing behavior from PyExpressionContext
expectvalue /Metaclass3       
doit
PyExpressionContext removeAllMethods.
PyExpressionContext class removeAllMethods.
%
! ------------------- Class methods for PyExpressionContext
set compile_env: 0
category: 'other'
classmethod: PyExpressionContext
parent: aNode
	"expr_context = Load | Store | Del | AugLoad | AugStore | Param"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyExpressionContext
set compile_env: 0
category: 'other'
method: PyExpressionContext
addMissingPositions

	| token |
	token := self stream next.
self halt.
%
category: 'other'
method: PyExpressionContext
assertIsLoad

	self error: 'Expression Context should be <Load> but is <' , self class name , '>'.
%
category: 'other'
method: PyExpressionContext
assertIsStore

	self error: 'Expression Context should be <Store> but is <' , self class name , '>'.
%
category: 'other'
method: PyExpressionContext
initialize
	"override to do nothing!"
%

! ------------------- Remove existing behavior from PyAugLoad
expectvalue /Metaclass3       
doit
PyAugLoad removeAllMethods.
PyAugLoad class removeAllMethods.
%
! ------------------- Class methods for PyAugLoad
! ------------------- Instance methods for PyAugLoad

! ------------------- Remove existing behavior from PyAugStore
expectvalue /Metaclass3       
doit
PyAugStore removeAllMethods.
PyAugStore class removeAllMethods.
%
! ------------------- Class methods for PyAugStore
! ------------------- Instance methods for PyAugStore

! ------------------- Remove existing behavior from PyDel
expectvalue /Metaclass3       
doit
PyDel removeAllMethods.
PyDel class removeAllMethods.
%
! ------------------- Class methods for PyDel
! ------------------- Instance methods for PyDel

! ------------------- Remove existing behavior from PyLoad
expectvalue /Metaclass3       
doit
PyLoad removeAllMethods.
PyLoad class removeAllMethods.
%
! ------------------- Class methods for PyLoad
! ------------------- Instance methods for PyLoad
set compile_env: 0
category: 'other'
method: PyLoad
assertIsLoad
	"Override to avoid inherited error"
%

! ------------------- Remove existing behavior from PyParam
expectvalue /Metaclass3       
doit
PyParam removeAllMethods.
PyParam class removeAllMethods.
%
! ------------------- Class methods for PyParam
! ------------------- Instance methods for PyParam

! ------------------- Remove existing behavior from PyStore
expectvalue /Metaclass3       
doit
PyStore removeAllMethods.
PyStore class removeAllMethods.
%
! ------------------- Class methods for PyStore
! ------------------- Instance methods for PyStore
set compile_env: 0
category: 'other'
method: PyStore
assertIsStore
	"Overide to avoid error"
%

! ------------------- Remove existing behavior from PyKeyword
expectvalue /Metaclass3       
doit
PyKeyword removeAllMethods.
PyKeyword class removeAllMethods.
%
! ------------------- Class methods for PyKeyword
! ------------------- Instance methods for PyKeyword
set compile_env: 0
category: 'other'
method: PyKeyword
initialize
	"keyword = (identifier? arg, expr value)"
	| next stream|
	stream := self stream.
	next := stream next: 8.
	next ~= 'keyword(' ifTrue: [self error.].
	(stream peekFor: $') ifFalse: [self error].
	arg := stream upTo: $'.
	self commaSpace.
	value := self expression.
	(stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: PyKeyword
name

	^arg
%
category: 'other'
method: PyKeyword
value

	^value
%

! ------------------- Remove existing behavior from PyModule
expectvalue /Metaclass3       
doit
PyModule removeAllMethods.
PyModule class removeAllMethods.
%
! ------------------- Class methods for PyModule
set compile_env: 0
category: 'other'
classmethod: PyModule
script: aString
"
PyModule script: '$HOME/code/Python/performance/pyperformance'.
"
	^self new
		load: aString as: '__main__';
		yourself
%
category: 'other'
classmethod: PyModule
test
"
PyModule test
"

	^PyModule script: '$HOME/code/Python/GemStoneP/mastermind.py'.
%
! ------------------- Instance methods for PyModule
set compile_env: 0
category: 'other'
method: PyModule
addMissingPositions

	statements do: [:each | each addMissingPositions].
	stream := nil.
%
category: 'other'
method: PyModule
globals

self halt.
	^globals
%
category: 'other'
method: PyModule
initialize

	| result |
	globals := Dictionary new.
	parent ifNil: [parent := PySystem new].
	[
		statements do: [:each | result := each evaluate].
	] on: CancelNotification do: [:ex |
		ex return.
	].
	^result
%
category: 'other'
method: PyModule
load: aPathString as: aNameString

	name := aNameString.
	path := aPathString.
	self
		parseAst;
		readTokens;
		addMissingPositions;
		readSource;
		yourself.
%
category: 'other'
method: PyModule
module

	^self
%
category: 'other'
method: PyModule
parseAst

	| string |
	stream := ReadStream on: self readAst.
	string := stream upTo: $(.
	string = 'Module' ifFalse: [self error].
	statements := self suite.
	(stream peekFor: $)) ifFalse: [self error].
	string := stream upToEnd trimSeparators.
	string isEmpty ifFalse: [self error: 'Unexpected text at end of AST: ' , string printString].
%
category: 'other'
method: PyModule
pythonPath

	^'/usr/local/bin/python3'
%
category: 'other'
method: PyModule
readAst

	| string1 string2 string3 |
	string1 := '
import ast
file=open(''' , path , ''',''r'')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)
'.
	string2 := 'echo "' , string1 , '" | ' , self pythonPath.
	string3 := System performOnServer: string2.
	^string3
%
category: 'other'
method: PyModule
readSource

	| file |
	file := GsFile openReadOnServer: path.
	source := file contentsAsUtf8.
	file close.
%
category: 'other'
method: PyModule
readTokens

	| string tokens |
	string := self pythonPath , ' -m tokenize -e ' , path.
	tokens := System performOnServer: string.
	tokens := tokens subStrings: Character lf.
	tokens := tokens reject: [:each | each isEmpty].
	tokens := tokens collect: [:each | PyToken fromString: each].
	stream := ReadStream on: tokens.
%
category: 'other'
method: PyModule
stream

	^stream
%
category: 'other'
method: PyModule
variableAt: aName 
	
	^globals at: aName id ifAbsent: [Builtins current variableAt: aName]
%
category: 'other'
method: PyModule
variableAt: aTarget put: aValue
	
	aTarget assign: aValue in: globals
%
set compile_env: 0
category: 'testing support'
method: PyModule
_statements

	^statements
%

! ------------------- Remove existing behavior from PyRandom
expectvalue /Metaclass3       
doit
PyRandom removeAllMethods.
PyRandom class removeAllMethods.
%
! ------------------- Class methods for PyRandom
! ------------------- Instance methods for PyRandom
set compile_env: 0
category: 'functions'
method: PyRandom
randint: arguments keywords: keywords
	"This is not actually a builtin"
	"It should be part of importing random"

^Random new integerBetween: arguments first and: arguments second.
%

! ------------------- Remove existing behavior from PyOperator
expectvalue /Metaclass3       
doit
PyOperator removeAllMethods.
PyOperator class removeAllMethods.
%
! ------------------- Class methods for PyOperator
set compile_env: 0
category: 'other'
classmethod: PyOperator
parent: aNode
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyOperator
set compile_env: 0
category: 'other'
method: PyOperator
initialize
	"override to do nothing!"
%
category: 'other'
method: PyOperator
left: leftOperand right: rightOperand

	self subclassResponsibility
%

! ------------------- Remove existing behavior from PyAdd
expectvalue /Metaclass3       
doit
PyAdd removeAllMethods.
PyAdd class removeAllMethods.
%
! ------------------- Class methods for PyAdd
! ------------------- Instance methods for PyAdd
set compile_env: 0
category: 'other'
method: PyAdd
left: leftOperand right: rightOperand

	^leftOperand + rightOperand
%

! ------------------- Remove existing behavior from PyBitAnd
expectvalue /Metaclass3       
doit
PyBitAnd removeAllMethods.
PyBitAnd class removeAllMethods.
%
! ------------------- Class methods for PyBitAnd
! ------------------- Instance methods for PyBitAnd
set compile_env: 0
category: 'other'
method: PyBitAnd
left: leftOperand right: rightOperand

	^leftOperand bitAnd: rightOperand
%

! ------------------- Remove existing behavior from PyBitOr
expectvalue /Metaclass3       
doit
PyBitOr removeAllMethods.
PyBitOr class removeAllMethods.
%
! ------------------- Class methods for PyBitOr
! ------------------- Instance methods for PyBitOr
set compile_env: 0
category: 'other'
method: PyBitOr
left: leftOperand right: rightOperand

	^leftOperand bitOr: rightOperand 
%

! ------------------- Remove existing behavior from PyBitXor
expectvalue /Metaclass3       
doit
PyBitXor removeAllMethods.
PyBitXor class removeAllMethods.
%
! ------------------- Class methods for PyBitXor
! ------------------- Instance methods for PyBitXor
set compile_env: 0
category: 'other'
method: PyBitXor
left: leftOperand right: rightOperand

	^leftOperand bitXor: rightOperand 
%

! ------------------- Remove existing behavior from PyDiv
expectvalue /Metaclass3       
doit
PyDiv removeAllMethods.
PyDiv class removeAllMethods.
%
! ------------------- Class methods for PyDiv
! ------------------- Instance methods for PyDiv
set compile_env: 0
category: 'other'
method: PyDiv
left: leftOperand right: rightOperand

	^(leftOperand / rightOperand) asFloat
%

! ------------------- Remove existing behavior from PyFloorDiv
expectvalue /Metaclass3       
doit
PyFloorDiv removeAllMethods.
PyFloorDiv class removeAllMethods.
%
! ------------------- Class methods for PyFloorDiv
! ------------------- Instance methods for PyFloorDiv
set compile_env: 0
category: 'other'
method: PyFloorDiv
left: leftOperand right: rightOperand

	^leftOperand // rightOperand
%

! ------------------- Remove existing behavior from PyLShift
expectvalue /Metaclass3       
doit
PyLShift removeAllMethods.
PyLShift class removeAllMethods.
%
! ------------------- Class methods for PyLShift
! ------------------- Instance methods for PyLShift
set compile_env: 0
category: 'other'
method: PyLShift
left: leftOperand right: rightOperand

	^leftOperand bitShift: rightOperand
%

! ------------------- Remove existing behavior from PyMatMult
expectvalue /Metaclass3       
doit
PyMatMult removeAllMethods.
PyMatMult class removeAllMethods.
%
! ------------------- Class methods for PyMatMult
! ------------------- Instance methods for PyMatMult
set compile_env: 0
category: 'other'
method: PyMatMult
left: leftOperand right: rightOperand
	self error.
	^leftOperand bitShift: rightOperand
%

! ------------------- Remove existing behavior from PyMod
expectvalue /Metaclass3       
doit
PyMod removeAllMethods.
PyMod class removeAllMethods.
%
! ------------------- Class methods for PyMod
! ------------------- Instance methods for PyMod
set compile_env: 0
category: 'other'
method: PyMod
left: leftOperand right: rightOperand

	^leftOperand rem: rightOperand
%

! ------------------- Remove existing behavior from PyMult
expectvalue /Metaclass3       
doit
PyMult removeAllMethods.
PyMult class removeAllMethods.
%
! ------------------- Class methods for PyMult
! ------------------- Instance methods for PyMult
set compile_env: 0
category: 'other'
method: PyMult
left: leftOperand right: rightOperand

	^leftOperand * rightOperand
%

! ------------------- Remove existing behavior from PyPow
expectvalue /Metaclass3       
doit
PyPow removeAllMethods.
PyPow class removeAllMethods.
%
! ------------------- Class methods for PyPow
! ------------------- Instance methods for PyPow
set compile_env: 0
category: 'other'
method: PyPow
left: leftOperand right: rightOperand

	^leftOperand raisedTo: rightOperand
%

! ------------------- Remove existing behavior from PyRShift
expectvalue /Metaclass3       
doit
PyRShift removeAllMethods.
PyRShift class removeAllMethods.
%
! ------------------- Class methods for PyRShift
! ------------------- Instance methods for PyRShift
set compile_env: 0
category: 'other'
method: PyRShift
left: leftOperand right: rightOperand

	^leftOperand bitShift: rightOperand negated
%

! ------------------- Remove existing behavior from PySub
expectvalue /Metaclass3       
doit
PySub removeAllMethods.
PySub class removeAllMethods.
%
! ------------------- Class methods for PySub
! ------------------- Instance methods for PySub
set compile_env: 0
category: 'other'
method: PySub
left: leftOperand right: rightOperand

	^leftOperand - rightOperand
%

! ------------------- Remove existing behavior from Pyslice
expectvalue /Metaclass3       
doit
Pyslice removeAllMethods.
Pyslice class removeAllMethods.
%
! ------------------- Class methods for Pyslice
set compile_env: 0
category: 'other'
classmethod: Pyslice
sliceFrom: aNode

| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for Pyslice
set compile_env: 0
category: 'other'
method: Pyslice
assign: aValue to: aVariable
	self subclassResponsibility.
%
category: 'other'
method: Pyslice
evaluate: aList
	self subclassResponsibility
%

! ------------------- Remove existing behavior from PyExtSlice
expectvalue /Metaclass3       
doit
PyExtSlice removeAllMethods.
PyExtSlice class removeAllMethods.
%
! ------------------- Class methods for PyExtSlice
! ------------------- Instance methods for PyExtSlice
set compile_env: 0
category: 'other'
method: PyExtSlice
initialize
	"ExtSlice(slice* dims)"
	
	self halt.
%

! ------------------- Remove existing behavior from PyIndex
expectvalue /Metaclass3       
doit
PyIndex removeAllMethods.
PyIndex class removeAllMethods.
%
! ------------------- Class methods for PyIndex
! ------------------- Instance methods for PyIndex
set compile_env: 0
category: 'other'
method: PyIndex
assign: aValue to: aVariable
	| x y |
	x := value evaluate.
	y := aVariable evaluate.
	y at: x + 1 put: aValue.
%
category: 'other'
method: PyIndex
evaluate: aList
	value assertContextIsLoad.
	^aList at: value evaluate + 1.
%
category: 'other'
method: PyIndex
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%

! ------------------- Remove existing behavior from PySlice
expectvalue /Metaclass3       
doit
PySlice removeAllMethods.
PySlice class removeAllMethods.
%
! ------------------- Class methods for PySlice
! ------------------- Instance methods for PySlice
set compile_env: 0
category: 'other'
method: PySlice
_lower
	^ lower
%
category: 'other'
method: PySlice
_step
	^ step
%
category: 'other'
method: PySlice
_upper
	^ upper
%
category: 'other'
method: PySlice
evaluate: aList
	self halt.
%
category: 'other'
method: PySlice
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		lower:= self expression.
	] ifFalse: [
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ lower := self expression. ] ifFalse: [ stream next: 4. ].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		upper := self expression.
	] ifFalse: [
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ upper := self expression. ] ifFalse: [ stream next: 4. ].
	].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		step := self expression.
	] ifFalse: [
		next := stream peekN: 4.
		next ~= 'None' ifTrue: [ 
			step := self expression. 
			(stream peekFor: $)) ifFalse: [ self error. ].
		] ifFalse: [ stream next: 5. ].
	].
%

! ------------------- Remove existing behavior from PyUnaryop
expectvalue /Metaclass3       
doit
PyUnaryop removeAllMethods.
PyUnaryop class removeAllMethods.
%
! ------------------- Class methods for PyUnaryop
set compile_env: 0
category: 'other'
classmethod: PyUnaryop
parent: aNode
	"unaryop = Invert | Not | UAdd | USub"

	| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	(aNode stream peekFor: $)) ifFalse: [self error].
	class := PythonGlobals at: symbol.
	^class basicNew initialize: aNode; yourself
%
! ------------------- Instance methods for PyUnaryop
set compile_env: 0
category: 'other'
method: PyUnaryop
initialize
	"override to do nothing!"
%
category: 'other'
method: PyUnaryop
operand: operand
	^self subclassResponsibility
%

! ------------------- Remove existing behavior from PyInvert
expectvalue /Metaclass3       
doit
PyInvert removeAllMethods.
PyInvert class removeAllMethods.
%
! ------------------- Class methods for PyInvert
! ------------------- Instance methods for PyInvert
set compile_env: 0
category: 'other'
method: PyInvert
operand: operand
	^operand bitInvert
%

! ------------------- Remove existing behavior from PyNot
expectvalue /Metaclass3       
doit
PyNot removeAllMethods.
PyNot class removeAllMethods.
%
! ------------------- Class methods for PyNot
! ------------------- Instance methods for PyNot
set compile_env: 0
category: 'other'
method: PyNot
operand: operand
	^operand not
%

! ------------------- Remove existing behavior from PyUAdd
expectvalue /Metaclass3       
doit
PyUAdd removeAllMethods.
PyUAdd class removeAllMethods.
%
! ------------------- Class methods for PyUAdd
! ------------------- Instance methods for PyUAdd
set compile_env: 0
category: 'other'
method: PyUAdd
operand: operand
	^operand
%

! ------------------- Remove existing behavior from PyUSub
expectvalue /Metaclass3       
doit
PyUSub removeAllMethods.
PyUSub class removeAllMethods.
%
! ------------------- Class methods for PyUSub
! ------------------- Instance methods for PyUSub
set compile_env: 0
category: 'other'
method: PyUSub
operand: operand
	^operand evaluate negated
%

! ------------------- Remove existing behavior from PyWithItem
expectvalue /Metaclass3       
doit
PyWithItem removeAllMethods.
PyWithItem class removeAllMethods.
%
! ------------------- Class methods for PyWithItem
! ------------------- Instance methods for PyWithItem
set compile_env: 0
category: 'other'
method: PyWithItem
initialize
	"withitem = (expr context_expr, expr? optional_vars)"

	| stream next |
	stream := self stream.
	context_expr := self expression.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		optional_vars := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
%

! ------------------- Remove existing behavior from PySystem
expectvalue /Metaclass3       
doit
PySystem removeAllMethods.
PySystem class removeAllMethods.
%
! ------------------- Class methods for PySystem
set compile_env: 0
category: 'other'
classmethod: PySystem
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for PySystem
set compile_env: 0
category: 'other'
method: PySystem
initialize

	modules := KeyValueDictionary new.
%
category: 'other'
method: PySystem
modules

	^modules
%
category: 'other'
method: PySystem
sys

	^self
%

! ------------------- Remove existing behavior from PyToken
expectvalue /Metaclass3       
doit
PyToken removeAllMethods.
PyToken class removeAllMethods.
%
! ------------------- Class methods for PyToken
set compile_env: 0
category: 'other'
classmethod: PyToken
fromString: aString

	^self basicNew
		initialize: aString;
		yourself
%
! ------------------- Instance methods for PyToken
set compile_env: 0
category: 'other'
method: PyToken
column

	^startColumn
%
category: 'other'
method: PyToken
initialize: aString

	| pieces range temp |
	pieces := aString subStrings: $:.
	temp := pieces at: 1.
	pieces := (pieces at: 2) subStrings: $'.
	string := pieces at: 2.
	name := (pieces at: 1) trimSeparators.
	temp := temp subStrings: $-.
	range := (temp at: 1) subStrings: $,.
	startLine := (range at: 1) asNumber.
	startColumn := (range at: 2) asNumber.
	range := (temp at: 2) subStrings: $,.
	stopLine := (range at: 1) asNumber.
	stopColumn := (range at: 2) asNumber.
%
category: 'other'
method: PyToken
line

	^startLine
%
category: 'other'
method: PyToken
printOn: aStream

	aStream
		print: startLine;
		nextPut: $,;
		print: startColumn;
		nextPut: $-;
		print: stopLine;
		nextPut: $,;
		print: stopColumn;
		nextPutAll: ': ';
		nextPutAll: name;
		nextPutAll: ' - ';
		print: string;
		yourself.
%

! ------------------- Remove existing behavior from PythonTestCase
expectvalue /Metaclass3       
doit
PythonTestCase removeAllMethods.
PythonTestCase class removeAllMethods.
%
! ------------------- Class methods for PythonTestCase
! ------------------- Instance methods for PythonTestCase
set compile_env: 0
category: 'other'
method: PythonTestCase
filename

	self subclassResponsibility.
%
category: 'other'
method: PythonTestCase
setUp

	super setUp.
	statements := (PyModule script:  '$HOME/code/Python/GemStoneP/tests/' , self filename) _statements.
%

! ------------------- Remove existing behavior from ByteLiteralsTestCase
expectvalue /Metaclass3       
doit
ByteLiteralsTestCase removeAllMethods.
ByteLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for ByteLiteralsTestCase
! ------------------- Instance methods for ByteLiteralsTestCase
set compile_env: 0
category: 'other'
method: ByteLiteralsTestCase
filename

	^'StringLiterals.py'
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralBackspace

	| x |
	x := statements at: 16.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 36;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 36;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 8].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralBell

	| x |
	x := statements at: 15.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 35;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 35;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[ 97 98 99 7 ].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralHexHigh

	| x |
	x := statements at: 20.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 44;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 44;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 255].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralHexLow

	| x |
	x := statements at: 19.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 43;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 43;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[97 98 99 0].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralNewline

	| x |
	x := statements at: 13.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 31;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 31;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = 'abc
' asByteArray.
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralOctalHigh

	| x |
	x := statements at: 18.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 40;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 40;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[100 101 102 255].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralOctalLow

	| x |
	x := statements at: 17.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 39;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 39;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = #[ 97 98 99 0].
%
category: 'other'
method: ByteLiteralsTestCase
testByteLiteralSlash

	| x |
	x := statements at: 14.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 32;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBytes);
		assert: x line == 32;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: (x isKindOf: ByteArray).
	self assert: x = 'def\' asByteArray.
%

! ------------------- Remove existing behavior from DelimitersTestCase
expectvalue /Metaclass3       
doit
DelimitersTestCase removeAllMethods.
DelimitersTestCase class removeAllMethods.
%
! ------------------- Class methods for DelimitersTestCase
! ------------------- Instance methods for DelimitersTestCase
set compile_env: 0
category: 'other'
method: DelimitersTestCase
filename

	^'Delimiters.py'
%
category: 'other'
method: DelimitersTestCase
testDelimiterCommaList

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyList);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _elts size == 3);
		assert: ((x _elts at: 1) isKindOf: PyNum);
		assert: ((x _elts at: 1) _n == 1);
		assert: ((x _elts at: 2) isKindOf: PyNum);
		assert: ((x _elts at: 2) _n == 2);
		assert: ((x _elts at: 3) isKindOf: PyNum);
		assert: ((x _elts at: 3) _n == 3);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterCommaTuple

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyTuple);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _elts size == 3);
		assert: ((x _elts at: 1) isKindOf: PyNum);
		assert: ((x _elts at: 1) _n == 4);
		assert: ((x _elts at: 2) isKindOf: PyNum);
		assert: ((x _elts at: 2) _n == 5);
		assert: ((x _elts at: 3) isKindOf: PyNum);
		assert: ((x _elts at: 3) _n == 6);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterParethesesLeft

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 1);
		assert: (x _left _op isKindOf: PyAdd);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 2);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 3);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterParethesesRight

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 4);
		assert: (x _right isKindOf: PyBinOp);
		assert: (x _right _op isKindOf: PyAdd);
		assert: (x _right _left isKindOf: PyNum);
		assert: (x _right _left _n == 5);
		assert: (x _right _right isKindOf: PyNum);
		assert: (x _right _right _n == 6);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterSliceList

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyList);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 1);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 2);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 3);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isKindOf: PyNum);
		assert: (x _slice _lower _n == 0);
		assert: (x _slice _upper isKindOf: PyNum);
		assert: (x _slice _upper _n == 1);
		assert: (x _slice _step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterSliceListEmpty

	| x |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyList);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 7);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 8);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 9);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isNil);
		assert: (x _slice _upper isNil);
		assert: (x _slice _step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterSliceTuple

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyTuple);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 4);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 5);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 6);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isNil);
		assert: (x _slice _upper isNil);
		assert: (x _slice _step isKindOf: PyNum);
		assert: (x _slice _step _n == 2);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testDelimiterSliceTupleFilled

	| x |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyTuple);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 10);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 11);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 12);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isKindOf: PyNum);
		assert: (x _slice _lower _n == 1);
		assert: (x _slice _upper isKindOf: PyNum);
		assert: (x _slice _upper _n == 2);
		assert: (x _slice _step isKindOf: PyNum);
		assert: (x _slice _step _n == 3);
		yourself.
%

! ------------------- Remove existing behavior from NumericLiteralsTestCase
expectvalue /Metaclass3       
doit
NumericLiteralsTestCase removeAllMethods.
NumericLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for NumericLiteralsTestCase
! ------------------- Instance methods for NumericLiteralsTestCase
set compile_env: 0
category: 'other'
method: NumericLiteralsTestCase
filename

	^'NumericLiterals.py'
%
category: 'other'
method: NumericLiteralsTestCase
testBinaryInteger

	self
		assert: (statements at: 6) _value _n == 0;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	self
		assert: (statements at: 1) _value _n == 1;
		assert: (statements at: 2) _value _n == 1234;
		assert: (statements at: 3) _value _n == 12345;
		assert: (statements at: 4) _value _n == 0;
		assert: (statements at: 5) _value _n == 0;
		yourself.
%

! ------------------- Remove existing behavior from OperatorsTestCase
expectvalue /Metaclass3       
doit
OperatorsTestCase removeAllMethods.
OperatorsTestCase class removeAllMethods.
%
! ------------------- Class methods for OperatorsTestCase
! ------------------- Instance methods for OperatorsTestCase
set compile_env: 0
category: 'other'
method: OperatorsTestCase
filename

	^'Operators.py'
%
category: 'other'
method: OperatorsTestCase
testOperatorAdd

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 1);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 2);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorEq

	| x |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 10);
		assert: (x _cmpopList size == 1);
		assert: ((x _cmpopList at: 1) isKindOf: PyEq);
		assert: (x _comparatorList size == 1);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 20);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorGtE

	| x |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 25);
		assert: (x _cmpopList size == 1);
		assert: ((x _cmpopList at: 1) isKindOf: PyGtE);
		assert: (x _comparatorList size == 1);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 15);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorInvert

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyUnaryOp);
		assert: (x _op isKindOf: PyInvert);
		assert: (x _operand isKindOf: PyNum);
		assert: (x _operand _n == 200);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorMod

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyMod);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 10);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 5);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedAdd

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _op isKindOf: PyAdd);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 2);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 4);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 6);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedEq

	| x |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 11);
		assert: (x _cmpopList size == 2);
		assert: ((x _cmpopList at: 1) isKindOf: PyEq);
		assert: ((x _cmpopList at: 2) isKindOf: PyEq);
		assert: (x _comparatorList size == 2);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 22);
		assert: ((x _comparatorList at: 2) _n == 33);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedGtE

	| x |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 44);
		assert: (x _cmpopList size == 2);
		assert: ((x _cmpopList at: 1) isKindOf: PyGtE);
		assert: ((x _cmpopList at: 2) isKindOf: PyGtE);
		assert: (x _comparatorList size == 2);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 55);
		assert: ((x _comparatorList at: 2) _n == 66);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedMult

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyMult);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _op isKindOf: PyMult);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 7);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 8);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 9);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorUSub

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyUnaryOp);
		assert: (x _op isKindOf: PyUSub);
		assert: (x _operand isKindOf: PyNum);
		assert: (x _operand _n == 100);
		yourself.
%

! ------------------- Remove existing behavior from StringLiteralsTestCase
expectvalue /Metaclass3       
doit
StringLiteralsTestCase removeAllMethods.
StringLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for StringLiteralsTestCase
! ------------------- Instance methods for StringLiteralsTestCase
set compile_env: 0
category: 'other'
method: StringLiteralsTestCase
filename

	^'StringLiterals.py'
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringDoubleQuotes

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 16;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'a''bc'.
%
category: 'other'
method: StringLiteralsTestCase
testEmbeddedStringSingleQuotes

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 15;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'x"yz'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringNewline

	| x |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 20;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'newline\n'.
%
category: 'other'
method: StringLiteralsTestCase
testEscapeCharacterStringSlash

	| x |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 19;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'slash\\'.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueNum

	| x child |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyJoinedStr);
		assert: x line == 28;
		assert: x column == 0;
		yourself.
	child := x _values at: 1.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = '123';
		yourself.
	child := x _values at: 2.
	self
		assert: (child isKindOf: PyFormattedValue);
		assert: child _value _n = 456;
		yourself.
	child := x _values at: 3.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = '789';
		yourself.
	self assert: x _values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testJoinedStrWithFormattedValueStr

	| x child |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyJoinedStr);
		assert: x line == 27;
		assert: x column == 0;
		yourself.
	child := x _values at: 1.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = 'abc';
		yourself.
	child := x _values at: 2.
	self
		assert: (child isKindOf: PyFormattedValue);
		assert: child _value _s = 'def';
		yourself.
	child := x _values at: 3.
	self
		assert: (child isKindOf: PyStr);
		assert: child _s = 'ghi';
		yourself.
	self assert: x _values size = 3.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringDoubleQuotes

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 12;
		assert: x column == -1;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 12;
		assert: x column == -1;
		yourself.
	x := x _s.
	self assert: x = 'poiu
;lkj'.
%
category: 'other'
method: StringLiteralsTestCase
testLongStringSingleQuotes

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 10;
		assert: x column == -1;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 10;
		assert: x column == -1;
		yourself.
	x := x _s.
	self assert: x = 'qwer
asdf'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringNewline

	| x |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 24;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'newline
'.
%
category: 'other'
method: StringLiteralsTestCase
testNonEscapeCharacterStringSlash

	| x |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 23;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'slash\'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringDoubleQuotes

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 6;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'vwxyz'.
%
category: 'other'
method: StringLiteralsTestCase
testShortStringSingleQuotes

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyStr);
		assert: x line == 5;
		assert: x column == 0;
		yourself.
	x := x _s.
	self assert: x = 'abcde'.
%

! ------------------- Remove existing behavior from UserInteraction
expectvalue /Metaclass3       
doit
UserInteraction removeAllMethods.
UserInteraction class removeAllMethods.
%
! ------------------- Class methods for UserInteraction
! ------------------- Instance methods for UserInteraction
set compile_env: 0
category: 'other'
method: UserInteraction
alert: aString

	^(System __sessionStateAt: 3)
		message: aString
		caption: 'Python'
		icon: #prompt
		buttons: #yesNoCancel.
%
category: 'other'
method: UserInteraction
message: messageString caption: captionString icon: iconSymbol buttons: buttonSymbol

	^(System __sessionStateAt: 3)
		message: messageString
		caption: captionString
		icon: iconSymbol
		buttons: buttonSymbol.
%
category: 'other'
method: UserInteraction
prompt: promptString

	^(System __sessionStateAt: 3)
		prompt: promptString
		caption: 'Python'.
%
category: 'other'
method: UserInteraction
prompt: promptString caption: captionString

	^(System __sessionStateAt: 3)
		prompt: promptString
		caption: captionString
%
