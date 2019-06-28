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
Builtins category: 'Parser'
%
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
! ------------------- Class definition for PyGeneratorsExp
expectvalue /Class
doit
PyExpression subclass: 'PyGeneratorsExp'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGeneratorsExp category: 'Parser'
%
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
! ------------------- Class definition for PyComparisonOperator
expectvalue /Class
doit
PyAstNode subclass: 'PyComparisonOperator'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyComparisonOperator comment: 
'No class-specific documentation for PyComparisonOperator, hierarchy is:
Object
  PyAstNode( line column)
    PyComparisonOperator
'
%
expectvalue /Class
doit
PyComparisonOperator category: 'Parser'
%
! ------------------- Class definition for PyEq
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyEq'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyEq category: 'Parser'
%
! ------------------- Class definition for PyGt
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyGt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGt category: 'Parser'
%
! ------------------- Class definition for PyGtE
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyGtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyGtE category: 'Parser'
%
! ------------------- Class definition for PyIn
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIn category: 'Parser'
%
! ------------------- Class definition for PyIs
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIs category: 'Parser'
%
! ------------------- Class definition for PyIsNot
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyIsNot'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyIsNot category: 'Parser'
%
! ------------------- Class definition for PyLt
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyLt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLt category: 'Parser'
%
! ------------------- Class definition for PyLtE
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyLtE'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyLtE category: 'Parser'
%
! ------------------- Class definition for PyNotEq
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyNotEq'
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
! ------------------- Class definition for PyNotIn
expectvalue /Class
doit
PyComparisonOperator subclass: 'PyNotIn'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonGlobals
  options: #()

