! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for AliasAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'AliasAst'
  instVarNames: #( name asName)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
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

! ------------------- Remove existing behavior from AliasAst
removeallmethods AliasAst
removeallclassmethods AliasAst

set compile_env: 0

category: 'other'
method: AliasAst
asName

	^asName
%

category: 'other'
method: AliasAst
name

	^name
%

category: 'other'
method: AliasAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		yourself.
	asName ifNotNil: [
		aStream
			nextPutAll: ' as ';
			nextPutAll: asName;
			yourself.
	].
	aStream nextPut: $).
%