%
expectvalue /Class
doit
PyNotIn category: 'Parser'
%
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
category: 'other'
method: Builtins
__import__: name _: globals _: locals _: fromList _: level
	"(name, globals=None, locals=None, fromlist=(), level=0)"

	self halt.
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
module

	^parent module
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

	| stream char |
	stream := self stream.
	char := stream next.
	(char = $' or: [char = $"]) ifFalse: [self error].
	^stream upTo: char.
%
category: 'other'
method: PyAstNode
suite

	| stream suite |
	stream := self stream.
	(stream peekFor: $[) ifFalse: [self error].
	suite := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		suite add: (PyStatement statementFrom: self).
		(stream peekFor: $,) ifTrue: [stream peekFor: Character space].
	].
	^suite
%
category: 'other'
method: PyAstNode
sys

	^parent sys
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

	| stream string |
	stream := self stream.
	(stream peekFor: $,) ifFalse: [self error].
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
initialize
	"BinOp(expr left, operator op, expr right)"

	left := self expression.
	self commaSpace.
	"operator"
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
initialize
	"BoolOp(boolop op, expr* values)"

	"op"
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
initialize
	"Bytes(bytes s)"
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
category: 'other'
method: PyCall
addMissingPositions

	function addMissingPositions.
	arguments do: [:each | each addMissingPositions].
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
addMissingPositions

	super addMissingPositions.
	left addMissingPositions.
	cmpopList do: [:each | each addMissingPositions].
	comparatorList do: [:each | each addMissingPositions].
%
category: 'other'
method: PyCompare
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	(stream peekFor: $[) ifFalse: [self error].
	cmpopList := Array new.
	[
		stream peekFor: $]
	] whileFalse: [
		cmpopList add: (PyComparisonOperator parent: self).
	].
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

! ------------------- Remove existing behavior from PyGeneratorsExp
expectvalue /Metaclass3       
doit
PyGeneratorsExp removeAllMethods.
PyGeneratorsExp class removeAllMethods.
%
! ------------------- Class methods for PyGeneratorsExp
! ------------------- Instance methods for PyGeneratorsExp
set compile_env: 0
category: 'other'
method: PyGeneratorsExp
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
initialize
	"Name(identifier id, expr_context ctx)"

	self stream peekFor: $(.
	id := self string.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%

! ------------------- Remove existing behavior from PyNameConstant
expectvalue /Metaclass3       
doit
PyNameConstant removeAllMethods.
PyNameConstant class removeAllMethods.
%
! ------------------- Class methods for PyNameConstant
set compile_env: 0
! ------------------- Instance methods for PyNameConstant
set compile_env: 0
category: 'other'
method: PyNameConstant
initialize
	"NameConstant(singleton value)"

	|stream next |
	stream := self stream.
	next := stream next: 4.
	('None' = next or: 'True' = next) ifTrue: [value := next] 
		ifFalse: [
		value := 'False'.
		stream next:1. 	
		].
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
initialize
	"Num(object n) -- a number as a PyObject."
	self halt.
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
initialize
	"Str(string s) -- need to specify raw, unicode, etc?"

	s := self string.
	self readPosition.
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
initialize
	"Subscript(expr value, slice slice, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	"slice"
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
initialize
	"UnaryOp(unaryop op, expr operand)"

	"unaryop"
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
initialize
	"AugAssign(expr target, operator op, expr value)"

	target := self expression.
	self commaSpace.
	"check for operator"
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
initialize
"Break"
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
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
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

	"check for names*"
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

	"check for identifier*"
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
	"check for handlers*"
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

! ------------------- Remove existing behavior from PyComparisonOperator
expectvalue /Metaclass3       
doit
PyComparisonOperator removeAllMethods.
PyComparisonOperator class removeAllMethods.
%
! ------------------- Class methods for PyComparisonOperator
set compile_env: 0
category: 'other'
classmethod: PyComparisonOperator
parent: aNode
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	| stream string |
	stream := aNode stream.
	string := stream upTo: $(.
	(stream peekFor: $)) ifFalse: [self error].
	string = 'Eq'	ifTrue: [^PyEq basicNew initialize: aNode; yourself].
	self halt.
%
! ------------------- Instance methods for PyComparisonOperator
set compile_env: 0
category: 'other'
method: PyComparisonOperator
initialize
	"override to do nothing!"
%

! ------------------- Remove existing behavior from PyEq
expectvalue /Metaclass3       
doit
PyEq removeAllMethods.
PyEq class removeAllMethods.
%
! ------------------- Class methods for PyEq
! ------------------- Instance methods for PyEq

! ------------------- Remove existing behavior from PyGt
expectvalue /Metaclass3       
doit
PyGt removeAllMethods.
PyGt class removeAllMethods.
%
! ------------------- Class methods for PyGt
! ------------------- Instance methods for PyGt

! ------------------- Remove existing behavior from PyGtE
expectvalue /Metaclass3       
doit
PyGtE removeAllMethods.
PyGtE class removeAllMethods.
%
! ------------------- Class methods for PyGtE
! ------------------- Instance methods for PyGtE

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

! ------------------- Remove existing behavior from PyIsNot
expectvalue /Metaclass3       
doit
PyIsNot removeAllMethods.
PyIsNot class removeAllMethods.
%
! ------------------- Class methods for PyIsNot
! ------------------- Instance methods for PyIsNot

! ------------------- Remove existing behavior from PyLt
expectvalue /Metaclass3       
doit
PyLt removeAllMethods.
PyLt class removeAllMethods.
%
! ------------------- Class methods for PyLt
! ------------------- Instance methods for PyLt

! ------------------- Remove existing behavior from PyLtE
expectvalue /Metaclass3       
doit
PyLtE removeAllMethods.
PyLtE class removeAllMethods.
%
! ------------------- Class methods for PyLtE
! ------------------- Instance methods for PyLtE

! ------------------- Remove existing behavior from PyNotEq
expectvalue /Metaclass3       
doit
PyNotEq removeAllMethods.
PyNotEq class removeAllMethods.
%
! ------------------- Class methods for PyNotEq
! ------------------- Instance methods for PyNotEq

! ------------------- Remove existing behavior from PyNotIn
expectvalue /Metaclass3       
doit
PyNotIn removeAllMethods.
PyNotIn class removeAllMethods.
%
! ------------------- Class methods for PyNotIn
! ------------------- Instance methods for PyNotIn

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

	| stream string |
	stream := aNode stream.
	string := stream upTo: $(.
	(stream peekFor: $)) ifFalse: [self error].
	string = 'Load'	ifTrue: [^PyLoad basicNew initialize: aNode; yourself].
	string = 'Store' ifTrue: [^PyStore basicNew initialize: aNode; yourself].
self halt.
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

! ------------------- Remove existing behavior from PyLoad
expectvalue /Metaclass3       
doit
PyLoad removeAllMethods.
PyLoad class removeAllMethods.
%
! ------------------- Class methods for PyLoad
! ------------------- Instance methods for PyLoad

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

! ------------------- Remove existing behavior from PyKeyword
expectvalue /Metaclass3       
doit
PyKeyword removeAllMethods.
PyKeyword class removeAllMethods.
%
! ------------------- Class methods for PyKeyword
set compile_env: 0
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
	value = self expression.
	(stream peekFor: $)) ifFalse: [self error].
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
		initialize;
		yourself
%
category: 'other'
classmethod: PyModule
test
"
PyModule test
"

	^PyModule script: '$HOME/code/Python/performance/performance/cli.py'.
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

	parent ifNil: [parent := PySystem new].
	statements do: [:each | each evaluate].
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

	^'/Library/Frameworks/Python.framework/Versions/3.7/bin/python3'
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
	tokens := tokens collectAst: [:each | PyToken fromString: each].
	stream := ReadStream on: tokens.
%
category: 'other'
method: PyModule
stream

	^stream
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
